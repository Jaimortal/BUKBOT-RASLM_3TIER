# Completed dataset boundary review

Prepared for an isolated NLU experiment, not promoted to production. 43 record labels changed under the policy below. All original annotations and labels remain in source/original_nlu.yml and the manifest.

## Label decisions

| ID | Question | Before | After | Reason |
|---|---|---|---|---|
| original_ask_location_025 | is there an ATM inside the campus | ask_location | ask_facility_availability | Facility existence, not directions. |
| original_ask_process_025 | how do I request COR | ask_process | ask_document | Request, claim, download or authenticate a named record/certificate. |
| original_ask_process_026 | unsaon nako pag request og COR | ask_process | ask_document | Request, claim, download or authenticate a named record/certificate. |
| original_ask_process_027 | where to get COR | ask_process | ask_document | Request, claim, download or authenticate a named record/certificate. |
| original_ask_process_028 | where can I get COR | ask_process | ask_document | Request, claim, download or authenticate a named record/certificate. |
| original_ask_process_029 | asa makuha ang COR | ask_process | ask_document | Request, claim, download or authenticate a named record/certificate. |
| original_ask_process_030 | how to get COR | ask_process | ask_document | Request, claim, download or authenticate a named record/certificate. |
| original_ask_process_048 | what are the student services | ask_process | ask_availability | Listing offered services, not completing a transaction. |
| original_ask_process_049 | services that buksu can provide | ask_process | ask_availability | Listing offered services, not completing a transaction. |
| original_ask_process_050 | services list | ask_process | ask_availability | Listing offered services, not completing a transaction. |
| original_ask_process_051 | unsay mga services ni buksu | ask_process | ask_availability | Listing offered services, not completing a transaction. |
| original_ask_general_info_006 | master courses | ask_general_info | ask_availability | Available programs or services; not a definition of a particular program. |
| original_ask_general_info_007 | masters courses | ask_general_info | ask_availability | Available programs or services; not a definition of a particular program. |
| original_ask_general_info_008 | masteral programs | ask_general_info | ask_availability | Available programs or services; not a definition of a particular program. |
| original_ask_general_info_009 | does BukSU offer masters | ask_general_info | ask_availability | Available programs or services; not a definition of a particular program. |
| original_ask_general_info_010 | courses | ask_general_info | ask_availability | Available programs or services; not a definition of a particular program. |
| original_ask_general_info_011 | courses offered | ask_general_info | ask_availability | Available programs or services; not a definition of a particular program. |
| original_ask_general_info_012 | courses offerd by buksu | ask_general_info | ask_availability | Available programs or services; not a definition of a particular program. |
| original_ask_general_info_013 | do buksu offer BSAP | ask_general_info | ask_availability | Available programs or services; not a definition of a particular program. |
| original_ask_availability_047 | naa bay dormitory | ask_availability | ask_facility_availability | Existence of a campus facility. |
| original_ask_availability_048 | does buksu have dormitory | ask_availability | ask_facility_availability | Existence of a campus facility. |
| original_ask_availability_049 | does buksu have dormitories | ask_availability | ask_facility_availability | Existence of a campus facility. |
| original_ask_availability_050 | dormitory availability | ask_availability | ask_facility_availability | Existence of a campus facility. |
| original_ask_availability_051 | is library open today | ask_availability | ask_schedule | Opening time/hours. |
| original_ask_document_007 | where can I get library ID | ask_document | ask_process | Obtaining a physical ID card is an issuance workflow. |
| original_ask_document_011 | enrollment document list | ask_document | ask_requirement | Enrollment checklist, not obtaining a specific document. |
| original_ask_document_012 | what documents do I need to bring on enrollment day | ask_document | ask_requirement | Enrollment checklist, not obtaining a specific document. |
| gemini_ask_process_014 | how to get TOR | ask_process | ask_document | Request, claim, download or authenticate a named record/certificate. |
| gemini_ask_process_015 | how to request transcript of records | ask_process | ask_document | Request, claim, download or authenticate a named record/certificate. |
| gemini_ask_process_016 | unsaon pagkuha og TOR | ask_process | ask_document | Request, claim, download or authenticate a named record/certificate. |
| gemini_ask_process_023 | unsaon pag-validate sa COR | ask_process | ask_document | Request, claim, download or authenticate a named record/certificate. |
| gemini_ask_process_089 | how to apply for CAV authentication at the registrar | ask_process | ask_document | Request, claim, download or authenticate a named record/certificate. |
| gemini_ask_process_090 | unsa ang proseso sa pagkuha ug CAV sa registrar | ask_process | ask_document | Request, claim, download or authenticate a named record/certificate. |
| gemini_ask_general_info_036 | what courses are offered in BukSU | ask_general_info | ask_availability | Available programs or services; not a definition of a particular program. |
| gemini_ask_general_info_043 | what day is wash day | ask_general_info | ask_schedule | Asks which day wash day occurs. |
| gemini_ask_general_info_049 | what services does the clinic offer | ask_general_info | ask_availability | Available programs or services; not a definition of a particular program. |
| gemini_ask_general_info_050 | what medical services are available at the university clinic | ask_general_info | ask_availability | Available programs or services; not a definition of a particular program. |
| gemini_ask_general_info_052 | what dental services are offered at the clinic | ask_general_info | ask_availability | Available programs or services; not a definition of a particular program. |
| gemini_ask_general_info_056 | what scholarships are available at BukSU | ask_general_info | ask_availability | Available programs or services; not a definition of a particular program. |
| gemini_ask_general_info_085 | asa dapit ang mga satellite campuses sa BukSU sa Bukidnon ug Misamis Oriental | ask_general_info | ask_location | Asks where satellite campuses are located. |
| gemini_ask_document_011 | enrollment document list | ask_document | ask_requirement | Enrollment checklist, not obtaining a specific document. |
| gemini_ask_document_012 | what documents do I need to bring on enrollment day | ask_document | ask_requirement | Enrollment checklist, not obtaining a specific document. |
| gemini_ask_document_047 | how to get a library borrower card | ask_document | ask_process | Obtaining a physical ID card is an issuance workflow. |

