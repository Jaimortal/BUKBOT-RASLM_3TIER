// Rebuild review-only datasets. Never writes rasa/data or trains a model.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const yaml = require('js-yaml');
const {applyLabelPolicy} = require('./nlu_label_policy.cjs');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'docs/datasets/nlu_review');
const read = p => fs.readFileSync(p, 'utf8');
const hash = s => crypto.createHash('sha256').update(s).digest('hex');
const snapshot = read(path.join(out, 'source/original_nlu.yml'));
const baseline = yaml.load(snapshot);
const domain = yaml.load(read(path.join(root, 'rasa/domain.yml')));
const source = JSON.parse(read(path.join(out, 'source/gemini_candidates.json')));
const entities = new Set(domain.entities.map(x => typeof x === 'string' ? x : Object.keys(x)[0]));
const plain = s => s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
const normalize = s => plain(s).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
const template = s => normalize(s.replace(/\[[^\]]+\]\([^)]+\)/g, ' ENTITY '));
const targets = Object.fromEntries(baseline.nlu.filter(x => x.intent && x.intent !== 'nlu_fallback').map(x => [x.intent,
  ['ask_follow_up', 'smalltalk'].includes(x.intent) ? 60 : ['goodbye', 'bot_challenge', 'set_category', 'reset_category'].includes(x.intent) ? 40 : 100]));
const rows = [];
for (const block of baseline.nlu.filter(x => x.intent)) {
  const lines = block.examples.split(/\r?\n/).map(x => x.trim()).filter(x => x.startsWith('- '));
  lines.forEach((line, i) => rows.push({
    id: `original_${block.intent}_${String(i + 1).padStart(3, '0')}`,
    intent: block.intent, annotated: line.slice(2), text: plain(line.slice(2)),
    provenance: 'existing_nlu', source_reference: `source/original_nlu.yml:${block.intent}:${i + 1}`,
    original_split: 'train', original_group: null, language: 'not_reannotated',
    claimed_topic: null, context: null, reasons: [], review_status: 'baseline_retained',
  }));
}
const originalCount = rows.length;
const existingByExact = new Map(rows.map(r => [`${r.intent}\0${r.annotated}`, r]));
for (const x of source.items) {
  const existing = existingByExact.get(`${x.intent}\0${x.annotated}`);
  if (existing) {
    (existing.gemini_ids ||= []).push(x.id);
    (existing.original_groups ||= []).push(x.pgId);
    continue;
  }
  rows.push({id: `gemini_${x.id}`, intent: x.intent, annotated: x.annotated, text: plain(x.annotated),
    provenance: 'synthetic_candidate', source_reference: `source/gemini_candidates.json:${x.id}`,
    gemini_claimed_source: x.source, original_split: x.split, original_group: x.pgId,
    language: x.lang, claimed_topic: x.topic || null, context: x.context || null,
    reasons: [], review_status: 'synthetic_needs_human_review',
    provenance_correction: x.source === 'existing_nlu' ? 'Not an exact original example/annotation; treated as synthetic, never as preserved source data.' : null,
  });
}

// Index exact source references, including whole-topic containers. Existence is
// checked separately from whether that reference answers a particular question.
const topicRefs = new Map();
const knowledgePhrases = new Set();
const knowledgeHashes = {};
function walkFiles(dir) {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap(x => x.isDirectory() ? walkFiles(path.join(dir, x.name)) : x.name.endsWith('.json') ? [path.join(dir, x.name)] : []);
}
for (const file of walkFiles(path.join(root, 'rasa/actions/knowledge'))) {
  const raw = read(file), data = JSON.parse(raw), rel = path.relative(root, file).replaceAll('\\', '/');
  knowledgeHashes[rel] = hash(raw);
  const stem = path.basename(file, '.json');
  function visit(node, parts) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {node.forEach(n => visit(n, parts)); return;}
    const next = node.topic ? [...parts, node.topic] : parts;
    if (node.topic || node.intent) {
      const ref = {file: rel, topic_path: next.join('.'), intent: node.intent || null};
      if (next.length) topicRefs.set(`${stem}.${next.join('.')}`, ref);
      if (node.intent) topicRefs.set(node.intent, ref);
    }
    for (const p of node.metadata?.phrases || []) if (typeof p === 'string') knowledgePhrases.add(normalize(p));
    for (const [key, value] of Object.entries(node)) if (key !== 'metadata') visit(value, next);
  }
  visit(data, []);
  for (const key of Object.keys(data.locations || {})) topicRefs.set(`location.${key}`, {file: rel, location_key: key});
}

