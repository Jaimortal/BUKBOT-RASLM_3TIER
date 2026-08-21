import re
from dataclasses import dataclass
from typing import List

from query_normalizer import QueryNormalizer


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
        "add and drop subject",
        "add and drop subjects",
        "adding and dropping subject",
        "adding and dropping subjects",
        "add drop subject",
        "add drop subjects",
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

    def __init__(self):
        self.query_normalizer = QueryNormalizer()

    def normalize(self, text: str) -> str:
        return self.query_normalizer.normalize_basic(text)

    def normalize_for_search(self, text: str) -> str:
        return self.query_normalizer.expand(text)

    def tokens(self, text: str, expand: bool = True) -> List[str]:
        normalized = self.normalize_for_search(text) if expand else self.normalize(text)
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
        # Only split on 'and' / 'ug' if BOTH sides are full independent questions (both have WH patterns)
        # e.g., "where is the library and how to borrow books" -> split
        # but "what if I lose card and is there any fee" -> do NOT split (dependent clause)
        for conj in (" and ", " ug "):
            if conj in masked:
                raw_parts = masked.split(conj)
                if len(raw_parts) == 2:
                    p1, p2 = raw_parts[0].strip(), raw_parts[1].strip()
                    has_wh_p1 = any(re.search(rf"\b{re.escape(w)}\b", p1) for w in self.WH_PATTERNS)
                    has_wh_p2 = any(re.search(rf"\b{re.escape(w)}\b", p2) for w in self.WH_PATTERNS)
                    if has_wh_p1 and has_wh_p2 and len(p1.split()) >= 3 and len(p2.split()) >= 3:
                        return [
                            self._unmask_protected_conjunctions(p1),
                            self._unmask_protected_conjunctions(p2),
                        ]

        return [normalized]

    def interpret(self, text: str) -> InterpretedQuery:
        normalized = self.normalize(text)
        search_text = self.normalize_for_search(text)
        tokens_list = [
            token for token in re.findall(r"\b[\w'-]+\b", search_text)
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
