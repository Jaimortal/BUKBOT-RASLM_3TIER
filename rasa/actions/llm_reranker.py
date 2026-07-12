import logging
import os
from typing import Any, Dict, Optional

from llm_api_client import LLMApiClient, load_project_env
from retrieval_result import RetrievalCandidate, RetrievalResult


logger = logging.getLogger(__name__)


class LLMReranker:
    """Optional external LLM reranker for close retrieval matches.

    The LLM is not allowed to answer the user. It can only select one intent
    from official JSON-backed candidates already found by local retrieval.
    """

    SYSTEM_PROMPT = """You are a guarded reranker for a BukSU Rasa chatbot.

Rules:
- Choose only from the provided candidate intents.
- Do not answer using your own knowledge.
- Do not invent dates, fees, offices, requirements, procedures, images, or maps.
- If no candidate clearly matches the user question, return selected_intent as null.
- Return JSON only.

JSON shape:
{"selected_intent": string|null, "confidence": "high"|"medium"|"low", "reason": string}
"""

    def __init__(self) -> None:
        load_project_env()
        self.enabled = os.getenv("RASA_LLM_RERANKER_ENABLED", "").strip().lower() in {"1", "true", "yes", "on"}
        self.provider = os.getenv("RASA_LLM_PROVIDER", "").strip().lower()
        self.model = os.getenv("RASA_LLM_MODEL", "").strip() or None
        self.timeout_seconds = self._float_env("RASA_LLM_TIMEOUT_SECONDS", 4.0)
        self.top_k = max(2, min(8, self._int_env("RASA_LLM_TOP_K", 5)))
        self.max_prompt_chars = max(1200, self._int_env("RASA_LLM_MAX_PROMPT_CHARS", 7000))
        self.max_tokens = max(80, min(600, self._int_env("RASA_LLM_MAX_TOKENS", 160)))
        self.client = LLMApiClient(
            provider=self.provider or None,
            model=self.model,
            timeout_seconds=self.timeout_seconds,
            max_tokens=self.max_tokens,
        )

    def should_rerank(self, result: RetrievalResult) -> bool:
        if not self.enabled:
            return False
        if not self.client.is_configured():
            logger.warning("LLM reranker is enabled but no API key is configured for provider=%s.", self.client.provider)
            return False
        if not result.candidate or not result.ranked_candidates:
            return False
        if result.is_high_confidence and (result.score - result.runner_up_score) >= 8:
            return False
        return len(result.ranked_candidates) >= 2

    def choose(self, user_message: str, result: RetrievalResult) -> Optional[RetrievalCandidate]:
        if not self.should_rerank(result):
            return None

        candidates = result.ranked_candidates[: self.top_k]
        intent_lookup = {candidate.intent: candidate for candidate, _ in candidates}
        prompt = self._build_prompt(user_message, candidates)

        try:
            decision = self._generate_json(prompt)
        except Exception as exc:
            logger.warning("LLM reranker unavailable; falling back to local retrieval: %s", exc)
            return None

        selected_intent = str(decision.get("selected_intent") or "").strip()
        confidence = str(decision.get("confidence") or "low").strip().lower()
        if confidence not in {"high", "medium"}:
            logger.info("LLM reranker declined selection: %s", decision)
            return None
        if selected_intent not in intent_lookup:
            logger.warning("LLM reranker selected unknown intent %r from %s", selected_intent, list(intent_lookup))
            return None

        logger.info(
            "LLM reranker selected intent=%s confidence=%s reason=%s",
            selected_intent,
            confidence,
            decision.get("reason", ""),
        )
        return intent_lookup[selected_intent]

    def _build_prompt(self, user_message: str, candidates: Any) -> str:
        lines = [self.SYSTEM_PROMPT, "", f"User question: {user_message}", "", "Candidate records:"]
        for index, (candidate, score) in enumerate(candidates, start=1):
            lines.append(f"{index}. intent: {candidate.intent}")
            lines.append(f"   display_name: {candidate.display_name}")
            lines.append(f"   local_score: {round(score, 2)}")
            lines.append(f"   purpose: {candidate.purpose or ''}")
            if candidate.subject_terms:
                lines.append(f"   subject_terms: {', '.join(candidate.subject_terms[:8])}")
            if candidate.phrases:
                lines.append(f"   phrases: {', '.join(candidate.phrases[:8])}")
            answer_preview = self._compact(candidate.answer_text, 420)
            if answer_preview:
                lines.append(f"   official_answer_preview: {answer_preview}")
            lines.append("")
        lines.append("Return the JSON decision only.")
        prompt = "\n".join(lines)
        return prompt[: self.max_prompt_chars]

    def _generate_json(self, prompt: str) -> Dict[str, Any]:
        return self.client.generate_json(prompt)

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
