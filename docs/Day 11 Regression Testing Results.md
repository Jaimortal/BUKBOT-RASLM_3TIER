# Day 11 Regression Testing Results

## Implemented

- Added `test/test_day11_regression.py`.
- Added `docs/Day 11 Full Regression Testing Checklist.md`.
- Added regression coverage for:
  - context memory follow-up routing
  - clarification choices
  - safe fallback/clarification behavior
  - map payload compatibility
  - image payload flattening
  - old/new map format compatibility
  - admin JSON backup hook coverage
  - invalid JSON hot reload guard

## Fixes From Regression Run

- Student ID fee questions in Bisaya now keep `ask_fee` priority over the broader student ID process route.
- BSN availability questions now route to the BSN course offer answer instead of nursing medical enrollment requirements.
- Dean/head questions are protected from course-info overrides.
- Query dataset expectations were updated for current intended behavior:
  - Cebuano course menu choices can use Cebuano labels.
  - `where get certificate of registration` routes to the newer COR download/get record.

## Commands Run

Passed:

- `python -m unittest discover -s test -p test_day11_regression.py`
- `python -m unittest discover -s test -p test_query_normalization_dataset.py`
- `python -c "import py_compile, pathlib; [py_compile.compile(str(p), doraise=True) for p in pathlib.Path('rasa/actions').glob('*.py')]"`
- JSON parse check for `responses.json`, `responses_location.json`, and all `Supper Saiyan/*.json`
- `rasa data validate --config rasa/config.yml --domain rasa/domain.yml --data rasa/data`

Full discovery note:

- `python -m unittest discover -s test` still has older expectation failures in `test_context_aware_retrieval.py`.
- Several failures are wording/data drift from newer enrollment and Cebuano response behavior.
- The remaining failures should be reviewed as a separate cleanup pass before final acceptance so tests protect the newest behavior instead of older response text.
