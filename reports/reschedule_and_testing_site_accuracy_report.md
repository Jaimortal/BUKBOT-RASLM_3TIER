# Accuracy & Regression Test Report: Reschedule & Testing Site Policy Updates

> **Date:** October 11, 2026  
> **Target Module:** `procedures` -> `admission_procedures.json` & `knowledge_router.py`  
> **Target Intent:** `reschedule_entrance_exam`  
> **Regression Benchmark:** Zero collisions with `admission_schedule_clarification`, `admission_examination_date`, `missed_buksu_cat_schedule`, `change_program_after_application`, and `exam_location_vs_campus`.  
> **Overall Accuracy:** **100.0% (20 / 20 Passed)**

---

## 1. Executive Summary

The user identified an important coverage gap and potential classification overlap:
1. **New Inquiries:** Applicants asking whether they can **change their testing site/center or modify their examination date/schedule** (especially after approval / once assigned).
2. **Identified Risk:** Queries mentioning *"schedule sa admission"* or *"modify schedule"* could collide with `admission_schedule_clarification` (which is intended only for ambiguous general schedule inquiries like *"admission schedule"*).

---

## 2. Root Cause Analysis of the Disambiguation Conflict

In [knowledge_router.py](file:///c:/School%20Related%20File/3rd%20year/Capstone%20dev/Chatbot/CHATBOT%20V5%20merged%20versions/Capstone_Project_Artificial_Intelligence_Chatbot/rasa/actions/knowledge_router.py#L748-L815), the rule `# 16j3. Admission Schedule & Examination Date Disambiguation` was positioned earlier in the routing cascade than `# 16j2b. Reschedule Entrance Exam`. 

Because queries like *"gusto nako i modify ning akoang mga schedule sa admission"* contained both admission keywords (`admission`) and schedule keywords (`schedule`), the router matched `is_admission_or_cat_query` + `is_schedule_or_date_query` and fired `__admission_schedule_clarification__`, presenting the user with an irrelevant choice modal (*"Which admission schedule do you mean? [Application Schedule] [Exam Date]"*).

---

## 3. Technical Changes Made

### A. Enhanced Knowledge Base: [admission_procedures.json](file:///c:/School%20Related%20File/3rd%20year/Capstone%20dev/Chatbot/CHATBOT%20V5%20merged%20versions/Capstone_Project_Artificial_Intelligence_Chatbot/rasa/actions/knowledge/procedures/admission_procedures.json#L671-L745)
- **Updated Responses:** Both English (`en`) and Cebuano (`ceb`) responses now explicitly address:
  1. **Testing Site & Venue:** Cannot be changed or switched once approved / assigned via the online portal.
  2. **Examination Schedule & Date:** Cannot be rescheduled once assigned; walk-ins strictly prohibited.
  3. **Resource Allocation Rationale:** Room capacity and test materials are strictly locked per testing center.
  4. **Emergency Escalation:** Direct contact channels for the Admissions and Testing Unit (ATU) (Mobile: 0968 568 1435, Facebook: https://www.facebook.com/BukSUATU, Email: admissionandtesting@buksu.edu.ph).
- **Added 30+ Query Patterns:** Including all user-provided examples across English, Taglish, and Cebuano.

### B. High-Precision Cascade Routing: [knowledge_router.py](file:///c:/School%20Related%20File/3rd%20year/Capstone%20dev/Chatbot/CHATBOT%20V5%20merged%20versions/Capstone_Project_Artificial_Intelligence_Chatbot/rasa/actions/knowledge_router.py#L746-L780)
- **Early Interception (`# 16j2b`):** Placed the reschedule and testing site modification check *before* the general admission schedule disambiguation block.
- **Guardrail Exclusions:** Explicitly excluded queries about course/degree changes (`program`, `course`, `kurso`) and password resets (`password`, `pass`) so they never misroute to reschedule.
- **Protected Disambiguation:** Added change/reschedule tokens to `is_non_schedule_admission` as a secondary defense layer to guarantee `__admission_schedule_clarification__` never captures modification queries.
- **Protected Missed Schedule & Course Change:** Ensured queries about missed exams route to `missed_buksu_cat_schedule` and course changes after submission route to `change_program_after_application`.

---

## 4. Verification Benchmark Results

| Test Query | Expected Intent | Actual Routing | Status |
|:---|:---:|:---:|:---:|
| `can i still change my testing site even though its approved?` | `reschedule_entrance_exam` | `reschedule_entrance_exam` | **PASS** |
| `pwedi bakaha nako ni i change akong schedule sa admission?` | `reschedule_entrance_exam` | `reschedule_entrance_exam` | **PASS** |
| `am i allowed to modify my schedule for examination testing date?` | `reschedule_entrance_exam` | `reschedule_entrance_exam` | **PASS** |
| `gusto nako i modify ning akoang mga schedule sa admission, pwedi pa kaha ni?` | `reschedule_entrance_exam` | `reschedule_entrance_exam` | **PASS** |
| `allowed ba i change atong testing date kong wala nahumana kog approved?` | `reschedule_entrance_exam` | `reschedule_entrance_exam` | **PASS** |
| `can i change my testing center after approval?` | `reschedule_entrance_exam` | `reschedule_entrance_exam` | **PASS** |
| `pwede pa ba usbon akong testing site?` | `reschedule_entrance_exam` | `reschedule_entrance_exam` | **PASS** |
| `pwede ba ilisan ang testing center kung approved na?` | `reschedule_entrance_exam` | `reschedule_entrance_exam` | **PASS** |
| `change testing venue once approved` | `reschedule_entrance_exam` | `reschedule_entrance_exam` | **PASS** |
| `unsaon pag reschedule sa entrance exam` | `reschedule_entrance_exam` | `reschedule_entrance_exam` | **PASS** |
| `how to change my entrance exam schedule` | `reschedule_entrance_exam` | `reschedule_entrance_exam` | **PASS** |
| `admission schedule` | `__admission_schedule_clarification__` | `__admission_schedule_clarification__` | **PASS** |
| `schedule sa admission` | `__admission_schedule_clarification__` | `__admission_schedule_clarification__` | **PASS** |
| `when is the actual examination date` | `admission_examination_date` | `admission_examination_date` | **PASS** |
| `where can i see my exam date` | `admission_examination_date` | `admission_examination_date` | **PASS** |
| `start date of BukSU CAT application` | `online_application_schedule` | `online_application_schedule` | **PASS** |
| `can i change my program after submitting the buksu cat application` | `change_program_after_application` | `change_program_after_application` | **PASS** |
| `how to change my admission password` | `Change_Pass_admission` | `Change_Pass_admission` | **PASS** |
| `what if i missed my buksu cat exam schedule` | `missed_buksu_cat_schedule` | `missed_buksu_cat_schedule` | **PASS** |
| `can i still enroll on the main campus even though i take an entrance exam on satellite campus` | `exam_location_vs_campus` | `exam_location_vs_campus` | **PASS** |

**Summary Statistics:**
- Total Test Cases: 20
- Passed: 20
- Failed: 0
- **Accuracy Rate: 100.0%**

---

## 5. Sample Bot Responses Verified

### English Query:
> **User:** *"can i still change my testing site even though its approved?"*  
> **Bot:**  
> The **BukSU Entrance Examination (BukSU-CAT) date and testing site cannot be changed or rescheduled** once your application is approved and your exam date or testing venue has been assigned.  
> Testing sites, room assignments, and examination batches are strictly locked to manage room capacity and allocate test materials across main and satellite campuses. Unauthorized switching of testing centers and walk-in examinations are strictly prohibited.  
> If you are unable to attend your scheduled exam, you may need to wait for the next admission cycle.  
> For urgent or unavoidable examination concerns regarding your approved testing site or schedule, please coordinate directly with the **Admissions and Testing Unit (ATU)**:  
> 📱 Mobile: 0968 568 1435  
> 🖥️ Facebook: https://www.facebook.com/BukSUATU  
> ✉️ Email: admissionandtesting@buksu.edu.ph

### Cebuano Query:
> **User:** *"pwedi bakaha nako ni i change akong schedule sa admission?"*  
> **Bot:**  
> Ang **petsa sa BukSU Entrance Examination (BukSU-CAT) ug ang testing site dili na pwede usbon o ilisan** kung approved na ang imong aplikasyon ug aduna na kay assigned exam schedule o venue.  
> Naka-lock na ang mga testing sites, assignment sa kwarto, ug examination batches base sa kapasidad ug gidaghanon sa test materials sa matag campus. Dili usab gitugotan ang pagbalhin-balhin og testing center ug ang walk-in examination.  
> Kung dili ka makatunga sa imong scheduled exam, posibleng maghulat ka sa sunod nga admission cycle.  
> Alang sa mga dinalian o importanteng pangutana bahin sa imong approved nga testing site o exam schedule, pakig-alayon dayon sa **Admissions and Testing Unit (ATU)**:  
> 📱 Mobile: 0968 568 1435  
> 🖥️ Facebook: https://www.facebook.com/BukSUATU  
> ✉️ Email: admissionandtesting@buksu.edu.ph

