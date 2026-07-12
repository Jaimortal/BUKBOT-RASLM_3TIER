# Experimental Guarded LLM Layer

This folder is a dry-run LLM interpreter for testing external API reranking before enabling it inside Rasa.

Purpose:

- Read answers from the existing JSON knowledge base.
- Retrieve candidate records from `rasa/actions/Supper Saiyan`, `responses.json`, and `responses_location.json`.
- Optionally ask Groq or Gemini to choose the best candidate.
- Return only the selected JSON/database answer. The LLM is not allowed to invent BukSU facts.

Configure keys in the project root `.env`:

```powershell
RASA_LLM_PROVIDER=groq
GROQ_API_KEY=your_groq_key_here
GROQ_MODEL=llama-3.1-8b-instant

# Or Gemini:
# RASA_LLM_PROVIDER=gemini
# GEMINI_API_KEY=your_gemini_key_here
# GEMINI_MODEL=gemini-2.5-flash-lite
```

Dry run without LLM:

```powershell
python experimental_llm_layer/dry_run.py "how to get PE uniform"
```

Dry run with Groq:

```powershell
python experimental_llm_layer/dry_run.py "unsaon pag lantaw admission result" --llm --provider groq
```

Dry run with Gemini:

```powershell
python experimental_llm_layer/dry_run.py "unsaon pag lantaw admission result" --llm --provider gemini
```

JSON output:

```powershell
python experimental_llm_layer/dry_run.py "where is finance" --json
```

Safety rules:

- The LLM receives only a small list of retrieved candidates.
- The final answer is copied from the chosen candidate record.
- If no candidate is good enough, the result is `needs_clarification`.
- Map, suggestions, choice groups, and images remain from JSON.
- The LLM API is used only as a reranker/chooser, not as the source of BukSU facts.

Removal:

Disable `RASA_LLM_RERANKER_ENABLED` or delete `experimental_llm_layer` if you only want the dry-run removed.
