from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple


@dataclass
class RetrievalCandidate:
    """One searchable knowledge record in the local retrieval index."""

    entry: Dict[str, Any]
    intent: str
    purpose: Optional[str]
    subject_key: Optional[str]
    subject_terms: List[str]
    phrases: List[str]
    topic_terms: List[str]
    answer_text: str
    searchable_text: str
    tokens: List[str]
    display_name: str = ""
    domain: str = ""
    child_terms: List[str] = field(default_factory=list)
    alias_terms: List[str] = field(default_factory=list)


@dataclass
class RetrievalResult:
    """Ranked retrieval result with enough detail for debugging and clarification."""

    candidate: Optional[RetrievalCandidate]
    score: float
    confidence: str
    reasons: List[str] = field(default_factory=list)
    runner_up: Optional[RetrievalCandidate] = None
    runner_up_score: float = 0.0
    ranked_candidates: List[Tuple[RetrievalCandidate, float]] = field(default_factory=list)

    @property
    def intent(self) -> Optional[str]:
        if not self.candidate:
            return None
        return self.candidate.intent

    @property
    def is_high_confidence(self) -> bool:
        return self.confidence == "high"

    @property
    def is_medium_confidence(self) -> bool:
        return self.confidence == "medium"
