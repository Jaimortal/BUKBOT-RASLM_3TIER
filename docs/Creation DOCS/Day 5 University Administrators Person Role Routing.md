# Day 5: University, Administrators, and Person/Role Routing

## Scope

Day 5 focused on the records and retrieval behavior for:

- University profile and identity records
- University history and presidents
- Current university president
- University administrators and vice presidents
- College deans
- Department heads and program heads

The goal was accuracy and safer recognition for questions like:

- who is the president
- list of BukSU presidents
- what is BukSU mission
- what is BukSU vision
- who is the dean of COT
- who is the head of BSIT
- whos dean bachelor of arts in philosophy

## Phase 1: Data Review and Admin Label Cleanup

Reviewed these structured JSON files:

- `rasa/actions/Supper Saiyan/University_info.json`
- `rasa/actions/Supper Saiyan/Administrators.json`
- `rasa/actions/Supper Saiyan/Departamentals_facultystaff.json`

The files were already using the newer structured topic/subtopic format, so no large migration was needed.

Only admin-facing `display_name` values were cleaned. Critical keys were not renamed:

- `intent`
- `topic`
- `subject_key`
- `context_topic`

This keeps routing stable while making the Knowledge Manager easier for admins to read.

## Phase 2: Person/Role Retrieval Fix

Updated `rasa/actions/knowledge_router.py` so president-history questions are protected from the generic current-president route.

Before the fix:

- `list of buksu presidents` could route to `buksu_president`

After the fix:

- `who is the president` routes to `buksu_president`
- `list of buksu presidents` routes to `buksu_presidents_list`
- `buksu presidents` routes to `buksu_presidents_list`
- `past presidents of buksu` routes to `buksu_presidents_list`

Dean/head routing was verified:

- `whos dean of bsit` routes to `Dean_0f_COT`
- `who is the head of BSIT` routes to `Head_of_BSIT`
- `whos dean bachelor of arts in philosophy` routes to `Dean_0f_CAS`
- `whos head bachelor of arts in philosophy` routes to `Head_of_CAS`

## Validation

Completed:

- Python compile check for `knowledge_router.py`
- JSON parse check for all touched JSON files
- Direct router smoke tests for president, mission, vision, dean, head, and administrator questions

No Rasa NLU/domain/rules files were changed, so `rasa train` is not required for this Day 5 update.
