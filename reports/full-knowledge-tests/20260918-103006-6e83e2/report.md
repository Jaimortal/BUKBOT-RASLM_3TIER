# Full Knowledge Test Report

Completed: 20 / 20
This invocation: 255.1s. Interrupted: False.
Observed p95 per-query latency: 29139.8 ms (router initialization excluded).

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

### G04-CEB-01:open - GAP_REVIEW

Query: Unsa kadugay kasagaran moabot ang admission verification email?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Mahimo nimong makontak ang Admission and Testing Unit pinaagi sa ilang Facebook page BukSU Admission and Testing Unit o bisitaha ang ilang opisina sa CPAG building.
> 
> 🖥️ Facebook Page: https://www.facebook.com/BukSUATU. Contact Number: 0968 568 1435.
> ✉️ Email: admissionandtesting@buksu.edu.ph

### G04-CEB-02:open - GAP_REVIEW

Query: Unsay buhaton kung expired na daw ang admission activation link?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Kini ang mga requirements nga imong gikinahanglan sa dili pa mag-apply para sa BukSU Admission Testing:
> 
> 1. Kinahanglan nga aduna kay kaugalingong personal nga Gmail account aron makahimo og account sa BukSU Admissions: https://admissions.buksu.edu.ph/
> 
> 2. Kinahanglan nimo og digital copy sa imong 2x2 picture. Palihug siguroha nga ang imong litrato mosubay sa mosunod nga **mga detalye: plain white background, nagsul-ob og puti nga T-shirt, walay accessories, ug sakto nga 2x2 nga gidak-on.**
> 
> Para sa documentary requirements:
> 
> **Para sa mga kasamtangang Grade 12 nga estudyante:** Sertipikasyon gikan sa inyong principal nga ikaw kasamtangang na-enroll sa Grade 12
> 
> **Para sa mga SHS graduates:** Kopya sa imong Report Card o High School Diploma
> 
> **Para sa mga Transferee:** Transcript of Records o Honorable Dismissal, o sertipikasyon gikan sa Registrar sa imong kasamtangang eskwelahan
> 
> **Para sa mga Returnee** (niundang og eskwela sa BukSU sa wala pa ang 2018): Pangayo og sertipikasyon gikan sa Registrar pinaagi niini nga link: https://forms.gle/aKoX7zTJmnTSBNNFA
> 
> **Para sa mga Second Courser:** Transcript of Records. (Kung sobra na sa lima ka tuig sukad sa imong kataposang pag-eskwela, kinahanglan kang mokuha sa College Admission Test ug magbayad og 300 nga testing fee)
> 
> Human makapa-rehistro sa BukSU Admission, palihug paghulat sa pag-apruba.
> 
> Pahinumdom: Siguroha nga ma-access nimo ang imong Gmail, tungod kay ang tanang verification code ipadala didto.

### G04-CEB-03:open - GAP_REVIEW

Query: Naa bay limit sa pag-resend sa admission verification code?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Dili mi makahatag og usa ka pirmi nga eksaktong petsa sa BukSU admission and testing application kay mahimong mausab ang schedule matag academic year.
> 
> Kasagaran, magsugod ang admission application period around November ug mahimong mopadayon hangtod March.
> 
> Palihog tan-awa ang BukSU Admission and Testing Unit page para sa opisyal nga announcements, labi na sa eksaktong admission application date: https://www.facebook.com/BukSUATU

### G04-CEB-04:open - GAP_REVIEW

Query: Pwede mangayo og bag-ong activation email nga dili maghimo og laing account?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean Institutional Email Account Help or SIAS Forgot Password?

### G04-CEB-05:open - GAP_REVIEW

