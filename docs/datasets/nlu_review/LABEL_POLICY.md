# NLU label policy for this experiment

This policy applies to prepared data only; runtime routing has not been changed. The decisions and original labels are recorded in label_decisions.json. Validation must establish compatibility with the current router.

| Label | Intended meaning |
|---|---|
| ask_location | Directions, building, office, or physical location. A transaction venue can be a location question. |
| ask_schedule | Dates, deadlines, opening hours or duration. Requests to change a schedule are procedures. Historical institutional dates remain general information. |
| ask_fee | Price, payment amount, or whether a service is free. |
| ask_requirement | Eligibility, qualifications, or a checklist of what to bring. |
| ask_process | Completing a transaction: enrollment, validation, physical ID issuance/replacement, troubleshooting. |
| ask_document | Requesting, downloading, claiming, reprinting or authenticating a named record, certificate or form. A request for a form is not a requirement merely because its purpose mentions requirements. |
| ask_general_info | Definitions, institutional facts, policy explanations, leadership or college information. |
| ask_contact | Contact channels: telephone, email, official website or social page. |
| ask_availability | Offered degree programs or student services. |
| ask_facility_availability | Whether a physical campus facility exists. Opening time is schedule; directions are location. |
| ask_follow_up | Generic requests for elaboration/continuation. A contextual question with a new purpose is not automatically assigned this label. |
| smalltalk | Greetings, gratitude and existing creator/capability wording retained where already labeled smalltalk. |
| goodbye | Ending the conversation. |
| bot_challenge | Asking whether the respondent is human or a bot. |
| set_category / reset_category | Natural-language category selection/reset. Slash payloads have separate functional checks. |

## Intent recognition versus conversation handling

A question such as “where is it?” can clearly express ask_location even when the referent requires context. Likewise “please elaborate” expresses ask_follow_up. These can have NLU labels and retain separate answer-context metadata. Ambiguous subject-changing follow-ups remain conversation cases.

## Fallback

The configured FallbackClassifier remains in the experiment config. The prepared dataset does not invent hundreds of nlu_fallback examples. The original three nonsense examples are preserved in the baseline snapshot/challenge pool. Unsupported questions and ambiguous supported questions require different response rubrics; they are not all expected to return the same text.

## Scope

These are documented engineering decisions, not evidence of improved accuracy. Some labels intentionally differ from the old model's training labels. Compare results as a dataset/policy revision, not a pure test of example quantity or an NLU ablation.
