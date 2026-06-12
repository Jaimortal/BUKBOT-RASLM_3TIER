import logging
from typing import Any, Dict, List, Sequence, Set, Tuple

from query_interpreter import QueryInterpreter
from retrieval_index import RetrievalIndex
from retrieval_result import RetrievalCandidate, RetrievalResult


logger = logging.getLogger(__name__)


class RetrievalScorer:
    """Scores local knowledge records without using an LLM or external libraries."""

    HIGH_THRESHOLD = 34.0
    MEDIUM_THRESHOLD = 22.0
    AMBIGUOUS_MARGIN = 5.0

    SYNONYMS = {
        "school id": ["student id"],
        "student id": ["school id"],
        "masteral": ["masters", "graduate program"],
        "masters": ["masteral", "graduate program"],
        "wifi": ["wi-fi", "internet access", "campus wifi"],
        "wi-fi": ["wifi", "internet access", "campus wifi"],
        "cat": ["college admission test", "admission test"],
        "college admission test": ["cat", "admission test"],
        "clearance": ["graduation clearance", "university clearance"],
        "graduating": ["graduation"],
        "grad": ["graduation", "graduation application"],
        "papers": ["requirements", "documents"],
        "paper": ["requirements", "documents"],
        "needed": ["requirements", "need"],
        "graduate studies": ["masters", "graduate program"],
    }

    LOCATION_PURPOSES = {"ask_location"}

    def __init__(self, index: RetrievalIndex, interpreter: QueryInterpreter):
        self.index = index
        self.interpreter = interpreter

    def search(self, intent: str, user_message: str, entity_values: Sequence[str]) -> RetrievalResult:
        query_text = self._expanded_query(user_message, entity_values)
        query_tokens = set(self.interpreter.tokens(query_text))
        if not query_tokens and not entity_values:
            return RetrievalResult(None, 0.0, "low")

        scored: List[Tuple[float, RetrievalCandidate, List[str]]] = []
        for candidate in self.index.candidates:
            score, reasons = self._score_candidate(candidate, intent, query_text, query_tokens, entity_values)
            if score > 0:
                scored.append((score, candidate, reasons))

        scored.sort(key=lambda item: item[0], reverse=True)
        if not scored:
            return RetrievalResult(None, 0.0, "low")

        best_score, best_candidate, reasons = scored[0]
        runner_up = scored[1] if len(scored) > 1 else None
        runner_up_candidate = runner_up[1] if runner_up else None
        runner_up_score = runner_up[0] if runner_up else 0.0
        confidence = self._confidence(best_score, runner_up_score, reasons)

        self._log_top_candidates(intent, user_message, scored[:3])
        return RetrievalResult(
            candidate=best_candidate,
            score=best_score,
            confidence=confidence,
            reasons=reasons,
            runner_up=runner_up_candidate,
            runner_up_score=runner_up_score,
        )

    def clarification(self, result: RetrievalResult) -> Dict[str, Any]:
        if not result.candidate:
            return {"text": "Can you tell me which topic you mean?"}

        options = [self._label(result.candidate)]
        if result.runner_up:
            options.append(self._label(result.runner_up))

        unique_options = []
        for option in options:
            if option and option not in unique_options:
                unique_options.append(option)

        suggestions = [{"label": option, "payload": self._payload_for_label(option)} for option in unique_options[:3]]
        if len(unique_options) >= 2:
            return {
                "text": f"Do you mean {unique_options[0]} or {unique_options[1]}?",
                "custom": {"suggestions": suggestions},
            }
        return {
            "text": f"Can you clarify if you mean {unique_options[0]}?",
            "custom": {"suggestions": suggestions},
        }

    def _score_candidate(
        self,
        candidate: RetrievalCandidate,
        intent: str,
        query_text: str,
        query_tokens: Set[str],
        entity_values: Sequence[str],
    ) -> Tuple[float, List[str]]:
        score = 0.0
        reasons: List[str] = []

        if candidate.purpose == intent:
            score += 12.0
            reasons.append("purpose")
        elif candidate.purpose and candidate.purpose != intent:
            score -= 8.0
            reasons.append("purpose_mismatch")

        phrase_score = self._phrase_score(query_text, candidate.phrases, exact_weight=38.0, partial_weight=18.0)
        if phrase_score:
            score += phrase_score
            reasons.append("phrase")

        subject_score = self._phrase_score(query_text, candidate.subject_terms, exact_weight=34.0, partial_weight=16.0)
        if subject_score:
            score += subject_score
            reasons.append("subject")

        topic_score = self._phrase_score(query_text, candidate.topic_terms, exact_weight=10.0, partial_weight=6.0)
        if topic_score:
            score += topic_score
            reasons.append("topic")

        overlap = query_tokens.intersection(set(candidate.tokens))
        if overlap:
            score += min(len(overlap) * 2.0, 14.0)
            reasons.append("token_overlap")

        entity_score = self._entity_score(candidate, entity_values)
        if entity_score:
            score += entity_score
            reasons.append("entity")

        # Answer-text overlap is intentionally weak. It helps paraphrases but
        # cannot beat a strong subject/purpose mismatch by itself.
        answer_tokens = set(self.interpreter.tokens(candidate.answer_text))
        answer_overlap = query_tokens.intersection(answer_tokens)
        if answer_overlap:
            score += min(len(answer_overlap) * 0.75, 5.0)
            reasons.append("answer_overlap")

        if intent in self.LOCATION_PURPOSES and candidate.purpose != "ask_location":
            score -= 12.0
            reasons.append("location_guard")

        return score, reasons

    def _payload_for_label(self, label: str) -> str:
        normalized = self.interpreter.normalize(label)
        course_payloads = {
            "bsa": "what is BSA program",
            "bsit": "what is BSIT program",
            "bsn": "what is BSN program",
            "bsft": "what is BSFT program",
            "bsemc": "what is BSEMC program",
            "bset": "what is BSET program",
            "bs bio": "what is BS Biology program",
            "bsbio": "what is BS Biology program",
            "ab socsci": "what is AB Social Science program",
            "ba socsci": "what is BA Social Science program",
            "bsed fil": "what is BSED Filipino program",
            "bsed math": "what is BSED Mathematics program",
            "beed": "what is BEED program",
            "bsap": "what is BA Philosophy program",
            "ab philo": "what is BA Philosophy program",
            "ba philo": "what is BA Philosophy program",
            "bs es": "what is BS Environmental Science program",
            "bses": "what is BS Environmental Science program",
            "ab socio": "what is AB Sociology program",
            "ba socio": "what is BA Sociology program",
            "ab eng": "what is AB English Language program",
            "ba eng": "what is BA English Language program",
            "bped": "what is BPED program",
            "bs comdev": "what is BS Community Development program",
            "bscomdev": "what is BS Community Development program",
            "ab econ": "what is AB Economics program",
            "ba econ": "what is BA Economics program",
            "beced": "what is BECED program",
            "bsdc": "what is BSDC program",
            "bshm": "what is BSHM program",
            "bsat": "what is BSAT program",
            "bpa": "what is BPA program",
            "bs math": "what is BS Mathematics program",
            "bsmath": "what is BS Mathematics program",
            "bsba": "what is BSBA Financial Management program",
            "bsba fm": "what is BSBA Financial Management program",
            "bsbafm": "what is BSBA Financial Management program",
            "bsed eng": "what is BSED English program",
            "bsed sci": "what is BSED Science program",
            "bsed socstud": "what is BSED Social Studies program",
            "mpa": "what is MPA program",
        }
        if normalized in course_payloads:
            return course_payloads[normalized]
        if len(normalized) <= 5 and normalized.isalnum():
            return f"tell me about {label}"
        if any(term in normalized for term in ["course", "program", "bachelor", "master"]):
            return f"tell me about {label}"
        return label

    def _phrase_score(self, query_text: str, phrases: Sequence[str], exact_weight: float, partial_weight: float) -> float:
        best = 0.0
        for phrase in phrases:
            normalized = self.interpreter.normalize(phrase)
            if not normalized:
                continue
            if normalized in query_text:
                best = max(best, exact_weight)
                continue

            phrase_tokens = set(self.interpreter.tokens(normalized))
            if not phrase_tokens:
                continue
            query_tokens = set(self.interpreter.tokens(query_text))
            coverage = len(phrase_tokens.intersection(query_tokens)) / len(phrase_tokens)
            if coverage >= 0.6:
                best = max(best, partial_weight * coverage)
        return best

    def _entity_score(self, candidate: RetrievalCandidate, entity_values: Sequence[str]) -> float:
        score = 0.0
        haystack = candidate.searchable_text
        for value in entity_values:
            normalized = self.interpreter.normalize(value)
            if not normalized:
                continue
            if normalized in haystack:
                score += 12.0
            else:
                value_tokens = set(self.interpreter.tokens(normalized))
                candidate_tokens = set(candidate.tokens)
                score += min(len(value_tokens.intersection(candidate_tokens)) * 3.0, 9.0)
        return score

    def _expanded_query(self, user_message: str, entity_values: Sequence[str]) -> str:
        parts = [user_message, *entity_values]
        normalized = self.interpreter.normalize(" ".join(parts))
        expansions: List[str] = []
        for term, synonyms in self.SYNONYMS.items():
            if term in normalized:
                expansions.extend(synonyms)
        if expansions:
            parts.extend(expansions)
        return self.interpreter.normalize(" ".join(parts))

    def _confidence(self, best_score: float, runner_up_score: float, reasons: Sequence[str]) -> str:
        if best_score >= self.HIGH_THRESHOLD and "purpose" in reasons:
            return "high"
        if best_score >= self.HIGH_THRESHOLD and best_score - runner_up_score >= self.AMBIGUOUS_MARGIN:
            return "high"
        if best_score >= self.MEDIUM_THRESHOLD:
            return "medium"
        return "low"

    def _label(self, candidate: RetrievalCandidate) -> str:
        if candidate.subject_terms:
            return candidate.subject_terms[0]
        return candidate.intent.replace("_", " ")

    def _log_top_candidates(
        self,
        intent: str,
        user_message: str,
        scored: Sequence[Tuple[float, RetrievalCandidate, List[str]]],
    ) -> None:
        summary = [
            {
                "intent": candidate.intent,
                "score": round(score, 2),
                "reasons": reasons,
            }
            for score, candidate, reasons in scored
        ]
        logger.debug("retrieval candidates intent=%s text=%r top=%s", intent, user_message, summary)
