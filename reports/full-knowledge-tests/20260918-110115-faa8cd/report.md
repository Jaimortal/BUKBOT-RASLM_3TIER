# Full Knowledge Test Report

Completed: 20 / 20
This invocation: 35.6s. Interrupted: False.
Observed p95 per-query latency: 3655.8 ms (router initialization excluded).

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

### G10-CEB-01:open - GAP_REVIEW

Query: Unsay dad-on sa incoming dorm resident sa adlaw sa pagbalhin?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Naghatag ang BukSU og on-campus dormitory facilities para sa mga estudyante.
> 
> Adunay separate dormitories alang sa lalaki ug babae.
> 
> Ang dormitory policies hugot nga ginapatuman aron masiguro ang safety ug proper accommodation.
> 
> Mas maayo nga mangutana sa dormitory office alang sa availability ug requirements.

### G10-CEB-02:open - GAP_REVIEW

Query: Naay gihatag nga bedding ug unlan sa university dormitories?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Naghatag ang BukSU og on-campus dormitory facilities para sa mga estudyante.
> 
> Adunay separate dormitories alang sa lalaki ug babae.
> 
> Ang dormitory policies hugot nga ginapatuman aron masiguro ang safety ug proper accommodation.
> 
> Mas maayo nga mangutana sa dormitory office alang sa availability ug requirements.

### G10-CEB-04:open - GAP_REVIEW

Query: Naa bay refundable deposit sa dili pa mopuyo sa campus dorm?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Naghatag ang BukSU og on-campus dormitory facilities para sa mga estudyante.
> 
> Adunay separate dormitories alang sa lalaki ug babae.
> 
> Ang dormitory policies hugot nga ginapatuman aron masiguro ang safety ug proper accommodation.
> 
> Mas maayo nga mangutana sa dormitory office alang sa availability ug requirements.

### G10-CEB-03:open - GAP_REVIEW

Query: Pwede ba mopili og roommate ang dorm resident?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Naghatag ang BukSU og on-campus dormitory facilities para sa mga estudyante.
> 
> Adunay separate dormitories alang sa lalaki ug babae.
> 
> Ang dormitory policies hugot nga ginapatuman aron masiguro ang safety ug proper accommodation.
> 
> Mas maayo nga mangutana sa dormitory office alang sa availability ug requirements.

### G10-CEB-06:open - GAP_REVIEW

Query: Pwede ba maulahi og balik ang first-year dorm resident tungod sa approved class activity?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Naghatag ang BukSU og on-campus dormitory facilities para sa mga estudyante.
> 
> Adunay separate dormitories alang sa lalaki ug babae.
> 
> Ang dormitory policies hugot nga ginapatuman aron masiguro ang safety ug proper accommodation.
> 
> Mas maayo nga mangutana sa dormitory office alang sa availability ug requirements.

### G10-CEB-05:open - GAP_REVIEW

Query: Pwede ba ang electric kettle sulod sa dorm room?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Naghatag ang BukSU og on-campus dormitory facilities para sa mga estudyante.
> 
> Adunay separate dormitories alang sa lalaki ug babae.
> 
> Ang dormitory policies hugot nga ginapatuman aron masiguro ang safety ug proper accommodation.
> 
> Mas maayo nga mangutana sa dormitory office alang sa availability ug requirements.

### G10-CEB-07:open - GAP_REVIEW

Query: Unsaon pag-request og permiso nga dili matulog sa dorm sa usa ka gabii?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Naghatag ang BukSU og on-campus dormitory facilities para sa mga estudyante.
> 
> Adunay separate dormitories alang sa lalaki ug babae.
> 
> Ang dormitory policies hugot nga ginapatuman aron masiguro ang safety ug proper accommodation.
> 
> Mas maayo nga mangutana sa dormitory office alang sa availability ug requirements.

### G10-CEB-08:open - GAP_REVIEW

Query: Apil ba ang laundry service sa dormitory fee?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Naghatag ang BukSU og on-campus dormitory facilities para sa mga estudyante.
> 
> Adunay separate dormitories alang sa lalaki ug babae.
> 
> Ang dormitory policies hugot nga ginapatuman aron masiguro ang safety ug proper accommodation.
> 
> Mas maayo nga mangutana sa dormitory office alang sa availability ug requirements.

### G10-CEB-10:open - GAP_REVIEW

