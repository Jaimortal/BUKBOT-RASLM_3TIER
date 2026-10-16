# Final Overlap Regression Phase

## Scope

This is the final regression pass after Phase 9.

Covered overlap groups:

- ID
- validation
- services
- courses
- offices and buildings
- schedule
- Bisaya and mixed Bislish queries

Files involved:

- `rasa/actions/knowledge_router.py`
- all JSON files under `rasa/actions/Supper Saiyan`
- `rasa/actions/responses.json`
- `rasa/actions/responses_location.json`

## Regression Focus

The test set intentionally used risky phrases that can overlap across domains:

- `how to get id`
- `id requirements`
- `how validate`
- `validation process`
- `services`
- `courses offered by buksu`
- `offices inside COT building`
- `offices under COB building`
- `cpag building`
- `enrollment schedule`
- `late enrollment schedule`
- `unsaon nako pagkuha akong cor`
- `unsay course na available diris buksu`
- `pwede ba civilian sulod buksu`

## Fixes Applied

- Added a building-directory guard in `knowledge_router.py` so office-list questions are not stolen by course routes:
  - `offices inside COT building`
  - `offices under COB building`
  - `what offices can be found in administrative building`
- Added a conservative office/building location guard so location-like questions can fall through to the location layer instead of routing to unrelated knowledge records.
- Fixed `CPAG` overlap by making `cp` cellphone detection token-based only. This prevents `cpag building` from triggering classroom phone policy.

## Test Status

Passed final command-line regression.

- Final overlap regression: 72 checked cases, 0 failures.
- JSON validation passed for:
  - every file in `rasa/actions/Supper Saiyan`
  - `rasa/actions/responses.json`
  - `rasa/actions/responses_location.json`
- Python compile passed for:
  - `rasa/actions/knowledge_router.py`
  - `rasa/actions/retrieval_scorer.py`
  - `rasa/actions/retrieval_index.py`
  - `rasa/actions/data_loader.py`
  - `rasa/actions/query_interpreter.py`
  - `rasa/actions/main_router.py`

