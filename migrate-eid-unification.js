/**
 * EID Unification Migration Script
 * 
 * This script migrates existing applicant data to use EID as the primary identifier.
 * It syncs crmNumber values to the eid field and ensures consistency across collections.
 * 
 * Run this script ONCE before deploying the updated application.
 * 
 * Usage: node migrate-eid-unification.js
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  updateDoc, 
  doc,
  writeBatch
} from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import readline from 'readline';

// Firebase configuration (from src/firebase.js)
const firebaseConfig = {
  apiKey: "AIzaSyAOlZFMyO4kSd1lqbT0ItM4zR97HAVwF4U",
  authDomain: "mid-states-00821676-61ebe.firebaseapp.com",
  projectId: "mid-states-00821676-61ebe",
  storageBucket: "mid-states-00821676-61ebe.firebasestorage.app",
  messagingSenderId: "985379591620",
  appId: "1:985379591620:web:6fed48ff0c32e8b3704091"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/**
 * Prompt for user input
 */
function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Authenticate user
 */
async function authenticate() {
  console.log('\n🔐 Authentication Required');
  console.log('Please sign in with your Firebase account to run this migration.\n');
  
  const email = await prompt('Email: ');
  const password = await prompt('Password: ');
  
  try {
    await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Authentication successful!\n');
    return true;
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    return false;
  }
}

/**
 * Migrate applicants collection to use EID as primary identifier
 */
async function migrateApplicants() {
  console.log('\n📋 Migrating Applicants Collection...');
  
  const applicantsRef = collection(db, 'applicants');
  const snapshot = await getDocs(applicantsRef);
  
  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let batch = writeBatch(db);
  let batchCount = 0;
  const batchSize = 500;
  
  console.log(`Found ${snapshot.size} applicant records to process`);
  
  for (const docSnapshot of snapshot.docs) {
    const data = docSnapshot.data();
    const docRef = doc(db, 'applicants', docSnapshot.id);
    
    try {
      // If eid is missing or empty, use crmNumber
      if (!data.eid && data.crmNumber) {
        batch.update(docRef, {
          eid: data.crmNumber,
          migratedAt: new Date(),
          migratedBy: 'eid-unification-script'
        });
        migratedCount++;
        batchCount++;
        
        console.log(`  ✓ Migrated: ${data.name} - Set eid to ${data.crmNumber}`);
      } 
      // If eid exists but doesn't match crmNumber, keep eid (it's the primary)
      else if (data.eid && data.crmNumber && data.eid !== data.crmNumber) {
        console.log(`  ⚠️  Warning: ${data.name} - EID (${data.eid}) differs from CRM# (${data.crmNumber}). Keeping EID.`);
        skippedCount++;
      }
      // If only eid exists (no crmNumber), that's fine
      else if (data.eid && !data.crmNumber) {
        console.log(`  ℹ️  OK: ${data.name} - Already has EID: ${data.eid}`);
        skippedCount++;
      }
      // Both exist and match - perfect
      else if (data.eid && data.crmNumber && data.eid === data.crmNumber) {
        console.log(`  ✓ OK: ${data.name} - EID and CRM# match: ${data.eid}`);
        skippedCount++;
      }
      // Neither exists - error
      else {
        console.log(`  ❌ Error: ${data.name} - No EID or CRM Number found!`);
        errorCount++;
      }
      
      // Commit batch when it reaches the size limit
      if (batchCount >= batchSize) {
        await batch.commit();
        console.log(`  💾 Committed batch of ${batchCount} updates`);
        batch = writeBatch(db); // Reset batch
        batchCount = 0;
      }
    } catch (error) {
      console.error(`  ❌ Error processing ${data.name}:`, error.message);
      errorCount++;
    }
  }
  
  // Commit remaining batch
  if (batchCount > 0) {
    await batch.commit();
    console.log(`  💾 Committed final batch of ${batchCount} updates`);
  }
  
  console.log('\n✅ Applicants Migration Complete:');
  console.log(`   - Migrated: ${migratedCount}`);
  console.log(`   - Already OK: ${skippedCount}`);
  console.log(`   - Errors: ${errorCount}`);
  
  return { migratedCount, skippedCount, errorCount };
}

/**
 * Check for EID conflicts across collections
 */
