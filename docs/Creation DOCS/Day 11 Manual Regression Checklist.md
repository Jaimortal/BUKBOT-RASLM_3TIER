# Day 11 Manual Regression Checklist

Use this checklist when testing the chatbot manually after Day 11.

## Short Questions

- `enrollment when`
- `fees?`
- `masters?`
- `where is the clinic`
- `library hours`
- `student fees`
- `what is GPAT`

Expected:

- The bot should answer with a real topic response.
- It should not answer with an unrelated super-intent topic.
- It should not return a blank message.

## Follow-Up Questions

Test this sequence:

1. `where can i get library id`
2. `what are the requirements?`
3. `how much?`

Expected:

- First answer should mention the second floor of the library.
- Follow-up requirements should mention COR.
- Follow-up fee should stay about library ID, not admission fees.

Test this sequence:

1. `how to get student id`
2. `what are the requirements?`
3. `how much?`

Expected:

- First answer should mention University Press.
- Requirements/payment should stay about student ID.
- Map should display when the answer includes map data.

## Ambiguous Questions

- `how to get id?`
- `where do i get id?`
- `how much?`
- `what are the requirements?`

Expected:

- Bare ID questions should ask whether the user means student ID or library ID.
- Generic fee/requirement questions without memory should ask for clarification.
- The bot should not assume library ID just because the word `id` appears.

## Map Questions

- `where can i find the avc?`
- `how to get student id`
- `how to request good moral certificate`
- `how to get wifi access`
- `where is the clinic`

Expected:

- Map should display when `mapData`, `mapRef`, or `map + pins + routes` exists.
- Duplicate pins should not appear in merged responses.
- Text and map should appear together as one coherent answer when possible.

## Image Questions

- `admission contact`
- `change admission password`
- `find institutional account`
- `who is the president of buksu`

Expected:

- Images should display if the JSON record has `images` or `imageUrls`.
- Text should still appear even if image loading fails in the browser.

## Cebuano Questions

- `asa makuha ang library id`
- `pila bayad sa library id`
- `unsaon pagkuha og student id`
- `asa ang clinic`
- `naa bay dormitory ang buksu`

Expected:

- Cebuano responses should be used when available.
- If Cebuano response is missing, English fallback is acceptable.
- Routing should still choose the same correct subject.

## Retrieval Paraphrases

- `tell me how could i apply for graduation application`
- `what do i need for admission test`
- `where can i process my school id`
- `do they offer masteral`
- `how can i get clearance for graduation`
- `what papers for oral exam`

Expected:

- These should route through structured lookup or local retrieval.
- No LLM is required.
- Explicit location questions should not be overridden by retrieval.

## Admin-Edited Questions

After editing a JSON response in Knowledge Manager:

1. Save a small text change.
2. Ask the chatbot about that same topic.
3. Check `backups/json/knowledge/`.

Expected:

- The edited answer should appear after action hot reload.
- A timestamped backup should exist.
- No Rasa retrain should be needed for pure JSON changes.

After adding a new subtopic in Knowledge Manager:

1. Add parent or subtopic data.
2. Add clear `subject_terms` and `metadata.phrases`.
3. Ask one phrase from the metadata.

Expected:

- The answer should work if the retrieval layer has enough subject/phrase signal.
- If it does not, add better phrases first before adding new Rasa NLU examples.

## Fallback Behavior

- `zzzz unknown capstone-only phrase`
- `random thing not in school data`

Expected:

- The bot should return a nonblank fallback response.
- It should not store misleading memory slots.
