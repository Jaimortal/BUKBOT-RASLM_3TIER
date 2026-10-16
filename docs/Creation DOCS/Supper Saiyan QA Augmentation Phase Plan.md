# Supper Saiyan QA Augmentation Phase Plan

This plan tests and augments the `rasa/actions/Supper Saiyan` JSON files two files per phase.

Each phase follows the same loop:

1. Inventory the target JSON structures, intents, display names, subject terms, phrases, and risky overlaps.
2. Generate adversarial query sets in three rounds:
   - Round 1: linguistic variations and synonyms
   - Round 2: local BukSU terms, abbreviations, Bisaya, and mixed conversational patterns
   - Round 3: edge cases, ambiguous wording, negative framing, and rule-bound questions
3. Identify likely wrong-response gaps.
4. Add narrow metadata phrases only to the safest matching intent.
5. Run JSON validation and routing probes.
6. Stop before continuing to the next phase.

## Phase 1

Files:
- `Admissions_info.json`
- `Enrollment_info.json`

Focus:
- BukSU CAT
- Admission application
- Admission account vs institutional account
- COR download
- First year/transferee enrollment
- Late enrollment
- Enrollment validation/payment
- Nursing enrollment guidance

## Phase 2

Files:
- `Courses_info.json`
- `Department_info.json`

Focus:
- Course offered queries
- Course acronyms
- Board/non-board categories
- College and department routing
- Course slot child rows

## Phase 3

Files:
- `Departamentals_facultystaff.json`
- `Administrators.json`

Focus:
- Dean/head/person-role routing
- Faculty/staff lookup
- Administrator name and office questions

## Phase 4

Files:
- `Library_info.json`
- `Oss_services.json`

Focus:
- Library ID, services, borrowing, and location follow-ups
- OSS services, student ID, PE uniform, validation, student support

## Phase 5

Files:
- `Clinic_info.json`
- `Ict_info.json`

Focus:
- Clinic and dental services
- Medical certificate
- ICT accounts, Wi-Fi, institutional email, technical help

## Phase 6

Files:
- `Classroom_policy.json`
- `Dormitory_info.json`

Focus:
- Classroom rules
- Schedule/section concerns
- Dormitory services, rules, and location

## Phase 7

Files:
- `University_info.json`
- `Academic_policy.json`

Focus:
- University information
- Academic standing, probation, INC, adding/dropping, shifting, graduation, policies

## Phase 8

Files:
- All `Supper Saiyan` JSON files
- `responses.json`
- `knowledge_router.py`

Focus:
- Cross-file retrieval stabilization
- Broad term collision checks
- Wrong-response regression checks after phrase expansion
- Enrollment vs late enrollment
- Course availability vs enrollment process
- CAT score vs exam-day requirements
- Dormitory vs TOR
- Classroom food vs creator questions
- ID, validation, services, and location ambiguity

## Phase 9

Files:
- All `Supper Saiyan` JSON files
- `responses.json`
- `knowledge_router.py`

Focus:
- Bounded adversarial regression after cross-file stabilization
- Creator questions vs classroom food substring collisions
- TOR vs COR vs dormitory wording
- Generic validation vs ID/COR validation
- Generic ID vs student/library ID
- Admission account vs institutional email account
- Course availability, slots, CAT scores, enrollment, and late enrollment

## Final Overlap Regression

Files:
- All `Supper Saiyan` JSON files
- `responses.json`
- `responses_location.json`
- `knowledge_router.py`
- `main_router.py`

Focus:
- Final overlap check for ID, validation, services, course, office, schedule, and Bisaya/Bislish queries
- Ensure location-like office/building questions fall through to the location or building-directory layer
- Ensure CPAG does not trigger classroom `cp`/cellphone policy
- Ensure generic ID and validation questions show choices instead of guessed answers
