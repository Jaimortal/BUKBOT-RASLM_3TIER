# Full Knowledge Test Report

Completed: 20 / 20
This invocation: 74.1s. Interrupted: False.
Observed p95 per-query latency: 24859.4 ms (router initialization excluded).

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

### G09-CEB-01:open - GAP_REVIEW

Query: Naa bay drinking-water refill station nga libre gamiton sa estudyante?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Ang pagkaon sulod sa classroom depende sa rules sa instructor.

### G09-CEB-02:open - GAP_REVIEW

Query: Pwede magdala og packed lunch sa lingkoranan sa cafeteria?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Oo, naa ang BukSU og main Cafeteria nga nahimutang atubangan sa New CAS Building.
> 
> Pwede moadto ang students didto during available hours para mopalit og pagkaon o mopahuway.

### G09-CEB-03:open - GAP_REVIEW

Query: Modawat ba og cashless payment ang campus cafeteria?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Adunay usa ka bag-ong cafeteria sa campus, kini nahimutang atubangan sa New Cas Building. Adunay gihatag nga mapa aron matabangan ka sa pag-navigate.

### G09-CEB-04:open - GAP_REVIEW

Query: Naa bay vegetarian meals nga regular sa cafeteria?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Oo, naa ang BukSU og main Cafeteria nga nahimutang atubangan sa New CAS Building.
> 
> Pwede moadto ang students didto during available hours para mopalit og pagkaon o mopahuway.

### G09-CEB-05:open - GAP_REVIEW

Query: Naa bay gipatik nga allergy information sa pagkaon sa cafeteria?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Oo, naa ang BukSU og main Cafeteria nga nahimutang atubangan sa New CAS Building.
> 
> Pwede moadto ang students didto during available hours para mopalit og pagkaon o mopahuway.

### G09-CEB-06:open - GAP_REVIEW

Query: Pwede magrefill sa kaugalingong water bottle sulod sa campus buildings?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Sorry, I don't have location information for that place yet. Please try a more specific building or office name. If the response is still not found, you can use the map located on the top of mic button.

### G09-CEB-08:open - GAP_REVIEW

Query: Naa bay microwave nga magamit sa estudyante sa pag-init sa baon?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean Library Available Books or Library Facility Availability?

### G09-CEB-07:open - GAP_REVIEW

Query: Required ba ang reusable utensils kung mopalit og pagkaon sa campus?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Ang pagkaon sulod sa classroom depende sa rules sa instructor.

### G09-CEB-10:open - GAP_REVIEW

Query: Kinsay moasikaso sa reklamo bahin sa napalit sa cafeteria?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Oo, naa ang BukSU og main Cafeteria nga nahimutang atubangan sa New CAS Building.
> 
> Pwede moadto ang students didto during available hours para mopalit og pagkaon o mopahuway.

### G09-CEB-09:open - GAP_REVIEW

Query: Pwede ba mamaligya og snacks sa classmates sulod sa campus?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Ang pagkaon sulod sa classroom depende sa rules sa instructor.

### G09-EN-01:open - GAP_REVIEW

Query: Are there drinking-water refill stations students can use for free?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Eating inside classrooms depends on the rules set by the instructor.

### G09-EN-02:open - GAP_REVIEW

Query: Can students bring packed lunches into the cafeteria seating area?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Yes, BukSU has a main Cafeteria located in front of the New CAS Building.
> 
> Students may go there during available hours to buy food or take a break.

### G09-EN-03:open - GAP_REVIEW

Query: Does the campus cafeteria accept cashless payments?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Yes, BukSU has a main Cafeteria located in front of the New CAS Building.
> 
> Students may go there during available hours to buy food or take a break.

### G09-EN-04:open - GAP_REVIEW

Query: Are vegetarian meals regularly available in the cafeteria?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Yes, BukSU has a main Cafeteria located in front of the New CAS Building.
> 
> Students may go there during available hours to buy food or take a break.

### G09-EN-05:open - GAP_REVIEW

Query: Is there a published allergy-information list for cafeteria food?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Yes, BukSU has a main Cafeteria located in front of the New CAS Building.
> 
> Students may go there during available hours to buy food or take a break.

### G09-EN-06:open - GAP_REVIEW

Query: Can students refill their own water bottles inside campus buildings?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Sorry, I don't have location information for that place yet. Please try a more specific building or office name. If the response is still not found, you can use the map located on the top of mic button.

### G09-EN-07:open - GAP_REVIEW

Query: Are reusable utensils required when buying food on campus?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Sorry, I don't have location information for that place yet. Please try a more specific building or office name. If the response is still not found, you can use the map located on the top of mic button.

### G09-EN-08:open - GAP_REVIEW

Query: Is there a microwave students can use to heat a packed meal?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> I’m not sure I fully understand, and please consider that there is other data I’m not allowed to share. You can try rephrasing your question, or I may not have an answer to that specific question.

### G09-EN-10:open - GAP_REVIEW

Query: Who handles complaints about a cafeteria purchase?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Yes, BukSU has a main Cafeteria located in front of the New CAS Building.
> 
> Students may go there during available hours to buy food or take a break.

### G09-EN-09:open - GAP_REVIEW

Query: Are students allowed to sell snacks to classmates on campus?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Eating inside classrooms depends on the rules set by the instructor.

