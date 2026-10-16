# Day 1-3 Regression Check

## Scope

This checkpoint validates the work completed from Day 1 through Day 3 before moving to Day 4.

Covered areas:

- JSON parsing for all action knowledge files.
- Python action module compilation.
- Context-aware retrieval tests.
- Targeted Day 2 and Day 3 router conversations.
- Rasa data validation.
- Trained Rasa NLU model sanity check for short admissions/enrollment questions.

## Targeted Conversation Checks

The following questions were checked through `MainRouterService`:

- `where can i get library id`
- `how to get student id?`
- `how to get id?`
- `how to borrow books`
- `how to request good moral certificate`
- `enrollment when`
- `fees?`
- `masters?`
- `requirements for CAT`
- `how to apply for admission`
- `when is admission deadline`
- `what is GPAT`
- `where to get COR`
- `masters admission requirements`

Follow-up memory was also checked:

- `where can i get library id`
- `and whats the requirements?`
- `how much?`

## Fix Applied

Good Moral Certificate routing was tightened in `rasa/actions/knowledge_router.py`.

Before the fix, the response and map were correct, but the route came from fallback scoring, so `conversation_last_intent` was not set. The router now directly maps Good Moral process/document/location/general questions to `request_good_moral_certificate_oss`, preserving memory and follow-up behavior.

## NLU Sanity Check

The latest trained Rasa model correctly classified:

- `enrollment when` -> `ask_schedule`
- `fees?` -> `ask_fee`
- `masters?` -> `ask_availability`
- `requirements for CAT` -> `ask_requirement`
- `how to apply for admission` -> `ask_process`
- `when is admission deadline` -> `ask_schedule`
- `what is GPAT` -> `ask_general_info`
- `where to get COR` -> `ask_process`

## Validation Results

Passed:

- `python -m unittest discover -s test -p "test_*.py"` with 34 tests.
- Python compile check for action modules.
- JSON parse check for 16 JSON files.
- `rasa data validate --config config.yml --domain domain.yml --data data`.

Conclusion:

Day 1 through Day 3 are ready for user testing and safe to proceed toward Day 4.
