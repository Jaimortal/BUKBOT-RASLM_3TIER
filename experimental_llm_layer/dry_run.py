import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

from knowledge_loader import KnowledgeLoader, KnowledgeRecord
from prompts import build_selection_prompt
from retriever import LocalRetriever, RetrievalCandidate


def project_root() -> Path:
    return Path(__file__).resolve().parents[1]


ROOT = project_root()
RASA_ACTIONS_PATH = ROOT / "rasa" / "actions"
if str(RASA_ACTIONS_PATH) not in sys.path:
    sys.path.insert(0, str(RASA_ACTIONS_PATH))

from llm_api_client import LLMApiClient, load_project_env  # noqa: E402
from llm_reranker import LLMReranker  # noqa: E402


def load_config(root: Path) -> Dict[str, Any]:
    config_path = root / "experimental_llm_layer" / "config.json"
    return json.loads(config_path.read_text(encoding="utf-8"))


def official_payload(record: KnowledgeRecord, lang: str = "en") -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "selected_id": record.id,
        "source": record.source,
        "intent": record.intent,
        "display_name": record.display_name,
        "answer": record.answer_lines(lang),
    }
    if record.suggestions:
        payload["suggestions"] = record.suggestions
    if record.choice_groups:
        payload["choiceGroups"] = record.choice_groups
    if record.images:
        payload["images"] = record.images
    if record.map_data:
        map_data = dict(record.map_data)
        if map_data.get("coordinates") and not map_data.get("pins"):
            map_data["pins"] = [{
                "name": map_data.get("locationName") or record.display_name or "Location",
                "coordinates": map_data.get("coordinates"),
            }]
        payload["mapData"] = map_data
    return payload


def deterministic_selection(candidates: List[RetrievalCandidate]) -> Optional[RetrievalCandidate]:
    if not candidates:
        return None
    if candidates[0].score < 8:
        return None
    if len(candidates) > 1 and candidates[0].score - candidates[1].score < 2:
        return None
    return candidates[0]


def llm_selection(
    query: str,
    candidates: List[RetrievalCandidate],
    config: Dict[str, Any],
    model: Optional[str],
    provider: Optional[str],
) -> Dict[str, Any]:
    if LLMReranker.is_noise_or_greeting(query):
        return {
            "selected_id": None,
            "confidence": "low",
            "reason": "Query skipped (recognized as greeting/noise)."
        }
    prompt = build_selection_prompt(query, candidates)
    client = LLMApiClient(
        provider=provider or config.get("default_provider"),
        model=model,
        timeout_seconds=float(config.get("timeout_seconds", 20)),
        max_tokens=int(config.get("max_tokens", 180)),
    )
    decision = client.generate_json(prompt)
    selected_id = decision.get("selected_id")
    candidate_ids = {candidate.record.id for candidate in candidates}
    if selected_id not in candidate_ids:
        return {
            "selected_id": None,
            "confidence": "low",
            "reason": "LLM did not select a valid candidate id."
        }
    return decision


def run(query: str, use_llm: bool, model: Optional[str], provider: Optional[str], lang: str, as_json: bool) -> Dict[str, Any]:
    load_project_env()
    root = project_root()
    config = load_config(root)
    records = KnowledgeLoader(root, config).load()
    retriever = LocalRetriever(records)
    candidates = retriever.search(query, top_k=int(config.get("top_k", 6)))
    provider_name = provider or os.getenv("RASA_LLM_PROVIDER") or config.get("default_provider")
    if model:
        model_name = model
    elif provider_name == config.get("default_provider"):
        model_name = config.get("default_model")
    else:
        model_name = None

    result: Dict[str, Any] = {
        "query": query,
        "mode": "llm" if use_llm else "local_retrieval",
        "provider": provider_name if use_llm else None,
        "model": model_name if use_llm else None,
        "candidate_count": len(candidates),
        "candidates": [
            {
                "id": candidate.record.id,
                "display_name": candidate.record.display_name,
                "intent": candidate.record.intent,
                "source": candidate.record.source,
                "score": round(candidate.score, 2),
                "reasons": candidate.reasons[:5],
                "answer_preview": candidate.record.compact_answer(lang, max_chars=220),
            }
            for candidate in candidates
        ],
    }

    selected: Optional[RetrievalCandidate] = None
    decision: Dict[str, Any] = {}
    if use_llm and candidates:
        try:
            decision = llm_selection(query, candidates, config, model_name, provider_name)
            selected_id = decision.get("selected_id")
            selected = next((candidate for candidate in candidates if candidate.record.id == selected_id), None)
        except RuntimeError as exc:
            decision = {
                "selected_id": None,
                "confidence": "low",
                "reason": str(exc),
                "fallback": "local_retrieval",
            }
            selected = deterministic_selection(candidates)
    else:
        selected = deterministic_selection(candidates)
        decision = {
            "selected_id": selected.record.id if selected else None,
            "confidence": "medium" if selected else "low",
            "reason": "Local retrieval dry run. Use --llm to ask the configured API LLM to choose among candidates.",
        }

    result["decision"] = decision
    if selected:
        result["status"] = "selected"
        result["official_response"] = official_payload(selected.record, lang)
    else:
        result["status"] = "needs_clarification"
        result["official_response"] = {
            "answer": [
                "I found possible records, but none was clear enough to answer safely."
            ],
            "suggestions": [
                {"label": candidate.record.display_name, "payload": candidate.record.display_name}
                for candidate in candidates[:4]
            ],
        }

    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Dry-run guarded LLM interpreter against local chatbot JSON data.")
    parser.add_argument("query", help="User question to test.")
    parser.add_argument("--llm", action="store_true", help="Use configured LLM API to choose from retrieved candidates.")
    parser.add_argument("--provider", choices=["groq", "gemini"], default=None, help="LLM API provider. Defaults to config/env.")
    parser.add_argument("--model", default=None, help="Provider model name. Examples: llama-3.1-8b-instant, gemini-2.5-flash-lite")
    parser.add_argument("--lang", default="en", choices=["en", "ceb"], help="Official answer language to print.")
    parser.add_argument("--json", action="store_true", help="Print full JSON result.")
    args = parser.parse_args()

    result = run(args.query, args.llm, args.model, args.provider, args.lang, args.json)
    if args.json:
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return

    print(f"Mode: {result['mode']}")
    if result.get("provider"):
        print(f"Provider: {result['provider']}")
    if result.get("model"):
        print(f"Model: {result['model']}")
    print(f"Status: {result['status']}")
    print("\nTop candidates:")
    for candidate in result["candidates"][:5]:
        print(f"- {candidate['display_name']} | score={candidate['score']} | {candidate['source']}")
    print("\nDecision:")
    print(json.dumps(result["decision"], indent=2, ensure_ascii=False))
    print("\nOfficial response from JSON:")
    for line in result["official_response"].get("answer", []):
        print(line)
    if result["official_response"].get("mapData"):
        map_data = result["official_response"]["mapData"]
        print(f"\nMap attached: {map_data.get('locationName')} | pins={len(map_data.get('pins') or [])} | routes={len(map_data.get('routes') or [])}")
    if result["official_response"].get("suggestions"):
        print("\nSuggestions:")
        for suggestion in result["official_response"]["suggestions"]:
            print(f"- {suggestion.get('label')}")


if __name__ == "__main__":
    main()
