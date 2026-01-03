import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import logger from '../utils/logger';

// ============ EARLY LEAVES MANAGEMENT ============

/**
 * Create a new early leave record
 */
export const createEarlyLeave = async (earlyLeaveData, userId) => {
  try {
    const docRef = await addDoc(collection(db, 'earlyLeaves'), {
      ...earlyLeaveData,
      uploadedAt: serverTimestamp(),
      uploadedBy: userId,
      lastModified: serverTimestamp(),
      lastModifiedBy: userId
    });

    // If corrective action is DNR, auto-add to DNR database
    if (earlyLeaveData.correctiveAction === 'DNR') {
      await addToDNR({
        associateName: earlyLeaveData.associateName,
        eid: earlyLeaveData.eid,
        reason: earlyLeaveData.reason || 'Early Leave - DNR Action',
        source: 'Early Leave',
        earlyLeaveId: docRef.id
      }, userId);
    }

    return { success: true, id: docRef.id };
  } catch (error) {
    logger.error('Error creating early leave:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update early leave record
 */
export const updateEarlyLeave = async (earlyLeaveId, updates, userId) => {
  try {
    const docRef = doc(db, 'earlyLeaves', earlyLeaveId);
    const oldDoc = await getDoc(docRef);

    await updateDoc(docRef, {
      ...updates,
      lastModified: serverTimestamp(),
      lastModifiedBy: userId
    });

    // If corrective action changed to DNR, add to DNR database
    if (updates.correctiveAction === 'DNR' && oldDoc.data().correctiveAction !== 'DNR') {
      await addToDNR({
        associateName: updates.associateName || oldDoc.data().associateName,
        eid: updates.eid || oldDoc.data().eid,
        reason: updates.reason || oldDoc.data().reason || 'Early Leave - DNR Action',
        source: 'Early Leave',
        earlyLeaveId: earlyLeaveId
      }, userId);
    }

    return { success: true };
  } catch (error) {
    logger.error('Error updating early leave:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete early leave record
 */
export const deleteEarlyLeave = async (earlyLeaveId) => {
  try {
    await deleteDoc(doc(db, 'earlyLeaves', earlyLeaveId));
    return { success: true };
  } catch (error) {
    logger.error('Error deleting early leave:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all early leaves with optional filters
 */
export const getEarlyLeaves = async (filters = {}) => {
  try {
    let q = query(collection(db, 'earlyLeaves'), orderBy('date', 'desc'));

    if (filters.shift) {
      q = query(
        collection(db, 'earlyLeaves'),
        where('shift', '==', filters.shift),
        orderBy('date', 'desc')
      );
    }

    if (filters.correctiveAction) {
      q = query(
        collection(db, 'earlyLeaves'),
        where('correctiveAction', '==', filters.correctiveAction),
        orderBy('date', 'desc')
      );
    }

    const querySnapshot = await getDocs(q);
    const earlyLeaves = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate(),
      uploadedAt: doc.data().uploadedAt?.toDate(),
      lastModified: doc.data().lastModified?.toDate()
    }));

    return { success: true, data: earlyLeaves };
  } catch (error) {
    logger.error('Error getting early leaves:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Search early leaves by name or EID
 */
export const searchEarlyLeaves = async (searchTerm) => {
  try {
    const earlyLeaves = [];

    // Search by EID
    const eidQuery = query(
      collection(db, 'earlyLeaves'),
      where('eid', '>=', searchTerm),
      where('eid', '<=', searchTerm + '\uf8ff')
    );
    const eidSnapshot = await getDocs(eidQuery);
    eidSnapshot.forEach(doc => {
      earlyLeaves.push({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate(),
        uploadedAt: doc.data().uploadedAt?.toDate(),
        lastModified: doc.data().lastModified?.toDate()
      });
    });

    // Search by name (case-insensitive)
    const allSnapshot = await getDocs(collection(db, 'earlyLeaves'));
    allSnapshot.forEach(doc => {
      const data = doc.data();
      const name = (data.associateName || '').toLowerCase();
      const searchLower = searchTerm.toLowerCase();

      if (name.includes(searchLower) && !earlyLeaves.find(e => e.id === doc.id)) {
        earlyLeaves.push({
          id: doc.id,
          ...data,
          date: data.date?.toDate(),
          uploadedAt: data.uploadedAt?.toDate(),
          lastModified: data.lastModified?.toDate()
        });
      }
    });

    return { success: true, data: earlyLeaves };
  } catch (error) {
    logger.error('Error searching early leaves:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Get early leave statistics
 */
export const getEarlyLeaveStats = async () => {
  try {
    const result = await getEarlyLeaves();
    if (!result.success) return result;

    const stats = {
      total: result.data.length,
      byAction: {
        'None': 0,
        'Warning': 0,
        '5 Day Suspension': 0,
        'DNR': 0
      },
      byShift: {
        '1st': 0,
        '2nd': 0
      },
      recentDNRs: []
    };

    result.data.forEach(leave => {
      stats.byAction[leave.correctiveAction] = (stats.byAction[leave.correctiveAction] || 0) + 1;
      stats.byShift[leave.shift] = (stats.byShift[leave.shift] || 0) + 1;

      if (leave.correctiveAction === 'DNR') {
        stats.recentDNRs.push({
          name: leave.associateName,
          eid: leave.eid,
          date: leave.date
        });
      }
    });

    // Sort DNRs by date descending, limit to 10
    stats.recentDNRs.sort((a, b) => b.date - a.date).slice(0, 10);

    return { success: true, data: stats };
  } catch (error) {
    logger.error('Error getting early leave stats:', error);
    return { success: false, error: error.message };
  }
};

// ============ DNR DATABASE ============

/**
 * Add to DNR database
 */
export const addToDNR = async (dnrData, userId) => {
  try {
    // Check if already exists
    const existingQuery = query(
      collection(db, 'dnrDatabase'),
      where('eid', '==', dnrData.eid),
      where('status', '==', 'Active')
    );
    const existingSnapshot = await getDocs(existingQuery);

    if (!existingSnapshot.empty) {
      return { success: true, message: 'DNR entry already exists', id: existingSnapshot.docs[0].id };
    }

    const docRef = await addDoc(collection(db, 'dnrDatabase'), {
      ...dnrData,
      dateAdded: serverTimestamp(),
      addedBy: userId,
      status: 'Active',
      removedAt: null,
      removedBy: null,
      notes: dnrData.notes || ''
    });

    return { success: true, id: docRef.id };
  } catch (error) {
    logger.error('Error adding to DNR:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Remove from DNR (mark as inactive)
 */
export const removeFromDNR = async (dnrId, userId, notes = '') => {
  try {
    const docRef = doc(db, 'dnrDatabase', dnrId);
    await updateDoc(docRef, {
      status: 'Removed',
      removedAt: serverTimestamp(),
      removedBy: userId,
      notes: notes
    });

    return { success: true };
  } catch (error) {
    logger.error('Error removing from DNR:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Restore DNR entry back to Active
 */
export const restoreFromDNR = async (dnrId, userId, notes = '') => {
  try {
    const docRef = doc(db, 'dnrDatabase', dnrId);
    await updateDoc(docRef, {
      status: 'Active',
      removedAt: null,
      removedBy: null,
      restoredAt: serverTimestamp(),
      restoredBy: userId,
      notes: notes
    });

    return { success: true };
  } catch (error) {
    logger.error('Error restoring from DNR:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all DNR entries
 */
export const getDNRDatabase = async (includeRemoved = false) => {
  try {
    let q;
    if (includeRemoved) {
      q = query(collection(db, 'dnrDatabase'), orderBy('dateAdded', 'desc'));
    } else {
      q = query(
        collection(db, 'dnrDatabase'),
        where('status', '==', 'Active'),
        orderBy('dateAdded', 'desc')
      );
    }

    const querySnapshot = await getDocs(q);
    const dnrEntries = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      dateAdded: doc.data().dateAdded?.toDate(),
      removedAt: doc.data().removedAt?.toDate()
    }));

    return { success: true, data: dnrEntries };
  } catch (error) {
    logger.error('Error getting DNR database:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Check if EID or name is in DNR database
 */
export const checkDNR = async (eid, name) => {
  try {
    const matches = [];

    // Check by EID (exact match)
    if (eid) {
      const eidQuery = query(
        collection(db, 'dnrDatabase'),
        where('eid', '==', eid),
        where('status', '==', 'Active')
      );
      const eidSnapshot = await getDocs(eidQuery);
      eidSnapshot.forEach(doc => {
        matches.push({
          id: doc.id,
          ...doc.data(),
          matchType: 'EID',
          matchScore: 100
        });
      });
    }

    // Check by name (fuzzy match)
    if (name && matches.length === 0) {
      const nameLower = name.toLowerCase().trim();
      const allDNRs = await getDocs(
        query(collection(db, 'dnrDatabase'), where('status', '==', 'Active'))
      );

      allDNRs.forEach(doc => {
        const dnrName = (doc.data().associateName || '').toLowerCase().trim();
        const similarity = calculateNameSimilarity(nameLower, dnrName);

        if (similarity >= 0.8) {
          matches.push({
            id: doc.id,
            ...doc.data(),
            matchType: 'Name',
            matchScore: Math.round(similarity * 100)
          });
        }
      });
    }

    return {
      success: true,
      isDNR: matches.length > 0,
      matches: matches
    };
  } catch (error) {
    logger.error('Error checking DNR:', error);
    return { success: false, error: error.message, isDNR: false, matches: [] };
  }
};

/**
 * Simple name similarity calculator (Levenshtein distance)
 */
function calculateNameSimilarity(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  const maxLen = Math.max(len1, len2);
  const distance = matrix[len1][len2];
  return 1 - distance / maxLen;
}

/**
 * Bulk upload early leaves from imported data
 */
export const bulkUploadEarlyLeaves = async (data) => {
  try {
    const batch = [];
    const userId = 'system'; // System import user

    for (const row of data) {
      const earlyLeaveData = {
        eid: row.eid || row.EID || '',
        associateName: row.associateName || row.name || row.Name || '',
        date: row.date || row.Date || new Date().toISOString(),
        timeLeft: row.timeLeft || row['Time Left'] || '',
        reason: row.reason || row.Reason || '',
        correctiveAction: row.correctiveAction || row['Corrective Action'] || ''
      };

      if (earlyLeaveData.eid && earlyLeaveData.date) {
        batch.push(createEarlyLeave(earlyLeaveData, userId));
      }
    }

    const results = await Promise.allSettled(batch);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    
    logger.info(`Bulk uploaded ${successful} early leave records`);
    return { success: true, count: successful };
  } catch (error) {
    logger.error('Error bulk uploading early leaves:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Bulk upload DNR records from imported data
 */
export const bulkUploadDNR = async (data) => {
  try {
    const batch = [];
    const userId = 'system'; // System import user

    for (const row of data) {
      const dnrData = {
        eid: row.eid || row.EID || '',
        associateName: row.name || row.Name || row.associateName || '',
        reason: row.reason || row.Reason || '',
        dateAdded: row.dateAdded || row['Date Added'] || new Date().toISOString(),
        source: 'Bulk Import'
      };

      if (dnrData.eid || dnrData.associateName) {
        batch.push(addToDNR(dnrData, userId));
      }
    }

    const results = await Promise.allSettled(batch);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    
    logger.info(`Bulk uploaded ${successful} DNR records`);
    return { success: true, count: successful };
  } catch (error) {
    logger.error('Error bulk uploading DNR records:', error);
    return { success: false, error: error.message };
  }
};
