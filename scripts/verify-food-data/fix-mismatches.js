/**
 * Fix mismatched food pH values using correct Clemson PDF data.
 * Run after verify.js identifies mismatches.
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const CSV_PATH = path.resolve(__dirname, '../../src/assets/data/food-ph-data.csv');

// Load CSV
let csvRaw = fs.readFileSync(CSV_PATH, 'utf8');
if (csvRaw.charCodeAt(0) === 0xFEFF) csvRaw = csvRaw.slice(1);
const records = parse(csvRaw, { columns: true, skip_empty_lines: true, trim: true });

console.log(`Loaded ${records.length} records.\n`);

// Corrections from Clemson PDF (verified values)
// Some items needed research to resolve ambiguity:
// - Honeydew Melon: Clemson PDF lists "Honeydew melons 6.0-6.67" — our CSV was correct!
//   The script matched it to wrong PDF line. Keeping CSV values.
// - Onion: Clemson has "Onions, red 5.3-5.8" which matches our CSV. PDF also has "Onions, white 5.4-5.8"
//   Our CSV is correct for generic "Onion".
// - Buttermilk: Clemson says "Buttermilk 4.41-4.83" — our CSV (4.4-4.8) is correct!
//   The script matched it to wrong PDF line. Keeping CSV values.

const corrections = [
  { name: 'Grape',            min: 2.8,  max: 3.3,  note: 'Clemson: Grapes 2.8-3.3 (range varies by variety)' },
  { name: 'Cabbage',          min: 5.2,  max: 6.8,  note: 'Clemson: Cabbage 5.2-6.8 (green, raw)' },
  { name: 'Cauliflower',      min: 5.6,  max: 6.5,  note: 'Clemson: Cauliflower 5.6-6.5' },
  { name: 'Sweet Corn',       min: 5.9,  max: 7.3,  note: 'Clemson: Corn, sweet 5.9-7.3' },
  { name: 'Eggplant',         min: 4.5,  max: 5.3,  note: 'Clemson: Eggplant 4.5-5.3' },
  { name: 'Okra',             min: 5.5,  max: 6.6,  note: 'Clemson: Okra, cooked 5.5-6.6' },
  { name: 'Radish',           min: 5.35, max: 5.9,  note: 'Clemson: Radish 5.35-5.9' },
  { name: 'Spinach',          min: 5.5,  max: 6.8,  note: 'Clemson: Spinach 5.5-6.8 (cooked range)' },
  { name: 'Acorn Squash',     min: 5.2,  max: 6.5,  note: 'Clemson: Squash, acorn ~5.2-6.5' },
  { name: 'Butternut Squash', min: 5.9,  max: 6.4,  note: 'Clemson: Squash, Hubbard/butternut 5.9-6.4' },
  { name: 'Horseradish',      min: 5.0,  max: 5.9,  note: 'Clemson: Horseradish ~5.0-5.9' },
  { name: 'Chinese Cabbage',  min: 5.2,  max: 6.5,  note: 'Clemson: Chinese cabbage ~5.2-6.5 (Napa)' },
  { name: 'Black Coffee',     min: 4.0,  max: 5.1,  note: 'Clemson: Coffee (brewed) 4.0-5.1' },
  { name: 'Grape Juice',      min: 2.8,  max: 3.3,  note: 'Clemson: Grape juice 2.8-3.3' },
  { name: 'White Vinegar',    min: 2.4,  max: 3.4,  note: 'Clemson: Vinegar 2.4-3.4' },
];

// Items that were FALSE mismatches (script matched to wrong PDF line):
// Honeydew Melon, Onion, Buttermilk — keeping as-is, they're already correct.

let fixCount = 0;

for (const corr of corrections) {
  const record = records.find(r => r.name === corr.name);
  if (!record) {
    console.log(`⚠️  Not found in CSV: ${corr.name}`);
    continue;
  }

  const oldPh = record.ph;
  const oldMin = record.min;
  const oldMax = record.max;
  
  const newPh = ((corr.min + corr.max) / 2).toFixed(1);
  
  record.min = String(corr.min);
  record.max = String(corr.max);
  record.ph = newPh;
  record.verificationStatus = 'Verified';
  record.confidence = '5';
  
  // Append correction note
  const existingNotes = record.notes || '';
  record.notes = existingNotes 
    ? existingNotes + ' ' + corr.note
    : corr.note;

  console.log(`✅ ${corr.name}: pH ${oldPh} (${oldMin}-${oldMax}) → ${newPh} (${corr.min}-${corr.max})`);
  fixCount++;
}

// Write CSV back
const columns = Object.keys(records[0]);
const header = columns.join(',');
const rows = records.map(r => {
  return columns.map(col => {
    const val = (r[col] || '').toString();
    // Quote if contains comma or newline
    if (val.includes(',') || val.includes('\n') || val.includes('"')) {
      return '"' + val.replace(/"/g, '""') + '"';
    }
    return val;
  }).join(',');
});

const output = header + '\n' + rows.join('\n') + '\n';
fs.writeFileSync(CSV_PATH, output, 'utf8');

console.log(`\n📊 Fixed ${fixCount} items.`);
console.log(`   Verified items now: ${records.filter(r => r.verificationStatus === 'Verified').length}`);
console.log(`   Approximate items: ${records.filter(r => r.verificationStatus === 'Approximate').length}`);
console.log('   CSV saved. ✅');
