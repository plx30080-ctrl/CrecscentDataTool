import {
  collection,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getCountFromServer,
  Timestamp,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import logger from '../utils/logger';
import { withTimeout } from '../utils/timeout';
import { logAuditAction } from './adminService';

// ============ SHIFT DATA ============
export const addShiftData = async (shiftData, userId) => {
  try {
    const docRef = await addDoc(collection(db, 'shiftData'), {
      ...shiftData,
      date: Timestamp.fromDate(new Date(shiftData.date)),
      submittedBy: userId,
      submittedAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    logger.error('Error adding shift data:', error);
    return { success: false, error: error.message };
  }
};

export const getShiftData = async (startDate, endDate, shift = null) => {
  try {
    // Normalize start date to beginning of day
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    // Normalize end date to end of day
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const constraints = [
      where('date', '>=', Timestamp.fromDate(start)),
      where('date', '<=', Timestamp.fromDate(end)),
      orderBy('date', 'asc')
    ];

    if (shift) {
      constraints.push(where('shift', '==', shift));
    }

    const q = query(collection(db, 'shiftData'), ...constraints);
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate()
    }));
    return { success: true, data };
  } catch (error) {
    logger.error('Error getting shift data:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// ============ HOURS DATA ============
export const addHoursData = async (hoursData, userId) => {
  try {
    const docRef = await addDoc(collection(db, 'hoursData'), {
      ...hoursData,
      date: Timestamp.fromDate(new Date(hoursData.date)),
      submittedBy: userId,
      submittedAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    logger.error('Error adding hours data:', error);
    return { success: false, error: error.message };
  }
};

export const getHoursData = async (startDate, endDate) => {
  try {
    // Normalize start date to beginning of day
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    // Normalize end date to end of day
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, 'hoursData'),
      where('date', '>=', Timestamp.fromDate(start)),
      where('date', '<=', Timestamp.fromDate(end)),
      orderBy('date', 'asc')  // Changed from 'desc' to 'asc' for chronological order
    );

    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate()
    }));
    return { success: true, data };
  } catch (error) {
    logger.error('Error getting hours data:', error);
    return { success: false, error: error.message, data: [] };
  }
};

import dayjs from 'dayjs';

const createEmptyHoursBucket = () => ({
  totalHours: 0,
  shift1Hours: 0,
  shift2Hours: 0,
  shift1Direct: 0,
  shift1Indirect: 0,
  shift2Direct: 0,
  shift2Indirect: 0,
  totalDirect: 0,
  totalIndirect: 0,
  count: 0
});

// Helper to merge labor reports dailyBreakdown or totals into an aggregated map
// startDate/endDate are optional clamps to avoid adding dates outside the selected range
export const mergeLaborReportsToAggregated = (aggregated, laborReports = [], groupBy = 'day', startDate = null, endDate = null) => {
  const dayOrder = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

  const startMs = startDate ? new Date(startDate).getTime() : null;
  const endMs = endDate ? new Date(endDate).getTime() : null;

  laborReports.forEach(report => {
    const weekEnding = report.weekEnding ? (report.weekEnding instanceof Date ? report.weekEnding : new Date(report.weekEnding)) : null;

    // Prefer dailyBreakdown if present
    if (report.dailyBreakdown && weekEnding) {
      // Compute week start (align to Monday)
      // If weekEnding is Sunday, we want the Monday 6 days prior.
      // If weekEnding is mid-week, we assume it belongs to the week starting the previous Monday.
      let weekStart = dayjs(weekEnding).day(1); // Monday of the week (Sun-Sat)
      if (weekStart.isAfter(dayjs(weekEnding))) {
        weekStart = weekStart.subtract(1, 'week');
      }

      dayOrder.forEach((dayName, idx) => {
        const date = weekStart.add(idx, 'day').toDate();
        let key;

        const dateMs = date.getTime();
        if ((startMs && dateMs < startMs) || (endMs && dateMs > endMs)) {
          return; // Ignore out-of-range dates to avoid future/previous bleed
        }

        if (groupBy === 'day') {
          key = date.toISOString().split('T')[0];
        } else if (groupBy === 'week') {
          const w = weekStart.toDate();
          key = w.toISOString().split('T')[0];
        } else if (groupBy === 'month') {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }

        // Prefer labor report data over legacy hoursData if it exists to prevent double counting
        aggregated[key] = createEmptyHoursBucket();

        const dayData = report.dailyBreakdown[dayName];
        if (dayData) {
          // Shift totals (existing behaviour)
          aggregated[key].shift1Hours += (dayData.shift1?.total || 0);
          aggregated[key].shift2Hours += (dayData.shift2?.total || 0);
          aggregated[key].totalHours += (dayData.total || 0);

          // Direct / Indirect breakdowns
          const s1d = dayData.shift1?.direct || 0;
          const s1i = dayData.shift1?.indirect || 0;
          const s2d = dayData.shift2?.direct || 0;
          const s2i = dayData.shift2?.indirect || 0;

          aggregated[key].shift1Direct += s1d;
          aggregated[key].shift1Indirect += s1i;
          aggregated[key].shift2Direct += s2d;
          aggregated[key].shift2Indirect += s2i;

          aggregated[key].totalDirect += (dayData.direct || s1d + s2d);
          aggregated[key].totalIndirect += (dayData.indirect || s1i + s2i);

          aggregated[key].count += 1;
        }
      });
    } else if (report.totalHours && weekEnding) {
      // If no daily breakdown, use totalHours; for 'week' groupBy add to week bucket, otherwise distribute evenly to days
      const weekStart = dayjs(weekEnding).subtract(6, 'day'); // Monday

      if (groupBy === 'week') {
        const key = weekStart.toDate().toISOString().split('T')[0];
        aggregated[key] = aggregated[key] ? aggregated[key] : createEmptyHoursBucket();

        aggregated[key].totalHours += report.totalHours || 0;

        // If direct/indirect totals are provided, allocate to bucket
        if (typeof report.directHours === 'number' || typeof report.indirectHours === 'number') {
          aggregated[key].totalDirect += report.directHours || 0;
          aggregated[key].totalIndirect += report.indirectHours || 0;
        }

        aggregated[key].count += 1;
      } else {
        // Distribute evenly across 7 days
        const perDay = (report.totalHours || 0) / 7;
        const directRatio = (report.directHours && report.totalHours) ? (report.directHours / report.totalHours) : null;

        for (let i = 0; i < 7; i++) {
          const date = weekStart.add(i, 'day').toDate();
          const dateMs = date.getTime();
          if ((startMs && dateMs < startMs) || (endMs && dateMs > endMs)) {
            continue; // Skip dates outside the selected range
          }
          let key;

          if (groupBy === 'day') {
            key = date.toISOString().split('T')[0];
          } else if (groupBy === 'month') {
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          }

          aggregated[key] = aggregated[key] ? aggregated[key] : createEmptyHoursBucket();

          aggregated[key].totalHours += perDay;

          // If direct/indirect totals are provided, distribute proportionally
          if (directRatio !== null) {
            const perDayDirect = perDay * directRatio;
            aggregated[key].totalDirect += perDayDirect;
            aggregated[key].totalIndirect += (perDay - perDayDirect);
          }

          aggregated[key].count += 1;
        }
      }
    }
  });

  return aggregated;
};

