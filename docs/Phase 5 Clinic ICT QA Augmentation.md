# Phase 5 Clinic and ICT QA Augmentation

## Scope

Files covered in this phase:

- `rasa/actions/Supper Saiyan/Clinic_info.json`
- `rasa/actions/Supper Saiyan/Ict_info.json`

Goal: improve recognition for clinic services, medical certificate, dental services, dental sub-services, ICT services, Wi-Fi access, ICT mission, and institutional email account questions.

## Execution Prompt

For each active JSON file, run three testing rounds. For each round, generate at least 10-20 highly distinct test queries per intent sub-topic, then loop back until the possible user question patterns route to the right answer.

Round 1: Linguistic Variations and Synonyms

- Generate formal, informal, short, direct, and conversational variants.
- Cover `clinic`, `medical certificate`, `dental`, `oral examination`, `tooth extraction`, `medicine`, `ICT`, `Wi-Fi`, `internet`, and `institutional email`.

Round 2: Local and Structural Context

- Include BukSU-specific wording such as `validated ID`, `study load`, `OJT`, `intramural`, `field trip`, `ICTSU`, `campus Wi-Fi`, and `official BukSU student email`.
- Include Bisaya/Bislish wording like `unsaon`, `asa makuha`, `pila`, `naay bayad`, `pa dental`, `paibot ngipon`, and `kanus-a`.

Round 3: Edge Cases and Rule Violations

- Test dental services menu vs individual dental processes.
- Test medical certificate cost/duration vs process.
- Test clinic services menu vs basic clinic information.
- Test Wi-Fi access vs institutional email vs generic ICT.
- Test institutional account vs admission account wording.

## Fixes Applied

- Expanded `Clinic_info.json` phrase coverage for clinic, medical certificate, and dental service subtopics.
- Expanded `Ict_info.json` phrase coverage for ICT, Wi-Fi, mission, and institutional email records.
- Added 130 new clinic/dental phrases and 37 new ICT phrases.
- Prevented `validated ID` dental requirement questions from being misread as general ID validation.
- Added support for `ictsu` as an ICT token.
- Added tooth extraction wording such as `tooth removal`, `extract tooth`, and `paibot ngipon`.
- Added dental medicine/referral wording such as `medicine dispensing` and `dental referral`.
- Made medical certificate duration outrank cost when the query says `minutes`, `how long`, or `how fast`.
- Made dental oral exam variants route correctly for both process and requirement questions.
- Made institutional email recognize wording like `email with student ID number`.
- Updated dental services to return the clinic/dental choice menu.

## Loop-Back Findings

First adversarial loop found these gaps:

- `validated id for oral examination` routed to ID validation instead of dental oral examination requirements.
- `need ba validated id for dental consult` routed to ID validation instead of dental consultation requirements.
- `how to request oral exam` and `pa oral exam sa dental clinic` routed to dental consultation instead of oral examination.
- `extract tooth clinic` routed to basic clinic info instead of tooth extraction.
- `medicine dispensing dental` routed to dental consultation instead of referral/dispensing of medicine.
- `ictsu mission` routed to the university mission instead of ICT mission.
- `is medical certificate free` and `pila ka minutes medical certificate` needed stronger cost/duration handling.

Generated metadata loop found these gaps:

- `health services unit info`, `mission of health services unit`, and `vision of health services unit` needed to outrank service menus.
- `dental help menu` needed to return the dental services menu.
- `need dental consultation` and `need oral examination` needed process routing unless the query clearly asks for documents or requirements.
- `email with student id number` needed institutional email routing instead of student ID routing.
- One phrase, `medical and dental consultation for students`, belonged under medical/dental services instead of basic clinic info and was moved.

## Test Status

Passed.

- Adversarial clinic/ICT suite after patching: 121 tests, 0 failures.
- Generated metadata phrase suite after patching: 90 tests, 0 failures.
- JSON validation passed for both Phase 5 files.
- Python compile check passed for routing/retrieval modules.
