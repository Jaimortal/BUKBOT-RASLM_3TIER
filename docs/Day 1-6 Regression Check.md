# Day 1-6 Regression Check

## Date

June 6, 2026

## Scope

This check validates the work completed from Day 1 through Day 6:

- Simplified Rasa NLU routing
- Structured retrieval files
- Context-aware follow-up memory
- Map payload compatibility
- Library and OSS records
- Admissions and enrollment
- Academic policy
- Courses and departments
- University, administrators, faculty/staff
- Clinic, ICT, dormitory, and classroom policy

## Issue Found and Fixed

### Graduation Application Routing

Problem:

`tell me how could i apply for graduation application` was routing to `take_exam` because the router treated the word `application` as admission-related before checking graduation.

Fix:

`knowledge_router.py` now checks graduation-specific terms before the broad admission application branch.

Verified route:

- `tell me how could i apply for graduation application` -> `graduation_application_process`

Regression test added:

- `test_graduation_application_does_not_route_to_admission_application`

### Legacy Duplicate Cleanup

Problem:

The full structured-vs-legacy duplicate check found 25 old records still present in `responses.json`.

Fix:

Removed the 25 legacy duplicates from `responses.json` because those intents are now served by structured Supper Saiyan data.

Result:

- Structured intents checked: 243
- Remaining duplicates: 0

## Validation Commands

```powershell
python -m unittest discover -s test -p "test_*.py"
python -m py_compile rasa/actions/actions.py rasa/actions/main_router.py rasa/actions/query_interpreter.py rasa/actions/entity_resolver.py rasa/actions/knowledge_router.py rasa/actions/response_builder.py rasa/actions/data_loader.py rasa/actions/context_manager.py
rasa data validate --config config.yml --domain domain.yml --data data
```

Additional checks:

- Parsed all JSON files in `rasa/actions/Supper Saiyan`
- Checked structured intents against legacy `responses.json`
- Ran broad manual router probes across Day 1 to Day 6 topics
- Ran latest trained model NLU sanity checks

## Results

- Unit tests: 37 passed
- JSON parse: 14 files passed
- Python compile: passed
- Rasa data validation: passed
- Structured duplicate check: 0 remaining duplicates
- Latest model NLU sanity check: passed

Latest trained model used for NLU sanity:

`rasa/models/20260606-182211-chilly-matrix.tar.gz`

## Verified Router Examples

- `where can i get library id` -> `library_id_card_location`
- `how to get student id` -> `student_id_process`
- `requirements for CAT` -> `exam_requirements`
- `online enrollment steps` -> `online_enrollment_steps`
- `tell me how could i apply for graduation application` -> `graduation_application_process`
- `does buksu have IT` -> `buksu_bsit_program`
- `courses in CAS` -> `course_offer_CAS`
- `who is the president of buksu` -> `buksu_president`
- `who is the dean of COT` -> `Dean_0f_COT`
- `how to get wifi access` -> `get_wifi_access`
- `where is the clinic` -> `buksu_med_loc`
- `dental consultation requirements` -> `requirement_for_dental_consultation`
- `does buksu have dormitory` -> `campus_dormitories`
- `can i use phone in class` -> `phone_use_in_class`
- `can i eat in classroom` -> `eating_in_classroom`

## Notes

No retraining was required after this regression fix because the changes were in router logic and JSON cleanup only. The latest trained model still classified the tested Day 1 to Day 6 sample questions into the expected broad intents.