Query: Unsang sender address ang gikanan sa tinuod nga admission verification messages?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Dili mi makahatag og usa ka pirmi nga eksaktong petsa sa BukSU admission and testing application kay mahimong mausab ang schedule matag academic year.
> 
> Kasagaran, magsugod ang admission application period around November ug mahimong mopadayon hangtod March.
> 
> Palihog tan-awa ang BukSU Admission and Testing Unit page para sa opisyal nga announcements, labi na sa eksaktong admission application date: https://www.facebook.com/BukSUATU

### G04-CEB-06:open - GAP_REVIEW

Query: Unsay buhaton kung used na daw akong email pero wa ko makahimo og account?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Ang imong opisyal nga BukSU student email address mao ang imong institutional email account. Lahi kini sa imong BukSU Admission account.
> 
> Para sa imong opisyal nga BukSU institutional email o student email login, adto sa ICT office sa 3rd floor sa Finance Building ug pangayo og tabang bahin sa imong institutional email account.
> 
> Dad-a ang imong validated COR o student ID kung naa, kay mahimong kinahanglanon sa ICT para ma-verify nga opisyal kang naka-enroll.
> 
> Pwede usab mangayo og tabang sa ICT kung nakalimot ka sa institutional email, dili maka-login, o kinahanglan og account recovery.

### G04-CEB-07:open - GAP_REVIEW

Query: Pwede ba i-delete ang unverified admission account ug mag-register pag-usab?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Dili mi makahatag og usa ka pirmi nga eksaktong petsa sa BukSU admission and testing application kay mahimong mausab ang schedule matag academic year.
> 
> Kasagaran, magsugod ang admission application period around November ug mahimong mopadayon hangtod March.
> 
> Palihog tan-awa ang BukSU Admission and Testing Unit page para sa opisyal nga announcements, labi na sa eksaktong admission application date: https://www.facebook.com/BukSUATU

### G04-CEB-08:open - GAP_REVIEW

Query: Unsay mahitabo kung giablihan ang daang activation link human mangayo og bag-ong code?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean Application Next Step or Governance?

### G04-CEB-09:open - GAP_REVIEW

Query: Modawat ba ang admission registration og email provider gawas sa Gmail?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Mahimo nimong makontak ang Admission and Testing Unit pinaagi sa ilang Facebook page BukSU Admission and Testing Unit o bisitaha ang ilang opisina sa CPAG building.
> 
> 🖥️ Facebook Page: https://www.facebook.com/BukSUATU. Contact Number: 0968 568 1435.
> ✉️ Email: admissionandtesting@buksu.edu.ph

### G04-EN-01:open - GAP_REVIEW

Query: How long should the admission verification email normally take to arrive?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> How long does it take for BukSU admission applications to be approved?
> 
> Admission Officers evaluate and verify applications during regular university working hours (Mondays to Fridays, 8:00 AM – 5:00 PM, excluding weekends and university holidays).
> 
> The standard evaluation and approval process typically takes **3 to 5 working days** after submitting your complete online application and documentary requirements.
> 
> You will receive an email notification and a status update on your https://admissions.buksu.edu.ph dashboard once your application is approved.
> 
> *(Note: Incomplete, blurred, or non-compliant documents may cause delays in approval or application denial)*

### G04-CEB-10:open - GAP_REVIEW

Query: Unsaon pagreport kung walay niabot nga verification email bisan sa spam folder?

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

### G04-EN-03:open - GAP_REVIEW

Query: Is there a limit on resending admission verification codes?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> I’m not sure I fully understand, and please consider that there is other data I’m not allowed to share. You can try rephrasing your question, or I may not have an answer to that specific question.

### G04-EN-02:open - GAP_REVIEW