// Conservative boundary review: quarantine unresolved meanings instead of
// silently changing labels to fit Gemini's newly invented taxonomy.
function boundaryReasons(r) {
  const t = normalize(r.text), reasons = [];
  if (r.intent === 'ask_availability' && /\b(dorm|dormitory|dormitories|library|clinic|gym|parking|atm)\b/.test(t)) reasons.push('availability_facility_or_hours_boundary');
  if (r.intent === 'ask_document' || r.intent === 'ask_process') {
    if (/\b(cor|certificate of registration|student id|library id|tor|transcript|good moral|diploma|cav|inc form|test permit)\b/.test(t)) reasons.push('document_process_boundary_needs_decision');
    if (r.intent === 'ask_document' && /\b(requirements?|documents? needed|document list|documents do i need|documents.*bring)\b/.test(t)) reasons.push('document_requirement_boundary');
  }
  if (r.intent === 'ask_process' && /^(what are the student services|services that buksu can provide|services list|unsay mga services ni buksu)$/.test(t)) reasons.push('process_general_info_boundary');
  if (r.intent === 'ask_general_info' && /\b(courses|programs|masters|masteral|offer|offered|available)\b/.test(t)) reasons.push('general_info_availability_boundary');
  if (r.intent === 'ask_location' && /^(is there|does .* have|naa bay)/.test(t)) reasons.push('location_facility_existence_boundary');
  return reasons;
}
for (const r of rows) {
  applyLabelPolicy(r);
  r.topic_reference = topicRefs.get(r.claimed_topic) || null;
  r.topic_reference_status = !r.claimed_topic ? 'not_supplied' : r.topic_reference ? 'exists_answer_match_not_reviewed' : 'unresolved_or_behavior_label';
  // Unverified topic IDs are never exported as ground-truth answers.
  r.expected_topic_id = null;
  r.expected_behavior = r.intent === 'nlu_fallback' ? (/clarification/i.test(r.claimed_topic || '') ? 'clarification_candidate' : 'fallback_candidate') : 'intent_classification_only';
  r.knowledge_phrase_match = knowledgePhrases.has(normalize(r.text));
  // The first review quarantined these boundaries. They now have documented
  // decisions in nlu_label_policy.cjs; preserve old reasons for the audit.
  r.previous_boundary_flags = boundaryReasons({...r, intent: r.original_intent});
  for (const m of r.annotated.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) if (!entities.has(m[1])) r.reasons.push(`unknown_entity:${m[1]}`);
  if (r.text.startsWith('/')) r.partition = 'functional';
  else if (r.intent === 'nlu_fallback') r.partition = 'challenge';
  else if (r.context_for_answer && !r.nlu_context_independent) {r.partition = 'conversation'; r.reasons.push(r.exclusion_reason || 'context_requires_replay_not_standalone_nlu');}
  else if (r.reasons.length) r.partition = 'review';
  else r.partition = 'candidate';
  if (r.provenance === 'synthetic_candidate' && r.claimed_topic?.startsWith('location.') && !r.topic_reference) {
    r.reasons.push('unresolved_location_reference');
    if (r.partition === 'candidate') r.partition = 'excluded';
  }
}

// Find duplicate/conflicting labels across the entire corpus, not only selected
// rows. Keep original records auditable even when excluded from a proposed split.
const exactGroups = new Map();
for (const r of rows) {const k = normalize(r.text); if (!exactGroups.has(k)) exactGroups.set(k, []); exactGroups.get(k).push(r);}
for (const same of exactGroups.values()) {
  if (new Set(same.map(r => r.intent)).size > 1) {
    for (const r of same) {r.reasons.push('same_normalized_question_multiple_intents'); if (r.partition === 'candidate') r.partition = 'excluded';}
  } else {
    same.sort((a, b) => Number(b.provenance === 'existing_nlu') - Number(a.provenance === 'existing_nlu') || a.id.localeCompare(b.id));
    for (const r of same.slice(1)) if (r.partition === 'candidate') {r.partition = 'duplicate'; r.duplicate_of = same[0].id; r.reasons.push('normalized_duplicate_preserved_in_manifest');}
  }
}

