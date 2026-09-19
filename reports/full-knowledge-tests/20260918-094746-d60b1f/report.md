# Full Knowledge Test Report

Completed: 6 / 6
This invocation: 61.5s. Interrupted: False.
Observed p95 per-query latency: 25248.2 ms (router initialization excluded).

This is a routing/answer-match audit, NOT a verified semantic accuracy percentage.
ANSWER_MATCH compares full normalized answer text with the source. ROUTE_MATCH checks the selected ID only.
Flags, duplicates, policy conflicts, gap cases, dynamic lists, language and attachments need human review.
API responses do not expose selected topic IDs; no topic is guessed from a button or an echoed query.

## Statuses

| Status | Count |
| --- | ---: |
| ANSWER_MATCH | 4 |
| ANSWER_REVIEW | 2 |

## Category / Language / Context

| Category | Language | Context | Matches | Review/errors |
| --- | --- | --- | ---: | ---: |
| academics | ceb | open | 2 | 1 |
| academics | en | open | 2 | 1 |

## File Integrity

Changed runtime/source files: none detected

## Review Samples

All answers, response payloads and local traces are in results.jsonl. CSV contains all questions and answers.

### K099-CEB-01:open - ANSWER_REVIEW

Query: Pasar ba o hagbong ang 3.0 sa grado sa BukSU?

Expected: `buksu_grading_system`; observed: `not exposed`.

Response:

> Unsaon ug kanus-a nako makuha ang resulta sa akong examination?
> 
> Ang schedule sa pag-release sa examination results ipost sa BukSU Admission and Testing Facebook page.
> 
> Ang resulta sa examination ipost usab sa imong admission account mga bulan sa Mayo hangtod Hunyo.
> 
> Para mahibal-an kung nakapasar ka, login sa imong BukSU Admission account ug ablihi ang Admission tab o Show Exam Result kung available na.

### K099-EN-01:open - ANSWER_REVIEW

Query: Is 3.0 a pass or a fail on a BukSU grade sheet?

Expected: `buksu_grading_system`; observed: `not exposed`.

Response:

> Sorry, I don't have location information for 3.0.

