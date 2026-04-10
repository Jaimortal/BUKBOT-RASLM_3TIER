import json
import os
import random
import re
import sys
import importlib.util
from typing import Any, Text, Dict, List, Optional

from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher

# Load Topic Router modules (handling space in folder name)
current_dir = os.path.dirname(os.path.abspath(__file__))
topic_router_dir = os.path.join(current_dir, "Topic Router")
magical_aliases_dir = os.path.join(current_dir, "Magical Aliases")
sys.path.insert(0, topic_router_dir)
sys.path.insert(0, magical_aliases_dir)

# Import LOCATION_ALIASES from Magical Aliases
spec = importlib.util.spec_from_file_location("aliases", os.path.join(magical_aliases_dir, "aliases.py"))
aliases_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(aliases_module)
LOCATION_ALIASES = aliases_module.LOCATION_ALIASES

# Import all topic pattern modules
spec = importlib.util.spec_from_file_location("Library_info_topicroute", os.path.join(topic_router_dir, "Library_info_topicroute.py"))
Library_info_topicroute = importlib.util.module_from_spec(spec)
spec.loader.exec_module(Library_info_topicroute)
LIBRARY_TOPIC_PATTERNS = Library_info_topicroute.LIBRARY_TOPIC_PATTERNS

spec = importlib.util.spec_from_file_location("Academic_policy_topicroute", os.path.join(topic_router_dir, "Academic_policy_topicroute.py"))
Academic_policy_topicroute = importlib.util.module_from_spec(spec)
spec.loader.exec_module(Academic_policy_topicroute)
ACADEMIC_POLICY_TOPIC_PATTERNS = Academic_policy_topicroute.ACADEMIC_POLICY_TOPIC_PATTERNS

spec = importlib.util.spec_from_file_location("Administrators_topicroute", os.path.join(topic_router_dir, "Administrators_topicroute.py"))
Administrators_topicroute = importlib.util.module_from_spec(spec)
spec.loader.exec_module(Administrators_topicroute)
ADMINISTRATORS_NAMES_TOPIC_PATTERNS = Administrators_topicroute.ADMINISTRATORS_NAMES_TOPIC_PATTERNS

spec = importlib.util.spec_from_file_location("Admissions_topicroute", os.path.join(topic_router_dir, "Admissions_topicroute.py"))
Admissions_topicroute = importlib.util.module_from_spec(spec)
spec.loader.exec_module(Admissions_topicroute)
ADMISSIONS_TOPIC_PATTERNS = Admissions_topicroute.ADMISSIONS_TOPIC_PATTERNS

spec = importlib.util.spec_from_file_location("Classroom_topicroute", os.path.join(topic_router_dir, "Classroom_topicroute.py"))
Classroom_topicroute = importlib.util.module_from_spec(spec)
spec.loader.exec_module(Classroom_topicroute)
CLASSROOM_TOPICS_PATTERNS = Classroom_topicroute.CLASSROOM_TOPICS_PATTERNS

spec = importlib.util.spec_from_file_location("Clinic_info_topicroute", os.path.join(topic_router_dir, "Clinic_info_topicroute.py"))
Clinic_info_topicroute = importlib.util.module_from_spec(spec)
spec.loader.exec_module(Clinic_info_topicroute)
CLINIC_TOPIC_PATTERNS = Clinic_info_topicroute.CLINIC_TOPIC_PATTERNS

spec = importlib.util.spec_from_file_location("Courses_info_topicroute", os.path.join(topic_router_dir, "Courses_info_topicroute.py"))
Courses_info_topicroute = importlib.util.module_from_spec(spec)
spec.loader.exec_module(Courses_info_topicroute)
COURSES_TOPIC_PATTERNS = Courses_info_topicroute.COURSES_TOPIC_PATTERNS

