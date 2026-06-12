# Dormitory and University Info Restructure

## Scope

This update migrated the remaining legacy wrapper-style knowledge files into the structured retrieval format used by the newer architecture:

- `rasa/actions/Supper Saiyan/Dormitory_info.json`
- `rasa/actions/Supper Saiyan/University_info.json`

The outer file wrapper was preserved for loader/admin compatibility, while the old flat `topics` list was replaced with grouped subjects that contain `subject_key`, `subject_type`, `subject_terms`, and `subtopics`.

## Dormitory Groups

`Dormitory_info.json` now has one structured subject:

- `campus_dormitories`

Its subtopics cover:

- general dormitory information
- number of dormitories
- dormitory pros and cons
- dormitory slots and availability
- male dorm / Mahogany dorm
- female dorm / Rubia dorm

## University Groups

`University_info.json` now has these structured subjects:

- `university_profile`
- `university_identity`
- `university_history`
- `university_ranking`
- `university_leadership`

These groups cover university background, mission, vision, core values, seal, hymn, gazette, history, founding, rankings, president, and related general BukSU questions.

## Router Updates

`rasa/actions/knowledge_router.py` now includes direct routes for common dormitory and university prompts. This prevents these topics from depending only on fuzzy scoring.

Important routing safeguards were added:

- University keywords such as `mission` and `vision` use token-aware matching so `admission` does not accidentally match `mission`.
- Generic `buksu` mentions do not automatically override unrelated intents like office hours.
- Dormitory questions route by subject and purpose, such as count, availability, male dorm, and female dorm.

## Legacy Cleanup

The following duplicate legacy records were removed from `rasa/actions/responses.json` because they now live in the structured files:

- `about_buksu`
- `buksu_core_values`
- `buksu_dormitory_information`
- `buksu_history_background`
- `buksu_hymn_lyrics`
- `buksu_mission`
- `buksu_president`
- `buksu_presidents_list`
- `buksu_seal_significance`
- `buksu_vision`
- `campus_dormitories`
- `dormitory_pros_cons`
- `number_of_dormitories`

## Validation

Completed checks:

- JSON parse check passed.
- Python compile check passed.
- `python -m unittest discover -s test -p "test_*.py"` passed with 34 tests.
- `rasa data validate --config config.yml --domain domain.yml --data data` passed.
- Structured duplicate check found 26 structured dormitory/university intents and 0 remaining duplicates in `responses.json`.
