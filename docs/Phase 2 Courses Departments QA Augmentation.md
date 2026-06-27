# Phase 2 Courses + Departments QA Augmentation

Target files:
- `rasa/actions/Supper Saiyan/Courses_info.json`
- `rasa/actions/Supper Saiyan/Department_info.json`

## Phase 2 Prompt

You are an expert QA Automation Tester and Rasa Data Augmentation Specialist. Your task is to stress-test and optimize the Courses and Departments retrieval layer while preserving official JSON data as the only source of chatbot answers.

For each intent/subtopic in the target files:

1. Generate at least 10-20 highly distinct test queries.
2. Cover three rounds:
   - Round 1: English linguistic variations, synonyms, wrong grammar, short direct wording.
   - Round 2: BukSU-local phrasing, course acronyms, college acronyms, Bisaya/Bislish wording, and conversational follow-ups.
   - Round 3: edge cases such as acronym ambiguity, course-vs-college confusion, slot questions, board/non-board confusion, and shifting/training confusion.
3. Compare the generated queries against current metadata phrases, subject terms, aliases, course routes, and retrieval scoring.
4. Add only narrow phrases that mention a specific course, college, category, or action.
5. Avoid broad standalone triggers such as `course`, `college`, `department`, `offer`, `available`, `slot`, or `program`.
6. Loop back after testing until the focused regression suite has 0 known failures.

## Main Risk Areas

- Course availability vs course description:
  - `does BukSU offer BSIT` should answer availability.
  - `what is BSIT about` should answer program description.

- Course catalog vs specific course:
  - `courses offered by BukSU` should show course-list choices or all courses depending on exact wording.
  - `does BukSU offer BA Philo` should answer the specific BA Philosophy record.

- College course list vs course details:
  - `courses under COT` should answer COT list.
  - `what is BSET` should answer BSET details, not COT list.

- Course slots:
  - `slot left for BSIT` should answer the BSIT child row only.
  - `slot left for law course` should answer the Law/Juris Doctor child row, not all course slots.

- COA ambiguity:
  - In this project, `COA` in the course/department context means College of Public Administration and Governance / Bachelor of Public Administration, not agriculture.

## Execution Log

Applied targeted metadata phrase expansion:
- `Courses_info.json`: 1,916 new phrases
- `Department_info.json`: 300 new phrases

The expansion was generated from each record's own `subject_terms`, `display_name`, course acronyms, college acronyms, and existing topic purpose. It avoided broad standalone triggers.

## Round 1: Linguistic Variations And Synonyms

Generated patterns included:
- `what is BSIT`
- `tell me about BA Philosophy`
- `does BukSU offer BSET`
- `is BSAT available in BukSU`
- `what are non-board courses`
- `what does board course mean`
- `are there evening classes for working students`

Fixes:
- Added course-specific availability and description phrases for program records.
- Added definition-style phrases for board/non-board meaning records.
- Protected evening-class wording from classroom-policy fallback.

## Round 2: Local And Structural Context

Generated patterns included:
- `naa bay BSAT sa BukSU`
- `nag offer ba ang BukSU ug BSHM`
- `unsay course na available diris BukSU`
- `courses under COT`
- `courses under CON`
- `courses under CPAG`
- `slot left for BSIT`
- `pila slots sa BSET`

Fixes:
- Added Bisaya/Bislish course availability patterns.
- Added college-course-list patterns for CAS, COB, COT, CON, COE, COA/CPAG, and Law.
- Tightened COA/CPAG routing so course-list questions route to `course_offer_COA`, while specific `BPA` questions still route to the BPA program record.

## Round 3: Edge Cases And Rule Violations

Generated patterns included:
- `what courses does COT offer`
- `courses under CON`
- `slot left for law course`
- `what does non board course mean`
- `what does board course mean`
- `does BukSU offer BA Philo`
- `what is electronics technology`

Loop-back findings:
- College-list questions were being stolen by specific course routes, such as CON -> BS Nursing and COA/CPAG -> BPA.
- `electronics technology` and `automotive technology` accidentally looked like COT because of the word `technology`.
- Board/non-board definition questions were being routed to list records.

Fixes:
- Added an explicit college-course-list guard before specific-course routing.
- Required explicit college acronyms or full college names for college list routing.
- Added `what does`, `explain`, and `pasabot` as definition triggers for board/non-board meanings.

## Regression Results

Focused Phase 2 suite:
- 41 high-risk patterns tested
- 0 failures

Generated course-route suite:
- 116 generated course acronym/name patterns tested
- 0 failures

Validation:
- `Courses_info.json` parses successfully.
- `Department_info.json` parses successfully.
- `knowledge_router.py` compiles successfully.
