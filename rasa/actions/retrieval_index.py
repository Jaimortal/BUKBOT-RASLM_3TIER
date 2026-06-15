import json
from typing import Any, Dict, List, Optional

from query_interpreter import QueryInterpreter
from retrieval_result import RetrievalCandidate


class RetrievalIndex:
    """Builds local searchable records from legacy and structured knowledge entries."""

    PURPOSE_BY_TOPIC = {
        "location": "ask_location",
        "where": "ask_location",
        "requirements": "ask_requirement",
        "requirement": "ask_requirement",
        "documents": "ask_requirement",
        "eligibility": "ask_requirement",
        "payment": "ask_fee",
        "fee": "ask_fee",
        "fees": "ask_fee",
        "process": "ask_process",
        "steps": "ask_process",
        "how": "ask_process",
        "solution": "ask_process",
        "form": "ask_document",
        "forms": "ask_document",
        "document": "ask_document",
        "schedule": "ask_schedule",
        "hours": "ask_schedule",
        "time": "ask_schedule",
        "contact": "ask_contact",
        "availability": "ask_availability",
        "meaning": "ask_general_info",
        "definition": "ask_general_info",
        "policy": "ask_general_info",
        "overview": "ask_general_info",
        "info": "ask_general_info",
        "general_info": "ask_general_info",
        "person": "ask_general_info",
    }

    def __init__(self, data_loader: Any, interpreter: QueryInterpreter):
        self.data_loader = data_loader
        self.interpreter = interpreter
        self._candidates = self._build_candidates()

    @property
    def candidates(self) -> List[RetrievalCandidate]:
        return self._candidates

    def _build_candidates(self) -> List[RetrievalCandidate]:
        candidates: List[RetrievalCandidate] = []
        for entry in self.data_loader.responses:
            intent = str(entry.get("intent") or "").strip()
            if not intent:
                continue

            metadata = entry.get("metadata") or {}
            responses = entry.get("responses") or {}
            subject_terms = self._string_list(metadata.get("subject_terms"))
            phrases = self._string_list(metadata.get("phrases"))
            topic_terms = self._topic_terms(entry, metadata)
            answer_text = self._answer_text(responses)
            item_text = self._item_text(responses)
            searchable_text = self.interpreter.normalize(
                " ".join([
                    intent.replace("_", " "),
                    str(entry.get("category") or ""),
                    str(entry.get("sub_category") or "").replace("_", " "),
                    " ".join(subject_terms),
                    " ".join(phrases),
                    " ".join(topic_terms),
                    answer_text,
                    item_text,
                ])
            )
            candidates.append(
                RetrievalCandidate(
                    entry=entry,
                    intent=intent,
                    purpose=self._purpose(metadata),
                    subject_key=metadata.get("subject_key"),
                    subject_terms=subject_terms,
                    phrases=phrases,
                    topic_terms=topic_terms,
                    answer_text=answer_text,
                    searchable_text=searchable_text,
                    tokens=self.interpreter.tokens(searchable_text, expand=False),
                )
            )
        return candidates

    def _purpose(self, metadata: Dict[str, Any]) -> Optional[str]:
        topic = str(metadata.get("context_topic") or metadata.get("topic") or "").lower().strip()
        return self.PURPOSE_BY_TOPIC.get(topic)

    def _topic_terms(self, entry: Dict[str, Any], metadata: Dict[str, Any]) -> List[str]:
        terms = [
            str(metadata.get("topic") or ""),
            str(metadata.get("context_topic") or ""),
            str(metadata.get("parent_topic") or ""),
            str(entry.get("sub_category") or ""),
        ]
        return [term.replace("_", " ") for term in terms if term]

    def _answer_text(self, responses: Dict[str, Any]) -> str:
        answer = responses.get("answer") or {}
        if isinstance(answer, dict):
            return " ".join(
                " ".join(str(item) for item in value)
                if isinstance(value, list)
                else str(value)
                for value in answer.values()
            )
        if isinstance(answer, list):
            return " ".join(str(item) for item in answer)
        return json.dumps(answer, ensure_ascii=False)

    def _item_text(self, responses: Dict[str, Any]) -> str:
        items = responses.get("items") or []
        if not isinstance(items, list):
            return ""
        parts: List[str] = []
        for item in items:
            if not isinstance(item, dict):
                continue
            parts.extend([
                str(item.get("key") or ""),
                str(item.get("name") or ""),
                str(item.get("value") or ""),
                str(item.get("text") or ""),
                " ".join(str(alias) for alias in item.get("aliases") or []),
            ])
        return " ".join(part for part in parts if part)

    def _string_list(self, value: Any) -> List[str]:
        if isinstance(value, list):
            return [str(item) for item in value if str(item).strip()]
        if value:
            return [str(value)]
        return []
