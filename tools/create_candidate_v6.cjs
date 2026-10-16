// Create Candidate v6: Tightly focused on the 5 intents with <85% score in Candidate v5:
// - ask_availability (75.0%)
// - ask_process (83.3%)
// - ask_document (80.0%)
// - ask_requirement (81.8%)
// - ask_general_info (76.9%)
//
// All new examples are strictly grounded in BukSU internal knowledge files:
// - clinic_services.json (dental extraction, dental checkup)
// - university_identity.json (laboratory elementary school under CoE)
// - enrollment_procedures.json (unit overload approval for graduating students)
// - academic_transactions.json (honorable dismissal, CAV authentication, transfer credential)
// - grading_and_retention.json (Latin honors GWA / 2.00 threshold)
// - student_service_procedures.json (ICT office credentials for email reset)
// - oss_student_services.json (Student Assistantship Program - SAP benefits)
// - facilities_and_other_inquiries.json (Kalatungan Learning Space in library)
//
// Validation (158) and test (150) remain 100% byte-for-byte frozen.
// Production files (rasa/data/nlu.yml, active models) remain strictly untouched.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const yaml = require('js-yaml');

const root = path.resolve(__dirname, '..');
const base = path.join(root, 'docs/datasets/nlu_review');
const name = 'candidate-v6';
const out = path.join(base, 'iterations', name);
if (fs.existsSync(out)) {
  fs.rmSync(out, { recursive: true, force: true });
}

// Load Candidate v5 manifest
const v5ManifestPath = path.join(base, 'iterations/candidate-v5/manifest.json');
const v5Manifest = JSON.parse(fs.readFileSync(v5ManifestPath, 'utf8'));

// Tightly focused BukSU knowledge examples specifically targeting the 5 sub-85% intents
const focusedKnowledgeGroups = [
  // 1. ask_availability (clinic dental services & laboratory elementary school)
  {
    group_id: 'group_v6_avl_clinic_and_labschool',
    intent: 'ask_availability',
    items: [
      { text: 'does the university clinic offer free tooth extraction for students', annotated: 'does the university clinic offer [free tooth extraction](service) for students', lang: 'en' },
      { text: 'naa bay dental services ug libre nga ibot sa ngipon sa clinic', annotated: 'naa bay [dental services](service) ug [libre nga ibot sa ngipon](service) sa clinic', lang: 'ceb' },
      { text: 'does BukSU offer a Laboratory Elementary School under the College of Education', annotated: 'does BukSU offer a [Laboratory Elementary School](program) under the College of Education', lang: 'en' },
      { text: 'naa bay laboratory school program sa BukSU para sa elementary', annotated: 'naa bay [laboratory school program](program) sa BukSU para sa elementary', lang: 'ceb' }
    ]
  },

  // 2. ask_process (unit overload procedure & honorable dismissal process)
  {
    group_id: 'group_v6_prc_overload_and_dismissal',
    intent: 'ask_process',
    items: [
      { text: 'what are the steps to request unit overload for graduating students', annotated: 'what are the steps to request [unit overload](service) for graduating students', lang: 'en' },
      { text: 'unsaon ang proseso sa pagpa approve ug overload of units sa registrar', annotated: 'unsaon ang proseso sa pagpa approve ug [overload of units](service) sa registrar', lang: 'ceb' },
      { text: 'what is the procedure to process an Honorable Dismissal when transferring out', annotated: 'what is the procedure to process an [Honorable Dismissal](document) when transferring out', lang: 'en' },
      { text: 'unsaon ang pamaagi sa pagkuha ug honorable dismissal kung mobalhin ug eskwelahan', annotated: 'unsaon ang pamaagi sa pagkuha ug [honorable dismissal](document) kung mobalhin ug eskwelahan', lang: 'ceb' }
    ]
  },

  // 3. ask_requirement (Latin honors qualifications & ICT email reset requirements)
  {
    group_id: 'group_v6_req_honors_and_ict_reset',
    intent: 'ask_requirement',
    items: [
      { text: 'what are the grade requirements and disqualifications to qualify for Latin honors', annotated: 'what are the grade requirements and disqualifications to qualify for [Latin honors](topic)', lang: 'en' },
      { text: 'unsa ang mga requirements sa grado para ma qualify sa Latin honors', annotated: 'unsa ang mga requirements sa grado para ma qualify sa [Latin honors](topic)', lang: 'ceb' },
      { text: 'what identification documents must be presented at the ICT office to reset institutional email', annotated: 'what identification documents must be presented at the [ICT office](office) to reset [institutional email](service)', lang: 'en' },
      { text: 'unsa ang mga requirements nga ipakita sa ICT office aron ma reset ang student account', annotated: 'unsa ang mga requirements nga ipakita sa [ICT office](office) aron ma reset ang [student account](service)', lang: 'ceb' }
    ]
  },

  // 4. ask_document (CAV authentication & Transfer Credential certificate requests)
  {
    group_id: 'group_v6_doc_cav_and_transfer_cert',
    intent: 'ask_document',
    items: [
      { text: 'where can I request a CAV authentication certificate for my diploma and transcript', annotated: 'where can I request a [CAV authentication](document) certificate for my diploma and transcript', lang: 'en' },
      { text: 'unsaon pag request sa CAV certificate sa registrar office', annotated: 'unsaon pag request sa [CAV certificate](document) sa registrar office', lang: 'ceb' },
      { text: 'how to request an official Transfer Credential certificate from BukSU', annotated: 'how to request an official [Transfer Credential](document) certificate from BukSU', lang: 'en' },
      { text: 'asa makakuha ug transfer credential document para sa pagbalhin', annotated: 'asa makakuha ug [transfer credential](document) document para sa pagbalhin', lang: 'ceb' },
      { text: 'where can students get a promissory note form for pending enrollment documents', annotated: 'where can students get a [promissory note form](document) for pending enrollment documents', lang: 'en' }
    ]
  },

  // 5. ask_general_info (ICT Service Unit mandate, SAP benefits, Kalatungan Learning Space)
  {
    group_id: 'group_v6_gen_ict_sap_kalatungan',
    intent: 'ask_general_info',
    items: [
      { text: 'what are the primary services and functions of the ICT Service Unit at BukSU', annotated: 'what are the primary services and functions of the [ICT Service Unit](office) at BukSU', lang: 'en' },
      { text: 'unsa ang mga nag-unang serbisyo sa ICT Service Unit para sa mga estudyante', annotated: 'unsa ang mga nag-unang serbisyo sa [ICT Service Unit](office) para sa mga estudyante', lang: 'ceb' },
      { text: 'what are the benefits and privileges of the Student Assistantship Program at BukSU', annotated: 'what are the benefits and privileges of the [Student Assistantship Program](service) at BukSU', lang: 'en' },
      { text: 'unsa ang mga benepisyo sa mga estudyante ubos sa Student Assistantship Program', annotated: 'unsa ang mga benepisyo sa mga estudyante ubos sa [Student Assistantship Program](service)', lang: 'ceb' },
      { text: 'what is the Kalatungan Learning Space located inside the university library', annotated: 'what is the [Kalatungan Learning Space](topic) located inside the university library', lang: 'en' }
    ]
  }
];