// Group before splitting. Grouping is mechanical protection, not a claim that
// all semantic paraphrases have been detected. No randomness is used.
const candidates = rows.filter(r => r.partition === 'candidate');
const parent = candidates.map((_, i) => i);
const find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
const union = (a, b) => {a = find(a); b = find(b); if (a !== b) parent[b] = a;};
const tokens = candidates.map(r => new Set(normalize(r.text).split(' ')));
for (let i = 0; i < candidates.length; i++) for (let j = i + 1; j < candidates.length; j++) {
  const a = candidates[i], b = candidates[j];
  if (a.intent !== b.intent) continue;
  const aGroups = a.original_groups || [a.original_group].filter(Boolean);
  const bGroups = b.original_groups || [b.original_group].filter(Boolean);
  const sameSuppliedGroup = aGroups.some(g => bGroups.includes(g));
  const sameTemplate = template(a.annotated).includes('entity') && template(a.annotated) === template(b.annotated);
  const intersection = [...tokens[i]].filter(t => tokens[j].has(t)).length;
  const similarity = intersection / new Set([...tokens[i], ...tokens[j]]).size;
  if (sameSuppliedGroup || sameTemplate || similarity >= 0.8) union(i, j);
}
const groups = new Map();
candidates.forEach((r, i) => {const k = find(i); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r);});
const splitCount = Object.fromEntries(Object.keys(targets).map(k => [k, {train: 0, validation: 0, test: 0}]));
for (const group of groups.values()) {
  const groupId = 'group_' + hash(group.map(r => r.id).sort().join('|')).slice(0, 12);
  group.forEach(r => r.group_id = groupId);
  const intent = group[0].intent;
  const exposed = group.some(r => r.provenance === 'existing_nlu' || r.original_split === 'train' || r.knowledge_phrase_match);
  const split = exposed ? 'train' : group.some(r => r.original_split === 'val') ? 'validation' : 'test';
  const limit = Math.round(targets[intent] * (split === 'train' ? 0.7 : 0.15));
  // Never discard original records to fit a percentage. Entire groups remain
  // together, and groups exceeding the target go to the development reserve.
  const hasOriginal = group.some(r => r.provenance === 'existing_nlu');
  if (!hasOriginal && splitCount[intent][split] + group.length > limit) {
    group.forEach(r => {r.partition = 'reserve'; r.reasons.push(`whole_group_exceeds_${split}_planning_target`);});
  } else {
    group.forEach(r => {r.partition = split; r.development_exposed = exposed;});
    splitCount[intent][split] += group.length;
  }
}

const metadata = {
  status: 'PREPARED_FOR_ISOLATED_NLU_EXPERIMENT_NOT_RETRAINED', intended_ratio: '70/15/15',
  split_method: 'Deterministic source order; whole groups; existing/development-exposed groups locked to training; no forced target counts.',
  source_nlu_sha256: hash(snapshot), active_nlu_matches_snapshot: hash(read(path.join(root, 'rasa/data/nlu.yml'))) === hash(snapshot),
  source_candidates_sha256: hash(read(path.join(out, 'source/gemini_candidates.json'))),
  knowledge_sha256: knowledgeHashes,
  evaluation_scope: 'Synthetic NLU classification candidates only. Topic references are not verified expected answers. No measured model or chatbot accuracy.',
  limitations: ['Agent-reviewed labels are not independent human certification.', 'Mechanical grouping does not establish semantic independence.', 'Synthetic test candidates are not an independent student final evaluation.', 'Answer-ground-truth review is separate from NLU classification.'],
};
const selected = rows.filter(r => ['train', 'validation', 'test'].includes(r.partition));
const report = {
  metadata,
  original_examples: originalCount,
  original_disposition: Object.fromEntries([...new Set(rows.filter(r => r.provenance === 'existing_nlu').map(r => r.partition))].map(k => [k, rows.filter(r => r.provenance === 'existing_nlu' && r.partition === k).length])),
  corrected_false_existing_claims: rows.filter(r => r.provenance_correction).length,
  counts: Object.fromEntries([...new Set(rows.map(r => r.partition))].map(k => [k, rows.filter(r => r.partition === k).length])),
  selected_language_tags: Object.fromEntries([...new Set(selected.map(r => r.language))].map(k => [k, selected.filter(r => r.language === k).length])),
  per_intent: Object.entries(targets).map(([intent, target]) => {const counts = splitCount[intent]; const total = Object.values(counts).reduce((a,b) => a+b, 0); return {intent, target, total, ...counts, shortfall: Math.max(0, target-total), percentages: Object.fromEntries(Object.entries(counts).map(([k,n])=>[k, total ? +(100*n/total).toFixed(2) : 0]))};}),
};

