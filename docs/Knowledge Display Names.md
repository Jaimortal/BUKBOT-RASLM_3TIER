# Knowledge Display Names

Date: 2026-06-12

## Purpose

`display_name` is a human-readable admin label for knowledge records.

It exists because many structured records use generic machine topics such as:

- `process`
- `requirements`
- `payment`
- `location`
- `schedule`

Those names are safe for JSON structure, but confusing in the admin UI.

## Field Roles

Use these roles consistently:

```json
{
  "topic": "process",
  "display_name": "PE uniform process",
  "intent": "pe_uniform_process",
  "context_topic": "process"
}
```

Meaning:

- `topic`: machine-safe topic key inside the JSON hierarchy.
- `display_name`: admin-friendly label shown in the UI.
- `intent`: stable chatbot routing target.
- `context_topic`: memory/follow-up category.

## Admin Rule

Admins should edit `display_name`, response text, images, maps, pins, and example questions.

Admins should not edit these routing fields in normal mode:

- `topic`
- `intent`
- `context_topic`
- `subject_key`
- `subject_type`

## Migration Completed

Display names were added to:

- all JSON files in `rasa/actions/Supper Saiyan/`
- `rasa/actions/responses.json`

The migration did not rename any existing `topic`, `intent`, `subject_key`, or `context_topic` values.

## Label Preference

Admin list APIs should prefer labels in this order:

```text
display_name -> ui_name -> formatted intent -> formatted topic
```

This keeps old `ui_name` compatibility while moving the system toward clearer labels.