Query: Unsay mahitabo sa dorm reservation kung malangan ang enrollment approval?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Naghatag ang BukSU og on-campus dormitory facilities para sa mga estudyante.
> 
> Adunay separate dormitories alang sa lalaki ug babae.
> 
> Ang dormitory policies hugot nga ginapatuman aron masiguro ang safety ug proper accommodation.
> 
> Mas maayo nga mangutana sa dormitory office alang sa availability ug requirements.

### G10-CEB-09:open - GAP_REVIEW

Query: Pwede motabang ang ginikanan sa pagdala sa gamit sulod sa dorm sa move-in day?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Naghatag ang BukSU og on-campus dormitory facilities para sa mga estudyante.
> 
> Adunay separate dormitories alang sa lalaki ug babae.
> 
> Ang dormitory policies hugot nga ginapatuman aron masiguro ang safety ug proper accommodation.
> 
> Mas maayo nga mangutana sa dormitory office alang sa availability ug requirements.

### G10-EN-02:open - GAP_REVIEW

Query: Are bedding and pillows provided in university dormitories?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> BukSU provides on-campus dormitory facilities for students.
> 
> Separate dormitories are available for male and female students.
> 
> Dormitory policies are strictly implemented to ensure safety and proper accommodation.
> 
> I recommend contacting the dormitory office for availability and application requirements.

### G10-EN-01:open - GAP_REVIEW

Query: What should an incoming dorm resident bring on move-in day?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> BukSU provides on-campus dormitory facilities for students.
> 
> Separate dormitories are available for male and female students.
> 
> Dormitory policies are strictly implemented to ensure safety and proper accommodation.
> 
> I recommend contacting the dormitory office for availability and application requirements.

### G10-EN-03:open - GAP_REVIEW

Query: Can dorm residents choose their roommate?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> BukSU provides on-campus dormitory facilities for students.
> 
> Separate dormitories are available for male and female students.
> 
> Dormitory policies are strictly implemented to ensure safety and proper accommodation.
> 
> I recommend contacting the dormitory office for availability and application requirements.

### G10-EN-04:open - GAP_REVIEW

Query: Is there a refundable deposit before moving into a campus dorm?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> BukSU provides on-campus dormitory facilities for students.
> 
> Separate dormitories are available for male and female students.
> 
> Dormitory policies are strictly implemented to ensure safety and proper accommodation.
> 
> I recommend contacting the dormitory office for availability and application requirements.

### G10-EN-06:open - GAP_REVIEW

Query: Can first-year dorm residents return late because of an approved class activity?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> BukSU provides on-campus dormitory facilities for students.
> 
> Separate dormitories are available for male and female students.
> 
> Dormitory policies are strictly implemented to ensure safety and proper accommodation.
> 
> I recommend contacting the dormitory office for availability and application requirements.

### G10-EN-05:open - GAP_REVIEW

Query: Are electric kettles allowed in dorm rooms?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> BukSU provides on-campus dormitory facilities for students.
> 
> Separate dormitories are available for male and female students.
> 
> Dormitory policies are strictly implemented to ensure safety and proper accommodation.
> 
> I recommend contacting the dormitory office for availability and application requirements.

### G10-EN-08:open - GAP_REVIEW

Query: Is laundry service included in the dormitory fee?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> BukSU provides on-campus dormitory facilities for students.
> 
> Separate dormitories are available for male and female students.
> 
> Dormitory policies are strictly implemented to ensure safety and proper accommodation.
> 
> I recommend contacting the dormitory office for availability and application requirements.

### G10-EN-07:open - GAP_REVIEW

Query: How does a resident request permission to stay away from the dorm overnight?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> BukSU provides on-campus dormitory facilities for students.
> 
> Separate dormitories are available for male and female students.
> 
> Dormitory policies are strictly implemented to ensure safety and proper accommodation.
> 
> I recommend contacting the dormitory office for availability and application requirements.

### G10-EN-10:open - GAP_REVIEW

Query: What happens to a dorm reservation if enrollment approval is delayed?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> BukSU provides on-campus dormitory facilities for students.
> 
> Separate dormitories are available for male and female students.
> 
> Dormitory policies are strictly implemented to ensure safety and proper accommodation.
> 
> I recommend contacting the dormitory office for availability and application requirements.

### G10-EN-09:open - GAP_REVIEW

Query: Can parents help carry belongings into the dorm on move-in day?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> BukSU provides on-campus dormitory facilities for students.
> 
> Separate dormitories are available for male and female students.
> 
> Dormitory policies are strictly implemented to ensure safety and proper accommodation.
> 
> I recommend contacting the dormitory office for availability and application requirements.

