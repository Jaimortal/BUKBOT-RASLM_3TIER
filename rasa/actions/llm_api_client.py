import json
import logging
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


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
    """Guarded multi-key JSON client for external LLM reranking and intent matching.

    Supports automatic key rotation across multiple Groq and Gemini API keys with
    automatic failover and rate-limit cooldown tracking.
    """

    GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
    GEMINI_URL_TEMPLATE = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    COOLDOWN_SECONDS = 60.0

    def __init__(
        self,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        timeout_seconds: float = 3.5,
        max_tokens: int = 160,
    ) -> None:
        load_project_env()
        self.primary_provider = (provider or os.getenv("RASA_LLM_PROVIDER") or self._default_provider()).strip().lower()
        self.fallback_provider = os.getenv("RASA_LLM_FALLBACK_PROVIDER", "gemini").strip().lower()
        self.timeout_seconds = timeout_seconds
        self.max_tokens = max_tokens
        self.model = model

        # Key cooldown tracker: key_string -> unix timestamp when usable again
        self._key_cooldowns: Dict[str, float] = {}

        # Round-robin cursor indices
        self._groq_index = 0
        self._gemini_index = 0

    def _get_groq_keys(self) -> List[str]:
        keys: List[str] = []
        for i in range(1, 20):
            val = os.getenv(f"GROQ_API_KEY_{i}", "").strip()
            if val and val not in keys and not val.startswith("your-"):
                keys.append(val)
        raw_list = os.getenv("GROQ_API_KEYS", "").strip()
        if raw_list:
            for k in raw_list.split(","):
                k_clean = k.strip()
                if k_clean and k_clean not in keys and not k_clean.startswith("your-"):
                    keys.append(k_clean)
        if not keys:
            single = os.getenv("GROQ_API_KEY", "").strip()
            if single and not single.startswith("your-"):
                keys.append(single)
        return keys

    def _get_gemini_keys(self) -> List[str]:
        keys: List[str] = []
        for i in range(1, 20):
            val = os.getenv(f"GEMINI_API_KEY_{i}", "").strip()
            if val and val not in keys and not val.startswith("your-"):
                keys.append(val)
        raw_list = os.getenv("GEMINI_API_KEYS", "").strip()
        if raw_list:
            for k in raw_list.split(","):
                k_clean = k.strip()
                if k_clean and k_clean not in keys and not k_clean.startswith("your-"):
                    keys.append(k_clean)
        if not keys:
            single = os.getenv("GEMINI_API_KEY", "").strip()
            if single and not single.startswith("your-"):
                keys.append(single)
        return keys

    def is_configured(self) -> bool:
        return bool(self._get_groq_keys() or self._get_gemini_keys())

    @property
    def provider(self) -> str:
        if self._get_groq_keys():
            return "groq"
        if self._get_gemini_keys():
            return "gemini"
        return self.primary_provider

    def _is_key_available(self, key: str) -> bool:
        cooldown_until = self._key_cooldowns.get(key, 0.0)
        return time.time() >= cooldown_until

    def _mark_key_cooldown(self, key: str, duration: Optional[float] = None) -> None:
        secs = duration if duration is not None else self.COOLDOWN_SECONDS
        self._key_cooldowns[key] = time.time() + secs
        masked = key[:6] + "..." + key[-4:] if len(key) > 10 else "***"
        logger.warning("LLM API key [%s] placed on cooldown for %.0f seconds.", masked, secs)

    def generate_json(self, prompt: str, system_prompt: Optional[str] = None) -> Dict[str, Any]:
        """Generate JSON using multi-key pool with automatic failover."""
        providers_to_try = [self.primary_provider]
        if self.fallback_provider and self.fallback_provider != self.primary_provider:
            providers_to_try.append(self.fallback_provider)

        last_error: Optional[Exception] = None

        for current_provider in providers_to_try:
            if current_provider == "groq":
                keys = self._get_groq_keys()
                if not keys:
                    continue
                for attempt_idx in range(len(keys)):
                    key_idx = self._groq_index % len(keys)
                    key = keys[key_idx]
                    self._groq_index = (self._groq_index + 1) % len(keys)
                    if not self._is_key_available(key):
                        continue
                    masked = key[:6] + "..." + key[-4:] if len(key) > 10 else "***"
                    try:
                        print(f"[LLM API] -> Sending request to GROQ (Key #{key_idx + 1}: {masked})...")
                        return self._generate_groq_json_with_key(prompt, key, system_prompt=system_prompt)
                    except urllib.error.HTTPError as http_err:
                        last_error = http_err
                        if http_err.code in (429, 403, 503, 500):
                            self._mark_key_cooldown(key, self.COOLDOWN_SECONDS)
                            print(f"[LLM API] -> GROQ Key #{key_idx + 1} ({masked}) returned HTTP {http_err.code}. Rotating to next key...")
                            continue
                        raise
                    except Exception as err:
                        last_error = err
                        self._mark_key_cooldown(key, 30.0)
                        print(f"[LLM API] -> GROQ Key #{key_idx + 1} ({masked}) failed: {err}. Rotating to next key...")
                        continue

            elif current_provider == "gemini":
                keys = self._get_gemini_keys()
                if not keys:
                    continue
                for attempt_idx in range(len(keys)):
                    key_idx = self._gemini_index % len(keys)
                    key = keys[key_idx]
                    self._gemini_index = (self._gemini_index + 1) % len(keys)
                    if not self._is_key_available(key):
                        continue
                    masked = key[:6] + "..." + key[-4:] if len(key) > 10 else "***"
                    try:
                        print(f"[LLM API] -> Sending request to GEMINI (Key #{key_idx + 1}: {masked})...")
                        return self._generate_gemini_json_with_key(prompt, key, system_prompt=system_prompt)
                    except urllib.error.HTTPError as http_err:
                        last_error = http_err
                        if http_err.code in (429, 403, 503, 500):
                            self._mark_key_cooldown(key, self.COOLDOWN_SECONDS)
                            print(f"[LLM API] -> GEMINI Key #{key_idx + 1} ({masked}) returned HTTP {http_err.code}. Rotating to next key...")
                            continue
                        raise
                    except Exception as err:
                        last_error = err
                        self._mark_key_cooldown(key, 30.0)
                        print(f"[LLM API] -> GEMINI Key #{key_idx + 1} ({masked}) failed: {err}. Rotating to next key...")
                        continue

        if last_error:
            raise RuntimeError(f"All LLM API keys exhausted or failed: {last_error}")
        raise RuntimeError("No configured LLM API keys found.")

    def _generate_groq_json_with_key(
        self, prompt: str, api_key: str, system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        model = self.model or os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")
        payload = {
            "model": model,
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
            logger.debug("Groq JSON mode failed, retrying in plain mode: %s", primary_err)
            payload.pop("response_format", None)
            body = self._post_json(self.GROQ_URL, payload, headers)

        try:
            raw_text = body["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise RuntimeError(f"Groq returned an unexpected response: {str(body)[:220]}") from exc
        return self._parse_json_text(raw_text, "Groq")

    def _generate_gemini_json_with_key(
        self, prompt: str, api_key: str, system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        model = self.model or os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
        url = self.GEMINI_URL_TEMPLATE.format(model=urllib.parse.quote(model, safe=""))
        url = f"{url}?key={urllib.parse.quote(api_key, safe='')}"

        contents = []
        if system_prompt:
            contents.append({"role": "user", "parts": [{"text": f"System Instructions: {system_prompt}"}]})
            contents.append({"role": "model", "parts": [{"text": "Understood. I will strictly follow these instructions."}]})
        contents.append({"role": "user", "parts": [{"text": prompt}]})

        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": 0,
                "maxOutputTokens": max(350, self.max_tokens),
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
            raise RuntimeError(f"API request failed ({exc.code}): {error_text[:300]}") from exc
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise RuntimeError(f"API request failed: {exc}") from exc

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
        if any(os.getenv(f"GROQ_API_KEY_{i}") for i in range(1, 10)) or os.getenv("GROQ_API_KEY"):
            return "groq"
        if any(os.getenv(f"GEMINI_API_KEY_{i}") for i in range(1, 10)) or os.getenv("GEMINI_API_KEY"):
            return "gemini"
        return "groq"

