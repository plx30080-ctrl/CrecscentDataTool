import XLSX from 'xlsx';
import fs from 'fs';

const files = [
  '1st Shift On Premise 12.23.25.xls',
  'Crescent Early Leave Tracker.xlsx',
  'Weekly Labor Report 12.28.25.xls'
];

files.forEach(fileName => {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`FILE: ${fileName}`);
  console.log('='.repeat(80));

  const filePath = `./Sample Uploads/${fileName}`;
  const workbook = XLSX.readFile(filePath);

  workbook.SheetNames.forEach(sheetName => {
    console.log(`\n--- Sheet: ${sheetName} ---`);
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    // Show first 10 rows
    console.log('First 10 rows:');
    data.slice(0, 10).forEach((row, idx) => {
      console.log(`Row ${idx}:`, row);
    });

    // Show column headers
    if (data.length > 0) {
      console.log('\nColumn headers:', data[0]);
    }
  });
});
