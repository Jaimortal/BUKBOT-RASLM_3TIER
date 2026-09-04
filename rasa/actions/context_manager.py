from dataclasses import dataclass
import re
import time
from typing import Any, Dict, List, Optional

from entity_resolver import ResolvedEntities
from query_interpreter import QueryInterpreter


@dataclass
class ConversationMemory:
    subject: Optional[str] = None
    subject_type: Optional[str] = None
    category: Optional[str] = None
    last_topic: Optional[str] = None
    last_intent: Optional[str] = None
    turns_remaining: int = 0
    updated_at: float = 0.0


class ContextManager:
    """
    Stores short-lived conversation focus.

    Phase 1 only writes memory. Later phases will read this memory for incomplete
    follow-up questions like "what are the requirements?"
    """

    DEFAULT_TURNS = 2
    PROTECTED_DENTAL_SUBJECTS = {
        "dental_consultation",
        "dental_oral_examination",
        "dental_tooth_extraction",
        "dental_referral_medicine",
    }

    TOPIC_BY_PURPOSE = {
        "ask_location": "location",
        "ask_schedule": "schedule",
        "ask_fee": "payment",
        "ask_requirement": "requirements",
        "ask_process": "process",
        "ask_general_info": "general_info",
        "ask_contact": "contact",
        "ask_availability": "availability",
        "ask_document": "document",
    }

    SUBJECT_PATTERNS = [
        {
            "subject": "library_id_card",
            "subject_type": "document",
            "category": "library_info",
            "terms": ["library id", "library card"],
            "intent_prefixes": ["library_id_card"],
        },
        {
            "subject": "student_id",
            "subject_type": "document",
            "category": "student_services",
            "terms": ["student id", "school id", "id validation", "student id validation", "school id validation"],
            "intent_prefixes": ["student_id", "id_validation"],
        },
        {
            "subject": "enrollment",
            "subject_type": "service",
            "category": "enrollment_info",
            "terms": ["enrollment", "enroll"],
            "intent_prefixes": ["enrollment", "online_enrollment"],
        },
        {
            "subject": "admission",
            "subject_type": "service",
            "category": "admissions_info",
            "terms": ["admission", "application", "cat"],
            "intent_prefixes": ["admission", "freshmen_application", "exam"],
        },
        {
            "subject": "inc_form",
            "subject_type": "document",
            "category": "academic_policy",
            "terms": ["inc form", "inc grade", "incomplete"],
            "intent_prefixes": ["inc", "get_inc"],
        },
    ]

    FOLLOW_UP_INTENTS = {
        "library_id_card": {
            "ask_location": "library_id_card_location",
            "ask_requirement": "library_id_card_requirements",
            "ask_fee": "library_id_card_payment",
            "ask_process": "library_id_card_location",
            "ask_document": "library_id_card_requirements",
            "ask_general_info": "library_id_card_requirements",
        },
        "student_id": {
            "ask_requirement": "student_id_process",
            "ask_process": "student_id_process",
            "ask_document": "student_id_process",
            "ask_schedule": "id_validation_day",
        },
        "enrollment": {
            "ask_schedule": "enrollment_general_process",
            "ask_requirement": "enrollment_documents",
            "ask_process": "enrollment_general_process",
        },
        "admission": {
            "ask_schedule": "freshmen_application_period",
            "ask_requirement": "exam_requirements",
        },
        "inc_form": {
            "ask_process": "get_inc_form",
            "ask_document": "get_inc_form",
        },
    }

    ID_CLARIFICATION_ROUTES = {
        "student_id": {
            "ask_location": "student_id_process",
            "ask_requirement": "student_id_requirements",
            "ask_process": "student_id_process",
            "ask_document": "student_id_process",
            "ask_fee": "Student_id_fee",
            "ask_general_info": "student_id_process",
        },
        "library_id_card": {
            "ask_location": "library_id_card_location",
            "ask_requirement": "library_id_card_requirements",
            "ask_process": "library_id_card_location",
            "ask_document": "library_id_card_requirements",
            "ask_fee": "library_id_card_payment",
            "ask_general_info": "library_id_card_requirements",
        },
    }

    def __init__(self, interpreter: QueryInterpreter, context_index: Optional[Dict[str, Any]] = None):
        self.interpreter = interpreter
        self.context_index = context_index or {}

    def build_memory(
        self,
        intent: str,
        user_message: str,
        resolved: ResolvedEntities,
        response_intent: Optional[str],
        response: Any,
    ) -> Optional[ConversationMemory]:
        if self._is_non_answer(response):
            return None

        subject_info = self._subject_info(user_message, resolved, response_intent)
        if not subject_info:
            return None

        return ConversationMemory(
            subject=subject_info["subject"],
            subject_type=subject_info["subject_type"],
            category=subject_info["category"],
            last_topic=self._topic_from_intent(intent, response_intent),
            last_intent=response_intent,
            turns_remaining=self._turns_for_subject(subject_info["subject"]),
        )

    def slot_values(self, memory: Optional[ConversationMemory]) -> Dict[str, Any]:
        if memory is None:
            return {}

        return {
            "conversation_subject": memory.subject,
            "conversation_subject_type": memory.subject_type,
            "conversation_category": memory.category,
            "conversation_last_topic": memory.last_topic,
            "conversation_last_intent": memory.last_intent,
            "conversation_turns_remaining": memory.turns_remaining,
            "conversation_context_updated_at": memory.updated_at or time.time(),
            # Legacy slots remain populated for old follow-up compatibility.
            "last_query_subject": memory.subject,
            "last_topic": memory.last_intent,
        }

    def memory_for_existing_subject(
        self,
        subject: str,
        intent: str,
        response_intent: Optional[str],
        fallback: Optional[ConversationMemory] = None,
    ) -> Optional[ConversationMemory]:
        if not subject:
            return None

        subject_info = next(
            (pattern for pattern in self._subject_patterns() if pattern.get("subject") == subject),
            None,
        )
        if not subject_info:
            if not fallback:
                return None
            return ConversationMemory(
                subject=fallback.subject,
                subject_type=fallback.subject_type,
                category=fallback.category,
                last_topic=self._topic_from_intent(intent, response_intent),
                last_intent=response_intent,
                turns_remaining=self._turns_for_subject(str(fallback.subject or "")),
            )

        return ConversationMemory(
            subject=subject_info["subject"],
            subject_type=subject_info["subject_type"],
            category=subject_info["category"],
            last_topic=self._topic_from_intent(intent, response_intent),
            last_intent=response_intent,
            turns_remaining=self._turns_for_subject(subject_info["subject"]),
        )

    def memory_from_slots(self, slots: Dict[str, Any]) -> ConversationMemory:
        turns_remaining = slots.get("conversation_turns_remaining") or 0
        try:
            turns_remaining = int(float(turns_remaining))
        except (TypeError, ValueError):
            turns_remaining = 0

        updated_at = slots.get("conversation_context_updated_at") or 0
        try:
            updated_at = float(updated_at)
        except (TypeError, ValueError):
            updated_at = 0.0

        raw_subject = slots.get("conversation_subject")
        expiry_seconds = 300 if raw_subject in self.PROTECTED_DENTAL_SUBJECTS or raw_subject == "building_directory" else 180
        if updated_at and time.time() - updated_at > expiry_seconds:
            return ConversationMemory()

        return ConversationMemory(
            subject=raw_subject,
            subject_type=slots.get("conversation_subject_type"),
            category=slots.get("conversation_category"),
            last_topic=slots.get("conversation_last_topic"),
            last_intent=slots.get("conversation_last_intent"),
            turns_remaining=turns_remaining,
            updated_at=updated_at,
        )

    def resolve_follow_up_intent(
        self,
        intent: str,
        user_message: str,
        resolved: ResolvedEntities,
        slots: Dict[str, Any],
    ) -> Optional[str]:
        memory = self.memory_from_slots(slots)
        if not memory.subject or memory.turns_remaining <= 0:
            return None

        # A new explicit subject must always overwrite old memory.
        if self._has_explicit_subject(user_message, resolved):
            return None

        if not self._is_incomplete_follow_up(intent, user_message):
            return None

        text = self.interpreter.normalize(user_message)
        if memory.subject in self.PROTECTED_DENTAL_SUBJECTS:
            return "dental_clinic_direct_ask"

        if memory.subject == "student_id" and any(
            term in text for term in ["lost", "lose", "replace", "replacement", "nawala"]
        ):
            return "lost_student_id_replacement_process"
        if memory.subject == "campus_dormitories":
            if any(term in text for term in ["how many", "number", "count", "pila"]):
                return "number_of_dormitories"
            if any(term in text for term in ["pros", "cons", "benefit", "benefits", "advantage", "rules", "curfew"]):
                return "dormitory_pros_cons"
            if any(term in text for term in ["slot", "slots", "available", "availability", "who can stay", "athlete"]):
                return "buksu_dormitory_information"
            if any(term in text for term in ["male", "mahogany"]):
                return "male_dorm"
            if any(term in text for term in ["female", "rubia"]):
                return "female_dorm"

        subject_routes = {
            **self.FOLLOW_UP_INTENTS.get(str(memory.subject), {}),
            **self._dynamic_routes_for(str(memory.subject)),
        }
        if not subject_routes:
            return None

        return subject_routes.get(intent)

    def is_ambiguous_id_question(self, intent: str, user_message: str, slots: Dict[str, Any]) -> bool:
        if intent not in {
            "ask_location",
            "ask_requirement",
            "ask_process",
            "ask_document",
            "ask_fee",
            "ask_general_info",
        }:
            return False

        memory = self.memory_from_slots(slots)
        if memory.subject in {"library_id_card", "student_id"} and memory.turns_remaining > 0:
            return False

        text = self.interpreter.normalize_for_search(user_message)
        if any(term in text for term in ["library resources", "library resource", "buksu library resources"]):
            return False
        if any(term in text for term in ["validate", "validation"]):
            return False
        if not self._has_bare_id(text):
            return False

        return self._id_subject_from_text(text) is None

    def ambiguous_id_response(self, intent: str) -> Dict[str, Any]:
        memory = ConversationMemory(
            subject="ambiguous_id",
            subject_type="clarification",
            category="id",
            last_topic=intent,
            last_intent="pending_id_clarification",
            turns_remaining=self.DEFAULT_TURNS,
        )
        suggestions_by_intent = {
            "ask_fee": [
                {"label": "Student ID fee", "payload": "how much is the student id"},
                {"label": "Library ID fee", "payload": "how much is the library id"},
            ],
            "ask_requirement": [
                {"label": "Student ID requirements", "payload": "student id requirements"},
                {"label": "Library ID requirements", "payload": "library id requirements"},
            ],
            "ask_location": [
                {"label": "Student ID", "payload": "where do I apply for student id"},
                {"label": "Library ID", "payload": "where can I get library id"},
            ],
            "ask_process": [
                {"label": "Student ID", "payload": "how to get student id"},
                {"label": "Library ID", "payload": "where can I get library id"},
            ],
            "ask_document": [
                {"label": "Student ID", "payload": "how to get student id"},
                {"label": "Library ID", "payload": "library id requirements"},
            ],
            "ask_general_info": [
                {"label": "Student ID", "payload": "how to get student id"},
                {"label": "Library ID", "payload": "where can I get library id"},
            ],
        }
        return {
            "text": "Which ID do you mean, student ID or library ID?",
            "response": {
                "text": "Which ID do you mean, student ID or library ID?",
                "custom": {
                    "suggestions": suggestions_by_intent.get(
                        intent,
                        [
                            {"label": "Student ID", "payload": "how to get student id"},
                            {"label": "Library ID", "payload": "where can I get library id"},
                        ],
                    )
                },
            },
            "slots": self.slot_values(memory),
        }

    def resolve_id_clarification(self, user_message: str, slots: Dict[str, Any]) -> Optional[str]:
        memory = self.memory_from_slots(slots)
        if memory.subject != "ambiguous_id" or memory.turns_remaining <= 0:
            return None

        subject = self._id_subject_from_text(self.interpreter.normalize(user_message))
        if not subject:
            return None

        pending_intent = memory.last_topic or "ask_general_info"
        return self.ID_CLARIFICATION_ROUTES.get(subject, {}).get(pending_intent)

    def decay_slot_values(self, slots: Dict[str, Any]) -> Dict[str, Any]:
        memory = self.memory_from_slots(slots)
        if not memory.subject or memory.turns_remaining <= 0:
            return {}

        next_turns = max(memory.turns_remaining - 1, 0)
        updates: Dict[str, Any] = {"conversation_turns_remaining": next_turns}
        if next_turns == 0:
            updates.update({
                "conversation_subject": None,
                "conversation_subject_type": None,
                "conversation_category": None,
                "conversation_last_topic": None,
                "conversation_last_intent": None,
                "conversation_context_updated_at": None,
                "last_query_subject": None,
                "last_topic": None,
            })
        return updates

    def _has_explicit_subject(self, user_message: str, resolved: ResolvedEntities) -> bool:
        if resolved.locations:
            return True

        generic_values = {
            "requirement", "requirements", "fee", "fees", "payment",
            "schedule", "process", "steps", "location", "where",
            "document", "documents", "how", "when", "what", "whats",
            "what's", "and", "ug", "much", "id", "form", "forms",
            "validate", "validation", "slot", "slots", "available", "availability", "open",
        }
        explicit_values = [
            value for value in resolved.values
            if self.interpreter.normalize(value) not in generic_values
        ]
        if explicit_values:
            return True

        text = self.interpreter.normalize(user_message)
        text_tokens = self._word_tokens(text)
        if text_tokens and all(token in generic_values for token in text_tokens):
            return False

        return any(
            any(self._term_matches_text(term, text) for term in pattern["terms"])
            for pattern in self._subject_patterns()
        )

    def _is_incomplete_follow_up(self, intent: str, user_message: str) -> bool:
        if intent not in {
            "ask_location",
            "ask_schedule",
            "ask_fee",
            "ask_requirement",
            "ask_process",
            "ask_document",
            "ask_general_info",
            "ask_availability",
        }:
            return False

        tokens = self.interpreter.tokens(user_message)
        if not tokens:
            return False

        generic_tokens = {
            "and", "ug", "what", "whats", "what's", "are", "is", "the", "requirements", "requirement",
            "need", "needed", "bring", "document", "documents",
            "how", "much", "fee", "fees", "payment", "where", "get",
            "location", "process", "steps", "when", "schedule", "id",
            "form", "forms", "validate", "validation", "penalty", "fine", "fines", "lost", "lose",
            "replace", "replacement",
            "many", "number", "count", "benefit", "benefits", "pros",
            "cons", "advantage", "rules", "curfew", "slot", "slots",
            "available", "availability", "open", "male", "female",
            "do", "does", "did", "can", "could", "would", "should",
            "unsa", "asa", "pila", "bayad", "kinahanglan", "kailangan",
        }
        meaningful = [
            token for token in tokens
            if token not in {
                "and", "ug", "what", "whats", "what's", "are", "is", "the",
                "a", "an", "do", "does", "did", "can", "could", "would", "should",
            }
        ]
        has_meaningful_follow_up = bool(meaningful) or intent == "ask_process"
        return has_meaningful_follow_up and all(token in generic_tokens for token in tokens)

    def _has_bare_id(self, text: str) -> bool:
        return any(token == "id" for token in self._word_tokens(text))

    def _id_subject_from_text(self, text: str) -> Optional[str]:
        text = self.interpreter.normalize(text)
        if any(term in text for term in ["library id", "library card"]):
            return "library_id_card"
        if any(term in text for term in ["student id", "school id", "university id", "campus id", "college id"]):
            return "student_id"
        if any(term in text for term in ["lost", "nawala", "affidavit", "gate", "guard", "security", "photo capturing", "picture", "cashier", "nakalimtan", "nabilin", "jeep"]):
            return "student_id"

        tokens = set(self._word_tokens(text))
        if "student" in tokens or "school" in tokens or "university" in tokens or "campus" in tokens:
            return "student_id"
        if "library" in tokens:
            return "library_id_card"
        return None

    def _word_tokens(self, text: str) -> List[str]:
        return re.findall(r"\b[\w'-]+\b", self.interpreter.normalize(text))

    def _term_matches_text(self, term: str, text: str) -> bool:
        normalized_term = self.interpreter.normalize(term)
        if not normalized_term:
            return False
        if " " in normalized_term:
            return normalized_term in text
        return normalized_term in set(self._word_tokens(text))

    def _subject_info(
        self,
        user_message: str,
        resolved: ResolvedEntities,
        response_intent: Optional[str],
    ) -> Optional[Dict[str, str]]:
        text = self.interpreter.normalize(" ".join([user_message, *resolved.values]))
        normalized_intent = self.interpreter.normalize(response_intent or "").replace(" ", "_")

        patterns = self._subject_patterns()

        for pattern in patterns:
            if any(
                normalized_intent.startswith(self.interpreter.normalize(prefix).replace(" ", "_"))
                for prefix in pattern["intent_prefixes"]
            ):
                return pattern

        if resolved.locations and normalized_intent == "location":
            return {
                "subject": resolved.locations[0],
                "subject_type": "location",
                "category": "location",
            }

        for pattern in patterns:
            if any(self._term_matches_text(term, text) for term in pattern["terms"]):
                return pattern

        return None

    def _subject_patterns(self) -> List[Dict[str, Any]]:
        dynamic_subjects = self.context_index.get("subjects") or []
        return [*dynamic_subjects, *self.SUBJECT_PATTERNS]

    def _dynamic_routes_for(self, subject: str) -> Dict[str, str]:
        routes = (self.context_index.get("routes") or {}).get(subject, {})
        expanded = dict(routes)

        if "ask_requirement" in routes:
            expanded.setdefault("ask_document", routes["ask_requirement"])
            expanded.setdefault("ask_general_info", routes["ask_requirement"])
        if "ask_fee" in routes:
            expanded.setdefault("ask_general_info", routes["ask_fee"])
        if "ask_location" in routes:
            expanded.setdefault("ask_process", routes["ask_location"])

        return expanded

    def _topic_from_intent(self, intent: str, response_intent: Optional[str]) -> str:
        normalized_response_intent = self.interpreter.normalize(response_intent or "").replace(" ", "_")

        if normalized_response_intent:
            for topic in ["requirements", "requirement", "payment", "fee", "location", "schedule", "process", "contact"]:
                if topic in normalized_response_intent:
                    if topic == "requirement":
                        return "requirements"
                    if topic == "fee":
                        return "payment"
                    return topic

        return self.TOPIC_BY_PURPOSE.get(intent, "general_info")

    def _turns_for_subject(self, subject: str) -> int:
        if subject in self.PROTECTED_DENTAL_SUBJECTS or subject == "building_directory":
            return 20
        return self.DEFAULT_TURNS

    def _is_non_answer(self, response: Any) -> bool:
        text = ""
        if isinstance(response, dict):
            text = str(response.get("text") or "")
        else:
            text = str(response or "")

        normalized = self.interpreter.normalize(text)
        if not normalized:
            return True

        non_answer_starts = [
            "which ",
            "can you tell me which",
            "i'm not sure",
            "sorry, i don't have",
            "i'm sorry",
        ]
        return any(normalized.startswith(prefix) for prefix in non_answer_starts)