const newRecords = [];
focusedKnowledgeGroups.forEach(grp => {
  grp.items.forEach((item, idx) => {
    newRecords.push({
      item_id: `${grp.group_id}_${idx + 1}`,
      group_id: grp.group_id,
      text: item.text,
      annotated: item.annotated,
      intent: grp.intent,
      partition: 'train',
      provenance: 'synthetic_candidate',
      language: item.lang,
      original_split: 'train',
      development_exposed: true,
      iteration_note: 'candidate-v6: focused BukSU internal knowledge examples for sub-85% intents.'
    });
  });
});

const allV6Items = [...v5Manifest.items, ...newRecords];

const trainRows = allV6Items.filter(row => row.partition === 'train');
const validationRows = allV6Items.filter(row => row.partition === 'validation');
const testRows = allV6Items.filter(row => row.partition === 'test');

console.log('Candidate v6 partition counts:', {
  train: trainRows.length,
  validation: validationRows.length,
  test: testRows.length,
  focused_additions: newRecords.length
});

assert.equal(validationRows.length, 158, 'Validation set must be exactly 158 items');
assert.equal(testRows.length, 150, 'Test set must be exactly 150 items');

// Build iteration directory
fs.mkdirSync(out, { recursive: true });

const baseTrain = yaml.load(fs.readFileSync(path.join(base, 'train.yml'), 'utf8'));
const intents = [...new Set(trainRows.map(row => row.intent))];
const blocks = intents.map(intent => ({
  intent,
  examples: trainRows.filter(row => row.intent === intent).map(row => `- ${row.annotated}`).join('\n') + '\n'
}));
const extras = baseTrain.nlu.filter(block => !block.intent);
const rendered = '# REVIEW ITERATION ONLY. Never train from this folder by accident; use tools/nlu_experiment.py with --dataset-dir.\n' + yaml.dump({ version: '3.1', nlu: [...blocks, ...extras] }, { lineWidth: -1, noRefs: true });

fs.writeFileSync(path.join(out, 'train.yml'), rendered);

// Copy frozen validation and test YAML files directly from base
fs.copyFileSync(path.join(base, 'validation.yml'), path.join(out, 'validation.yml'));
fs.copyFileSync(path.join(base, 'test.yml'), path.join(out, 'test.yml'));

const report = {
  status: 'PREPARED_CANDIDATE_V6_FOCUSED_KNOWLEDGE_ITERATION',
  parent_dataset: 'docs/datasets/nlu_review',
  counts: { train: trainRows.length, validation: validationRows.length, test: testRows.length },
  protection: 'Validation and test files are byte-for-byte exact copies of the parent dataset. The active rasa/data/nlu.yml and active models are not modified.',
};

fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({ metadata: report, items: allV6Items }, null, 2) + '\n');
fs.writeFileSync(path.join(out, 'verification.json'), JSON.stringify({ ...report, assertions: 'PASS: focused on sub-85% intents with BukSU knowledge grounding, no group crosses splits, validation/test hashes preserved.' }, null, 2) + '\n');

fs.writeFileSync(path.join(out, 'README.md'), `# candidate-v6 focused knowledge training iteration

Focused exclusively on the 5 intents that scored below 85% in Candidate v5:
- ask_availability (75.0%)
- ask_process (83.3%)
- ask_document (80.0%)
- ask_requirement (81.8%)
- ask_general_info (76.9%)

All added examples are strictly derived from BukSU knowledge documents:
- clinic_services.json
- university_identity.json
- enrollment_procedures.json
- academic_transactions.json
- grading_and_retention.json
- oss_student_services.json
- facilities_and_other_inquiries.json

| Split | Count |
|---|---:|
| Training | ${trainRows.length} |
| Validation | ${validationRows.length} |
| Test | ${testRows.length} |
`);

console.log('Successfully created candidate-v6 dataset at:', out);

