# Day 4 Courses and Departments Restructure

## Scope

Day 4 completed the Courses + Departments restructuring and routing check.

Files updated:

- `rasa/actions/Supper Saiyan/Courses_info.json`
- `rasa/actions/Supper Saiyan/Department_info.json`
- `rasa/actions/knowledge_router.py`
- `rasa/actions/context_manager.py`
- `rasa/actions/main_router.py`
- `rasa/data/nlu.yml`
- `test/test_context_aware_retrieval.py`

## Phase 1: Courses + Departments

`Courses_info.json` was tightened from broad category groups into program-level structured subjects.

Examples:

- `bsit`
- `bsft`
- `bset`
- `bsemc_dat`
- `bs_bio`
- `bsn`
- `bsa`
- `mpa`

Each program group now has its own:

- `subject_key`
- `subject_type: program`
- `subject_terms`
- related subtopics such as overview and availability when both exist

Shared course concepts remain grouped separately:

- `course_catalog`
- `general_curriculum_subjects`
- `course_shifting_and_training`

`Department_info.json` was restructured into college-level subjects:

- `academic_colleges`
- `college_cas`
- `college_cob`
- `college_cot`
- `college_con`
- `college_coe`
- `college_law`
- `college_coa_cpag`

## Phase 2: Department/College Routing

Router updates:

- Uppercase `IT` can now safely route to BSIT availability without treating normal lowercase `it` as a program.
- College course routing now ignores `ask_location`, so location questions are not hijacked by college/course answers.
- Explicit location requests with no location-map data now return a location-specific fallback instead of drifting to unrelated knowledge.
- Location memory was kept specific so service questions like `library hours` still remember the service, while actual location responses remember locations.
- `LAW` is included in the college acronym trigger set so `courses in LAW` routes to the law course record instead of falling through to fuzzy fallback.

Alias updates:

- Added bare location aliases for `CAS`, `COT`, `COB`, `CON`, `CPAG`, and `LAW` only where real location records exist.
- Did not add a bare `COA` location alias because the available location data is only an SBO no-data entry, not a reliable college building location.

Output cleanup:

- Cleaned the CON course answer to remove casual wording and emoji.

## NLU Updates

Added focused Day 4 examples for broad intents only:

- `does BukSU have IT`
- `what courses are offered`
- `what courses in CAS`
- `courses in COT`
- `what is board course`
- `what is non board course`
- `what is prerequisite`
- `can i shift course`

No topic-specific Rasa intents were added.

## Tested Questions

Router probes passed:

- `do buksu has masters`
- `what courses are offered`
- `does buksu have IT`
- `what courses in CAS`
- `courses in COB`
- `courses in COT`
- `courses in CON`
- `courses in COE`
- `courses in CPAG`
- `courses in COA`
- `courses in LAW`
- `what is board course`
- `can i shift course`
- `what is prerequisite`
- `where is CAS`
- `where is COT`
- `where is COB`
- `where is CON`
- `where is CPAG`
- `where is LAW`
- `courses in COT`
- `courses in CON`
- `where is CAS`

NLU model sanity passed:

- `do buksu has masters` -> `ask_availability`
- `what courses are offered` -> `ask_availability`
- `does buksu have IT` -> `ask_availability`
- `what courses in CAS` -> `ask_availability`
- `what is board course` -> `ask_general_info`
- `can i shift course` -> `ask_process`
- `what is prerequisite` -> `ask_general_info`

## Validation

Passed:

- `python -m unittest discover -s test -p "test_*.py"` with 35 tests.
- Python compile check.
- JSON parse check for 16 JSON files.
- `rasa data validate --config config.yml --domain domain.yml --data data`.
- `rasa train --config config.yml --domain domain.yml --data data`.
- Duplicate check found 81 structured course/department intents and 0 remaining duplicates in `responses.json`.

New trained model:

- `rasa/models/20260606-140052-brownian-ball.tar.gz`
