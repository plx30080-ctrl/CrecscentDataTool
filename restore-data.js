/**
 * Data Restore Script
 * 
 * This script restores data from a backup folder created by backup-data.js
 * 
 * Prerequisites:
 *   firebase login (you're already logged in!)
 * 
 * Usage:
 *   node restore-data.js <backup-folder-name>
 * 
 * Example:
 *   node restore-data.js backup-2026-01-03-143022
 * 
 * Options:
 *   --collection <name>  Restore only a specific collection
 *   --skip-existing      Skip documents that already exist (don't overwrite)
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin SDK
// Uses Application Default Credentials from Firebase CLI login
admin.initializeApp({
  projectId: 'staffing-data-management'
});

const db = admin.firestore();

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
  console.log('Please enter your Firebase credentials to restore data:\n');
  
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
 * Convert ISO date strings back to Firestore Timestamps
 */
function deserializeData(data) {
  if (data === null || data === undefined) return data;
  
  // Check if it's an ISO date string
  if (typeof data === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(data)) {
    try {
      return admin.firestore.Timestamp.fromDate(new Date(data));
    } catch {
      return data;
    }
  }
  
  if (Array.isArray(data)) {
    return data.map(item => deserializeData(item));
  }
  
  if (typeof data === 'object') {
    const deserialized = {};
    for (const key in data) {
      deserialized[key] = deserializeData(data[key]);
    }
    return deserialized;
  }
  
  return data;
}

/**
 * Restore a single collection
 */
async function restoreCollection(collectionName, backupDir, skipExisting = false) {
  console.log(`\n📦 Restoring collection: ${collectionName}`);
  
  try {
    const filePath = path.join(backupDir, `${collectionName}.json`);
    
    if (!fs.existsSync(filePath)) {
      console.log(`   ⚠️  Backup file not found: ${collectionName}.json`);
      return { success: true, count: 0, skipped: 0, notFound: true };
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const documents = JSON.parse(fileContent);
    
    if (documents.length === 0) {
      console.log(`   ℹ️  No documents to restore in ${collectionName}`);
      return { success: true, count: 0, skipped: 0 };
    }
    
    console.log(`   Found ${documents.length} document(s) to restore`);
    
    let restoredCount = 0;
    let skippedCount = 0;
    const batchSize = 500;
    
    // Process in batches
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = db.batch();
      const batchDocs = documents.slice(i, Math.min(i + batchSize, documents.length));
      
      for (const document of batchDocs) {
        const docRef = db.collection(collectionName).doc(document.id);
        
        if (skipExisting) {
          const existingDoc = await docRef.get();
          if (existingDoc.exists) {
            skippedCount++;
            continue;
          }
        }
        
        const data = deserializeData(document.data);
        batch.set(docRef, data);
        restoredCount++;
      }
      
      await batch.commit();
      console.log(`   Restored ${Math.min(i + batchSize, documents.length)}/${documents.length} documents...`);
    }
    
    console.log(`   ✓ Successfully restored ${restoredCount} document(s)${skippedCount > 0 ? ` (skipped ${skippedCount} existing)` : ''}`);
    return { success: true, count: restoredCount, skipped: skippedCount };
    
  } catch (error) {
    console.error(`   ✗ Error restoring "${collectionName}":`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Prompt user for confirmation
 */
async function confirmAction(backupDir, specificCollection = null) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    console.log('\n⚠️  WARNING: This will restore data from backup to Firestore.');
    console.log(`📁 Backup folder: ${backupDir}`);
    
    if (specificCollection) {
      console.log(`📦 Collection: ${specificCollection}`);
    } else {
      console.log('📦 All collections in backup will be restored');
    }
    
    console.log('\n⚠️  This may overwrite existing data!\n');
    
    rl.question('Are you sure you want to proceed? Type "YES" to confirm: ', (answer) => {
      rl.close();
      resolve(answer.trim() === 'YES');
    });
  });
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    backupFolder: null,
    specificCollection: null,
    skipExisting: false
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--collection' && i + 1 < args.length) {
      options.specificCollection = args[i + 1];
      i++;
    } else if (arg === '--skip-existing') {
      options.skipExisting = true;
    } else if (!arg.startsWith('--')) {
      options.backupFolder = arg;
    }
  }
  
  return options;
}

