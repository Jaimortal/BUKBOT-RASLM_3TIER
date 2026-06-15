# Query Normalization QA Dataset

This dataset is the final Day 6 validation set for the non-LLM query normalization layer.

Use it after editing:
- `rasa/actions/query_normalizer.py`
- `rasa/actions/normalization_rules.json`
- `rasa/actions/knowledge_router.py`
- `rasa/actions/main_router.py`

Run:

```bash
python -m unittest discover -s test -p "test_query_normalization_dataset.py"
python -m unittest discover -s test -p "test_context_aware_retrieval.py"
```

Restart the Rasa action server after Python or normalization JSON changes.
Rasa training is only needed when `nlu.yml`, `domain.yml`, stories, or rules change.

## English Typos

Expected behavior: route to the intended topic or show the correct course menu.

1. Is buksu accept transfered students? -> `transferee_admission_requirements`
2. admisson requirements -> `exam_requirements`
3. enrolment when -> `enrollment_time_schedule`
4. cor validaton -> `cor_validation_steps`
5. libary id asa kuha -> `library_id_card_location`
6. cources offered -> course choices
7. enrollment sched -> `enrollment_time_schedule`
8. masteral courses -> `buksu_masters_courses`
9. do buksu offer cources? -> course choices
10. test permit corrupted -> `test_permit_issue`

## Bisaya Location

1. asa ang registrar -> `location`
2. hain dapit ang library -> `location`
3. diin ang clinic -> clinic location
4. asa makita ang cpag building -> `location`
5. asa makit-an ang cot dean office -> `location`
6. asa ang finance office -> `location`
7. hain ang gym -> `location`
8. diin dapit ang dental -> `location`
9. asa ang main gate -> `location`
10. locate cpag building -> `location`

## Bisaya Payment

1. pila ang student id -> `Student_id_fee`
2. pila bayad sa student id -> `Student_id_fee`
3. tagpila medical cert -> `clinic_medical_certificate_cost`
4. pila library id -> `library_id_card_payment`
5. pila bayad good moral certificate -> `good_moral_certificate_fee`
6. pila ang admission test -> `exam_fees`
7. pila cost medical certificate -> `clinic_medical_certificate_cost`
8. bayranan sa library late books -> `library_late_return_penalty`

## Bisaya Requirements

1. unsa requirements sa transferee -> `transferee_admission_requirements`
2. unsay kinahanglan para mamalhin -> `transferee_admission_requirements`
3. dokomento needed transferee -> `transferee_admission_requirements`
4. dad on nako para admission -> `exam_requirements`
5. unsay dad-on sa admission exam -> `exam_requirements`
6. papeles para freshman -> `freshman_admission_requirements`
7. kailangan para student id -> `student_id_requirements`
8. kinahanglan sa library id -> `library_id_card_requirements`
9. dokumento sa good moral -> `request_good_moral_certificate_oss`
10. requirements sa masters -> `masters_degree_admission_requirements`

## Bisaya Transfer And Admission

1. mobalhin nga student sa buksu -> `transferee_admission_requirements`
2. gapamalhin ko gikan laing school -> `transferee_admission_requirements`
3. mamalhinay ko sa buksu -> `transferee_admission_requirements`
4. mobalhin unta ko sa buksu -> `transferee_admission_requirements`
5. mudawat mo ug transferee -> `transferee_admission_requirements`
6. dawaton ba ang transfer student -> `transferee_admission_requirements`
7. mamalhin ko unsa requirements -> `transferee_admission_requirements`
8. unsaon pag transfer sa buksu -> `transferee_admission_requirements`
9. modawat mo transfer student -> `transferee_admission_requirements`
10. dawat ba transferee -> `transferee_admission_requirements`

## ID, Library, COR, And Services

1. unsaon pag validate id -> `id_validation_process`
2. asa kuha library card -> `library_id_card_location`
3. kanus-a cor validation -> `cor_validation_day`
4. how get pe -> PE uniform clarification
5. medical cert pila -> `clinic_medical_certificate_cost`
6. kuha good moral certificate -> `request_good_moral_certificate_oss`
7. where get certificate of registration -> `request_cor`
8. unsaon pagkuha library id -> `library_id_card_location`
9. kanusa id validation -> `id_validation_day`
10. how validate cor -> `cor_validation_steps`

## Course Acronyms

1. do buksu offer ba philo -> `buksu_AB-PHILO_program`
2. naa moy bsat -> `buksu_BSAT_program`
3. how about bset -> `buksu_BSET_program`
4. do buksu offer IT -> `buksu_bsit_program`
5. do buksu offer bsn -> `buksu_BSN_program`
6. do buksu offer bshm -> `buksu_BSHM_program`
7. do buksu offer bsa -> `buksu_BSA_program`
8. masteral courses -> `buksu_masters_courses`
9. unsay courses sa buksu -> course choices
10. what is BA philo -> `buksu_AB_PHILO`

## Ambiguous And Safety Cases

1. how validate -> ID/COR validation choices
2. how much? -> fee choices
3. student id -> `student_id_process`
4. faculty office -> faculty office choices
5. deans office -> dean office choices
6. when is admission -> admission choices
7. courses -> course choices
8. what is it -> fallback, no BSIT accidental match
9. transfered students -> `transferee_admission_requirements`
10. borrow books -> `library_borrow_books_process`

Success means:
- No single-option clarification loops.
- No random unrelated suggestions such as borrow books vs INC for transfer questions.
- Course and college acronyms do not override location/person guardrails.
- Existing map/location responses still return normally.
