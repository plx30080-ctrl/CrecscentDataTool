import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.resolve(__dirname, '../Sample Uploads/Bulk Upload Files/Weekly Labor Reports');
const DEST_DIR = path.resolve(__dirname, '../public/weekly-labor-reports');

const log = (...args) => console.log('[copy-weekly-reports]', ...args);

const ensureDir = async (p) => {
  await fs.mkdir(p, { recursive: true });
};

const listExcelFiles = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && (e.name.endsWith('.xlsx') || e.name.endsWith('.xls')))
    .map((e) => e.name);
};

const copyFiles = async () => {
  await ensureDir(DEST_DIR);
  const files = await listExcelFiles(SRC_DIR);
  if (files.length === 0) {
    throw new Error('No Excel files found in source directory');
  }
  for (const name of files) {
    const src = path.join(SRC_DIR, name);
    const dest = path.join(DEST_DIR, name);
    await fs.copyFile(src, dest);
  }
  const manifest = { files };
  await fs.writeFile(path.join(DEST_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  log(`Copied ${files.length} files and wrote manifest.json`);
};

copyFiles().catch((err) => {
  console.error('[copy-weekly-reports] Error:', err);
  process.exit(1);
});
