# Hybrid Layered Architecture (Rasa + Structured Retrieval)

This document describes the current scalable chatbot architecture after the full day-by-day refactor.

The goal is to keep Rasa as the NLU layer while moving the chatbot away from hundreds of fragile topic-specific intents and keyword routers.

## Architecture Summary

The chatbot now follows this layered flow:

```text
User message
  -> Rasa NLU
  -> action_main_router
  -> Query Interpreter
  -> Entity Resolver
  -> Context Manager
  -> Knowledge Router
  -> Response Builder
  -> Frontend-compatible response
```

Rasa should decide the user's purpose. The structured retrieval layer should decide the subject and retrieve the right data.

Final architecture name:

**Context-Aware Structured Retrieval with Local Retrieval Layer**

No LLM or paid AI is required.

## Layer Responsibilities

### 1. Rasa NLU Layer

Files:

- `rasa/data/nlu.yml`
- `rasa/domain.yml`
- `rasa/data/rules.yml`
- `rasa/data/stories.yml`

Rasa now uses broad purpose-based intents:

- `ask_location`
- `ask_schedule`
- `ask_fee`
- `ask_requirement`
- `ask_process`
- `ask_general_info`
- `ask_contact`
- `ask_availability`
- `ask_document`
- `ask_follow_up`
- `smalltalk`

Rasa should not contain one intent per school topic. For example, `online_enrollment_steps`, `library_id_card_requirements`, and `accounting_office_location` should be knowledge records, not Rasa intents.

### 2. Action Entry Layer

File:

- `rasa/actions/actions.py`

Primary action:

- `action_main_router`

`ActionMainRouter` should stay thin. It should receive the Rasa intent and latest message, then delegate to the modular routing layer.

The older `action_reply_from_json` remains for compatibility, but new development should target `action_main_router`.

`ActionMainRouter` is now intentionally thin. Old Phase 1 scoring code was removed from this class; routing belongs in the modular router services.

### 3. Query Interpreter

File:

- `rasa/actions/query_interpreter.py`

Responsibilities:

- normalize user text
- tokenize useful terms
- detect simple multi-question messages

Examples:

```text
where is ComLab 1 and library
```

becomes:

```text
where is comlab 1
library
```

This layer does not answer questions. It only prepares the query.

### 4. Entity Resolver

File:

- `rasa/actions/entity_resolver.py`

Responsibilities:

- collect Rasa entities
- resolve location aliases
- handle room-code patterns
- clean compound entity noise such as `ComLab 1 and`
- preserve text-order location matches

Alias source:

- `rasa/actions/Magical Aliases/aliases.py`

This layer replaces dependence on topic-router keyword matching for locations.

### 5. Knowledge Router

File:

- `rasa/actions/knowledge_router.py`

Responsibilities:

- route `intent + entity/subject` to the best existing knowledge record
- handle direct high-confidence mappings for common short queries
- avoid guessing when the user only says generic phrases like `fees?` or `requirements?`

Examples:

```text
enrollment when
```

routes to:

```text
enrollment_general_process
```

```text
does buksu have masters?
```

routes to:

```text
evening_classes_working_students
```

Generic queries now ask clarification instead of guessing:

```text
fees?
```

returns:

```text
Which fee are you asking about? For example, library ID, enrollment, admission, or student ID.
```

### 6. Context Manager

File:

- `rasa/actions/context_manager.py`

Responsibilities:

- store short-lived conversation focus in Rasa slots
- use previous subject only for incomplete follow-up questions
- prevent sticky-slot bugs by letting explicit subjects override memory
- build follow-up routes from structured JSON metadata
- expire stale context after unanswered generic turns

Example:

```text
User: where can i get library id
Bot: library ID location answer

User: what are the requirements?
Bot: library ID requirements answer
```

Safety rule:

```text
Explicit subject always beats memory.
```

So this still works correctly:

```text
Previous memory: library_id_card
User: where is the library?
Bot: Library Building location/map answer
```

Context slots:

- `conversation_subject`
- `conversation_subject_type`
- `conversation_category`
- `conversation_last_topic`
- `conversation_last_intent`
- `conversation_turns_remaining`

### 7. Data Loader

File:

- `rasa/actions/data_loader.py`

Responsibilities:

- wrap the existing helper and JSON access
- keep old response files compatible
- avoid spreading direct JSON access across routing modules
- flatten structured `Supper Saiyan/*.json` topics into searchable records
- build the context index used by `context_manager.py`

Current data sources:

- `rasa/actions/responses.json`
- `rasa/actions/responses_location.json`
- `rasa/actions/Supper Saiyan/*.json`

Future data sources can be added here without rewriting the NLU or response builder.

The action helper watches JSON modified times and hot-reloads changed files. Pure JSON edits do not require Rasa retraining.

### 8. Response Builder

File:

- `rasa/actions/response_builder.py`

Responsibilities:

- clean legacy text formatting
- strip raw HTML tags
- convert safe `<b>` and `<strong>` tags to markdown bold
- decode HTML entities
- remove exact duplicate sentences and sections
- merge multi-answer text into clean sections
- preserve safe markdown bold for the frontend renderer
- combine map payloads
- dedupe map pins and routes
- emit frontend-compatible responses

For multi-location questions, the response builder creates one merged answer and one combined map payload.

Example:

```text
where is ComLab 1 and library
```

Output shape:

```text
Text section:
- ComLab 1 directions
- Library directions

Map payload:
- combined pins
- combined routes
- shared mapId
```

## Topic Router Status

The old Topic Router approach should no longer be used for new work.

Old folder:

- `rasa/actions/Topic Router/`

Old patterns:

- `*_TOPIC_PATTERNS`
- `detect_topic(...)`
- intent -> topic router -> keyword match

New pattern:

```text
intent + resolved entity/subject -> structured lookup -> response builder
```

The Topic Router files may remain temporarily as legacy code while existing helper methods are migrated. New features should not import or extend them.

## Scaling Rules

When adding new chatbot knowledge:

1. Do not create a new Rasa intent unless the user's purpose is truly new.
2. Add the subject as data, not as an intent.
3. Add aliases in `Magical Aliases/aliases.py` only when needed for resolution.
4. Add direct mappings in `knowledge_router.py` only for high-risk short queries.
5. Keep response formatting in the data simple: plain text lines are preferred.
6. Let `response_builder.py` handle merging, dedupe, and map payload structure.

## Adding Follow-Up-Capable Data

Use `subject_key` on the parent topic when users may ask follow-up questions.

Example:

```json
{
  "topic": "id_card",
  "subject_key": "library_id_card",
  "subject_type": "document",
  "subject_terms": [
    "library id",
    "library id card",
    "library card"
  ],
  "subtopics": [
    {
      "topic": "location",
      "intent": "library_id_card_location",
      "responses": {
        "en": ["..."],
        "ceb": ["..."]
      }
    },
    {
      "topic": "requirements",
      "intent": "library_id_card_requirements",
      "responses": {
        "en": ["..."],
        "ceb": ["..."]
      }
    },
    {
      "topic": "payment",
      "intent": "library_id_card_payment",
      "responses": {
        "en": ["..."],
        "ceb": ["..."]
      }
    }
  ]
}
```

Supported follow-up topic names:

- `location` -> `ask_location`
- `requirements` -> `ask_requirement`
- `payment` -> `ask_fee`
- `process` -> `ask_process`
- `schedule` -> `ask_schedule`
- `contact` -> `ask_contact`
- `availability` -> `ask_availability`

After adding this data, the loader creates a context route like:

```json
{
  "library_id_card": {
    "ask_location": "library_id_card_location",
    "ask_requirement": "library_id_card_requirements",
    "ask_fee": "library_id_card_payment"
  }
}
```

This allows:

```text
User: where can i get library id
Bot: location answer

User: what are the requirements?
Bot: requirements answer

User: how much?
Bot: payment answer
```

## Recommended Future Structure

For long-term scaling, move toward this data model:

```text
knowledge_items
  id
  purpose
  subject
  aliases
  answer_en
  answer_ceb
  map_data
  image_urls
  source
  updated_at
```

The current JSON files can continue to work while the database-backed structure matures.

## Testing Checklist

Run these after changing the architecture:

```powershell
python -m py_compile rasa\actions\actions.py rasa\actions\main_router.py rasa\actions\query_interpreter.py rasa\actions\entity_resolver.py rasa\actions\knowledge_router.py rasa\actions\response_builder.py rasa\actions\data_loader.py
```

For the current architecture, include `context_manager.py`:

```powershell
python -m py_compile rasa\actions\actions.py rasa\actions\main_router.py rasa\actions\query_interpreter.py rasa\actions\entity_resolver.py rasa\actions\knowledge_router.py rasa\actions\response_builder.py rasa\actions\data_loader.py rasa\actions\context_manager.py
```

```powershell
cd rasa
rasa data validate --domain domain.yml --data data
```

Run the context-aware retrieval smoke tests:

```powershell
python -m unittest discover -s test -p test_context_aware_retrieval.py
```

Suggested chat tests:

- `enrollment when`
- `does buksu have masters?`
- `where is ComLab 1`
- `where is ComLab 1 and library`
- `asa ang registrar and accounting office`
- `requirements?`
- `fees?`
- `how to enroll online`
- `requirements for student ID`
- `where can I get INC form`
- `where can i get library id`
- `what are the requirements?`
- `how much?`
- `where is the library?`

## Current Phase Status

Phase 1:

- simplified NLU intents
- broad purpose-based routing

Phase 2:

- modular routing files added
- entity resolver added
- knowledge router added
- data loader added

Phase 3:

- response builder implemented
- multi-answer merge implemented
- map payload merge implemented
- duplicate text and map cleanup implemented
- generic clarification behavior implemented

Phase 4:

- context-aware memory stabilization implemented
- JSON-driven context routes tested
- sticky-slot safety tested
- no-memory clarification tested
- repeatable smoke tests added in `test/test_context_aware_retrieval.py`
