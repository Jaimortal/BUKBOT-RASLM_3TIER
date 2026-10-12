# Items requiring a labeling decision

These questions are excluded from the proposed NLU splits. The original text and label remain in the source snapshot and manifest. No production label was changed.

The automatic boundary screen is conservative: being listed here does not mean a question is wrong. Review the intended meaning against actual router behavior. For example, asking where a transaction happens can legitimately be a location intent.

| ID | Current label | Question | Reason |
|---|---|---|---|
| original_ask_location_025 | ask_location | is there an ATM inside the campus | location_facility_existence_boundary |
| original_ask_process_014 | ask_process | how do I get student ID | document_process_boundary_needs_decision |
| original_ask_process_015 | ask_process | unsaon pagkuha sa student ID | document_process_boundary_needs_decision |
| original_ask_process_016 | ask_process | unsaon pagkuha sa library ID | document_process_boundary_needs_decision |
| original_ask_process_017 | ask_process | steps for COR validation | document_process_boundary_needs_decision |
| original_ask_process_025 | ask_process | how do I request COR | document_process_boundary_needs_decision |
| original_ask_process_026 | ask_process | unsaon nako pag request og COR | document_process_boundary_needs_decision |
| original_ask_process_027 | ask_process | where to get COR | document_process_boundary_needs_decision |
| original_ask_process_028 | ask_process | where can I get COR | document_process_boundary_needs_decision |
| original_ask_process_029 | ask_process | asa makuha ang COR | document_process_boundary_needs_decision |
| original_ask_process_030 | ask_process | how to get COR | document_process_boundary_needs_decision |
| original_ask_process_045 | ask_process | how do I validate my student ID | document_process_boundary_needs_decision |
| original_ask_process_046 | ask_process | how to validate COR | document_process_boundary_needs_decision |
| original_ask_process_047 | ask_process | COR validation process | document_process_boundary_needs_decision |
| original_ask_process_048 | ask_process | what are the student services | process_general_info_boundary |
| original_ask_process_049 | ask_process | services that buksu can provide | process_general_info_boundary |
| original_ask_process_050 | ask_process | services list | process_general_info_boundary |
| original_ask_process_051 | ask_process | unsay mga services ni buksu | process_general_info_boundary |
| original_ask_general_info_006 | ask_general_info | master courses | general_info_availability_boundary |
| original_ask_general_info_007 | ask_general_info | masters courses | general_info_availability_boundary |
| original_ask_general_info_008 | ask_general_info | masteral programs | general_info_availability_boundary |
| original_ask_general_info_009 | ask_general_info | does BukSU offer masters | general_info_availability_boundary |
| original_ask_general_info_010 | ask_general_info | courses | general_info_availability_boundary |
| original_ask_general_info_011 | ask_general_info | courses offered | general_info_availability_boundary |
| original_ask_general_info_012 | ask_general_info | courses offerd by buksu | general_info_availability_boundary |
| original_ask_general_info_013 | ask_general_info | do buksu offer BSAP | general_info_availability_boundary |
| original_ask_availability_047 | ask_availability | naa bay dormitory | availability_facility_or_hours_boundary |
| original_ask_availability_048 | ask_availability | does buksu have dormitory | availability_facility_or_hours_boundary; same_normalized_question_multiple_intents |
| original_ask_availability_049 | ask_availability | does buksu have dormitories | availability_facility_or_hours_boundary |
| original_ask_availability_050 | ask_availability | dormitory availability | availability_facility_or_hours_boundary |
| original_ask_availability_051 | ask_availability | is library open today | availability_facility_or_hours_boundary |
| original_ask_facility_availability_019 | ask_facility_availability | does BukSU have dormitory | same_normalized_question_multiple_intents |
| original_ask_document_001 | ask_document | where can I get INC form | document_process_boundary_needs_decision |
| original_ask_document_002 | ask_document | asa makakuha og INC form | document_process_boundary_needs_decision |
| original_ask_document_003 | ask_document | can I download COR | document_process_boundary_needs_decision |
| original_ask_document_004 | ask_document | where to request COR | document_process_boundary_needs_decision |
| original_ask_document_005 | ask_document | I need test permit | document_process_boundary_needs_decision |
| original_ask_document_006 | ask_document | how to get certificate of registration | document_process_boundary_needs_decision |
| original_ask_document_007 | ask_document | where can I get library ID | document_process_boundary_needs_decision |
| original_ask_document_008 | ask_document | student ID form | document_process_boundary_needs_decision |
| original_ask_document_011 | ask_document | enrollment document list | document_requirement_boundary |
| original_ask_document_012 | ask_document | what documents do I need to bring on enrollment day | document_requirement_boundary |
| gemini_ask_process_014 | ask_process | how to get TOR | document_process_boundary_needs_decision |
| gemini_ask_process_015 | ask_process | how to request transcript of records | document_process_boundary_needs_decision |
| gemini_ask_process_016 | ask_process | unsaon pagkuha og TOR | document_process_boundary_needs_decision |
| gemini_ask_process_017 | ask_process | how to validate COR | document_process_boundary_needs_decision |
| gemini_ask_process_022 | ask_process | COR validation process | document_process_boundary_needs_decision |
| gemini_ask_process_023 | ask_process | unsaon pag-validate sa COR | document_process_boundary_needs_decision |
| gemini_ask_process_032 | ask_process | how to get student ID | document_process_boundary_needs_decision |
| gemini_ask_process_033 | ask_process | how to validate student ID | document_process_boundary_needs_decision |
| gemini_ask_process_062 | ask_process | how to replace a lost student ID | document_process_boundary_needs_decision |
| gemini_ask_process_063 | ask_process | unsay buhaton kung nawala akong student ID | document_process_boundary_needs_decision |
| gemini_ask_process_089 | ask_process | how to apply for CAV authentication at the registrar | document_process_boundary_needs_decision |
| gemini_ask_process_090 | ask_process | unsa ang proseso sa pagkuha ug CAV sa registrar | document_process_boundary_needs_decision |
| gemini_ask_general_info_036 | ask_general_info | what courses are offered in BukSU | general_info_availability_boundary |
| gemini_ask_general_info_049 | ask_general_info | what services does the clinic offer | general_info_availability_boundary |
| gemini_ask_general_info_050 | ask_general_info | what medical services are available at the university clinic | general_info_availability_boundary |
| gemini_ask_general_info_052 | ask_general_info | what dental services are offered at the clinic | general_info_availability_boundary |
| gemini_ask_general_info_056 | ask_general_info | what scholarships are available at BukSU | general_info_availability_boundary |
| gemini_ask_facility_availability_041 | ask_facility_availability | does BukSU have science laboratories | unresolved_location_reference |
| gemini_ask_facility_availability_053 | ask_facility_availability | does BukSU have a Botanical Garden inside the campus | unresolved_location_reference |
| gemini_ask_facility_availability_054 | ask_facility_availability | naa bay botanical garden sa BukSU | unresolved_location_reference |
| gemini_ask_facility_availability_057 | ask_facility_availability | does BukSU have an Automotive Laboratory | unresolved_location_reference |
| gemini_ask_facility_availability_058 | ask_facility_availability | naa bay Automotive Lab para sa COT students | unresolved_location_reference |
| gemini_ask_facility_availability_067 | ask_facility_availability | does BukSU have a Child Minding Center | unresolved_location_reference |
| gemini_ask_facility_availability_077 | ask_facility_availability | is there a breastfeeding station or lactation room on campus | unresolved_location_reference |
| gemini_ask_facility_availability_086 | ask_facility_availability | does BukSU have a Research Center building on campus | unresolved_location_reference |
| gemini_ask_facility_availability_087 | ask_facility_availability | naa bay Research Center sa BukSU | unresolved_location_reference |
| gemini_ask_facility_availability_088 | ask_facility_availability | is there a University Press or Printing Press building in BukSU | unresolved_location_reference |
| gemini_ask_facility_availability_089 | ask_facility_availability | does BukSU have a Motorpool or vehicle garage | unresolved_location_reference |
| gemini_ask_document_001 | ask_document | where to request TOR | document_process_boundary_needs_decision |
| gemini_ask_document_002 | ask_document | where can I claim my TOR | document_process_boundary_needs_decision |
| gemini_ask_document_004 | ask_document | can I reprint my COR | document_process_boundary_needs_decision |
| gemini_ask_document_006 | ask_document | how to get good moral certificate | document_process_boundary_needs_decision |
| gemini_ask_document_007 | ask_document | where to request good moral | document_process_boundary_needs_decision |
| gemini_ask_document_009 | ask_document | how to request diploma | document_process_boundary_needs_decision |
| gemini_ask_document_010 | ask_document | how to get CAV | document_process_boundary_needs_decision |
| gemini_ask_document_011 | ask_document | enrollment document list | document_requirement_boundary |
| gemini_ask_document_012 | ask_document | what documents do I need to bring on enrollment day | document_requirement_boundary |
| gemini_ask_document_013 | ask_document | asa dapit mag request ug mag claim sa Transcript of Records | document_process_boundary_needs_decision |
| gemini_ask_document_014 | ask_document | pwede ba magpa reprint ug COR sa registrar kung nawala | document_process_boundary_needs_decision |
| gemini_ask_document_015 | ask_document | asa makuha ang Certificate of Good Moral Character | document_process_boundary_needs_decision |
| gemini_ask_document_017 | ask_document | asa pwede makuha ang akong diploma pagkahuman ug graduate | document_process_boundary_needs_decision |
| gemini_ask_document_018 | ask_document | asa magkuha ug CAV para sa CHED authentication | document_process_boundary_needs_decision |
| gemini_ask_document_027 | ask_document | how can I get a certified true copy of my COR or TOR | document_process_boundary_needs_decision |
| gemini_ask_document_028 | ask_document | asa magpa certified true copy sa COR ug grades | document_process_boundary_needs_decision |
| gemini_ask_document_029 | ask_document | where do I download or claim my BukSU CAT test permit | document_process_boundary_needs_decision |
| gemini_ask_document_030 | ask_document | unsaon pag download sa test permit para sa entrance exam | document_process_boundary_needs_decision |
| gemini_ask_document_039 | ask_document | where to claim my student ID card | document_process_boundary_needs_decision |
| gemini_ask_document_040 | ask_document | asa i-claim ang nahuman nga student ID | document_process_boundary_needs_decision |
| gemini_ask_document_051 | ask_document | can someone else claim my TOR with an authorization letter | document_process_boundary_needs_decision |
| gemini_ask_document_052 | ask_document | pwede ba ipakuha sa ginikanan akong TOR gamit ang authorization letter | document_process_boundary_needs_decision |
| gemini_ask_document_063 | ask_document | how to get a second copy of diploma if the original was lost | document_process_boundary_needs_decision |
| gemini_ask_document_066 | ask_document | wher to request good moral cert | document_process_boundary_needs_decision |
| gemini_ask_document_067 | ask_document | how to get TOR for board exam application | document_process_boundary_needs_decision |
| gemini_ask_document_068 | ask_document | unsaon pagkuha ug TOR nga naay remarks for board exam | document_process_boundary_needs_decision |
| gemini_ask_document_075 | ask_document | can I download my Certificate of Registration directly from SIAS | document_process_boundary_needs_decision |
| gemini_ask_document_076 | ask_document | ma-download ba ang COR gikan sa student portal | document_process_boundary_needs_decision |
| gemini_ask_document_079 | ask_document | asa mag request ug Red Ribbon / Apostille CAV | document_process_boundary_needs_decision |
| gemini_ask_document_081 | ask_document | hw to get transcript of record | document_process_boundary_needs_decision |
| gemini_ask_document_085 | ask_document | unsaon pag claim sa diploma ug TOR para sa fresh grad | document_process_boundary_needs_decision |
| gemini_ask_document_087 | ask_document | asa nga opisina magkuha ug Good Moral sa OSS ba o sa Registrar | document_process_boundary_needs_decision |
| gemini_ask_document_089 | ask_document | where can I get an affidavit of undertaking or promissory form for lacking requirements | document_requirement_boundary |
| gemini_ask_document_092 | ask_document | how to request an informative copy of TOR for evaluation | document_process_boundary_needs_decision |
| gemini_ask_document_093 | ask_document | pwede ba makakuha ug informative copy sa TOR sa registrar | document_process_boundary_needs_decision |
| gemini_ask_document_095 | ask_document | asa magpa CTC sa diploma sa BukSU | document_process_boundary_needs_decision |
| gemini_ask_document_099 | ask_document | how do I get my official transcript if I graduated years ago | document_process_boundary_needs_decision |
| gemini_ask_document_100 | ask_document | asa kuhaon ang INC form sa dean ba o sa registrar | document_process_boundary_needs_decision |

## Context-dependent cases

93 examples are in conversation_cases.json, with the supplied preceding-context strings. These are replay specifications requiring review, not standalone NLU test questions. In particular, ask_follow_up currently has no selected standalone validation/test examples. Its conversation cases are still available; do not report an NLU test score for that intent from these empty splits.

## Unverified answer references

The supplied topic strings were checked for exact existence only. All expected_topic_id fields are intentionally null: a valid reference is not proof that its answer satisfies the question. Use train/validation/test YAML for NLU intent/entity evaluation only. Approve expected answers separately before an end-to-end accuracy test.
