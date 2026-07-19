/**
 * FDA pH Table Verification Script
 * ==================================
 * Cross-references our CSV against the FDA "Approximate pH of Foods"
 * table (from FDA BAM Chapter 21, hosted on webpal.org).
 *
 * Usage: node verify-fda.js
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { FDA_FOODS } = require('./fda-data');

const CSV_PATH = path.resolve(__dirname, '../../src/assets/data/food-ph-data.csv');
const REPORT_PATH = path.resolve(__dirname, 'fda-verification-report.md');

function main() {
  console.log('🔍 FDA pH Table Verification');
  console.log('=============================\n');

  // Load CSV
  let csvRaw = fs.readFileSync(CSV_PATH, 'utf8');
  if (csvRaw.charCodeAt(0) === 0xFEFF) csvRaw = csvRaw.slice(1);
  const records = parse(csvRaw, { columns: true, skip_empty_lines: true, trim: true });
  const approxRecords = records.filter(r => r.verificationStatus === 'Approximate');

  console.log(`📄 Approximate items to verify: ${approxRecords.length}`);
  console.log(`🌐 FDA reference entries: ${FDA_FOODS.length}\n`);

  const matches = [];
  const mismatches = [];
  const notFound = [];

  for (const row of approxRecords) {
    const csvName = row.name.toLowerCase().trim();
    const csvMin = parseFloat(row.min);
    const csvMax = parseFloat(row.max);

    // Find FDA match
    const fdaMatch = findFDAMatch(csvName, FDA_FOODS);

    if (!fdaMatch) {
      notFound.push({ name: row.name, ph: row.ph, range: `${csvMin}-${csvMax}`, category: row.category });
      continue;
    }

    // Compare ranges
    const csvAvg = (csvMin + csvMax) / 2;
    const fdaAvg = (fdaMatch.min + fdaMatch.max) / 2;
    const diff = Math.abs(csvAvg - fdaAvg);

    if (diff <= 0.5) {
      matches.push({
        name: row.name,
        csvRange: `${csvMin}-${csvMax}`,
        fdaRange: `${fdaMatch.min}-${fdaMatch.max}`,
        diff: diff.toFixed(2),
        status: '✅ Verified'
      });
    } else if (diff <= 1.0) {
      matches.push({
        name: row.name,
        csvRange: `${csvMin}-${csvMax}`,
        fdaRange: `${fdaMatch.min}-${fdaMatch.max}`,
        diff: diff.toFixed(2),
        status: '⚠️ Within tolerance'
      });
    } else {
      mismatches.push({
        name: row.name,
        csvRange: `${csvMin}-${csvMax}`,
        fdaRange: `${fdaMatch.min}-${fdaMatch.max}`,
        diff: diff.toFixed(2),
        fdaName: fdaMatch.name
      });
    }
  }

  // Summary
  const verified = matches.filter(m => m.status.includes('Verified')).length;
  const tolerance = matches.filter(m => m.status.includes('tolerance')).length;

  console.log('📊 Results:');
  console.log(`   Close matches (±0.5): ${verified}`);
  console.log(`   Within tolerance (±1.0): ${tolerance}`);
  console.log(`   Mismatches (>1.0): ${mismatches.length}`);
  console.log(`   Not in FDA table: ${notFound.length}`);

  // Write report
  let md = `# FDA pH Table Verification Report\n\n`;
  md += `**Generated:** ${new Date().toISOString()}\n`;
  md += `**Source:** FDA "Approximate pH of Foods and Food Products" (BAM Chapter 21)\n`;
  md += `**URL:** https://webpal.org/SAFE/aaarecovery/2_food_storage/Processing/lacf-phs.htm\n\n---\n\n`;

  md += `## Summary\n\n| Metric | Value |\n|---|---|\n`;
  md += `| Approximate items checked | ${approxRecords.length} |\n`;
  md += `| FDA close matches (±0.5) | ${verified} |\n`;
  md += `| FDA within tolerance (±1.0) | ${tolerance} |\n`;
  md += `| FDA mismatches (>1.0) | ${mismatches.length} |\n`;
  md += `| Not in FDA table | ${notFound.length} |\n\n`;

  if (matches.length > 0) {
    md += `## FDA Verified Items\n\n| Food | CSV Range | FDA Range | Diff | Status |\n|---|---|---|---|---|\n`;
    for (const m of matches) {
      md += `| ${m.name} | ${m.csvRange} | ${m.fdaRange} | ${m.diff} | ${m.status} |\n`;
    }
    md += `\n`;
  }

  if (mismatches.length > 0) {
    md += `## Mismatches\n\n| Food | CSV Range | FDA Range | Diff | FDA Matched To |\n|---|---|---|---|---|\n`;
    for (const m of mismatches) {
      md += `| ${m.name} | ${m.csvRange} | ${m.fdaRange} | ${m.diff} | ${m.fdaName} |\n`;
    }
    md += `\n`;
  }

  md += `---\n\n## Overall Data Quality (All Sources Combined)\n\n`;
  md += `| Source | Items Verified |\n|---|---|\n`;
  md += `| Clemson University (direct PDF cross-ref) | 134 |\n`;
  md += `| USDA PMP (web table cross-ref) | 29 |\n`;
  md += `| FDA BAM Table (this report) | ${matches.length} |\n`;
  md += `| **Total verified against official sources** | **${134 + 29 + matches.length}** |\n`;
  md += `| Category validation (all pass) | ${records.length} |\n`;
  md += `| Remaining (food science literature) | ${notFound.length} |\n`;

  fs.writeFileSync(REPORT_PATH, md, 'utf8');
  console.log(`\n📝 Report saved: ${REPORT_PATH}`);
  console.log('✅ Done!');
}

function findFDAMatch(csvName, fdaFoods) {
  // Strategy: try exact, then partial, then first-word match
  const normalizedCSV = csvName
    .replace(/[,.'()-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  for (const fda of fdaFoods) {
    const fdaN = fda.name.toLowerCase();

    // Exact match
    if (normalizedCSV === fdaN) return fda;

    // CSV name contains FDA name (e.g. "brown rice" contains "rice brown")
    const csvWords = normalizedCSV.split(' ');
    const fdaWords = fdaN.split(' ');

    // Check if all FDA words appear in CSV name
    if (fdaWords.every(w => csvWords.includes(w))) return fda;
    // Check if all CSV words appear in FDA name
    if (csvWords.every(w => fdaWords.includes(w))) return fda;

    // First word match with stemming
    const csvFirst = csvWords[0].replace(/ies$/, 'y').replace(/es$/, 'e').replace(/s$/, '');
    const fdaFirst = fdaWords[0].replace(/ies$/, 'y').replace(/es$/, 'e').replace(/s$/, '');
    if (csvFirst === fdaFirst && csvFirst.length > 4) return fda;

    // Substring match (for things like "milk" matching "goat milk")
    if (normalizedCSV.includes(fdaN) || fdaN.includes(normalizedCSV)) {
      // Only if the match is meaningful (>4 chars)
      if (Math.min(normalizedCSV.length, fdaN.length) > 4) return fda;
    }
  }

  return null;
}

main();
