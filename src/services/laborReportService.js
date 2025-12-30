import { db } from '../firebase';
import logger from '../utils/logger';
import {
  collection,
  query,
  orderBy,
  getDocs,
  where,
  limit
} from 'firebase/firestore';

/**
 * Get all labor reports
 * @param {number} limitCount - Optional limit on number of reports to fetch
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getAllLaborReports = async (limitCount = null) => {
  try {
    let q = query(
      collection(db, 'laborReports'),
      orderBy('weekEnding', 'desc')
    );

    if (limitCount) {
      q = query(q, limit(limitCount));
    }

    const querySnapshot = await getDocs(q);
    const reports = [];

    querySnapshot.forEach((doc) => {
      reports.push({
        id: doc.id,
        ...doc.data(),
        weekEnding: doc.data().weekEnding?.toDate(),
        submittedAt: doc.data().submittedAt?.toDate()
      });
    });

    return { success: true, data: reports };
  } catch (error) {
    logger.error('Error fetching labor reports:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get labor reports for a specific date range
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getLaborReportsByDateRange = async (startDate, endDate) => {
  try {
    const q = query(
      collection(db, 'laborReports'),
      where('weekEnding', '>=', startDate),
      where('weekEnding', '<=', endDate),
      orderBy('weekEnding', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const reports = [];

    querySnapshot.forEach((doc) => {
      reports.push({
        id: doc.id,
        ...doc.data(),
        weekEnding: doc.data().weekEnding?.toDate(),
        submittedAt: doc.data().submittedAt?.toDate()
      });
    });

    return { success: true, data: reports };
  } catch (error) {
    logger.error('Error fetching labor reports by date range:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get recent labor reports (last N weeks)
 * @param {number} weeks - Number of weeks to fetch
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getRecentLaborReports = async (weeks = 12) => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (weeks * 7));

    return await getLaborReportsByDateRange(startDate, endDate);
  } catch (error) {
    logger.error('Error fetching recent labor reports:', error);
    return { success: false, error: error.message };
  }
};
