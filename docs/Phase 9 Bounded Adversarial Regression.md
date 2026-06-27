# Phase 9 Bounded Adversarial Regression

## Scope

Files covered in this phase:

- All JSON files under `rasa/actions/Supper Saiyan`
- `rasa/actions/responses.json`
- `rasa/actions/knowledge_router.py`

Goal: run a bounded but high-risk adversarial regression set after Phase 8. This phase avoids an expensive brute-force all-record scan and instead targets the question patterns most likely to cause wrong answers in production.

## Execution Prompt

For each round, generate at least 10-20 highly distinct test queries per risk group, then loop back until the possible user question patterns route to the right answer.

Round 1: Linguistic Variations and Synonyms

- Creator questions:
  - `who create you`
  - `who created you`
  - `who made you`
  - `kinsa naghimo nimo`
- Classroom policy variants:
  - eating in class
  - phone/cellphone use
  - Bisaya food wording
- TOR vs dormitory:
  - `what is tor`
  - `dormitory availability`
  - `female dorm`
  - `male dorm`

Round 2: Local and Structural Context

- Course and program variants:
  - `unsay course na available diris buksu`
  - `do buksu offer IT`
  - `do buksu offer BA philo`
  - `how about bset`
- Course slots:
  - `slot left for bsit`
  - `pilay bakanti sa nursing`
  - `slot left for law course`
- CAT score patterns:
  - `CAT requirement for IT`
  - `cut off score for bset`
  - `buksu percentage examination`

Round 3: Edge Cases and Ambiguity

- Enrollment help vs late enrollment.
- Generic validation vs ID validation vs COR validation.
- Generic ID vs student ID vs library ID.
- Civilian attire vs location fallback.
- Section change and course shifting.
- Admission account vs institutional email account.
- Generic passing grade vs specific-course retention grade.

## Fixes Applied

- Generic validation questions now return validation choices instead of guessing ID validation:
  - `how validate`
  - `validation process`
- Generic ID questions now return ID choices instead of guessing student ID:
  - `how to get id`
- Actual ID validation still routes correctly:
  - `how to validate id`
  - `when is id validation`
- Admission account help now routes to account clarification instead of BukSU CAT definition.
- `what is TOR` now routes to TOR guidance instead of falling into COR-related retrieval.
- Classroom food routing remains token-safe from Phase 8, so `create` no longer triggers eating policy.

## Test Status

Passed final command-line loop tests.

- Bounded adversarial routing: 56 checked cases, 0 failures.
- JSON validation passed for every file in `rasa/actions/Supper Saiyan`.
- JSON validation passed for `rasa/actions/responses.json`.
- Python compile passed for:
  - `rasa/actions/knowledge_router.py`
  - `rasa/actions/retrieval_scorer.py`
  - `rasa/actions/retrieval_index.py`
  - `rasa/actions/data_loader.py`
  - `rasa/actions/query_interpreter.py`

