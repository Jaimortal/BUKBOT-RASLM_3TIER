# Day 7: Local Retrieval Layer Accuracy Pass

## Scope

Day 7 focused on the local retrieval layer without using an LLM.

The goal was to improve paraphrase handling while keeping the architecture safe:

- Rasa/direct structured routing still runs first.
- Local retrieval is used as a fallback when direct lookup does not confidently resolve the query.
- Retrieval should answer only when confidence is strong enough.
- Ambiguous or weak matches should clarify or fallback instead of guessing.

## Phase 1: Retrieval Design Review

Reviewed:

- `rasa/actions/retrieval_index.py`
- `rasa/actions/retrieval_scorer.py`
- `rasa/actions/retrieval_result.py`
- `rasa/actions/knowledge_router.py`
- `rasa/actions/data_loader.py`

The retrieval layer already indexed:

- normalized text
- display names
- intent names
- subject terms
- metadata phrases
- topic/context terms
- answer text
- child rows
- aliases/search terms

## Phase 2: Soft Integration and Accuracy Tuning

Updated `rasa/actions/retrieval_scorer.py` with query-purpose inference.

The scorer now looks at the query wording itself and infers possible purpose labels:

- `where`, `asa`, `located`, `direction` -> location
- `need`, `requirements`, `documents`, `kinahanglan` -> requirement
- `how`, `process`, `steps`, `apply`, `unsaon` -> process
- `download`, `form`, `permit`, `certificate`, `COR` -> document
- `when`, `schedule`, `deadline`, `date` -> schedule
- `fee`, `payment`, `cost`, `bayad`, `pila` -> fee
- `offer`, `available`, `naa` -> availability

This fixes cases where Rasa gives a broad `ask_general_info` intent but the actual words clearly indicate another purpose.

Also tightened confidence:

- Purpose-mismatched records no longer become high confidence unless the query has strong exact evidence.
- This reduces risky fallback answers when retrieval is close or unclear.

## Data Phrase Additions

Added targeted phrases for common paraphrases:

- Admission test requirements
  - `what do i need for admission test`
  - `what documents do i need for buksu cat`
  - `unsa kinahanglan para sa admission test`

- COR download
  - `where do i download my cor`
  - `where can i download my cor`
  - `how to download certificate of registration`
  - `asa makuha ang cor`
  - `unsaon pag download sa cor`

- Student ID process
  - `where can i process my school id`
  - `how to process school id`
  - `where do i get my school id`
  - `unsaon pagkuha sa school id`
  - `asa makuha ang student id`

- Masteral/graduate program availability
  - `do they offer masteral`
  - `does buksu offer masteral`
  - `naa bay masteral sa buksu`
  - `naa bay graduate programs ang buksu`

## Tested Queries

Full router passed:

- `tell me how could i apply for graduation application` -> `graduation_application_process`
- `what do i need for admission test` -> `exam_requirements`
- `where can i process my school id` -> `student_id_process`
- `do they offer masteral` -> `buksu_masters_courses`
- `how can i get clearance for graduation` -> `graduating_clearance_requirements`
- `can you please tell me where do i get my cor or where do i download it` -> `where_get_cor`
- `where can i download my cor` -> `where_get_cor`
- `unsaon pagkuha sa school id` -> `student_id_process`

Retrieval-only tests also ranked the expected record as the best high-confidence result for the core Day 7 paraphrases.

## Validation

Completed:

- Python compile check for retrieval/router files
- JSON parse check for touched data files
- Full router smoke tests
- Retrieval-only smoke tests
- `rasa data validate`

No NLU/domain/rules files were changed in this Day 7 pass, so `rasa train` is not required. Restart the action server to reload Python routing/scoring changes.
