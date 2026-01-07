/**
 * Firestore Service - Version 3.0
 * Cleaned to support only V3 schema collections:
 * - users
 * - onPremiseData
 * - hoursData
 * - branchMetrics
 * - earlyLeaves
 * - associates
 * - badges
 * 
 * Legacy collections removed: shiftData, applicants, recruiterData, laborReports, branchDaily, branchWeekly
 */

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
  getCountFromServer,
  Timestamp,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import logger from '../utils/logger';
import { logAuditAction } from './adminService';

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
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, 'hoursData'),
      where('date', '>=', Timestamp.fromDate(start)),
      where('date', '<=', Timestamp.fromDate(end)),
      orderBy('date', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map((doc) => ({
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

/**
 * Aggregate hours data by date or week or month
 * V3: hoursData has nested shift1/shift2 objects with direct/indirect/total
 */
export const getAggregateHours = async (startDate, endDate, groupBy = 'day') => {
  try {
    const hoursResult = await getHoursData(startDate, endDate);
    if (!hoursResult.success) {
      return { success: false, error: hoursResult.error, data: {} };
    }

    const aggregated = {};
    hoursResult.data.forEach((entry) => {
      const date = new Date(entry.date);
      let key;

      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else if (groupBy === 'month') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else {
        key = date.toISOString().split('T')[0];
      }

      if (!aggregated[key]) {
        aggregated[key] = {
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
        };
      }

      const shift1 = entry.shift1 || {};
      const shift2 = entry.shift2 || {};

      aggregated[key].shift1Direct += shift1.direct || 0;
      aggregated[key].shift1Indirect += shift1.indirect || 0;
      aggregated[key].shift2Direct += shift2.direct || 0;
      aggregated[key].shift2Indirect += shift2.indirect || 0;
      aggregated[key].shift1Hours += shift1.total || 0;
      aggregated[key].shift2Hours += shift2.total || 0;
      aggregated[key].totalDirect += (shift1.direct || 0) + (shift2.direct || 0);
      aggregated[key].totalIndirect += (shift1.indirect || 0) + (shift2.indirect || 0);
      aggregated[key].totalHours += (entry.totalHours || 0);
      aggregated[key].count += 1;
    });

    return { success: true, data: aggregated };
  } catch (error) {
    logger.error('Error aggregating hours:', error);
    return { success: false, error: error.message, data: {} };
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
    const data = querySnapshot.docs.map((doc) => ({
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

export const getEarlyLeaveTrends = async (startDate, endDate) => {
  try {
    const result = await getEarlyLeaves(startDate, endDate);
    if (!result.success) {
      return { success: false, error: result.error, data: {} };
    }

    const trends = {};
    result.data.forEach((leave) => {
      const reason = leave.reason || 'Unknown';
      trends[reason] = (trends[reason] || 0) + 1;
    });

    return { success: true, data: trends };
  } catch (error) {
    logger.error('Error getting early leave trends:', error);
    return { success: false, error: error.message, data: {} };
  }
};

// ============ ASSOCIATES ============
export const addAssociate = async (associateData) => {
  try {
    const docRef = await addDoc(collection(db, 'associates'), {
      ...associateData,
      startDate: Timestamp.fromDate(new Date(associateData.startDate)),
      status: associateData.status || 'Active',
      pipelineStatus: associateData.pipelineStatus || null,
      lastUpdated: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    logger.error('Error adding associate:', error);
    return { success: false, error: error.message };
  }
};

export const updateAssociate = async (associateId, updates) => {
  try {
    const docRef = doc(db, 'associates', associateId);
    await updateDoc(docRef, {
      ...updates,
      lastUpdated: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    logger.error('Error updating associate:', error);
    return { success: false, error: error.message };
  }
};

export const getAssociates = async (status = null, pipelineStatus = null) => {
  try {
    let constraints = [orderBy('name', 'asc')];

    if (status) {
      constraints.unshift(where('status', '==', status));
    }
    if (pipelineStatus) {
      constraints.unshift(where('pipelineStatus', '==', pipelineStatus));
    }

    const q = query(collection(db, 'associates'), ...constraints);
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map((doc) => ({
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

export const getAssociateByEID = async (eid) => {
  try {
    const q = query(collection(db, 'associates'), where('eid', '==', eid), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { success: false, error: 'Associate not found' };
    }

    const docSnap = querySnapshot.docs[0];
    return {
      success: true,
      data: {
        id: docSnap.id,
        ...docSnap.data(),
        startDate: docSnap.data().startDate?.toDate()
      }
    };
  } catch (error) {
    logger.error('Error getting associate by EID:', error);
    return { success: false, error: error.message };
  }
};

// ============ BADGES ============
export const addBadge = async (badgeData) => {
  try {
    const docRef = await addDoc(collection(db, 'badges'), {
      ...badgeData,
      createdAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    logger.error('Error adding badge:', error);
    return { success: false, error: error.message };
  }
};

export const updateBadge = async (badgeId, updates) => {
  try {
    const docRef = doc(db, 'badges', badgeId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    logger.error('Error updating badge:', error);
    return { success: false, error: error.message };
  }
};

export const getBadges = async (status = null) => {
  try {
    let q = query(collection(db, 'badges'), orderBy('name', 'asc'));

    if (status) {
      q = query(collection(db, 'badges'), where('status', '==', status), orderBy('name', 'asc'));
    }

    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));
    return { success: true, data };
  } catch (error) {
    logger.error('Error getting badges:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const getBadgeByEID = async (eid) => {
  try {
    const q = query(collection(db, 'badges'), where('eid', '==', eid), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { success: false, error: 'Badge not found' };
    }

    const docSnap = querySnapshot.docs[0];
    return {
      success: true,
      data: { id: docSnap.id, ...docSnap.data() }
    };
  } catch (error) {
    logger.error('Error getting badge by EID:', error);
    return { success: false, error: error.message };
  }
};

// ============ USER MANAGEMENT ============
export const createUserProfile = async (uid, email, displayName, role = 'On-Site Manager') => {
  try {
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

    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      logger.debug('Found user by direct UID lookup:', docSnap.data());
      return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
    }

    logger.debug('User not found by direct UID, trying query...');
    const q = query(collection(db, 'users'), where('uid', '==', uid), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      logger.debug('User not found by query either');
      return { success: false, error: 'User profile not found' };
    }

    const userDoc = querySnapshot.docs[0];
    logger.debug('Found user by query:', userDoc.data());
    return {
      success: true,
      data: {
        id: userDoc.id,
        ...userDoc.data()
      }
    };
  } catch (error) {
    logger.error('Error getting user profile:', error);
    return { success: false, error: error.message };
  }
};

export const updateUserProfile = async (uid, updates) => {
  try {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, {
      ...updates,
      lastUpdated: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    logger.error('Error updating user profile:', error);
    return { success: false, error: error.message };
  }
};

export const updateUserLastLogin = async (uid) => {
  try {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, {
      lastLogin: serverTimestamp()
    });
    logger.debug('User last login updated');
    return { success: true };
  } catch (error) {
    if (error.code === 'not-found') {
      logger.warn('User profile not found during last login update, will be created on next profile access');
      return { success: true };
    }
    logger.error('Error updating user last login:', error);
    return { success: false, error: error.message };
  }
};

export const updateUserPhoto = async (uid, photoFile) => {
  try {
    const storageRef = ref(storage, `user-photos/${uid}`);
    await uploadBytes(storageRef, photoFile);
    const photoURL = await getDownloadURL(storageRef);

    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, {
      photoURL,
      lastUpdated: serverTimestamp()
    });

    await logAuditAction('user_profile_update', uid, uid, `Updated profile photo`);

    return { success: true, photoURL };
  } catch (error) {
    logger.error('Error updating user photo:', error);
    return { success: false, error: error.message };
  }
};

export const deleteUserPhoto = async (uid) => {
  try {
    const storageRef = ref(storage, `user-photos/${uid}`);
    try {
      await deleteObject(storageRef);
    } catch (storageError) {
      if (storageError.code !== 'storage/object-not-found') {
        throw storageError;
      }
    }

    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, {
      photoURL: null,
      lastUpdated: serverTimestamp()
    });

    await logAuditAction('user_profile_update', uid, uid, `Deleted profile photo`);

    return { success: true };
  } catch (error) {
    logger.error('Error deleting user photo:', error);
    return { success: false, error: error.message };
  }
};

export const deleteUserProfile = async (uid, deletedBy) => {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { success: false, error: 'User profile not found' };
    }

    const userData = docSnap.data();

    if (userData.photoURL) {
      try {
        const storageRef = ref(storage, `user-photos/${uid}`);
        await deleteObject(storageRef);
      } catch (storageError) {
        logger.warn('Failed to delete user photo from storage:', storageError);
      }
    }

    await logAuditAction('user_profile_delete', deletedBy, uid, `Deleted user profile: ${userData.displayName} (${userData.email})`);

    await deleteDoc(docRef);

    logger.debug('User profile deleted successfully');
    return { success: true };
  } catch (error) {
    logger.error('Error deleting user profile:', error);
    return { success: false, error: error.message };
  }
};

// ============ ON-PREMISE DATA ============
export const addOnPremiseData = async (onPremiseData, userId) => {
  try {
    const docRef = await addDoc(collection(db, 'onPremiseData'), {
      ...onPremiseData,
      date: Timestamp.fromDate(new Date(onPremiseData.date)),
      submittedBy: userId,
      submittedAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    logger.error('Error adding on-premise data:', error);
    return { success: false, error: error.message };
  }
};

export const getOnPremiseData = async (startDate, endDate) => {
  try {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, 'onPremiseData'),
      where('date', '>=', Timestamp.fromDate(start)),
      where('date', '<=', Timestamp.fromDate(end)),
      orderBy('date', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map((doc) => ({
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

export const aggregateOnPremiseByDateAndShift = (entries = []) => {
  const map = new Map();

  entries.forEach((e) => {
    const dateKey = e.date ? (e.date instanceof Date ? e.date.toISOString().split('T')[0] : new Date(e.date).toISOString().split('T')[0]) : null;
    if (!dateKey) return;

    const shift = e.shift || 'Unknown';
    const key = `${dateKey}_${shift}`;

    if (!map.has(key)) {
      map.set(key, {
        date: dateKey,
        shift,
        numberRequested: 0,
        numberRequired: 0,
        numberWorking: 0,
        newStarts: [],
        sendHomes: 0,
        lineCuts: 0,
        count: 0
      });
    }

    const agg = map.get(key);
    agg.numberRequested += e.numberRequested || e.requested || 0;
    agg.numberRequired += e.numberRequired || e.required || 0;
    agg.numberWorking += e.numberWorking || e.working || 0;
    agg.sendHomes += e.sendHomes || 0;
    agg.lineCuts += e.lineCuts || 0;
    agg.count += 1;

    if (e.newStarts && Array.isArray(e.newStarts)) {
      agg.newStarts.push(...e.newStarts);
    }
  });

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
};

// ============ BRANCH METRICS ============
export const addBranchMetrics = async (metricsData, userId) => {
  try {
    const docRef = await addDoc(collection(db, 'branchMetrics'), {
      ...metricsData,
      date: Timestamp.fromDate(new Date(metricsData.date)),
      submittedBy: userId,
      submittedAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    logger.error('Error adding branch metrics:', error);
    return { success: false, error: error.message };
  }
};

export const getBranchMetrics = async (startDate, endDate, recruiter = null) => {
  try {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    let constraints = [
      where('date', '>=', Timestamp.fromDate(start)),
      where('date', '<=', Timestamp.fromDate(end)),
      orderBy('date', 'desc')
    ];

    if (recruiter) {
      constraints.push(where('recruiter', '==', recruiter));
    }

    const q = query(collection(db, 'branchMetrics'), ...constraints);
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate()
    }));
    return { success: true, data };
  } catch (error) {
    logger.error('Error getting branch metrics:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// ============ FLEXIBLE BULK UPLOAD ============
export const flexibleBulkUpload = async (collectionName, mappedData, userId) => {
  try {
    if (!mappedData || mappedData.length === 0) {
      return { success: false, error: 'No data to upload' };
    }

    const batchSize = 500;
    const batches = [];
    let currentBatch = writeBatch(db);
    let operationCount = 0;
    let totalCount = 0;

    logger.info(`Starting bulk upload of ${mappedData.length} records to ${collectionName}`);

    mappedData.forEach((record) => {
      const docRef = doc(collection(db, collectionName));

      const recordToSave = {
        ...record,
        submittedBy: userId,
        submittedAt: serverTimestamp()
      };

      Object.keys(recordToSave).forEach((key) => {
        if (recordToSave[key] instanceof Date) {
          recordToSave[key] = Timestamp.fromDate(recordToSave[key]);
        }
      });

      currentBatch.set(docRef, recordToSave);
      operationCount++;
      totalCount++;

      if (operationCount === batchSize) {
        batches.push(currentBatch);
        currentBatch = writeBatch(db);
        operationCount = 0;
      }
    });

    if (operationCount > 0) {
      batches.push(currentBatch);
    }

    logger.info(`Committing ${batches.length} batches...`);
    for (let i = 0; i < batches.length; i++) {
      await batches[i].commit();
      logger.info(`Batch ${i + 1}/${batches.length} committed`);
    }

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

    logger.info(`Bulk upload complete: ${totalCount} records added to ${collectionName}`);
    return { success: true, count: totalCount };
  } catch (error) {
    logger.error('Error in flexible bulk upload:', error);
    return { success: false, error: error.message };
  }
};
