#!/usr/bin/env node

/**
 * Bulk Upload All Sample Data - REST API Version
 * 
 * This script uses the Firebase REST API to upload data to Firestore.
 * It uses the API key from the Firebase web config, no service account needed.
 * 
 * Run with: node bulk-upload-rest.js
 */

import XLSX from 'xlsx';
import fs from 'fs';
import https from 'https';

const PROJECT_ID = 'mid-states-00821676-61ebe';
const API_KEY = 'AIzaSyAOlZFMyO4kSd1lqbT0ItM4zR97HAVwF4U';

// Helper to normalize column names
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
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    return date.toISOString();
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  return null;
};

// Helper to safely convert to string
const toString = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

// Firebase REST API helper - add document
function addDocument(collection, data) {
  return new Promise((resolve, reject) => {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}?key=${API_KEY}`;
    
    // Convert data to Firestore format
    const firestoreData = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) {
        firestoreData[key] = { nullValue: null };
      } else if (typeof value === 'string') {
        firestoreData[key] = { stringValue: value };
      } else if (typeof value === 'number') {
        if (Number.isInteger(value)) {
          firestoreData[key] = { integerValue: value.toString() };
        } else {
          firestoreData[key] = { doubleValue: value };
        }
      } else if (typeof value === 'boolean') {
        firestoreData[key] = { booleanValue: value };
      } else if (value instanceof Object && value.toISOString) {
        // Date object
        firestoreData[key] = { timestampValue: value.toISOString() };
      }
    }

    const payload = JSON.stringify({
      fields: firestoreData
    });

    const options = {
      hostname: 'firestore.googleapis.com',
      port: 443,
      path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}?key=${API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve();
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

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
  
  let count = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const row of data) {
    // Construct name
    let name = toString(row.name);
    if (!name && (row.firstname || row.lastname)) {
      name = `${toString(row.firstname)} ${toString(row.lastname)}`.trim();
    }
    
    const eid = toString(row.eid || row.crmnumber || row.employeeid || row.id);
    const crmNumber = toString(row.crmnumber || row.crm);
    const status = toString(row.status);
    
    if (!eid || !status) {
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    try {
      await addDocument('applicants', applicantData);
      count++;
      
      if (count % 50 === 0) {
        process.stdout.write(`\r   ✓ Uploaded ${count} applicants...`);
      }
    } catch (error) {
      console.error(`\n   Error on row ${count + skipped}: ${error.message}`);
      errors++;
    }
  }
  
  console.log(`\r   ✅ Successfully uploaded ${count} applicants (skipped ${skipped}, errors ${errors})\n`);
  return { success: count, skipped, errors };
}

// Process Assignment Starts
async function processAssignmentStarts(filePath) {
  console.log('📅 Processing Assignment Starts...');
  
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  
  console.log(`   Found ${rawData.length} rows`);
  
  const data = rawData.map(row => {
    const normalized = {};
    Object.keys(row).forEach(key => {
      const normalizedKey = normalizeColumnName(key);
      normalized[normalizedKey] = row[key];
    });
    return normalized;
  });
  
  let count = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const row of data) {
    // Handle various EID column name formats
    const eid = toString(row.eid || row.employeeid || row.employeenumber || row.employeenumberemployeeemployee || row.id || row.crmnumber);
    
    // Build name from available fields
    let name = toString(row.name || row.employee || row.associatename);
    if (!name && (row.firstname || row.lastname)) {
      name = `${toString(row.firstname)} ${toString(row.lastname)}`.trim();
    }
    
    const startDate = parseExcelDate(row.startdate || row.assignmentstart || row.hiredate);
    
    if (!eid || !name) {
      skipped++;
      continue;
    }
    
    // Parse shift to normalize format
    let shift = toString(row.shift);
    if (shift.includes('1st')) shift = '1st';
    else if (shift.includes('2nd')) shift = '2nd';
    else if (shift.includes('3rd')) shift = '3rd';
    
    const recordData = {
      eid,
      name,
      hireDate: startDate,
      shift: shift,
      position: toString(row.position || row.department),
      status: 'Active',
      phoneNumber: toString(row.phonenumber || row.phone),
      email: toString(row.email),
      notes: toString(row.notes),
      recruiter: toString(row.recruiter),
      date: startDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    try {
      // Add to associates
      await addDocument('associates', recordData);
      // Add to onPremiseData
      await addDocument('onPremiseData', recordData);
      count++;
      
      if (count % 50 === 0) {
        process.stdout.write(`\r   ✓ Uploaded ${count} records...`);
      }
    } catch (error) {
      console.error(`\n   Error on row ${count + skipped}: ${error.message}`);
      errors++;
    }
  }
  
  console.log(`\r   ✅ Successfully uploaded ${count} records (skipped ${skipped}, errors ${errors})\n`);
  return { success: count, skipped, errors };
}

// Process Early Leaves
async function processEarlyLeaves(filePath) {
  console.log('🏃 Processing Early Leaves...');
  
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  
  console.log(`   Found ${rawData.length} rows`);
  
  const data = rawData.map(row => {
    const normalized = {};
    Object.keys(row).forEach(key => {
      const normalizedKey = normalizeColumnName(key);
      normalized[normalizedKey] = row[key];
    });
    return normalized;
  });
  
  let count = 0;
  let skipped = 0;
  let errors = 0;
  
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
      createdAt: new Date().toISOString()
    };
    
    try {
      await addDocument('earlyLeaves', earlyLeaveData);
      count++;
      
      if (count % 50 === 0) {
        process.stdout.write(`\r   ✓ Uploaded ${count} early leaves...`);
      }
    } catch (error) {
      console.error(`\n   Error on row ${count + skipped}: ${error.message}`);
      errors++;
    }
  }
  
  console.log(`\r   ✅ Successfully uploaded ${count} early leaves (skipped ${skipped}, errors ${errors})\n`);
  return { success: count, skipped, errors };
}

// Process DNR List
async function processDNR(filePath) {
  console.log('🚫 Processing DNR List...');
  
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  
  console.log(`   Found ${rawData.length} rows`);
  
  const data = rawData.map(row => {
    const normalized = {};
    Object.keys(row).forEach(key => {
      const normalizedKey = normalizeColumnName(key);
      normalized[normalizedKey] = row[key];
    });
    return normalized;
  });
  
  let count = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const row of data) {
    let name = toString(row.name);
    
    if (!name && (row.firstname || row.lastname)) {
      name = `${toString(row.firstname)} ${toString(row.lastname)}`.trim();
    }
    
    if (!name) {
      skipped++;
      continue;
    }
    
    const dnrData = {
      name,
      firstName: toString(row.firstname),
      lastName: toString(row.lastname),
      eid: toString(row.eid || row.employeeid || row.id),
      reason: toString(row.reason || row.notes),
      dateAdded: parseExcelDate(row.dateadded || row.date),
      notes: toString(row.notes),
      createdAt: new Date().toISOString()
    };
    
    try {
      await addDocument('dnrList', dnrData);
      count++;
      
      if (count % 50 === 0) {
        process.stdout.write(`\r   ✓ Uploaded ${count} DNR records...`);
      }
    } catch (error) {
      console.error(`\n   Error on row ${count + skipped}: ${error.message}`);
      errors++;
    }
  }
  
  console.log(`\r   ✅ Successfully uploaded ${count} DNR records (skipped ${skipped}, errors ${errors})\n`);
  return { success: count, skipped, errors };
}

// Main execution
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 CRESCENT DATA TOOL - BULK UPLOAD (REST API)');
  console.log('='.repeat(60) + '\n');
  
  const results = {
    applicants: null,
    assignmentStarts: null,
    earlyLeaves: null,
    dnr: null
  };
  
  const files = {
    applicants: 'Sample Uploads/Bulk Upload Files/APPLICANT PIPELINE.xlsx',
    assignmentStarts: 'Sample Uploads/Bulk Upload Files/ASSIGNMENT STARTS.xlsx',
    earlyLeaves: 'Sample Uploads/Bulk Upload Files/EARLY LEAVES.xlsx',
    dnr: 'Sample Uploads/Bulk Upload Files/DNR.xlsx'
  };
  
  try {
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
    
    // Summary
    console.log('='.repeat(60));
    console.log('📊 UPLOAD SUMMARY');
    console.log('='.repeat(60));
    
    let totalSuccess = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    
    if (results.applicants) {
      console.log(`Applicants:        ${results.applicants.success.toString().padStart(4)} uploaded, ${results.applicants.skipped} skipped, ${results.applicants.errors} errors`);
      totalSuccess += results.applicants.success;
      totalSkipped += results.applicants.skipped;
      totalErrors += results.applicants.errors;
    }
    if (results.assignmentStarts) {
      console.log(`Assignment Starts: ${results.assignmentStarts.success.toString().padStart(4)} uploaded, ${results.assignmentStarts.skipped} skipped, ${results.assignmentStarts.errors} errors`);
      totalSuccess += results.assignmentStarts.success;
      totalSkipped += results.assignmentStarts.skipped;
      totalErrors += results.assignmentStarts.errors;
    }
    if (results.earlyLeaves) {
      console.log(`Early Leaves:      ${results.earlyLeaves.success.toString().padStart(4)} uploaded, ${results.earlyLeaves.skipped} skipped, ${results.earlyLeaves.errors} errors`);
      totalSuccess += results.earlyLeaves.success;
      totalSkipped += results.earlyLeaves.skipped;
      totalErrors += results.earlyLeaves.errors;
    }
    if (results.dnr) {
      console.log(`DNR List:          ${results.dnr.success.toString().padStart(4)} uploaded, ${results.dnr.skipped} skipped, ${results.dnr.errors} errors`);
      totalSuccess += results.dnr.success;
      totalSkipped += results.dnr.skipped;
      totalErrors += results.dnr.errors;
    }
    
    console.log('='.repeat(60));
    console.log(`TOTAL:             ${totalSuccess.toString().padStart(4)} uploaded, ${totalSkipped} skipped, ${totalErrors} errors`);
    console.log('='.repeat(60));
    
    if (totalSuccess > 0) {
      console.log('\n✅ Bulk upload complete! Your dashboards will now show data.\n');
    } else {
      console.log('\n⚠️  No data was uploaded. Check file paths and try again.\n');
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

main();
