# Day 1 Phase 2 Architecture Confirmation

Date: 2026-06-06

Scope: confirm the target architecture rules before restructuring more data.

## Final Architecture Name

The working architecture name is:

**Context-Aware Structured Retrieval with Local Retrieval Layer**

Short defense-friendly explanation:

Rasa remains the NLU layer. Rasa detects the user's purpose, while the structured retrieval layer resolves the subject, conversation context, official answer, map payload, and image payload from controlled school data. No LLM is required.

## Final Layer Flow

```text
User message
  -> Frontend chat session
  -> Express backend
  -> Rasa REST webhook
  -> Rasa NLU intent/entity prediction
  -> action_main_router
  -> Query Interpreter
  -> Entity Resolver
  -> Context Manager
  -> Knowledge Router
  -> Data Loader
  -> Response Builder
  -> Frontend-compatible text/image/map response
```

## Layer Rules

### 1. Rasa NLU

Rasa should identify user purpose, not every school topic.

Approved broad intents:

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
- `goodbye`
- `bot_challenge`
- `nlu_fallback`

Do not add one Rasa intent per topic unless there is a strong reason. For normal knowledge expansion, add structured data, metadata phrases, and retrieval records instead.

### 2. Entities

Entities are used for subjects and details, not for final answers.

Current entity set:

- `location_name`
- `service`
- `office`
- `document`
- `program`
- `organization`
- `time_period`
- `topic`
- `lab_number`

### 3. Action Entry

Primary action:

- `action_main_router`

Compatibility action:

- `action_reply_from_json`

New development should target `action_main_router`. The old topic-router wrapper methods in `actions.py` are legacy compatibility and should not receive new routing logic.

## Final Structured Data Model

Preferred parent topic shape:

```json
{
  "topic": "student_id",
  "subject_key": "student_id",
  "subject_type": "document",
  "subject_terms": [
    "student id",
    "school id"
  ],
  "subtopics": [
    {
      "topic": "process",
      "intent": "student_id_process",
      "context_topic": "process",
      "responses": {
        "en": ["..."],
        "ceb": ["..."]
      },
      "metadata": {
        "phrases": [
          "how to get student id",
          "where to process student id"
        ]
      }
    }
  ]
}
```

Required or recommended fields:

- `topic`
- `subject_key`
- `subject_type`
- `subject_terms`
- `subtopics`
- subtopic `topic`
- subtopic `intent`
- subtopic `context_topic` when the subtopic name is not enough
- `responses.en`
- `responses.ceb`
- `metadata.phrases`
- `images` or `imageUrls` when needed
- `mapData`, `mapRef`, or `map` + `pins` + `routes` when needed

Keyword rules:

- `metadata.phrases` should be preferred for examples and paraphrases.
- `strong_keywords` may be used only for specific terms that do not appear globally.
- `weak_keywords` may be used only as support, not as the main route.
- Avoid global strong keywords such as `requirements`, `fee`, `apply`, `schedule`, `process`, `id`, `where`, and `get`.

## Memory Behavior Rules

Conversation memory is short-lived and stored in Rasa slots:

- `conversation_subject`
- `conversation_subject_type`
- `conversation_category`
- `conversation_last_topic`
- `conversation_last_intent`
- `conversation_turns_remaining`

Rules:

1. Explicit subject always overrides memory.
2. Follow-up memory is used only for incomplete follow-up questions.
3. Memory expires after a small number of turns.
4. Ambiguous bare terms should trigger clarification.
5. A new frontend chat session must use a different Rasa sender ID.
6. Memory should not be used to override a clear location request.

Example:

```text
User: where can i get library id
Bot: library ID location answer

User: what are the requirements?
Bot: library ID requirements answer
```

Explicit override example:

```text
Memory: library_id_card
User: where can i find the library?
Bot: Library location answer, not library ID answer
```

Ambiguity example:

```text
User: how to get id?
Bot: Which ID do you mean, student ID or library ID?

User: student id
Bot: student ID process answer
```

## Session Compatibility Rule

The backend must send the browser chat session ID as the Rasa `sender`.

Correct REST payload:

```json
{
  "sender": "session_...",
  "message": "where can i get library id"
}
```

Reason:

Rasa tracker memory is stored per sender. If every request uses `sender: "user"`, different browser tabs can share the same memory and cause wrong follow-up answers.

Implemented compatibility fix:

- `server/rasa.ts` now uses `sessionId || "user"` as the Rasa sender.

## Map Compatibility Rules

The system must support all current map formats:

1. `responses.json`
   - `responses.mapData`

2. `responses_location.json`
   - `coordinates`
   - `map_id` / `mapId`
   - `pins`
   - `routes`

3. `Supper Saiyan/*.json`
   - `mapData`
   - `map`
   - `pins`
   - `routes`
   - `mapRef`

Future restructuring should preserve map data first, then group the response text.

## Admin Compatibility Rules

The current admin panel can edit flat topics, locations, images, and map pins, but it is not yet complete for grouped subject/subtopic data.

Required future admin upgrade:

- Add or upgrade a `Knowledge Manager`.
- It must show parent subjects and child subtopics.
- It must preserve unknown JSON fields when saving.
- It must safely edit:
  - responses
  - Cebuano/English text
  - subject terms
  - metadata phrases
  - images
  - map data
  - mapRef
  - pins/routes

Formatting rule:

- Prefer safe markdown bold such as `**Important:**`.
- Avoid unsafe raw HTML rendering in the chat UI.

## Local Retrieval Layer Rules

The retrieval layer will be added later without an LLM.

It should use:

- normalized text
- subject terms
- metadata phrases
- topic/context topic
- exact phrase bonus
- token overlap
- alias expansion
- confidence thresholds

Response policy:

- High confidence: answer.
- Medium confidence: ask clarification.
- Low confidence: fallback.

Rasa remains the official NLU layer. The local retrieval layer is not an LLM and does not generate unofficial answers.

## Day 1 Phase 2 Decision

The architecture is confirmed.

Next safe work:

1. Day 2 should start with `Library_info.json` and `Oss_services.json`.
2. Do not restructure `responses_location.json`.
3. Do not migrate everything to PostgreSQL yet.
4. Do not add LLM features.
5. Do not add new topic-router logic.

