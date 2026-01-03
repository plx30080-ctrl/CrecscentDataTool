/**
 * Bulk Historical Import Service
 * 
 * Handles importing large volumes of historical data with proper
 * data transformation, validation, and error handling
 */

import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  Timestamp,
  writeBatch,
  doc,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import logger from '../utils/logger';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

/**
 * Parse date from various formats
 */
const parseDate = (dateValue) => {
  if (!dateValue) return null;
  
  // Already a Date object
  if (dateValue instanceof Date) {
    return Timestamp.fromDate(dateValue);
  }
  
  // Try various date formats
  const formats = [
    'YYYY-MM-DD',
    'MM/DD/YYYY',
    'M/D/YYYY',
    'MM-DD-YYYY',
    'YYYY/MM/DD',
    'MMM DD, YYYY',
    'MMMM DD, YYYY'
  ];
  
  for (const format of formats) {
    const parsed = dayjs(dateValue, format, true);
    if (parsed.isValid()) {
      return Timestamp.fromDate(parsed.toDate());
    }
  }
  
  // Try default parsing
  const parsed = dayjs(dateValue);
  if (parsed.isValid()) {
    return Timestamp.fromDate(parsed.toDate());
  }
  
  return null;
};

/**
 * Normalize field names to match Firestore schema
 */
const normalizeFieldName = (fieldName) => {
  const mapping = {
    'employee id': 'eid',
    'employeeid': 'eid',
    'id': 'eid',
    'crm number': 'crmNumber',
    'crmnumber': 'crmNumber',
    'first name': 'firstName',
    'firstname': 'firstName',
    'last name': 'lastName',
    'lastname': 'lastName',
    'full name': 'name',
    'fullname': 'name',
    'phone': 'phoneNumber',
    'phone number': 'phoneNumber',
    'phonenumber': 'phoneNumber',
    'email address': 'email',
    'process date': 'processDate',
    'processdate': 'processDate',
    'start date': 'tentativeStartDate',
    'startdate': 'tentativeStartDate',
    'tentative start': 'tentativeStartDate',
    'actual start': 'actualStartDate',
    'actualstart': 'actualStartDate',
    'week ending': 'weekEnding',
    'weekending': 'weekEnding',
    'associate name': 'associateName',
    'associatename': 'associateName',
    'time left': 'timeLeft',
    'timeleft': 'timeLeft',
    'hours worked': 'hoursWorked',
    'hoursworked': 'hoursWorked',
    'corrective action': 'correctiveAction',
    'correctiveaction': 'correctiveAction',
    'date added': 'dateAdded',
    'dateadded': 'dateAdded'
  };
  
  const normalized = fieldName.toLowerCase().trim();
  return mapping[normalized] || fieldName;
};

/**
 * Transform raw data row to match Firestore schema
 */
const transformRow = (row, dataType) => {
  const transformed = {};
  
  // Normalize field names
  Object.keys(row).forEach(key => {
    const normalizedKey = normalizeFieldName(key);
    transformed[normalizedKey] = row[key];
  });
  
  // Data type specific transformations
  switch (dataType) {
    case 'APPLICANTS':
      // Ensure we have either name or firstName/lastName
      if (!transformed.name && (transformed.firstName || transformed.lastName)) {
        transformed.name = `${transformed.firstName || ''} ${transformed.lastName || ''}`.trim();
      }
      
      // Use crmNumber as eid if eid is missing
      if (!transformed.eid && transformed.crmNumber) {
        transformed.eid = transformed.crmNumber;
      }
      
      // Parse dates
      if (transformed.processDate) {
        transformed.processDate = parseDate(transformed.processDate);
      }
      if (transformed.tentativeStartDate) {
        transformed.tentativeStartDate = parseDate(transformed.tentativeStartDate);
      }
      if (transformed.actualStartDate) {
        transformed.actualStartDate = parseDate(transformed.actualStartDate);
      }
      
      // Default status if missing
      if (!transformed.status) {
        transformed.status = 'Processed';
      }
      break;
      
    case 'ASSIGNMENTS':
      // Parse start date
      if (transformed.startDate) {
        transformed.hireDate = parseDate(transformed.startDate);
      }
      
      // Ensure name is uppercase for associates
      if (transformed.name) {
        transformed.name = transformed.name.toUpperCase();
      }
      
      // Default status
      if (!transformed.status) {
        transformed.status = 'Active';
      }
      break;
      
    case 'EARLY_LEAVES':
      // Parse date
      if (transformed.date) {
        transformed.date = parseDate(transformed.date);
      }
      
      // Ensure name is uppercase
      if (transformed.associateName) {
        transformed.associateName = transformed.associateName.toUpperCase();
      }
      
      // Parse hours worked
      if (transformed.hoursWorked) {
        transformed.hoursWorked = parseFloat(transformed.hoursWorked) || 0;
      }
      
      // Default corrective action
      if (!transformed.correctiveAction) {
        transformed.correctiveAction = 'None';
      }
      break;
      
    case 'DNR':
      // Parse date added
      if (transformed.dateAdded) {
        transformed.dateAdded = parseDate(transformed.dateAdded);
      } else {
        transformed.dateAdded = Timestamp.now();
      }
      
      // Ensure name is uppercase
      if (transformed.name) {
        transformed.name = transformed.name.toUpperCase();
      }
      
      // Default status
      if (!transformed.status) {
        transformed.status = 'Active';
      }
      break;
      
    case 'LABOR_REPORTS':
      // Parse week ending date
      if (transformed.weekEnding) {
        transformed.weekEnding = parseDate(transformed.weekEnding);
      }
      
      // Parse numeric fields
      ['totalHours', 'headcount', 'overtime', 'regularHours'].forEach(field => {
        if (transformed[field]) {
          transformed[field] = parseFloat(transformed[field]) || 0;
        }
      });
      break;
  }
  
  return transformed;
};