// Calculate aggregate hours by period
export const fetchHoursData = async (startDate, endDate) => {
  return await getHoursData(startDate, endDate);
};

export const getLaborReports = async (startDate, endDate) => {
  try {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const queryStart = new Date(start);
    queryStart.setDate(queryStart.getDate() - 7);
    const queryEnd = new Date(end);
    queryEnd.setDate(queryEnd.getDate() + 7);

    const q = query(
      collection(db, 'laborReports'),
      where('weekEnding', '>=', Timestamp.fromDate(queryStart)),
      where('weekEnding', '<=', Timestamp.fromDate(queryEnd)),
      orderBy('weekEnding', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      weekEnding: doc.data().weekEnding?.toDate()
    }));
    return { success: true, data };
  } catch (error) {
    logger.error('Error getting labor reports:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const getAggregateHours = async (startDate, endDate, groupBy = 'day') => {
  try {
    const aggregated = {};

    // Fetch legacy hours data (dedupe by date; prefer latest submission per date)
    const hoursResult = await fetchHoursData(startDate, endDate);
    if (hoursResult.success) {
      hoursResult.data.forEach(entry => {
        let key;
        const date = new Date(entry.date);

        if (groupBy === 'day') {
          key = date.toISOString().split('T')[0];
        } else if (groupBy === 'week') {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
        } else if (groupBy === 'month') {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }

        const submittedMs = entry.submittedAt?.toDate ? entry.submittedAt.toDate().getTime() : (entry.submittedAt instanceof Date ? entry.submittedAt.getTime() : 0);
        const candidate = {
          totalHours: entry.totalHours || 0,
          shift1Hours: entry.shift1Hours || 0,
          shift2Hours: entry.shift2Hours || 0,
          shift1Direct: entry.shift1Direct || 0,
          shift1Indirect: entry.shift1Indirect || 0,
          shift2Direct: entry.shift2Direct || 0,
          shift2Indirect: entry.shift2Indirect || 0,
          totalDirect: entry.totalDirect || 0,
          totalIndirect: entry.totalIndirect || 0,
          count: 1,
          __submittedMs: submittedMs
        };

        const existing = aggregated[key];
        if (existing && typeof existing.__submittedMs === 'number' && existing.__submittedMs > submittedMs) {
          return; // keep newer submission
        }

        aggregated[key] = { ...createEmptyHoursBucket(), ...candidate };
      });
    }

    // Fetch labor reports
    const laborResult = await getLaborReports(startDate, endDate);
    if (laborResult.success) {
      mergeLaborReportsToAggregated(aggregated, laborResult.data, groupBy, startDate, endDate);
    }

    // Strip helper metadata
    Object.keys(aggregated).forEach(key => {
      if (aggregated[key].__submittedMs !== undefined) {
        delete aggregated[key].__submittedMs;
      }
    });

    return { success: true, data: aggregated };
  } catch (error) {
    logger.error('Error aggregating hours:', error);
    return { success: false, error: error.message };
  }
};



// ============ RECRUITER DATA ============
export const addRecruiterData = async (recruiterData, userId) => {
  try {
    const docRef = await addDoc(collection(db, 'recruiterData'), {
      ...recruiterData,
      date: Timestamp.fromDate(new Date(recruiterData.date)),
      recruiterUid: userId,
      submittedAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    logger.error('Error adding recruiter data:', error);
    return { success: false, error: error.message };
  }
};

export const getRecruiterData = async (startDate, endDate, recruiterId = null) => {
  try {
    let q = query(
      collection(db, 'recruiterData'),
      where('date', '>=', Timestamp.fromDate(new Date(startDate))),
      where('date', '<=', Timestamp.fromDate(new Date(endDate))),
      orderBy('date', 'desc')
    );

    if (recruiterId) {
      q = query(q, where('recruiterUid', '==', recruiterId));
    }

    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate()
    }));
    return { success: true, data };
  } catch (error) {
    logger.error('Error getting recruiter data:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// ============ EARLY LEAVES ============
export const addEarlyLeave = async (earlyLeaveData, userId) => {
  try {
    const docRef = await addDoc(collection(db, 'earlyLeaves'), {
      ...earlyLeaveData,
      date: Timestamp.fromDate(new Date(earlyLeaveData.date)),
      actionDate: earlyLeaveData.actionDate ? Timestamp.fromDate(new Date(earlyLeaveData.actionDate)) : null,
      submittedBy: userId,
      submittedAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    logger.error('Error adding early leave:', error);
    return { success: false, error: error.message };
  }
};

export const getEarlyLeaves = async (startDate, endDate, associateId = null) => {
  try {
    const constraints = [
      where('date', '>=', Timestamp.fromDate(new Date(startDate))),
      where('date', '<=', Timestamp.fromDate(new Date(endDate))),
      orderBy('date', 'desc')
    ];

    if (associateId) {
      constraints.push(where('associateId', '==', associateId));
    }

    const q = query(collection(db, 'earlyLeaves'), ...constraints);
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate(),
      actionDate: doc.data().actionDate?.toDate()
    }));
    return { success: true, data };
  } catch (error) {
    logger.error('Error getting early leaves:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// Get early leave trends
export const getEarlyLeaveTrends = async (startDate, endDate) => {
  try {
    const result = await getEarlyLeaves(startDate, endDate);
    if (!result.success) return result;

    const trends = {
      total: result.data.length,
      byReason: {},
      byAssociate: {},
      byShift: { '1st': 0, '2nd': 0 },
      avgPerWeek: 0
    };

    result.data.forEach(leave => {
      // By reason
      trends.byReason[leave.reason] = (trends.byReason[leave.reason] || 0) + 1;

      // By associate
      if (!trends.byAssociate[leave.associateId]) {
        trends.byAssociate[leave.associateId] = {
          name: leave.associateName,
          count: 0,
          reasons: []
        };
      }
      trends.byAssociate[leave.associateId].count += 1;
      trends.byAssociate[leave.associateId].reasons.push(leave.reason);

      // By shift
      if (leave.shift) {
        trends.byShift[leave.shift] += 1;
      }
    });

    // Calculate average per week
    const daysDiff = (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24);
    const weeks = daysDiff / 7;
    trends.avgPerWeek = weeks > 0 ? (trends.total / weeks).toFixed(2) : 0;

    return { success: true, data: trends };
  } catch (error) {
    logger.error('Error calculating early leave trends:', error);
    return { success: false, error: error.message };
  }
};

// ============ APPLICANTS ============
export const addApplicant = async (applicantData, userId) => {
  try {
    // Ensure EID is set (use crmNumber as fallback for legacy support)
    const eid = applicantData.eid || applicantData.crmNumber;
    if (!eid) {
      return { success: false, error: 'EID or CRM Number is required' };
    }

    const docRef = await addDoc(collection(db, 'applicants'), {
      ...applicantData,
      eid: eid, // Ensure EID is always set
      appliedDate: applicantData.appliedDate ? Timestamp.fromDate(new Date(applicantData.appliedDate)) : serverTimestamp(),
      interviewDate: applicantData.interviewDate ? Timestamp.fromDate(new Date(applicantData.interviewDate)) : null,
      processedDate: applicantData.processedDate ? Timestamp.fromDate(new Date(applicantData.processedDate)) : null,
      projectedStartDate: applicantData.projectedStartDate ? Timestamp.fromDate(new Date(applicantData.projectedStartDate)) : null,
      actualStartDate: applicantData.actualStartDate ? Timestamp.fromDate(new Date(applicantData.actualStartDate)) : null,
      assignedRecruiter: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    logger.error('Error adding applicant:', error);
    return { success: false, error: error.message };
  }
};

export const updateApplicant = async (applicantId, updates) => {
  try {
    const docRef = doc(db, 'applicants', applicantId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    logger.error('Error updating applicant:', error);
    return { success: false, error: error.message };
  }
};

// Delete a single applicant and associated badge
export const deleteApplicant = async (applicantId) => {
  try {
    const docRef = doc(db, 'applicants', applicantId);

    // Find and delete associated badge(s) if they exist
    try {
      const badgesQuery = query(
        collection(db, 'badges'),
        where('applicantId', '==', applicantId)
      );
      const badgeSnapshot = await getDocs(badgesQuery);
      if (badgeSnapshot.docs.length > 0) {
        const batch = writeBatch(db);
        badgeSnapshot.docs.forEach(badgeDoc => {
          batch.delete(badgeDoc.ref);
        });
        await batch.commit();
        logger.info(`Deleted ${badgeSnapshot.docs.length} badges for applicant:`, applicantId);
      }
    } catch (badgeErr) {
      logger.warn('Could not delete associated badges:', badgeErr);
    }

    // Delete the applicant
    await deleteDoc(docRef);
    logger.info('Applicant deleted:', applicantId);
    return { success: true };
  } catch (error) {
    logger.error('Error deleting applicant:', error);
    return { success: false, error: error.message };
  }
};

// Bulk delete applicants and associated badges
export const bulkDeleteApplicants = async (applicantIds) => {
  try {
    const batch = writeBatch(db);
    let badgesDeletedCount = 0;

    // Delete all associated badges first
    for (const applicantId of applicantIds) {
      try {
        const badgesQuery = query(
          collection(db, 'badges'),
          where('applicantId', '==', applicantId)
        );
        const badgeSnapshot = await getDocs(badgesQuery);
        badgeSnapshot.docs.forEach(badgeDoc => {
          batch.delete(badgeDoc.ref);
          badgesDeletedCount++;
        });
      } catch (badgeErr) {
        logger.warn(`Could not delete badges for applicant ${applicantId}:`, badgeErr);
      }
    }

    // Delete all applicants
    applicantIds.forEach(id => {
      const docRef = doc(db, 'applicants', id);
      batch.delete(docRef);
    });

    await batch.commit();
    logger.info(`Bulk deleted ${applicantIds.length} applicants and ${badgesDeletedCount} associated badges`);
    return { success: true, deletedCount: applicantIds.length, badgesDeleted: badgesDeletedCount };
  } catch (error) {
    logger.error('Error bulk deleting applicants:', error);
    return { success: false, error: error.message };
  }
};

export const getApplicants = async (status = null) => {
  try {
    const constraints = [];

    if (status) {
      constraints.push(where('status', '==', status));
    }

    // Note: Removed orderBy to support both appliedDate and processDate fields
    // Client-side sorting can be applied if needed

    const q = query(collection(db, 'applicants'), ...constraints);
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      appliedDate: doc.data().appliedDate?.toDate(),
      processDate: doc.data().processDate?.toDate(),
      interviewDate: doc.data().interviewDate?.toDate(),
      processedDate: doc.data().processedDate?.toDate(),
      projectedStartDate: doc.data().projectedStartDate?.toDate(),
      tentativeStartDate: doc.data().tentativeStartDate?.toDate(),
      actualStartDate: doc.data().actualStartDate?.toDate()
    }));
    return { success: true, data };
  } catch (error) {
    logger.error('Error getting applicants:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// Paginated applicants fetch to avoid loading all documents at once
export const getApplicantsPaginated = async ({
  pageSize = 200,
  sortField = 'processDate',
  sortDirection = 'desc',
  cursor = null,
  status = null
} = {}) => {
  try {
    const constraints = [];

    if (status) {
      constraints.push(where('status', '==', status));
    }

    // Order by requested field; processDate may be null for some docs but Firestore supports ordering on missing fields
    constraints.push(orderBy(sortField, sortDirection));
    constraints.push(limit(pageSize));

    let q = query(collection(db, 'applicants'), ...constraints);
    if (cursor) {
      q = query(q, startAfter(cursor));
    }

    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      appliedDate: doc.data().appliedDate?.toDate(),
      processDate: doc.data().processDate?.toDate(),
      interviewDate: doc.data().interviewDate?.toDate(),
      processedDate: doc.data().processedDate?.toDate(),
      projectedStartDate: doc.data().projectedStartDate?.toDate(),
      tentativeStartDate: doc.data().tentativeStartDate?.toDate(),
      actualStartDate: doc.data().actualStartDate?.toDate()
    }));

    const lastDoc = querySnapshot.docs.length > 0
      ? querySnapshot.docs[querySnapshot.docs.length - 1]
      : null;

    return { success: true, data, cursor: lastDoc };
  } catch (error) {
    logger.error('Error getting paginated applicants:', error);
    return { success: false, error: error.message, data: [], cursor: null };
  }
};

// Upload applicant photo to Storage
export const uploadApplicantPhoto = async (applicantId, eid, photoFile) => {
  try {
    if (!photoFile) {
      return { success: false, error: 'No photo file provided' };
    }

    const storageRef = ref(storage, `applicants/${eid}/photo.jpg`);
    await uploadBytes(storageRef, photoFile);
    const photoURL = await getDownloadURL(storageRef);

    return { success: true, photoURL };
  } catch (error) {
    logger.error('Error uploading applicant photo:', error);
    return { success: false, error: error.message };
  }
};

// Get applicant pipeline metrics
export const getApplicantPipeline = async () => {
  try {
    // Use count aggregations instead of fetching all applicants
    const pipeline = {
      total: 0,
      byStatus: {
        'Applied': 0,
        'Interviewed': 0,
        'Processed': 0,
        'Hired': 0,
        'Started': 0,
        'Rejected': 0,
        'CB Updated': 0,
        'BG Pending': 0,
        'Adjudication Pending': 0,
        'I-9 Pending': 0,
        'Declined': 0,
        'No Contact': 0
      },
      projectedStarts: [],
      conversionRate: 0
    };

    // Total count
    const totalSnap = await getCountFromServer(collection(db, 'applicants'));
    pipeline.total = totalSnap.data().count || 0;

    // Counts by status (parallelize for speed)
    const statuses = Object.keys(pipeline.byStatus);
    const countPromises = statuses.map(s => getCountFromServer(query(collection(db, 'applicants'), where('status', '==', s))));
    const snaps = await Promise.all(countPromises);
    snaps.forEach((snap, idx) => {
      pipeline.byStatus[statuses[idx]] = snap.data().count || 0;
    });

    // Conversion rate (Started / total)
    const started = pipeline.byStatus['Started'] || 0;
    pipeline.conversionRate = pipeline.total > 0 ? ((started / pipeline.total) * 100).toFixed(1) : 0;

    return { success: true, data: pipeline };
  } catch (error) {
    logger.error('Error calculating applicant pipeline:', error);
    return { success: false, error: error.message };
  }
};

// Compute the 'Current Pool' from a list of applicants
export const computeCurrentPool = (applicants = [], days = 14, referenceDate = new Date()) => {
  const twoWeeksAgo = dayjs(referenceDate).subtract(days, 'day').toDate();
  const excluded = new Set(['Started', 'Hired', 'Declined', 'Rejected']);

  return applicants.reduce((sum, a) => {
    const processed = a.processedDate;
    if (processed && !excluded.has(a.status) && processed >= twoWeeksAgo) return sum + 1;
    return sum;
  }, 0);
};

// Bulk upload applicants
export const bulkUploadApplicants = async (applicants, userId, replaceAll = false) => {
  try {
    const batchSize = 500; // Firestore batch write limit
    const batches = [];
    let currentBatch = writeBatch(db);
    let operationCount = 0;

    // If replace all, delete existing applicants first
    if (replaceAll) {
      const existingApplicants = await getDocs(collection(db, 'applicants'));
      existingApplicants.docs.forEach(doc => {
        currentBatch.delete(doc.ref);
        operationCount++;

        if (operationCount === batchSize) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          operationCount = 0;
        }
      });
    }

    // Add new applicants
    applicants.forEach((applicant) => {
      // Ensure EID is set (use crmNumber as fallback for legacy support)
      const eid = applicant.eid || applicant.crmNumber;
      if (!eid) {
        logger.warn('Skipping applicant without EID:', applicant.name);
        return;
      }

      const docRef = doc(collection(db, 'applicants'));
      currentBatch.set(docRef, {
        ...applicant,
        eid: eid, // Ensure EID is always set as primary identifier
        uploadedAt: serverTimestamp(),
        uploadedBy: userId,
        lastModified: serverTimestamp(),
        lastModifiedBy: userId
      });
      operationCount++;

      if (operationCount === batchSize) {
        batches.push(currentBatch);
        currentBatch = writeBatch(db);
        operationCount = 0;
      }
    });

    // Add the last batch if it has operations
    if (operationCount > 0) {
      batches.push(currentBatch);
    }

    // Commit all batches
    await Promise.all(batches.map(batch => batch.commit()));

    // Log upload to history
    await addDoc(collection(db, 'uploadHistory'), {
      type: 'applicants',
      recordCount: applicants.length,
      operation: replaceAll ? 'replace' : 'append',
      uploadedAt: serverTimestamp(),
      uploadedBy: userId
    });

    return { success: true, count: applicants.length };
  } catch (error) {
    logger.error('Error bulk uploading applicants:', error);
    return { success: false, error: error.message };
  }
};

// Check for duplicate EIDs across all collections (unified identifier check)
export const checkDuplicateApplicants = async (eids) => {
  try {
    const duplicates = [];

    // Query in chunks of 10 (Firestore 'in' query limit)
    for (let i = 0; i < eids.length; i += 10) {
      const chunk = eids.slice(i, i + 10);
      
      // Check applicants collection (check both eid and legacy crmNumber)
      const applicantsQuery = query(
        collection(db, 'applicants'),
        where('eid', 'in', chunk)
      );
      const applicantsSnapshot = await getDocs(applicantsQuery);
      applicantsSnapshot.docs.forEach(doc => {
        duplicates.push({
          eid: doc.data().eid,
          crmNumber: doc.data().crmNumber,
          name: doc.data().name,
          status: doc.data().status,
          collection: 'applicants'
        });
      });

      // Also check legacy crmNumber field in applicants
      const legacyQuery = query(
        collection(db, 'applicants'),
        where('crmNumber', 'in', chunk)
      );
      const legacySnapshot = await getDocs(legacyQuery);
      legacySnapshot.docs.forEach(doc => {
        // Only add if not already found by eid
        const alreadyFound = duplicates.some(d => d.eid === doc.data().eid || d.crmNumber === doc.data().crmNumber);
        if (!alreadyFound) {
          duplicates.push({
            eid: doc.data().eid,
            crmNumber: doc.data().crmNumber,
            name: doc.data().name,
            status: doc.data().status,
            collection: 'applicants (legacy)'
          });
        }
      });

      // Check associates collection
      const associatesQuery = query(
        collection(db, 'associates'),
        where('eid', 'in', chunk)
      );
      const associatesSnapshot = await getDocs(associatesQuery);
      associatesSnapshot.docs.forEach(doc => {
        duplicates.push({
          eid: doc.data().eid,
          name: doc.data().name,
          status: doc.data().status,
          collection: 'associates'
        });
      });

      // Check badges collection
      const badgesQuery = query(
        collection(db, 'badges'),
        where('eid', 'in', chunk)
      );
      const badgesSnapshot = await getDocs(badgesQuery);
      badgesSnapshot.docs.forEach(doc => {
        duplicates.push({
          eid: doc.data().eid,
          name: doc.data().name,
          status: doc.data().status,
          collection: 'badges'
        });
      });
    }

    return { success: true, duplicates };
  } catch (error) {
    logger.error('Error checking duplicates:', error);
    return { success: false, error: error.message, duplicates: [] };
  }
};

// ============ ASSOCIATES ============
export const addAssociate = async (associateData) => {
  try {
    const docRef = await addDoc(collection(db, 'associates'), {
      ...associateData,
      startDate: Timestamp.fromDate(new Date(associateData.startDate)),
      status: 'Active',
      totalHoursYTD: 0,
      earlyLeavesCount: 0,
      lastUpdated: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    logger.error('Error adding associate:', error);
    return { success: false, error: error.message };
  }
};

export const getAssociates = async (status = 'Active') => {
  try {
    let q = query(
      collection(db, 'associates'),
      where('status', '==', status),
      orderBy('name', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startDate: doc.data().startDate?.toDate()
    }));
    return { success: true, data };
  } catch (error) {
    logger.error('Error getting associates:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// ============ USER MANAGEMENT ============
export const createUserProfile = async (uid, email, displayName, role = 'On-Site Manager') => {
  try {
    // Use setDoc with the UID as the document ID for easier lookups
    await setDoc(doc(db, 'users', uid), {
      email,
      displayName,
      role,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    logger.error('Error creating user profile:', error);
    return { success: false, error: error.message };
  }
};

export const getUserProfile = async (uid) => {
  try {
    logger.debug('getUserProfile called with UID:', uid);

    // First try to get document by UID as document ID
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      logger.debug('Found user by direct UID lookup:', docSnap.data());
      return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
    }

    logger.debug('User not found by direct UID, trying query...');

    // Fall back to querying by uid field (for older user documents)
    const q = query(collection(db, 'users'), where('uid', '==', uid), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      logger.debug('User not found by query either');
      return { success: false, error: 'User not found' };
    }

    const userData = querySnapshot.docs[0].data();
    logger.debug('Found user by query:', userData);
    return { success: true, data: { id: querySnapshot.docs[0].id, ...userData } };
  } catch (error) {
    logger.error('Error getting user profile:', error);
    return { success: false, error: error.message };
  }
};

export const updateUserLastLogin = async (uid) => {
  try {
    // First try to update document by UID as document ID
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      await updateDoc(docRef, {
        lastLogin: serverTimestamp()
      });
      return { success: true };
    }

    // Fall back to querying by uid field (for older user documents)
    const q = query(collection(db, 'users'), where('uid', '==', uid), limit(1));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const oldDocRef = doc(db, 'users', querySnapshot.docs[0].id);
      await updateDoc(oldDocRef, {
        lastLogin: serverTimestamp()
      });
    }
    return { success: true };
  } catch (error) {
    logger.error('Error updating last login:', error);
    return { success: false, error: error.message };
  }
};

// Upload or update user profile photo
export const updateUserPhoto = async (uid, photoFile) => {
  try {
    logger.debug('Updating user photo for UID:', uid);

    // Get current user profile to check for existing photo
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { success: false, error: 'User profile not found' };
    }

    const userData = docSnap.data();

    // Delete old photo if it exists
    if (userData.photoURL) {
      try {
        // Extract the file path from the URL
        const oldPhotoPath = `user-photos/${uid}`;
        const oldPhotoRef = ref(storage, oldPhotoPath);
        await deleteObject(oldPhotoRef);
        logger.debug('Deleted old profile photo');
      } catch (deleteError) {
        // Continue even if delete fails (photo might not exist)
        logger.warn('Could not delete old photo:', deleteError);
      }
    }

    // Upload new photo
    const storageRef = ref(storage, `user-photos/${uid}`);
    try {
      await withTimeout(uploadBytes(storageRef, photoFile), 15000);
    } catch (err) {
      logger.error('Error uploading photo in firestoreService:', err);
      return { success: false, error: err.message || 'Photo upload failed' };
    }
    const photoURL = await getDownloadURL(storageRef);

    // Update user document with new photo URL
    await updateDoc(docRef, {
      photoURL,
      updatedAt: serverTimestamp()
    });

    logger.debug('Profile photo updated successfully');
    return { success: true, photoURL };
  } catch (error) {
    logger.error('Error updating user photo:', error);
    return { success: false, error: error.message };
  }
};

// Delete user profile photo
export const deleteUserPhoto = async (uid) => {
  try {
    logger.debug('Deleting user photo for UID:', uid);

    // Get current user profile
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { success: false, error: 'User profile not found' };
    }

    const userData = docSnap.data();

    // Delete photo from storage if it exists
    if (userData.photoURL) {
      try {
        const photoPath = `user-photos/${uid}`;
        const photoRef = ref(storage, photoPath);
        await deleteObject(photoRef);
        logger.debug('Deleted profile photo from storage');
      } catch (deleteError) {
        logger.warn('Could not delete photo from storage:', deleteError);
      }
    }

    // Remove photoURL from user document
    await updateDoc(docRef, {
      photoURL: null,
      updatedAt: serverTimestamp()
    });

    logger.debug('Profile photo deleted successfully');
    return { success: true };
  } catch (error) {
    logger.error('Error deleting user photo:', error);
    return { success: false, error: error.message };
  }
};

// Delete user profile (admin function)
export const deleteUserProfile = async (uid, deletedBy) => {
  try {
    logger.debug('Deleting user profile for UID:', uid);

    // Get user profile before deletion for logging
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { success: false, error: 'User profile not found' };
    }

    const userData = docSnap.data();

    // Delete profile photo from storage if it exists
    if (userData.photoURL) {
      try {
        const photoPath = `user-photos/${uid}`;
        const photoRef = ref(storage, photoPath);
        await deleteObject(photoRef);
        logger.debug('Deleted profile photo from storage');
      } catch (deleteError) {
        logger.warn('Could not delete photo from storage:', deleteError);
      }
    }

    // Log the deletion action
    await logAuditAction({
      action: 'delete_user',
      performedBy: deletedBy,
      targetUser: uid,
      details: `Deleted user profile: ${userData.displayName} (${userData.email})`,
      timestamp: serverTimestamp()
    });

    // Delete user document
    await deleteDoc(docRef);

    logger.debug('User profile deleted successfully');
    return { success: true };
  } catch (error) {
    logger.error('Error deleting user profile:', error);
    return { success: false, error: error.message };
  }
};

// ============ ON-PREMISE DATA ============
export const getOnPremiseData = async (startDate, endDate) => {
  try {
    // Normalize start date to beginning of day
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    // Normalize end date to end of day
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, 'onPremiseData'),
      where('date', '>=', Timestamp.fromDate(start)),
      where('date', '<=', Timestamp.fromDate(end)),
      orderBy('date', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate()
    }));
    return { success: true, data };
  } catch (error) {
    logger.error('Error getting on-premise data:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Aggregate on-premise entries by date and shift. Merges multiple submissions for the same date+shift.
 * Returns an array of aggregated entries sorted by date ascending.
 */
export const aggregateOnPremiseByDateAndShift = (entries = []) => {
  const map = new Map();

  entries.forEach(e => {
    const dateKey = e.date ? (e.date instanceof Date ? e.date.toISOString().split('T')[0] : new Date(e.date).toISOString().split('T')[0]) : null;
    const shiftKey = e.shift || 'Unknown';
    if (!dateKey) return;

    const mapKey = `${dateKey}::${shiftKey}`;
    const submittedMs = e.submittedAt?.toDate ? e.submittedAt.toDate().getTime() : (e.submittedAt instanceof Date ? e.submittedAt.getTime() : null);

    const candidate = {
      date: new Date(dateKey),
      shift: shiftKey,
      requested: parseInt(e.requested) || 0,
      required: parseInt(e.required) || 0,
      working: parseInt(e.working) || 0,
      newStarts: parseInt(e.newStarts) || 0,
      sendHomes: parseInt(e.sendHomes) || 0,
      lineCuts: parseInt(e.lineCuts) || 0,
      onPremise: e.onPremise !== undefined && e.onPremise !== null
        ? parseFloat(e.onPremise)
        : (parseFloat(e.working) || 0),
      submittedMs: submittedMs || 0,
      entries: [e.id]
    };

    // Prefer the latest submission for a given date/shift to avoid double counting duplicates
    if (map.has(mapKey)) {
      const existing = map.get(mapKey);
      if ((candidate.submittedMs || 0) >= (existing.submittedMs || 0)) {
        map.set(mapKey, candidate);
      }
    } else {
      map.set(mapKey, candidate);
    }
  });

  return Array.from(map.values())
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(({ submittedMs, ...rest }) => rest); // Strip helper field
};

// Consolidated New Starts Summary
// TODO: Add unit tests for getNewStartsSummary covering edge cases: no applicants, duplicate shift EIDs, and on-premise fallbacks.
export const computeNewStartsSummary = (shiftResult, onPremResult, applicantsCount) => {
  // Compute shift-based new starts and collect EIDs when available
  let shiftCount = 0;
  const shiftEids = new Set();
  const perShift = {}; // e.g., { '1st': { shiftCount: X, uniqueCount: Y, sampleEids: [] }, '2nd': {...} }

  if (shiftResult && shiftResult.success) {
    shiftResult.data.forEach(s => {
      const ns = s.newStarts;
      const shiftKey = s.shift || 'Unknown';
      if (!perShift[shiftKey]) perShift[shiftKey] = { shiftCount: 0, eids: new Set() };

      if (Array.isArray(ns)) {
        shiftCount += ns.length;
        perShift[shiftKey].shiftCount += ns.length;
        ns.forEach(item => {
          if (item && item.eid) {
            shiftEids.add(item.eid);
            perShift[shiftKey].eids.add(item.eid);
          }
        });
      } else if (typeof ns === 'number') {
        shiftCount += ns;
        perShift[shiftKey].shiftCount += ns;
      }
    });
  }

  // Convert perShift eids sets to counts and samples
  const perShiftSummary = {};
  Object.keys(perShift).forEach(k => {
    const eidsSet = perShift[k].eids || new Set();
    perShiftSummary[k] = {
      shiftCount: perShift[k].shiftCount,
      uniqueCount: eidsSet.size,
      sampleEids: Array.from(eidsSet).slice(0, 100)
    };
  });

  const shiftUniqueCount = shiftEids.size;

  // Sum numeric newStarts from on-premise data
  let onPremCount = 0;
  if (onPremResult && onPremResult.success) {
    onPremCount = onPremResult.data.reduce((sum, d) => sum + (parseInt(d.newStarts) || 0), 0);
  }

  // Choose authoritative source: applicants (detailed start records) > shift EIDs > on-premise counts
  let chosenBy = 'onPremise';
  let chosenCount = onPremCount;
  if (applicantsCount > 0) {
    chosenBy = 'applicants';
    chosenCount = applicantsCount;
  } else if (shiftUniqueCount > 0) {
    chosenBy = 'shifts';
    chosenCount = shiftUniqueCount;
  }

  return {
    applicantsCount,
    shiftCount,
    shiftUniqueCount,
    onPremCount,
    chosenCount,
    chosenBy,
    sampleShiftEids: Array.from(shiftEids).slice(0, 100),
    perShift: perShiftSummary
  };
};

export const getNewStartsSummary = async (startDate, endDate) => {
  try {
    // Normalize dates
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Fetch shifts and on-premise in parallel
    const [shiftResult, onPremResult] = await Promise.all([
      getShiftData(start, end),
      getOnPremiseData(start, end)
    ]);

    // Applicants with actualStartDate in range
    const applicantsQuery = query(
      collection(db, 'applicants'),
      where('actualStartDate', '>=', Timestamp.fromDate(start)),
      where('actualStartDate', '<=', Timestamp.fromDate(end))
    );
    const applicantsSnapshot = await getDocs(applicantsQuery);
    const applicantsCount = applicantsSnapshot.size;

    const summary = computeNewStartsSummary(shiftResult, onPremResult, applicantsCount);

    return { success: true, data: summary };
  } catch (error) {
    logger.error('Error getting new starts summary:', error);
    return { success: false, error: error.message };
  }
};

// ============ BRANCH DAILY DATA ============
export const getBranchDailyData = async (startDate, endDate) => {
  try {
    // Normalize start date to beginning of day
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    // Normalize end date to end of day
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, 'branchDaily'),
      where('date', '>=', Timestamp.fromDate(start)),
      where('date', '<=', Timestamp.fromDate(end)),
      orderBy('date', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate()
    }));
    return { success: true, data };
  } catch (error) {
    logger.error('Error getting branch daily data:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// ============ FLEXIBLE BULK UPLOAD ============
/**
 * Flexible bulk upload function for any collection
 * Handles column mapping and data transformation
 *
 * @param {string} collectionName - Firestore collection name
 * @param {Array} mappedData - Array of objects with transformed data (already mapped)
 * @param {string} userId - User ID performing the upload
 * @returns {Promise<{success: boolean, count?: number, error?: string}>}
 */
export const flexibleBulkUpload = async (collectionName, mappedData, userId) => {
  try {
    if (!mappedData || mappedData.length === 0) {
      return { success: false, error: 'No data to upload' };
    }

    const batchSize = 500; // Firestore batch write limit
    const batches = [];
    let currentBatch = writeBatch(db);
    let operationCount = 0;
    let totalCount = 0;

    logger.info(`Starting flexible bulk upload of ${mappedData.length} records to ${collectionName}`);

    mappedData.forEach((record) => {
      const docRef = doc(collection(db, collectionName));

      // Prepare the record with metadata
      const recordToSave = {
        ...record,
        submittedBy: userId,
        submittedAt: serverTimestamp()
      };

      // Convert date fields to Firestore Timestamps
      Object.keys(recordToSave).forEach(key => {
        if (recordToSave[key] instanceof Date) {
          recordToSave[key] = Timestamp.fromDate(recordToSave[key]);
        }
      });

      currentBatch.set(docRef, recordToSave);
      operationCount++;
      totalCount++;

      // Create a new batch when we hit the limit
      if (operationCount === batchSize) {
        batches.push(currentBatch);
        currentBatch = writeBatch(db);
        operationCount = 0;
      }
    });

    // Push the last batch if it has operations
    if (operationCount > 0) {
      batches.push(currentBatch);
    }

    // Commit all batches
    logger.info(`Committing ${batches.length} batches...`);
    for (let i = 0; i < batches.length; i++) {
      await batches[i].commit();
      logger.info(`Batch ${i + 1}/${batches.length} committed`);
    }

    // Log upload history
    try {
      await addDoc(collection(db, 'uploadHistory'), {
        collection: collectionName,
        recordCount: totalCount,
        uploadedBy: userId,
        uploadedAt: serverTimestamp(),
        method: 'flexibleUpload'
      });
    } catch (historyError) {
      logger.warn('Failed to log upload history:', historyError);
    }

    logger.info(`Flexible bulk upload complete: ${totalCount} records added to ${collectionName}`);
    return { success: true, count: totalCount };
  } catch (error) {
    logger.error('Error in flexible bulk upload:', error);
    return { success: false, error: error.message };
  }
};
