#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const inputDir = path.join(__dirname, '../src/data/onet');
const outputDir = path.join(__dirname, '../src/data/onet/json');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

if (!fs.existsSync(inputDir)) {
  console.error(`[ONET] Input directory not found: ${inputDir}`);
  process.exit(1);
}

const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.xlsx'));

files.forEach(file => {
  const filePath = path.join(inputDir, file);
  const workbook = xlsx.readFile(filePath);
  workbook.SheetNames.forEach(sheetName => {
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null });
    const safeSheet = sheetName.replace(/\s+/g, '_');
    const outFile = path.join(outputDir, `${path.basename(file, '.xlsx')}_${safeSheet}.json`);
    fs.writeFileSync(outFile, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Exported ${outFile}`);
  });
});

console.log('[ONET] All .xlsx files converted to JSON in src/data/onet/json');