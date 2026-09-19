# Full Knowledge Test Report

Completed: 20 / 20
This invocation: 385.5s. Interrupted: False.
Observed p95 per-query latency: 49552.2 ms (router initialization excluded).

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

### G03-CEB-01:open - GAP_REVIEW

Query: Unsay buhaton kung kaduha nakuhaan sa enrollment payment?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Ang Step 4 mao ang Validation of Enrollment gikan July 1 hangtod August 31, 2026.
> 
> Para sa on-site payment: i-print ang imong Certificate of Registration (COR), dayon adto sa Accounting Office, Windows 3 to 5, para sa account verification. Applicable kini sa paying ug non-paying students.
> 
> Para sa paying students, pagbayad sa Cashier's Office Window 10.
> 
> Human sa account verification o payment, adto sa University Registrar's Office para sa enrollment validation. Applicable kini sa paying ug non-paying students.
> 
> Para sa online payment: access imong COR sa https://admissions.buksu.edu.ph aron makita ang required down payment para sa official enrollment.
> 
> Adto sa https://www.lbp-eservices.com/egps/portal/index.jsp, i-click ang Pay Now, pangitaa ug pili-a ang Merchant Name: Bukidnon State University, dayon click Continue.
> 
> Pili-a ang transaction type nga Tuition and Other School Fees, dayon click Continue. Pun-a ang transaction details, pili-a ang preferred payment mode, input captcha, agree sa Terms and Conditions, ug i-submit ang payment details apil ang OTP ug ATM PIN kung required.
> 
> Makita nimo ang enrollment status sa SIAS Online 10 working days after payment.

### G03-CEB-02:open - GAP_REVIEW

Query: Unsaon pagpailis sa nawala nga official payment receipt?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean Student ID Process or Take Exam?

### G03-CEB-03:open - GAP_REVIEW

Query: Igo na bang screenshot isip pamatuod sa school payment?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean About BukSU or BukSU Official Website?

### G03-CEB-04:open - GAP_REVIEW

Query: Unsay proseso sa refund kung nadoble ang school payment?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean About BukSU or BukSU Official Website?

### G03-CEB-05:open - GAP_REVIEW

Query: Pwede ba ginikanan ang mobayad sa assessed school fees para sa estudyante?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean About BukSU or BukSU Official Website?

### G03-CEB-06:open - GAP_REVIEW

Query: Unsay buhaton kung sayop ang student number nga na-type sa online payment?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Ang BukSU naggamit og numerical grading system diin ang 1.0 ang pinakataas ug 3.0 ang passing mark.
> 
> Ang grado nga 5.0 nagpasabot nga wala kapasar samtang ang INC nagpasabot nga kulang ang requirements sa subject.

### G03-CEB-07:open - GAP_REVIEW

Query: Unsaon pag-request og correction sa ngalan sa payment receipt?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean Lost Student ID Replacement Process or Take Exam?

### G03-CEB-08:open - GAP_REVIEW

Query: Kinsay mo-check sa successful bank payment nga unpaid gihapon sa school system?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean About BukSU or BukSU Official Website?

### G03-CEB-09:open - GAP_REVIEW

Query: Naa bay installment para sa fees nga dili covered sa free tuition?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Ubos sa balaod nga Universal Access to Quality Tertiary Education Act libre ang tuition ug miscellaneous fees para sa mga kwalipikadong Filipino nga estudyante sa undergraduate programs sa BukSU.

### G03-CEB-10:open - GAP_REVIEW

Query: Unsaon pagpahibalo sa estudyante kung na-reconcile na ang online payment?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean Student Fees or Transferee Enrollment?

### G03-EN-02:open - GAP_REVIEW

Query: How can a lost official payment receipt be replaced?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean Exam Fees or Library ID Card Replacement?

### G03-EN-01:open - GAP_REVIEW

Query: What should students do if an enrollment payment was deducted twice?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Step 4 is Validation of Enrollment from July 1 to August 31, 2026.
> 
> For on-site payment: print your Certificate of Registration (COR), then proceed to the Accounting Office, Windows 3 to 5, for account verification. This applies to both paying and non-paying students.
> 
> For paying students, pay at the Cashier's Office Window 10.
> 
> After account verification or payment, proceed to the University Registrar's Office for enrollment validation. This applies to both paying and non-paying students.
> 
> For online payment: access your COR through https://admissions.buksu.edu.ph to determine the required down payment for official enrollment.
> 
> Go to https://www.lbp-eservices.com/egps/portal/index.jsp, click Pay Now, search and select Merchant Name: Bukidnon State University, then click Continue.
> 
> Select the transaction type Tuition and Other School Fees, then click Continue. Fill out the transaction details, choose your preferred payment mode, input the captcha, agree to the Terms and Conditions, and submit the payment details including OTP and ATM PIN if required.
> 
> You can view your enrollment status through SIAS Online 10 working days after payment.

### G03-EN-03:open - GAP_REVIEW

Query: Is a screenshot enough proof of a successful school payment?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean About BukSU or BukSU Official Website?

### G03-EN-04:open - GAP_REVIEW

Query: What is the refund process after an accidental duplicate school payment?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> I’m not sure I fully understand, and please consider that there is other data I’m not allowed to share. You can try rephrasing your question, or I may not have an answer to that specific question.

### G03-EN-06:open - GAP_REVIEW

Query: What should I do if I typed the wrong student number when paying online?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean Paying Student Definition or Freshman Enrollment Requirements?

### G03-EN-05:open - GAP_REVIEW

Query: Can a parent pay assessed school fees on a student's behalf?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean About BukSU or BukSU Official Website?

### G03-EN-07:open - GAP_REVIEW

Query: How can students request a correction to the name on a payment receipt?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean Student Fees or Exam Fees?

### G03-EN-08:open - GAP_REVIEW

Query: Who checks a successful bank payment that the school system still marks unpaid?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean About BukSU or BukSU Official Website?

### G03-EN-10:open - GAP_REVIEW

Query: How are students notified when an online payment has been reconciled?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean Student Fees or Exam Fees?

### G03-EN-09:open - GAP_REVIEW

Query: Are installment arrangements available for fees that are not covered by free tuition?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Under the Universal Access to Quality Tertiary Education Act tuition and miscellaneous fees are free for qualified Filipino students in undergraduate programs at BukSU.

