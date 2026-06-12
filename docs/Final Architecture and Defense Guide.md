# Final Architecture and Defense Guide

## Architecture Name

**Context-Aware Structured Retrieval with Local Retrieval Layer**

The system remains an NLU-based Rasa chatbot. It does not use an LLM or paid AI service.

## High-Level Flow

```text
User message
-> Rasa NLU
-> action_main_router
-> query interpretation
-> entity resolution
-> context memory
-> structured lookup
-> local retrieval fallback
-> response builder
-> React chat UI
```

## How Rasa NLU Works

Rasa is responsible for detecting the user's broad purpose.

Current purpose intents include:

- `ask_location`
- `ask_schedule`
- `ask_fee`
- `ask_requirement`
- `ask_process`
- `ask_general_info`
- `ask_contact`
- `ask_availability`
- `ask_document`
- `smalltalk`

Rasa should not contain one intent for every school topic. Specific answers such as `library_id_card_requirements` or `student_id_process` live in the knowledge JSON and action layer.

## How Structured Retrieval Works

Structured knowledge files live in:

- `rasa/actions/Supper Saiyan/*.json`

Preferred data model:

- `topic`
- `subject_key`
- `subject_type`
- `subject_terms`
- `subtopics`
- `intent`
- `context_topic`
- `responses.en`
- `responses.ceb`
- `metadata.phrases`
- optional `images`
- optional `mapData`, `mapRef`, or `map + pins + routes`

The data loader flattens these grouped records into searchable entries while preserving the original JSON structure for admin editing.

## Local Retrieval Layer

The local retrieval layer improves paraphrase handling without using an LLM.

It scores records using:

- user purpose intent
- subject terms
- metadata phrases
- topic/context terms
- token overlap
- simple synonym expansion
- confidence thresholds

Routing behavior:

- high confidence: answer
- medium confidence: clarify
- low confidence: fallback

## Why No LLM Is Required

The project is defensible as an NLU-based chatbot because:

- Rasa performs intent/entity detection.
- The knowledge base is structured and deterministic.
- Retrieval is local and rule/scoring based.
- Responses come from approved JSON records.
- The bot does not generate unsupported answers.
- Admins control the data through the admin panel.

This keeps the system explainable for capstone defense.

## Context Memory

Context memory is short-lived and stored in Rasa slots:

- `conversation_subject`
- `conversation_subject_type`
- `conversation_category`
- `conversation_last_topic`
- `conversation_last_intent`
- `conversation_turns_remaining`

Example:

```text
User: where can i get library id
Bot: library ID location answer

User: what are the requirements?
Bot: library ID requirements answer
```

Safety rules:

- explicit subject overrides memory
- memory expires after a few turns
- bare ambiguous `id` questions trigger clarification
- a new browser/session should not rely on old memory

## Admin Updater

The admin Knowledge Manager can:

- browse structured records
- edit existing records
- create parent subjects
- create subtopics
- edit responses
- edit subject terms
- edit metadata phrases
- edit images
- edit map fields
- edit `mapRef`

Safety features:

- preserves unknown JSON fields
- does not flatten grouped data
- rejects accidental topic key rename
- creates backups before JSON writes
- supports hot reload on the Rasa action side

Backups:

- `backups/json/knowledge/`
- `backups/json/super-intents/`

## Maps And Images

Maps can be attached through:

- old `responses.json` `responses.mapData`
- structured `mapData`
- structured `map + pins + routes`
- `mapRef` to reuse another topic's map
- `responses_location.json` for location answers

Images can be attached through:

- `images`
- `imageUrls`
- admin-uploaded `/api/images/...` URLs

The response builder keeps map and image payloads frontend-compatible.

## Safe Text Formatting

Safe bold formatting is supported.

Rules:

- Admins may store markdown bold as `**text**`.
- Existing `<b>` and `<strong>` tags are converted to markdown bold.
- Other raw HTML is stripped by the response builder.
- The chat UI escapes text before rendering markdown bold and links.

## How To Add New Data

Recommended admin flow:

1. Open Admin Panel.
2. Go to Responses.
3. Open Knowledge Manager.
4. Create a parent subject if the subject does not exist.
5. Add one or more subtopics.
6. Add clear `subject_terms`.
7. Add realistic `metadata.phrases`.
8. Add English and Cebuano responses.
9. Add images or map data if needed.
10. Save and test in chat.

Retraining is not needed for pure JSON changes.

Retraining is needed when editing:

- `rasa/data/nlu.yml`
- `rasa/domain.yml`
- `rasa/data/rules.yml`
- `rasa/data/stories.yml`

## Debugging Common Problems

Wrong answer:

1. Check Rasa intent/entity result.
2. Check direct structured route.
3. Check retrieval top candidates and scores.
4. Check `subject_terms` and `metadata.phrases`.
5. Add better phrases before adding new Rasa intents.

Wrong follow-up:

1. Check `conversation_subject`.
2. Check `conversation_turns_remaining`.
3. Check if the new user message has an explicit subject.
4. Confirm the subject has route mappings in the context index.

Missing map:

1. Check if the response contains `custom.mapData`.
2. Check if the JSON has `mapData`, `mapRef`, or `map + pins + routes`.
3. If using `mapRef`, confirm it points to an existing topic or intent.
4. Check Express `/api/chat` output for `mapData`.

Missing image:

1. Check `images` or `imageUrls` in JSON.
2. Check uploaded image URL exists.
3. Check frontend message payload.

Admin save issue:

1. Check browser console.
2. Check Express logs.
3. Check JSON validity.
4. Check latest backup in `backups/json/`.

Blank fallback:

1. Confirm `nlu_fallback` exists in `responses.json`.
2. Confirm fallback resolves to text.
3. Run automated tests.

## Final Acceptance Status

- Rasa remains the NLU layer: complete.
- No LLM is required: complete.
- Old topic routing is not needed for normal answers: complete.
- Supper Saiyan data is structured across the major knowledge files: complete.
- Local retrieval handles paraphrases: complete.
- Context memory handles follow-ups: complete.
- Ambiguous ID questions clarify: complete.
- Maps support old and new formats: complete.
- Images display from admin-uploaded URLs: complete.
- Admin can edit structured knowledge: complete.
- Admin can add new structured knowledge: complete.
- Safe bold formatting works: complete.
- JSON validation passes: complete.
- Rasa validation passes: complete.
- Python tests pass: complete.
- Manual user testing can begin: ready.
