/**
 * Bulk Upload All Sample Data
 * 
 * This script processes and uploads all sample data files to Firestore:
 * - Applicant Pipeline
 * - Assignment Starts
 * - Early Leaves
 * - DNR List
 * - Badge Export
 * 
 * Run with: node bulk-upload-all.js
 */

import admin from 'firebase-admin';
import XLSX from 'xlsx';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Firebase configuration (from src/firebase.js)
const firebaseConfig = {
  apiKey: "AIzaSyAOlZFMyO4kSd1lqbT0ItM4zR97HAVwF4U",
  authDomain: "mid-states-00821676-61ebe.firebaseapp.com",
  projectId: "mid-states-00821676-61ebe",
  storageBucket: "mid-states-00821676-61ebe.firebasestorage.app",
  messagingSenderId: "985379591620",
  appId: "1:985379591620:web:6fed48ff0c32e8b3704091"
};

// Initialize Firebase Admin with explicit credential path
// The GOOGLE_APPLICATION_CREDENTIALS environment variable should be set
// Or we use the Firebase token from the CLI
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      projectId: firebaseConfig.projectId,
      credential: admin.credential.applicationDefault()
    });
  } catch (error) {
    console.error('⚠️  Warning: Using Firebase Admin without service account.');
    console.error('   Run: export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account.json"');
    console.error('   Or use: gcloud auth application-default login');
    throw error;
  }
}

const db = admin.firestore();

// Helper function to normalize column names
const normalizeColumnName = (col) => {
  return col
    .replace(/\r/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
};

// Helper to parse Excel dates
const parseExcelDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + value * 86400000);
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

// Helper to safely convert to string
const toString = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

