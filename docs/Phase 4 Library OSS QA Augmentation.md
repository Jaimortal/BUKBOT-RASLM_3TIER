# Phase 4 Library and OSS QA Augmentation

## Scope

Files covered in this phase:

- `rasa/actions/Supper Saiyan/Library_info.json`
- `rasa/actions/Supper Saiyan/Oss_services.json`

Goal: improve recognition for library ID, library services, borrowing, library hours, student ID, PE uniform, ID validation, good moral certificate, affirmative action, and student organization questions.

## Execution Prompt

For each active JSON file, run three testing rounds. For each round, generate at least 10-20 highly distinct test queries per intent sub-topic, then loop back until the possible user question patterns route to the right answer.

Round 1: Linguistic Variations and Synonyms

- Generate formal, informal, short, direct, and conversational variants.
- Cover `where`, `how`, `requirements`, `how much`, `payment`, `schedule`, `process`, `rules`, `available`, and `services`.

Round 2: Local and Structural Context

- Include BukSU-specific wording such as `COR`, `OSS`, `OVPCASSS`, `University Press`, `library ID`, `barcoded library card`, `student ID`, and `school ID`.
- Include Bisaya/Bislish wording like `asa makuha`, `unsaon pagkuha`, `pila`, `naay bayad`, and `kanus-a`.

Round 3: Edge Cases and Rule Violations

- Test library ID vs student ID ambiguity.
- Test generic `validate` questions that should ask for clarification.
- Test `how to get PE` without `uniform`, which should ask whether the user means PE uniform.
- Test library services and BukSU services menu behavior.
- Test borrowing questions so `return`, `late penalty`, `available books`, and `resources` do not all collapse into one answer.

## Fixes Applied

- Expanded `Library_info.json` phrase coverage for all library subtopics.
- Expanded `Oss_services.json` phrase coverage for all OSS service subtopics.
- Added 99 new library phrases and 93 new OSS phrases.
- Made library/student ID requirement checks outrank broad freshman admission requirements.
- Made failed CAT wording route to `affirmative_action` before pass/result wording.
- Made `pe clothes where/get/request/buy` route to PE uniform process instead of clarification.
- Added `month` and `period` schedule wording for ID validation day.
- Made library hours outrank general office hours only when the question is not about library ID.
- Added `claim/release/released/process` wording to library ID location routing.

## Loop-Back Findings

First adversarial loop found these gaps:

- `freshman library id requirements` routed to freshman admission requirements.
- `what month is id validation` routed to ID validation process instead of ID validation day.
- `pe clothes where to get` triggered PE uniform clarification instead of PE uniform process.
- `wala ko kapasar cat unsa buhaton` and `what if i fail buksu cat` routed to exam result/general CAT records instead of affirmative action.

Generated phrase loop found these gaps:

- `library office hours` routed to general office hours instead of library hours.
- `where is library id released` routed to library hours because normalization expanded `released` into schedule-like terms.

## Test Status

Passed.

- Adversarial library/OSS suite after patching: 180 tests, 0 failures.
- Generated metadata phrase suite after patching: 105 tests, 0 failures.
- JSON validation passed for both Phase 4 files.
- Python compile check passed for routing/retrieval modules.
