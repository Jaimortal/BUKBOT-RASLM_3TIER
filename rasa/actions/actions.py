import json
import os
import random
import re
import sys
from typing import Any, Text, Dict, List, Optional

from rasa_sdk import Action, Tracker
from rasa_sdk.events import SlotSet
from rasa_sdk.executor import CollectingDispatcher

# Add current directory to path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

# Import Language Detector
from language_detector import detect_language, is_bisaya, BISAYA_WORDS

# Import from Magical Aliases
import importlib.util
magical_aliases_dir = os.path.join(current_dir, "Magical Aliases")
spec = importlib.util.spec_from_file_location("aliases", os.path.join(magical_aliases_dir, "aliases.py"))
aliases_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(aliases_module)
LOCATION_ALIASES = aliases_module.LOCATION_ALIASES

from main_router import MainRouterService
from response_builder import ResponseBuilder

# Weak/common words that should score lower to avoid false matches
WEAK_COMMON_WORDS = {
    "get", "getting", "got", "the", "a", "an", "is", "are", "was", "were",
    "be", "been", "being", "have", "has", "had", "do", "does", "did",
    "will", "would", "could", "should", "may", "might", "must",
    "can", "cant", "cannot", "to", "of", "in", "on", "at", "by",
    "for", "with", "about", "against", "between", "into", "through",
    "during", "before", "after", "above", "below", "from", "up", "down",
    "out", "off", "over", "under", "again", "further", "then", "once",
    "here", "there", "when", "where", "why", "how", "all", "any",
    "both", "each", "few", "more", "most", "other", "some", "such",
    "no", "nor", "not", "only", "own", "same", "so", "than", "too",
    "very", "just", "and", "but", "if", "or", "because", "as", "until",
    "while", "this", "that", "these", "those", "i", "me", "my", "myself",
    "we", "our", "you", "your", "he", "him", "his", "she", "her",
    "it", "its", "they", "them", "their", "what", "which", "who",
    "whom", "whose", "this", "that", "am", "are", "was", "were",
    # Cebuano common words
    "ug", "sa", "ng", "ang", "si", "ni", "kay", "nga", "mga", "pag",
    "ako", "ikaw", "siya", "kita", "kami", "sila", "mao", "diay"
}


def normalize_map_pin(pin: Any, index: int = 0) -> Optional[Dict[str, Any]]:
    """
    Normalize old and new admin pin shapes into the map payload expected by
    the frontend. Supports:
    - {"coordinates": [y, x]}  (new Knowledge Manager format)
    - {"lat": y, "lng": x}     (older format)
    - {"y": y, "x": x}         (canvas-style fallback)
    """
    if not isinstance(pin, dict):
        return None

    coords = None
    raw_coords = pin.get("coordinates")
    if isinstance(raw_coords, list) and len(raw_coords) >= 2:
        coords = [raw_coords[0], raw_coords[1]]
    else:
        lat = pin.get("lat", pin.get("y"))
        lng = pin.get("lng", pin.get("x"))
        if lat is not None and lng is not None:
            coords = [lat, lng]

    if not coords:
        return None

    name = str(pin.get("name") or "").strip() or f"Pin {index + 1}"
    pin_data: Dict[str, Any] = {"name": name, "coordinates": coords}
    if pin.get("floor"):
        pin_data["floor"] = str(pin.get("floor"))
    if pin.get("access"):
        pin_data["access"] = str(pin.get("access"))
    if pin.get("pinType"):
        pin_data["pinType"] = str(pin.get("pinType"))
    return pin_data


# -------------------------
# Conversation Context
# -------------------------
class ConversationContext:
    """
    Manages conversation context and dynamic slots for multi-turn conversations.
    """
    def __init__(self):
        self.slots: Dict[str, Any] = {
            "conversation_history": []  # Stores last N messages for context
        }

    def set_slot(self, slot_name: str, value: Any) -> None:
        self.slots[slot_name] = value

    def get_slot(self, slot_name: str) -> Any:
        return self.slots.get(slot_name)

    def reset(self) -> None:
        self.slots = {"conversation_history": []}

    def add_to_history(self, intent: str, user_message: str) -> None:
        self.slots["conversation_history"].append({"intent": intent, "message": user_message})
        if len(self.slots["conversation_history"]) > 20:
            self.slots["conversation_history"] = self.slots["conversation_history"][-20:]

    def get_last_topic(self) -> Optional[str]:
        last_topic = self.get_slot("last_topic")
        if not last_topic and self.slots["conversation_history"]:
            last_topic = self.slots["conversation_history"][-1]["intent"]
        return last_topic


