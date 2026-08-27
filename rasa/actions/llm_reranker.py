import logging
import os
import time
from typing import Any, Dict, Optional, Tuple

from llm_api_client import LLMApiClient, load_project_env
from retrieval_result import RetrievalCandidate, RetrievalResult


logger = logging.getLogger(__name__)


class LLMReranker:
    """Optional external LLM reranker for close retrieval matches.

    The LLM is not allowed to answer the user. It can only select one intent
    from official JSON-backed candidates already found by local retrieval.
    """

    SYSTEM_PROMPT = """You are an intelligent semantic selector for a university chatbot at Bukidnon State University.
Given a student's question and a list of official candidate records, your task is to identify which candidate's answer directly addresses the student's question.

Rules:
1. Understand the core intent of the student's question even if written in Cebuano/Bisaya, Tagalog/Taglish, colloquial slang, or long narratives (e.g., "dili nako mahinumdoman ang passcode", "nahagbong ko", "sakit akong ngipon", "magpa ibot", "losing an account", "applying for graduation").
2. Match the student's situation to the candidate whose display_name, subject terms, or official_answer best resolves their inquiry.
3. If a candidate clearly answers the question, choose its intent and set confidence to "high" (or "medium" if it is the closest reasonable match).
4. Only return selected_intent as null if NONE of the candidate records are relevant to the user's inquiry.
5. Return JSON only in this exact shape:
{"selected_intent": string|null, "confidence": "high"|"medium"|"low", "reason": string}
"""

    def __init__(self) -> None:
        load_project_env()
        self.enabled = os.getenv("RASA_LLM_RERANKER_ENABLED", "").strip().lower() in {"1", "true", "yes", "on"}
        self.provider = os.getenv("RASA_LLM_PROVIDER", "").strip().lower()
        self.model = os.getenv("RASA_LLM_MODEL", "").strip() or None
        self.timeout_seconds = self._float_env("RASA_LLM_TIMEOUT_SECONDS", 4.0)
        self.top_k = max(2, min(10, self._int_env("RASA_LLM_TOP_K", 7)))  # Issue 4 Fix: increased default from 5 to 7
        self.max_prompt_chars = max(1200, self._int_env("RASA_LLM_MAX_PROMPT_CHARS", 7000))
        self.max_tokens = max(80, min(600, self._int_env("RASA_LLM_MAX_TOKENS", 160)))
        self.client = LLMApiClient(
            provider=self.provider or None,
            model=self.model,
            timeout_seconds=self.timeout_seconds,
            max_tokens=self.max_tokens,
        )
        self._decision_cache: Dict[str, Tuple[float, Optional[RetrievalCandidate]]] = {}

    NOISE_AND_GREETINGS = {
        "hi", "hello", "hey", "helo", "hiii", "hiya", "yo", "sup",
        "good morning", "good afternoon", "good evening", "good night",
        "kumusta", "musta", "komusta", "maayong buntag", "maayong hapon", "maayong gabii",
        "test", "testing", "ok", "okay", "k", "bye", "goodbye",
        "thanks", "thank you", "tnx", "ty", "salamat", "daghang salamat",
        "lol", "haha", "hahaha", "asdf", "asdfgh"
    }

    @classmethod
    def is_noise_or_greeting(cls, text: str) -> bool:
        cleaned = (text or "").strip().lower().strip("?!.,:-_")
        if not cleaned or (text and text.strip().startswith("/")):
            return True
        if cleaned in cls.NOISE_AND_GREETINGS:
            return True
        return False

    def should_rerank(
        self,
        result: RetrievalResult,
        user_message: Optional[str] = None,
        force: bool = False,
    ) -> bool:
        if not self.enabled:
            return False
        if user_message and self.is_noise_or_greeting(user_message):
            logger.info("LLM reranker skipped greeting/noise query: %r", user_message)
            return False
        if not self.client.is_configured():
            logger.warning("LLM reranker is enabled but no API key is configured for provider=%s.", self.client.provider)
            return False
        if not result.candidate or not result.ranked_candidates:
            return False
        # Issue 1 Fix: Dead guard removed — the margin check now lives upstream in
        # knowledge_router.find_best_response(). Narrow-margin high-confidence results
        # are now forwarded here by the router, so we should always try to rerank them.
        return len(result.ranked_candidates) >= 2

    def choose(
        self,
        user_message: str,
        result: RetrievalResult,
        domain: Optional[str] = None,  # Issue 2 Fix: accept domain for scoped caching
    ) -> Optional[RetrievalCandidate]:
        if not self.should_rerank(result, user_message=user_message):
            return None

        # Issue 2 Fix: include domain in cache key to prevent cross-domain cache pollution
        raw_key = (user_message or "").strip().lower().strip("?!.,:-_")
        cache_key = f"{domain or 'global'}|{raw_key}"
        now = time.time()
        if cache_key in self._decision_cache:
            cached_time, cached_candidate = self._decision_cache[cache_key]
            if now - cached_time < 3600:
                logger.info(
                    "LLM reranker decision cache hit for query=%r domain=%s -> intent=%s (0 API tokens burned)",
                    user_message,
                    domain,
                    cached_candidate.intent if cached_candidate else None,
                )
                return cached_candidate

        candidates = result.ranked_candidates[: self.top_k]
        intent_lookup = {candidate.intent: candidate for candidate, _ in candidates}
        # Issue 3 Fix: pass domain so the prompt can include section context
        prompt = self._build_prompt(user_message, candidates, domain=domain)

        print(f"[LLM MATCHER] Query: '{user_message}' -> Consulting LLM on {len(candidates)} candidates (domain={domain or 'global'})...")
        try:
            decision = self._generate_json(prompt)
        except Exception as exc:
            print(f"[LLM MATCHER] API call failed: {exc} -> Falling back to RASA Local NLU")
            logger.warning("LLM reranker unavailable; falling back to local retrieval: %s", exc)
            return None

        selected_intent = str(decision.get("selected_intent") or "").strip()
        confidence = str(decision.get("confidence") or "low").strip().lower()
        if confidence not in {"high", "medium"}:
            print(f"[LLM MATCHER] LLM declined selection (confidence='{confidence}') -> Falling back to RASA Local NLU")
            self._decision_cache[cache_key] = (now, None)
            return None
        if selected_intent not in intent_lookup:
            print(f"[LLM MATCHER] LLM selected unknown intent '{selected_intent}' -> Falling back to RASA Local NLU")
            self._decision_cache[cache_key] = (now, None)
            return None

        reason_text = str(decision.get('reason', '')).encode('ascii', errors='replace').decode('ascii')
        print(f"[LLM MATCHER] Success! Selected Intent: '{selected_intent}' (Confidence: {confidence}) | Reason: {reason_text}")
        selected_candidate = intent_lookup[selected_intent]
        self._decision_cache[cache_key] = (now, selected_candidate)
        return selected_candidate

    def _build_prompt(
        self,
        user_message: str,
        candidates: Any,
        domain: Optional[str] = None,  # Issue 3 Fix: accept domain for context injection
    ) -> str:
        lines = []
        # Issue 3 Fix: prepend domain section context so LLM doesn't guess the scope
        if domain:
            domain_labels = {
                "procedures": "Student Procedures & Processes",
                "academics": "Academic Policies & Programs",
                "services": "Campus Services & Facilities",
                "university": "University Information",
                "location": "Campus Locations & Directions",
            }
            section_label = domain_labels.get(domain, domain.replace("_", " ").title())
            lines.append(f"Context: The student is browsing the '{section_label}' section of the BukSU university chatbot.")
            lines.append("")
        lines.extend([f"Student Question: {user_message}", "", "Candidate Official Records:"])
        for index, (candidate, score) in enumerate(candidates, start=1):
            lines.append(f"{index}. intent: {candidate.intent}")
            lines.append(f"   topic_name: {candidate.display_name}")
            if candidate.subject_terms:
                lines.append(f"   subject: {', '.join(candidate.subject_terms[:6])}")
            if candidate.phrases:
                lines.append(f"   sample_phrases: {', '.join(candidate.phrases[:4])}")
            answer_preview = self._compact(candidate.answer_text, 120)
            if answer_preview:
                lines.append(f"   official_answer: {answer_preview}")
            lines.append("")
        lines.append("Choose which candidate intent best answers the Student Question. Return JSON only.")
        prompt = "\n".join(lines)
        return prompt[: self.max_prompt_chars]

    def _generate_json(self, prompt: str) -> Dict[str, Any]:
        return self.client.generate_json(prompt, system_prompt=self.SYSTEM_PROMPT)

    @staticmethod
    def _compact(value: str, max_chars: int) -> str:
        text = " ".join(str(value or "").split())
        if len(text) <= max_chars:
            return text
        return text[: max_chars - 3].rstrip() + "..."

    @staticmethod
    def _int_env(name: str, default: int) -> int:
        try:
            return int(os.getenv(name, str(default)))
        except (TypeError, ValueError):
            logger.warning("Invalid %s value; using default %s", name, default)
            return default

    @staticmethod
    def _float_env(name: str, default: float) -> float:
        try:
            return float(os.getenv(name, str(default)))
        except (TypeError, ValueError):
            logger.warning("Invalid %s value; using default %s", name, default)
            return default
