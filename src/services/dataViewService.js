import { db } from '../firebase';
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import logger from '../utils/logger';

/**
 * Get all data from a specific collection
 * @param {string} collectionName - Name of the Firestore collection
 * @returns {Promise<{success: boolean, data: Array, error?: string, permissionDenied?: boolean}>}
 */
export async function getCollectionData(collectionName) {
  try {
    logger.info(`Fetching data from collection: ${collectionName}`);
    
    const collectionRef = collection(db, collectionName);
    const q = query(collectionRef, limit(1000)); // Limit to prevent overwhelming the UI
    const querySnapshot = await getDocs(q);
    
    const data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    logger.info(`Successfully fetched ${data.length} records from ${collectionName}`);
    
    return {
      success: true,
      data,
      permissionDenied: false
    };
  } catch (error) {
    logger.error(`Error fetching collection data for ${collectionName}:`, error);
    
    // Check if it's a permission error
    const isPermissionError = error.code === 'permission-denied' || 
                              error.message.includes('permission') ||
                              error.message.includes('Permission');
    
    return {
      success: false,
      data: [],
      error: error.message,
      permissionDenied: isPermissionError
    };
  }
}

/**
 * Get statistics about a collection
 * @param {string} collectionName - Name of the Firestore collection
 * @returns {Promise<{success: boolean, stats: Object, error?: string, permissionDenied?: boolean}>}
 */
export async function getCollectionStats(collectionName) {
  try {
    logger.info(`Fetching stats for collection: ${collectionName}`);
    
    const collectionRef = collection(db, collectionName);
    const querySnapshot = await getDocs(collectionRef);
    
    const docs = querySnapshot.docs;
    let lastUpdated = null;
    let totalSize = 0;

    // Find the most recent update
    docs.forEach(doc => {
      const data = doc.data();
      
      // Check various timestamp fields
      const timestamps = [
        data.updatedAt,
        data.submittedAt,
        data.createdAt,
        data.timestamp,
        data.date
      ].filter(Boolean);

      timestamps.forEach(ts => {
        try {
          const date = ts.toDate ? ts.toDate() : new Date(ts);
          if (!lastUpdated || date > lastUpdated) {
            lastUpdated = date;
          }
        } catch (e) {
          // Skip invalid dates
        }
      });

      // Rough size estimate (not exact, but gives an idea)
      totalSize += JSON.stringify(data).length;
    });

    const stats = {
      totalRecords: docs.length,
      lastUpdated,
      sizeEstimate: formatBytes(totalSize)
    };

    logger.info(`Collection ${collectionName} stats:`, stats);

    return {
      success: true,
      stats,
      permissionDenied: false
    };
  } catch (error) {
    logger.error(`Error fetching collection stats for ${collectionName}:`, error);
    
    const isPermissionError = error.code === 'permission-denied' || 
                              error.message.includes('permission') ||
                              error.message.includes('Permission');
    
    return {
      success: false,
      stats: {
        totalRecords: 0,
        lastUpdated: null,
        sizeEstimate: 'N/A'
      },
      error: error.message,
      permissionDenied: isPermissionError
    };
  }
}

/**
 * Validate collection data for common issues
 * @param {string} collectionName - Name of the Firestore collection
 * @param {Array} data - Data to validate
 * @returns {Promise<{success: boolean, validation: Object}>}
 */
export async function validateCollectionData(collectionName, data) {
  try {
    logger.info(`Validating data for collection: ${collectionName}`);
    
    const warnings = [];

    if (data.length === 0) {
      return {
        success: true,
        validation: {
          isValid: true,
          issues: [],
          warnings: []
        }
      };
    }

    // Collection-specific validations - warnings only, not critical errors
    switch (collectionName) {
      case 'users':
        validateUsers(data, warnings);
        break;
      case 'shiftData':
        validateShiftData(data, warnings);
        break;
      case 'hoursData':
        validateHoursData(data, warnings);
        break;
      case 'applicants':
        validateApplicants(data, warnings);
        break;
      case 'associates':
        validateAssociates(data, warnings);
        break;
      case 'badges':
        validateBadges(data, warnings);
        break;
      case 'earlyLeaves':
        validateEarlyLeaves(data, warnings);
        break;
      case 'recruiterData':
        validateRecruiterData(data, warnings);
        break;
      case 'onPremiseData':
      case 'laborReports':
      case 'branchDaily':
      case 'branchWeekly':
        validateBasic(data, warnings);
        break;
      default:
        // Generic validation
        validateGeneric(data, warnings);
    }

    return {
      success: true,
      validation: {
        isValid: warnings.length === 0,
        issues: warnings,
        warnings: warnings
      }
    };
  } catch (error) {
    logger.error(`Error validating collection data for ${collectionName}:`, error);
    return {
      success: false,
      validation: {
        isValid: false,
        issues: [],
        warnings: ['Validation error: ' + error.message]
      }
    };
  }
}

// Validation helper functions

