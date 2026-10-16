# Day 11 Full Regression Testing Checklist

Use this checklist after restarting the Rasa action server. Retrain Rasa only if `nlu.yml`, `domain.yml`, `rules.yml`, or `stories.yml` changed.

## Short Questions

- courses
- enrollment time
- admission requirements
- masters?
- tba?
- id validation
- COR validation
- library hours
- clinic location
- parking area

Expected result: short questions should either answer directly or show useful choices. They should not route to unrelated office hours, late enrollment, or location fallback.

## Follow-Up Questions

1. Ask: `where can i get library id`
2. Follow up: `what are the requirements?`
3. Follow up: `how much?`

Expected result: follow-ups should stay on library ID.

1. Ask: `can you show me offices under COB building`
2. Follow up: `how about COT?`

Expected result: follow-up should still mean offices under the building, not COT courses.

1. Ask: `when is COR validation?`
2. Follow up: `how to validate it?`

Expected result: follow-up should answer COR validation process without asking ID/COR clarification again.

## Ambiguous Questions

- how to get id?
- when is admission?
- how validate?
- services
- faculty office
- dean office

Expected result: these should show clarification choices instead of guessing.

## Map Questions

- where is AVC?
- where is administrative building?
- where is COT Dean's Office?
- where is CAS SBO office?
- where can i park my motorcycle?
- how to get PE uniform?

Expected result: maps should display pins and routes. Specific offices should not also include broad building answers unless the question asks for building offices.

## Image Questions

- test permit corrupted
- LRN issue
- admission test permit problem

Expected result: if the data has image payloads, the image should appear after the answer.

## Cebuano Questions

- unsay course na available diris buksu?
- asa makita akong admission test result?
- unsaon nako pagkuha og library id?
- asa ko magpa validate sa COR?
- pila ang bayad sa student id?
- unsaon pag enroll kung freshman ko?

Expected result: Bisaya questions should route to the right topic and prefer Cebuano response text when available.

## Admin-Edited Questions

Before testing:

1. Edit a safe response text in Knowledge Manager.
2. Save it.
3. Ask the matching question in the chatbot.
4. Confirm the answer updates after hot reload.
5. Check that a backup was created under `backups/json/knowledge/`.

Also test:

- Edit a map pin/route in Knowledge Manager.
- Edit an image in Knowledge Manager.
- Edit a location in Locations.
- Edit map settings in Settings.

Expected result: admin saves should not require Rasa retraining. JSON backups should be created before saves.

## Safety Checks

- Ask an unknown question: `blue pencil dragon schedule`
- Ask a mixed but valid question: `can you help me enroll as first year taking BS Philosophy`
- Ask a typo question: `is late enrol allowed`

Expected result: unknown questions should fallback safely. Valid messy questions should route to the closest correct structured answer.
