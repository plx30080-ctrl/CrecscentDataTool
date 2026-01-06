import { promises as fs } from 'fs';
import path from 'path';
import { parseLaborReportFile } from '../src/utils/laborParser.js';
import { db, auth } from '../src/firebase.js';
import { writeBatch, collection, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_FOLDER = path.resolve(__dirname, '../Sample Uploads/Bulk Upload Files/Weekly Labor Reports');

const log = (...args) => console.log('[labor-import]', ...args);

const initClientAuth = async (emailArg, passwordArg) => {
  const email = emailArg || process.env.FIREBASE_AUTH_EMAIL;
  const password = passwordArg || process.env.FIREBASE_AUTH_PASSWORD;
  if (!email || !password) {
    throw new Error('Missing Firebase auth credentials. Provide --email and --password, or set FIREBASE_AUTH_EMAIL/FIREBASE_AUTH_PASSWORD.');
  }
  await signInWithEmailAndPassword(auth, email, password);
  log('Authenticated as:', email);
};

const listReportFiles = async (folder) => {
  const entries = await fs.readdir(folder, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && (e.name.endsWith('.xlsx') || e.name.endsWith('.xls')))
    .map((e) => path.join(folder, e.name));
};

const toTimestamp = (date) => {
  if (!date) return null;
  if (date.toDate) return date;
  return Timestamp.fromDate(date instanceof Date ? date : new Date(date));
};

const buildDoc = (parsed, submittedBy) => {
  const doc = { ...parsed };
  doc.weekEnding = toTimestamp(parsed.weekEnding);
  doc.submittedAt = serverTimestamp();
  doc.submittedBy = submittedBy || 'backfill-script';
  doc.submittedByUid = 'backfill-script';

  // Ensure numeric aggregates exist
  let direct = parsed.directHours || 0;
  let indirect = parsed.indirectHours || 0;
  let total = parsed.totalHours || 0;

  if (parsed.dailyBreakdown) {
    direct = 0;
    indirect = 0;
    total = 0;
    Object.values(parsed.dailyBreakdown).forEach((day) => {
      const shift1Direct = day.shift1?.direct || 0;
      const shift1Indirect = day.shift1?.indirect || 0;
      const shift2Direct = day.shift2?.direct || 0;
      const shift2Indirect = day.shift2?.indirect || 0;
      const shift1Total = shift1Direct + shift1Indirect;
      const shift2Total = shift2Direct + shift2Indirect;
      const dayTotal = shift1Total + shift2Total;
      day.shift1 = { direct: shift1Direct, indirect: shift1Indirect, total: shift1Total };
      day.shift2 = { direct: shift2Direct, indirect: shift2Indirect, total: shift2Total };
      day.total = dayTotal;
      direct += shift1Direct + shift2Direct;
      indirect += shift1Indirect + shift2Indirect;
      total += dayTotal;
    });
  }

  doc.directHours = direct;
  doc.indirectHours = indirect;
  doc.totalHours = total;
  doc.employeeCount = parsed.employeeCount || (parsed.employeeDetails ? parsed.employeeDetails.length : 0) || 0;
  doc.headcount = doc.employeeCount;

  return doc;
};

const main = async () => {
  const folderArg = process.argv.find((arg) => arg.startsWith('--folder='));
  const submittedByArg = process.argv.find((arg) => arg.startsWith('--submittedBy='));
  const emailArg = process.argv.find((arg) => arg.startsWith('--email='));
  const passwordArg = process.argv.find((arg) => arg.startsWith('--password='));

  const folder = folderArg ? path.resolve(folderArg.split('=')[1]) : DEFAULT_FOLDER;
  const submittedBy = submittedByArg ? submittedByArg.split('=')[1] : 'backfill-script';

  log('Using folder:', folder);
  const files = await listReportFiles(folder);
  if (files.length === 0) {
    throw new Error('No Excel files found in folder');
  }
  log(`Found ${files.length} files`);

  await initClientAuth(emailArg && emailArg.split('=')[1], passwordArg && passwordArg.split('=')[1]);
  const batch = writeBatch(db);
  let processed = 0;

  for (const filePath of files) {
    const buffer = await fs.readFile(filePath);
    const parsed = parseLaborReportFile(buffer, path.basename(filePath));
    if (!parsed || !parsed.weekEnding) {
      log('Skipping file (no weekEnding parsed):', filePath);
      continue;
    }
    const doc = buildDoc(parsed, submittedBy);
    const ref = doc(collection(db, 'laborReports'));
    batch.set(ref, doc);
    processed += 1;
  }

  await batch.commit();
  log(`Imported ${processed} reports into laborReports`);
};

main().catch((err) => {
  console.error('[labor-import] Error:', err);
  process.exit(1);
});
