# Day 11 Regression Testing

## Phase 1: Automated Tests

Expanded the automated regression suite in `test/test_context_aware_retrieval.py`.

New coverage added:

- Response builder text deduplication
- Multi-response map payload merging
- Image and custom payload emission
- Structured `mapRef` inheritance
- Legacy `responses.json` `mapData` compatibility
- Hot reload detection for newly added `Supper Saiyan/*.json` files
- Low-confidence retrieval fallback behavior

Bug found and fixed:

- The fallback helper returned the raw bilingual fallback object instead of text.
- This could cause blank fallback messages in the response builder.
- `_get_fallback_response()` now resolves bilingual fallback data to English text by default.

## Phase 2: Manual Test Checklist

Created a manual regression checklist:

- `docs/Day 11 Manual Regression Checklist.md`

The checklist covers:

- short questions
- follow-up questions
- ambiguous questions
- map questions
- image questions
- Cebuano questions
- retrieval paraphrases
- admin-edited questions
- fallback behavior

## Debugging Results

Passed:

- `python -m unittest discover -s test`
- all tracked JSON parse checks
- `python -m py_compile` for action Python files
- `rasa data validate --config rasa/config.yml --domain rasa/domain.yml --data rasa/data`
- `npm.cmd run build`
- direct router smoke probes for ambiguity, follow-up, retrieval, maps/images, and fallback text
- focused TypeScript scan for recent Day 10/Day 11 files

Current automated test count:

- 46 tests

Manual smoke probes confirmed:

- `how to get id?` asks for student ID or library ID clarification.
- `student id` after the clarification returns the student ID process with map data.
- `where can i get library id` followed by `what are the requirements?` stays on library ID.
- `what papers for oral exam` retrieves dental oral examination requirements.
- `admission contact` returns text, map data, and image payloads.
- unknown questions return a nonblank fallback response.

Known project-wide TypeScript issue:

- `npm.cmd run check` still fails because of older unrelated TypeScript errors in `MapPage.tsx`, `server/admin-db.ts`, `server/db.ts`, and `server/storage.ts`.

Notes:

- No Rasa retrain was needed because Day 11 changed tests, docs, and fallback Python behavior only.
