/**
 * Food pH Data Verification Script
 * =================================
 * Downloads the Clemson University pH table PDF, extracts food + pH data,
 * cross-references against our CSV, and generates a verification report.
 *
 * Also performs sanity checks on all 509 items:
 *  - pH out of valid range (0-14)
 *  - Fruits/vegetables with pH > 8 (suspicious)
 *  - Meats with pH < 3 (suspicious)
 *  - Missing required fields
 *  - Duplicate detection
 *
 * Usage: npm run verify
 * Output: verification-report.md (in this folder)
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const pdfParse = require('pdf-parse');
const { parse } = require('csv-parse/sync');

// ─── Config ─────────────────────────────────────────────────────
const CSV_PATH = path.resolve(__dirname, '../../src/assets/data/food-ph-data.csv');
const CLEMSON_PDF_URL = 'https://www.clemson.edu/extension/food/_files/ph-of-common-foods-table.pdf';
const REPORT_PATH = path.resolve(__dirname, 'verification-report.md');

// ─── Main ───────────────────────────────────────────────────────
async function main() {
  console.log('🔍 Food pH Data Verification Script');
  console.log('====================================\n');

  // 1. Load CSV
  console.log('📄 Loading CSV...');
  let csvRaw = fs.readFileSync(CSV_PATH, 'utf8');
  // Strip BOM if present
  if (csvRaw.charCodeAt(0) === 0xFEFF) {
    csvRaw = csvRaw.slice(1);
  }
  const records = parse(csvRaw, { columns: true, skip_empty_lines: true, trim: true });
  console.log(`   Loaded ${records.length} food items.\n`);

  // Debug: verify first record parsed correctly
  if (records[0]) {
    console.log(`   First item: id="${records[0].id}", name="${records[0].name}", ph=${records[0].ph}`);
    console.log('');
  }

  // 2. Download and parse Clemson PDF
  console.log('📥 Downloading Clemson University pH table PDF...');
  let clemsonFoods = [];
  try {
    const response = await axios.get(CLEMSON_PDF_URL, { responseType: 'arraybuffer', timeout: 30000 });
    const pdfData = await pdfParse(Buffer.from(response.data));
    clemsonFoods = extractClemsonData(pdfData.text);
    console.log(`   Extracted ${clemsonFoods.length} food entries from PDF.\n`);
  } catch (err) {
    console.log(`   ⚠️  Failed to download/parse PDF: ${err.message}`);
    console.log('   Continuing with sanity checks only...\n');
  }

  // 3. Run all checks
  const report = {
    timestamp: new Date().toISOString(),
    totalItems: records.length,
    clemsonExtracted: clemsonFoods.length,
    issues: [],
    clemsonMatches: [],
    clemsonMismatches: [],
    clemsonNotFound: [],
    summary: {}
  };

  // Sanity checks
  console.log('🧪 Running sanity checks...');
  runSanityChecks(records, report);

  // Cross-reference with Clemson
  if (clemsonFoods.length > 0) {
    console.log('🔗 Cross-referencing with Clemson data...');
    crossReferenceClemson(records, clemsonFoods, report);
  }

  // Generate summary
  report.summary = {
    totalItems: records.length,
    sanityIssues: report.issues.length,
    clemsonMatched: report.clemsonMatches.length,
    clemsonMismatched: report.clemsonMismatches.length,
    clemsonNotInPdf: report.clemsonNotFound.length,
    verifiedItems: records.filter(r => r.verificationStatus === 'Verified').length,
    approximateItems: records.filter(r => r.verificationStatus === 'Approximate').length,
  };

  // 4. Write report
  console.log('\n📝 Writing verification report...');
  writeReport(report);
  console.log(`   Report saved to: ${REPORT_PATH}`);
  console.log('\n✅ Done!');
  console.log(`\n📊 Summary:`);
  console.log(`   Total items: ${report.summary.totalItems}`);
  console.log(`   Sanity issues found: ${report.summary.sanityIssues}`);
  console.log(`   Clemson matches: ${report.summary.clemsonMatched}`);
  console.log(`   Clemson mismatches: ${report.summary.clemsonMismatched}`);
  console.log(`   Not found in Clemson PDF: ${report.summary.clemsonNotInPdf}`);
}

// ─── Extract data from Clemson PDF text ─────────────────────────
function extractClemsonData(text) {
  const foods = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  for (const line of lines) {
    // Look for patterns like "Food Name    pH range" or "Food Name    3.3 - 4.0"
    // Clemson format: "Food item   low pH   high pH" (tab/space separated)
    const match = line.match(/^([A-Za-z][A-Za-z\s,.'()-]+?)\s+([\d.]+)\s*[-–to]*\s*([\d.]+)?/);
    if (match) {
      const name = match[1].trim();
      const ph1 = parseFloat(match[2]);
      const ph2 = match[3] ? parseFloat(match[3]) : ph1;

      // Skip if it doesn't look like food data
      if (isNaN(ph1) || ph1 < 0 || ph1 > 14) continue;
      if (name.length < 3 || name.length > 60) continue;
      // Skip headers/labels
      if (/^(food|item|product|ph|range|min|max)/i.test(name)) continue;

      foods.push({
        name: name.toLowerCase(),
        min: Math.min(ph1, ph2),
        max: Math.max(ph1, ph2),
        avg: (Math.min(ph1, ph2) + Math.max(ph1, ph2)) / 2
      });
    }
  }

  return foods;
}

// ─── Sanity checks ──────────────────────────────────────────────
function runSanityChecks(records, report) {
  const seenIds = new Set();

  for (const row of records) {
    const ph = parseFloat(row.ph);
    const min = parseFloat(row.min);
    const max = parseFloat(row.max);
    const name = row.name || '(unnamed)';

    // Missing required fields
    if (!row.name || !row.id || row.id === 'undefined') {
      report.issues.push({ type: 'MISSING_FIELD', food: name, detail: `Missing name or id (id="${row.id}")` });
    }

    // Duplicate ID (only flag if id is actually valid)
    if (row.id && row.id !== 'undefined') {
      if (seenIds.has(row.id)) {
        report.issues.push({ type: 'DUPLICATE_ID', food: name, detail: `Duplicate id: ${row.id}` });
      }
      seenIds.add(row.id);
    }

    // pH out of range
    if (isNaN(ph) || ph < 0 || ph > 14) {
      report.issues.push({ type: 'PH_INVALID', food: name, detail: `pH=${row.ph} is out of valid range 0-14` });
    }

    // min > max
    if (!isNaN(min) && !isNaN(max) && min > max) {
      report.issues.push({ type: 'RANGE_INVALID', food: name, detail: `min(${min}) > max(${max})` });
    }

    // pH outside stated range
    if (!isNaN(ph) && !isNaN(min) && !isNaN(max)) {
      if (ph < min - 0.5 || ph > max + 0.5) {
        report.issues.push({ type: 'PH_OUT_OF_RANGE', food: name, detail: `pH ${ph} outside range ${min}-${max}` });
      }
    }

    // Suspicious: Fruits/vegetables with pH > 8
    const cat = (row.category || '').toLowerCase();
    if ((cat === 'fruit' || cat === 'vegetable') && ph > 8) {
      report.issues.push({ type: 'SUSPICIOUS_PH', food: name, detail: `${row.category} with pH ${ph} (unusually alkaline)` });
    }

    // Suspicious: Meats with pH < 3
    if ((cat === 'meat' || cat === 'seafood') && ph < 3) {
      report.issues.push({ type: 'SUSPICIOUS_PH', food: name, detail: `${row.category} with pH ${ph} (unusually acidic)` });
    }

    // Suspicious: Dairy with pH > 8
    if (cat === 'dairy' && ph > 8) {
      report.issues.push({ type: 'SUSPICIOUS_PH', food: name, detail: `${row.category} with pH ${ph} (unusually alkaline)` });
    }

    // Missing confidence
    const conf = parseInt(row.confidence);
    if (isNaN(conf) || conf < 1 || conf > 5) {
      report.issues.push({ type: 'INVALID_CONFIDENCE', food: name, detail: `confidence=${row.confidence}` });
    }

    // Missing source URL for "Verified" items
    if (row.verificationStatus === 'Verified' && !row.sourceUrl) {
      report.issues.push({ type: 'VERIFIED_NO_SOURCE', food: name, detail: 'Marked Verified but no sourceUrl' });
    }
  }

  console.log(`   Found ${report.issues.length} sanity issues.`);
}

// ─── Cross-reference with Clemson ───────────────────────────────
function crossReferenceClemson(records, clemsonFoods, report) {
  // Only check items that claim Clemson as source
  const clemsonRecords = records.filter(r =>
    (r.organization || '').toLowerCase().includes('clemson') ||
    (r.sourceUrl || '').toLowerCase().includes('clemson')
  );

  console.log(`   ${clemsonRecords.length} items claim Clemson as source.`);

  for (const row of clemsonRecords) {
    const csvName = row.name.toLowerCase().trim();
    const csvPh = parseFloat(row.ph);
    const csvMin = parseFloat(row.min);
    const csvMax = parseFloat(row.max);

    // Try to find a match in PDF data
    const pdfMatch = clemsonFoods.find(cf => {
      // Exact match
      if (cf.name === csvName) return true;
      // Partial match
      if (cf.name.includes(csvName) || csvName.includes(cf.name)) return true;
      // First word match (e.g. "apple" matches "apples, fresh")
      const csvFirst = csvName.split(' ')[0];
      if (cf.name.startsWith(csvFirst) && csvFirst.length > 3) return true;
      return false;
    });

    if (!pdfMatch) {
      report.clemsonNotFound.push({ food: row.name, csvPh, csvMin, csvMax });
      continue;
    }

    // Check if values are reasonably close (within 0.5 tolerance)
    const minClose = Math.abs(csvMin - pdfMatch.min) <= 0.5;
    const maxClose = Math.abs(csvMax - pdfMatch.max) <= 0.5;

    if (minClose && maxClose) {
      report.clemsonMatches.push({
        food: row.name,
        csvRange: `${csvMin}-${csvMax}`,
        pdfRange: `${pdfMatch.min}-${pdfMatch.max}`,
        status: '✅ Match'
      });
    } else {
      report.clemsonMismatches.push({
        food: row.name,
        csvRange: `${csvMin}-${csvMax}`,
        pdfRange: `${pdfMatch.min}-${pdfMatch.max}`,
        difference: `min diff: ${Math.abs(csvMin - pdfMatch.min).toFixed(2)}, max diff: ${Math.abs(csvMax - pdfMatch.max).toFixed(2)}`
      });
    }
  }
}

// ─── Write report ───────────────────────────────────────────────
function writeReport(report) {
  let md = `# Food pH Data Verification Report\n\n`;
  md += `**Generated:** ${report.timestamp}\n\n`;
  md += `---\n\n`;

  // Summary
  md += `## Summary\n\n`;
  md += `| Metric | Value |\n|---|---|\n`;
  md += `| Total food items | ${report.summary.totalItems} |\n`;
  md += `| Verified items | ${report.summary.verifiedItems} |\n`;
  md += `| Approximate items | ${report.summary.approximateItems} |\n`;
  md += `| Sanity issues found | ${report.summary.sanityIssues} |\n`;
  md += `| Clemson PDF entries extracted | ${report.clemsonExtracted} |\n`;
  md += `| Clemson cross-ref matches | ${report.summary.clemsonMatched} |\n`;
  md += `| Clemson cross-ref mismatches | ${report.summary.clemsonMismatched} |\n`;
  md += `| Not found in Clemson PDF | ${report.summary.clemsonNotInPdf} |\n\n`;

  // Sanity issues
  if (report.issues.length > 0) {
    md += `## Sanity Issues\n\n`;
    md += `| Type | Food | Detail |\n|---|---|---|\n`;
    for (const issue of report.issues) {
      md += `| ${issue.type} | ${issue.food} | ${issue.detail} |\n`;
    }
    md += `\n`;
  } else {
    md += `## Sanity Issues\n\n✅ No sanity issues found!\n\n`;
  }

  // Clemson matches
  if (report.clemsonMatches.length > 0) {
    md += `## Clemson Verified Matches (pH ranges match within ±0.5)\n\n`;
    md += `| Food | CSV Range | PDF Range | Status |\n|---|---|---|---|\n`;
    for (const m of report.clemsonMatches) {
      md += `| ${m.food} | ${m.csvRange} | ${m.pdfRange} | ${m.status} |\n`;
    }
    md += `\n`;
  }

  // Clemson mismatches
  if (report.clemsonMismatches.length > 0) {
    md += `## Clemson Mismatches (pH ranges differ by > 0.5)\n\n`;
    md += `| Food | CSV Range | PDF Range | Difference |\n|---|---|---|---|\n`;
    for (const m of report.clemsonMismatches) {
      md += `| ${m.food} | ${m.csvRange} | ${m.pdfRange} | ${m.difference} |\n`;
    }
    md += `\n`;
  }

  // Not found in PDF
  if (report.clemsonNotFound.length > 0) {
    md += `## Items Claiming Clemson Source But Not Found in PDF\n\n`;
    md += `| Food | CSV pH | CSV Range |\n|---|---|---|\n`;
    for (const m of report.clemsonNotFound) {
      md += `| ${m.food} | ${m.csvPh} | ${m.csvMin}-${m.csvMax} |\n`;
    }
    md += `\n`;
  }

  // Data sources
  md += `---\n\n`;
  md += `## Sources Used for Verification\n\n`;
  md += `- **Clemson University** — [pH Values of Common Foods and Ingredients](https://www.clemson.edu/extension/food/_files/ph-of-common-foods-table.pdf)\n`;
  md += `- **USDA Pathogen Modeling Program** — [pH of Selected Foods](https://pmp.errc.ars.usda.gov/phOfSelectedFoods.aspx)\n`;
  md += `\n`;
  md += `## Notes\n\n`;
  md += `- Clemson cross-reference uses fuzzy name matching (partial/first-word)\n`;
  md += `- Tolerance for match: ±0.5 pH units (food pH varies by preparation/ripeness)\n`;
  md += `- Items marked "Not Found" may exist in PDF under different naming\n`;
  md += `- USDA database is interactive (web app) — cannot be programmatically verified here\n`;

  fs.writeFileSync(REPORT_PATH, md, 'utf8');
}

// ─── Run ────────────────────────────────────────────────────────
main().catch(err => {
  console.error('❌ Script failed:', err.message);
  process.exit(1);
});
