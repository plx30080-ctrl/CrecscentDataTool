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
  Timestamp,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import logger from '../utils/logger';

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
      orderBy('date', 'asc')  // Changed from 'desc' to 'asc' for chronological order
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

// Calculate aggregate hours by period
export const getAggregateHours = async (startDate, endDate, groupBy = 'day') => {
  try {
    const result = await getHoursData(startDate, endDate);
    if (!result.success) return result;

    const aggregated = {};
    result.data.forEach(entry => {
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

      if (!aggregated[key]) {
        aggregated[key] = {
          totalHours: 0,
          shift1Hours: 0,
          shift2Hours: 0,
          count: 0
        };
      }

      aggregated[key].totalHours += entry.totalHours || 0;
      aggregated[key].shift1Hours += entry.shift1Hours || 0;
      aggregated[key].shift2Hours += entry.shift2Hours || 0;
      aggregated[key].count += 1;
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
    const docRef = await addDoc(collection(db, 'applicants'), {
      ...applicantData,
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

// Delete a single applicant
export const deleteApplicant = async (applicantId) => {
  try {
    const docRef = doc(db, 'applicants', applicantId);
    await deleteDoc(docRef);
    logger.info('Applicant deleted:', applicantId);
    return { success: true };
  } catch (error) {
    logger.error('Error deleting applicant:', error);
    return { success: false, error: error.message };
  }
};

// Bulk delete applicants (for purging old records)
export const bulkDeleteApplicants = async (applicantIds) => {
  try {
    const batch = writeBatch(db);

    applicantIds.forEach(id => {
      const docRef = doc(db, 'applicants', id);
      batch.delete(docRef);
    });

    await batch.commit();
    logger.info(`Bulk deleted ${applicantIds.length} applicants`);
    return { success: true, deletedCount: applicantIds.length };
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

// Get applicant pipeline metrics
export const getApplicantPipeline = async () => {
  try {
    const result = await getApplicants();
    if (!result.success) return result;

    const pipeline = {
      total: result.data.length,
      byStatus: {
        // Support both old and new status formats
        'Applied': 0,
        'Interviewed': 0,
        'Processed': 0,
        'Hired': 0,
        'Started': 0,
        'Rejected': 0,
        // New bulk upload statuses
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

    result.data.forEach(applicant => {
      pipeline.byStatus[applicant.status] = (pipeline.byStatus[applicant.status] || 0) + 1;

      if (applicant.projectedStartDate && (applicant.status === 'Hired' || applicant.status === 'Started')) {
        pipeline.projectedStarts.push({
          name: applicant.name,
          date: applicant.projectedStartDate
        });
      }
    });

    // Calculate conversion rate (total -> Started)
    const started = pipeline.byStatus['Started'];
    pipeline.conversionRate = pipeline.total > 0 ? ((started / pipeline.total) * 100).toFixed(1) : 0;

    // Sort projected starts by date
    pipeline.projectedStarts.sort((a, b) => new Date(a.date) - new Date(b.date));

    return { success: true, data: pipeline };
  } catch (error) {
    logger.error('Error calculating applicant pipeline:', error);
    return { success: false, error: error.message };
  }
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
      const docRef = doc(collection(db, 'applicants'));
      currentBatch.set(docRef, {
        ...applicant,
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

// Check for duplicate CRM numbers
export const checkDuplicateApplicants = async (crmNumbers) => {
  try {
    const duplicates = [];

    // Query in chunks of 10 (Firestore 'in' query limit)
    for (let i = 0; i < crmNumbers.length; i += 10) {
      const chunk = crmNumbers.slice(i, i + 10);
      const q = query(
        collection(db, 'applicants'),
        where('crmNumber', 'in', chunk)
      );
      const snapshot = await getDocs(q);
      snapshot.docs.forEach(doc => {
        duplicates.push({
          crmNumber: doc.data().crmNumber,
          name: doc.data().name,
          status: doc.data().status
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
    await uploadBytes(storageRef, photoFile);
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
