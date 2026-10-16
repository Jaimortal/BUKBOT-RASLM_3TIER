# LLM API Reranker Setup Guide

This project can optionally use an external LLM API as a guarded reranker.

The LLM does not create the final BukSU answer. It only chooses the best record from official JSON-backed candidates already found by the chatbot retrieval layer.

## Supported Providers

- Groq: `llama-3.1-8b-instant`
- Google AI Studio / Gemini: `gemini-2.5-flash-lite`

## 1. Add Environment Variables

Create or update the root `.env` file.

Groq example:

```env
RASA_LLM_RERANKER_ENABLED=false
RASA_LLM_PROVIDER=groq
GROQ_API_KEY=put-your-real-groq-key-here
GROQ_MODEL=llama-3.1-8b-instant
RASA_LLM_TIMEOUT_SECONDS=4
RASA_LLM_TOP_K=5
RASA_LLM_MAX_PROMPT_CHARS=7000
RASA_LLM_MAX_TOKENS=160
```

Gemini example:

```env
RASA_LLM_RERANKER_ENABLED=false
RASA_LLM_PROVIDER=gemini
GEMINI_API_KEY=put-your-real-gemini-key-here
GEMINI_MODEL=gemini-2.5-flash-lite
RASA_LLM_TIMEOUT_SECONDS=4
RASA_LLM_TOP_K=5
RASA_LLM_MAX_PROMPT_CHARS=7000
RASA_LLM_MAX_TOKENS=160
```

Keep `RASA_LLM_RERANKER_ENABLED=false` while doing dry runs.

## 2. Dry Run Before Enabling Rasa

From the project root:

```powershell
python experimental_llm_layer/dry_run.py "unsaon pag lantaw admission result" --llm --provider groq
```

Or:

```powershell
python experimental_llm_layer/dry_run.py "unsaon pag lantaw admission result" --llm --provider gemini
```

Use JSON output when debugging:

```powershell
python experimental_llm_layer/dry_run.py "how do i get my COR" --llm --provider groq --json
```

## 3. Enable Inside Rasa

After dry-run results look safe, set:

```env
RASA_LLM_RERANKER_ENABLED=true
```

Then restart the Rasa action server.

## Safety Notes

- Do not commit `.env`; it is already gitignored.
- If the API is slow, invalid, or unavailable, the chatbot falls back to local retrieval.
- The LLM is called only for close/unclear retrieval matches, not every message.
- If answers become unstable, set `RASA_LLM_RERANKER_ENABLED=false` and restart the action server.
