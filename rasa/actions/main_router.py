import re
import time
from copy import deepcopy
from typing import Any, Dict, List, Tuple

from context_manager import ContextManager, ConversationMemory
from data_loader import KnowledgeDataLoader
from entity_resolver import EntityResolver
from knowledge_router import KnowledgeRouter
from query_interpreter import QueryInterpreter
from response_builder import ResponseBuilder


class MainRouterService:
    """Coordinates Phase 2 query interpretation, entity resolution, and routing."""

    CACHE_TTL_SECONDS = 10 * 60
    CACHE_MAX_ENTRIES = 128

    def __init__(self, helper: Any, location_aliases: Dict[str, str]):
        self.interpreter = QueryInterpreter()
        self.entity_resolver = EntityResolver(location_aliases)
        self.data_loader = KnowledgeDataLoader(helper)
        self.knowledge_router = KnowledgeRouter(self.data_loader, self.interpreter)
        self.context_manager = ContextManager(self.interpreter, self.data_loader.context_index)
        self.response_builder = ResponseBuilder()
        self._response_cache: Dict[str, Dict[str, Any]] = {}

    def refresh_if_changed(self) -> bool:
        if not self.data_loader.refresh_if_changed():
            return False
        self.knowledge_router = KnowledgeRouter(self.data_loader, self.interpreter)
        self.context_manager.context_index = self.data_loader.context_index
        self._response_cache.clear()
        return True

    def _cache_language(self, user_message: str) -> str:
        detector = getattr(self.data_loader.helper, "detect_language", None)
        if callable(detector):
            try:
                return str(detector(user_message) or "en")
            except Exception:
                return "en"
        return "en"

    def _cache_key(self, purpose: str, subject: str, user_message: str) -> str:
        language = self._cache_language(user_message)
        normalized_subject = self.interpreter.normalize_for_search(subject)
        return f"{purpose}|{language}|{normalized_subject}"

    def _cache_get(self, key: str) -> Any:
        entry = self._response_cache.get(key)
        if not entry:
            return None
        if time.time() - float(entry.get("created_at", 0)) > self.CACHE_TTL_SECONDS:
            self._response_cache.pop(key, None)
            return None
        return deepcopy(entry.get("response"))

    def _cache_set(self, key: str, response: Any) -> None:
        if not self._is_cacheable_response(response):
            return
        if len(self._response_cache) >= self.CACHE_MAX_ENTRIES:
            oldest_key = min(
                self._response_cache,
                key=lambda item: float(self._response_cache[item].get("created_at", 0)),
            )
            self._response_cache.pop(oldest_key, None)
        self._response_cache[key] = {
            "created_at": time.time(),
            "response": deepcopy(response),
        }

    def _is_cacheable_response(self, response: Any) -> bool:
        text = self._response_text(response).lower()
        if not text.strip():
            return False
        blocked_terms = [
            "i'm not sure",
            "i cannot understand",
            "could you rephrase",
            "try rephrasing",
            "can you clarify",
            "do you mean",
            "which ",
            "sorry, i don't have location information",
            "sorry, i do not have location information",
        ]
        return not any(term in text for term in blocked_terms)

    def _response_text(self, response: Any) -> str:
        if isinstance(response, str):
            return response
        if isinstance(response, dict):
            parts: List[str] = []
            for key in ("text", "answer"):
                value = response.get(key)
                if isinstance(value, list):
                    parts.extend(str(item) for item in value)
                elif value:
                    parts.append(str(value))
            return " ".join(parts)
        if isinstance(response, list):
            return " ".join(self._response_text(item) for item in response)
        return str(response or "")

    def resolve(self, latest_message: Dict[str, Any], user_message: str):
        return self.entity_resolver.resolve(latest_message, user_message)

    def handle_smalltalk(self, user_message: str) -> Any:
        text = self.interpreter.normalize(user_message)
        if "made" in text or "created" in text or "create" in text or "naghimo" in text:
            return self.data_loader.get_response("Bot_creator", user_message=user_message)
        if any(word in text for word in ["thank", "thanks", "salamat"]):
            return "You're welcome. You can ask me anytime."
        return "Hello! How can I assist you today?"

    def handle_follow_up(self, last_topic: str) -> List[str]:
        return self.data_loader.get_follow_up(last_topic)

    def _looks_like_location_request(self, user_message: str, resolved: Any) -> bool:
        if not resolved.locations:
            return False

        text = self.interpreter.normalize(user_message)
        if self.knowledge_router._facility_availability_route(user_message):
            return False
        if self._looks_like_library_service_request(user_message):
            return False
        if self._looks_like_admission_service_request(user_message):
            return False
        location_terms = [
            "where", "location", "located", "find", "go to", "get to",
            "direction", "directions", "how to go", "how do i get",
            "room", "building", "office", "campus", "inside", "desk", "window", "gate",
            "park", "parking", "parking area",
            "asa", "hain", "diin", "dapit", "makita", "makit-an", "locate",
        ]
        if any(term in text for term in location_terms):
            return True

        non_location_followups = [
            "hour", "hours", "schedule", "time", "open", "close", "when",
            "fee", "fees", "payment", "pay", "requirement", "requirements",
            "need", "process", "steps", "how much", "service", "services",
            "course", "courses", "program", "programs", "offer", "offers",
        ]
        if any(term in text for term in non_location_followups):
            return False

        return len(self.interpreter.tokens(text)) <= 3

    def _should_prioritize_location(self, intent: str, user_message: str, resolved: Any) -> bool:
        """Use location data early only for clearly location-shaped requests.

        Many college acronyms are both buildings and academic subjects. This
        keeps "where is COT faculty room" as a map answer, while allowing
        "who is dean of COT" and "do you offer COT courses" to keep using
        the structured knowledge layer.
        """
        if not self._looks_like_location_request(user_message, resolved):
            return False

        text = self.interpreter.normalize(user_message)
        if self.knowledge_router._facility_availability_route(user_message):
            return False
        if self._looks_like_library_service_request(user_message):
            return False
        if self._looks_like_admission_service_request(user_message):
            return False
        tokens = set(self.interpreter.tokens(text))
        asks_person_role = (
            any(word in tokens for word in ["who", "whos", "kinsa"]) and
            any(term in text for term in ["dean", "head", "chairperson", "program chair"])
        )
        if asks_person_role and "office" not in text:
            return False

        subject_phrases = ["library id", "library card", "student id", "school id"]
        if any(phrase in text for phrase in subject_phrases):
            return False

        structured_map_subjects = ["dorm", "dormitory", "mahogany", "rubia"]
        if any(term in text for term in structured_map_subjects):
            return False

        strong_location_terms = [
            "where", "location", "located", "find", "go to", "get to",
            "direction", "directions", "how to go", "how do i get",
            "room", "building", "office", "campus", "inside", "desk",
            "window", "gate", "classroom", "park", "parking", "parking area",
            "asa", "hain", "diin", "dapit", "makita", "makit-an", "locate",
        ]
        if any(term in text for term in strong_location_terms):
            return True

        return intent == "ask_location" and len(self.interpreter.tokens(text)) <= 3

    def _looks_like_library_service_request(self, user_message: str) -> bool:
        text = self.interpreter.normalize_for_search(user_message)
        has_book_or_resource = any(term in text for term in [
            "book", "books", "library resources", "library resource",
        ])
        has_service_action = any(term in text for term in [
            "borrow", "return", "give back", "available", "availability",
            "get", "getting", "process", "steps",
            "ask for available", "resource", "resources", "penalty", "fine",
            "unreturned", "overdue", "late return", "policy", "rules",
            "reserve", "how many",
        ])
        return has_book_or_resource and has_service_action

    def _looks_like_admission_service_request(self, user_message: str) -> bool:
        text = self.interpreter.normalize_for_search(user_message)
        has_admission_context = any(term in text for term in [
            "admission", "admissions", "buksu cat", "cat", "college admission test",
            "entrance exam", "exam", "examination", "test permit", "application",
        ])
        has_admission_action = any(term in text for term in [
            "result", "results", "ror", "rating", "passed", "pass", "pasar",
            "nakapasar", "status", "accepted", "nadawat", "deadline", "close",
            "closing", "slots", "slot", "puno", "requirements", "documents",
            "papeles", "reschedule", "missed", "walk in", "walkin", "test permit",
            "error", "mobile", "phone", "cellphone", "calculator", "fee", "bayad",
        ])
        return has_admission_context and has_admission_action

    def _looks_like_unresolved_location_request(self, user_message: str) -> bool:
        text = self.interpreter.normalize_for_search(user_message)
        if self.knowledge_router._facility_availability_route(user_message):
            return False
        if self._looks_like_library_service_request(user_message):
            return False
        if self._looks_like_admission_service_request(user_message):
            return False
        if (
            any(term in text for term in ["result", "results", "ror", "rating", "passed", "pass"]) and
            any(term in text for term in ["admission", "exam", "examination", "test", "buksu cat", "college admission test"])
        ):
            return False
        location_terms = [
            "where", "location", "located", "find", "go to", "get to",
            "direction", "directions", "room", "building", "office",
            "campus", "inside", "gate", "desk", "park", "parking", "parking area",
            "asa", "hain", "diin", "dapit", "makita", "makit-an", "locate",
        ]
        return any(term in text for term in location_terms)

    def _looks_like_building_directory_request(self, user_message: str) -> bool:
        text = self.interpreter.normalize(user_message)
        directory_terms = [
            "what offices", "which offices", "list of offices", "offices can be found",
            "offices inside", "rooms inside", "what rooms", "which rooms",
            "inside the", "inside", "found in", "under the",
        ]
        building_terms = [
            "building", "cob", "cot", "finance", "administrative", "administration",
            "admin", "new cot", "old cot", "cpag", "cas", "con",
        ]
        return any(term in text for term in directory_terms) and any(term in text for term in building_terms)

    def _building_directory_memory(self) -> ConversationMemory:
        return ConversationMemory(
            subject="building_directory",
            subject_type="directory",
            category="location",
            last_topic="building_directory",
            last_intent="building_directory",
            turns_remaining=20,
        )

    def _route_building_directory(self, user_message: str, slots: Dict[str, Any]) -> Tuple[Any, Dict[str, Any]]:
        directory_response = self.data_loader.get_building_directory_response(user_message)
        if not directory_response:
            return None, {}
        return directory_response, self._context_updates(self._building_directory_memory(), slots)

    def _looks_like_building_directory_follow_up(self, user_message: str, slots: Dict[str, Any]) -> bool:
        memory = self.context_manager.memory_from_slots(slots)
        if memory.subject != "building_directory" or memory.turns_remaining <= 0:
            return False
        text = self.interpreter.normalize(user_message)
        follow_up_terms = ["how about", "what about", "also", "next", "and", "how about the", "what about the"]
        building_terms = [
            "cob", "cot", "finance", "administrative", "administration",
            "admin", "new cot", "old cot", "building", "cpag", "cas", "con",
        ]
        return (
            any(term in text for term in follow_up_terms) or len(self.interpreter.tokens(text)) <= 4
        ) and any(term in text for term in building_terms)

    def _generic_faculty_office_response(self, user_message: str) -> Any:
        text = self.interpreter.normalize(user_message)
        if not (
            re.search(r"\bfaculty\s+(office|offices|room|rooms)\b", text) or
            re.search(r"\bfaculty\b", text) and len(self.interpreter.tokens(text)) <= 3
        ):
            return None

        college_terms = ["cot", "cob", "cas", "con", "cpag", "coa", "coe", "bsn", "pe", "philo", "electronics", "automotive", "hospitality", "business", "accountancy"]
        if any(re.search(rf"(?<!\w){re.escape(term)}(?!\w)", text) for term in college_terms):
            return None

        return {
            "text": "Which faculty office or faculty room do you want to locate?",
            "custom": {
                "suggestions": [
                    {"label": "COT Faculty Room", "payload": "where is COT Faculty Room"},
                    {"label": "COB Faculty Room", "payload": "where is COB Faculty Room"},
                    {"label": "BSN Faculty Room", "payload": "where is BSN Faculty Room"},
                    {"label": "CPAG Faculty Room", "payload": "where is CPAG Faculty Room"},
                    {"label": "PE Faculty Room", "payload": "where is PE Faculty Room"},
                    {"label": "Electronics Faculty Room", "payload": "where is Electronics Faculty Room"},
                    {"label": "Philosophy Faculty Office", "payload": "where is Philosophy Faculty Office"},
                    {"label": "Automotive Faculty Office", "payload": "where is Automotive Faculty Office"},
                ]
            },
        }

    def _generic_deans_office_response(self, user_message: str) -> Any:
        text = self.interpreter.normalize(user_message)
        if not (
            "deans office" in text or
            "dean's office" in text or
            "dean office" in text or
            "office of the dean" in text
        ):
            return None

        college_terms = ["cot", "cob", "cas", "con", "cpag", "coa", "coe", "law", "nursing", "technology", "arts", "sciences", "public administration"]
        if any(re.search(rf"(?<!\w){re.escape(term)}(?!\w)", text) for term in college_terms):
            return None

        return {
            "text": "Which Dean's Office do you want to locate?",
            "custom": {
                "suggestions": [
                    {"label": "COT Dean's Office", "payload": "where is COT Dean's Office"},
                    {"label": "CAS Dean's Office", "payload": "where is CAS Deans Office"},
                    {"label": "CON Dean's Office", "payload": "where is CON Dean's Office"},
                    {"label": "CPAG Dean's Office", "payload": "where is CPAG Deans Office"},
                ]
            },
        }

    def _route_locations(
        self,
        intent: str,
        user_message: str,
        resolved: Any,
        slots: Dict[str, Any],
    ) -> Tuple[Any, Dict[str, Any]]:
        cache_subject = "|".join(str(location) for location in resolved.locations)
        cache_key = self._cache_key("location", cache_subject, user_message)
        cached_response = self._cache_get(cache_key)
        if cached_response is not None:
            memory = self.context_manager.build_memory(
                intent=intent,
                user_message=user_message,
                resolved=resolved,
                response_intent="location",
                response=cached_response,
            )
            return cached_response, self._context_updates(memory, slots)

        location_responses = self.knowledge_router.location_responses(resolved.locations, user_message)
        if len(location_responses) == 1:
            response = location_responses[0]
        elif len(location_responses) > 1:
            response = self.response_builder.build_multi_response(location_responses)[0]
        else:
            location_names = ", ".join(resolved.locations)
            response = f"Sorry, I don't have location information for {location_names}."

        memory = self.context_manager.build_memory(
            intent=intent,
            user_message=user_message,
            resolved=resolved,
            response_intent="location",
            response=response,
        )
        self._cache_set(cache_key, response)
        return response, self._context_updates(memory, slots)

    def _context_updates(self, memory: Any, slots: Dict[str, Any]) -> Dict[str, Any]:
        updates = self.context_manager.slot_values(memory)
        if updates:
            return updates
        return self.context_manager.decay_slot_values(slots)

    def route(self, intent: str, latest_message: Dict[str, Any], user_message: str) -> Any:
        response, _context_slots = self.route_with_context(intent, latest_message, user_message)
        return response

    def route_with_context(
        self,
        intent: str,
        latest_message: Dict[str, Any],
        user_message: str,
        slots: Dict[str, Any] = None,
    ) -> Tuple[Any, Dict[str, Any]]:
        self.refresh_if_changed()
        slots = slots or {}
        resolved = self.resolve(latest_message, user_message)
        normalized_text = self.interpreter.normalize(user_message)

        if (
            any(term in normalized_text for term in ["who create", "who created", "who made", "kinsa naghimo", "kinsa nag create"]) or
            ("create" in normalized_text and "you" in normalized_text)
        ):
            return self.data_loader.get_response("Bot_creator", user_message=user_message), {}

        if (
            (
                "civilian" in normalized_text or
                "uniform" in normalized_text or
                "dress code" in normalized_text or
                "plain clothes" in normalized_text or
                "regular clothes" in normalized_text or
                "no uniform" in normalized_text
            ) and
            "pe uniform" not in normalized_text and
            "physical education uniform" not in normalized_text
        ):
            direct_uniform_intent = self.knowledge_router.direct_intent_override(intent, user_message, [])
            if direct_uniform_intent in {"wear_civilian_attire", "campus_dress_code_policy"}:
                response = self.data_loader.get_response(direct_uniform_intent, user_message=user_message)
                memory = self.context_manager.build_memory(
                    intent=intent,
                    user_message=user_message,
                    resolved=resolved,
                    response_intent=direct_uniform_intent,
                    response=response,
                )
                return response, self._context_updates(memory, slots)

        if intent == "smalltalk":
            response = self.handle_smalltalk(user_message)
            return response, {}

        clarified_intent = self.context_manager.resolve_id_clarification(user_message, slots)
        if clarified_intent:
            response = self.data_loader.get_response(clarified_intent, user_message=user_message)
            memory = self.context_manager.build_memory(
                intent=slots.get("conversation_last_topic") or intent,
                user_message=user_message,
                resolved=resolved,
                response_intent=clarified_intent,
                response=response,
            )
            return response, self._context_updates(memory, slots)

        follow_up_intent = self.context_manager.resolve_follow_up_intent(
            intent=intent,
            user_message=user_message,
            resolved=resolved,
            slots=slots,
        )
        if follow_up_intent:
            response = self.data_loader.get_response(follow_up_intent, user_message=user_message)
            active_memory = self.context_manager.memory_from_slots(slots)
            memory = self.context_manager.memory_for_existing_subject(
                subject=str(active_memory.subject or ""),
                intent=intent,
                response_intent=follow_up_intent,
                fallback=active_memory,
            )
            return response, self._context_updates(memory, slots)

        if self.context_manager.is_ambiguous_id_question(intent, user_message, slots):
            ambiguity = self.context_manager.ambiguous_id_response(intent)
            return ambiguity.get("response") or ambiguity["text"], ambiguity["slots"]

        admission_clarification = self.knowledge_router.admission_clarification_response(intent, user_message)
        if admission_clarification:
            return admission_clarification, self.context_manager.decay_slot_values(slots)

        if self._looks_like_building_directory_follow_up(user_message, slots):
            directory_response, directory_slots = self._route_building_directory(user_message, slots)
            if directory_response:
                return directory_response, directory_slots

        if self._looks_like_building_directory_request(user_message):
            directory_response, directory_slots = self._route_building_directory(user_message, slots)
            if directory_response:
                return directory_response, directory_slots

        faculty_office_menu = self._generic_faculty_office_response(user_message)
        if faculty_office_menu:
            return faculty_office_menu, self.context_manager.decay_slot_values(slots)

        deans_office_menu = self._generic_deans_office_response(user_message)
        if deans_office_menu:
            return deans_office_menu, self.context_manager.decay_slot_values(slots)

        services_response = self.knowledge_router.services_response(intent, user_message)
        if services_response:
            return services_response, self.context_manager.decay_slot_values(slots)

        course_clarification = self.knowledge_router.course_clarification_response(intent, user_message)
        if course_clarification:
            return course_clarification, self.context_manager.decay_slot_values(slots)

        validation_clarification = self.knowledge_router.validation_clarification_response(intent, user_message)
        if validation_clarification:
            return validation_clarification, self.context_manager.decay_slot_values(slots)

        pe_uniform_clarification = self.knowledge_router.pe_uniform_clarification_response(intent, user_message)
        if pe_uniform_clarification:
            return pe_uniform_clarification, self.context_manager.decay_slot_values(slots)

        facility_intent = self.knowledge_router._facility_availability_route(user_message)
        if facility_intent:
            cache_key = self._cache_key("facility_availability", facility_intent, user_message)
            cached_response = self._cache_get(cache_key)
            if cached_response is not None:
                memory = self.context_manager.build_memory(
                    intent=intent,
                    user_message=user_message,
                    resolved=resolved,
                    response_intent=facility_intent,
                    response=cached_response,
                )
                return cached_response, self._context_updates(memory, slots)

            response = self.data_loader.get_response(facility_intent, user_message=user_message)
            memory = self.context_manager.build_memory(
                intent=intent,
                user_message=user_message,
                resolved=resolved,
                response_intent=facility_intent,
                response=response,
            )
            self._cache_set(cache_key, response)
            return response, self._context_updates(memory, slots)

        if self._should_prioritize_location(intent, user_message, resolved):
            return self._route_locations(intent, user_message, resolved, slots)

        direct_intent = self.knowledge_router.direct_intent_override(intent, user_message, resolved.values)
        if direct_intent:
            if str(direct_intent).startswith("__"):
                response = self.knowledge_router.find_best_response(intent, user_message, resolved.values)
            else:
                response = self.data_loader.get_response(direct_intent, user_message=user_message)
            memory = self.context_manager.build_memory(
                intent=intent,
                user_message=user_message,
                resolved=resolved,
                response_intent=direct_intent,
                response=response,
            )
            return response, self._context_updates(memory, slots)

        if intent == "ask_location":
            if resolved.locations:
                return self._route_locations(intent, user_message, resolved, slots)
            if self._looks_like_unresolved_location_request(user_message):
                response = (
                    "Sorry, I don't have location information for that place yet. "
                    "Please try a more specific building or office name, or add the location in the admin panel."
                )
                memory = self.context_manager.build_memory(
                    intent=intent,
                    user_message=user_message,
                    resolved=resolved,
                    response_intent="location",
                    response=response,
                )
                return response, self._context_updates(memory, slots)

        if not resolved.locations and self._looks_like_unresolved_location_request(user_message):
            response = (
                "Sorry, I don't have location information for that place yet. "
                "Please try a more specific building or office name, or add the location in the admin panel."
            )
            memory = self.context_manager.build_memory(
                intent=intent,
                user_message=user_message,
                resolved=resolved,
                response_intent="location",
                response=response,
            )
            return response, self._context_updates(memory, slots)

        response = self.knowledge_router.find_best_response(intent, user_message, resolved.values)
        memory = self.context_manager.build_memory(
            intent=intent,
            user_message=user_message,
            resolved=resolved,
            response_intent=self.knowledge_router.last_selected_intent,
            response=response,
        )
        return response, self._context_updates(memory, slots)
