# Full Knowledge Test Report

Completed: 1 / 1
This invocation: 1.5s. Interrupted: False.
Observed p95 per-query latency: 490.1 ms (router initialization excluded).

This is a routing/answer-match audit, NOT a verified semantic accuracy percentage.
ANSWER_MATCH compares full normalized answer text with the source. ROUTE_MATCH checks the selected ID only.
Flags, duplicates, policy conflicts, gap cases, dynamic lists, language and attachments need human review.
API responses do not expose selected topic IDs; no topic is guessed from a button or an echoed query.

## Statuses

| Status | Count |
| --- | ---: |
| TOPIC_MISMATCH_REVIEW | 1 |

## Category / Language / Context

| Category | Language | Context | Matches | Review/errors |
| --- | --- | --- | ---: | ---: |
| procedures | en | open | 0 | 1 |

## File Integrity

Changed runtime/source files: none detected

## Review Samples

All answers, response payloads and local traces are in results.jsonl. CSV contains all questions and answers.

### K301-EN-01:open - TOPIC_MISMATCH_REVIEW

Query: I can't remember the password for the admissions website. What now?

Expected: `change_portal_password_buksu`; observed: `Change_Pass_admission`.

Response:

> To change your admission password, follow these steps:
> 
> Go to <b>https://admissions.buksu.edu.ph/login</b>
> 
> Login your credentials and proceed to your dashboard
> 
> click your <b>Profile icon</b> to view the choices logout or My Account, and choose <b>My Account</b>
> 
> you can now change your password by just clicking the <b>Change Password button</b>