# -------------------------
# JSON Response Helper
# -------------------------
class ActionReplyFromJsonHelper:
    """
    Loads responses from JSON and provides context-aware replies.
    Supports dynamic topics, categories, sub-categories, and multi-turn conversations.
    """
    def __init__(self, responses_path: Optional[str] = None):
        if responses_path is None:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            responses_path = os.path.join(current_dir, "responses.json")
        self.responses_path = responses_path
        self.responses = self._load_responses()
        self.location_responses_path = os.path.join(os.path.dirname(responses_path), "responses_location.json")
        self.location_responses = self._load_location_responses()
        # Load structured knowledge bases from Supper Saiyan folder
        self.supper_saiyan_dir = os.path.join(os.path.dirname(responses_path), "Supper Saiyan")
        
        # Library and Academic Policy (already exist at root level too)
        self.library_info_path = os.path.join(self.supper_saiyan_dir, "Library_info.json")
        self.library_info = self._load_json_file(self.library_info_path)
        
        self.academic_policy_path = os.path.join(self.supper_saiyan_dir, "Academic_policy.json")
        self.academic_policy = self._load_json_file(self.academic_policy_path)
        
        # Administrators
        self.administrators_path = os.path.join(self.supper_saiyan_dir, "Administrators.json")
        self.administrators_info = self._load_json_file(self.administrators_path)
        
        # Admissions
        self.admissions_path = os.path.join(self.supper_saiyan_dir, "Admissions_info.json")
        self.admissions_info = self._load_json_file(self.admissions_path)
        
        # Classroom Policy
        self.classroom_policy_path = os.path.join(self.supper_saiyan_dir, "Classroom_policy.json")
        self.classroom_policy = self._load_json_file(self.classroom_policy_path)
        
        # Clinic Info
        self.clinic_info_path = os.path.join(self.supper_saiyan_dir, "Clinic_info.json")
        self.clinic_info = self._load_json_file(self.clinic_info_path)
        
        # Courses Info
        self.courses_info_path = os.path.join(self.supper_saiyan_dir, "Courses_info.json")
        self.courses_info = self._load_json_file(self.courses_info_path)
        
        # Departmentals Faculty Staff
        self.departamentals_path = os.path.join(self.supper_saiyan_dir, "Departamentals_facultystaff.json")
        self.departamentals_faculty_staff = self._load_json_file(self.departamentals_path)
        
        # Department Info
        self.department_info_path = os.path.join(self.supper_saiyan_dir, "Department_info.json")
        self.department_info = self._load_json_file(self.department_info_path)
        
        # Enrollment Info
        self.enrollment_info_path = os.path.join(self.supper_saiyan_dir, "Enrollment_info.json")
        self.enrollment_info = self._load_json_file(self.enrollment_info_path)

        # Facilities Info
        self.facilities_info_path = os.path.join(self.supper_saiyan_dir, "Facilities_info.json")
        self.facilities_info = self._load_json_file(self.facilities_info_path)
        
        # ICT Info
        self.ict_info_path = os.path.join(self.supper_saiyan_dir, "Ict_info.json")
        self.ict_info = self._load_json_file(self.ict_info_path)
        
        # OSS Services
        self.oss_services_path = os.path.join(self.supper_saiyan_dir, "Oss_services.json")
        self.oss_services = self._load_json_file(self.oss_services_path)
        
        # University Info
        self.university_info_path = os.path.join(self.supper_saiyan_dir, "University_info.json")
        self.university_info = self._load_json_file(self.university_info_path)
        
        # Dormitory Info
        self.dormitory_info_path = os.path.join(self.supper_saiyan_dir, "Dormitory_info.json")
        self.dormitory_info = self._load_json_file(self.dormitory_info_path)
        
        self._json_mtimes = self._snapshot_json_mtimes()
        self.context = ConversationContext()

    def _tracked_json_paths(self) -> List[str]:
        paths = [
            self.responses_path,
            self.location_responses_path,
            self.library_info_path,
            self.academic_policy_path,
            self.administrators_path,
            self.admissions_path,
            self.classroom_policy_path,
            self.clinic_info_path,
            self.courses_info_path,
            self.departamentals_path,
            self.department_info_path,
            self.enrollment_info_path,
            self.facilities_info_path,
            self.ict_info_path,
            self.oss_services_path,
            self.university_info_path,
            self.dormitory_info_path,
        ]
        try:
            supper_saiyan_paths = [
                os.path.join(self.supper_saiyan_dir, filename)
                for filename in os.listdir(self.supper_saiyan_dir)
                if filename.endswith(".json")
            ]
            paths.extend(supper_saiyan_paths)
        except OSError:
            pass
        return list(dict.fromkeys(path for path in paths if path))

    def _snapshot_json_mtimes(self) -> Dict[str, float]:
        mtimes: Dict[str, float] = {}
        for filepath in self._tracked_json_paths():
            try:
                mtimes[filepath] = os.path.getmtime(filepath)
            except OSError:
                mtimes[filepath] = -1.0
        return mtimes

    def reload_if_changed(self) -> bool:
        """
        Reload JSON knowledge files when admin edits changed their modified time.

        This keeps action responses fresh without reading all JSON files on every
        message. If a changed file has invalid JSON, keep the last good
        in-memory data instead of replacing that source with an empty object.
        """
        current_mtimes = self._snapshot_json_mtimes()
        if current_mtimes == getattr(self, "_json_mtimes", {}):
            return False

        previous_mtimes = getattr(self, "_json_mtimes", {})
        changed_paths = [
            path
            for path, mtime in current_mtimes.items()
            if previous_mtimes.get(path) != mtime
        ]
        changed_files = [os.path.basename(path) for path in changed_paths]

        for path in changed_paths:
            error = self._json_validation_error(path)
            if error:
                print(
                    "[Knowledge Hot Reload] Skipped reload because "
                    f"{error}. Keeping previous in-memory data."
                )
                return False

        next_responses = self._load_responses()
        next_location_responses = self._load_location_responses()
        next_library_info = self._load_json_file(self.library_info_path)
        next_academic_policy = self._load_json_file(self.academic_policy_path)
        next_administrators_info = self._load_json_file(self.administrators_path)
        next_admissions_info = self._load_json_file(self.admissions_path)
        next_classroom_policy = self._load_json_file(self.classroom_policy_path)
        next_clinic_info = self._load_json_file(self.clinic_info_path)
        next_courses_info = self._load_json_file(self.courses_info_path)
        next_departamentals_faculty_staff = self._load_json_file(self.departamentals_path)
        next_department_info = self._load_json_file(self.department_info_path)
        next_enrollment_info = self._load_json_file(self.enrollment_info_path)
        next_facilities_info = self._load_json_file(self.facilities_info_path)
        next_ict_info = self._load_json_file(self.ict_info_path)
        next_oss_services = self._load_json_file(self.oss_services_path)
        next_university_info = self._load_json_file(self.university_info_path)
        next_dormitory_info = self._load_json_file(self.dormitory_info_path)

        self.responses = next_responses
        self.location_responses = next_location_responses
        self.library_info = next_library_info
        self.academic_policy = next_academic_policy
        self.administrators_info = next_administrators_info
        self.admissions_info = next_admissions_info
        self.classroom_policy = next_classroom_policy
        self.clinic_info = next_clinic_info
        self.courses_info = next_courses_info
        self.departamentals_faculty_staff = next_departamentals_faculty_staff
        self.department_info = next_department_info
        self.enrollment_info = next_enrollment_info
        self.facilities_info = next_facilities_info
        self.ict_info = next_ict_info
        self.oss_services = next_oss_services
        self.university_info = next_university_info
        self.dormitory_info = next_dormitory_info
        self._json_mtimes = current_mtimes
        print(f"[Knowledge Hot Reload] Reloaded JSON sources: {', '.join(changed_files)}")
        return True

    def _json_validation_error(self, filepath: str) -> Optional[str]:
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                json.load(f)
            return None
        except FileNotFoundError:
            return f"{os.path.basename(filepath)} was not found"
        except json.JSONDecodeError as e:
            return f"{os.path.basename(filepath)} has invalid JSON: {e}"
        except OSError as e:
            return f"{os.path.basename(filepath)} could not be read: {e}"

    def _load_location_responses(self) -> Dict[str, Any]:
        try:
            with open(self.location_responses_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"Error: responses_location.json not found at {self.location_responses_path}")
            return {}
        except json.JSONDecodeError as e:
            print(f"Error: Invalid JSON in responses_location.json - {e}")
            return {}

    def _load_responses(self) -> List[Dict[str, Any]]:
        try:
            with open(self.responses_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"Error: responses.json not found at {self.responses_path}")
            return []
        except json.JSONDecodeError as e:
            print(f"Error: Invalid JSON in responses.json - {e}")
            return []

    def _load_json_file(self, filepath: str) -> Dict[str, Any]:
        """
        Generic JSON file loader for structured knowledge bases.
        Returns empty dict if file not found or invalid.
        """
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"Warning: JSON file not found at {filepath}")
            return {}
        except json.JSONDecodeError as e:
            print(f"Error: Invalid JSON in {filepath} - {e}")
            return {}
        except Exception as e:
            print(f"Error loading {filepath}: {e}")
            return {}

    # -------------------------
    # Language Detection (delegates to language_detector module)
    # -------------------------
    def detect_language(self, user_message: str) -> str:
        """
        Detect language from user message.
        Returns 'ceb' for Bisaya/Cebuano, 'en' for English.
        """
        return detect_language(user_message)

    # -------------------------
    # Get Main Response
    # -------------------------
    def get_response(self, intent: str, category: Optional[str] = None,
                     sub_category: Optional[str] = None, pick_random: bool = True,
                     user_message: str = "") -> Any:

        if not self.responses:
            return "I'm sorry, I'm having trouble accessing my responses."

        # Track history
        self.context.add_to_history(intent, user_message)

        # Filter entries by intent
        matched_entries = [
            entry for entry in self.responses
            if entry.get("intent") == intent and
               (category is None or entry.get("category") == category) and
               (sub_category is None or entry.get("sub_category") == sub_category)
        ]

        if not matched_entries:
            return self._get_fallback_response()

        entry = matched_entries[0]
        responses_data = entry.get("responses", {})

        # Apply dynamic slots
        context_slots = responses_data.get("context_slots", {})
        for slot_name, value in context_slots.items():
            self.context.set_slot(slot_name, value)

        # Always update last topic
        self.context.set_slot("last_topic", intent)

        # Main answer
        answer = responses_data.get("answer", "I'm sorry, I don't have an answer for that.")
        
        # Check for image or map data (Enhanced for Map Support)
        image_data = responses_data.get("image", None) or responses_data.get("imageUrl", None)
        image_list = responses_data.get("images", None) or responses_data.get("imageUrls", None)
        map_data = responses_data.get("mapData", None)
        
        # Prepare result payload
        result = {}
        
        if isinstance(answer, dict):
            # New multilingual format: { "en": [...], "ceb": [...] }
            # Detect language from user_message using centralized method
            preferred_lang = self.detect_language(user_message)
            selected = answer.get(preferred_lang)

            is_blank_selected = (
                selected is None or
                (isinstance(selected, str) and not selected.strip()) or
                (isinstance(selected, list) and not any(str(x).strip() for x in selected))
            )

            if is_blank_selected:
                # Fallback to English or first available language
                selected = answer.get("en")
                if selected is None or (
                    (isinstance(selected, str) and not selected.strip()) or
                    (isinstance(selected, list) and not any(str(x).strip() for x in selected))
                ):
                    first_key = next(iter(answer), None)
                    selected = answer.get(first_key) if first_key else None
            if isinstance(selected, list):
                result["text"] = "\n".join(selected)
            elif isinstance(selected, str):
                result["text"] = selected
            else:
                result["text"] = "I'm sorry, I don't have an answer for that."
        elif isinstance(answer, list):
            result["text"] = "\n".join(answer)
        elif isinstance(answer, str):
            result["text"] = answer
        else:
            result["text"] = "I'm sorry, I don't have an answer for that."
            
        if image_data:
             result["image"] = image_data

        if isinstance(image_list, list):
             cleaned = [str(x) for x in image_list if x]
             if cleaned:
                  result["images"] = cleaned
             
        if map_data:
             result["custom"] = {"mapData": map_data}

        # Return dict if we have rich content, otherwise just text
        if "image" in result or "images" in result or "custom" in result:
             return result
             
        return result["text"]

    # -------------------------
    # Get Follow-Up (improved)
    # -------------------------
    def get_follow_up(self, last_topic: str,
                      category: Optional[str] = None,
                      sub_category: Optional[str] = None,
                      pick_random: bool = True) -> List[str]:

        # Fallback if no last topic recorded
        if not last_topic:
            return ["Unfortunately that's all the data I can give for now."]

        matched_entries = [
            entry for entry in self.responses
            if entry.get("intent") == last_topic and
               (category is None or entry.get("category") == category) and
               (sub_category is None or entry.get("sub_category") == sub_category)
        ]

        if not matched_entries:
            return ["Unfortunately that's all the data I can give for now."]

        entry = matched_entries[0]
        follow_up = entry.get("responses", {}).get("follow_up", [])

        # If follow_up is missing or empty → fallback
        if not follow_up:
            return ["Unfortunately that's all the data I can give for now."]

        if isinstance(follow_up, str):
            return [follow_up]
        if isinstance(follow_up, list):
            return follow_up

        return ["Unfortunately that's all the data I can give for now."]

    # -------------------------
    # Generic fallback
    # -------------------------
    def _get_fallback_response(self) -> str:
        fallback_entry = next((entry for entry in self.responses if entry.get("intent") == "nlu_fallback"), None)
        if fallback_entry:
            fallback = fallback_entry.get("responses", {}).get("answer", "I'm not sure how to respond.")
            if isinstance(fallback, dict):
                fallback = fallback.get("en") or next((value for value in fallback.values() if value), None)
            if isinstance(fallback, list):
                return random.choice(fallback)
            return str(fallback or "I'm not sure how to respond. Could you rephrase your question?")
        return "I'm not sure how to respond. Could you rephrase your question?"

    # Helpers
    def set_dynamic_slot(self, slot_name: str, value: Any) -> None:
        self.context.set_slot(slot_name, value)

    def get_dynamic_slot(self, slot_name: str) -> Any:
        return self.context.get_slot(slot_name)

    def _normalize_location_name(self, raw_name: str) -> str:
        if not raw_name:
            return raw_name

        cleaned = str(raw_name).lower()

        # ✅ remove punctuation
        cleaned = re.sub(r"[^\w\s-]", "", cleaned)

        cleaned = cleaned.strip()

        # remove prefixes
        cleaned = re.sub(r"^\s*(room|rm|the)\s+", "", cleaned).strip()

        if cleaned in LOCATION_ALIASES:
            return LOCATION_ALIASES[cleaned]

        return LOCATION_ALIASES.get(cleaned, raw_name)

    def _guess_all_locations_from_text(self, user_message: str) -> List[str]:
        """Find ALL location aliases in the text, not just the best one"""
        if not user_message:
            return []

        text = str(user_message).strip().lower()
        found_locations = set()

        # Find all matching aliases
        for alias, normalized in LOCATION_ALIASES.items():
            if alias and alias in text:
                found_locations.add(normalized)

        # Also try room code patterns
        matches = re.finditer(r"\b(c\d+)\s+(\d+)\s+(\d{1,2})\b", text)
        for match in matches:
            building, floor, room = match.group(1), match.group(2), match.group(3)
            room_padded = room.zfill(2)
            found_locations.add(f"{building}-{floor}-{room_padded}".upper())

        matches2 = re.finditer(r"\b(c\d+)-(\d+)-(\d{1,2})\b", text)
        for match in matches2:
            building, floor, room = match.group(1), match.group(2), match.group(3)
            room_padded = room.zfill(2)
            found_locations.add(f"{building}-{floor}-{room_padded}".upper())

        return list(found_locations)

    def _guess_location_from_text(self, user_message: str) -> Optional[str]:
        """Find the best (longest) location alias in the text"""
        if not user_message:
            return None

        text = str(user_message).strip().lower()

        # direct substring match against aliases (prefer longest alias)
        best_alias = None
        for alias in LOCATION_ALIASES.keys():
            if alias and alias in text:
                if best_alias is None or len(alias) > len(best_alias):
                    best_alias = alias

        if best_alias:
            return LOCATION_ALIASES.get(best_alias)

        # Try to reconstruct room codes like "c2 2 01" even if entity extraction is partial
        match = re.search(r"\b(c\d+)\s+(\d+)\s+(\d{1,2})\b", text)
        if match:
            building, floor, room = match.group(1), match.group(2), match.group(3)
            room_padded = room.zfill(2)
            return f"{building}-{floor}-{room_padded}".upper()

        match2 = re.search(r"\b(c\d+)-(\d+)-(\d{1,2})\b", text)
        if match2:
            building, floor, room = match2.group(1), match2.group(2), match2.group(3)
            room_padded = room.zfill(2)
            return f"{building}-{floor}-{room_padded}".upper()

        return None

    def get_location_response(self, location_name: str, user_message: str) -> Dict[str, Any]:
        normalized_name = self._normalize_location_name(location_name)
        locations = self.location_responses.get("locations", {})
        location_info = locations.get(normalized_name)
        if not location_info and isinstance(normalized_name, str):
            # Fallback: try case-insensitive match against keys in responses_location.json
            for k, v in locations.items():
                if isinstance(k, str) and k.strip().lower() == normalized_name.strip().lower():
                    normalized_name = k
                    location_info = v
                    break
        if not location_info:
            return {"text": f"Sorry, I don't have information about {location_name}."}
        
        # Detect language using centralized method
        lang_key = self.detect_language(user_message)
        responses = location_info.get("responses", {}).get(lang_key)
        if not responses:
            responses = location_info.get("responses", {}).get("en", [])
        
        if isinstance(responses, list):
            response_text = "\n".join(responses)
        else:
            response_text = str(responses)

        directory = self.get_building_directory_for_location(normalized_name, user_message=user_message)
        if directory and self._should_attach_building_directory(normalized_name, location_info, user_message):
            response_text = f"{response_text}\nThere's also other offices can be found in {directory['building']}."
        
        result = {"text": response_text}

        # Add images if available
        images = None
        if isinstance(location_info.get("imageUrls"), list):
            images = [str(x) for x in location_info.get("imageUrls") if x]
        elif isinstance(location_info.get("images"), list):
            images = [str(x) for x in location_info.get("images") if x]
        elif location_info.get("image"):
            images = [str(location_info.get("image"))]
        elif location_info.get("imageUrl"):
            images = [str(location_info.get("imageUrl"))]

        if images:
            result["images"] = images
            result["image"] = images[0]
        
        # Add map data (support multiple pins)
        map_id = location_info.get("map_id") or location_info.get("mapId")
        pins_raw = location_info.get("pins")

        pins_out = []
        if isinstance(pins_raw, list):
            for idx, p in enumerate(pins_raw):
                pin_data = normalize_map_pin(p, idx)
                if pin_data:
                    pins_out.append(pin_data)

        routes_raw = location_info.get("routes")
        routes_out = []
        if isinstance(routes_raw, list):
            for r in routes_raw:
                if isinstance(r, dict) and isinstance(r.get("points"), list):
                    routes_out.append({
                        "name": r.get("name") or "Route",
                        "points": r.get("points"),
                        "color": r.get("color") or "#dc2626"
                    })

        if map_id:
            result["custom"] = {
                "mapData": {
                    "locationName": normalized_name,
                    "pins": pins_out,
                    "routes": routes_out,
                    "mapId": map_id,
                }
            }
            if not pins_out and location_info.get("coordinates"):
                result["custom"]["mapData"]["coordinates"] = location_info["coordinates"]
                if location_info.get("floor"):
                    result["custom"]["mapData"]["floor"] = str(location_info.get("floor"))

        if directory and self._should_attach_building_directory(normalized_name, location_info, user_message):
            result.setdefault("custom", {})
            result["custom"]["suggestions"] = directory["suggestions"]
        
        return result

    def _normalize_building_name(self, value: Any) -> str:
        text = re.sub(r"\s+", " ", str(value or "").lower()).strip()
        text = text.replace("college of business building", "cob building")
        text = text.replace("college of business administration building", "cob building")
        text = text.replace("administration building", "administrative building")
        text = text.replace("main administration building", "administrative building")
        text = text.replace("admin building", "administrative building")
        text = text.replace("finance bldg", "finance building")
        return text

    def _building_from_text(self, user_message: str) -> Optional[str]:
        text = self._normalize_building_name(user_message)
        building_terms = {
            "cob building": "COB Building",
            "cob": "COB Building",
            "new cot building": "New COT Building",
            "new cot": "New COT Building",
            "old cot building": "Old COT Building",
            "old cot": "Old COT Building",
            "cot buildings": "New COT Building",
            "cot building": "New COT Building",
            "cot": "New COT Building",
            "cpag building": "CPAG Building",
            "cpag": "CPAG Building",
            "college of public administration and governance": "CPAG Building",
            "administrative building": "Administrative Building",
            "finance building": "Finance Building",
        }
        for term, building in sorted(building_terms.items(), key=lambda item: len(item[0]), reverse=True):
            if re.search(rf"(?<!\w){re.escape(term)}(?!\w)", text):
                return building
        return None

    def _canonical_building_from_location(self, location_name: str) -> Optional[str]:
        locations = self.location_responses.get("locations", {})
        location_info = locations.get(location_name) or {}
        building = location_info.get("building")
        if building:
            normalized = self._normalize_building_name(building)
            if normalized in {"cob building", "college of business building"}:
                return "COB Building"
            if normalized in {"administrative building"}:
                return "Administrative Building"
            if normalized in {"finance building"}:
                return "Finance Building"
            if normalized in {"new cot building"}:
                return "New COT Building"
            if normalized in {"old cot building"}:
                return "Old COT Building"
            if normalized in {"cpag building"}:
                return "CPAG Building"
            return str(building)
        return self._building_from_text(location_name)

    def _display_location_label(self, name: str) -> str:
        replacements = {
            "COB 4th Floor Students Organization": "Students Organization",
        }
        return replacements.get(name, name)

    def _preferred_building_order(self, building: str) -> List[str]:
        preferred = {
            "COB Building": [
                "Hospitality Management Faculty Room",
                "Business Administration Faculty Room",
                "Accountancy Faculty Department Room",
                "COB Accreditation Room",
                "COB 4th Floor Students Organization",
            ],
            "New COT Building": [
                "COT Faculty Room",
                "COT Dean's Office",
                "Electronics Faculty Room",
                "food technology laboratory",
                "Electronics Laboratories",
                "DXBU",
            ],
            "Old COT Building": [
                "Old COT Building",
                "C2-2-01",
                "C2-2-02",
                "C2-2-03",
                "Electronics Laboratory 1",
                "Electronics Laboratory 2",
            ],
            "Finance Building": [
                "Window 1 Scholarship and Financial Assistance",
                "Window 2 Scholarship and Financial Assistance",
                "Windows 3 Assessment",
                "Windows 4 Assessment",
                "Windows 5 Assessment",
                "Window 6 Payroll Regular Satellite Campus",
                "Window 7 Payroll Regular",
                "Window 8 Payroll Regular and Casual",
                "Window 9 Information",
                "Cashiers Office Window 03",
                "Budget Office Window 02",
                "Window 01 Finance and Management Division and Administrative Office",
            ],
            "CPAG Building": [
                "CPAG Faculty Room",
                "CPAG Deans Office",
                "GE Department",
                "CPAG Guidance Office",
                "Admission Office",
                "Registrar Office",
                "AVC",
                "Canteen",
            ],
        }
        return preferred.get(building, [])

    def _building_directory_items(self, building: str, exclude_location: Optional[str] = None) -> List[Dict[str, str]]:
        locations = self.location_responses.get("locations", {})
        normalized_building = self._normalize_building_name(building)
        candidates: List[str] = []

        for name, info in locations.items():
            if name == exclude_location:
                continue
            if not isinstance(info, dict):
                continue
            info_building = self._normalize_building_name(info.get("building"))
            if info_building != normalized_building:
                continue
            location_type = str(info.get("type") or "").lower()
            if location_type == "building" and self._normalize_building_name(name) == normalized_building:
                continue
            candidates.append(str(name))

        preferred = [name for name in self._preferred_building_order(building) if name in candidates]
        remaining = sorted([name for name in candidates if name not in preferred])
        ordered = [*preferred, *remaining]

        suggestions = []
        seen = set()
        for name in ordered:
            label = self._display_location_label(name)
            key = label.lower()
            if key in seen:
                continue
            seen.add(key)
            suggestions.append({
                "label": label,
                "payload": f"where is {name}",
            })
            if len(suggestions) >= 8:
                break
        return suggestions

    def _should_attach_building_directory(self, location_name: str, location_info: Dict[str, Any], user_message: str) -> bool:
        directory_terms = ["offices", "rooms", "inside", "found", "faculty", "building", "list"]
        text = self._normalize_building_name(user_message)
        location_type = str(location_info.get("type") or "").lower()
        is_building = location_type == "building"
        is_faculty_room = "faculty room" in str(location_name).lower()
        asked_directory = any(term in text for term in directory_terms)
        is_specific_office = "office" in location_type or "office" in str(location_name).lower()
        if is_specific_office and not (is_building or is_faculty_room):
            return asked_directory and any(term in text for term in ["offices", "rooms", "inside", "found", "list"])
        return is_building or is_faculty_room or asked_directory

    def get_building_directory_for_location(self, location_name: str, user_message: str = "") -> Optional[Dict[str, Any]]:
        building = self._canonical_building_from_location(location_name) or self._building_from_text(user_message)
        if not building:
            return None
        suggestions = self._building_directory_items(building, exclude_location=location_name)
        if not suggestions:
            return None
        return {
            "building": building,
            "suggestions": suggestions,
        }

    def get_building_directory_response(self, user_message: str) -> Optional[Dict[str, Any]]:
        building = self._building_from_text(user_message)
        if not building:
            return None
        suggestions = self._building_directory_items(building)
        if not suggestions:
            return None
        return {
            "text": f"These are some offices and rooms that can be found in {building}. Choose one if you want the exact location and map.",
            "custom": {
                "suggestions": suggestions
            },
        }
    def _normalize_lab_number(self, raw_value: Any) -> Optional[str]:
        if raw_value is None:
            return None

        value = str(raw_value).strip().lower()

        # Common cases: "3", "comlab 3", "computer laboratory 3"
        match = re.search(r"\b(\d{1,2})\b", value)
        if match:
            return match.group(1)

        # Word numbers (limited support)
        word_to_num = {
            "one": "1",
            "two": "2",
            "three": "3",
            "four": "4",
            "five": "5",
            "six": "6",
            "seven": "7",
            "eight": "8",
            "nine": "9",
            "ten": "10",
            "eleven": "11",
            "twelve": "12",
        }
        for word, num in word_to_num.items():
            if re.search(rf"\b{re.escape(word)}\b", value):
                return num

        return None

    def _get_lab_location_response(self, lab_number: str, user_message: str) -> dict:
        """Get location response for specific ComLab from the new JSON structure"""

        # First, try to get it from the unified responses_location.json managed by the admin panel
        location_name = f"ComLab {lab_number}"
        location_dict = self.location_responses.get("locations", {})
        
        # Checking case-insensitively
        target_key = next((k for k in location_dict.keys() if k.lower() == location_name.lower()), None)
        
        if target_key:
            return self.get_location_response(target_key, user_message)

        # Fallback to the old responses.json legacy structure
        entry = next((e for e in self.responses if e.get("intent") == "locate_comlab"), None)
        laboratories = (entry or {}).get("laboratories", {})
        lab_info = laboratories.get(str(lab_number))
        
        if not lab_info:
            return {"text": f"Sorry, I don't have information about ComLab {lab_number}."}
        
        # Detect language using centralized method
        lang_key = self.detect_language(user_message)
        responses = lab_info.get(lang_key)
        if not responses:
            responses = lab_info.get("en", [])

        # Combine all response lines
        if isinstance(responses, list):
            response_text = "\n".join(responses)
        else:
            response_text = str(responses)

        result = {"text": response_text}
        
        # Add images if available
        images = None
        if isinstance(lab_info.get("images"), list):
            images = [str(x) for x in lab_info.get("images") if x]
        elif isinstance(lab_info.get("imageUrls"), list):
            images = [str(x) for x in lab_info.get("imageUrls") if x]
        elif lab_info.get("image"):
            images = [str(lab_info.get("image"))]
        elif lab_info.get("imageUrl"):
            images = [str(lab_info.get("imageUrl"))]

        if images:
            result["images"] = images
            # keep backward compatibility for clients that only read `image`
            result["image"] = images[0]
        
        # Add map data if available
        map_id = lab_info.get("map_id") or lab_info.get("mapId")
        if lab_info.get("coordinates") and map_id:
            location_name = lab_info.get("locationName") or f"ComLab {lab_number}"
            result["custom"] = {
                "mapData": {
                    "locationName": location_name,
                    "coordinates": lab_info["coordinates"],
                    "mapId": map_id
                }
            }
        
        return result

    def _get_faculty_room_response(self, college: str, user_message: str) -> dict:
        """Get location response for specific faculty room from JSON structure"""
        
        # First, try to get it from the unified responses_location.json managed by the admin panel
        location_name = f"{college.upper()} Faculty Room"
        location_dict = self.location_responses.get("locations", {})
        
        # Checking case-insensitively
        target_key = next((k for k in location_dict.keys() if k.lower() == location_name.lower()), None)
        
        if target_key:
            return self.get_location_response(target_key, user_message)

        # Fallback to the old responses.json legacy structure
        entry = next((e for e in self.responses if e.get("intent") == "ask_faculty_room_location"), None)
        faculty_rooms = (entry or {}).get("faculty_rooms", {})
        college_info = faculty_rooms.get(college.upper())
        
        if not college_info:
            return {"text": f"Sorry, I don't have information about {college} faculty room."}
        
        # Detect language using centralized method
        lang_key = self.detect_language(user_message)
        responses = college_info.get(lang_key)
        if not responses:
            responses = college_info.get("en", [])

        # Combine all response lines
        if isinstance(responses, list):
            response_text = "\n".join(responses)
        else:
            response_text = str(responses)

        result = {"text": response_text}
        
        # Add map data if available
        map_id = college_info.get("map_id") or college_info.get("mapId")
        pins_raw = college_info.get("pins")
        
        pins_out = []
        if isinstance(pins_raw, list):
            for idx, p in enumerate(pins_raw):
                pin_data = normalize_map_pin(p, idx)
                if pin_data:
                    pins_out.append(pin_data)

        if map_id:
            if pins_out:
                result["custom"] = {
                    "mapData": {
                        "locationName": college.upper() + " Faculty Room",
                        "pins": pins_out,
                        "mapId": map_id,
                    }
                }
            elif college_info.get("coordinates"):
                result["custom"] = {
                    "mapData": {
                        "locationName": college.upper() + " Faculty Room",
                        "coordinates": college_info["coordinates"],
                        "mapId": map_id,
                    }
                }
                if college_info.get("floor"):
                    result["custom"]["mapData"]["floor"] = str(college_info.get("floor"))
        
        return result

    def get_structured_response(
        self,
        user_message: str,
        data_source: Dict[str, Any],
        topic_patterns: Dict[str, Any],
        topic_mapping: Optional[Dict[str, tuple]] = None,
        fallback_message: str = "I'm sorry, I don't have information about that topic.",
        language_keywords: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Generic structured response handler for super intent + topic routing architecture.
        
        Args:
            user_message: The user's input text
            data_source: The JSON data source containing topics and responses
            topic_patterns: Pattern dictionary for topic detection (e.g., LIBRARY_TOPIC_PATTERNS)
            topic_mapping: Optional mapping of detected topics to (main_topic, subtopic) tuples
            fallback_message: Message to return when topic not detected or data missing
            language_keywords: Deprecated, kept for backward compatibility. Use detect_language() instead.
        
        Returns:
            Dict with "text" key containing the response
        """
        if not data_source:
            return {"text": fallback_message}
        
        # Detect topic from user message
        detected_topic = detect_topic(user_message, topic_patterns)
        
        if not detected_topic:
            return {"text": fallback_message}
        
        # Default topic mapping if not provided
        if topic_mapping is None:
            topic_mapping = {}
        
        # Get topic info from data_source JSON
        topics = data_source.get("topics", [])
        responses_data = {}
        
        # Check if detected topic maps to a subtopic
        if detected_topic in topic_mapping:
            main_topic, subtopic = topic_mapping[detected_topic]
            # Find the main topic with subtopics
            topic_entry = next((t for t in topics if t.get("topic") == main_topic), None)
            if topic_entry and "subtopics" in topic_entry:
                # Find the specific subtopic
                subtopic_entry = next(
                    (st for st in topic_entry["subtopics"] if st.get("topic") == subtopic),
                    None
                )
                if subtopic_entry:
                    responses_data = subtopic_entry.get("responses", {})
                else:
                    return {"text": f"I'm sorry, I don't have information about {subtopic.replace('_', ' ')}."}
            else:
                return {"text": f"I'm sorry, I don't have information about {main_topic.replace('_', ' ')}."}
        else:
            # Direct topic lookup
            topic_entry = next((t for t in topics if t.get("topic") == detected_topic), None)
            if not topic_entry:
                return {"text": f"I'm sorry, I don't have information about {detected_topic.replace('_', ' ')}."}
            responses_data = topic_entry.get("responses", {})
        
        # Detect language using centralized method (language_keywords param deprecated)
        lang_key = self.detect_language(user_message)
        
        # Get responses for detected language
        responses = responses_data.get(lang_key)
        if not responses:
            responses = responses_data.get("en", [])
        
        # Combine all response lines
        if isinstance(responses, list):
            response_text = "\n".join(responses)
        else:
            response_text = str(responses)
        
        # Build result with text
        result = {"text": response_text}
        
        # Extract images from topic entry if available
        images = None
        if isinstance(topic_entry.get("images"), list):
            images = [str(x) for x in topic_entry.get("images") if x]
        elif topic_entry.get("image"):
            images = [str(topic_entry.get("image"))]
        
        if images:
            result["images"] = images
            result["image"] = images[0]  # backward compatibility
        
        # Extract map data (map, pins, routes) from topic entry
        map_data = topic_entry.get("map")
        pins_raw = topic_entry.get("pins")
        routes_raw = topic_entry.get("routes")
        
        if map_data or pins_raw or routes_raw:
            map_data_payload: Dict[str, Any] = {
                "locationName": topic_entry.get("ui_name") or topic_entry.get("topic", "Location"),
            }
            
            # Add coordinates from map data
            if map_data and isinstance(map_data, dict):
                if "lat" in map_data and "lng" in map_data:
                    map_data_payload["coordinates"] = [map_data["lat"], map_data["lng"]]
            
            # Process pins
            pins_out = []
            if isinstance(pins_raw, list):
                for idx, p in enumerate(pins_raw):
                    pin_data = normalize_map_pin(p, idx)
                    if pin_data:
                        pins_out.append(pin_data)
            
            if pins_out:
                map_data_payload["pins"] = pins_out
            
            # Process routes
            routes_out = []
            if isinstance(routes_raw, list):
                for r in routes_raw:
                    if isinstance(r, dict) and isinstance(r.get("points"), list):
                        routes_out.append({
                            "name": r.get("name") or "Route",
                            "points": r.get("points"),
                            "color": r.get("color") or "#dc2626"
                        })
            
            if routes_out:
                map_data_payload["routes"] = routes_out
            
            # Only add custom mapData if we have meaningful data
            if pins_out or routes_out or map_data:
                result["custom"] = {"mapData": map_data_payload}
        
        return result

    def get_library_response(self, user_message: str) -> Dict[str, Any]:
        """
        Library-specific wrapper around get_structured_response.
        Uses LIBRARY_TOPIC_PATTERNS and Library_info.json.
        """
        library_topic_mapping = {
            "library_id_card_location": ("id_card", "location"),
            "library_id_card_requirements": ("id_card", "requirements"),
            "library_id_card_payment": ("id_card", "payment"),
        }
        
        return self.get_structured_response(
            user_message=user_message,
            data_source=self.library_info,
            topic_patterns=LIBRARY_TOPIC_PATTERNS,
            topic_mapping=library_topic_mapping,
            fallback_message="I'm sorry, I didn't understand your library question. Could you please rephrase it?"
        )

    def get_academic_policy_response(self, user_message: str) -> Dict[str, Any]:
        """
        Academic Policy-specific wrapper around get_structured_response.
        Uses ACADEMIC_POLICY_TOPIC_PATTERNS and Academic_policy.json.
        """
        # Academic policy has no subtopic mapping - all topics are direct
        return self.get_structured_response(
            user_message=user_message,
            data_source=self.academic_policy,
            topic_patterns=ACADEMIC_POLICY_TOPIC_PATTERNS,
            topic_mapping=None,  # No subtopics for academic policy
            fallback_message="I'm sorry, I didn't understand your academic policy question. Could you please rephrase it?"
        )

    def get_administrators_response(self, user_message: str) -> Dict[str, Any]:
        """
        Administrators-specific wrapper around get_structured_response.
        Uses ADMINISTRATORS_NAMES_TOPIC_PATTERNS and Administrators.json.
        """
        return self.get_structured_response(
            user_message=user_message,
            data_source=self.administrators_info,
            topic_patterns=ADMINISTRATORS_NAMES_TOPIC_PATTERNS,
            topic_mapping=None,
            fallback_message="I'm sorry, I didn't understand your question about BUKSU administrators. Could you please rephrase it?"
        )

    def get_admissions_response(self, user_message: str) -> Dict[str, Any]:
        """
        Admissions-specific wrapper around get_structured_response.
        Uses ADMISSIONS_TOPIC_PATTERNS and Admissions_info.json.
        """
        return self.get_structured_response(
            user_message=user_message,
            data_source=self.admissions_info,
            topic_patterns=ADMISSIONS_TOPIC_PATTERNS,
            topic_mapping=None,
            fallback_message="I'm sorry, I didn't understand your admissions question. Could you please rephrase it?"
        )

    def get_classroom_policy_response(self, user_message: str) -> Dict[str, Any]:
        """
        Classroom Policy-specific wrapper around get_structured_response.
        Uses CLASSROOM_TOPICS_PATTERNS and Classroom_policy.json.
        """
        return self.get_structured_response(
            user_message=user_message,
            data_source=self.classroom_policy,
            topic_patterns=CLASSROOM_TOPICS_PATTERNS,
            topic_mapping=None,
            fallback_message="I'm sorry, I didn't understand your classroom policy question. Could you please rephrase it?"
        )

    def get_clinic_response(self, user_message: str) -> Dict[str, Any]:
        """
        Clinic Info-specific wrapper around get_structured_response.
        Uses CLINIC_TOPIC_PATTERNS and Clinic_info.json.
        """
        return self.get_structured_response(
            user_message=user_message,
            data_source=self.clinic_info,
            topic_patterns=CLINIC_TOPIC_PATTERNS,
            topic_mapping=None,
            fallback_message="I'm sorry, I didn't understand your clinic question. Could you please rephrase it?"
        )

    def get_courses_response(self, user_message: str) -> Dict[str, Any]:
        """
        Courses Info-specific wrapper around get_structured_response.
        Uses COURSES_TOPIC_PATTERNS and Courses_info.json.
        """
        # SAFE MECHANISM: Normalize board vs non-board to prevent routing collisions
        # This protected token mapping happens before the actual inference.
        safe_message = normalize_board_phrases(user_message)
        
        return self.get_structured_response(
            user_message=safe_message,
            data_source=self.courses_info,
            topic_patterns=COURSES_TOPIC_PATTERNS,
            topic_mapping=None,
            fallback_message="I'm sorry, I didn't understand your course question. Could you please rephrase it?"
        )

    def get_departamentals_faculty_staff_response(self, user_message: str) -> Dict[str, Any]:
        """
        Departamentals Faculty Staff-specific wrapper around get_structured_response.
        Uses DEPARTMENTS_FACULTY_STAFF_TOPIC_PATTERNS and Departamentals_facultystaff.json.
        """
        return self.get_structured_response(
            user_message=user_message,
            data_source=self.departamentals_faculty_staff,
            topic_patterns=DEPARTMENTS_FACULTY_STAFF_TOPIC_PATTERNS,
            topic_mapping=None,
            fallback_message="I'm sorry, I didn't understand your question about faculty or staff. Could you please rephrase it?"
        )

    def get_department_response(self, user_message: str) -> Dict[str, Any]:
        """
        Department Info-specific wrapper around get_structured_response.
        Uses DEPARTMENT_INFO_TOPIC_PATTERNS and Department_info.json.
        """
        return self.get_structured_response(
            user_message=user_message,
            data_source=self.department_info,
            topic_patterns=DEPARTMENT_INFO_TOPIC_PATTERNS,
            topic_mapping=None,
            fallback_message="I'm sorry, I didn't understand your department question. Could you please rephrase it?"
        )

    def get_enrollment_response(self, user_message: str) -> Dict[str, Any]:
        """
        Enrollment Info-specific wrapper around get_structured_response.
        Uses ENROLLMENT_INFO_TOPIC_PATTERNS and Enrollment_info.json.
        """
        return self.get_structured_response(
            user_message=user_message,
            data_source=self.enrollment_info,
            topic_patterns=ENROLLMENT_INFO_TOPIC_PATTERNS,
            topic_mapping=None,
            fallback_message="I'm sorry, I didn't understand your enrollment question. Could you please rephrase it?"
        )

    def get_ict_response(self, user_message: str) -> Dict[str, Any]:
        """
        ICT Info-specific wrapper around get_structured_response.
        Uses ICT_TOPIC_PATTERNS and Ict_info.json.
        """
        return self.get_structured_response(
            user_message=user_message,
            data_source=self.ict_info,
            topic_patterns=ICT_TOPIC_PATTERNS,
            topic_mapping=None,
            fallback_message="I'm sorry, I didn't understand your ICT question. Could you please rephrase it?"
        )

    def get_oss_services_response(self, user_message: str) -> Dict[str, Any]:
        """
        OSS Services-specific wrapper around get_structured_response.
        Uses OSS_SERVICES_TOPIC_PATTERNS and Oss_services.json.
        """
        return self.get_structured_response(
            user_message=user_message,
            data_source=self.oss_services,
            topic_patterns=OSS_SERVICES_TOPIC_PATTERNS,
            topic_mapping=None,
            fallback_message="I'm sorry, I didn't understand your OSS services question. Could you please rephrase it?"
        )

    def get_university_response(self, user_message: str) -> Dict[str, Any]:
        """
        University Info-specific wrapper around get_structured_response.
        Uses UNIVERSITY_TOPIC_PATTERNS and University_info.json.
        """
        return self.get_structured_response(
            user_message=user_message,
            data_source=self.university_info,
            topic_patterns=UNIVERSITY_TOPIC_PATTERNS,
            topic_mapping=None,
            fallback_message="I'm sorry, I didn't understand your university question. Could you please rephrase it?"
        )

    def get_dormitory_response(self, user_message: str) -> Dict[str, Any]:
        """
        Dormitory Info-specific wrapper around get_structured_response.
        Uses DORMITORY_INFO_TOPIC_PATTERNS and Dormitory_info.json.
        """
        return self.get_structured_response(
            user_message=user_message,
            data_source=self.dormitory_info,
            topic_patterns=DORMITORY_INFO_TOPIC_PATTERNS,
            topic_mapping=None,
            fallback_message="I'm sorry, I didn't understand your dormitory question. Could you please rephrase it?"
        )

    def get_structured_response_with_topic(
        self,
        topic: str,
        data_source: Dict[str, Any],
        fallback_message: str = "I'm sorry, I don't have information about that topic."
    ) -> Dict[str, Any]:
        """
        Get structured response using a pre-determined topic (from entity).
        Skips topic detection since topic is already known.
        
        Args:
            topic: The topic key to look up (e.g., "online_enrollment_steps")
            data_source: The JSON data source containing topics and responses
            fallback_message: Message to return when topic not found
        
        Returns:
            Dict with "text" key containing the response
        """
        if not data_source:
            return {"text": fallback_message}
        
        # Direct topic lookup from data_source
        topics = data_source.get("topics", [])
        topic_entry = next((t for t in topics if t.get("topic") == topic), None)
        
        if not topic_entry:
            return {"text": fallback_message}
        
        # Get responses for the topic
        responses_data = topic_entry.get("responses", {})
        
        # Default to English
        responses = responses_data.get("en")
        if not responses:
            responses = responses_data.get("en", [])
        
        # Combine all response lines
        if isinstance(responses, list):
            response_text = "\n".join(responses)
        else:
            response_text = str(responses)
        
        # Build result with text
        result = {"text": response_text}
        
        # Extract images from topic entry if available
        images = None
        if isinstance(topic_entry.get("images"), list):
            images = [str(x) for x in topic_entry.get("images") if x]
        elif topic_entry.get("image"):
            images = [str(topic_entry.get("image"))]
        
        if images:
            result["images"] = images
            result["image"] = images[0]  # backward compatibility
        
        return result


# -------------------------
# Rasa Actions
# -------------------------
class ActionMainRouter(Action):
    """
    Thin Rasa action entrypoint for the current structured retrieval stack.

    Rasa predicts broad purpose intents, then MainRouterService handles query
    interpretation, entity resolution, context memory, retrieval, and response
    formatting.
    """

    def __init__(self):
        self.helper = ActionReplyFromJsonHelper()
        self.router = MainRouterService(self.helper, LOCATION_ALIASES)
        self.response_builder = ResponseBuilder()

    def name(self) -> str:
        return "action_main_router"

    async def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: dict):
        intent = tracker.latest_message.get("intent", {}).get("name")
        user_msg = tracker.latest_message.get("text", "")
        slot_updates: Dict[str, Any] = {}
        tracker_slots = tracker.current_slot_values()
        self.router.refresh_if_changed()

        if intent == "ask_follow_up":
            last_topic = self.helper.get_dynamic_slot("last_topic") or tracker.get_slot("last_topic")
            follow_ups = self.router.handle_follow_up(last_topic)
            for line in follow_ups:
                dispatcher.utter_message(text=line)
            return []

        # Phase 2 Enhancement: Multi-question handling
        # Detect if user asked multiple questions and process each one
        interpreted = self.router.interpreter.interpret(user_msg)
        
        if interpreted.is_multi_question and len(interpreted.sub_queries) > 1:
            # Process each sub-query and collect responses
            responses = []
            for sub_query in interpreted.sub_queries:
                sub_message = {
                    **tracker.latest_message,
                    "text": sub_query,
                    "entities": [],
                }
                response, context_slots = self.router.route_with_context(
                    intent or "",
                    sub_message,
                    sub_query,
                    {**tracker_slots, **slot_updates},
                )
                slot_updates.update(context_slots)
                responses.append(response)
            # Emit merged response with deduplication and map combination
            self.response_builder.emit_multi_response(dispatcher, responses)
        else:
            # Single question: use standard flow
            response, context_slots = self.router.route_with_context(
                intent or "",
                tracker.latest_message,
                user_msg,
                tracker_slots,
            )
            slot_updates.update(context_slots)
            self.response_builder.emit_response(dispatcher, response)
        
        return [SlotSet(name, value) for name, value in slot_updates.items()]


class ActionReplyFromJson(Action):
    def __init__(self):
        self.helper = ActionReplyFromJsonHelper()

    def name(self) -> str:
        return "action_reply_from_json"

    async def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: dict):

        intent = tracker.latest_message.get("intent", {}).get("name")
        user_msg = tracker.latest_message.get("text", "")
        category = tracker.get_slot("category")
        sub_category = tracker.get_slot("sub_category")

        # Entity-based ComLab lookup
        if intent == "locate_comlab":
            raw_lab = None
            for entity in tracker.latest_message.get("entities", []):
                if entity.get("entity") == "lab_number":
                    raw_lab = entity.get("value")
                    break

            if raw_lab is None:
                raw_lab = tracker.get_slot("lab_number")

            lab_number = self.helper._normalize_lab_number(raw_lab)

            # If lab number exists, respond with lab-specific info
            if lab_number:
                response = self.helper._get_lab_location_response(lab_number, user_msg)

                if response.get("text"):
                    dispatcher.utter_message(text=response["text"])
                if isinstance(response.get("images"), list):
                    for img in response.get("images"):
                        if img:
                            dispatcher.utter_message(image=img)
                elif response.get("image"):
                    dispatcher.utter_message(image=response["image"])
                if response.get("custom"):
                    dispatcher.utter_message(json_message=response["custom"])

                return []

            # If no lab number extracted, use the generic locate_comlab response
            response = self.helper.get_response(
                "locate_comlab",
                category="comlab",
                sub_category="computer_laboratories",
                user_message=user_msg,
            )

            if isinstance(response, dict):
                if response.get("text"):
                    dispatcher.utter_message(text=response["text"])
                if isinstance(response.get("images"), list):
                    for img in response.get("images"):
                        if img:
                            dispatcher.utter_message(image=img)
                elif response.get("image"):
                    dispatcher.utter_message(image=response["image"])
                if response.get("custom"):
                    dispatcher.utter_message(json_message=response["custom"])
            else:
                dispatcher.utter_message(text=response)

            return []

        # Entity-based Location lookup - NOW SUPPORTS MULTIPLE LOCATIONS
        if intent == "ask_locations":
            # Get all location entities from the tracker
            location_entities = list(tracker.get_latest_entity_values("location_name"))
            
            # DEBUG: Log what entities were extracted
            print(f"DEBUG - ask_locations: Extracted entities: {location_entities}")
            
            # Check if extracted entities are valid (not generic words like 'faculty room', 'room')
            invalid_entities = ['faculty room', 'room', 'office', 'building', 'location']
            has_only_invalid = all(
                any(inv in str(ent).lower() for inv in invalid_entities)
                for ent in location_entities
            ) if location_entities else True
            
            # If no entities found OR only invalid generic entities, try to find ALL locations in text
            if not location_entities or has_only_invalid:
                print(f"DEBUG - No valid entities found, searching text for all locations...")
                guessed_locations = self.helper._guess_all_locations_from_text(user_msg)
                if guessed_locations:
                    location_entities = guessed_locations
                    print(f"DEBUG - Found locations in text: {location_entities}")

            if location_entities:
                # DEBUG: Log what we're processing
                print(f"DEBUG - Processing {len(location_entities)} locations: {location_entities}")
                
                processed_count = 0
                all_map_pins = []  # Collect all pins for combined map
                all_map_routes = [] # Collect all routes
                first_map_id = None  # Use the first map_id found
                
                # First pass: send all text and images, collect map data
                for i, location_name in enumerate(location_entities):
                    response = self.helper.get_location_response(location_name, user_msg)
                    
                    # DEBUG: Log each location processing
                    print(f"DEBUG - Processing location {i+1}/{len(location_entities)}: {location_name}")
                    
                    if response.get("text") and not response["text"].startswith("Sorry, I don't have information"):
                        # Send text response for this location
                        dispatcher.utter_message(text=response["text"])
                        print(f"DEBUG - Sent text for {location_name}")
                        
                        # Send image for this location if available
                        if response.get("images"):
                            for img in response["images"]:
                                if img:
                                    dispatcher.utter_message(image=img)
                                    print(f"DEBUG - Sent image for {location_name}")
                        elif response.get("image"):
                            dispatcher.utter_message(image=response["image"])
                            print(f"DEBUG - Sent image for {location_name}")
                        
                        # Collect map data for combined map
                        if response.get("custom") and response["custom"].get("mapData"):
                            map_data = response["custom"]["mapData"]
                            
                            # Track the first map_id we find
                            if first_map_id is None and map_data.get("mapId"):
                                first_map_id = map_data["mapId"]
                            
                            # Collect pins with their custom names
                            if map_data.get("pins"):
                                for pin in map_data["pins"]:
                                    pin_copy = dict(pin)  # Copy to avoid modifying original
                                    # Keep pin name as defined in JSON
                                    all_map_pins.append(pin_copy)
                            elif map_data.get("coordinates"):
                                # If no pins but has coordinates, create a pin
                                pin_data = {
                                    "name": str(map_data.get("locationName", location_name)),
                                    "coordinates": map_data["coordinates"]
                                }
                                if map_data.get("floor"):
                                    pin_data["floor"] = str(map_data.get("floor"))
                                all_map_pins.append(pin_data)
                            
                            # Collect routes
                            if map_data.get("routes"):
                                for route in map_data["routes"]:
                                    all_map_routes.append(dict(route))
                        
                        processed_count += 1

                # If NO entities produced valid results, try searching the raw text for locations
                if processed_count == 0:
                    print(f"DEBUG - No valid results from entities, searching text for all locations...")
                    guessed_locations = self.helper._guess_all_locations_from_text(user_msg)
                    if guessed_locations:
                        print(f"DEBUG - Found locations in text: {guessed_locations}")
                        
                        # Reset collections for new search results
                        all_map_pins = []
                        all_map_routes = []
                        first_map_id = None
                        
                        for i, location_name in enumerate(guessed_locations):
                            response = self.helper.get_location_response(location_name, user_msg)
                            
                            # DEBUG: Log each location processing
                            print(f"DEBUG - Processing location {i+1}/{len(guessed_locations)}: {location_name}")
                            
                            if response.get("text") and not response["text"].startswith("Sorry, I don't have information"):
                                # Send text response for this location
                                dispatcher.utter_message(text=response["text"])
                                print(f"DEBUG - Sent text for {location_name}")
                                
                                # Send image for this location if available
                                if response.get("images"):
                                    for img in response["images"]:
                                        if img:
                                            dispatcher.utter_message(image=img)
                                            print(f"DEBUG - Sent image for {location_name}")
                                elif response.get("image"):
                                    dispatcher.utter_message(image=response["image"])
                                    print(f"DEBUG - Sent image for {location_name}")
                                
                                # Collect map data for combined map
                                if response.get("custom") and response["custom"].get("mapData"):
                                    map_data = response["custom"]["mapData"]
                                    
                                    # Track the first map_id we find
                                    if first_map_id is None and map_data.get("mapId"):
                                        first_map_id = map_data["mapId"]
                                    
                                    # Collect pins with their custom names
                                    if map_data.get("pins"):
                                        for pin in map_data["pins"]:
                                            pin_copy = dict(pin)
                                            # Keep pin name as defined in JSON
                                            all_map_pins.append(pin_copy)
                                    elif map_data.get("coordinates"):
                                        pin_data = {
                                            "name": str(map_data.get("locationName", location_name)),
                                            "coordinates": map_data["coordinates"]
                                        }
                                        if map_data.get("floor"):
                                            pin_data["floor"] = str(map_data.get("floor"))
                                        all_map_pins.append(pin_data)
                                    
                                    # Collect routes
                                    if map_data.get("routes"):
                                        for route in map_data["routes"]:
                                            all_map_routes.append(dict(route))
                                
                                processed_count += 1

                # DEBUG: Log final count
                print(f"DEBUG - Successfully processed {processed_count} locations")
                
                # Send helper text before the combined map (only if multiple pins)
                if all_map_pins and first_map_id and len(all_map_pins) > 1:
                    print(f"DEBUG - Sent zoom out helper text")
                
                # Send combined map with all pins if we have any
                if all_map_pins and first_map_id:
                    loc_name = f"Multiple Locations ({processed_count})" if len(location_entities) > 1 else str(location_entities[0])
                    combined_map = {
                        "mapData": {
                            "locationName": loc_name,
                            "pins": all_map_pins,
                            "routes": all_map_routes,
                            "mapId": first_map_id
                        }
                    }
                    dispatcher.utter_message(json_message=combined_map)
                    print(f"DEBUG - Sent combined map with {len(all_map_pins)} pins and {len(all_map_routes)} routes")

                if processed_count == 0:
                    dispatcher.utter_message(text="Sorry, I couldn't find information about those locations. Please add some (Building or Office) word on the last part of your questions so that we can accuratly send you the location of that spacific building or office for example is (where is the library building)")
                
                return []

            # If no location extracted, use generic response if available
            response = self.helper.get_response(
                "ask_locations",
                user_message=user_msg
            )
            if isinstance(response, dict):
                if response.get("text"):
                    dispatcher.utter_message(text=response["text"])
            else:
                dispatcher.utter_message(text=response)
            return []

        # Entity-based Faculty Room lookup - NOW SUPPORTS MULTIPLE COLLEGES
        if intent == "ask_faculty_room_location":
            # Get all college entities from the tracker
            college_entities = list(tracker.get_latest_entity_values("college"))
            
            # DEBUG: Log what entities were extracted
            print(f"DEBUG - ask_faculty_room_location: Extracted entities: {college_entities}")
            
            if not college_entities:
                slot_college = tracker.get_slot("college")
                if slot_college:
                    college_entities = [slot_college]

            if college_entities:
                # DEBUG: Log what we're processing
                print(f"DEBUG - Processing {len(college_entities)} colleges: {college_entities}")
                
                all_map_pins = []  # Collect all pins for combined map
                all_map_routes = [] # Collect all routes
                first_map_id = None  # Use the first map_id found
                processed_count = 0
                
                # First pass: send all text, collect map data
                for i, college in enumerate(college_entities):
                    response = self.helper._get_faculty_room_response(college, user_msg)
                    
                    # DEBUG: Log each college processing
                    print(f"DEBUG - Processing college {i+1}/{len(college_entities)}: {college}")
                    
                    if response.get("text"):
                        # Send text response for this location
                        dispatcher.utter_message(text=response["text"])
                        print(f"DEBUG - Sent text for {college}")
                        
                        # Collect map data for combined map
                        if response.get("custom") and response["custom"].get("mapData"):
                            map_data = response["custom"]["mapData"]
                            
                            # Track the first map_id we find
                            if first_map_id is None and map_data.get("mapId"):
                                first_map_id = map_data["mapId"]
                            
                            # Collect pins with college name prefix
                            if map_data.get("pins"):
                                for pin in map_data["pins"]:
                                    pin_copy = dict(pin)
                                    college_prefix = str(map_data.get("locationName", f"{college} Faculty Room"))
                                    if "name" in pin_copy:
                                        pin_copy["name"] = f"{college_prefix}: {pin_copy['name']}"
                                    else:
                                        pin_copy["name"] = college_prefix
                                    all_map_pins.append(pin_copy)
                            elif map_data.get("coordinates"):
                                pin_data = {
                                    "name": str(map_data.get("locationName", f"{college} Faculty Room")),
                                    "coordinates": map_data["coordinates"]
                                }
                                if map_data.get("floor"):
                                    pin_data["floor"] = str(map_data.get("floor"))
                                all_map_pins.append(pin_data)
                            
                            # Collect routes
                            if map_data.get("routes"):
                                for route in map_data["routes"]:
                                    all_map_routes.append(dict(route))
                        
                        processed_count += 1
                
                # Send helper text before the combined map (only if multiple pins)
                if all_map_pins and first_map_id and len(all_map_pins) > 1:
                    print(f"DEBUG - Sent zoom out helper text")
                
                # Send combined map with all pins if we have any
                if all_map_pins and first_map_id:
                    loc_name = f"Multiple Faculty Rooms ({processed_count})" if len(college_entities) > 1 else str(college_entities[0]) + " Faculty Room"
                    combined_map = {
                        "mapData": {
                            "locationName": loc_name,
                            "pins": all_map_pins,
                            "routes": all_map_routes,
                            "mapId": first_map_id
                        }
                    }
                    dispatcher.utter_message(json_message=combined_map)
                    print(f"DEBUG - Sent combined map with {len(all_map_pins)} pins and {len(all_map_routes)} routes")
                
                return []

            # If no college extracted, use generic response
            response = self.helper.get_response(
                "ask_faculty_room_location",
                user_message=user_msg
            )
            
            if isinstance(response, dict):
                if response.get("text"):
                    dispatcher.utter_message(text=response["text"])
            else:
                dispatcher.utter_message(text=response)
            
            return []

        # ==================================================
        # CONSOLIDATED: All other intents delegate to Phase 2
        # ==================================================
        # Delegate all intent-based handling to ActionMainRouter for unified Phase 2 routing.
        # This consolidates all specialized intent handlers and removes technical debt.
        action_main_router = ActionMainRouter()
        await action_main_router.run(dispatcher, tracker, domain)
        return []


class ActionSetDynamicSlot(Action):
    """Set any dynamic slot during the conversation."""
    def __init__(self):
        self.helper = ActionReplyFromJsonHelper()

    def name(self) -> str:
        return "action_set_dynamic_slot"

    async def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: dict):
        slot_name = tracker.get_slot("slot_name")
        slot_value = tracker.get_slot("slot_value")
        if slot_name and slot_value:
            self.helper.set_dynamic_slot(slot_name, slot_value)
            dispatcher.utter_message(text=f"Slot '{slot_name}' set to '{slot_value}'.")
        return []
