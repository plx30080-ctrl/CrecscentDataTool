/**
 * Bulk Upload All Sample Data (Client SDK Version)
 * 
 * This script uses the Firebase client SDK to upload data via browser authentication
 * 
 * Run with: npm run dev (then visit the special upload page)
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import XLSX from 'xlsx';
import fs from 'fs';

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

// Helper functions
const normalizeColumnName = (col) => {
  return col
    .replace(/\r/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
};

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

const toString = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

// Export functions for use in a React component
export async function authenticateUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Authenticated as:', userCredential.user.email);
    return true;
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    return false;
  }
}

export async function uploadAllData() {
  const results = await processAllFiles();
  return results;
}

async function processAllFiles() {
  console.log('🚀 Starting Bulk Upload...\n');
  
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
  
  // Process Applicants
  if (fs.existsSync(files.applicants)) {
    results.applicants = await processApplicants(files.applicants);
  }
  
  // Process Assignment Starts
  if (fs.existsSync(files.assignmentStarts)) {
    results.assignmentStarts = await processAssignmentStarts(files.assignmentStarts);
  }
  
  // Process Early Leaves  
  if (fs.existsSync(files.earlyLeaves)) {
    results.earlyLeaves = await processEarlyLeaves(files.earlyLeaves);
  }
  
  // Process DNR
  if (fs.existsSync(files.dnr)) {
    results.dnr = await processDNR(files.dnr);
  }
  
  // Process Badges
  if (fs.existsSync(files.badges)) {
    results.badges = await processBadges(files.badges);
  }
  
  return results;
}

async function processApplicants(filePath) {
  console.log('\n📋 Processing Applicants...');
  
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  
  console.log(`   Found ${rawData.length} rows`);
  
  const data = rawData.map(row => {
    const normalized = {};
    Object.keys(row).forEach(key => {
      normalized[normalizeColumnName(key)] = row[key];
    });
    return normalized;
  });
  
  let batch = writeBatch(db);
  let count = 0;
  let skipped = 0;
  let batchCount = 0;
  
  for (const row of data) {
    let name = toString(row.name);
    if (!name && (row.firstname || row.lastname)) {
      name = `${toString(row.firstname)} ${toString(row.lastname)}`.trim();
    }
    
    const eid = toString(row.eid || row.crmnumber || row.employeeid || row.id);
    const crmNumber = toString(row.crmnumber || row.crm);
    
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
      status,
      name,
      phoneNumber: toString(row.phonenumber || row.phone),
      email: toString(row.email),
      eid,
      crmNumber: crmNumber || eid,
      processDate: parseExcelDate(row.processdate),
      tentativeStartDate: parseExcelDate(row.tentativestartdate || row.tentativestart),
      i9Cleared: toString(row.i9cleared) === 'Yes' ? 'Yes' : '',
      backgroundStatus: toString(row.backgroundstatus),
      shift: toString(row.shift),
      notes: toString(row.notes),
      fill: toString(row.fill),
      recruiter: toString(row.recruiter),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = doc(collection(db, 'applicants'));
    batch.set(docRef, applicantData);
    batchCount++;
    count++;
    
    if (batchCount >= 500) {
      await batch.commit();
      console.log(`   ✓ Uploaded ${count} applicants...`);
      batch = writeBatch(db);
      batchCount = 0;
    }
  }
  
  if (batchCount > 0) {
    await batch.commit();
  }
  
  console.log(`   ✅ Successfully uploaded ${count} applicants (skipped ${skipped})`);
  return { success: count, skipped };
}

// Similar functions for other collections...
// (Simplified for now, you can add them similarly)

async function processAssignmentStarts(filePath) {
  console.log('\n📅 Processing Assignment Starts...');
  // Implementation similar to processApplicants
  return { success: 0, skipped: 0 };
}

async function processEarlyLeaves(filePath) {
  console.log('\n🏃 Processing Early Leaves...');
  return { success: 0, skipped: 0 };
}

async function processDNR(filePath) {
  console.log('\n🚫 Processing DNR...');
  return { success: 0, skipped: 0 };
}

async function processBadges(filePath) {
  console.log('\n🎫 Processing Badges...');
  return { success: 0, skipped: 0 };
}
