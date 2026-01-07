/**
 * Bulk Upload All Sample Data - Firebase CLI Version
 * 
 * This script processes and uploads all sample data files to Firestore
 * using the Firebase CLI's authentication token.
 * 
 * Prerequisites:
 * - Firebase CLI installed and authenticated: firebase login
 * - Current project set: firebase use mid-states-00821676-61ebe
 * 
 * Run with: node bulk-upload-cli.js
 */

import admin from 'firebase-admin';
import XLSX from 'xlsx';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Firebase Admin SDK configuration - uses GOOGLE_APPLICATION_CREDENTIALS or Firebase CLI token
const projectId = 'mid-states-00821676-61ebe';

// Initialize Firebase Admin - will use Firebase CLI token automatically
if (!admin.apps.length) {
  try {
    // Try to use application default credentials first (Firebase CLI or service account)
    admin.initializeApp({
      projectId: projectId,
      credential: admin.credential.applicationDefault()
    });
    console.log('✅ Authenticated with Firebase CLI\n');
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    console.error('\nMake sure you have:');
    console.error('1. Firebase CLI installed: npm install -g firebase-tools');
    console.error('2. Logged in: firebase login');
    console.error('3. Project set: firebase use mid-states-00821676-61ebe\n');
    process.exit(1);
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
  console.log('📋 Processing Applicant Pipeline...');
  
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
  
  console.log(`   ✅ Successfully uploaded ${count} applicants (skipped ${skipped})\n`);
  return { success: count, skipped };
}

// Process Assignment Starts (onPremiseData and Associates)
async function processAssignmentStarts(filePath) {
  console.log('📅 Processing Assignment Starts...');
  
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
    
    // Create associate record
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
    const associateRef = db.collection('associates').doc(eid);
    batch.set(associateRef, associateData, { merge: true });
    
    // Also create onPremiseData record for dashboard
    const onPremiseData = {
      eid: eid,
      name: name,
      hireDate: startDate,
      shift: toString(row.shift),
      position: toString(row.position),
      status: 'Active',
      date: startDate, // Use start date as record date
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const onPremiseRef = db.collection('onPremiseData').doc();
    batch.set(onPremiseRef, onPremiseData);
    
    count++;
    
    if (count % 500 === 0) {
      await batch.commit();
      console.log(`   ✓ Uploaded ${count} records...`);
    }
  }
  
  if (count % 500 !== 0) {
    await batch.commit();
  }
  
  console.log(`   ✅ Successfully uploaded ${count} records (skipped ${skipped})\n`);
  return { success: count, skipped };
}

// Process Early Leaves
async function processEarlyLeaves(filePath) {
  console.log('🏃 Processing Early Leaves...');
  
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
  
  console.log(`   ✅ Successfully uploaded ${count} early leaves (skipped ${skipped})\n`);
  return { success: count, skipped };
}

// Process DNR List
async function processDNR(filePath) {
  console.log('🚫 Processing DNR List...');
  
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
    
    const docRef = db.collection('dnrList').doc();
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
  
  console.log(`   ✅ Successfully uploaded ${count} DNR records (skipped ${skipped})\n`);
  return { success: count, skipped };
}

// Process Weekly Labor Reports
async function processWeeklyLaborReports(reportDir) {
  console.log('📊 Processing Weekly Labor Reports...');
  
  if (!fs.existsSync(reportDir)) {
    console.log(`   ⚠️  Directory not found: ${reportDir}\n`);
    return { success: 0, skipped: 0 };
  }
  
  const files = fs.readdirSync(reportDir).filter(f => f.endsWith('.xls') || f.endsWith('.xlsx'));
  console.log(`   Found ${files.length} report files`);
  
  const batch = db.batch();
  let count = 0;
  let skipped = 0;
  
  for (const file of files) {
    const filePath = `${reportDir}/${file}`;
    
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      
      // Normalize column names
      const data = rawData.map(row => {
        const normalized = {};
        Object.keys(row).forEach(key => {
          const normalizedKey = normalizeColumnName(key);
          normalized[normalizedKey] = row[key];
        });
        return normalized;
      });
      
      for (const row of data) {
        if (!row.date && !row.weekending) {
          skipped++;
          continue;
        }
        
        const laborData = {
          date: parseExcelDate(row.date || row.weekending),
          shift: toString(row.shift || '1st'),
          headcount: parseInt(row.headcount || 0) || 0,
          hoursWorked: parseFloat(row.hoursworked || 0) || 0,
          totalHours: parseFloat(row.totalhours || row.hoursworked || 0) || 0,
          dailyData: toString(row.dailydata),
          notes: toString(row.notes),
          fileName: file,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        const docRef = db.collection('laborReports').doc();
        batch.set(docRef, laborData);
        count++;
        
        if (count % 500 === 0) {
          await batch.commit();
          console.log(`   ✓ Uploaded ${count} labor report rows...`);
        }
      }
    } catch (error) {
      console.log(`   ⚠️  Error processing ${file}: ${error.message}`);
    }
  }
  
  if (count % 500 !== 0) {
    await batch.commit();
  }
  
  console.log(`   ✅ Successfully uploaded ${count} labor report rows (skipped ${skipped})\n`);
  return { success: count, skipped };
}

// Main execution
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 CRESCENT DATA TOOL - BULK UPLOAD');
  console.log('='.repeat(60) + '\n');
  
  const results = {
    applicants: null,
    assignmentStarts: null,
    earlyLeaves: null,
    dnr: null,
    laborReports: null
  };
  
  const files = {
    applicants: 'Sample Uploads/Bulk Upload Files/APPLICANT PIPELINE.xlsx',
    assignmentStarts: 'Sample Uploads/Bulk Upload Files/ASSIGNMENT STARTS.xlsx',
    earlyLeaves: 'Sample Uploads/Bulk Upload Files/EARLY LEAVES.xlsx',
    dnr: 'Sample Uploads/Bulk Upload Files/DNR.xlsx',
    laborReportDir: 'Sample Uploads/Bulk Upload Files/Weekly Labor Reports'
  };
  
  try {
    // Process each file
    if (fs.existsSync(files.applicants)) {
      results.applicants = await processApplicants(files.applicants);
    } else {
      console.log(`⚠️  File not found: ${files.applicants}\n`);
    }
    
    if (fs.existsSync(files.assignmentStarts)) {
      results.assignmentStarts = await processAssignmentStarts(files.assignmentStarts);
    } else {
      console.log(`⚠️  File not found: ${files.assignmentStarts}\n`);
    }
    
    if (fs.existsSync(files.earlyLeaves)) {
      results.earlyLeaves = await processEarlyLeaves(files.earlyLeaves);
    } else {
      console.log(`⚠️  File not found: ${files.earlyLeaves}\n`);
    }
    
    if (fs.existsSync(files.dnr)) {
      results.dnr = await processDNR(files.dnr);
    } else {
      console.log(`⚠️  File not found: ${files.dnr}\n`);
    }
    
    if (fs.existsSync(files.laborReportDir)) {
      results.laborReports = await processWeeklyLaborReports(files.laborReportDir);
    } else {
      console.log(`⚠️  Directory not found: ${files.laborReportDir}\n`);
    }
    
    // Summary
    console.log('='.repeat(60));
    console.log('📊 UPLOAD SUMMARY');
    console.log('='.repeat(60));
    
    let totalSuccess = 0;
    let totalSkipped = 0;
    
    if (results.applicants) {
      console.log(`Applicants:         ${results.applicants.success.toString().padStart(4)} uploaded, ${results.applicants.skipped} skipped`);
      totalSuccess += results.applicants.success;
      totalSkipped += results.applicants.skipped;
    }
    if (results.assignmentStarts) {
      console.log(`Assignment Starts:  ${results.assignmentStarts.success.toString().padStart(4)} uploaded, ${results.assignmentStarts.skipped} skipped`);
      totalSuccess += results.assignmentStarts.success;
      totalSkipped += results.assignmentStarts.skipped;
    }
    if (results.earlyLeaves) {
      console.log(`Early Leaves:       ${results.earlyLeaves.success.toString().padStart(4)} uploaded, ${results.earlyLeaves.skipped} skipped`);
      totalSuccess += results.earlyLeaves.success;
      totalSkipped += results.earlyLeaves.skipped;
    }
    if (results.dnr) {
      console.log(`DNR List:           ${results.dnr.success.toString().padStart(4)} uploaded, ${results.dnr.skipped} skipped`);
      totalSuccess += results.dnr.success;
      totalSkipped += results.dnr.skipped;
    }
    if (results.laborReports) {
      console.log(`Labor Reports:      ${results.laborReports.success.toString().padStart(4)} uploaded, ${results.laborReports.skipped} skipped`);
      totalSuccess += results.laborReports.success;
      totalSkipped += results.laborReports.skipped;
    }
    
    console.log('='.repeat(60));
    console.log(`TOTAL:              ${totalSuccess.toString().padStart(4)} uploaded, ${totalSkipped} skipped`);
    console.log('='.repeat(60));
    
    if (totalSuccess > 0) {
      console.log('\n✅ Bulk upload complete! Check your dashboards.\n');
    } else {
      console.log('\n⚠️  No data was uploaded. Check file paths above.\n');
    }
    
  } catch (error) {
    console.error('\n❌ Error during bulk upload:', error.message);
    console.error('\nDebug info:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the script
main();
