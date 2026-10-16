# Day 6: Clinic, ICT, Dormitory, and Classroom Accuracy Pass

## Scope

Day 6 focused on accuracy and understanding for these data groups:

- Clinic and dental services
- Medical certificate process, cost, and duration
- ICT services and Wi-Fi access
- Dormitory overview, availability, male/female dorms, and pros/cons
- Classroom policy, phone use, eating in class, online assignment submission, and class schedule concerns

## Phase 1: Structured Data Review

Reviewed these structured JSON files:

- `rasa/actions/Supper Saiyan/Clinic_info.json`
- `rasa/actions/Supper Saiyan/Ict_info.json`
- `rasa/actions/Supper Saiyan/Dormitory_info.json`
- `rasa/actions/Supper Saiyan/Classroom_policy.json`

These files were already using the newer topic/subtopic structure. No large restructuring was needed.

Added phrase coverage for common English, Bisaya, and informal student wording:

- `unsaon pag connect sa wifi`
- `asa ang clinic`
- `pwede ba mag cellphone sa klase`
- `pwede ba mokaon sa classroom`
- `pwede ba mukaon sulod sa klase`
- `how to get medical certificate from clinic`
- `bayad sa medical certificate`
- `naa bay dormitory ang buksu`

## Phase 2: Route Hardening

Updated `rasa/actions/knowledge_router.py` to improve direct routing for Day 6 topics.

Changes:

- Added Bisaya classroom terms such as `klase`, `cellphone`, `cp`, `kaon`, `mokaon`, `mukaon`, and `pagkaon`.
- Routed generic `clinic services` to the clinic services menu instead of one generic clinic answer.
- Routed generic `dormitory services` to the dormitory services menu.
- Routed generic `classroom policy` to the classroom policy menu.
- Improved classroom routing so:
  - phone/cellphone/CP/gadget questions go to `phone_use_in_class`
  - eat/food/snack/kaon/mokaon questions go to `eating_in_classroom`
  - assignment/homework/Google Classroom/submit/pasa questions go to `submit_assignments_online`

## Tested Queries

Passed:

- how to get wifi access
- where is the clinic
- dental consultation requirements
- does buksu have dormitory
- can i eat in classroom
- can i use phone in class
- clinic services
- dormitory services
- classroom policy
- pwede ba mokaon sa classroom
- pwede ba mag cellphone sa klase
- unsaon pag connect sa wifi
- how long to get medical certificate
- dental services

## Validation

Completed:

- Python compile check for `knowledge_router.py`
- JSON parse check for all touched Day 6 JSON files
- Direct router smoke tests for all Day 6 examples
- `rasa data validate`

No NLU/domain/rules files were changed for this Day 6 pass, so `rasa train` is not required. Restart the action server to reload the Python routing changes.
