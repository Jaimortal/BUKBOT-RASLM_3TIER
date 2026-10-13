// Dataset decisions only: no runtime classifier or routing changes.
const normalize = s => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
const genericFollowUps = new Set([2,3,4,7,8,13,14,17,18,21,27,34,35,38,42,43,44,49,56,58,59]);
function applyLabelPolicy(row) {
  const original = row.intent;
  const text = normalize(row.text);
  let reason = 'Retained broad intent after dataset boundary review.';
  const change = (intent, why) => {row.intent = intent; reason = why;};
  if (original === 'ask_location' && /^(is there|does .* have|naa bay)/.test(text))
    change('ask_facility_availability', 'Facility existence, not directions.');
  if (original === 'ask_availability' && /\b(dorm|dormitory|dormitories|library|clinic|gym|parking|atm)\b/.test(text)) {
    if (/\b(open today|opening|hours)\b/.test(text)) change('ask_schedule', 'Opening time/hours.');
    else change('ask_facility_availability', 'Existence of a campus facility.');
  }
  if (original === 'ask_general_info' && /\b(courses|programs|masters|masteral|offer|offered|available)\b/.test(text)) {
    if (!/\b(what is|what are the rules|what is the difference|tell me about|history|benefits|polic)\b/.test(text))
      change('ask_availability', 'Available programs or services; not a definition of a particular program.');
  }
  if (original === 'ask_process' && /^(what are the student services|services that buksu can provide|services list|unsay mga services ni buksu)$/.test(text))
    change('ask_availability', 'Listing offered services, not completing a transaction.');
  if (['ask_document','ask_process'].includes(original)) {
    const record = /\b(cor|certificate of registration|tor|transcript|good moral|diploma|cav|inc form|test permit)\b/.test(text);
    const validationOrReplacement = /\b(validat\w*|lost student id|nawala.*student id|replacement|replace)\b/.test(text);
    const physicalId = /\b(student id|library id|library borrower card)\b/.test(text) && !/\b(form|claim|iclaim|download)\b/.test(text);
    if (original === 'ask_document' && /^(enrollment document list|what documents do i need to bring on enrollment day)$/.test(text))
      change('ask_requirement', 'Enrollment checklist, not obtaining a specific document.');
    else if (validationOrReplacement && !/\bform\b/.test(text)) change('ask_process', 'Validation/replacement workflow.');
    else if (physicalId) change('ask_process', 'Obtaining a physical ID card is an issuance workflow.');
    else if (record) change('ask_document', 'Request, claim, download or authenticate a named record/certificate.');
    else if (original === 'ask_document') reason = 'Specific form/document request; a purpose clause does not make it a requirements checklist.';
  }
  const overrides = {
    gemini_ask_general_info_043: ['ask_schedule', 'Asks which day wash day occurs.'],
    gemini_ask_general_info_085: ['ask_location', 'Asks where satellite campuses are located.'],
    gemini_ask_general_info_087: ['ask_general_info', 'Historical founding/conversion year is institutional information.'],
    gemini_ask_general_info_100: ['ask_general_info', 'Institutional college list, not offered degree programs.'],
  };
  if (overrides[row.id]) change(...overrides[row.id]);
  row.context_for_answer = Boolean(row.context && row.context !== 'None (standalone)');
  row.nlu_context_independent = !row.context_for_answer;
  if (row.context_for_answer) {
    if (original === 'ask_follow_up') {
      row.nlu_context_independent = genericFollowUps.has(Number(row.id.slice(-3)));
      if (!row.nlu_context_independent) row.exclusion_reason = 'Contextual follow-up introduces a new subject/purpose; retained as conversation development case, not a standalone label.';
    } else {
      row.nlu_context_independent = ['ask_location','ask_schedule','ask_fee','ask_requirement','ask_contact','ask_document','ask_facility_availability','ask_availability'].includes(row.intent);
    }
  }
  row.original_intent = original;
  row.label_decision = reason;
  row.review_status = 'agent_reviewed_for_nlu_experiment_not_human_certified';
  return row;
}
module.exports = {applyLabelPolicy};
