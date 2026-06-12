# Day 5 - University, Administrators, Faculty/Staff

## Scope

Day 5 completed the restructuring and retrieval support for university profile data, administrator roles, college deans, and department heads.

Covered phases:

- Phase 1: University + Administrators + Faculty/Staff restructuring
- Phase 2: Person/Role retrieval

## Files Updated

- `rasa/actions/Supper Saiyan/University_info.json`
- `rasa/actions/Supper Saiyan/Administrators.json`
- `rasa/actions/Supper Saiyan/Departamentals_facultystaff.json`
- `rasa/actions/data_loader.py`
- `rasa/actions/knowledge_router.py`
- `rasa/data/nlu.yml`
- `test/test_context_aware_retrieval.py`

## Phase 1 Changes

### University Data

`University_info.json` is now grouped around stable university subjects:

- `university_profile`
- `university_identity`
- `university_history`
- `university_ranking`
- `university_leadership`

This keeps connected records together while still allowing each specific answer to be retrieved directly.

### Administrators

`Administrators.json` now uses person/role metadata for each administrator role.

Each administrator subtopic now has:

- `subject_key`
- `subject_type: person_role`
- `subject_terms`
- `context_topic: person`

This lets role questions work without adding a new Python rule for every administrator.

### Faculty and Staff

`Departamentals_facultystaff.json` now supports role-based retrieval for:

- college deans
- department heads

Each dean/head subtopic has subject terms such as:

- `dean of cot`
- `cot dean`
- `head of bsit`
- `bsit head`

## Phase 2 Changes

### Person/Role Retrieval

The structured retrieval layer can now answer questions like:

- `who is the president`
- `who is the dean of COT`
- `who is the head of BSIT`
- `what is BukSU mission`
- `what is BukSU vision`
- `vice president for academic affairs`

### Router Updates

`knowledge_router.py` now separates:

- current president
- first president
- former presidents / president list

This prevents `who is the president` from accidentally returning historical president data.

### Data Loader Updates

`data_loader.py` now treats `person` as a general information topic so person/role records are searchable through the broad `ask_general_info` intent.

## Validation

Completed checks:

- JSON parsing for all structured knowledge files
- Python compile check for action modules
- Unit test suite
- Rasa data validation
- Rasa model training
- Rasa NLU sanity checks

Latest trained model:

`rasa/models/20260606-180958-coral-courtyard.tar.gz`

## Test Results

Commands completed successfully:

```powershell
python -m unittest discover -s test -p "test_*.py"
python -m py_compile rasa/actions/main_router.py rasa/actions/query_interpreter.py rasa/actions/entity_resolver.py rasa/actions/knowledge_router.py rasa/actions/response_builder.py rasa/actions/data_loader.py rasa/actions/context_manager.py
rasa data validate --config config.yml --domain domain.yml --data data
rasa train --config config.yml --domain domain.yml --data data
```

Result:

- 36 unit tests passed
- Rasa data validation passed
- Training completed successfully

## Verified Route Examples

These route checks passed:

- `who is the president` -> `buksu_president`
- `who is the president of buksu` -> `buksu_president`
- `who was the first president of buksu` -> `Pres_thetime_university`
- `former presidents of buksu` -> `buksu_presidents_list`
- `who is the dean of COT` -> `Dean_0f_COT`
- `who is the dean of CON` -> `Dean_0f_CON`
- `who is the head of BSIT` -> `Head_of_BSIT`
- `who is the head of CPAG` -> `Head_of_CPAG`
- `what is BukSU mission` -> `buksu_mission`
- `what is BukSU vision` -> `buksu_vision`
- `vice president for administration and finance` -> `vicepres_administration_finance`

## Duplicate Check

The Day 5 structured intents were checked against the legacy `responses.json` file.

Result:

- Structured intents checked: 40
- Remaining duplicates in legacy file: 0

## Notes for Future Scaling

When adding new administrator, dean, or head records:

1. Add the response as a subtopic under the correct group.
2. Add `subject_key`, `subject_type: person_role`, and `subject_terms`.
3. Use role-specific terms instead of broad global terms.
4. Add NLU examples only when the user wording is broad and important.
5. Run the route tests before training a new model.
