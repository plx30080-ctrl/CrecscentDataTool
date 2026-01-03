/**
 * Data Clearing Script
 * 
 * This script clears all data from your Firestore database to start fresh.
 * 
 * IMPORTANT: This is a destructive operation and cannot be undone!
 * 
 * Usage:
 *   node clear-all-data.js
 * 
 * What gets cleared:
 * - applicants
 * - associates  
 * - badges
 * - earlyLeaves
 * - dnrDatabase
 * - laborReports
 * - onPremiseData
 * - branchDaily
 * - branchWeekly
 * - hoursData
 * - shiftData
 * - recruiterData
 * - applicantDocuments (metadata only, not storage files)
 * 
 * What is preserved:
 * - users (your user accounts)
 * - auditLog (for compliance/tracking)
 * - badgeTemplates (your badge templates)
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, writeBatch, doc } from 'firebase/firestore';
import readline from 'readline';

// Firebase configuration - using the same config from your project
const firebaseConfig = {
  apiKey: "AIzaSyDkYYp1IXAEP32-n3eMBjDG6jDATYJ-8Ks",
  authDomain: "staffing-data-management.firebaseapp.com",
  projectId: "staffing-data-management",
  storageBucket: "staffing-data-management.firebasestorage.app",
  messagingSenderId: "730925831055",
  appId: "1:730925831055:web:29b1bbb8084063f6dd066c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Collections to clear
const COLLECTIONS_TO_CLEAR = [
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
  'applicantDocuments'
];

// Collections to preserve
const PRESERVED_COLLECTIONS = [
  'users',
  'auditLog',
  'badgeTemplates'
];

/**
 * Delete all documents in a collection in batches
 */
async function clearCollection(collectionName) {
  console.log(`\n📦 Clearing collection: ${collectionName}`);
  
  try {
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);
    
    if (snapshot.empty) {
      console.log(`   ✓ Collection "${collectionName}" is already empty`);
      return { success: true, deleted: 0 };
    }
    
    const totalDocs = snapshot.size;
    console.log(`   Found ${totalDocs} document(s) to delete`);
    
    // Firestore batch limit is 500 operations
    const batchSize = 500;
    let deletedCount = 0;
    
    while (true) {
      const batch = writeBatch(db);
      const docs = await getDocs(collectionRef);
      
      if (docs.empty) break;
      
      let batchCount = 0;
      docs.forEach((document) => {
        if (batchCount < batchSize) {
          batch.delete(document.ref);
          batchCount++;
        }
      });
      
      if (batchCount === 0) break;
      
      await batch.commit();
      deletedCount += batchCount;
      console.log(`   Deleted ${deletedCount}/${totalDocs} documents...`);
    }
    
    console.log(`   ✓ Successfully cleared "${collectionName}" (${deletedCount} documents)`);
    return { success: true, deleted: deletedCount };
    
  } catch (error) {
    console.error(`   ✗ Error clearing "${collectionName}":`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Prompt user for confirmation
 */
async function confirmAction() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    console.log('\n⚠️  WARNING: This will permanently delete ALL data from the following collections:');
    console.log('   ' + COLLECTIONS_TO_CLEAR.join(', '));
    console.log('\n✓ The following collections will be preserved:');
    console.log('   ' + PRESERVED_COLLECTIONS.join(', '));
    console.log('\n❗ This action CANNOT be undone!\n');
    
    rl.question('Are you sure you want to proceed? Type "YES" to confirm: ', (answer) => {
      rl.close();
      resolve(answer.trim() === 'YES');
    });
  });
}

/**
 * Main execution
 */
async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   Firestore Data Clearing Script');
  console.log('═══════════════════════════════════════════════════');
  
  const confirmed = await confirmAction();
  
  if (!confirmed) {
    console.log('\n❌ Operation cancelled. No data was deleted.');
    process.exit(0);
  }
  
  console.log('\n🚀 Starting data clearing process...');
  
  const results = {
    successful: [],
    failed: [],
    totalDeleted: 0
  };
  
  for (const collectionName of COLLECTIONS_TO_CLEAR) {
    const result = await clearCollection(collectionName);
    
    if (result.success) {
      results.successful.push(collectionName);
      results.totalDeleted += result.deleted;
    } else {
      results.failed.push({ name: collectionName, error: result.error });
    }
  }
  
  // Summary
  console.log('\n═══════════════════════════════════════════════════');
  console.log('   Summary');
  console.log('═══════════════════════════════════════════════════');
  console.log(`✓ Successfully cleared: ${results.successful.length} collection(s)`);
  console.log(`✗ Failed: ${results.failed.length} collection(s)`);
  console.log(`📊 Total documents deleted: ${results.totalDeleted}`);
  
  if (results.failed.length > 0) {
    console.log('\n❌ Failed collections:');
    results.failed.forEach(({ name, error }) => {
      console.log(`   - ${name}: ${error}`);
    });
  }
  
  console.log('\n✅ Data clearing process complete!');
  console.log('   You can now upload fresh data for 2024 and 2025.');
  
  process.exit(0);
}

// Run the script
main().catch((error) => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
