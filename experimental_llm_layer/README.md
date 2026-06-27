# Experimental Guarded LLM Layer

This folder is a dry-run only LLM interpreter. It is not connected to Rasa, Express, or the frontend.

Purpose:

- Read answers from the existing JSON knowledge base.
- Retrieve candidate records from `rasa/actions/Supper Saiyan`, `responses.json`, and `responses_location.json`.
- Optionally ask a local Ollama model to choose the best candidate.
- Return only the selected JSON/database answer. The LLM is not allowed to invent BukSU facts.

Recommended first model for this laptop:

```powershell
ollama run gemma3:1b
```

Dry run without LLM:

```powershell
python experimental_llm_layer/dry_run.py "how to get PE uniform"
```

Dry run with local Ollama:

```powershell
python experimental_llm_layer/dry_run.py "unsaon pag lantaw admission result" --llm --model gemma3:1b
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

Removal:

Delete `experimental_llm_layer`. No Rasa files depend on it.