spec = importlib.util.spec_from_file_location("Departamentals_facultystaff_topicroute", os.path.join(topic_router_dir, "Departamentals_facultystaff_topicroute.py"))
Departamentals_facultystaff_topicroute = importlib.util.module_from_spec(spec)
spec.loader.exec_module(Departamentals_facultystaff_topicroute)
DEPARTMENTS_FACULTY_STAFF_TOPIC_PATTERNS = Departamentals_facultystaff_topicroute.DEPARTMENTS_FACULTY_STAFF_TOPIC_PATTERNS

spec = importlib.util.spec_from_file_location("Department_info_topicroute", os.path.join(topic_router_dir, "Department_info_topicroute.py"))
Department_info_topicroute = importlib.util.module_from_spec(spec)
spec.loader.exec_module(Department_info_topicroute)
DEPARTMENT_INFO_TOPIC_PATTERNS = Department_info_topicroute.DEPARTMENT_INFO_TOPIC_PATTERNS

spec = importlib.util.spec_from_file_location("Enrollment_topicroute", os.path.join(topic_router_dir, "Enrollment_topicroute.py"))
Enrollment_topicroute = importlib.util.module_from_spec(spec)
spec.loader.exec_module(Enrollment_topicroute)
ENROLLMENT_INFO_TOPIC_PATTERNS = Enrollment_topicroute.ENROLLMENT_INFO_TOPIC_PATTERNS

spec = importlib.util.spec_from_file_location("Ict_info_topicroute", os.path.join(topic_router_dir, "Ict_info_topicroute.py"))
Ict_info_topicroute = importlib.util.module_from_spec(spec)
spec.loader.exec_module(Ict_info_topicroute)
ICT_TOPIC_PATTERNS = Ict_info_topicroute.ICT_TOPIC_PATTERNS

spec = importlib.util.spec_from_file_location("Oss_services_topicroute", os.path.join(topic_router_dir, "Oss_services_topicroute.py"))
Oss_services_topicroute = importlib.util.module_from_spec(spec)
spec.loader.exec_module(Oss_services_topicroute)
OSS_SERVICES_TOPIC_PATTERNS = Oss_services_topicroute.OSS_SERVICES_TOPIC_PATTERNS

spec = importlib.util.spec_from_file_location("University_info_topicroute", os.path.join(topic_router_dir, "University_info_topicroute.py"))
University_info_topicroute = importlib.util.module_from_spec(spec)
spec.loader.exec_module(University_info_topicroute)
UNIVERSITY_TOPIC_PATTERNS = University_info_topicroute.UNIVERSITY_TOPIC_PATTERNS

spec = importlib.util.spec_from_file_location("Dormitory_info_topicroute", os.path.join(topic_router_dir, "Dormitory_info_topicroute.py"))
Dormitory_info_topicroute = importlib.util.module_from_spec(spec)
spec.loader.exec_module(Dormitory_info_topicroute)
DORMITORY_INFO_TOPIC_PATTERNS = Dormitory_info_topicroute.DORMITORY_INFO_TOPIC_PATTERNS

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

# Strong context identifiers for library ID subtopics (must be present for ID card topics)
LIBRARY_ID_CONTEXT = {"library", "id", "card", "libraryid", "schoolid"}


def _has_library_id_context(text: str) -> bool:
    """Check if text contains library ID context (both 'library' and 'id' nearby)."""
    text_lower = text.lower()
    # Check for compound forms first
    if "libraryid" in text_lower or "library id" in text_lower or "schoolid" in text_lower:
        return True
    # Check for both words in close proximity (within 5 words)
    words = re.findall(r'\b\w+\b', text_lower)
    for i, word in enumerate(words):
        if word in ("library", "school"):
            # Look for "id" or "card" within next 3 words
            window = words[i:min(i+4, len(words))]
            if any(w in ("id", "card") for w in window):
                return True
        if word in ("id", "card"):
            # Look for "library" or "school" within previous 3 words
            start = max(0, i-3)
            window = words[start:i+1]
            if any(w in ("library", "school") for w in window):
                return True
    return False


def _check_required_context(text: str, required_context: List[str]) -> bool:
    """Check if text contains all required context markers."""
    if not required_context:
        return True
    
    for context in required_context:
        if context == "library_id":
            if not _has_library_id_context(text):
                return False
    return True


