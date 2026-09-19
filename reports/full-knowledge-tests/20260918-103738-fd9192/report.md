# Full Knowledge Test Report

Completed: 20 / 20
This invocation: 281.0s. Interrupted: False.
Observed p95 per-query latency: 48669.0 ms (router initialization excluded).

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

### G05-CEB-01:open - GAP_REVIEW

Query: Naa bay makeup session para sa freshman nga wala katunga sa orientation?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Ang Orientation Program gihimo aron ipaila sa mga bag-ong estudyante ang mission, vision, ug academic policies sa unibersidad. Ang pangunang tumong niini mao ang pagtabang kanimo nga maka-adjust sa campus life ug masabtan ang mga importanteng academic expectations sa Bukidnon State University.
> 
> Sa maong session, makakat-on ka bahin sa mga importanteng patakaran sa unibersidad, sama sa Incomplete (INC) rules ug Failure Due to Absences (FDA) counts. Palihog hinumdumi nga importante kaayo ang pag-attend sa inyong Departmental Orientation, kay didto ihatag ang mga espesipikong giya para sa imong napiling programa.

### G05-CEB-02:open - GAP_REVIEW

Query: Naay livestream sa freshman orientation para sa dili makabiyahe?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Ang Orientation Program gihimo aron ipaila sa mga bag-ong estudyante ang mission, vision, ug academic policies sa unibersidad. Ang pangunang tumong niini mao ang pagtabang kanimo nga maka-adjust sa campus life ug masabtan ang mga importanteng academic expectations sa Bukidnon State University.
> 
> Sa maong session, makakat-on ka bahin sa mga importanteng patakaran sa unibersidad, sama sa Incomplete (INC) rules ug Failure Due to Absences (FDA) counts. Palihog hinumdumi nga importante kaayo ang pag-attend sa inyong Departmental Orientation, kay didto ihatag ang mga espesipikong giya para sa imong napiling programa.

### G05-CEB-04:open - GAP_REVIEW

Query: Mangayo ba ang matag kolehiyo og proof nga niattend sa university orientation?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Ang BukSU gilangkuban sa pipila ka mga kolehiyo lakip ang:
> 
> - College of Arts and Sciences
> 
> - College of Education
> 
> - College of Business
> 
> - College of Nursing
> 
> - College of Technologies
> 
> - College of Public Administration and Governance
> 
> - College of Law

### G05-CEB-03:open - GAP_REVIEW

Query: Pwede ba mouban ang guardian sa freshman orientation?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Ang Orientation Program gihimo aron ipaila sa mga bag-ong estudyante ang mission, vision, ug academic policies sa unibersidad. Ang pangunang tumong niini mao ang pagtabang kanimo nga maka-adjust sa campus life ug masabtan ang mga importanteng academic expectations sa Bukidnon State University.
> 
> Sa maong session, makakat-on ka bahin sa mga importanteng patakaran sa unibersidad, sama sa Incomplete (INC) rules ug Failure Due to Absences (FDA) counts. Palihog hinumdumi nga importante kaayo ang pag-attend sa inyong Departmental Orientation, kay didto ihatag ang mga espesipikong giya para sa imong napiling programa.

### G05-CEB-05:open - GAP_REVIEW

Query: Pwede mangayo ang estudyante og recording sa freshman orientation?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Ang Orientation Program gihimo aron ipaila sa mga bag-ong estudyante ang mission, vision, ug academic policies sa unibersidad. Ang pangunang tumong niini mao ang pagtabang kanimo nga maka-adjust sa campus life ug masabtan ang mga importanteng academic expectations sa Bukidnon State University.
> 
> Sa maong session, makakat-on ka bahin sa mga importanteng patakaran sa unibersidad, sama sa Incomplete (INC) rules ug Failure Due to Absences (FDA) counts. Palihog hinumdumi nga importante kaayo ang pag-attend sa inyong Departmental Orientation, kay didto ihatag ang mga espesipikong giya para sa imong napiling programa.

### G05-CEB-06:open - GAP_REVIEW

Query: Unsaon sa freshmen pagpangita sa official group chat sa ilang block?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean Student ID Process or Intent to Enroll Confirmation?

### G05-CEB-08:open - GAP_REVIEW

Query: Unsay buhaton sa freshman kung magdungan ang duha ka required orientation?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Ang Orientation Program gihimo aron ipaila sa mga bag-ong estudyante ang mission, vision, ug academic policies sa unibersidad. Ang pangunang tumong niini mao ang pagtabang kanimo nga maka-adjust sa campus life ug masabtan ang mga importanteng academic expectations sa Bukidnon State University.
> 
> Sa maong session, makakat-on ka bahin sa mga importanteng patakaran sa unibersidad, sama sa Incomplete (INC) rules ug Failure Due to Absences (FDA) counts. Palihog hinumdumi nga importante kaayo ang pag-attend sa inyong Departmental Orientation, kay didto ihatag ang mga espesipikong giya para sa imong napiling programa.

