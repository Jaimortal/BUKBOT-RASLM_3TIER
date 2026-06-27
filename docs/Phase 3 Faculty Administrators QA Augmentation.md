# Phase 3 Faculty and Administrators QA Augmentation

## Scope

Files covered in this phase:

- `rasa/actions/Supper Saiyan/Departamentals_facultystaff.json`
- `rasa/actions/Supper Saiyan/Administrators.json`

Goal: improve recognition for faculty, dean, department head, program chair, vice president, and board secretary questions without changing official answers.

## Execution Prompt

For each active JSON file, run three testing rounds. For each round, generate at least 10-20 highly distinct test queries per intent sub-topic, then loop back until the possible user question patterns route to the right answer.

Round 1: Linguistic Variations and Synonyms

- Generate formal, informal, short, direct, and conversational variants.
- Cover `who is`, `who's`, `name of`, `current`, `tell me`, `list`, `head`, `chairperson`, `program chair`, `dean`, `VP`, and `vice president`.

Round 2: Local and Structural Context

- Include BukSU-specific acronyms and course-to-college wording.
- Include examples like `dean of BSIT`, `head of BSIT`, `dean bachelor of arts in philosophy`, `VP academic affairs`, and Bisaya/Bislish wording such as `kinsa ang dean sa CAS`.

Round 3: Edge Cases and Rule Violations

- Test dean vs head conflicts.
- Test course description vs course leadership conflicts.
- Test `VP` shorthand vs full `vice president`.
- Test broad administrator questions against specific administrator roles.

## Gap Analysis

Observed risks before augmentation:

- Dean/head records had only a few phrases, usually 3-7 each.
- Course leadership questions could overlap with course-description records.
- `VP academic affairs` style shorthand was not fully protected because the router only checked full `vice president` wording.
- Bisaya variants were thin for administrator and faculty role questions.

Loop-back findings during adversarial testing:

- `kinsa dean sa digital animation` routed to the BSEMC-DAT course description instead of the COT dean.
- `who manages information technology program` routed to the BSIT course description instead of the BSIT head.
- `program chairs under COT` routed to the COT course list instead of COT department heads.
- CAS course leadership questions such as `dean of english language`, `dean of environmental science`, and `program chair of environmental science` routed to course descriptions instead of CAS dean/head records.
- `Dante Victoria` triggered ICT because `victoria` contains the letters `ict`.
- `VP Hazel Jean Abejuela`, `VP Carina Joane Barroso`, and similar name-based VP questions routed to the generic vice president list.

## Fixes Applied

- Expanded `Departamentals_facultystaff.json` phrases for all dean and department head records using their existing `subject_terms` and `display_name`.
- Expanded `Administrators.json` phrases for all vice president and board secretary records using their existing `subject_terms` and `display_name`.
- Added `vp` and `vps` shorthand detection in `knowledge_router.py` so short administrator questions can route safely.
- Added leadership wording protection for `program chairs`, `who manages`, `who handles`, and `who leads`.
- Prevented college-course-list routing when the query is actually asking for a dean/head/program chair.
- Added missing course-to-college leadership mappings for digital animation, multimedia computing, English language, environmental science, development communication, community development, and other CAS program wording.
- Changed ICT detection so `ict` must be its own token, preventing false matches inside names like `Victoria`.
- Added name-aware administrator routing for Hazel Jean Abejuela, Carina Joane Barroso, Dante Victoria, and Lincoln Tan.

Phrase expansion totals:

- `Departamentals_facultystaff.json`: 1,276 new phrases added.
- `Administrators.json`: 419 new phrases added.

## Important Routing Expectations

- `who is dean of BSIT` should answer the Dean of COT.
- `who is head of BSIT` should answer the BSIT department head.
- `who is dean of Bachelor of Arts in Philosophy` should answer the Dean of CAS.
- `who is head of Bachelor of Arts in Philosophy` should answer CAS department heads.
- `vp academic affairs` should answer the Vice President for Academic Affairs.
- `who are the vice presidents of BukSU` should answer the vice president list.
- `who is board secretary` should answer the BukSU Board Secretary.

## Test Status

Passed.

- Focused dean/head/administrator route tests: 26 passed, 0 failed.
- First adversarial loop: 166 tests, 8 failed, then patched.
- Second adversarial loop: 166 tests, 0 failed.
- Generated subject-term loop: 497 tests, 25 failed, then patched/shared-name ambiguity corrected.
- Final generated subject-term loop: 497 tests, 0 failed.
- JSON validation passed for both Phase 3 files.
- Python compile check passed for routing/retrieval modules.
