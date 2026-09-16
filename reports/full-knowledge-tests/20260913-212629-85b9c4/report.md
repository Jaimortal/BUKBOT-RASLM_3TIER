# Full Knowledge Test Report

Completed: 2 / 2
This invocation: 43.1s. Interrupted: False.
Observed p95 per-query latency: 20000.0 ms (router initialization excluded).

This is a routing/answer-match audit, NOT a verified semantic accuracy percentage.
ANSWER_MATCH compares full normalized answer text with the source. ROUTE_MATCH checks the selected ID only.
Flags, duplicates, policy conflicts, gap cases, dynamic lists, language and attachments need human review.
API responses do not expose selected topic IDs; no topic is guessed from a button or an echoed query.

## Statuses

| Status | Count |
| --- | ---: |
| ERROR | 2 |

## Category / Language / Context

| Category | Language | Context | Matches | Review/errors |
| --- | --- | --- | ---: | ---: |
| academics | ceb | open | 0 | 1 |
| academics | en | open | 0 | 1 |

## File Integrity

Changed runtime/source files: none detected

## Review Samples

All answers, response payloads and local traces are in results.jsonl. CSV contains all questions and answers.

### K001-CEB-01:open - ERROR

Query: Nag-lecture among maestra, okay ra motan-aw og message sa cp?

Expected: `phone_use_in_class`; observed: `not exposed`.

Response:

> Router query timed out

### K001-EN-01:open - ERROR

Query: Our teacher is lecturing. Can I check a message on my phone?

Expected: `phone_use_in_class`; observed: `not exposed`.

Response:

> Router query timed out

