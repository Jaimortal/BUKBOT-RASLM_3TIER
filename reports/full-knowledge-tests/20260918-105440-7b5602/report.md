# Full Knowledge Test Report

Completed: 20 / 20
This invocation: 320.2s. Interrupted: False.
Observed p95 per-query latency: 53737.9 ms (router initialization excluded).

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

### G08-CEB-01:open - GAP_REVIEW

Query: Unsa ka sayo ang pag-request og extra time para sa entrance examination?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Unsaon nako pagkuha sa BukSU College Admission Test?
> 
> Sunod kining mga lakang aron mag-apply sa BukSU College Admission Test:
> 
> Step 1: Bisitaha ang http://admissions.buksu.edu.ph. Mag-register gamit ang imong active nga Gmail account. Himoa ang imong password ug i-type pag-usab para sa verification.
> 
> Step 2: Human makahimo og account, usa ka email nga adunay confirmation link ipadala sa imong Gmail. Tan-awa ang imong inbox ug i-klik ang link aron ma-activate ang imong account.
> 
> Step 3: Pun-a ang tanan nga kinahanglan nga impormasyon ug i-upload ang mga documentary requirements.
> 
> Step 4: Pilia ang imong preferred schedule (venue, petsa, ug oras) base sa available nga slots.
> 
> Step 5: Makadawat ka og notifications kung gi-accept ang imong aplikasyon. Kung ma-accept, i-download ug i-print ang imong Test Permit.

### G08-CEB-02:open - GAP_REVIEW

Query: Naa bay sign-language interpreter para sa freshman orientation?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Ang Orientation Program gihimo aron ipaila sa mga bag-ong estudyante ang mission, vision, ug academic policies sa unibersidad. Ang pangunang tumong niini mao ang pagtabang kanimo nga maka-adjust sa campus life ug masabtan ang mga importanteng academic expectations sa Bukidnon State University.
> 
> Sa maong session, makakat-on ka bahin sa mga importanteng patakaran sa unibersidad, sama sa Incomplete (INC) rules ug Failure Due to Absences (FDA) counts. Palihog hinumdumi nga importante kaayo ang pag-attend sa inyong Departmental Orientation, kay didto ihatag ang mga espesipikong giya para sa imong napiling programa.

### G08-CEB-03:open - GAP_REVIEW

Query: Pwede mangayo ang estudyante og large-print exam papers?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean Exam Requirements or Second Courser Requirements?

### G08-CEB-04:open - GAP_REVIEW

Query: Unsay dokumento para makarequest og accessible classroom assignment?

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

### G08-CEB-06:open - GAP_REVIEW

Query: Naa bay proseso sa pag-request og rest breaks panahon sa taas nga exam?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean Library Available Books or Cafeteria Availability?

### G08-CEB-05:open - GAP_REVIEW

Query: Pwede mangayo og digital handouts nga magamit sa screen reader?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> I’m not sure I fully understand, and please consider that there is other data I’m not allowed to share. You can try rephrasing your question, or I may not have an answer to that specific question.

### G08-CEB-07:open - GAP_REVIEW

Query: Naghatag ba ang unibersidad og assistive listening equipment sa lectures?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> I’m not sure I fully understand, and please consider that there is other data I’m not allowed to share. You can try rephrasing your question, or I may not have an answer to that specific question.

### G08-CEB-08:open - GAP_REVIEW

Query: Pwede mouban ang support person sa aplikante nga nagkinahanglan og tabang sa registration?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean CON Nursing Medical Requirements Guidance or Freshman Enrollment Requirements?

### G08-CEB-09:open - GAP_REVIEW

Query: Unsaon pag-request og temporary classroom adjustment human ma-injure?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Sorry, I don't have location information for that place yet. Please try a more specific building or office name. If the response is still not found, you can use the map located on the top of mic button.

### G08-CEB-10:open - GAP_REVIEW

Query: Naa bay standard nga oras sa pagresponde sa accessibility accommodation requests?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Oo ang BukSU naghatag og importansya sa inclusivity ug naghatag og tabang para sa mga estudyante nga adunay disability.
> 
> Ang mga PWD nga aplikante o estudyante mahimong makig coordinate sa Office of Student Services para sa tabang ug espesyal nga accommodation sa exam o klase.

### G08-EN-02:open - GAP_REVIEW

Query: Is a sign-language interpreter available for freshman orientation?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> The Orientation Program is designed to introduce new students to the university’s mission, vision, and academic policies. Its primary goal is to help you adjust to campus life and understand the essential academic expectations of Bukidnon State University.
> 
> During this session, you will learn about critical university policies, such as Incomplete (INC) rules and Failure Due to Absences (FDA) counts. Please note that attending your Departmental Orientation is highly required, as it provides specific guidance for your chosen program.

### G08-EN-01:open - GAP_REVIEW

Query: How early should an applicant request extra time for an entrance examination?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> How can I take the BukSU College Admission Test?
> 
> Follow these steps to apply for the BukSU College Admission Test:
> 
> Step 1: Access http://admissions.buksu.edu.ph. Register using your active Gmail account. Create your password and re-type it for verification.
> 
> Step 2: After creating an account, an email containing a confirmation link will be sent to your Gmail. Check your inbox and click the link to activate your account.
> 
> Step 3: Fill out all the necessary information and upload the documentary requirements.
> 
> Step 4: Select your preferred schedule (venue, date, and time) based on the availability of slots.
> 
> Step 5: You will get notifications when your application is accepted. Once accepted, download and print your Test Permit.

### G08-EN-04:open - GAP_REVIEW

Query: What documents are needed to request an accessible classroom assignment?

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

### G08-EN-03:open - GAP_REVIEW

Query: Can students request large-print examination papers?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean Freshman Admission Requirements or CON Nursing Medical Requirements Guidance?

### G08-EN-05:open - GAP_REVIEW

Query: Can a student request digital handouts compatible with a screen reader?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> I’m not sure I fully understand, and please consider that there is other data I’m not allowed to share. You can try rephrasing your question, or I may not have an answer to that specific question.

### G08-EN-06:open - GAP_REVIEW

Query: Is there a process for requesting rest breaks during a long exam?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Continuing students must log in to the admissions portal.
> 
> Click proceed to account migration using the student number.
> 
> Fill in the required information verify the details and submit the application for evaluation.

### G08-EN-07:open - GAP_REVIEW

Query: Does the university provide assistive listening equipment in lectures?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> I’m not sure I fully understand, and please consider that there is other data I’m not allowed to share. You can try rephrasing your question, or I may not have an answer to that specific question.

### G08-EN-08:open - GAP_REVIEW

Query: Can a support person accompany an applicant who needs assistance during registration?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean Services Offered By Guidance or Accessibility?

### G08-EN-10:open - GAP_REVIEW

Query: Is there a standard response time for accessibility accommodation requests?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Yes BukSU supports inclusivity and provides assistance for students with disabilities.
> 
> PWD applicants and students may coordinate with the Office of Student Services for assistance and reasonable accommodations during exams and classes.

### G08-EN-09:open - GAP_REVIEW

Query: How can students request a temporary classroom adjustment after an injury?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Sorry, I don't have location information for that place yet. Please try a more specific building or office name. If the response is still not found, you can use the map located on the top of mic button.

