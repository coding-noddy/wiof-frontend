/**
 * Import missing Clemson PDF items into food-ph-data.csv
 * ======================================================
 * 1. Downloads and parses Clemson PDF
 * 2. Finds items NOT already in our CSV
 * 3. Adds them as new "Verified" entries
 * 4. Generates a report of what was added
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const pdfParse = require('pdf-parse');
const { parse } = require('csv-parse/sync');

const CSV_PATH = path.resolve(__dirname, '../../src/assets/data/food-ph-data.csv');
const CLEMSON_PDF_URL = 'https://www.clemson.edu/extension/food/_files/ph-of-common-foods-table.pdf';

async function main() {
  console.log('📥 Import Missing Clemson Foods');
  console.log('================================\n');

  // 1. Load current CSV
  let csvRaw = fs.readFileSync(CSV_PATH, 'utf8');
  if (csvRaw.charCodeAt(0) === 0xFEFF) csvRaw = csvRaw.slice(1);
  const records = parse(csvRaw, { columns: true, skip_empty_lines: true, trim: true });
  console.log(`📄 Current CSV: ${records.length} items\n`);

  // Build lookup of existing food names (lowercase)
  const existingNames = new Set(records.map(r => r.name.toLowerCase().trim()));

  // 2. Download and parse Clemson PDF
  console.log('📥 Downloading Clemson PDF...');
  const response = await axios.get(CLEMSON_PDF_URL, { responseType: 'arraybuffer', timeout: 30000 });
  const pdfData = await pdfParse(Buffer.from(response.data));
  console.log(`   PDF parsed (${pdfData.text.length} characters)\n`);

  // 3. Extract all food entries from PDF
  const pdfFoods = extractAllFoods(pdfData.text);
  console.log(`🔍 Extracted ${pdfFoods.length} food entries from PDF\n`);

  // 4. Find which ones are missing from our CSV
  const missing = [];
  for (const food of pdfFoods) {
    const nameLC = food.name.toLowerCase();
    // Check if any existing name contains this or vice versa
    let found = false;
    for (const existing of existingNames) {
      if (existing === nameLC ||
          existing.includes(nameLC) ||
          nameLC.includes(existing)) {
        found = true;
        break;
      }
    }
    if (!found) {
      missing.push(food);
    }
  }

  console.log(`✨ Found ${missing.length} NEW items not in our CSV\n`);

  if (missing.length === 0) {
    console.log('Nothing to add — all Clemson items already exist!');
    return;
  }

  // 5. Create new CSV records for missing items
  const newRecords = missing.map(food => {
    const ph = ((food.min + food.max) / 2).toFixed(1);
    const id = food.name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .trim();

    return {
      id: id,
      name: food.name,
      scientificName: '',
      foodState: 'Fresh',
      ph: ph,
      min: String(food.min),
      max: String(food.max),
      category: guessCategory(food.name),
      confidence: '5',
      verificationStatus: 'Verified',
      isApproximate: 'False',
      organization: 'Clemson University',
      publication: 'pH Values of Common Foods and Ingredients',
      sourceUrl: 'https://www.clemson.edu/extension/food/_files/ph-of-common-foods-table.pdf',
      lastVerified: '2026-07-18',
      notes: 'Imported from Clemson University pH table PDF.'
    };
  });

  // 6. Append to records and write
  const allRecords = [...records, ...newRecords];
  const columns = Object.keys(allRecords[0]);
  const header = columns.join(',');
  const rows = allRecords.map(r => {
    return columns.map(col => {
      const val = (r[col] || '').toString();
      if (val.includes(',') || val.includes('\n') || val.includes('"')) {
        return '"' + val.replace(/"/g, '""') + '"';
      }
      return val;
    }).join(',');
  });

  const output = header + '\n' + rows.join('\n') + '\n';
  fs.writeFileSync(CSV_PATH, output, 'utf8');

  // 7. Print report
  console.log('── New Items Added ──────────────────────────────────');
  console.log('');
  for (const item of newRecords) {
    console.log(`  ✅ ${item.name} — pH ${item.ph} (${item.min}-${item.max}) [${item.category}]`);
  }
  console.log('');
  console.log(`📊 Total items now: ${allRecords.length}`);
  console.log(`   New verified items added: ${newRecords.length}`);
  console.log('   CSV saved. ✅');

  // Save report
  const reportPath = path.resolve(__dirname, 'import-report.md');
  let reportMd = `# Clemson Import Report\n\n**Date:** ${new Date().toISOString()}\n\n`;
  reportMd += `## Summary\n- Items before: ${records.length}\n- New items added: ${newRecords.length}\n- Items after: ${allRecords.length}\n\n`;
  reportMd += `## New Items\n\n| Name | pH | Range | Category |\n|---|---|---|---|\n`;
  for (const item of newRecords) {
    reportMd += `| ${item.name} | ${item.ph} | ${item.min}-${item.max} | ${item.category} |\n`;
  }
  fs.writeFileSync(reportPath, reportMd, 'utf8');
  console.log(`   Report saved to: ${reportPath}`);
}

// ─── Extract foods from PDF text ────────────────────────────────
function extractAllFoods(text) {
  const foods = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  for (const line of lines) {
    // Clemson format examples:
    //   "Apple, eating 3.30-4.00"
    //   "Avocados 6.27-6.58"
    //   "Cauliflower 5.6"
    //   "Apple – Delicious 3.9"
    const match = line.match(/^([A-Za-z][A-Za-z\s,.'()\u2013\u2014\/-]+?)\s+([\d.]+)(?:\s*[-–to]\s*([\d.]+))?$/);
    if (match) {
      let name = match[1].trim()
        .replace(/\s+/g, ' ')
        .replace(/,\s*$/, '')
        .replace(/\s*[-–]\s*$/, '');

      const ph1 = parseFloat(match[2]);
      const ph2 = match[3] ? parseFloat(match[3]) : ph1;

      // Validate
      if (isNaN(ph1) || ph1 < 0 || ph1 > 14) continue;
      if (name.length < 3 || name.length > 60) continue;
      // Skip headers/labels
      if (/^(food|item|product|ph|range|min|max|table|page|source|approx|note|variation)/i.test(name)) continue;
      if (/^\d/.test(name)) continue;

      foods.push({
        name: titleCase(name),
        min: Math.min(ph1, ph2),
        max: Math.max(ph1, ph2)
      });
    }
  }

  // Deduplicate by name (keep first occurrence)
  const seen = new Set();
  return foods.filter(f => {
    const key = f.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Guess category from food name ──────────────────────────────
function guessCategory(name) {
  const n = name.toLowerCase();
  
  const fruitKeywords = ['apple', 'banana', 'berry', 'cherry', 'citrus', 'fig', 'grape', 'guava',
    'kiwi', 'lemon', 'lime', 'mango', 'melon', 'nectarine', 'orange', 'papaya', 'peach', 'pear',
    'pineapple', 'plum', 'pomegranate', 'prune', 'raisin', 'tangerine', 'watermelon', 'fruit',
    'juice', 'jam', 'jelly', 'marmalade', 'preserves', 'cider'];
  
  const vegKeywords = ['artichoke', 'asparagus', 'bean', 'beet', 'broccoli', 'cabbage', 'carrot',
    'cauliflower', 'celery', 'corn', 'cucumber', 'eggplant', 'garlic', 'kale', 'lettuce',
    'mushroom', 'okra', 'onion', 'pea', 'pepper', 'potato', 'pumpkin', 'radish', 'spinach',
    'squash', 'tomato', 'turnip', 'zucchini', 'vegetable', 'greens'];
  
  const dairyKeywords = ['milk', 'cream', 'butter', 'cheese', 'yogurt', 'whey', 'curd'];
  
  const meatKeywords = ['beef', 'chicken', 'pork', 'lamb', 'veal', 'turkey', 'ham', 'meat',
    'liver', 'sausage', 'bacon', 'steak'];
  
  const seafoodKeywords = ['fish', 'salmon', 'tuna', 'shrimp', 'crab', 'lobster', 'oyster',
    'clam', 'mussel', 'sardine', 'cod', 'herring', 'mackerel'];
  
  const condKeywords = ['vinegar', 'sauce', 'mustard', 'ketchup', 'dressing', 'relish',
    'mayonnaise', 'pickle', 'salsa'];
  
  const beverageKeywords = ['coffee', 'tea', 'wine', 'beer', 'soda', 'water', 'drink', 'cocoa'];

  if (fruitKeywords.some(k => n.includes(k))) return 'Fruit';
  if (vegKeywords.some(k => n.includes(k))) return 'Vegetable';
  if (dairyKeywords.some(k => n.includes(k))) return 'Dairy';
  if (meatKeywords.some(k => n.includes(k))) return 'Meat';
  if (seafoodKeywords.some(k => n.includes(k))) return 'Seafood';
  if (condKeywords.some(k => n.includes(k))) return 'Condiment';
  if (beverageKeywords.some(k => n.includes(k))) return 'Beverage';
  
  return 'Other';
}

// ─── Title case helper ──────────────────────────────────────────
function titleCase(str) {
  return str.replace(/\w\S*/g, txt =>
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

main().catch(err => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
