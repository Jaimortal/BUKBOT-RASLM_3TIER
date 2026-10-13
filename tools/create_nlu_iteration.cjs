// Create a training-only NLU iteration from reviewed reserve groups.
// It never modifies the base review dataset, active rasa/data/nlu.yml, or models.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const yaml = require('js-yaml');

const root = path.resolve(__dirname, '..');
const base = path.join(root, 'docs/datasets/nlu_review');
const name = process.argv[2] || 'candidate-v2';
if (!/^[A-Za-z0-9_-]+$/.test(name)) throw new Error('Iteration name must contain only letters, digits, hyphens, or underscores.');
const out = path.join(base, 'iterations', name);
if (fs.existsSync(out)) throw new Error(`Iteration already exists: ${out}`);
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const normalize = text => text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
const manifest = JSON.parse(fs.readFileSync(path.join(base, 'manifest.json'), 'utf8'));
const targets = new Set(['ask_availability', 'ask_process', 'ask_general_info', 'ask_facility_availability']);
const selected = manifest.items.filter(row => row.partition === 'reserve' && row.original_split === 'train' && targets.has(row.intent));
assert.equal(selected.length, 120, 'Expected the reviewed 120-record training-only target reserve. Rebuild and review before changing this rule.');
assert(selected.every(row => row.provenance === 'synthetic_candidate'));
assert(selected.every(row => row.group_id));
const selectedGroups = new Set(selected.map(row => row.group_id));
const moved = manifest.items.filter(row => selectedGroups.has(row.group_id));
assert(moved.every(row => row.partition === 'reserve'), 'Selected groups must not overlap a base split.');
assert.equal(moved.length, 134, 'Expected 134 whole-group records after selecting the 120 eligible records. Rebuild and review before changing this rule.');

const nextItems = manifest.items.map(row => selectedGroups.has(row.group_id) ? {
  ...row,
  partition: 'train',
  development_exposed: true,
  iteration_note: 'candidate-v2: moved from reviewed reserve because source split was train and intent is a documented weak boundary.',
} : row);
const trainRows = nextItems.filter(row => row.partition === 'train');
const validationRows = nextItems.filter(row => row.partition === 'validation');
const testRows = nextItems.filter(row => row.partition === 'test');
assert.equal(trainRows.length, 1077);
assert.equal(validationRows.length, 158);
assert.equal(testRows.length, 150);
for (const split of [validationRows, testRows]) {
  assert(split.every(row => !selectedGroups.has(row.group_id)));
  assert(split.every(row => !row.development_exposed && row.provenance !== 'existing_nlu'));
}
const seen = new Map();
for (const row of nextItems.filter(row => ['train', 'validation', 'test'].includes(row.partition))) {
  if (seen.has(row.group_id)) assert.equal(seen.get(row.group_id), row.partition, 'A group crosses splits.');
  seen.set(row.group_id, row.partition);
}

fs.mkdirSync(out, {recursive: true});
const baseTrain = yaml.load(fs.readFileSync(path.join(base, 'train.yml'), 'utf8'));
const intents = [...new Set(trainRows.map(row => row.intent))];
const blocks = intents.map(intent => ({intent, examples: trainRows.filter(row => row.intent === intent).map(row => `- ${row.annotated}`).join('\n') + '\n'}));
const extras = baseTrain.nlu.filter(block => !block.intent);
const rendered = '# REVIEW ITERATION ONLY. Never train from this folder by accident; use tools/nlu_experiment.py with --dataset-dir.\n' + yaml.dump({version: '3.1', nlu: [...blocks, ...extras]}, {lineWidth: -1, noRefs: true});
const parsed = yaml.load(rendered);
const count = parsed.nlu.filter(block => block.intent).reduce((total, block) => total + block.examples.trim().split('\n').length, 0);
assert.equal(count, trainRows.length);
fs.writeFileSync(path.join(out, 'train.yml'), rendered);
for (const file of ['validation.yml', 'test.yml']) fs.copyFileSync(path.join(base, file), path.join(out, file));
const report = {
  status: 'PREPARED_TRAINING_ONLY_ITERATION_NOT_ACTIVE',
  parent_dataset: path.relative(root, base).replaceAll('\\', '/'),
  parent_manifest_sha256: digest(path.join(base, 'manifest.json')),
  selection: {partition: 'reserve', original_split: 'train', intents: [...targets].sort(), qualifying_records: selected.length, whole_group_records_moved: moved.length, selected_groups: selectedGroups.size},
  counts: {train: trainRows.length, validation: validationRows.length, test: testRows.length},
  protection: 'Validation and test files are exact copies of the parent dataset. The active rasa/data/nlu.yml and active models are not modified.',
};
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({metadata: report, items: nextItems}, null, 2) + '\n');
fs.writeFileSync(path.join(out, 'verification.json'), JSON.stringify({...report, assertions: 'PASS: selected reserve groups are training-only, no group crosses splits, validation/test counts and contents preserved.'}, null, 2) + '\n');
fs.writeFileSync(path.join(out, 'README.md'), `# ${name} training-only iteration\n\nThis dataset adds ${moved.length} reviewed reserve examples from ${selectedGroups.size} whole groups to training for four documented weak intent boundaries. ${selected.length} of those records originated in the synthetic training source; the remaining group-mates move with them to prevent paraphrase leakage. Validation and test data are unchanged, so results remain comparable to candidate-v1.\n\n| Split | Count |\n|---|---:|\n| Training | ${trainRows.length} |\n| Validation | ${validationRows.length} |\n| Test | ${testRows.length} |\n\nRun the isolated workflow with:\n\n\`& .\\rasa\\venv\\Scripts\\python.exe -B tools\\nlu_experiment.py prepare --run ${name} --dataset-dir docs\\datasets\\nlu_review\\iterations\\${name}\`\n\nDo not copy this file to \`rasa/data/nlu.yml\`.\n`);
console.log(JSON.stringify({output: path.relative(root, out), ...report.selection, counts: report.counts}, null, 2));
