# Full Knowledge Test Report

Completed: 20 / 20
This invocation: 372.6s. Interrupted: False.
Observed p95 per-query latency: 45939.7 ms (router initialization excluded).

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

### G06-CEB-02:open - GAP_REVIEW

Query: Naa bay short-term device loan ang BukSU para sa walay computer?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Oo, kasagaran ang SBO sa imong espesipikong departamento nagdumala og campus tours aron matabangan ka nga mahibaloan ang importante nga mga building locations. Apan hinumdumi nga kini nagdepende sa imong college department.

### G06-CEB-01:open - GAP_REVIEW

Query: Pwede ba makahulam og laptop sa unibersidad ang first year para sa klase?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> I’m not sure I fully understand, and please consider that there is other data I’m not allowed to share. You can try rephrasing your question, or I may not have an answer to that specific question.

### G06-CEB-03:open - GAP_REVIEW

Query: Naa bay locker rental para sa estudyante?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean Library Available Books or Library Facility Availability?

### G06-CEB-04:open - GAP_REVIEW

Query: Unsaon pagreserve og locker para sa semester?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean Take Exam or Library Borrow Books Process?

### G06-CEB-05:open - GAP_REVIEW

Query: Pwede ba magcharge og phone sa saksakan sa classroom?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Bawal gyud kaayo ang paggamit og cellphone samtang nagklase, labi na kung nag-discuss ang maestro/maestra, pero kung gamiton sa activities ug uban pang curricular activities, magdepende na na sa classroom rules nga gipahimutang sa maestro/maestra.

### G06-CEB-06:open - GAP_REVIEW

Query: Pwede ba isaksak ang kaugalingong laptop sa power outlet sa library?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Ang Library nahimutang sa wala nga bahin sa museum kung nag-atubang ka sa atubangan sa building. Adunay klarong signage aron sayon ra mailhan, ug naghatag ko og mapa aron matabangan ka sa pag-navigate.

### G06-CEB-08:open - GAP_REVIEW

Query: Nagpahulam ba ang school og extension cord para sa class presentation?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Bukidnon State University is a state university located in Malaybalay City, Bukidnon, Philippines. The school was formerly known as Bukidnon State College. It is the only university in the Province of Bukidnon that carries the name of Bukidnon in its official name.
> 
> Bukidnon State University is currently TOP 400 World University Rankings for Innovation (WURI) 2025

### G06-CEB-07:open - GAP_REVIEW

Query: Naa bay secure nga kabutangan sa laptop tali sa mga klase?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean Library Available Books or Library Facility Availability?

### G06-CEB-10:open - GAP_REVIEW

Query: Kinsay moasikaso sa hinulamang classroom device nga dili na mogana samtang gigamit?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Sorry, I don't have location information for that place yet. Please try a more specific building or office name. If the response is still not found, you can use the map located on the top of mic button.

### G06-CEB-09:open - GAP_REVIEW

Query: Pwede makahulam og projector ang first-year class para sa presentation?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> I’m not sure I fully understand, and please consider that there is other data I’m not allowed to share. You can try rephrasing your question, or I may not have an answer to that specific question.

### G06-EN-01:open - GAP_REVIEW

Query: Can first-year students borrow a university laptop for class work?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> I’m not sure I fully understand, and please consider that there is other data I’m not allowed to share. You can try rephrasing your question, or I may not have an answer to that specific question.

### G06-EN-02:open - GAP_REVIEW

Query: Does BukSU have a short-term device loan for students without computers?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> I’m not sure I fully understand, and please consider that there is other data I’m not allowed to share. You can try rephrasing your question, or I may not have an answer to that specific question.

### G06-EN-03:open - GAP_REVIEW

Query: Is there a student locker rental system?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean Access SIAS or Visitors?

### G06-EN-04:open - GAP_REVIEW

Query: How can a student reserve a locker for the semester?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> I’m not sure I fully understand, and please consider that there is other data I’m not allowed to share. You can try rephrasing your question, or I may not have an answer to that specific question.

### G06-EN-05:open - GAP_REVIEW

Query: Are students allowed to charge phones from classroom outlets?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Sorry, I don't have location information for that place yet. Please try a more specific building or office name. If the response is still not found, you can use the map located on the top of mic button.

### G06-EN-06:open - GAP_REVIEW

Query: Can students plug personal laptops into library power outlets?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Library is located on the left side of museum facing front, you can easily find it sinse its has a signage on the front of the building, but i will provide some map to help you navigate

### G06-EN-07:open - GAP_REVIEW

Query: Is there a secure place to leave a laptop between classes?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> I’m not sure I fully understand, and please consider that there is other data I’m not allowed to share. You can try rephrasing your question, or I may not have an answer to that specific question.

### G06-EN-08:open - GAP_REVIEW

Query: Does the school lend extension cords for class presentations?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Bukidnon State University is a state university located in Malaybalay City, Bukidnon, Philippines. The school was formerly known as Bukidnon State College. It is the only university in the Province of Bukidnon that carries the name of Bukidnon in its official name.
> 
> Bukidnon State University is currently TOP 400 World University Rankings for Innovation (WURI) 2025

### G06-EN-10:open - GAP_REVIEW

Query: Who handles a borrowed classroom device that stops working during use?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Sorry, I don't have location information for that place yet. Please try a more specific building or office name. If the response is still not found, you can use the map located on the top of mic button.

### G06-EN-09:open - GAP_REVIEW

Query: Can a first-year class borrow a projector for a presentation?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean Eating In Classroom or Campus Entry Without Student ID?