async function checkCrossCollectionConflicts() {
  console.log('\n🔍 Checking for EID conflicts across collections...');
  
  const conflicts = [];
  
  // Get all unique EIDs from each collection
  const applicantsSnapshot = await getDocs(collection(db, 'applicants'));
  const associatesSnapshot = await getDocs(collection(db, 'associates'));
  const badgesSnapshot = await getDocs(collection(db, 'badges'));
  
  const applicantEids = new Map();
  applicantsSnapshot.docs.forEach(doc => {
    const eid = doc.data().eid || doc.data().crmNumber;
    if (eid) {
      applicantEids.set(eid, {
        name: doc.data().name,
        status: doc.data().status,
        collection: 'applicants'
      });
    }
  });
  
  const associateEids = new Map();
  associatesSnapshot.docs.forEach(doc => {
    const eid = doc.data().eid;
    if (eid) {
      associateEids.set(eid, {
        name: doc.data().name,
        status: doc.data().status,
        collection: 'associates'
      });
    }
  });
  
  const badgeEids = new Map();
  badgesSnapshot.docs.forEach(doc => {
    const eid = doc.data().eid;
    if (eid) {
      badgeEids.set(eid, {
        name: doc.data().name,
        status: doc.data().status,
        collection: 'badges'
      });
    }
  });
  
  console.log(`   - Applicants: ${applicantEids.size} unique EIDs`);
  console.log(`   - Associates: ${associateEids.size} unique EIDs`);
  console.log(`   - Badges: ${badgeEids.size} unique EIDs`);
  
  // Check for name mismatches on same EID
  const allEids = new Set([
    ...applicantEids.keys(),
    ...associateEids.keys(),
    ...badgeEids.keys()
  ]);
  
  for (const eid of allEids) {
    const names = new Set();
    
    if (applicantEids.has(eid)) names.add(applicantEids.get(eid).name);
    if (associateEids.has(eid)) names.add(associateEids.get(eid).name);
    if (badgeEids.has(eid)) names.add(badgeEids.get(eid).name);
    
    if (names.size > 1) {
      conflicts.push({
        eid,
        names: Array.from(names),
        collections: [
          applicantEids.has(eid) ? 'applicants' : null,
          associateEids.has(eid) ? 'associates' : null,
          badgeEids.has(eid) ? 'badges' : null
        ].filter(Boolean)
      });
    }
  }
  
  if (conflicts.length > 0) {
    console.log(`\n⚠️  Found ${conflicts.length} EID conflicts (same EID, different names):`);
    conflicts.forEach(conflict => {
      console.log(`   - EID ${conflict.eid}:`);
      console.log(`     Names: ${conflict.names.join(' | ')}`);
      console.log(`     Collections: ${conflict.collections.join(', ')}`);
    });
  } else {
    console.log('\n✅ No EID conflicts found - all names match across collections!');
  }
  
  return conflicts;
}

/**
 * Generate summary report
 */
function generateReport(results, conflicts) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 EID UNIFICATION MIGRATION REPORT');
  console.log('='.repeat(60));
  console.log('\nApplicants Collection:');
  console.log(`  ✓ Records migrated: ${results.migratedCount}`);
  console.log(`  ✓ Records already OK: ${results.skippedCount}`);
  console.log(`  ✗ Errors encountered: ${results.errorCount}`);
  
  console.log('\nCross-Collection Analysis:');
  if (conflicts.length === 0) {
    console.log('  ✅ All EIDs are consistent across collections');
  } else {
    console.log(`  ⚠️  ${conflicts.length} EID conflicts need manual review`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Next Steps:');
  console.log('  1. Review any warnings or conflicts above');
  console.log('  2. Deploy updated application code');
  console.log('  3. Test duplicate detection with new uploads');
  console.log('  4. Monitor logs for any EID-related issues');
  console.log('='.repeat(60) + '\n');
}

/**
 * Main migration function
 */
async function main() {
  console.log('🚀 Starting EID Unification Migration...');
  console.log('This will update all applicant records to use EID as primary identifier\n');
  
  try {
    // Step 0: Authenticate
    const authenticated = await authenticate();
    if (!authenticated) {
      console.error('Migration aborted: Authentication required');
      process.exit(1);
    }
    
    // Step 1: Migrate applicants
    const results = await migrateApplicants();
    
    // Step 2: Check for conflicts
    const conflicts = await checkCrossCollectionConflicts();
    
    // Step 3: Generate report
    generateReport(results, conflicts);
    
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run migration
main();