// Process Applicant Pipeline
async function processApplicants(filePath) {
  console.log('\n📋 Processing Applicant Pipeline...');
  
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  
  console.log(`   Found ${rawData.length} rows`);
  
  // Normalize column names
  const data = rawData.map(row => {
    const normalized = {};
    Object.keys(row).forEach(key => {
      const normalizedKey = normalizeColumnName(key);
      normalized[normalizedKey] = row[key];
    });
    return normalized;
  });
  
  const batch = db.batch();
  let count = 0;
  let skipped = 0;
  
  for (const row of data) {
    // Construct name
    let name = toString(row.name);
    if (!name && (row.firstname || row.lastname)) {
      name = `${toString(row.firstname)} ${toString(row.lastname)}`.trim();
    }
    
    // Get EID (primary) or CRM Number (fallback)
    const eid = toString(row.eid || row.crmnumber || row.employeeid || row.id);
    const crmNumber = toString(row.crmnumber || row.crm);
    
    // Skip rows without EID/CRM
    if (!eid) {
      skipped++;
      continue;
    }
    
    const status = toString(row.status);
    if (!status) {
      skipped++;
      continue;
    }
    
    const applicantData = {
      status: status,
      name: name,
      phoneNumber: toString(row.phonenumber || row.phone),
      email: toString(row.email),
      eid: eid,
      crmNumber: crmNumber || eid,
      processDate: parseExcelDate(row.processdate),
      tentativeStartDate: parseExcelDate(row.tentativestartdate || row.tentativestart),
      i9Cleared: toString(row.i9cleared) === 'Yes' ? 'Yes' : '',
      backgroundStatus: toString(row.backgroundstatus),
      shift: toString(row.shift),
      notes: toString(row.notes),
      fill: toString(row.fill),
      recruiter: toString(row.recruiter),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = db.collection('applicants').doc();
    batch.set(docRef, applicantData);
    count++;
    
    // Commit batch every 500 records
    if (count % 500 === 0) {
      await batch.commit();
      console.log(`   ✓ Uploaded ${count} applicants...`);
    }
  }
  
  // Commit remaining
  if (count % 500 !== 0) {
    await batch.commit();
  }
  
  console.log(`   ✅ Successfully uploaded ${count} applicants (skipped ${skipped})`);
  return { success: count, skipped };
}

// Process Assignment Starts
async function processAssignmentStarts(filePath) {
  console.log('\n📅 Processing Assignment Starts...');
  
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  
  console.log(`   Found ${rawData.length} rows`);
  
  // Normalize column names
  const data = rawData.map(row => {
    const normalized = {};
    Object.keys(row).forEach(key => {
      const normalizedKey = normalizeColumnName(key);
      normalized[normalizedKey] = row[key];
    });
    return normalized;
  });
  
  const batch = db.batch();
  let count = 0;
  let skipped = 0;
  
  for (const row of data) {
    const eid = toString(row.eid || row.employeeid || row.id || row.crmnumber);
    let name = toString(row.name || row.associatename);
    
    if (!name && (row.firstname || row.lastname)) {
      name = `${toString(row.firstname)} ${toString(row.lastname)}`.trim();
    }
    
    const startDate = parseExcelDate(row.startdate || row.assignmentstart || row.hiredate);
    
    if (!eid || !name) {
      skipped++;
      continue;
    }
    
    const associateData = {
      eid: eid,
      name: name,
      hireDate: startDate,
      shift: toString(row.shift),
      position: toString(row.position),
      status: 'Active',
      phoneNumber: toString(row.phonenumber || row.phone),
      email: toString(row.email),
      notes: toString(row.notes),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Use EID as document ID for associates
    const docRef = db.collection('associates').doc(eid);
    batch.set(docRef, associateData, { merge: true });
    count++;
    
    if (count % 500 === 0) {
      await batch.commit();
      console.log(`   ✓ Uploaded ${count} associates...`);
    }
  }
  
  if (count % 500 !== 0) {
    await batch.commit();
  }
  
  console.log(`   ✅ Successfully uploaded ${count} associates (skipped ${skipped})`);
  return { success: count, skipped };
}

// Process Early Leaves
async function processEarlyLeaves(filePath) {
  console.log('\n🏃 Processing Early Leaves...');
  
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  
  console.log(`   Found ${rawData.length} rows`);
  
  // Normalize column names
  const data = rawData.map(row => {
    const normalized = {};
    Object.keys(row).forEach(key => {
      const normalizedKey = normalizeColumnName(key);
      normalized[normalizedKey] = row[key];
    });
    return normalized;
  });
  
  const batch = db.batch();
  let count = 0;
  let skipped = 0;
  
  for (const row of data) {
    let name = toString(row.associatename || row.name);
    
    if (!name && (row.firstname || row.lastname)) {
      name = `${toString(row.firstname)} ${toString(row.lastname)}`.trim();
    }
    
    if (!name) {
      skipped++;
      continue;
    }
    
    const earlyLeaveData = {
      associateName: name,
      eid: toString(row.eid || row.employeeid || row.id),
      date: parseExcelDate(row.date),
      shift: toString(row.shift),
      timeLeft: toString(row.timeleft),
      reason: toString(row.reason),
      approved: toString(row.approved) === 'Yes',
      notes: toString(row.notes),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = db.collection('earlyLeaves').doc();
    batch.set(docRef, earlyLeaveData);
    count++;
    
    if (count % 500 === 0) {
      await batch.commit();
      console.log(`   ✓ Uploaded ${count} early leaves...`);
    }
  }
  
  if (count % 500 !== 0) {
    await batch.commit();
  }
  
  console.log(`   ✅ Successfully uploaded ${count} early leaves (skipped ${skipped})`);
  return { success: count, skipped };
}

// Process DNR List
async function processDNR(filePath) {
  console.log('\n🚫 Processing DNR List...');
  
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  
  console.log(`   Found ${rawData.length} rows`);
  
  // Normalize column names
  const data = rawData.map(row => {
    const normalized = {};
    Object.keys(row).forEach(key => {
      const normalizedKey = normalizeColumnName(key);
      normalized[normalizedKey] = row[key];
    });
    return normalized;
  });
  
  const batch = db.batch();
  let count = 0;
  let skipped = 0;
  
  for (const row of data) {
    let name = toString(row.name);
    
    if (!name && (row.firstname || row.lastname)) {
      name = `${toString(row.firstname)} ${toString(row.lastname)}`.trim();
    }
    
    // DNR needs at least a name for reference
    if (!name) {
      skipped++;
      continue;
    }
    
    const dnrData = {
      name: name,
      firstName: toString(row.firstname),
      lastName: toString(row.lastname),
      eid: toString(row.eid || row.employeeid || row.id),
      reason: toString(row.reason || row.notes),
      dateAdded: parseExcelDate(row.dateadded || row.date),
      notes: toString(row.notes),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = db.collection('dnr').doc();
    batch.set(docRef, dnrData);
    count++;
    
    if (count % 500 === 0) {
      await batch.commit();
      console.log(`   ✓ Uploaded ${count} DNR records...`);
    }
  }
  
  if (count % 500 !== 0) {
    await batch.commit();
  }
  
  console.log(`   ✅ Successfully uploaded ${count} DNR records (skipped ${skipped})`);
  return { success: count, skipped };
}

// Process Badge Export
async function processBadges(filePath) {
  console.log('\n🎫 Processing Badge Export...');
  
  let rawData;
  
  // Check if it's CSV or Excel
  if (filePath.endsWith('.csv')) {
    // Read CSV file
    const csvContent = fs.readFileSync(filePath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    rawData = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });
  } else {
    // Read Excel file
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  }
  
  console.log(`   Found ${rawData.length} rows`);
  
  // Normalize column names
  const data = rawData.map(row => {
    const normalized = {};
    Object.keys(row).forEach(key => {
      const normalizedKey = normalizeColumnName(key);
      normalized[normalizedKey] = row[key];
    });
    return normalized;
  });
  
  const batch = db.batch();
  let count = 0;
  let skipped = 0;
  
  for (const row of data) {
    const eid = toString(row.eid || row.employeeid || row.id || row.crmnumber);
    let name = toString(row.name || row.associatename);
    
    if (!name && (row.firstname || row.lastname)) {
      name = `${toString(row.firstname)} ${toString(row.lastname)}`.trim();
    }
    
    if (!eid || !name) {
      skipped++;
      continue;
    }
    
    const badgeData = {
      eid: eid,
      name: name,
      position: toString(row.position),
      status: toString(row.status),
      hireDate: parseExcelDate(row.hiredate),
      shift: toString(row.shift),
      email: toString(row.email),
      phoneNumber: toString(row.phonenumber || row.phone),
      notes: toString(row.notes),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Use EID as document ID for badges
    const docRef = db.collection('badges').doc(eid);
    batch.set(docRef, badgeData, { merge: true });
    count++;
    
    if (count % 500 === 0) {
      await batch.commit();
      console.log(`   ✓ Uploaded ${count} badges...`);
    }
  }
  
  if (count % 500 !== 0) {
    await batch.commit();
  }
  
  console.log(`   ✅ Successfully uploaded ${count} badges (skipped ${skipped})`);
  return { success: count, skipped };
}

// Main execution
async function main() {
  console.log('🚀 Starting Bulk Upload of All Data Files\n');
  console.log('=' .repeat(60));
  
  const results = {
    applicants: null,
    assignmentStarts: null,
    earlyLeaves: null,
    dnr: null,
    badges: null
  };
  
  const files = {
    applicants: 'Sample Uploads/Bulk Upload Files/APPLICANT PIPELINE.xlsx',
    assignmentStarts: 'Sample Uploads/Bulk Upload Files/ASSIGNMENT STARTS.xlsx',
    earlyLeaves: 'Sample Uploads/Bulk Upload Files/EARLY LEAVES.xlsx',
    dnr: 'Sample Uploads/Bulk Upload Files/DNR.xlsx',
    badges: 'Sample Uploads/Bulk Upload Files/BADGE EXPORT/Records 2025-12-30 18-51-50.csv'
  };
  
  try {
    // Process each file
    if (fs.existsSync(files.applicants)) {
      results.applicants = await processApplicants(files.applicants);
    } else {
      console.log(`⚠️  File not found: ${files.applicants}`);
    }
    
    if (fs.existsSync(files.assignmentStarts)) {
      results.assignmentStarts = await processAssignmentStarts(files.assignmentStarts);
    } else {
      console.log(`⚠️  File not found: ${files.assignmentStarts}`);
    }
    
    if (fs.existsSync(files.earlyLeaves)) {
      results.earlyLeaves = await processEarlyLeaves(files.earlyLeaves);
    } else {
      console.log(`⚠️  File not found: ${files.earlyLeaves}`);
    }
    
    if (fs.existsSync(files.dnr)) {
      results.dnr = await processDNR(files.dnr);
    } else {
      console.log(`⚠️  File not found: ${files.dnr}`);
    }
    
    if (fs.existsSync(files.badges)) {
      results.badges = await processBadges(files.badges);
    } else {
      console.log(`⚠️  File not found: ${files.badges}`);
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 UPLOAD SUMMARY');
    console.log('='.repeat(60));
    
    let totalSuccess = 0;
    let totalSkipped = 0;
    
    if (results.applicants) {
      console.log(`Applicants:       ${results.applicants.success} uploaded, ${results.applicants.skipped} skipped`);
      totalSuccess += results.applicants.success;
      totalSkipped += results.applicants.skipped;
    }
    if (results.assignmentStarts) {
      console.log(`Assignment Starts: ${results.assignmentStarts.success} uploaded, ${results.assignmentStarts.skipped} skipped`);
      totalSuccess += results.assignmentStarts.success;
      totalSkipped += results.assignmentStarts.skipped;
    }
    if (results.earlyLeaves) {
      console.log(`Early Leaves:     ${results.earlyLeaves.success} uploaded, ${results.earlyLeaves.skipped} skipped`);
      totalSuccess += results.earlyLeaves.success;
      totalSkipped += results.earlyLeaves.skipped;
    }
    if (results.dnr) {
      console.log(`DNR List:         ${results.dnr.success} uploaded, ${results.dnr.skipped} skipped`);
      totalSuccess += results.dnr.success;
      totalSkipped += results.dnr.skipped;
    }
    if (results.badges) {
      console.log(`Badges:           ${results.badges.success} uploaded, ${results.badges.skipped} skipped`);
      totalSuccess += results.badges.success;
      totalSkipped += results.badges.skipped;
    }
    
    console.log('='.repeat(60));
    console.log(`TOTAL:            ${totalSuccess} uploaded, ${totalSkipped} skipped`);
    console.log('='.repeat(60));
    console.log('\n✅ Bulk upload complete!\n');
    
  } catch (error) {
    console.error('\n❌ Error during bulk upload:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the script
main();
