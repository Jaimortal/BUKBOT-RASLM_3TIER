# Retrieval QA Harness Guide

This tool tests chatbot routing accuracy without opening the browser and without starting `npm run dev`.

It reads the chatbot knowledge data, generates messy student-style query variants from existing phrases, sends them through the local Python router, and reports whether the selected intent matched the expected intent.

## What It Tests

- Query normalization
- Structured retrieval routing
- Legacy `responses.json` routing, when enabled
- Bisaya/English phrase variants already stored in the data
- Typo and short/direct query patterns
- Wrong-answer and fallback cases

It does not test UI layout, browser memory, map rendering, or Rasa model confidence.

## Basic Smoke Test

```bash
python tools/retrieval_qa_harness.py --max-records 20 --max-tests 100 --intent-mode auto --progress-every 25
```

This tests a small slice of structured data.

## Stronger Test

```bash
python tools/retrieval_qa_harness.py --max-tests 300 --shuffle --intent-mode auto --progress-every 50
```

This uses guessed broad intents like `ask_process`, `ask_location`, and `ask_requirement`.
Start with 100 to 300 tests first. Use 1000 only when the smaller run is already stable.

## Diagnostic Mode

```bash
python tools/retrieval_qa_harness.py --max-tests 200 --shuffle --intent-mode all --progress-every 25
```

This tries every broad intent and passes if any one route reaches the expected record.

Use this when you want to know whether the retrieval layer can find the right answer even if Rasa NLU predicts the wrong broad intent.

## Include Legacy `responses.json`

```bash
python tools/retrieval_qa_harness.py --include-legacy --max-tests 300 --shuffle --progress-every 50
```

Use this when testing older data that still lives in `responses.json`.

## Focus One Area

Examples:

```bash
python tools/retrieval_qa_harness.py --only admissions --include-legacy --max-tests 500
python tools/retrieval_qa_harness.py --only password --include-legacy --intent-mode all
python tools/retrieval_qa_harness.py --only courses --max-tests 500 --shuffle
python tools/retrieval_qa_harness.py --only location --include-legacy --max-tests 500
```

`--only` searches intent names, display names, source names, and subcategories.

## Useful Options

- `--max-records 50`
  Limits how many knowledge records are used.

- `--max-phrases-per-record 4`
  Controls how many seed phrases are taken from each record.

- `--variants-per-phrase 6`
  Controls how many messy query variants are generated from each phrase.

- `--max-tests 1000`
  Limits total generated tests.

- `--progress-every 50`
  Prints progress while the test is running.

- `--debug-each`
  Prints each generated query, expected record, and pass/fail result. Use this only for small runs.

- `--shuffle`
  Randomizes test order.

- `--intent-mode auto`
  Uses one guessed broad intent per question. Closer to normal chatbot behavior.

- `--intent-mode all`
  Tries all broad intents. Better for diagnosing retrieval ability.

- `--show-failures 30`
  Prints failure samples in the terminal.

## Reports

Reports are written to:

```txt
reports/retrieval-qa/
```

Each run creates:

- CSV report for filtering/searching
- Markdown report for quick reading

The Markdown report shows:

- total tests
- pass/fail count
- pass rate
- top failing expected intents
- failure samples with expected vs actual intent

## How To Use The Failures

The generator is designed to create messy-but-plausible student questions, not nonsense language mixing.
For example, `how much library id?`, `pila library id?`, and `asa ang library?` are useful tests.
Generated questions like `asa how much is library id` are not realistic enough to treat as chatbot bugs.
If you see that kind of pattern, tune the harness generator instead of adding phrases to the knowledge base.

For each failure, decide the proper fix:

- Missing phrase: add a phrase to the correct JSON record.
- Typo or language issue: add a normalization rule.
- Wrong record wins: add protected routing logic or reduce broad keywords.
- Ambiguous question: add a clarification button instead of forcing an answer.
- Rasa broad intent problem: add NLU examples or use a direct router guard.

Do not blindly add every generated phrase. Fix only the pattern that explains the failure.

## Recommended Workflow

1. Run a focused test.
2. Open the Markdown report.
3. Fix the highest-frequency failing intent first.
4. Rerun the same command.
5. Confirm failures decrease and old passes do not break.

Example:

```bash
python tools/retrieval_qa_harness.py --only password --include-legacy --intent-mode auto --max-tests 300
```

Then fix the password-related failures and rerun the exact same command.