Query: What should I do if the admission activation link says it has expired?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Here are the requirements you need before applying for BukSU Admission Testing:
> 
> 1. You need to have your own personal Gmail account to create an account on BukSU Admissions: https://admissions.buksu.edu.ph/
> 
> 2. You need a digital copy of your 2x2 photo. Please make sure your photo meets the following **specifications: plain white background, wearing a white T-shirt, no accessories, and the correct 2x2 size.**
> 
> For documentary requirements:
> 
> **For current Grade 12 students:** A certification from your school principal that you are currently enrolled in Grade 12
> 
> **For SHS graduates:** Copy of your Report Card or High School Diploma
> 
> **For Transferees:** Transcript of Records or Honorable Dismissal, or a certification from your current school’s Registrar
> 
> **For Returnees** (stopped studying in BukSU before 2018): Request a certification from the Registrar through this link: https://forms.gle/aKoX7zTJmnTSBNNFA
> 
> **For Second Courser:** Transcript of Records. (If it has been more than five years since your last school attendance, you must take the College Admission Test and pay 300 testing fee)
> 
> After applying for BukSU Admission, please wait for approval.
> 
> Note: Your Gmail should be accessible, as all verification codes will be sent there.

### G04-EN-05:open - GAP_REVIEW

Query: Which sender address should students expect for legitimate admission verification messages?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Here are the requirements you need before applying for BukSU Admission Testing:
> 
> 1. You need to have your own personal Gmail account to create an account on BukSU Admissions: https://admissions.buksu.edu.ph/
> 
> 2. You need a digital copy of your 2x2 photo. Please make sure your photo meets the following **specifications: plain white background, wearing a white T-shirt, no accessories, and the correct 2x2 size.**
> 
> For documentary requirements:
> 
> **For current Grade 12 students:** A certification from your school principal that you are currently enrolled in Grade 12
> 
> **For SHS graduates:** Copy of your Report Card or High School Diploma
> 
> **For Transferees:** Transcript of Records or Honorable Dismissal, or a certification from your current school’s Registrar
> 
> **For Returnees** (stopped studying in BukSU before 2018): Request a certification from the Registrar through this link: https://forms.gle/aKoX7zTJmnTSBNNFA
> 
> **For Second Courser:** Transcript of Records. (If it has been more than five years since your last school attendance, you must take the College Admission Test and pay 300 testing fee)
> 
> After applying for BukSU Admission, please wait for approval.
> 
> Note: Your Gmail should be accessible, as all verification codes will be sent there.

### G04-EN-04:open - GAP_REVIEW

Query: Can I request a new activation email without creating another account?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean Institutional Email Account Help or Incoming Freshmen SIAS Claim?

### G04-EN-07:open - GAP_REVIEW

Query: Can an unverified admission account be deleted and registered again?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Sorry, I don't have location information for account.

### G04-EN-06:open - GAP_REVIEW

Query: What should I do if registration says my email is already used but I never made an account?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> To reset your SIAS password, open **https://sias.buksu.edu.ph/sias/**.
> 
> Click **Student** if you are a student. Choose the correct role if you are an instructor or another user type.
> 
> Type your Student ID first, then click the **Forgot Password** button located below the Login button.
> 
> Type your institutional email or student email, then click **Send code**. Open your email account and wait for the code.
> 
> Type the code, enter your new password, retype the password to confirm, then click **OK**. After that, you can log in to your SIAS account.

### G04-EN-09:open - GAP_REVIEW

Query: Does admission registration support email providers other than Gmail?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> You can contact the Admission and Testing Unit through their official Facebook page BukSU Admission and Testing Unit or visit their office at the CPAG building.
> 
> 🖥️ Facebook Page: https://www.facebook.com/BukSUATU. Contact Number: 0968 568 1435.
> ✉️ Email: admissionandtesting@buksu.edu.ph

### G04-EN-08:open - GAP_REVIEW

Query: What happens if an activation link was opened after a newer code was requested?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean Library Hours Answer Topic or End Of Semester?

### G04-EN-10:open - GAP_REVIEW

Query: How do applicants report that no verification email arrived even in the spam folder?

Expected: `supported limitation/referral`; observed: `not exposed`.

Response:

> Do you mean CAT Exam Result or Take Exam?

