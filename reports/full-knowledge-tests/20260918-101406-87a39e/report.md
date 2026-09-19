# Full Knowledge Test Report

Completed: 20 / 20
This invocation: 308.4s. Interrupted: False.
Observed p95 per-query latency: 26989.1 ms (router initialization excluded).

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

### G01-CEB-01:open - GAP_REVIEW

Query: Unsang textbooks ang required sa first semester sa BSIT?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Ang librarya pirmi nag update sa ilang koleksyon busa ang availability sa mga libro mahimong mag usab. Para sa dugang kasayuran adto sa university library ug mangutana sa staff sa matag andana para sa tabang.

### G01-CEB-02:open - GAP_REVIEW

Query: Naa bay required laptop specs para sa first-year IT students?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Oo ang BukSU nagtanyag og Bachelor of Science in Information Technology ubos sa College of Technologies nga nagtutok sa software development network management ug modernong computing solutions.

### G01-CEB-03:open - GAP_REVIEW

Query: Pwede tablet imbes laptop ang gamiton sa freshman sa programming activities?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> I’m not sure I fully understand, and please consider that there is other data I’m not allowed to share. You can try rephrasing your question, or I may not have an answer to that specific question.

### G01-CEB-04:open - GAP_REVIEW

Query: Kinahanglan ba tanan first year mopalit og scientific calculator?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean Freshman Admission Requirements or Freshman Enrollment Requirements?

### G01-CEB-05:open - GAP_REVIEW

Query: Dawaton ba ang secondhand textbooks nga karaang edition?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Ang librarya pirmi nag update sa ilang koleksyon busa ang availability sa mga libro mahimong mag usab. Para sa dugang kasayuran adto sa university library ug mangutana sa staff sa matag andana para sa tabang.

### G01-CEB-06:open - GAP_REVIEW

Query: Kanus-a kasagaran ipanghatag ang syllabus sa mga subject sa first year?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Sorry, I don't have location information for that place yet. Please try a more specific building or office name. If the response is still not found, you can use the map located on the top of mic button.

### G01-CEB-07:open - GAP_REVIEW

Query: Required ba nga iprint tanan syllabus sa subject?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> I’m not sure I fully understand, and please consider that there is other data I’m not allowed to share. You can try rephrasing your question, or I may not have an answer to that specific question.

### G01-CEB-08:open - GAP_REVIEW

Query: Unsay paliton nga supplies sa incoming Biology student sa dili pa ang unang laboratory class?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Ang Bachelor of Science in Biology major in Biotechnology usa ka upat ka tuig nga programa nga nagpunting sa biological sciences nga adunay gibug-aton sa biotechnology applications.
> 
> Nag-andam kini sa mga estudyante alang sa research, laboratory work, ug technology-driven biological fields pinaagi sa pag-eksplorar sa interseksyon sa buhing organismo ug industrial processes.

### G01-CEB-09:open - GAP_REVIEW

Query: Pwede ba magshare ang mga estudyante sa usa ka pinalit nga textbook sa klase?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean Course Shifting or CAT Online vs Walk-in Application?

### G01-CEB-10:open - GAP_REVIEW

Query: Naa bay opisyal nga checklist sa course materials sa first year para sa matag programa?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean Library Available Books or Course Offer Law?

### G01-EN-01:open - GAP_REVIEW

Query: Which textbooks are compulsory for first-semester BSIT?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> The library regularly updates its collection so availability of books may change. For more information visit the university library and ask staff on each floor for assistance.

### G01-EN-02:open - GAP_REVIEW

Query: Is there a required laptop specification for first-year IT students?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Yes BukSU offers a Bachelor of Science in Information Technology under the College of Technologies focusing on software development network management and modern computing solutions.

### G01-EN-03:open - GAP_REVIEW

Query: Can freshmen use a tablet instead of a laptop for programming activities?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean Freshman Maximum Units Policy or Active Student Organizations Guidance?

### G01-EN-04:open - GAP_REVIEW

Query: Do all first-year students need to buy a scientific calculator?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> I’m not sure I fully understand, and please consider that there is other data I’m not allowed to share. You can try rephrasing your question, or I may not have an answer to that specific question.

### G01-EN-05:open - GAP_REVIEW

Query: Are secondhand textbooks accepted if they are an older edition?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> The library regularly updates its collection so availability of books may change. For more information visit the university library and ask staff on each floor for assistance.

### G01-EN-06:open - GAP_REVIEW

Query: When are first-year subject syllabi normally distributed?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> I’m not sure I fully understand, and please consider that there is other data I’m not allowed to share. You can try rephrasing your question, or I may not have an answer to that specific question.

### G01-EN-07:open - GAP_REVIEW

Query: Is a printed copy of every subject syllabus required?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> I’m not sure I fully understand, and please consider that there is other data I’m not allowed to share. You can try rephrasing your question, or I may not have an answer to that specific question.

### G01-EN-08:open - GAP_REVIEW

Query: What supplies should an incoming Biology student buy before the first laboratory class?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Yes, BukSU offers a Bachelor of Science in Biology major in Biotechnology which focuses on biological sciences and biotechnology applications in research and industrial processes.

### G01-EN-09:open - GAP_REVIEW

Query: Are students allowed to share one purchased textbook in class?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> I’m not sure I fully understand, and please consider that there is other data I’m not allowed to share. You can try rephrasing your question, or I may not have an answer to that specific question.

### G01-EN-10:open - GAP_REVIEW

Query: Is there an official first-year course materials checklist for each program?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean Department Heads of CAS or Campus Entry Without Student ID?