## Excluded questions

The following are excluded from the experiment, not silently accepted or awaiting an approval that blocks training. They may be reconsidered in a future dataset revision after their source references are established.

| ID | Question | Reason |
|---|---|---|
| gemini_ask_facility_availability_041 | does BukSU have science laboratories | unresolved_location_reference |
| gemini_ask_facility_availability_053 | does BukSU have a Botanical Garden inside the campus | unresolved_location_reference |
| gemini_ask_facility_availability_054 | naa bay botanical garden sa BukSU | unresolved_location_reference |
| gemini_ask_facility_availability_057 | does BukSU have an Automotive Laboratory | unresolved_location_reference |
| gemini_ask_facility_availability_058 | naa bay Automotive Lab para sa COT students | unresolved_location_reference |
| gemini_ask_facility_availability_067 | does BukSU have a Child Minding Center | unresolved_location_reference |
| gemini_ask_facility_availability_077 | is there a breastfeeding station or lactation room on campus | unresolved_location_reference |
| gemini_ask_facility_availability_086 | does BukSU have a Research Center building on campus | unresolved_location_reference |
| gemini_ask_facility_availability_087 | naa bay Research Center sa BukSU | unresolved_location_reference |
| gemini_ask_facility_availability_088 | is there a University Press or Printing Press building in BukSU | unresolved_location_reference |
| gemini_ask_facility_availability_089 | does BukSU have a Motorpool or vehicle garage | unresolved_location_reference |

## Other dispositions

- Normalized duplicates: 15, retained in the manifest.
- Development reserve: 280; whole groups exceeding planning targets, not missing data.
- Context-dependent conversation cases: 43, separate from NLU split percentages.
- Challenge cases: 48, a development pool, not ordinary nlu_fallback training examples.
- Language judgments are agent-reviewed, not certified by an independent fluent speaker.
- Expected final-answer topic IDs remain null unless independently approved; this dataset evaluates intent/entity labels.
