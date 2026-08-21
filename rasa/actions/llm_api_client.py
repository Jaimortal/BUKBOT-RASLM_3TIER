import json
import logging
import os
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Dict, Optional


logger = logging.getLogger(__name__)


def load_project_env() -> None:
    """Load root .env values when the Rasa action server was started manually.

    Existing environment variables win, so production/server-provided secrets are
    never overwritten by the local .env file.
    """
    current = Path(__file__).resolve()
    for parent in current.parents:
        env_path = parent / ".env"
        if not env_path.exists():
            continue
        try:
            for raw_line in env_path.read_text(encoding="utf-8").splitlines():
                line = raw_line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = value
        except OSError as exc:
            logger.warning("Could not read .env file at %s: %s", env_path, exc)
        return


class LLMApiClient:
    """Small guarded JSON client for external LLM reranking providers."""

    GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
    GEMINI_URL_TEMPLATE = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

    def __init__(
        self,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        timeout_seconds: float = 4.0,
        max_tokens: int = 160,
    ) -> None:
        load_project_env()
        self.provider = (provider or os.getenv("RASA_LLM_PROVIDER") or self._default_provider()).strip().lower()
        self.timeout_seconds = timeout_seconds
        self.max_tokens = max_tokens
        self.model = model or self._model_for_provider(self.provider)

    def is_configured(self) -> bool:
        return bool(self.provider in {"groq", "gemini"} and self._api_key())

    def generate_json(self, prompt: str, system_prompt: Optional[str] = None) -> Dict[str, Any]:
        if self.provider == "groq":
            return self._generate_groq_json(prompt, system_prompt=system_prompt)
        if self.provider == "gemini":
            return self._generate_gemini_json(prompt, system_prompt=system_prompt)
        raise RuntimeError(f"Unsupported LLM provider: {self.provider or 'not set'}")

    def _generate_groq_json(self, prompt: str, system_prompt: Optional[str] = None) -> Dict[str, Any]:
        api_key = os.getenv("GROQ_API_KEY", "").strip()
        if not api_key:
            raise RuntimeError("GROQ_API_KEY is not configured.")

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model or os.getenv("GROQ_MODEL", "llama-3.1-8b-instant"),
            "messages": messages,
            "temperature": 0,
            "max_tokens": max(350, self.max_tokens),
            "response_format": {"type": "json_object"},
        }
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        try:
            body = self._post_json(self.GROQ_URL, payload, headers)
        except Exception as primary_err:
            # If Groq json_object enforcement fails with 400, retry once without response_format
            # and parse JSON from the raw text response
            logger.debug("Groq JSON mode failed, retrying in plain mode: %s", primary_err)
            payload.pop("response_format", None)
            body = self._post_json(self.GROQ_URL, payload, headers)

        try:
            raw_text = body["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise RuntimeError(f"Groq returned an unexpected response: {str(body)[:220]}") from exc
        return self._parse_json_text(raw_text, "Groq")

    def _generate_gemini_json(self, prompt: str, system_prompt: Optional[str] = None) -> Dict[str, Any]:
        api_key = os.getenv("GEMINI_API_KEY", "").strip()
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is not configured.")
        model = self.model or os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")
        url = self.GEMINI_URL_TEMPLATE.format(model=urllib.parse.quote(model, safe=""))
        url = f"{url}?key={urllib.parse.quote(api_key, safe='')}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0,
                "maxOutputTokens": self.max_tokens,
                "responseMimeType": "application/json",
            },
        }
        body = self._post_json(url, payload, {"Content-Type": "application/json"})
        try:
            parts = body["candidates"][0]["content"]["parts"]
            raw_text = "".join(str(part.get("text", "")) for part in parts)
        except (KeyError, IndexError, TypeError) as exc:
            raise RuntimeError(f"Gemini returned an unexpected response: {str(body)[:220]}") from exc
        return self._parse_json_text(raw_text, "Gemini")

    def _post_json(self, url: str, payload: Dict[str, Any], headers: Dict[str, str]) -> Dict[str, Any]:
        request_headers = {
            "Accept": "application/json",
            "User-Agent": "BukSU-Chatbot-LLM-Reranker/1.0",
            **headers,
        }
        request = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers=request_headers,
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            error_text = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"{self.provider} API request failed ({exc.code}): {error_text[:300]}") from exc
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise RuntimeError(f"{self.provider} API request failed: {exc}") from exc

    @staticmethod
    def _parse_json_text(raw_text: str, provider_label: str) -> Dict[str, Any]:
        text = str(raw_text or "").strip()
        if text.startswith("```"):
            text = text.strip("`")
            if text.lower().startswith("json"):
                text = text[4:].strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"{provider_label} returned non-JSON response: {text[:220]}") from exc

    @staticmethod
    def _default_provider() -> str:
        if os.getenv("GROQ_API_KEY"):
            return "groq"
        if os.getenv("GEMINI_API_KEY"):
            return "gemini"
        return "groq"

    @staticmethod
    def _model_for_provider(provider: str) -> str:
        if provider == "gemini":
            return os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")
        return os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")

    def _api_key(self) -> str:
        if self.provider == "gemini":
            return os.getenv("GEMINI_API_KEY", "").strip()
        if self.provider == "groq":
            return os.getenv("GROQ_API_KEY", "").strip()
        return ""
