import re
from dataclasses import dataclass
from typing import List


@dataclass
class InterpretedQuery:
    raw_text: str
    normalized_text: str
    tokens: List[str]
    sub_queries: List[str]
    is_multi_question: bool


class QueryInterpreter:
    """Normalizes user text and detects simple multi-question inputs."""

    WEAK_WORDS = {
        "a", "an", "the", "is", "are", "was", "were", "to", "of", "in",
        "on", "at", "by", "for", "with", "about", "and", "or", "i", "me",
        "my", "you", "your", "what", "where", "when", "why", "how", "unsa",
        "asa", "kanus", "kanusa", "ang", "sa", "ug", "buksu", "bukidnon",
        "state", "university", "please", "info", "information",
    }

    WH_PATTERNS = (
        "where", "when", "what", "how", "why", "who",
        "asa", "kanus", "kanusa", "unsa", "kinsa", "ngano",
    )

    PROTECTED_CONJUNCTION_PHRASES = (
        "payroll regular and casual",
        "finance and management",
        "scholarship and financial assistance",
        "student affairs and services",
        "admission and testing",
        "arts and sciences",
        "health and services",
        "culture arts sports and student services",
        "cultural arts sports and student services",
        "advocacy and well-being",
        "advocacy and well being",
    )

    _AND_SENTINEL = "__AND__"
    _UG_SENTINEL = "__UG__"

    def normalize(self, text: str) -> str:
        text = str(text or "").lower()
        text = re.sub(r"[^\w\s?'-]", " ", text)
        return re.sub(r"\s+", " ", text).strip()

    def tokens(self, text: str) -> List[str]:
        normalized = self.normalize(text)
        return [
            token for token in re.findall(r"\b[\w'-]+\b", normalized)
            if len(token) > 1 and token not in self.WEAK_WORDS
        ]

    def _mask_protected_conjunctions(self, text: str) -> str:
        masked = text
        for phrase in self.PROTECTED_CONJUNCTION_PHRASES:
            normalized_phrase = self.normalize(phrase)
            protected_phrase = normalized_phrase.replace(" and ", f" {self._AND_SENTINEL} ")
            protected_phrase = protected_phrase.replace(" ug ", f" {self._UG_SENTINEL} ")
            masked = re.sub(
                rf"(?<!\w){re.escape(normalized_phrase)}(?!\w)",
                protected_phrase,
                masked,
            )
        return masked

    def _unmask_protected_conjunctions(self, text: str) -> str:
        return (
            text.replace(self._AND_SENTINEL.lower(), "and")
            .replace(self._AND_SENTINEL, "and")
            .replace(self._UG_SENTINEL.lower(), "ug")
            .replace(self._UG_SENTINEL, "ug")
        )

    def split_multi_question(self, text: str) -> List[str]:
        normalized = self.normalize(text)
        if not normalized:
            return []

        masked = self._mask_protected_conjunctions(normalized)

        by_question_mark = [
            self._unmask_protected_conjunctions(part.strip())
            for part in re.split(r"\?+", masked)
            if part.strip()
        ]
        if len(by_question_mark) > 1:
            return by_question_mark

        wh_count = sum(1 for word in self.WH_PATTERNS if re.search(rf"\b{re.escape(word)}\b", masked))
        if " and " in masked and wh_count >= 1:
            parts = [
                self._unmask_protected_conjunctions(part.strip())
                for part in masked.split(" and ")
                if part.strip()
            ]
            if len(parts) > 1:
                return parts

        if " ug " in masked and wh_count >= 1:
            parts = [
                self._unmask_protected_conjunctions(part.strip())
                for part in masked.split(" ug ")
                if part.strip()
            ]
            if len(parts) > 1:
                return parts

        return [normalized]

    def interpret(self, text: str) -> InterpretedQuery:
        normalized = self.normalize(text)
        # Extract tokens from already-normalized text to avoid re-normalizing
        tokens_list = [
            token for token in re.findall(r"\b[\w'-]+\b", normalized)
            if len(token) > 1 and token not in self.WEAK_WORDS
        ]
        sub_queries = self.split_multi_question(text)
        return InterpretedQuery(
            raw_text=str(text or ""),
            normalized_text=normalized,
            tokens=tokens_list,
            sub_queries=sub_queries,
            is_multi_question=len(sub_queries) > 1,
        )
