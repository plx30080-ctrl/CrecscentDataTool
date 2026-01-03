/**
 * Data Backup Script
 * 
 * This script exports all data from your Firestore database to JSON files.
 * Creates a timestamped backup folder with separate files for each collection.
 * 
 * Prerequisites:
 *   firebase login (you're already logged in!)
 * 
 * Usage:
 *   node backup-data.js
 * 
 * Output:
 *   backups/backup-YYYY-MM-DD-HHMMSS/
 *     ├── applicants.json
 *     ├── associates.json
 *     ├── badges.json
 *     ├── earlyLeaves.json
 *     └── ... (all collections)
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin SDK
// Uses Application Default Credentials from Firebase CLI login
admin.initializeApp({
  projectId: 'staffing-data-management'
});

const db = admin.firestore();

// Collections to backup
const COLLECTIONS_TO_BACKUP = [
  'applicants',
  'associates',
  'badges',
  'earlyLeaves',
  'dnrDatabase',
  'laborReports',
  'onPremiseData',
  'branchDaily',
  'branchWeekly',
  'hoursData',
  'shiftData',
  'recruiterData',
  'applicantDocuments',
  'users',
  'auditLog',
  'badgeTemplates'
];

/**
 * Prompt for Firebase authentication
 */
async function authenticateUser() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => new Promise((resolve) => {
    rl.question(prompt, resolve);
  });

  console.log('\n🔐 Firebase Authentication Required');
  console.log('Please enter your Firebase credentials to backup data:\n');
  
  const email = await question('Email: ');
  const password = await question('Password: ');
  rl.close();

  try {
    await signInWithEmailAndPassword(auth, email, password);
    console.log('✓ Authentication successful!\n');
    return true;
  } catch (error) {
    console.error('✗ Authentication failed:', error.message);
    return false;
  }
}

/**
 * Convert Firestore Timestamp to ISO string
 */
function serializeData(data) {
  if (data === null || data === undefined) return data;
  
  // Handle Firestore Timestamp (Admin SDK)
  if (data instanceof admin.firestore.Timestamp) {
    return data.toDate().toISOString();
  }
  
  if (data.toDate && typeof data.toDate === 'function') {
    return data.toDate().toISOString();
  }
  
  if (data instanceof Date) {
    return data.toISOString();
  }
  
  if (Array.isArray(data)) {
    return data.map(item => serializeData(item));
  }
  
  if (typeof data === 'object') {
    const serialized = {};
    for (const key in data) {
      serialized[key] = serializeData(data[key]);
    }
    return serialized;
  }
  
  return data;
}

/**
 * Backup a single collection
 */
async function backupCollection(collectionName, outputDir) {
  console.log(`\n📦 Backing up collection: ${collectionName}`);
  
  try {
    const collectionRef = db.collection(collectionName);
    const snapshot = await collectionRef.get();
    
    if (snapshot.empty) {
      console.log(`   ℹ️  Collection "${collectionName}" is empty`);
      return { success: true, count: 0, skipped: true };
    }
    
    const documents = [];
    snapshot.forEach((doc) => {
      documents.push({
        id: doc.id,
        data: serializeData(doc.data())
      });
    });
    
    const filePath = path.join(outputDir, `${collectionName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(documents, null, 2), 'utf8');
    
    console.log(`   ✓ Backed up ${documents.length} document(s) to ${collectionName}.json`);
    return { success: true, count: documents.length };
    
  } catch (error) {
    console.error(`   ✗ Error backing up "${collectionName}":`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Create backup directory with timestamp
 */
function createBackupDirectory() {
  const timestamp = new Date().toISOString()
    .replace(/T/, '-')
    .replace(/\..+/, '')
    .replace(/:/g, '');
  
  const backupDir = path.join(__dirname, 'backups', `backup-${timestamp}`);
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  return backupDir;
}

/**
 * Create backup manifest file
 */
function createManifest(backupDir, results) {
  const manifest = {
    backupDate: new Date().toISOString(),
    backupVersion: '1.0',
    collections: results.successful.map(name => ({
      name,
      documentCount: results.counts[name] || 0,
      file: `${name}.json`
    })),
    totalDocuments: results.totalDocuments,
    successful: results.successful.length,
    failed: results.failed.length,
    failedCollections: results.failed
  };
  
  const manifestPath = path.join(backupDir, 'MANIFEST.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  
  // Also create a readable README
  const readme = `# Firestore Backup

**Backup Date:** ${new Date().toISOString()}
**Total Documents:** ${results.totalDocuments}
**Collections Backed Up:** ${results.successful.length}

## Collections

${results.successful.map(name => `- ${name}.json (${results.counts[name] || 0} documents)`).join('\n')}

## How to Use This Backup

1. **View Data:** Open any .json file to see the backed up data
2. **Restore Data:** Use the restore-data.js script (if available) or manually import
3. **Selective Restore:** You can restore individual collections by importing specific JSON files

## File Format

Each JSON file contains an array of documents:
\`\`\`json
[
  {
    "id": "document-id",
    "data": {
      "field1": "value1",
      "field2": "value2"
    }
  }
]
\`\`\`

## Notes

- Timestamps are converted to ISO 8601 format strings
- All data types are preserved as closely as possible
- Document IDs are included for reference
`;
  
  const readmePath = path.join(backupDir, 'README.md');
  fs.writeFileSync(readmePath, readme, 'utf8');
}

/**
 * Main execution
 */
async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   Firestore Data Backup Script');
  console.log('═══════════════════════════════════════════════════');
  console.log('\n🔑 Using Firebase CLI authentication\n');
  
  const backupDir = createBackupDirectory();
  console.log(`\n📁 Backup directory: ${backupDir}`);
  console.log('\n🚀 Starting backup process...');
  
  const results = {
    successful: [],
    failed: [],
    counts: {},
    totalDocuments: 0
  };
  
  for (const collectionName of COLLECTIONS_TO_BACKUP) {
    const result = await backupCollection(collectionName, backupDir);
    
    if (result.success) {
      if (!result.skipped) {
        results.successful.push(collectionName);
        results.counts[collectionName] = result.count;
        results.totalDocuments += result.count;
      }
    } else {
      results.failed.push({ name: collectionName, error: result.error });
    }
  }
  
  // Create manifest and README
  createManifest(backupDir, results);
  
  // Summary
  console.log('\n═══════════════════════════════════════════════════');
  console.log('   Backup Summary');
  console.log('═══════════════════════════════════════════════════');
  console.log(`✓ Successfully backed up: ${results.successful.length} collection(s)`);
  console.log(`✗ Failed: ${results.failed.length} collection(s)`);
  console.log(`📊 Total documents backed up: ${results.totalDocuments}`);
  console.log(`\n📁 Backup location: ${backupDir}`);
  
  if (results.failed.length > 0) {
    console.log('\n❌ Failed collections:');
    results.failed.forEach(({ name, error }) => {
      console.log(`   - ${name}: ${error}`);
    });
  }
  
  console.log('\n✅ Backup complete!');
  console.log('   You can now safely run the clear-all-data.js script.');
  console.log(`   To restore, keep the backup folder: ${path.basename(backupDir)}`);
  
  process.exit(0);
}

// Run the script
main().catch((error) => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
