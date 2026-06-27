import json
import urllib.error
import urllib.request
from typing import Any, Dict


class OllamaClient:
    def __init__(self, url: str, model: str, timeout_seconds: int = 20):
        self.url = url
        self.model = model
        self.timeout_seconds = timeout_seconds

    def generate_json(self, prompt: str) -> Dict[str, Any]:
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0,
                "num_predict": 180
            }
        }
        request = urllib.request.Request(
            self.url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
                body = json.loads(response.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise RuntimeError(f"Ollama request failed: {exc}") from exc

        raw_text = body.get("response") or ""
        try:
            return json.loads(raw_text)
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"Ollama returned non-JSON response: {raw_text[:200]}") from exc

