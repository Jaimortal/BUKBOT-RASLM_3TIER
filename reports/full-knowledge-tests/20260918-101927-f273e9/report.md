# Full Knowledge Test Report

Completed: 20 / 20
This invocation: 252.7s. Interrupted: False.
Observed p95 per-query latency: 49421.5 ms (router initialization excluded).

This is a routing/answer-match audit, NOT a verified semantic accuracy percentage.
ANSWER_MATCH compares full normalized answer text with the source. ROUTE_MATCH checks the selected ID only.
Flags, duplicates, policy conflicts, gap cases, dynamic lists, language and attachments need human review.
API responses do not expose selected topic IDs; no topic is guessed from a button or an echoed query.

## Statuses

| Status | Count |
| --- | ---: |
| GAP_REVIEW | 20 |

## Category / Language / Context

| Category | Language | Context | Matches | Review/errors |
| --- | --- | --- | ---: | ---: |
| gaps | ceb | open | 0 | 10 |
| gaps | en | open | 0 | 10 |

## File Integrity

Changed runtime/source files: none detected

## Review Samples

All answers, response payloads and local traces are in results.jsonl. CSV contains all questions and answers.

### G02-CEB-01:open - GAP_REVIEW

Query: Unsay buhaton kung invalid ang join code sa Google Classroom?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> I’m not sure I fully understand, and please consider that there is other data I’m not allowed to share. You can try rephrasing your question, or I may not have an answer to that specific question.

### G02-CEB-02:open - GAP_REVIEW

Query: Naa bay opisyal nga maximum file size sa online assignments?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Ang mga assignment pwede ipasa pinaagi sa email o sa mga platform sama sa Google Classroom, depende sa gusto sa inyong instructor. Para mopasa gamit ang Google Classroom:
> 
> **1**. Ablihi ang specific nga subject nga naay pending nga assignment.
> 
> **2**. Kung dili nimo makita, i-tap ang Menu (tulo ka linya) sa ibabaw nga wala ug pilia ang 'To-do'.
> 
> **3**. Pilia ang assignment, i-attach ang imong file, ug i-click ang 'Turn in'.
> 
> **4**. Kung mausab na ang status ngadto sa 'Turned in', kumpleto na ang imong submission.

### G02-CEB-04:open - GAP_REVIEW

Query: Unsay buhaton kung napakyas ang upload hapit na sa deadline?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean FDA Solution or Gate Pass Process?

### G02-CEB-03:open - GAP_REVIEW

Query: PDF ba o Word ang ipasa nga assignment?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Ang mga assignment pwede ipasa pinaagi sa email o sa mga platform sama sa Google Classroom, depende sa gusto sa inyong instructor. Para mopasa gamit ang Google Classroom:
> 
> **1**. Ablihi ang specific nga subject nga naay pending nga assignment.
> 
> **2**. Kung dili nimo makita, i-tap ang Menu (tulo ka linya) sa ibabaw nga wala ug pilia ang 'To-do'.
> 
> **3**. Pilia ang assignment, i-attach ang imong file, ug i-click ang 'Turn in'.
> 
> **4**. Kung mausab na ang status ngadto sa 'Turned in', kumpleto na ang imong submission.

### G02-CEB-06:open - GAP_REVIEW

Query: Naa bay university rule sa naulahi nga buluhaton tungod sa brownout?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Oo, kasagaran ang SBO sa imong espesipikong departamento nagdumala og campus tours aron matabangan ka nga mahibaloan ang importante nga mga building locations. Apan hinumdumi nga kini nagdepende sa imong college department.

### G02-CEB-05:open - GAP_REVIEW

Query: Pwede ba ipasa pag-usab ang assignment human mapindot ang Turn in?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Ang mga assignment pwede ipasa pinaagi sa email o sa mga platform sama sa Google Classroom, depende sa gusto sa inyong instructor. Para mopasa gamit ang Google Classroom:
> 
> **1**. Ablihi ang specific nga subject nga naay pending nga assignment.
> 
> **2**. Kung dili nimo makita, i-tap ang Menu (tulo ka linya) sa ibabaw nga wala ug pilia ang 'To-do'.
> 
> **3**. Pilia ang assignment, i-attach ang imong file, ug i-click ang 'Turn in'.
> 
> **4**. Kung mausab na ang status ngadto sa 'Turned in', kumpleto na ang imong submission.

### G02-CEB-08:open - GAP_REVIEW

Query: Pwede ba motan-aw sa recorded lecture kung maabsent sa online meeting?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean Application Next Step or Change Preferred Course In Admission Application?

### G02-CEB-07:open - GAP_REVIEW

Query: Required ba ang camera sa tanang online class?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean Attendance Requirement or Graduating Clearance Requirements?