/**
 * Main execution
 */
async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   Firestore Data Restore Script');
  console.log('═══════════════════════════════════════════════════');
  
  const options = parseArgs();
  
  if (!options.backupFolder) {
    console.error('\n❌ Error: No backup folder specified');
    console.log('\nUsage:');
    console.log('  node restore-data.js <backup-folder-name>');
    console.log('\nExample:');
    console.log('  node restore-data.js backup-2026-01-03-143022');
    console.log('\nOptions:');
    console.log('  --collection <name>  Restore only a specific collection');
    console.log('  --skip-existing      Skip documents that already exist');
    process.exit(1);
  }
  
  const backupDir = path.join(__dirname, 'backups', options.backupFolder);
  
  if (!fs.existsSync(backupDir)) {
    console.error(`\n❌ Error: Backup folder not found: ${backupDir}`);
    console.log('\nAvailable backups:');
    const backupsDir = path.join(__dirname, 'backups');
    if (fs.existsSync(backupsDir)) {
      const backups = fs.readdirSync(backupsDir).filter(f => f.startsWith('backup-'));
      backups.forEach(b => console.log(`  - ${b}`));
    }
    process.exit(1);
  }
  
  console.log('\n🔑 Using Firebase CLI authentication\n');
  
  // Load manifest
  const manifestPath = path.join(backupDir, 'MANIFEST.json');
  let manifest = null;
  if (fs.existsSync(manifestPath)) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    console.log(`\n📋 Backup from: ${manifest.backupDate}`);
    console.log(`📊 Total documents: ${manifest.totalDocuments}`);
  }
  
  const confirmed = await confirmAction(backupDir, options.specificCollection);
  
  if (!confirmed) {
    console.log('\n❌ Operation cancelled. No data was restored.');
    process.exit(0);
  }
  
  console.log('\n🚀 Starting restore process...');
  
  const results = {
    successful: [],
    failed: [],
    totalRestored: 0,
    totalSkipped: 0
  };
  
  // Determine which collections to restore
  let collectionsToRestore = [];
  if (options.specificCollection) {
    collectionsToRestore = [options.specificCollection];
  } else if (manifest) {
    collectionsToRestore = manifest.collections.map(c => c.name);
  } else {
    // List all JSON files in backup directory
    const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json') && f !== 'MANIFEST.json');
    collectionsToRestore = files.map(f => f.replace('.json', ''));
  }
  
  for (const collectionName of collectionsToRestore) {
    const result = await restoreCollection(collectionName, backupDir, options.skipExisting);
    
    if (result.success) {
      if (!result.notFound) {
        results.successful.push(collectionName);
        results.totalRestored += result.count;
        results.totalSkipped += result.skipped;
      }
    } else {
      results.failed.push({ name: collectionName, error: result.error });
    }
  }
  
  // Summary
  console.log('\n═══════════════════════════════════════════════════');
  console.log('   Restore Summary');
  console.log('═══════════════════════════════════════════════════');
  console.log(`✓ Successfully restored: ${results.successful.length} collection(s)`);
  console.log(`✗ Failed: ${results.failed.length} collection(s)`);
  console.log(`📊 Total documents restored: ${results.totalRestored}`);
  if (results.totalSkipped > 0) {
    console.log(`⏭️  Skipped existing documents: ${results.totalSkipped}`);
  }
  
  if (results.failed.length > 0) {
    console.log('\n❌ Failed collections:');
    results.failed.forEach(({ name, error }) => {
      console.log(`   - ${name}: ${error}`);
    });
  }
  
  console.log('\n✅ Restore complete!');
  
  process.exit(0);
}

// Run the script
main().catch((error) => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
