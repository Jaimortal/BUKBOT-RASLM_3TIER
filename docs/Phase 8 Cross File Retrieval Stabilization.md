# Phase 8 Cross-File Retrieval Stabilization

## Scope

Files covered in this phase:

- All JSON files under `rasa/actions/Supper Saiyan`
- `rasa/actions/responses.json`
- `rasa/actions/knowledge_router.py`

Goal: test risky cross-domain overlaps after all per-file QA augmentation phases. This phase focuses on questions that can accidentally match the wrong file because they share broad words like `course`, `admission`, `validation`, `id`, `office`, `where`, `dorm`, `president`, `class`, or `service`.

## Execution Prompt

For each round, generate at least 10-20 highly distinct test queries per risk group, then loop back until the possible user question patterns route to the right answer.

Round 1: Linguistic Variations and Synonyms

- Test direct and conversational forms across admissions, enrollment, courses, validation, services, university info, dormitory, classroom, clinic, ICT, and library.
- Include short forms such as `how validate`, `slot left nursing`, `buksu percentage examination`, and `how about bset`.

Round 2: Local and Structural Context

- Test BukSU-specific terms and mixed wording such as `CAT`, `IT`, `BA Philo`, `BSET`, `COR`, `PE uniform`, `Rubia`, `COT`, and `CAS SBO`.
- Test Bisaya/Bislish wording such as `unsay course na available diris buksu`.

Round 3: Edge Cases and Rule Violations

- Test broad questions that previously caused wrong answers:
  - enrollment help vs late enrollment
  - course availability vs enrollment process
  - CAT percentage vs exam-day requirements
  - student ID vs library ID
  - dormitory vs TOR
  - `who create you` vs classroom eating
  - civilian attire vs location fallback

## Fixes Applied

- Added a direct `Bot_creator` guard for creator questions such as `who create you`, `who created you`, `who made you`, and `who built you`.
- Fixed classroom food routing so short words like `eat` are token-based and no longer match unrelated words like `create`.
- Kept existing accepted intent aliases where the current structured architecture uses newer intent names, for example:
  - `buksu_BSET_program` for BSET availability
  - `clinic_medical_certificate_process` for clinic medical certificate process
  - `request_tooth_extraction` for dental tooth extraction
  - `get_wifi_access` for Wi-Fi access
  - `eating_in_classroom` and `phone_use_in_class` for classroom rules

## Test Status

Passed final command-line loop tests.

- Cross-domain adversarial routing: 49 checked cases, 0 failures.
- JSON validation passed for every file in `rasa/actions/Supper Saiyan`.
- JSON validation passed for `rasa/actions/responses.json`.
- Python compile passed for:
  - `rasa/actions/knowledge_router.py`
  - `rasa/actions/retrieval_scorer.py`
  - `rasa/actions/retrieval_index.py`
  - `rasa/actions/data_loader.py`
  - `rasa/actions/query_interpreter.py`

