# Day 6 - Clinic, ICT, Dormitory, Classroom Policy

## Scope

Day 6 completed the next structured data batch for:

- Clinic services
- Dental consultation and oral examination
- ICT services and WiFi access
- Dormitory information
- Classroom policy items

The Day 6 plan only listed one implementation phase, so Phase 2 was treated as retrieval tightening, follow-up support, and full validation for the same batch.

## Files Updated

- `rasa/actions/Supper Saiyan/Clinic_info.json`
- `rasa/actions/Supper Saiyan/Ict_info.json`
- `rasa/actions/Supper Saiyan/Dormitory_info.json`
- `rasa/actions/Supper Saiyan/Classroom_policy.json`
- `rasa/actions/data_loader.py`
- `rasa/actions/context_manager.py`
- `rasa/data/nlu.yml`
- `test/test_context_aware_retrieval.py`

## Phase 1 Changes

### Clinic and Dental

Clinic records now have structured subject metadata for:

- `university_clinic`
- `dental_consultation`
- `dental_oral_examination`

Dental consultation process and requirements now share the same subject key, so follow-up questions like `what are the requirements?` can continue from `how to request dental consultation`.

### ICT

ICT records now have structured subject metadata for:

- `ict_services`
- `campus_wifi_access`

WiFi access still keeps its existing map payload, so the frontend can display map guidance.

### Dormitory

Dormitory records now have structured subject metadata for:

- `campus_dormitories`
- `male_dormitory`
- `female_dormitory`

The male and female dormitory responses were cleaned to remove casual opinion text and keep the tone official.

### Classroom Policy

Classroom records now have structured subject metadata for:

- `classroom_phone_policy`
- `classroom_food_policy`
- `class_concerns`
- `online_assignment_submission`

## Phase 2 Changes

### Semantic Route Index Fix

`data_loader.py` now builds follow-up routes from `context_topic` before falling back to the raw subtopic name.

This is important because records such as `request_dental_consult` should become an `ask_process` route, while `requirement_for_dental_consultation` should become an `ask_requirement` route.

### Follow-Up Memory Improvements

`context_manager.py` now supports `ask_availability` as a follow-up purpose.

It also handles short dormitory follow-ups such as:

- `how many?`
- `available slots?`
- `pros and cons?`
- `male dorm?`
- `female dorm?`

## NLU Updates

Added broad-intent examples for:

- WiFi access
- clinic location
- dental consultation requirements
- dental oral examination requirements
- dormitory availability
- classroom phone policy
- classroom eating policy
- online assignment submission

No new topic-specific intent explosion was added.

## Validation

Completed checks:

```powershell
python -m unittest discover -s test -p "test_*.py"
python -m py_compile rasa/actions/main_router.py rasa/actions/query_interpreter.py rasa/actions/entity_resolver.py rasa/actions/knowledge_router.py rasa/actions/response_builder.py rasa/actions/data_loader.py rasa/actions/context_manager.py
rasa data validate --config config.yml --domain domain.yml --data data
rasa train --config config.yml --domain domain.yml --data data
```

Result:

- 36 unit tests passed
- JSON parse check passed for 14 structured knowledge files
- Python compile check passed
- Rasa data validation passed with no duplicate-example warning after cleanup
- Training completed successfully

Latest trained model:

`rasa/models/20260606-182211-chilly-matrix.tar.gz`

## Verified Route Examples

Router checks passed:

- `how to get wifi access` -> `get_wifi_access`
- `where is the clinic` -> `buksu_med_loc`
- `dental consultation requirements` -> `requirement_for_dental_consultation`
- `does buksu have dormitory` -> `campus_dormitories`
- `can i eat in classroom` -> `eating_in_classroom`
- `can i use phone in class` -> `phone_use_in_class`

Follow-up checks passed:

- `how to request dental consultation` -> `request_dental_consult`
- `what are the requirements?` -> `requirement_for_dental_consultation`
- `does buksu have dormitory` -> `campus_dormitories`
- `how many?` -> `number_of_dormitories`
- `available slots?` -> `buksu_dormitory_information`

## Duplicate Check

The Day 6 structured intents were checked against the legacy `responses.json` file.

Result:

- Structured intents checked: 21
- Remaining duplicates in legacy file: 0

## Notes for Future Scaling

When adding new clinic, ICT, dormitory, or classroom policy records:

1. Keep related follow-up answers under one subject group.
2. Use `subject_key`, `subject_type`, and `subject_terms` on subtopics that need memory.
3. Use `context_topic` to describe the purpose: `process`, `requirements`, `availability`, `location`, or `policy`.
4. Add NLU examples only for broad user-purpose wording.
5. Keep response tone official and avoid casual notes in knowledge data.