def _calculate_topic_score(text: str, topic_data: Dict[str, Any]) -> float:
    """
    Calculate a matching score for a topic based on:
    - Exact phrase matches (highest priority)
    - Strong keyword matches (high weight)
    - Weak keyword matches (low weight)
    - Penalty for weak/common words
    """
    text_lower = text.lower()
    words = set(re.findall(r'\b\w+\b', text_lower))
    
    # Check exact phrases first - return max score if found
    phrases = topic_data.get("phrases", [])
    for phrase in phrases:
        if phrase.lower() in text_lower:
            return 100.0  # Exact phrase match = highest score
    
    # Calculate keyword-based score
    score = 0.0
    
    # Strong keywords: +3 points each (these are topic-specific)
    strong_keywords = topic_data.get("strong_keywords", [])
    for keyword in strong_keywords:
        keyword_lower = keyword.lower()
        if re.search(rf'\b{re.escape(keyword_lower)}\b', text_lower):
            score += 3.0
        # Also check if any word contains this keyword (only if it's long enough to avoid false positives)
        elif len(keyword_lower) > 3 and any(keyword_lower in word for word in words):
            score += 2.5
    
    # Weak keywords: +1 point each (common across topics)
    weak_keywords = topic_data.get("weak_keywords", [])
    for keyword in weak_keywords:
        keyword_lower = keyword.lower()
        if re.search(rf'\b{re.escape(keyword_lower)}\b', text_lower):
            score += 1.0
    
    # Penalty for weak/common words (they dilute specificity)
    common_word_count = sum(1 for word in words if word in WEAK_COMMON_WORDS)
    if common_word_count > 0:
        score -= common_word_count * 0.1
    
    return max(0, score)


def detect_topic(text: str, topic_patterns: Dict[str, Any]) -> Optional[str]:
    """
    Detects the topic from user text using smart scoring.
    
    Scoring system:
    - Exact phrase match: 100 (immediate return)
    - Strong keywords: +3 each (topic-specific words)
    - Weak keywords: +1 each (common words)
    - Common words penalty: -0.1 each
    - Required context must be present for certain topics
    
    Returns the topic key with highest score above threshold, or None.
    """
    if not text or not text.strip():
        return None
    
    text_lower = text.lower()
    best_topic = None
    best_score = 0.0
    min_score_threshold = 2.0  # Minimum score to be considered a match
    
    # Collect all scores for potential tie-breaking
    topic_scores = []
    
    for topic, topic_data in topic_patterns.items():
        # Check required context first (e.g., must have "library id" for ID topics)
        required_context = topic_data.get("required_context", [])
        if not _check_required_context(text_lower, required_context):
            continue
        
        # Calculate score for this topic
        score = _calculate_topic_score(text_lower, topic_data)
        
        if score > 0:
            topic_scores.append((topic, score))
        
        # Track best match
        if score > best_score:
            best_score = score
            best_topic = topic
    
    # Debug logging (remove in production if desired)
    if topic_scores:
        sorted_scores = sorted(topic_scores, key=lambda x: x[1], reverse=True)
        print(f"DEBUG - Topic scores: {sorted_scores[:3]}")  # Top 3
    
    # Return best topic if it meets threshold
    if best_score >= min_score_threshold:
        return best_topic
    
    return None


