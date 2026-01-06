import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseLaborReportFile } from './src/utils/laborParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testFile = async () => {
  // Test with a sample file
  const filePath = path.resolve(__dirname, 'Sample Uploads/Bulk Upload Files/Weekly Labor Reports/Weekly Labor Report 1.12.25.xls');
  
  const buf = await fs.readFile(filePath);
  const result = parseLaborReportFile(buf, path.basename(filePath));
  
  console.log('=== Parser Output ===');
  console.log('Week Ending:', result.weekEnding);
  console.log('File Name:', result.fileName);
  console.log('Total Hours:', result.totalHours);
  console.log('Direct Hours:', result.directHours);
  console.log('Indirect Hours:', result.indirectHours);
  console.log('Employee Count:', result.employeeCount);
  console.log('\n=== Daily Breakdown Sample ===');
  
  Object.entries(result.dailyBreakdown).forEach(([day, data]) => {
    console.log(`\n${day}:`);
    console.log('  shift1:', data.shift1);
    console.log('  shift2:', data.shift2);
    console.log('  total:', data.total);
  });
  
  console.log('\n=== First 5 Employees ===');
  if (Array.isArray(result.employeeDetails)) {
    result.employeeDetails.slice(0, 5).forEach((emp, i) => {
      console.log(`\nEmployee ${i + 1}:`);
      console.log('  EID:', emp.eid);
      console.log('  Name:', emp.name);
      console.log('  Dept Code:', emp.deptCode);
      console.log('  Labor Type:', emp.laborType);
      console.log('  Shift:', emp.shift);
      console.log('  Weekly Total:', emp.weeklyTotal);
    });
  }
};

testFile().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
