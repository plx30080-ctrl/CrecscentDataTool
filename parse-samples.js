import XLSX from 'xlsx';
import logger from './src/utils/logger.js';

const files = [
  '1st Shift On Premise 12.23.25.xls',
  'Crescent Early Leave Tracker.xlsx',
  'Weekly Labor Report 12.28.25.xls'
];

files.forEach(fileName => {
  logger.info(`\n${'='.repeat(80)}`);
  logger.info(`FILE: ${fileName}`);
  logger.info('='.repeat(80));

  const filePath = `./Sample Uploads/${fileName}`;
  const workbook = XLSX.readFile(filePath);

  workbook.SheetNames.forEach(sheetName => {
    logger.info(`\n--- Sheet: ${sheetName} ---`);
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    // Show first 10 rows
    logger.debug('First 10 rows:');
    data.slice(0, 10).forEach((row, idx) => {
      logger.debug(`Row ${idx}:`, row);
    });

    // Show column headers
    if (data.length > 0) {
      logger.debug('\nColumn headers:', data[0]);
    }
  });
});
