# Full Knowledge Test Report

Completed: 20 / 20
This invocation: 367.6s. Interrupted: False.
Observed p95 per-query latency: 48678.1 ms (router initialization excluded).

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

### G07-CEB-01:open - GAP_REVIEW

Query: Unsang opisyal nga channel ang moannounce sa class suspension tungod sa panahon?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> I’m not sure I fully understand, and please consider that there is other data I’m not allowed to share. You can try rephrasing your question, or I may not have an answer to that specific question.

### G07-CEB-02:open - GAP_REVIEW

Query: Apil dayon ba ang university classes kung naay city class suspension?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> I’m not sure I fully understand, and please consider that there is other data I’m not allowed to share. You can try rephrasing your question, or I may not have an answer to that specific question.

### G07-CEB-03:open - GAP_REVIEW

Query: Apil ba og suspend ang online classes kung gikansela ang on-campus classes?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Sorry, I don't have location information for that place yet. Please try a more specific building or office name. If the response is still not found, you can use the map located on the top of mic button.

### G07-CEB-04:open - GAP_REVIEW

Query: Unsay buhaton sa commuters kung dili kaabot sa klase tungod sa baha?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Kung makadawat ka og FDA, kinahanglan nimo dayon duolon ang imong instructor ug istoryahan ang imong sitwasyon.
> 
> Pangutan-a sila kung unsa ang posible nimong mahimo bahin sa imong subject.
> 
> Ang ubang instructor mahimong mohatag og tambag o guidance depende sa sitwasyon.

### G07-CEB-06:open - GAP_REVIEW

Query: Ibalhin ba sa laing petsa ang unang adlaw sa klase kung makansela?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Ang School year 2026 - 2027 magsugod sa **AUGUST 3, 2026**.
> 
> Follow ang BukSU Registrar Facebook page & Official BukSU Facebook Page para sa dugang impormasyon:
> https://www.facebook.com/BSURegistrar
> https://www.facebook.com/officialbuksu

### G07-CEB-05:open - GAP_REVIEW

Query: Unsaon pagbalhin sa exams kung kalit mosuspend og klase ang unibersidad?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Oo, modawat ang BukSU og transferees depende sa available nga slots sa imong pilion nga kurso. Kinahanglan una ka mopasar sa BukSU Admission bago ka maka-enroll isip transferee.
> 
> Human nimo makapasar sa admission, adto sa BukSU main campus ug diretso sa college department nga imong gustong enrollan.
> 
> Ang transferees kinahanglan mo-submit og Honorable Dismissal ug Informative Copy sa ilang Transcript of Records para sa evaluation, maabot ang required GWA, ug mopasar sa admission interview o exam.
> 
> Tungod kay ang matag department adunay kaugalingong mga patakaran para sa transferees, mas maayo nga mangutana diretso sa faculty o staff sa opisina para sa hustong giya ug tabang.

### G07-CEB-08:open - GAP_REVIEW

Query: Kinahanglan gihapon mopasa og online work kung walay internet sa tibuok siyudad?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Sorry, I don't have location information for that place yet. Please try a more specific building or office name. If the response is still not found, you can use the map located on the top of mic button.

### G07-CEB-07:open - GAP_REVIEW

Query: Kinsay moannounce kung ipadayon ang laboratory session kung brownout?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean C-1-4-06 or C-1-2-01?

### G07-CEB-09:open - GAP_REVIEW

Query: Unsaon pagkumpirma nga tinuod ang suspension notice sa group chat?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean Take Exam or Submit Assignments Online?

### G07-CEB-10:open - GAP_REVIEW

Query: Abli ba ang mga opisina sa unibersidad kung klase ra ang gi-suspend?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> I’m not sure I fully understand, and please consider that there is other data I’m not allowed to share. You can try rephrasing your question, or I may not have an answer to that specific question.

### G07-EN-01:open - GAP_REVIEW

Query: Which official channel announces weather-related class suspensions?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> I’m not sure I fully understand, and please consider that there is other data I’m not allowed to share. You can try rephrasing your question, or I may not have an answer to that specific question.

### G07-EN-02:open - GAP_REVIEW

Query: Does a city class suspension automatically include university classes?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> I’m not sure I fully understand, and please consider that there is other data I’m not allowed to share. You can try rephrasing your question, or I may not have an answer to that specific question.

### G07-EN-04:open - GAP_REVIEW

Query: What should commuters do if flooding prevents them from reaching class?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Submit your excuse letter (signed by your parent or guardian) directly to all of your subject instructors for the specific classes you missed.
> 
> If your absence is due to illness, you can also provide a medical certificate, which you can secure or have validated at the University Clinic (located near Freedom Park).
> 
> Always present these documents immediately upon your return to class so your instructors can excuse your absence and allow any make-up activities or quizzes.

### G07-EN-03:open - GAP_REVIEW

Query: Are online classes also suspended when on-campus classes are cancelled?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Sorry, I don't have location information for that place yet. Please try a more specific building or office name. If the response is still not found, you can use the map located on the top of mic button.

### G07-EN-05:open - GAP_REVIEW

Query: How are exams moved when the university suspends classes unexpectedly?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean About BukSU or Meaning of BukSU?

### G07-EN-06:open - GAP_REVIEW

Query: Will a cancelled first day of classes be moved to another date?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean School Year Class Start Schedule or BukSU Foundation Day?

### G07-EN-08:open - GAP_REVIEW

Query: Do students have to submit online work during a citywide internet outage?

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

### G07-EN-07:open - GAP_REVIEW

Query: Who announces whether laboratory sessions continue during a power outage?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean C-1-4-06 or C-1-2-01?

### G07-EN-09:open - GAP_REVIEW

Query: How can students confirm that a suspension notice circulating in a group chat is real?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> I’m not sure I fully understand, and please consider that there is other data I’m not allowed to share. You can try rephrasing your question, or I may not have an answer to that specific question.

### G07-EN-10:open - GAP_REVIEW

Query: Are university offices open when only classes have been suspended?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> What are the office hours of Bukidnon State University?
> 
> Bukidnon State University offices, including the Registrar’s Office and the Accounting Office, operate only from Monday to Friday.
> 
> Office hours are 8:00 AM to 12:00 NN and 1:00 PM to 5:00 PM.
> 
> They are closed on Saturdays and Sundays.
> 
> Make sure to plan your visits during the official office hours.
> 
> For urgent matters, you can check if services are available online or contact the offices directly.
> 
> 📱 Contact Number: 0975 758 3157
> 
> ✉️ Email: registrar@buksu.edu.ph
> 
> 🖥️ Facebook Page: https://www.facebook.com/BSURegistrar
> 
> 📞 BukSU Contact Number: 088-813-5661

