# Day 7 - Local Retrieval Layer Without LLM

## Scope

Day 7 added a local retrieval layer that improves paraphrase handling without using an LLM or external AI service.

Covered phases:

- Phase 1: Retrieval design
- Phase 2: Soft integration

## Files Added

- `rasa/actions/retrieval_index.py`
- `rasa/actions/retrieval_scorer.py`
- `rasa/actions/retrieval_result.py`

## Files Updated

- `rasa/actions/knowledge_router.py`
- `rasa/actions/main_router.py`
- `test/test_context_aware_retrieval.py`

## Phase 1: Retrieval Design

### Retrieval Index

`retrieval_index.py` builds lightweight searchable records from the existing knowledge entries.

Each record stores:

- intent
- purpose intent derived from `context_topic`
- subject key
- subject terms
- metadata phrases
- topic/context terms
- answer text
- normalized searchable text
- token list

The index is built once when the router starts.

### Retrieval Scorer

`retrieval_scorer.py` scores candidate records using:

- exact metadata phrase match
- partial phrase coverage
- exact subject term match
- partial subject term coverage
- topic/context match
- Rasa purpose-intent match
- entity value match
- token overlap
- small answer-text overlap
- synonym expansion for local terms such as `school id`, `masteral`, `wifi`, `CAT`, `papers`, and `grad`

Answer-text overlap is intentionally weak so this does not become another broad keyword router.

## Phase 2: Soft Integration

The router now follows this order:

1. Use explicit direct structured routes first.
2. Use clarification handling for generic questions.
3. Use local retrieval only if direct routing did not resolve the answer.
4. If retrieval confidence is high, answer directly.
5. If retrieval confidence is medium, ask a clarification question.
6. If retrieval confidence is low, use fallback.

This keeps Rasa as the NLU layer and structured routing as the primary answer path.

## Important Fixes

### Memory Slots for Retrieval Answers

High-confidence retrieval answers now update conversation memory slots.

This allows a retrieved answer to still support follow-up questions.

### Direct Route Paraphrase Tightening

Common high-signal paraphrases were added to direct checks:

- `oral exam`
- `papers`
- `needed`
- `graduate studies`
- `grad application`
- `grad clearance`

## Verified Examples

Required Day 7 examples passed:

- `tell me how could i apply for graduation application` -> `graduation_application_process`
- `what do i need for admission test` -> `exam_requirements`
- `where can i process my school id` -> `student_id_process`
- `do they offer masteral` -> `buksu_masters_courses`
- `how can i get clearance for graduation` -> `graduating_clearance_requirements`

Additional retrieval-only paraphrase passed:

- `what papers for oral exam` -> `dental_oral_examination_requirement`

Explicit location guard passed:

- `where is CAS` -> location response, not course/college retrieval

## Validation

Completed checks:

```powershell
python -m unittest discover -s test -p "test_*.py"
python -m py_compile rasa/actions/actions.py rasa/actions/main_router.py rasa/actions/query_interpreter.py rasa/actions/entity_resolver.py rasa/actions/knowledge_router.py rasa/actions/response_builder.py rasa/actions/data_loader.py rasa/actions/context_manager.py rasa/actions/retrieval_index.py rasa/actions/retrieval_scorer.py rasa/actions/retrieval_result.py
rasa data validate --config config.yml --domain domain.yml --data data
```

Result:

- 40 unit tests passed
- JSON parse check passed
- Python compile check passed
- Structured duplicate check passed with 0 duplicates
- Rasa data validation passed

## Training

After debugging, one NLU weakness was found:

- `what papers for oral exam` was routing correctly through the action layer, but the trained NLU model classified it as `ask_process`.

Fix:

- Added targeted `ask_requirement` examples for dental/oral exam document wording.
- Retrained the Rasa model.

Current latest trained model:

`rasa/models/20260607-122725-acyclic-hearth.tar.gz`

Fresh model sanity checks passed for:

- `where can i get library id`
- `how to get student id`
- `what do i need for admission test`
- `tell me how could i apply for graduation application`
- `how can i get clearance for graduation`
- `where can i process my school id`
- `do they offer masteral`
- `what papers for oral exam`
- `where is CAS`
- `can i eat in classroom`

## Architecture Name

This is still part of:

`Hybrid Layered Architecture (Rasa + Structured Retrieval)`

Day 7 specifically adds:

`Local Retrieval Layer Without LLM`

## Notes for Future Scaling

When the knowledge base grows:

1. Add `subject_terms` for each subject.
2. Add `metadata.phrases` for common real user phrasing.
3. Set `context_topic` correctly so retrieval can match the user purpose.
4. Avoid broad global keywords unless they are unique to the topic.
5. Use retrieval test cases for paraphrases before adding more direct Python rules.
