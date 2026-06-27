# Phase 6 Classroom and Academic Policy QA Augmentation

## Scope

Files covered in this phase:

- `rasa/actions/Supper Saiyan/Classroom_policy.json`
- `rasa/actions/Supper Saiyan/Academic_policy.json`

Goal: improve recognition for classroom rules, class schedule/section changes, academic standing, grading, INC, FDA, overload, honors, thesis/capstone, add/drop, withdrawal, registrar documents, COR validation, and graduation clearance/application questions.

## Execution Prompt

For each active JSON file, run three testing rounds. For each round, generate at least 10-20 highly distinct test queries per intent sub-topic, then loop back until the possible user question patterns route to the right answer.

Round 1: Linguistic Variations and Synonyms

- Generate formal, informal, short, direct, and conversational variants.
- Cover classroom rules, phone use, eating, assignments, schedules, failed subjects, probation, grading, INC, FDA, overload, honors, thesis, add/drop, withdrawal, registrar documents, COR validation, and graduation.

Round 2: Local and Structural Context

- Include BukSU-style wording such as `COR`, `SIAS`, `FDA`, `INC`, `GWA`, `Dean's List`, `TOR`, `Registrar`, `Google Classroom`, and `section conflict`.
- Include Bisaya/Bislish wording like `unsaon`, `asa makuha`, `pila`, `pwede ba`, `kanus-a`, `bagsak`, `balhin section`, and `pasa assignment`.

Round 3: Edge Cases and Rule Violations

- Test schedule check vs schedule change vs section change due to conflict.
- Test INC form vs INC completion vs INC consequences.
- Test FDA meaning vs FDA solution.
- Test generic passing grade clarification vs specific course passing/retention grade.
- Test COR request vs COR validation.
- Test registrar TOR contact vs TOR request.

## Fixes Applied

- Expanded `Classroom_policy.json` phrase coverage for all classroom subtopics.
- Expanded `Academic_policy.json` phrase coverage for all academic policy subtopics.
- Added 92 classroom phrases and 248 academic policy phrases.
- Added direct routing guards for class schedule help/check/change/section conflict.
- Added direct routing guards for failed subject, academic probation, grading system, grade access, end of semester, INC form/solution/consequences, attendance, overload, honors, thesis/capstone, withdrawal, TOR, registrar schedule, COR request, COR validation, and graduation clearance.
- Made `balhin schedule` and `balhin section` avoid transferee/admission misroutes.
- Made `college honors` avoid generic college/course routing.
- Made TOR contact/request avoid generic registrar contact and phone/classroom routes.
- Made `INC form` token-based so normalized words like `information` do not trigger it.

## Loop-Back Findings

Deterministic loop found broad missing direct guards:

- Schedule questions like `where can i see my schedule`, `check schedule in COR`, and `balhin schedule sa klase` needed schedule-specific routing.
- Academic questions like `failed subject policy`, `academic probation`, `grading system`, `access grades`, `end of semester`, `attendance requirement`, `subject overload`, and honors were relying too much on retrieval.
- `balhin section tungod conflict` was misread as transferee wording.
- `college honors` was misread as generic college/course information.
- TOR questions were misread as generic contact/phone/classroom records.
- COR request questions were misread as enrollment COR download.

Generated metadata loop found phrase-specific leaks:

- `schedule in COR problem` routed to COR download.
- `adjust class schedule concern` needed change-schedule routing while `schedule adjustment help` needed schedule-help routing.
- `section conflict during enrollment` routed to enrollment process.
- `probation requirements` routed to second-courser requirements.
- `how is grade computed` and `what grade required to stay in program` were affected by graduation wording.
- `unsaon pagkuha INC form` and `unsa mahitabo if dili ma complete INC` exposed the INC form false-positive issue.
- `when can I visit registrar` needed registrar schedule routing.

## Test Status

Passed.

- Deterministic direct route suite after patching: 191 tests, 0 failures.
- Generated metadata phrase suite after patching: 114 tests, 0 failures.
- JSON validation passed for both Phase 6 files.
- Python compile check passed for routing/retrieval modules.
