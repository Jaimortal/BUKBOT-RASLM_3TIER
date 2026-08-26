import logging
import re
from typing import Any, Dict, List, Optional, Sequence, Set, Tuple

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
    EXACT_REASONS = {
        "display_exact",
        "subject_exact",
        "phrase_exact",
        "child_exact",
        "alias_exact",
    }
    BROAD_AMBIGUOUS_TERMS = {
        "id",
        "validation",
        "admission",
        "services",
        "courses",
        "course",
        "office",
        "dean",
        "head",
    }

    def __init__(self, index: RetrievalIndex, interpreter: QueryInterpreter):
        self.index = index
        self.interpreter = interpreter

    def search(
        self,
        intent: str,
        user_message: str,
        entity_values: Sequence[str],
        domain: Optional[str] = None,
    ) -> RetrievalResult:
        query_text = self._expanded_query(user_message, entity_values)
        query_tokens = set(self.interpreter.tokens(query_text))
        if not query_tokens and not entity_values:
            return RetrievalResult(None, 0.0, "low")

        candidate_pool = self.index.candidates_for_domain(domain) if domain else self.index.candidates
        scored: List[Tuple[float, RetrievalCandidate, List[str]]] = []
        for candidate in candidate_pool:
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
            ranked_candidates=[(candidate, score) for score, candidate, _ in scored[:10]],  # Issue 4 Fix: pool expanded from 6 to 10
        )

    def clarification(self, result: RetrievalResult) -> Dict[str, Any]:
        if not result.candidate:
            return {"text": "Can you tell me which topic you mean?"}

        candidates = [result.candidate]
        if result.runner_up and result.runner_up.intent != result.candidate.intent:
            candidates.append(result.runner_up)

        if getattr(result, "ranked_candidates", None):
            for cand, _ in result.ranked_candidates:
                if cand and cand.intent not in {c.intent for c in candidates}:
                    candidates.append(cand)

        suggestions = [
            {"label": self._label(cand), "payload": f'/direct_intent{{"intent":"{cand.intent}"}}'}
            for cand in candidates[:4]
        ]

        if len(suggestions) >= 2:
            return {
                "text": f"Do you mean {suggestions[0]['label']} or {suggestions[1]['label']}?",
                "custom": {"suggestions": suggestions},
            }
        return {
            "text": f"Can you clarify if you mean {suggestions[0]['label']}?",
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
        inferred_purposes = self._infer_purposes(query_text)

        if candidate.intent == "course_slots" and not self._has_course_slot_subject(query_text, query_tokens):
            return 0.0, ["course_slot_subject_missing"]

        if candidate.purpose and candidate.purpose in inferred_purposes:
            score += 12.0
            reasons.append("query_purpose")
        elif candidate.purpose == intent and not (intent == "ask_general_info" and inferred_purposes):
            score += 12.0
            reasons.append("purpose")
        elif candidate.purpose and candidate.purpose != intent:
            score -= 8.0
            reasons.append("purpose_mismatch")

        display_score, display_reason = self._phrase_score(
            query_text,
            [candidate.display_name],
            exact_weight=36.0,
            partial_weight=14.0,
            reason_prefix="display",
        )
        if display_score:
            score += display_score
            reasons.append(display_reason)

        phrase_score, phrase_reason = self._phrase_score(
            query_text,
            candidate.phrases,
            exact_weight=38.0,
            partial_weight=18.0,
            reason_prefix="phrase",
        )
        if phrase_score:
            score += phrase_score
            reasons.append(phrase_reason)

        subject_score, subject_reason = self._phrase_score(
            query_text,
            candidate.subject_terms,
            exact_weight=34.0,
            partial_weight=16.0,
            reason_prefix="subject",
        )
        if subject_score:
            score += subject_score
            reasons.append(subject_reason)

        child_score, child_reason = self._phrase_score(
            query_text,
            candidate.child_terms,
            exact_weight=32.0,
            partial_weight=14.0,
            reason_prefix="child",
        )
        if child_score:
            score += child_score
            reasons.append(child_reason)

        alias_score, alias_reason = self._phrase_score(
            query_text,
            candidate.alias_terms,
            exact_weight=30.0,
            partial_weight=13.0,
            reason_prefix="alias",
        )
        if alias_score:
            score += alias_score
            reasons.append(alias_reason)

        topic_score, topic_reason = self._phrase_score(
            query_text,
            candidate.topic_terms,
            exact_weight=10.0,
            partial_weight=6.0,
            reason_prefix="context",
        )
        if topic_score:
            score += topic_score
            reasons.append(topic_reason)

        overlap = query_tokens.intersection(set(candidate.tokens))
        if overlap:
            score += min(len(overlap) * 1.5, 9.0)
            reasons.append("token_overlap")

        entity_score = self._entity_score(candidate, entity_values)
        if entity_score:
            score += entity_score
            reasons.append("entity")

        # Answer-text overlap is intentionally weak. It helps paraphrases but
        # cannot beat a strong subject/purpose mismatch by itself.
        answer_tokens = set(self.interpreter.tokens(candidate.answer_text, expand=False))
        answer_overlap = query_tokens.intersection(answer_tokens)
        if answer_overlap:
            score += min(len(answer_overlap) * 0.75, 5.0)
            reasons.append("answer_overlap")

        if intent in self.LOCATION_PURPOSES and candidate.purpose != "ask_location":
            score -= 12.0
            reasons.append("location_guard")

        conflict_penalty = self._ambiguous_global_penalty(candidate, query_tokens, reasons)
        if conflict_penalty:
            score -= conflict_penalty
            reasons.append("ambiguous_term_guard")

        return score, reasons

    def _infer_purposes(self, query_text: str) -> Set[str]:
        purposes: Set[str] = set()
        tokens = set(self.interpreter.tokens(query_text))
        if tokens.intersection({"where", "asa"}) or self._has_any(query_text, ["located", "location", "find", "go to", "get to", "direction"]):
            purposes.add("ask_location")
        if tokens.intersection({"requirement", "requirements", "need", "needed", "bring", "documents", "document", "kinahanglan", "kailangan"}):
            purposes.add("ask_requirement")
        if tokens.intersection({"how", "process", "steps", "apply", "request", "kuha", "unsaon"}) or self._has_any(query_text, ["how to", "step by step"]):
            purposes.add("ask_process")
        if tokens.intersection({"download", "form", "permit", "certificate", "cor"}):
            purposes.add("ask_document")
        if tokens.intersection({"when", "schedule", "deadline", "time", "date", "kanus", "kanusa"}):
            purposes.add("ask_schedule")
        if tokens.intersection({"fee", "fees", "payment", "cost", "price", "pay", "bayad", "pila"}):
            purposes.add("ask_fee")
        if tokens.intersection({"offer", "offers", "offered", "available", "availability", "naa"}):
            purposes.add("ask_availability")
        return purposes

    def _has_any(self, text: str, terms: Sequence[str]) -> bool:
        normalized = self.interpreter.normalize(text)
        return any(term in normalized for term in terms)

    def _has_course_slot_subject(self, query_text: str, query_tokens: Set[str]) -> bool:
        if "course slot" in query_text or "course slots" in query_text:
            return True
        if query_tokens.intersection({"cas", "cot", "cob", "con", "coe", "coa", "ba", "ab", "bs"}):
            return True
        course_aliases = [
            "ba philo",
            "ab philo",
            "ba eco",
            "ab eco",
            "bsit",
            "bset",
            "bsat",
            "bsft",
            "bsemc",
            "bs multimedia",
            "bsn",
            "bshm",
            "bsa",
            "bsba",
            "bpa",
            "public administration",
            "bachelor of public administration",
            "bsdc",
            "devcom",
            "bs comdev",
            "bs math",
            "bs bio",
            "bs es",
        ]
        return any(alias in query_text for alias in course_aliases)

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

    def _phrase_score(
        self,
        query_text: str,
        phrases: Sequence[str],
        exact_weight: float,
        partial_weight: float,
        reason_prefix: str,
    ) -> Tuple[float, str]:
        best = 0.0
        best_reason = ""
        query_tokens = set(self.interpreter.tokens(query_text))
        for phrase in phrases:
            normalized = self.interpreter.normalize(phrase)
            if not normalized:
                continue
            if self._contains_term(query_text, normalized):
                best = max(best, exact_weight)
                best_reason = f"{reason_prefix}_exact"
                continue

            phrase_tokens = set(self.interpreter.tokens(normalized))
            if not phrase_tokens:
                continue
            coverage = len(phrase_tokens.intersection(query_tokens)) / len(phrase_tokens)
            if coverage >= 0.6:
                partial_score = partial_weight * coverage
                if partial_score > best:
                    best = partial_score
                    best_reason = f"{reason_prefix}_partial"
        return best, best_reason

    def _contains_term(self, query_text: str, normalized_term: str) -> bool:
        if not normalized_term:
            return False
        if len(normalized_term) <= 3 or " " not in normalized_term:
            return bool(re.search(rf"(?<!\w){re.escape(normalized_term)}(?!\w)", query_text))
        return normalized_term in query_text

    def _ambiguous_global_penalty(
        self,
        candidate: RetrievalCandidate,
        query_tokens: Set[str],
        reasons: Sequence[str],
    ) -> float:
        if self.EXACT_REASONS.intersection(reasons):
            return 0.0
        if not query_tokens.intersection(self.BROAD_AMBIGUOUS_TERMS):
            return 0.0
        if "purpose" in reasons and {"phrase_partial", "subject_partial", "child_partial", "alias_partial"}.intersection(reasons):
            return 0.0
        return 6.0

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
        normalized = self.interpreter.normalize_for_search(" ".join(parts))
        expansions: List[str] = []
        for term, synonyms in self.SYNONYMS.items():
            if term in normalized:
                expansions.extend(synonyms)
        if expansions:
            parts.extend(expansions)
        return self.interpreter.normalize(" ".join(parts))

    def _confidence(self, best_score: float, runner_up_score: float, reasons: Sequence[str]) -> str:
        exact_match = bool(self.EXACT_REASONS.intersection(reasons))
        has_purpose_mismatch = "purpose_mismatch" in reasons
        if has_purpose_mismatch and "phrase_exact" not in reasons and "display_exact" not in reasons:
            if best_score >= self.MEDIUM_THRESHOLD:
                return "medium"
            return "low"
        if (
            best_score >= self.HIGH_THRESHOLD
            and "purpose" in reasons
            and ("subject_exact" in reasons or "child_exact" in reasons or "display_exact" in reasons or "phrase_exact" in reasons)
        ):
            return "high"
        if best_score >= self.HIGH_THRESHOLD and best_score - runner_up_score >= self.AMBIGUOUS_MARGIN and exact_match:
            return "high"
        if best_score >= self.MEDIUM_THRESHOLD:
            return "medium"
        return "low"

    def _label(self, candidate: RetrievalCandidate) -> str:
        if candidate.display_name:
            return candidate.display_name
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
