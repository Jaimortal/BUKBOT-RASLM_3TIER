# Full Knowledge Tester Run Instructions

Run these commands from the project root folder:

```powershell
C:\School Related File\3rd year\Capstone dev\Chatbot\CHATBOT V5 merged versions\Capstone_Project_Artificial_Intelligence_Chatbot>
```

Do not `cd rasa` before running this tester.

This tester reads the question banks in this folder and checks the current chatbot behavior. It does not edit knowledge data, Rasa files, routing logic, scoring logic, or phrases.

## 1. Validate The Question Bank Only

Use this first to confirm the files can be read. This does not call the chatbot.

```powershell
python tools/full_knowledge_test.py --list-only
```

To validate both topic questions and possible first-year FAQ gap questions:

```powershell
python tools/full_knowledge_test.py --bank both --suite full --list-only
```

## 2. Safe First Test

Start with a small test so you can confirm the tester is working.

```powershell
python tools/full_knowledge_test.py --max-tests 12 --shuffle
```

This uses local router mode by default. You do not need to start the frontend, Rasa server, action server, Ollama, Groq, or Gemini for this basic run.

## 3. Quick Baseline Test

This tests one English and one Bisaya question per covered section.

```powershell
python tools/full_knowledge_test.py --suite quick
```

Use this when you want a broad but not full test.

## 4. Full Topic Test

This tests all topic-bank questions.

```powershell
python tools/full_knowledge_test.py --suite full
```

This can take a long time if some router queries are slow.

## 5. Test Only One File Or Topic

Use `--only` when you want to focus on one file, category, section ID, title, or expected intent.

Examples:

```powershell
python tools/full_knowledge_test.py --suite full --only admission_procedures
```

```powershell
python tools/full_knowledge_test.py --suite full --only K301 --language ceb
```

```powershell
python tools/full_knowledge_test.py --suite quick --only enrollment
```

If the filter contains spaces, wrap it in quotes:

```powershell
python tools/full_knowledge_test.py --suite full --only "student service"
```

## 6. Test The FAQ Gap Bank

Use this for possible first-year questions that may not exist in the current knowledge data yet.

```powershell
python tools/full_knowledge_test.py --bank gaps --suite full
```

These results usually need manual review because some questions are intentionally outside the current dataset.

## 7. Test Open Chat And Category-Selected Mode

Open mode means the bot must find the answer without category help. Category mode means the tester supplies the expected high-level category, similar to a user already choosing a category.

```powershell
python tools/full_knowledge_test.py --suite quick --context both
```

Use this to compare whether a topic works only when the category is already known.

## 8. Test Through The Actual Chat API

Use API mode only when your normal app servers are already running.

Start these first, depending on your setup:

- frontend / Express server
- Rasa server
- Rasa action server

Then run:

```powershell
python tools/full_knowledge_test.py --mode api --max-tests 12 --shuffle --concurrency 2
```

If your app uses a different URL:

```powershell
python tools/full_knowledge_test.py --mode api --url http://127.0.0.1:YOUR_PORT/api/chat --max-tests 12 --shuffle --concurrency 2
```

Keep `--concurrency` low first. Higher values can slow your laptop and make normal chat replies lag.

## 9. Optional LLM Comparison

The default local tester keeps LLM reranking off.

To compare with the local tester LLM path enabled:

```powershell
python tools/full_knowledge_test.py --llm on --max-tests 12 --shuffle
```

Use this carefully because it may consume Groq or Gemini quota if your LLM layer is configured to use API providers.

For API mode, `--llm off` or `--llm on` cannot control an already running server. API mode uses whatever LLM setting your running backend currently has.

## 10. Resume An Interrupted Run

If you stop a run with Ctrl+C, completed cases are saved. Resume using the same options plus the run folder.

Example:

```powershell
python tools/full_knowledge_test.py --suite quick --resume "reports/full-knowledge-tests/YOUR_RUN_FOLDER"
```

The tester will refuse resume if the question bank, source data, tester code, or options changed. This protects the baseline from being mixed.

## 11. Rerun Only Flagged Cases

After reviewing or fixing chatbot data later, rerun only the flagged cases from an earlier report.

```powershell
python tools/full_knowledge_test.py --rerun-flagged "reports/full-knowledge-tests/YOUR_RUN_FOLDER"
```

For gap runs:

```powershell
python tools/full_knowledge_test.py --bank gaps --rerun-flagged "reports/full-knowledge-tests/YOUR_RUN_FOLDER"
```

For earlier category or both-context runs, use the same context option:

```powershell
python tools/full_knowledge_test.py --context both --rerun-flagged "reports/full-knowledge-tests/YOUR_RUN_FOLDER"
```

## 12. Where To Find Results

Each run creates a folder here:

```text
reports/full-knowledge-tests/
```

Important files:

- `report.md`: summary, status counts, timing, and first flagged examples.
- `results.csv`: spreadsheet-friendly result list.
- `results.jsonl`: detailed per-question result records.
- `flagged_ids.json`: IDs to rerun later.
- `manifest.json`: run settings and file hashes.

## 13. How To Read Statuses

- `ANSWER_MATCH`: returned answer matches the expected source answer.
- `ROUTE_MATCH`: selected topic matched, but answer still needs review.
- `TOPIC_MISMATCH_REVIEW`: likely wrong route or duplicate/equivalent data.
- `ANSWER_REVIEW`: answer needs manual checking.
- `CLARIFICATION_REVIEW`: bot asked a clarification question.
- `FALLBACK_REVIEW`: bot did not confidently answer.
- `LANGUAGE_MISMATCH`: Bisaya query received exact English answer while a Bisaya answer exists.
- `CHILD_ROW_REVIEW`: course-slot child-row answer needs manual checking.
- `GAP_REVIEW`: possible missing-data question needs manual checking.
- `EMPTY_RESPONSE` or `ERROR`: request failed, timed out, or returned no usable answer.

## 14. Recommended Testing Flow

1. Run `--list-only`.
2. Run `--max-tests 12 --shuffle`.
3. Run `--suite quick`.
4. Review `report.md`.
5. Fix only the confirmed data/routing issues.
6. Rerun flagged cases.
7. Run `--suite full` only when the quick baseline is already stable.

For more detailed tester behavior, see:

```text
tools/Full Knowledge Testing Guide.md
```
