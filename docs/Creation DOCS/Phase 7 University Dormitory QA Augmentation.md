# Phase 7 University and Dormitory QA Augmentation

## Scope

Files covered in this phase:

- `rasa/actions/Supper Saiyan/University_info.json`
- `rasa/actions/Supper Saiyan/Dormitory_info.json`

Goal: improve recognition for general BukSU information, identity, history, ranking, leadership, office/public info, and campus dormitory questions.

## Execution Prompt

For each active JSON file, run three testing rounds. For each round, generate at least 10-20 highly distinct test queries per intent sub-topic, then loop back until the possible user question patterns route to the right answer.

Round 1: Linguistic Variations and Synonyms

- Generate formal, informal, short, direct, and conversational variants.
- Cover `about BukSU`, `meaning of BukSU`, `TBA`, `location`, `contact`, `calendar`, `foundation day`, `mission`, `vision`, `core values`, `seal`, `hymn`, `history`, `ranking`, `president`, and dormitory questions.

Round 2: Local and Structural Context

- Include BukSU-specific wording such as `WURI`, `EduRank`, `GreenMetric`, `BukSU Gazette`, `Mahogany`, `Rubia`, and campus dormitory.
- Include Bisaya/Bislish wording like `unsa`, `asa`, `pila`, `kanus-a`, `pwede`, `naa bay`, and `kinsa`.

Round 3: Edge Cases and Rule Violations

- Test about BukSU vs BukSU services.
- Test mission/vision/core values vs ICT mission/clinic mission.
- Test president vs presidents list vs president during university conversion.
- Test foundation day vs founding date.
- Test dormitory overview vs availability vs count vs male/female dorms.

## Fixes Applied

- Expanded `University_info.json` phrase coverage for all university profile, identity, history, ranking, and leadership subtopics.
- Expanded `Dormitory_info.json` phrase coverage for dormitory overview, count, pros/cons, availability, male dorm, and female dorm.
- Added 203 university phrases and 50 dormitory phrases.
- Tightened `knowledge_router.py` direct guards for:
  - BukSU meaning/acronym, overview, history, founding, university conversion, president, previous presidents, ranking, values, hymn/song, worth-it, study-place, campus-tour, calendar, contact, weekend visitors, and location.
  - Dormitory overview, count, pros/cons, availability, male dorm, and female dorm.
- Fixed a hidden substring routing bug where `dormitory` could be interpreted as `tor` because `tor` appeared inside the word.
- Fixed gender routing so `female dorm` no longer matches the `male dorm` route.

## Test Status

Passed final command-line loop tests.

- Deterministic and metadata phrase sample routing: 193 checked cases, 0 failures.
- JSON validation passed for:
  - `rasa/actions/Supper Saiyan/University_info.json`
  - `rasa/actions/Supper Saiyan/Dormitory_info.json`
- Python compile passed for:
  - `rasa/actions/knowledge_router.py`
  - `rasa/actions/retrieval_scorer.py`
  - `rasa/actions/retrieval_index.py`
  - `rasa/actions/data_loader.py`
  - `rasa/actions/query_interpreter.py`