def normalize_board_phrases(text: str) -> str:
    """
    SAFE NON-BOARD PRIORITY DETECTION & PHRASE NORMALIZATION
    Normalizes all non-board variants into a protected internal token 'non_board_token'.
    This ensures 'non board' is NEVER incorrectly classified as 'board courses'
    by preventing the ambiguous word 'board' from triggering.
    This must happen BEFORE topic scoring.
    """
    if not text:
        return text
        
    normalized = text.lower()
    
    # Normalize non-board variants into a protected token
    non_board_patterns = [
        r'\bnon[-\s]board\b',
        r'\bwithout\s+board\b',
        r'\bwalay\s+board\b',
        r'\bdili\s+board\b',
        r'\bno\s+board\b'
    ]
    
    for pattern in non_board_patterns:
        normalized = re.sub(pattern, 'non_board_token', normalized)
        
    return normalized


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
        supper_saiyan_dir = os.path.join(os.path.dirname(responses_path), "Supper Saiyan")
        
        # Library and Academic Policy (already exist at root level too)
        self.library_info_path = os.path.join(supper_saiyan_dir, "Library_info.json")
        self.library_info = self._load_json_file(self.library_info_path)
        
        self.academic_policy_path = os.path.join(supper_saiyan_dir, "Academic_policy.json")
        self.academic_policy = self._load_json_file(self.academic_policy_path)
        
        # Administrators
        self.administrators_path = os.path.join(supper_saiyan_dir, "Administrators.json")
        self.administrators_info = self._load_json_file(self.administrators_path)
        
        # Admissions
        self.admissions_path = os.path.join(supper_saiyan_dir, "Admissions_info.json")
        self.admissions_info = self._load_json_file(self.admissions_path)
        
        # Classroom Policy
        self.classroom_policy_path = os.path.join(supper_saiyan_dir, "Classroom_policy.json")
        self.classroom_policy = self._load_json_file(self.classroom_policy_path)
        
        # Clinic Info
        self.clinic_info_path = os.path.join(supper_saiyan_dir, "Clinic_info.json")
        self.clinic_info = self._load_json_file(self.clinic_info_path)
        
        # Courses Info
        self.courses_info_path = os.path.join(supper_saiyan_dir, "Courses_info.json")
        self.courses_info = self._load_json_file(self.courses_info_path)
        
        # Departmentals Faculty Staff
        self.departamentals_path = os.path.join(supper_saiyan_dir, "Departamentals_facultystaff.json")
        self.departamentals_faculty_staff = self._load_json_file(self.departamentals_path)
        
        # Department Info
        self.department_info_path = os.path.join(supper_saiyan_dir, "Department_info.json")
        self.department_info = self._load_json_file(self.department_info_path)
        
        # Enrollment Info
        self.enrollment_info_path = os.path.join(supper_saiyan_dir, "Enrollment_info.json")
        self.enrollment_info = self._load_json_file(self.enrollment_info_path)
        
        # ICT Info
        self.ict_info_path = os.path.join(supper_saiyan_dir, "Ict_info.json")
        self.ict_info = self._load_json_file(self.ict_info_path)
        
        # OSS Services
        self.oss_services_path = os.path.join(supper_saiyan_dir, "Oss_services.json")
        self.oss_services = self._load_json_file(self.oss_services_path)
        
        # University Info
        self.university_info_path = os.path.join(supper_saiyan_dir, "University_info.json")
        self.university_info = self._load_json_file(self.university_info_path)
        
        # Dormitory Info
        self.dormitory_info_path = os.path.join(supper_saiyan_dir, "Dormitory_info.json")
        self.dormitory_info = self._load_json_file(self.dormitory_info_path)
        
        self.context = ConversationContext()

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
            # Detect language from user_message (improved heuristic)
            preferred_lang = "en"
            # More precise Bisaya detection with word boundaries
            bisaya_words = [
                "unsay", "unsa", "asa", "ngano", "diin", "kinsa", "kanus-a", 
                "pila", "gamay", "dako", "mao", "ug", "uy", "man", "gani", 
                "diay", "sige", "kinahanglan", "bisan", "sab", "gud", "pod", 
                "wala", "naa", "ikaw", "ako", "unsaon", "unsaon nako", 
                "unsaon nato", "unsaon ta", "ahamanato", "ahaman ta", 
                "ahaman nato", "ahaman ko", "ahaman ka", "nganong"
            ]
            # Use word boundary matching to avoid false positives
            user_words = user_message.lower().split()
            if any(word in bisaya_words for word in user_words):
                preferred_lang = "ceb"

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
            if isinstance(fallback, list):
                return random.choice(fallback)
            return fallback
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
        
        # Detect language
        bisaya_words = [
            "asa", "unsay", "ngano", "diin", "kinsa", "kanus-a", "pila",
            "gamay", "dako", "mao", "ug", "uy", "man", "gani", 
            "diay", "sige", "kinahanglan", "bisan", "sab", "gud", 
            "pod", "wala", "naa", "ikaw", "ako", "Pwedi", "unsaon", "onsaon",
            "palihog", "tabangi", "tabang", "taba", "tabange"
            ]
        user_words = user_message.lower().split()
        is_bisaya = any(word in bisaya_words for word in user_words)
        lang_key = "ceb" if is_bisaya else "en"
        responses = location_info.get("responses", {}).get(lang_key)
        if not responses:
            responses = location_info.get("responses", {}).get("en", [])
        
        if isinstance(responses, list):
            response_text = "\n".join(responses)
        else:
            response_text = str(responses)
        
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
                coords = None
                if isinstance(p, dict) and isinstance(p.get("coordinates"), list) and len(p.get("coordinates")) == 2:
                    coords = p.get("coordinates")
                name = None
                if isinstance(p, dict):
                    name = str(p.get("name") or "").strip()
                if not name:
                    name = f"Pin {idx + 1}"
                if coords:
                    pins_out.append({"name": name, "coordinates": coords})

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
        
        return result
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
        
        # Detect language for bilingual support (improved heuristic)
        bisaya_words = [
            "asa", "unsay", "ngano", "diin", "kinsa", "kanus-a", "pila", "gamay", 
            "dako", "mao", "ug", "uy", "man", "gani", "diay", "sige", "kinahanglan", 
            "bisan", "sab", "gud", "pod", "wala", "naa", "ikaw", "ako"
        ]
        user_words = user_message.lower().split()
        is_bisaya = any(word in bisaya_words for word in user_words)
        
        # Get the appropriate language responses
        lang_key = "ceb" if is_bisaya else "en"
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
        
        # Detect language for bilingual support (improved heuristic)
        bisaya_words = [
            "asa", "unsay", "ngano", "diin", "kinsa", "kanus-a", "pila", "gamay", 
            "dako", "mao", "ug", "uy", "man", "gani", "diay", "sige", "kinahanglan", 
            "bisan", "sab", "gud", "pod", "wala", "naa", "ikaw", "ako"
        ]
        user_words = user_message.lower().split()
        is_bisaya = any(word in bisaya_words for word in user_words)
        
        # Get the appropriate language responses
        lang_key = "ceb" if is_bisaya else "en"
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
                coords = None
                if isinstance(p, dict) and isinstance(p.get("coordinates"), list) and len(p.get("coordinates")) == 2:
                    coords = p.get("coordinates")
                name = None
                if isinstance(p, dict):
                    name = str(p.get("name") or "").strip()
                if not name:
                    name = f"Pin {idx + 1}"
                if coords:
                    pins_out.append({"name": name, "coordinates": coords})

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
            language_keywords: Optional list of keywords to detect non-English language
        
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
        
        # Detect language for bilingual support
        # Default language keywords if not provided
        if language_keywords is None:
            language_keywords = [
                "asa", "unsay", "ngano", "diin", "kinsa", "kanus-a", "pila", "gamay",
                "dako", "mao", "ug", "uy", "man", "gani", "diay", "sige", "kinahanglan",
                "bisan", "sab", "gud", "pod", "wala", "naa", "ikaw", "ako", "unsaon",
                "hulam", "uli", "libro", "bayad", "multa"
            ]
        
        user_words = user_message.lower().split()
        is_bisaya = any(word in language_keywords for word in user_words)
        lang_key = "ceb" if is_bisaya else "en"
        
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
                                all_map_pins.append({
                                    "name": str(map_data.get("locationName", location_name)),
                                    "coordinates": map_data["coordinates"]
                                })
                            
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
                                        all_map_pins.append({
                                            "name": str(map_data.get("locationName", location_name)),
                                            "coordinates": map_data["coordinates"]
                                        })
                                    
                                    # Collect routes
                                    if map_data.get("routes"):
                                        for route in map_data["routes"]:
                                            all_map_routes.append(dict(route))
                                
                                processed_count += 1

                # DEBUG: Log final count
                print(f"DEBUG - Successfully processed {processed_count} locations")
                
                # Send helper text before the combined map (only if multiple pins)
                if all_map_pins and first_map_id and len(all_map_pins) > 1:
                    dispatcher.utter_message(text="Please press the zoom out button to see the other pinpoint of the map")
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
                    dispatcher.utter_message(text="Sorry, I couldn't find information about those locations.")
                
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
                                all_map_pins.append({
                                    "name": str(map_data.get("locationName", f"{college} Faculty Room")),
                                    "coordinates": map_data["coordinates"]
                                })
                            
                            # Collect routes
                            if map_data.get("routes"):
                                for route in map_data["routes"]:
                                    all_map_routes.append(dict(route))
                        
                        processed_count += 1
                
                # Send helper text before the combined map (only if multiple pins)
                if all_map_pins and first_map_id and len(all_map_pins) > 1:
                    dispatcher.utter_message(text="Please press the zoom out button to see the other pinpoint of the map")
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

        # Library info lookup with topic detection
        if intent == "ask_library_info":
            response = self.helper.get_library_response(user_msg)
            
            if response.get("text"):
                dispatcher.utter_message(text=response["text"])
            return []

        # Academic Policy info lookup with topic detection
        if intent == "ask_academic_policy":
            response = self.helper.get_academic_policy_response(user_msg)
            
            if response.get("text"):
                dispatcher.utter_message(text=response["text"])
            return []

        # Administrators info lookup with topic detection
        if intent == "ask_buksuadmin_info":
            response = self.helper.get_administrators_response(user_msg)
            
            if response.get("text"):
                dispatcher.utter_message(text=response["text"])
            return []

        # Admissions info lookup with topic detection
        if intent == "ask_admissions_info":
            response = self.helper.get_admissions_response(user_msg)
            
            if response.get("text"):
                dispatcher.utter_message(text=response["text"])
            return []

        # Classroom Policy info lookup with topic detection
        if intent == "ask_classroom_policy":
            response = self.helper.get_classroom_policy_response(user_msg)
            
            if response.get("text"):
                dispatcher.utter_message(text=response["text"])
            return []

        # Clinic info lookup with topic detection
        if intent == "ask_clinic_info":
            response = self.helper.get_clinic_response(user_msg)
            
            if response.get("text"):
                dispatcher.utter_message(text=response["text"])
            return []

        # Courses info lookup with topic detection
        if intent == "ask_courses_info":
            response = self.helper.get_courses_response(user_msg)
            
            if response.get("text"):
                dispatcher.utter_message(text=response["text"])
            return []

        # Departamentals Faculty Staff info lookup with topic detection
        if intent == "departments_faculty_staff":
            response = self.helper.get_departamentals_faculty_staff_response(user_msg)
            
            if response.get("text"):
                dispatcher.utter_message(text=response["text"])
            return []

        # Department info lookup with topic detection
        if intent == "ask_department_info":
            response = self.helper.get_department_response(user_msg)
            
            if response.get("text"):
                dispatcher.utter_message(text=response["text"])
            return []

        # Enrollment info lookup with topic detection
        if intent == "ask_enrollment_info":
            # Check if topic entity was provided (e.g., from quick access payload)
            topic_entity = None
            for entity in tracker.latest_message.get("entities", []):
                if entity.get("entity") == "topic":
                    topic_entity = entity.get("value")
                    break
            
            # If no topic entity from this message, check slot
            if not topic_entity:
                topic_entity = tracker.get_slot("topic")
            
            # Use entity if available, otherwise detect from message
            if topic_entity:
                response = self.helper.get_structured_response_with_topic(
                    topic_entity,
                    self.helper.enrollment_info,
                    fallback_message="I'm sorry, I don't have information about that enrollment topic."
                )
            else:
                response = self.helper.get_enrollment_response(user_msg)
            
            if response.get("text"):
                dispatcher.utter_message(text=response["text"])
            return []

        # ICT info lookup with topic detection
        if intent == "ask_ict_info":
            response = self.helper.get_ict_response(user_msg)
            
            if response.get("text"):
                dispatcher.utter_message(text=response["text"])
            return []

        # OSS Services info lookup with topic detection
        if intent == "ask_oss_services":
            response = self.helper.get_oss_services_response(user_msg)
            
            if response.get("text"):
                dispatcher.utter_message(text=response["text"])
            return []

        # University info lookup with topic detection
        if intent == "ask_university_info":
            response = self.helper.get_university_response(user_msg)
            
            if response.get("text"):
                dispatcher.utter_message(text=response["text"])
            
            # Send images if available
            if isinstance(response.get("images"), list):
                for img in response.get("images"):
                    if img:
                        dispatcher.utter_message(image=img)
            elif response.get("image"):
                dispatcher.utter_message(image=response["image"])
            
            return []

        # Dormitory info lookup with topic detection
        if intent == "ask_dormitory_info":
            # Check if topic entity was provided (e.g., from quick access payload)
            topic_entity = None
            for entity in tracker.latest_message.get("entities", []):
                if entity.get("entity") == "topic":
                    topic_entity = entity.get("value")
                    break
            
            # If no topic entity from this message, check slot
            if not topic_entity:
                topic_entity = tracker.get_slot("topic")
            
            # Use entity if available, otherwise detect from message
            if topic_entity:
                response = self.helper.get_structured_response_with_topic(
                    topic_entity,
                    self.helper.dormitory_info,
                    fallback_message="I'm sorry, I don't have information about that dormitory topic."
                )
            else:
                response = self.helper.get_dormitory_response(user_msg)
            
            if response.get("text"):
                dispatcher.utter_message(text=response["text"])
            return []

        # ✨ FIX: if intent == ask_more → DO NOT call main response
        if intent == "ask_more":
            last_topic = self.helper.get_dynamic_slot("last_topic")
            follow_ups = self.helper.get_follow_up(last_topic)

            for line in follow_ups:
                dispatcher.utter_message(text=line)
            return []

        # Otherwise → normal answer
        response = self.helper.get_response(
            intent, category=category,
            sub_category=sub_category,
            user_message=user_msg
        )

        # If NLU intent is not ask_locations but the text clearly contains a known location alias,
        # answer with location response instead of generic fallback.
        # BUT: Skip this override if the user is asking about ID cards, enrollment, or services
        # to prevent confusing service questions with location questions.
        SERVICE_KEYWORDS = [
            "id card", "library id", "library card", "library id card",
            "school id", "get id", "how to get", "apply for",
            "enroll", "enrollment", "application", "register", "registration",
            "requirement", "requirements", "what do i need", "what should i bring",
            "pay", "payment", "how much", "fee", "cost", "price",
            "borrow", "return", "book", "thesis", "research", "contact registrar",
            "contact the registrar", "contact", "how to contact", "created you",
            "who created", "who created you"
        ]
        
        if intent not in {"ask_locations", "locate_comlab", "ask_faculty_room_location", "ask_more", "Bot_creator"}:
            # Check if it's actually a service question, not a location question
            text_lower = user_msg.lower()
            is_service_question = any(keyword in text_lower for keyword in SERVICE_KEYWORDS)
            
            if not is_service_question:
                guessed = self.helper._guess_location_from_text(user_msg)
                if guessed:
                    loc_resp = self.helper.get_location_response(guessed, user_msg)
                    if loc_resp and loc_resp.get("text") and not loc_resp["text"].startswith("Sorry, I don't have information"):
                        dispatcher.utter_message(text=loc_resp["text"])
                        if loc_resp.get("custom"):
                            dispatcher.utter_message(json_message=loc_resp["custom"])
                        return []
        
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
