import re
from dataclasses import dataclass
from difflib import SequenceMatcher
from typing import List

from knowledge_loader import KnowledgeRecord


WEAK_WORDS = {
    "a", "an", "and", "ang", "are", "at", "buksu", "can", "do", "does",
    "for", "how", "i", "in", "is", "me", "my", "of", "on", "or", "sa",
    "the", "to", "unsa", "what", "when", "where", "you", "your",
}

PHRASE_EXPANSIONS = {
    "wi-fi": "wifi",
    "student email": "institutional email student gmail buksu gmail",
    "official email": "institutional email student gmail buksu gmail",
    "transfered": "transferee transfer student",
    "transferred": "transferee transfer student",
    "balhin": "transferee transfer student",
    "mobalhin": "transferee transfer student",
    "mubalhin": "transferee transfer student",
    "unsaon": "how process steps",
    "asa": "where location",
    "aha": "where location",
    "pila": "fee cost payment",
    "cut off": "cutoff cat score qualification",
    "cut score": "cutoff cat score qualification",
    "class schedule": "class schedule cor",
    "add and drop": "add drop subject",
    "admission test result": "cat exam result admission examination result ror rating",
    "admission result": "cat exam result admission examination result ror rating",
    "exam result": "cat exam result admission examination result ror rating",
    "test result": "cat exam result admission examination result ror rating",
}


@dataclass
class RetrievalCandidate:
    record: KnowledgeRecord
    score: float
    reasons: List[str]


class LocalRetriever:
    def __init__(self, records: List[KnowledgeRecord]):
        self.records = records

    def search(self, query: str, top_k: int = 6) -> List[RetrievalCandidate]:
        normalized_query = self.expand(query)
        query_tokens = set(self.tokens(normalized_query))
        candidates: List[RetrievalCandidate] = []
        for record in self.records:
            score, reasons = self.score(record, normalized_query, query_tokens)
            if score > 0:
                candidates.append(RetrievalCandidate(record=record, score=score, reasons=reasons))
        candidates.sort(key=lambda item: item.score, reverse=True)
        return candidates[:top_k]

    def score(self, record: KnowledgeRecord, query: str, query_tokens: set) -> tuple:
        score = 0.0
        reasons: List[str] = []
        fields = {
            "display": record.display_name,
            "intent": record.intent,
            "topic": record.topic,
            "parent": record.parent_topic,
            "category": record.category,
            "terms": " ".join(record.subject_terms),
            "phrases": " ".join(record.phrases),
            "answer": record.compact_answer(max_chars=600),
        }
        normalized_fields = {key: self.expand(value) for key, value in fields.items()}

        for phrase in record.phrases:
            phrase_norm = self.expand(phrase)
            if phrase_norm and phrase_norm in query:
                score += 14
                reasons.append(f"phrase:{phrase[:40]}")

        for term in record.subject_terms:
            term_norm = self.expand(term)
            if term_norm and re.search(rf"(?<!\w){re.escape(term_norm)}(?!\w)", query):
                score += 10
                reasons.append(f"subject:{term[:35]}")

        for key in ("display", "intent", "topic", "parent"):
            field_tokens = set(self.tokens(normalized_fields[key]))
            overlap = query_tokens.intersection(field_tokens)
            if overlap:
                add = len(overlap) * (4 if key == "display" else 3)
                score += add
                reasons.append(f"{key}:{','.join(sorted(overlap)[:4])}")

        for key in ("terms", "phrases"):
            field_tokens = set(self.tokens(normalized_fields[key]))
            overlap = query_tokens.intersection(field_tokens)
            if overlap:
                score += len(overlap) * 3
                reasons.append(f"{key}:{','.join(sorted(overlap)[:4])}")

        answer_tokens = set(self.tokens(normalized_fields["answer"]))
        answer_overlap = query_tokens.intersection(answer_tokens)
        if answer_overlap:
            score += min(len(answer_overlap), 6) * 0.8
            reasons.append(f"answer:{','.join(sorted(answer_overlap)[:4])}")

        display_ratio = SequenceMatcher(None, query, normalized_fields["display"]).ratio()
        if display_ratio >= 0.62:
            score += display_ratio * 6
            reasons.append("fuzzy_display")

        return score, reasons

    def expand(self, text: str) -> str:
        normalized = self.normalize(text)
        additions: List[str] = []
        for phrase, expansion in PHRASE_EXPANSIONS.items():
            if phrase in normalized:
                additions.append(expansion)
        tokens = set(self.tokens(normalized))
        if {"admission", "result"}.issubset(tokens) or {"exam", "result"}.issubset(tokens) or {"test", "result"}.issubset(tokens):
            additions.append("cat exam result admission examination result ror rating")
        if "lantaw" in tokens or "lantaws" in tokens:
            additions.append("view check see result")
        if additions:
            normalized = f"{normalized} {' '.join(additions)}"
        return re.sub(r"\s+", " ", normalized).strip()

    def normalize(self, text: str) -> str:
        text = str(text or "").lower()
        text = text.replace("&", " and ")
        text = re.sub(r"[^\w\s'-]", " ", text)
        return re.sub(r"\s+", " ", text).strip()

    def tokens(self, text: str) -> List[str]:
        return [
            token for token in re.findall(r"\b[\w'-]+\b", self.normalize(text))
            if len(token) > 1 and token not in WEAK_WORDS
        ]
