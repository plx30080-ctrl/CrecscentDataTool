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
 * @returns {Promise<{success: boolean, data: Array, error?: string}>}
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
      data
    };
  } catch (error) {
    logger.error(`Error fetching collection data for ${collectionName}:`, error);
    return {
      success: false,
      data: [],
      error: error.message
    };
  }
}

/**
 * Get statistics about a collection
 * @param {string} collectionName - Name of the Firestore collection
 * @returns {Promise<{success: boolean, stats: Object, error?: string}>}
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
        data.timestamp
      ].filter(Boolean);

      timestamps.forEach(ts => {
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        if (!lastUpdated || date > lastUpdated) {
          lastUpdated = date;
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
      stats
    };
  } catch (error) {
    logger.error(`Error fetching collection stats for ${collectionName}:`, error);
    return {
      success: false,
      stats: {
        totalRecords: 0,
        lastUpdated: null,
        sizeEstimate: 'N/A'
      },
      error: error.message
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
    
    const issues = [];

    if (data.length === 0) {
      return {
        success: true,
        validation: {
          isValid: true,
          issues: []
        }
      };
    }

    // Collection-specific validations
    switch (collectionName) {
      case 'users':
        validateUsers(data, issues);
        break;
      case 'shiftData':
        validateShiftData(data, issues);
        break;
      case 'hoursData':
        validateHoursData(data, issues);
        break;
      case 'applicants':
        validateApplicants(data, issues);
        break;
      case 'associates':
        validateAssociates(data, issues);
        break;
      case 'badges':
        validateBadges(data, issues);
        break;
      case 'earlyLeaves':
        validateEarlyLeaves(data, issues);
        break;
      default:
        // Generic validation
        validateGeneric(data, issues);
    }

    return {
      success: true,
      validation: {
        isValid: issues.length === 0,
        issues
      }
    };
  } catch (error) {
    logger.error(`Error validating collection data for ${collectionName}:`, error);
    return {
      success: false,
      validation: {
        isValid: false,
        issues: ['Validation error: ' + error.message]
      }
    };
  }
}

// Validation helper functions

function validateUsers(data, issues) {
  data.forEach((user, index) => {
    if (!user.email) {
      issues.push(`Record ${index + 1}: Missing email address`);
    }
    if (!user.role) {
      issues.push(`Record ${index + 1}: Missing user role`);
    }
    if (!user.displayName) {
      issues.push(`Record ${index + 1}: Missing display name`);
    }
  });
}

function validateShiftData(data, issues) {
  data.forEach((record, index) => {
    if (!record.date) {
      issues.push(`Record ${index + 1}: Missing date`);
    }
    if (!record.shift) {
      issues.push(`Record ${index + 1}: Missing shift designation`);
    }
    if (record.numberWorking > record.numberRequired) {
      issues.push(`Record ${index + 1}: Working count exceeds required count`);
    }
    if (record.numberWorking < 0 || record.numberRequired < 0) {
      issues.push(`Record ${index + 1}: Negative values detected`);
    }
  });
}

function validateHoursData(data, issues) {
  data.forEach((record, index) => {
    if (!record.date) {
      issues.push(`Record ${index + 1}: Missing date`);
    }
    if (record.totalHours < 0) {
      issues.push(`Record ${index + 1}: Negative total hours`);
    }
    const calculatedTotal = (record.shift1Hours || 0) + (record.shift2Hours || 0);
    if (record.totalHours && Math.abs(record.totalHours - calculatedTotal) > 1) {
      issues.push(`Record ${index + 1}: Total hours mismatch (${record.totalHours} vs ${calculatedTotal})`);
    }
  });
}

function validateApplicants(data, issues) {
  const validStatuses = ['Applied', 'Interviewed', 'Processed', 'Hired', 'Started', 'Rejected'];
  
  data.forEach((applicant, index) => {
    if (!applicant.name) {
      issues.push(`Record ${index + 1}: Missing applicant name`);
    }
    if (!applicant.status) {
      issues.push(`Record ${index + 1}: Missing status`);
    } else if (!validStatuses.includes(applicant.status)) {
      issues.push(`Record ${index + 1}: Invalid status "${applicant.status}"`);
    }
    if (applicant.status === 'Hired' && !applicant.projectedStartDate) {
      issues.push(`Record ${index + 1}: Hired applicant missing projected start date`);
    }
  });
}

function validateAssociates(data, issues) {
  const validStatuses = ['Active', 'Inactive', 'Terminated'];
  
  data.forEach((associate, index) => {
    if (!associate.eid) {
      issues.push(`Record ${index + 1}: Missing employee ID (EID)`);
    }
    if (!associate.name) {
      issues.push(`Record ${index + 1}: Missing associate name`);
    }
    if (!associate.status) {
      issues.push(`Record ${index + 1}: Missing status`);
    } else if (!validStatuses.includes(associate.status)) {
      issues.push(`Record ${index + 1}: Invalid status "${associate.status}"`);
    }
    if (!associate.startDate) {
      issues.push(`Record ${index + 1}: Missing start date`);
    }
  });
}

function validateBadges(data, issues) {
  data.forEach((badge, index) => {
    if (!badge.eid) {
      issues.push(`Record ${index + 1}: Missing employee ID (EID)`);
    }
    if (!badge.name) {
      issues.push(`Record ${index + 1}: Missing badge holder name`);
    }
    if (!badge.status) {
      issues.push(`Record ${index + 1}: Missing badge status`);
    }
    if (!badge.createdAt) {
      issues.push(`Record ${index + 1}: Missing creation timestamp`);
    }
  });
}

function validateEarlyLeaves(data, issues) {
  data.forEach((leave, index) => {
    if (!leave.associateId) {
      issues.push(`Record ${index + 1}: Missing associate ID`);
    }
    if (!leave.date) {
      issues.push(`Record ${index + 1}: Missing date`);
    }
    if (!leave.reason) {
      issues.push(`Record ${index + 1}: Missing reason for early leave`);
    }
    if (!leave.leaveTime) {
      issues.push(`Record ${index + 1}: Missing leave time`);
    }
  });
}

function validateGeneric(data, issues) {
  // Check for common missing fields
  const commonFields = ['createdAt', 'updatedAt', 'timestamp'];
  let hasTimestamp = false;

  if (data.length > 0) {
    const firstRecord = data[0];
    commonFields.forEach(field => {
      if (firstRecord[field]) {
        hasTimestamp = true;
      }
    });

    if (!hasTimestamp) {
      issues.push('Collection may be missing timestamp fields (createdAt, updatedAt, or timestamp)');
    }
  }

  // Check for duplicate IDs
  const ids = data.map(d => d.id).filter(Boolean);
  const uniqueIds = new Set(ids);
  if (ids.length !== uniqueIds.size) {
    issues.push('Duplicate IDs detected in collection');
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