### G02-CEB-09:open - GAP_REVIEW

Query: Unsay proseso kung nasayop og attach sa laing klase ang file?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Sorry, I don't have location information for that place yet. Please try a more specific building or office name. If the response is still not found, you can use the map located on the top of mic button.

### G02-CEB-10:open - GAP_REVIEW

Query: Dawaton ba ang screenshots gikan sa phone isip assignment?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Ang mga assignment pwede ipasa pinaagi sa email o sa mga platform sama sa Google Classroom, depende sa gusto sa inyong instructor. Para mopasa gamit ang Google Classroom:
> 
> **1**. Ablihi ang specific nga subject nga naay pending nga assignment.
> 
> **2**. Kung dili nimo makita, i-tap ang Menu (tulo ka linya) sa ibabaw nga wala ug pilia ang 'To-do'.
> 
> **3**. Pilia ang assignment, i-attach ang imong file, ug i-click ang 'Turn in'.
> 
> **4**. Kung mausab na ang status ngadto sa 'Turned in', kumpleto na ang imong submission.

### G02-EN-01:open - GAP_REVIEW

Query: What should students do when the Google Classroom join code is invalid?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> I’m not sure I fully understand, and please consider that there is other data I’m not allowed to share. You can try rephrasing your question, or I may not have an answer to that specific question.

### G02-EN-02:open - GAP_REVIEW

Query: Is there an official maximum file size for online assignments?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Assignments may be submitted via email or through platforms like Google Classroom, depending on your instructor's preference. To submit via Google Classroom:
> 
> **1**. Open the specific subject with the pending assignment.
> 
> **2**. If you can't find it, tap the Menu (three lines) on the top left and select 'To-do.'
> 
> **3**. Select the assignment, attach your file, and click 'Turn in.
> 
> **4**. Once the status changes to 'Turned in,' your submission is complete.

### G02-EN-04:open - GAP_REVIEW

Query: What should I do if an upload failed just before the submission deadline?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> I’m not sure I fully understand, and please consider that there is other data I’m not allowed to share. You can try rephrasing your question, or I may not have an answer to that specific question.

### G02-EN-03:open - GAP_REVIEW

Query: Should assignments be submitted as PDF or Word files?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Assignments may be submitted via email or through platforms like Google Classroom, depending on your instructor's preference. To submit via Google Classroom:
> 
> **1**. Open the specific subject with the pending assignment.
> 
> **2**. If you can't find it, tap the Menu (three lines) on the top left and select 'To-do.'
> 
> **3**. Select the assignment, attach your file, and click 'Turn in.
> 
> **4**. Once the status changes to 'Turned in,' your submission is complete.

### G02-EN-05:open - GAP_REVIEW

Query: Can an assignment be resubmitted after clicking Turn in?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Assignments may be submitted via email or through platforms like Google Classroom, depending on your instructor's preference. To submit via Google Classroom:
> 
> **1**. Open the specific subject with the pending assignment.
> 
> **2**. If you can't find it, tap the Menu (three lines) on the top left and select 'To-do.'
> 
> **3**. Select the assignment, attach your file, and click 'Turn in.
> 
> **4**. Once the status changes to 'Turned in,' your submission is complete.

### G02-EN-06:open - GAP_REVIEW

Query: Is there a university rule for late work caused by a power outage?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> I’m not sure I fully understand, and please consider that there is other data I’m not allowed to share. You can try rephrasing your question, or I may not have an answer to that specific question.

### G02-EN-08:open - GAP_REVIEW

Query: Can students watch recorded lectures if they miss an online meeting?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> I’m not sure I fully understand, and please consider that there is other data I’m not allowed to share. You can try rephrasing your question, or I may not have an answer to that specific question.

### G02-EN-07:open - GAP_REVIEW

Query: Are cameras required for every online class?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean Attendance Requirement or Freshman Enrollment Requirements?

### G02-EN-10:open - GAP_REVIEW

Query: Are phone screenshots accepted as assignment submissions?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Assignments may be submitted via email or through platforms like Google Classroom, depending on your instructor's preference. To submit via Google Classroom:
> 
> **1**. Open the specific subject with the pending assignment.
> 
> **2**. If you can't find it, tap the Menu (three lines) on the top left and select 'To-do.'
> 
> **3**. Select the assignment, attach your file, and click 'Turn in.
> 
> **4**. Once the status changes to 'Turned in,' your submission is complete.

### G02-EN-09:open - GAP_REVIEW

Query: What is the process for correcting an attachment sent to the wrong class?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Continuing students must log in to the admissions portal.
> 
> Click proceed to account migration using the student number.
> 
> Fill in the required information verify the details and submit the application for evaluation.