### G05-CEB-07:open - GAP_REVIEW

Query: Kinsay mokumpirma nga official ang group chat sa klase?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> I’m not sure I fully understand, and please consider that there is other data I’m not allowed to share. You can try rephrasing your question, or I may not have an answer to that specific question.

### G05-CEB-10:open - GAP_REVIEW

Query: Unsaon pagpahibalo sa freshmen kung mausab kalit ang venue sa orientation?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean Orientation or Student ID Process?

### G05-CEB-09:open - GAP_REVIEW

Query: Naa bay accessible digital format sa orientation handouts?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean Orientation or Library Available Books?

### G05-EN-02:open - GAP_REVIEW

Query: Is the freshman orientation livestreamed for students who cannot travel?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> The Orientation Program is designed to introduce new students to the university’s mission, vision, and academic policies. Its primary goal is to help you adjust to campus life and understand the essential academic expectations of Bukidnon State University.
> 
> During this session, you will learn about critical university policies, such as Incomplete (INC) rules and Failure Due to Absences (FDA) counts. Please note that attending your Departmental Orientation is highly required, as it provides specific guidance for your chosen program.

### G05-EN-01:open - GAP_REVIEW

Query: Is there a makeup session for freshmen who miss orientation?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> The Orientation Program is designed to introduce new students to the university’s mission, vision, and academic policies. Its primary goal is to help you adjust to campus life and understand the essential academic expectations of Bukidnon State University.
> 
> During this session, you will learn about critical university policies, such as Incomplete (INC) rules and Failure Due to Absences (FDA) counts. Please note that attending your Departmental Orientation is highly required, as it provides specific guidance for your chosen program.

### G05-EN-04:open - GAP_REVIEW

Query: Does every college require proof of attending university orientation?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> BukSU is composed of several colleges including the:
> 
> - College of Arts and Sciences
> 
> - College of Education
> 
> - College of Business
> 
> - College of Nursing
> 
> - College of Technologies
> 
> - College of Public Administration and Governance
> 
> - College of Law

### G05-EN-03:open - GAP_REVIEW

Query: Can a guardian attend freshman orientation with the student?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> The Orientation Program is designed to introduce new students to the university’s mission, vision, and academic policies. Its primary goal is to help you adjust to campus life and understand the essential academic expectations of Bukidnon State University.
> 
> During this session, you will learn about critical university policies, such as Incomplete (INC) rules and Failure Due to Absences (FDA) counts. Please note that attending your Departmental Orientation is highly required, as it provides specific guidance for your chosen program.

### G05-EN-06:open - GAP_REVIEW

Query: How do freshmen find the official group chat for their block?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Sorry, I don't have location information for that place yet. Please try a more specific building or office name. If the response is still not found, you can use the map located on the top of mic button.

### G05-EN-05:open - GAP_REVIEW

Query: Can students request a recording of freshman orientation?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> The Orientation Program is designed to introduce new students to the university’s mission, vision, and academic policies. Its primary goal is to help you adjust to campus life and understand the essential academic expectations of Bukidnon State University.
> 
> During this session, you will learn about critical university policies, such as Incomplete (INC) rules and Failure Due to Absences (FDA) counts. Please note that attending your Departmental Orientation is highly required, as it provides specific guidance for your chosen program.

### G05-EN-07:open - GAP_REVIEW

Query: Who confirms that a class group chat is officially recognized?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> I’m not sure I fully understand, and please consider that there is other data I’m not allowed to share. You can try rephrasing your question, or I may not have an answer to that specific question.

### G05-EN-08:open - GAP_REVIEW

Query: What should a freshman do if two required orientation sessions overlap?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> The Orientation Program is designed to introduce new students to the university’s mission, vision, and academic policies. Its primary goal is to help you adjust to campus life and understand the essential academic expectations of Bukidnon State University.
> 
> During this session, you will learn about critical university policies, such as Incomplete (INC) rules and Failure Due to Absences (FDA) counts. Please note that attending your Departmental Orientation is highly required, as it provides specific guidance for your chosen program.

### G05-EN-09:open - GAP_REVIEW

Query: Are orientation handouts available in an accessible digital format?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> I’m not sure I fully understand, and please consider that there is other data I’m not allowed to share. You can try rephrasing your question, or I may not have an answer to that specific question.

### G05-EN-10:open - GAP_REVIEW

Query: How are freshmen told about a last-minute orientation venue change?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> The Orientation Program is designed to introduce new students to the university’s mission, vision, and academic policies. Its primary goal is to help you adjust to campus life and understand the essential academic expectations of Bukidnon State University.
> 
> During this session, you will learn about critical university policies, such as Incomplete (INC) rules and Failure Due to Absences (FDA) counts. Please note that attending your Departmental Orientation is highly required, as it provides specific guidance for your chosen program.

