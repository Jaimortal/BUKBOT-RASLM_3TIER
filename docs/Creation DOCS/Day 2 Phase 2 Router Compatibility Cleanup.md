# Day 2 Phase 2 Router Compatibility Cleanup

Date: 2026-06-06

Scope: compatibility cleanup for the new Library and OSS structured data.

## Issues Found During Probing

The new Day 2 Phase 1 structure worked for the main flows, but probing found several routing gaps:

1. `what is the penalty for late books`
   - Previously routed to library ID payment.
   - Expected library late return penalty.

2. `i lost my student id` / `how to replace lost student id`
   - Previously routed to the generic student ID process.
   - Expected lost student ID replacement process.

3. `what is aap`
   - Previously routed to a general admission/CAT answer.
   - Expected Affirmative Action Program answer.

4. Good Moral Certificate follow-up:
   - `how much?` after asking about Good Moral Certificate did not have a dedicated payment route.
   - Expected Good Moral fee answer with the same OSS map.

5. Some structured subtopic intents did not reliably map back to their parent subject for memory.

## Code Changes

### `knowledge_router.py`

Added narrow direct-intent compatibility routes for:

- library book penalties
- library borrow/return/resources questions
- student ID fee
- lost student ID replacement
- Good Moral Certificate fee
- Affirmative Action Program / AAP shorthand

These are compatibility rules for common high-risk short questions, not a return to the old topic-router pattern.

### `context_manager.py`

Added follow-up support for:

- `replacement?` after a student ID conversation
- penalty/fine/replacement/lost terms as valid incomplete follow-up wording

### `data_loader.py`

Improved context indexing:

- each structured subtopic intent is now added to the parent subject's `intent_prefixes`

This helps the memory layer identify that an answer such as `library_late_return_penalty` still belongs to the parent subject `library_borrowing`.

### `Oss_services.json`

Added structured subtopic:

- `good_moral_certificate.payment`
- intent: `good_moral_certificate_fee`
- uses `mapRef: request_good_moral_certificate_oss`

### `Library_info.json`

Added subject terms for library borrowing penalty queries:

- `late books`
- `late return`
- `unreturned book`
- `book penalty`

## Regression Tests Added

Added tests for:

- library late book penalty not routing to library ID payment
- borrowing follow-up penalty
- lost student ID replacement direct question
- lost student ID replacement follow-up
- Good Moral fee follow-up with map
- AAP shorthand routing with map

## Expected Manual Test Questions

Use these in the chat UI after restarting the Rasa action server:

- `what is the penalty for late books`
- `how to borrow books`
- `what is the penalty?`
- `how to get student id`
- `replacement?`
- `i lost my student id`
- `what is aap`
- `how to request good moral certificate`
- `how much?`

## Retraining

No Rasa retraining is required for this phase because:

- no NLU examples changed
- no domain/rules/stories changed
- only action logic, JSON knowledge data, tests, and docs changed

Restart the Rasa action server so Python action changes are loaded.

