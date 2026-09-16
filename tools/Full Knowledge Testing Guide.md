# Full Knowledge Question Bank Tester

Run commands from the **project root**, not inside `rasa/`.

This tester reads the two files in `docs/Testing/FULL TESTING TOPICS/`. It does not generate new questions, change phrases, train Rasa, or modify routing/scoring/knowledge files.

## Start Small

Validate the bank without starting the router or making requests:

```powershell
python tools/full_knowledge_test.py --list-only
```

Run a small, repeatable sample:

```powershell
python tools/full_knowledge_test.py --max-tests 12 --shuffle
```

The default mode calls the local Python router with LLM assistance **off for that tester process only**. It needs the Python environment containing your existing Rasa/action dependencies. You do not need to start the Rasa server, action server, frontend, or Ollama for this mode.

It sends a generic `ask_knowledge` intent, the question text, and no entities. This measures local router behavior, not the trained Rasa model's initial intent recognition. Existing diagnostic messages mentioning "RASA NLU" may actually refer to the local retrieval scorer; they are preserved as traces rather than interpreted as proof that the Rasa server ran.

Questions and returned responses print to the console. A `Starting ...` line appears before each local query. A timeout is recorded as an error; the isolated worker is stopped and recreated for the next query. The default query timeout is 30 seconds, excluding startup. This bounds a slow test without changing the router.

## Coverage Options

```powershell
# One English and one Bisaya question per section: 988 cases.
python tools/full_knowledge_test.py --suite quick

# Every topic question: 9,880 cases.
python tools/full_knowledge_test.py --suite full

# Open chat AND the category-selected scenario: 1,976 quick cases.
python tools/full_knowledge_test.py --suite quick --context both

# One file, all its English and Bisaya questions.
python tools/full_knowledge_test.py --suite full --only admission_procedures

# A single section, all its Bisaya questions.
python tools/full_knowledge_test.py --suite full --only K301 --language ceb

# All 200 missing-detail questions.
python tools/full_knowledge_test.py --bank gaps --suite full

# All 10,080 questions, including gaps; validation only.
python tools/full_knowledge_test.py --bank both --suite full --list-only
```

`--only` matches category, source filename, section ID, title, or expected intent. Quote filters containing spaces. `--max-tests` limits individual queries AFTER context expansion. `--shuffle` uses a repeatable seed (default 7); change it with `--seed`.

Each query starts with empty conversation slots. Category mode supplies only the category a user could select in the UI. It does not supply the expected topic or answer. Compare category and open results separately: selecting the expected category makes the task easier and does not test whether the bot identifies the right category itself.

The worker retains existing router caches between queries within an invocation. Latency therefore includes normal cold/warm differences. A resumed invocation initializes a fresh worker. This bank does not test multi-turn context or context leakage; use separate conversation tests for those behaviors.

## Actual Chat API

Start your normal application, Rasa server, and action server first. Then:

```powershell
python tools/full_knowledge_test.py --mode api --max-tests 12 --shuffle --concurrency 2
```

Use `--url http://127.0.0.1:YOUR_PORT/api/chat` if your application uses another port. This is the **Express `/api/chat` endpoint**, not the Rasa webhook URL.

Each question uses its own `fullqa_...` session ID. Requests contain the query and, in category mode, `activeCategory`. They never contain expected topics, expected answers, or a forced test language. API runs create test conversations in the application's normal logs/storage.

This mode exercises the real backend and Rasa path. It does not render the browser, so maps, images, and buttons are recorded but their visual layout/click behavior still needs a UI check. The current API does not expose a trustworthy selected-topic ID; the tester leaves that field blank and uses exact answer matching where possible. It never treats a suggested button target or an echoed question as the selected topic.

The API uses the running server's own LLM configuration. `--llm off` cannot disable an LLM in another process. To compare API runs with and without the LLM, use the normal server configuration/restart procedure and record that change yourself. API manifests hash local files, not the configuration or deployed files of a remote server.

Optional local comparison, after the non-LLM baseline:

```powershell
python tools/full_knowledge_test.py --llm on --max-tests 12 --shuffle
```

This enables the existing reranker only in the test worker and may consume API quota. It does not edit `.env` or enable the live chatbot's LLM.

## Reports and Resume

Each run creates `reports/full-knowledge-tests/<timestamp-id>/` containing:

- `manifest.json`: configuration, question IDs, input digest, and runtime/source file hashes.
- `results.jsonl`: one immediately saved result per query, full answer/payload, expected answers, and local trace when available.
- `results.csv`: all queries and answers for filtering in a spreadsheet.
- `report.md`: totals, category/language/context breakdown, timing and the first 30 flagged results.
- `flagged_ids.json`: IDs of review/error cases.

Full map payloads and traces remain on disk rather than accumulating in the tester's in-memory summary. This is not a load/RAM benchmark; use the Gorilla tool for network stress tests separately.

Press Ctrl+C to stop. Completed cases are retained and a summary is written. API requests already in flight may finish or reach their timeout before shutdown. Resume with the **same options** plus the run folder:

```powershell
python tools/full_knowledge_test.py --max-tests 12 --shuffle --resume "reports/full-knowledge-tests/YOUR_RUN_FOLDER"
```

Resume refuses changed questions, tester code, runtime/source hashes, or run options so different baselines are not silently mixed. It repairs an incomplete last journal line left by interruption while preserving completed raw payloads.

After an intentional chatbot update, start a NEW report for previously flagged IDs:

```powershell
python tools/full_knowledge_test.py --rerun-flagged "reports/full-knowledge-tests/YOUR_RUN_FOLDER"
```

For an earlier category/both-context run, also supply the matching `--context` option. For gaps, supply `--bank gaps`; for combined runs, `--bank both`. Filters still apply. Reruns select the earlier exact IDs even when they were question variants beyond `01`.

You can run flagged local cases through the real API:

```powershell
python tools/full_knowledge_test.py --mode api --rerun-flagged "reports/full-knowledge-tests/YOUR_RUN_FOLDER" --concurrency 2
```

## Interpreting Results

| Status | Meaning |
| --- | --- |
| ANSWER_MATCH | Full normalized answer text equals the source English or Bisaya answer. Equivalent duplicate IDs can match this way. This does not certify policy truth. |
| ROUTE_MATCH | Selected topic ID matches. Check completeness, contradictions, language, and attachments manually. |
| TOPIC_MISMATCH_REVIEW | Different ID selected. Could be an actual wrong route or an equivalent record; review before fixing. |
| ANSWER_REVIEW | No reliable topic or exact text match. A paraphrase may still be correct. |
| CLARIFICATION_REVIEW | Clarification detected. Check whether ambiguity justified it. A correct suggestion is not counted as a full answer. |
| FALLBACK_REVIEW | Fallback detected, or an intentionally ambiguous/noise test needs review. |
| LANGUAGE_MISMATCH | Exact English answer returned for a Bisaya query when the source provides a different Bisaya answer. Other language issues require manual review. |
| CHILD_ROW_REVIEW | Verify the requested slot row/group, numeric zero versus unknown data, and exclusion of unrelated colleges. Matching the parent ID is insufficient. |
| GAP_REVIEW | Review whether the bot acknowledged the missing detail without inventing a fact. |
| EMPTY_RESPONSE / ERROR | No usable answer, transport error, worker failure, or timeout. These are not proof of an intent-training problem. |

The report deliberately does not label an automatic score as total chatbot accuracy. Human review is necessary for conflicting source policies, partial answers, legitimate referrals, dynamically filtered lists, and semantically equivalent wording. Exact matching normalizes HTML, punctuation and whitespace; it is an aid to review, not a semantic evaluator.

The question bank is a snapshot. If a source pointer or topic has changed, update the test references deliberately. Newly added knowledge records require new questions; they are not automatically generated by this tool.

## Tester Verification and Initial Findings

```powershell
python -B -m unittest discover -s tools -p test_full_knowledge_test.py
```

The tester tests cover bank counts, balanced quick selection, filters, source-pointer drift, preventing expected-answer hints, conservative grading, fake HTTP transport, unique sessions, journal recovery, and resume isolation. They do not modify production routing or assert that every existing chatbot answer is correct.

Initial read-only checks on 2026-09-13 found:

- The first classroom-phone question exceeded a 20-second test timeout. A separate diagnostic run finished in about 37 seconds with a fallback. The sampled stack was in `_fuzzy_concept` / phrase scoring. This is a current router performance finding, not a change made by the tester.
- K301-EN-01 (forgotten admissions password) selected `Change_Pass_admission`, whose response requires signing in. The expected record is `change_portal_password_buksu`, which describes the Forgot Password path. The tester flagged it for review.
- Runtime/source hashes were unchanged during those local baseline runs.

Start with a small sample to judge throughput before launching all 9,880 topic queries. Slow queries may make a full run long; resume and file filters let you work through it without changing the baseline.
