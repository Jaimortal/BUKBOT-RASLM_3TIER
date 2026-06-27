# Optional LLM Reranker Layer

This project can optionally use a local LLM as a guarded reranker after Rasa NLU and structured retrieval.

The LLM does not create chatbot answers. It only chooses from official JSON-backed candidate records that the existing retrieval layer already found. The final text, choices, maps, images, and child-row responses still come from the project data files.

## Default Behavior

The LLM reranker is disabled by default.

If it is disabled, unavailable, too slow, or returns an unsafe answer, the chatbot falls back to the current structured retrieval behavior.

## When It Runs

The reranker is considered only when:

- structured retrieval already found multiple candidates
- the top match is low or medium confidence
- or the top match is close to the runner-up

High-confidence local retrieval answers are not sent to the LLM.

## Environment Variables

Enable it only for controlled testing first:

```powershell
set RASA_LLM_RERANKER_ENABLED=true
set RASA_LLM_MODEL=gemma3:1b
set RASA_LLM_OLLAMA_URL=http://localhost:11434/api/generate
set RASA_LLM_TIMEOUT_SECONDS=4
```

Then restart the Rasa action server.

To disable it again:

```powershell
set RASA_LLM_RERANKER_ENABLED=
```

## Local Model Requirement

This expects Ollama to be running locally and the configured model to be available.

Example:

```powershell
ollama serve
ollama pull gemma3:1b
```

Use a small local model first on low-RAM machines. If the laptop becomes slow, disable the reranker and continue with pure Rasa structured retrieval.

## Safety Rule

The prompt tells the LLM to return only this JSON shape:

```json
{"selected_intent": "official_intent_or_null", "confidence": "high|medium|low", "reason": "short reason"}
```

The code accepts only intents that exist in the candidate list. If the LLM selects anything else, it is ignored.