function validateUsers(data, warnings) {
  let recordsWithMissingEmail = 0;
  let recordsWithMissingRole = 0;

  data.forEach((user) => {
    if (!user.email) recordsWithMissingEmail++;
    if (!user.role) recordsWithMissingRole++;
  });

  if (recordsWithMissingEmail > 0) {
    warnings.push(`${recordsWithMissingEmail} record(s) missing email address`);
  }
  if (recordsWithMissingRole > 0) {
    warnings.push(`${recordsWithMissingRole} record(s) missing user role`);
  }
}

function validateShiftData(data, warnings) {
  let recordsWithIssues = 0;
  
  data.forEach((record) => {
    const hasIssues = !record.date || !record.shift || 
                      (record.numberWorking > record.numberRequired) ||
                      (record.numberWorking < 0 || record.numberRequired < 0);
    if (hasIssues) recordsWithIssues++;
  });

  if (recordsWithIssues > 0) {
    warnings.push(`${recordsWithIssues} record(s) have potential data issues (missing date/shift, negative values, or count mismatches)`);
  }
}

function validateHoursData(data, warnings) {
  let recordsWithIssues = 0;
  
  data.forEach((record) => {
    if (!record.date || record.totalHours < 0) {
      recordsWithIssues++;
    }
  });

  if (recordsWithIssues > 0) {
    warnings.push(`${recordsWithIssues} record(s) missing date or have negative hours`);
  }
}

function validateApplicants(data, warnings) {
  const validStatuses = ['Applied', 'Interviewed', 'Processed', 'Hired', 'Started', 'Rejected'];
  let missingName = 0;
  let invalidStatus = 0;

  data.forEach((applicant) => {
    if (!applicant.name) missingName++;
    if (applicant.status && !validStatuses.includes(applicant.status)) {
      invalidStatus++;
    }
  });

  if (missingName > 0) {
    warnings.push(`${missingName} record(s) missing applicant name`);
  }
  if (invalidStatus > 0) {
    warnings.push(`${invalidStatus} record(s) have invalid status values`);
  }
}

function validateAssociates(data, warnings) {
  const validStatuses = ['Active', 'Inactive', 'Terminated'];
  let missingEid = 0;
  let missingName = 0;
  let invalidStatus = 0;

  data.forEach((associate) => {
    if (!associate.eid) missingEid++;
    if (!associate.name) missingName++;
    if (associate.status && !validStatuses.includes(associate.status)) {
      invalidStatus++;
    }
  });

  if (missingEid > 0) {
    warnings.push(`${missingEid} record(s) missing employee ID (EID)`);
  }
  if (missingName > 0) {
    warnings.push(`${missingName} record(s) missing associate name`);
  }
  if (invalidStatus > 0) {
    warnings.push(`${invalidStatus} record(s) have invalid status values`);
  }
}

function validateBadges(data, warnings) {
  let missingEid = 0;
  let missingName = 0;

  data.forEach((badge) => {
    if (!badge.eid) missingEid++;
    if (!badge.name) missingName++;
  });

  if (missingEid > 0) {
    warnings.push(`${missingEid} record(s) missing employee ID (EID)`);
  }
  if (missingName > 0) {
    warnings.push(`${missingName} record(s) missing badge holder name`);
  }
}

function validateEarlyLeaves(data, warnings) {
  let missingAssociateId = 0;
  let missingDate = 0;
  let missingReason = 0;

  data.forEach((leave) => {
    if (!leave.associateId) missingAssociateId++;
    if (!leave.date) missingDate++;
    if (!leave.reason) missingReason++;
  });

  if (missingAssociateId > 0) {
    warnings.push(`${missingAssociateId} record(s) missing associate ID`);
  }
  if (missingDate > 0) {
    warnings.push(`${missingDate} record(s) missing date`);
  }
  if (missingReason > 0) {
    warnings.push(`${missingReason} record(s) missing reason for early leave`);
  }
}

function validateRecruiterData(data, warnings) {
  let missingRecruiterName = 0;
  let missingDate = 0;

  data.forEach((record) => {
    if (!record.recruiterName) missingRecruiterName++;
    if (!record.date) missingDate++;
  });

  if (missingRecruiterName > 0) {
    warnings.push(`${missingRecruiterName} record(s) missing recruiter name`);
  }
  if (missingDate > 0) {
    warnings.push(`${missingDate} record(s) missing date`);
  }
}

function validateBasic(data, warnings) {
  // Basic validation for generic collections
  const ids = data.map(d => d.id).filter(Boolean);
  const uniqueIds = new Set(ids);
  if (ids.length !== uniqueIds.size) {
    warnings.push('Duplicate IDs detected in collection');
  }
}

function validateGeneric(data, warnings) {
  // Generic validation for unknown collections
  if (data.length > 0) {
    const ids = data.map(d => d.id).filter(Boolean);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      warnings.push('Duplicate IDs detected in collection');
    }
  }
}

/**
 * Format bytes to human-readable format
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted size string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export default {
  getCollectionData,
  getCollectionStats,
  validateCollectionData
};
