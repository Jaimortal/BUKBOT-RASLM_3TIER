# Day 3 Phase 2 NLU Check

## Scope

This phase checked NLU coverage for the newly structured admissions and enrollment data.

No new topic-specific intents were added. The chatbot still uses broad purpose intents:

- `ask_location`
- `ask_schedule`
- `ask_fee`
- `ask_requirement`
- `ask_process`
- `ask_general_info`
- `ask_availability`
- `ask_document`
- `smalltalk`

## NLU Updates

Added focused examples to `rasa/data/nlu.yml` for short and paraphrased questions:

- `when is admission deadline`
- `admission until when`
- `deadline for CAT`
- `CAT fee`
- `how much is CAT`
- `requirements for CAT`
- `what do I need for admission test`
- `masters admission requirements`
- `GPAT requirements`
- `how can I apply for admission`
- `how do I apply for CAT`
- `where to get COR`
- `what is GPAT`
- `masters?`
- `does buksu have masters`

## Router Adjustment

`rasa/actions/knowledge_router.py` now routes general GPAT questions to `gpat_admission_requirements`, because the current knowledge base has GPAT requirements but does not yet have a separate GPAT definition record.

## Tested Questions

Manual router checks were run for:

- `enrollment when`
- `fees?`
- `masters?`
- `requirements for CAT`
- `how to apply for admission`
- `when is admission deadline`
- `what is GPAT`
- `where to get COR`

Expected behavior:

- `fees?` asks clarification because the fee subject is ambiguous.
- `what is GPAT` answers using the GPAT requirements record until a separate definition is added.

## Validation

Completed checks:

- `python -m unittest discover -s test -p "test_*.py"` passed with 34 tests.
- Python compile check passed.
- `rasa data validate --config config.yml --domain domain.yml --data data` passed.
- `rasa train --config config.yml --domain domain.yml --data data` completed successfully.

New trained model:

- `rasa/models/20260606-123112-level-madeira.tar.gz`