/**
 * Import applicants in bulk
 */
export const bulkImportApplicants = async (data) => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const batch = writeBatch(db);
    const applicantsRef = collection(db, 'applicants');
    let count = 0;
    const batchSize = 500;
    
    for (let i = 0; i < data.length; i++) {
      const row = transformRow(data[i], 'APPLICANTS');
      
      // Add metadata
      row.uploadedAt = serverTimestamp();
      row.uploadedBy = user.email;
      row.lastModified = serverTimestamp();
      row.lastModifiedBy = user.email;
      
      const docRef = doc(applicantsRef);
      batch.set(docRef, row);
      count++;
      
      // Commit batch every 500 documents
      if (count % batchSize === 0) {
        await batch.commit();
        logger.info(`Committed batch of ${batchSize} applicants`);
      }
    }
    
    // Commit remaining documents
    if (count % batchSize !== 0) {
      await batch.commit();
    }
    
    logger.info(`Successfully imported ${count} applicants`);
    return { success: true, count };
    
  } catch (error) {
    logger.error('Error importing applicants:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Import associates/assignments in bulk
 */
export const bulkImportAssignments = async (data) => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const batch = writeBatch(db);
    const associatesRef = collection(db, 'associates');
    let count = 0;
    const batchSize = 500;
    
    for (let i = 0; i < data.length; i++) {
      const row = transformRow(data[i], 'ASSIGNMENTS');
      
      // Add metadata
      row.uploadedAt = serverTimestamp();
      row.uploadedBy = user.email;
      
      const docRef = doc(associatesRef);
      batch.set(docRef, row);
      count++;
      
      if (count % batchSize === 0) {
        await batch.commit();
        logger.info(`Committed batch of ${batchSize} assignments`);
      }
    }
    
    if (count % batchSize !== 0) {
      await batch.commit();
    }
    
    logger.info(`Successfully imported ${count} assignments`);
    return { success: true, count };
    
  } catch (error) {
    logger.error('Error importing assignments:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Import labor reports in bulk
 */
export const bulkImportLaborReports = async (data) => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const batch = writeBatch(db);
    const reportsRef = collection(db, 'laborReports');
    let count = 0;
    const batchSize = 500;
    
    for (let i = 0; i < data.length; i++) {
      const row = transformRow(data[i], 'LABOR_REPORTS');
      
      // Add metadata
      row.submittedAt = serverTimestamp();
      row.submittedBy = user.email;
      row.submittedByUid = user.uid;
      
      const docRef = doc(reportsRef);
      batch.set(docRef, row);
      count++;
      
      if (count % batchSize === 0) {
        await batch.commit();
        logger.info(`Committed batch of ${batchSize} labor reports`);
      }
    }
    
    if (count % batchSize !== 0) {
      await batch.commit();
    }
    
    logger.info(`Successfully imported ${count} labor reports`);
    return { success: true, count };
    
  } catch (error) {
    logger.error('Error importing labor reports:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Import badges with photos
 */
export const bulkImportBadges = async (data, photoFiles) => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Create a map of EID to photo file
    const photoMap = {};
    if (photoFiles) {
      photoFiles.forEach(file => {
        // Extract EID from filename (assuming format like "12345.jpg" or "John_Doe_12345.jpg")
        const match = file.name.match(/(\d{4,})/);
        if (match) {
          photoMap[match[1]] = file;
        }
      });
    }
    
    const badgesRef = collection(db, 'badges');
    let count = 0;
    
    for (const row of data) {
      const badge = {
        eid: row.eid || row.id,
        name: row.name?.toUpperCase() || '',
        position: row.position || '',
        shift: row.shift || '1st',
        status: row.status || 'Pending',
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        createdByEmail: user.email
      };
      
      // If photo exists, upload it
      // Note: Photo upload would be handled separately in the component
      // This just creates the badge record
      
      await addDoc(badgesRef, badge);
      count++;
      
      if (count % 100 === 0) {
        logger.info(`Imported ${count} badges...`);
      }
    }
    
    logger.info(`Successfully imported ${count} badges`);
    return { success: true, count };
    
  } catch (error) {
    logger.error('Error importing badges:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Validate data before import
 */
export const validateImportData = (data, dataType) => {
  const errors = [];
  const warnings = [];
  
  if (!data || data.length === 0) {
    errors.push('No data to import');
    return { errors, warnings };
  }
  
  // Check for duplicate EIDs
  const eids = data.map(row => row.eid || row.id).filter(Boolean);
  const duplicateEids = eids.filter((eid, index) => eids.indexOf(eid) !== index);
  if (duplicateEids.length > 0) {
    warnings.push(`Found ${duplicateEids.length} duplicate EIDs`);
  }
  
  // Data type specific validation
  switch (dataType) {
    case 'APPLICANTS':
      data.forEach((row, index) => {
        if (!row.name && !row.firstName) {
          errors.push(`Row ${index + 1}: Missing name`);
        }
      });
      break;
      
    case 'EARLY_LEAVES':
      data.forEach((row, index) => {
        if (!row.eid) {
          errors.push(`Row ${index + 1}: Missing EID`);
        }
        if (!row.date) {
          errors.push(`Row ${index + 1}: Missing date`);
        }
      });
      break;
  }
  
  return { errors, warnings };
};
