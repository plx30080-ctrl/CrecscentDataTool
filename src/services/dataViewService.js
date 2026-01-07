import { db } from '../firebase';
import { collection, getDocs, query, limit } from 'firebase/firestore';
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
    const q = query(collectionRef, limit(1000));
    const querySnapshot = await getDocs(q);

    const data = querySnapshot.docs.map((doc) => ({
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

    const isPermissionError =
      error.code === 'permission-denied' ||
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

    docs.forEach((doc) => {
      const data = doc.data();

      const timestamps = [data.updatedAt, data.submittedAt, data.createdAt, data.timestamp, data.date].filter(Boolean);

      timestamps.forEach((ts) => {
        try {
          const date = ts.toDate ? ts.toDate() : new Date(ts);
          if (!lastUpdated || date > lastUpdated) {
            lastUpdated = date;
          }
        } catch (e) {
          // Skip invalid dates
        }
      });

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

    const isPermissionError =
      error.code === 'permission-denied' ||
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

    switch (collectionName) {
      case 'users':
        validateUsers(data, warnings);
        break;
      case 'onPremiseData':
        validateOnPremiseData(data, warnings);
        break;
      case 'hoursData':
        validateHoursData(data, warnings);
        break;
      case 'branchMetrics':
        validateBranchMetrics(data, warnings);
        break;
      case 'earlyLeaves':
        validateEarlyLeaves(data, warnings);
        break;
      case 'associates':
        validateAssociates(data, warnings);
        break;
      case 'badges':
        validateBadges(data, warnings);
        break;
      default:
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

  if (recordsWithMissingEmail > 0) warnings.push(`${recordsWithMissingEmail} record(s) missing email address`);
  if (recordsWithMissingRole > 0) warnings.push(`${recordsWithMissingRole} record(s) missing user role`);
}

function validateOnPremiseData(data, warnings) {
  let issues = 0;
  data.forEach((record) => {
    const hasIssues =
      !record.date ||
      !record.shift ||
      record.numberRequested === undefined ||
      record.numberRequired === undefined ||
      record.numberWorking === undefined;
    if (hasIssues) issues++;
  });
  if (issues > 0) warnings.push(`${issues} on-premise record(s) missing date/shift/requested/required/working`);
}

function validateHoursData(data, warnings) {
  let issues = 0;
  data.forEach((record) => {
    const hasDate = !!record.date;
    const shift1 = record.shift1 || {};
    const shift2 = record.shift2 || {};
    const hasHours =
      typeof shift1.total === 'number' ||
      typeof shift2.total === 'number' ||
      typeof record.totalHours === 'number';
    if (!hasDate || !hasHours) issues++;
  });
  if (issues > 0) warnings.push(`${issues} hours record(s) missing date or hour totals`);
}

function validateBranchMetrics(data, warnings) {
  let issues = 0;
  data.forEach((record) => {
    if (!record.date || !record.recruiter) issues++;
  });
  if (issues > 0) warnings.push(`${issues} branch metrics record(s) missing date or recruiter`);
}

function validateAssociates(data, warnings) {
  let missingEid = 0;
  let missingName = 0;
  let missingStatus = 0;

  data.forEach((assoc) => {
    if (!assoc.eid) missingEid++;
    if (!assoc.name) missingName++;
    if (!assoc.pipelineStatus && !assoc.status) missingStatus++;
  });

  if (missingEid > 0) warnings.push(`${missingEid} associate record(s) missing EID`);
  if (missingName > 0) warnings.push(`${missingName} associate record(s) missing name`);
  if (missingStatus > 0) warnings.push(`${missingStatus} associate record(s) missing pipeline/status`);
}

function validateBadges(data, warnings) {
  let missingEid = 0;
  let missingStatus = 0;

  data.forEach((badge) => {
    if (!badge.eid) missingEid++;
    if (!badge.status) missingStatus++;
  });

  if (missingEid > 0) warnings.push(`${missingEid} badge record(s) missing EID linkage`);
  if (missingStatus > 0) warnings.push(`${missingStatus} badge record(s) missing status`);
}

function validateEarlyLeaves(data, warnings) {
  let issues = 0;
  data.forEach((leave) => {
    if (!leave.date || !leave.shift || !leave.leaveTime || !leave.reason) issues++;
  });
  if (issues > 0) warnings.push(`${issues} early leave record(s) missing date/shift/time/reason`);
}

function validateGeneric(data, warnings) {
  if (data.length > 0) {
    const ids = data.map((d) => d.id).filter(Boolean);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) warnings.push('Duplicate IDs detected in collection');
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