// These assertions guard preservation, isolation, and the exact files emitted.
assert.equal(rows.filter(r => r.provenance === 'existing_nlu').length, originalCount);
assert(selected.every(r => !r.text.startsWith('/') && r.intent !== 'nlu_fallback'));
assert(selected.filter(r => r.provenance === 'existing_nlu').every(r => r.partition === 'train'));
assert(selected.filter(r => r.partition !== 'train').every(r => !r.development_exposed && !r.knowledge_phrase_match));
for (const key of ['group_id', 'normalized_text']) {
  const seen = new Map();
  for (const r of selected) {const value = key === 'normalized_text' ? normalize(r.text) : r[key]; if (seen.has(value)) assert.equal(seen.get(value), r.partition); seen.set(value, r.partition);}
}
function emitJSON(name, data) {fs.writeFileSync(path.join(out, name), JSON.stringify(data, null, 2) + '\n');}
function emitYAML(split) {
  const chosen = rows.filter(r => r.partition === split);
  const blocks = Object.keys(targets).map(intent => ({intent, examples: chosen.filter(r => r.intent === intent).map(r => `- ${r.annotated}`).join('\n') + '\n'})).filter(x => x.examples !== '\n');
  if (split === 'train') blocks.push(...baseline.nlu.filter(x => !x.intent));
  const doc = {version: '3.1', nlu: blocks};
  const output = '# REVIEW ONLY. Outside active Rasa training inputs. See README.md for actual counts.\n' + yaml.dump(doc, {lineWidth: -1, noRefs: true});
  const parsed = yaml.load(output);
  assert.equal(parsed.nlu.filter(x => x.intent).reduce((n,b)=>n+b.examples.trim().split('\n').length,0), chosen.length);
  fs.writeFileSync(path.join(out, `${split}.yml`), output);
  emitJSON(`${split}.json`, {metadata, count: chosen.length, items: chosen});
}
['train', 'validation', 'test'].forEach(emitYAML);
emitJSON('manifest.json', {metadata, items: rows});
emitJSON('review_queue.json', {metadata, items: rows.filter(r => ['review', 'excluded', 'duplicate', 'reserve'].includes(r.partition))});
emitJSON('label_decisions.json', {metadata, items: rows.filter(r => r.original_intent !== r.intent || r.previous_boundary_flags.length).map(r => ({id:r.id,text:r.text,original_intent:r.original_intent,intent:r.intent,decision:r.label_decision,partition:r.partition}))});
emitJSON('challenge_cases.json', {metadata, split: 'development_challenge_pool_not_final_test', items: rows.filter(r => r.partition === 'challenge')});
emitJSON('conversation_cases.json', {metadata, split: 'development_conversation_pool_not_final_test', items: rows.filter(r => r.partition === 'conversation')});
emitJSON('functional_cases.json', {metadata, original_payloads: rows.filter(r => r.partition === 'functional'), proposed_payloads: source.functional});
emitJSON('verification.json', {...report, assertions: 'PASS: original row accounting, source-only parsing, split isolation, grouped split isolation, no challenge/payload training, YAML count round-trip. Not a model accuracy test.'});
require('./write_nlu_guide.cjs')({out, report, rows});
console.log(JSON.stringify({output: path.relative(root, out), original_examples: originalCount, original_disposition: report.original_disposition, counts: report.counts, checks: 'PASS'}, null, 2));
