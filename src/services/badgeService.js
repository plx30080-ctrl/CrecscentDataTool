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
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';

// ============ BADGE MANAGEMENT ============

/**
 * Generate badge ID in format PLX-########-ABC
 * where ######## is the EID and ABC are first 3 letters of last name
 */
export const generateBadgeId = (eid, lastName) => {
  const lastNamePrefix = lastName.toUpperCase().substring(0, 3).padEnd(3, 'X');
  const paddedEid = eid.toString().padStart(8, '0');
  return `PLX-${paddedEid}-${lastNamePrefix}`;
};

/**
 * Create a new badge profile
 */
export const createBadge = async (badgeData, photoFile, userId) => {
  try {
    let photoURL = '';

    // Upload photo to Firebase Storage if provided
    if (photoFile) {
      const storageRef = ref(storage, `badges/${badgeData.eid}_${Date.now()}.jpg`);
      await uploadBytes(storageRef, photoFile);
      photoURL = await getDownloadURL(storageRef);
    }

    // Generate badge ID
    const badgeId = generateBadgeId(badgeData.eid, badgeData.lastName);

    const docRef = await addDoc(collection(db, 'badges'), {
      ...badgeData,
      badgeId,
      photoURL,
      createdAt: serverTimestamp(),
      createdBy: userId,
      printedAt: null,
      printedBy: null,
      issuedAt: null,
      issuedBy: null
    });

    return { success: true, id: docRef.id, photoURL, badgeId };
  } catch (error) {
    console.error('Error creating badge:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update badge photo
 */
export const updateBadgePhoto = async (badgeId, photoFile) => {
  try {
    const badgeRef = doc(db, 'badges', badgeId);
    const badgeDoc = await getDoc(badgeRef);

    if (!badgeDoc.exists()) {
      return { success: false, error: 'Badge not found' };
    }

    const eid = badgeDoc.data().eid;
    const storageRef = ref(storage, `badges/${eid}_${Date.now()}.jpg`);
    await uploadBytes(storageRef, photoFile);
    const photoURL = await getDownloadURL(storageRef);

    await updateDoc(badgeRef, {
      photoURL,
      updatedAt: serverTimestamp()
    });

    return { success: true, photoURL };
  } catch (error) {
    console.error('Error updating badge photo:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update badge information
 */
export const updateBadge = async (badgeId, updates) => {
  try {
    const docRef = doc(db, 'badges', badgeId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating badge:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get badge by EID
 */
export const getBadgeByEID = async (eid) => {
  try {
    const q = query(collection(db, 'badges'), where('eid', '==', eid));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { success: true, data: null };
    }

    const badgeData = querySnapshot.docs[0].data();
    return {
      success: true,
      data: {
        id: querySnapshot.docs[0].id,
        ...badgeData,
        createdAt: badgeData.createdAt?.toDate(),
        printedAt: badgeData.printedAt?.toDate(),
        issuedAt: badgeData.issuedAt?.toDate(),
        expirationDate: badgeData.expirationDate?.toDate()
      }
    };
  } catch (error) {
    console.error('Error getting badge:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Search badges by name (firstName or lastName) or EID
 */
export const searchBadges = async (searchTerm) => {
  try {
    const badges = [];
    const searchUpper = searchTerm.toUpperCase();

    // Search by EID
    const eidQuery = query(
      collection(db, 'badges'),
      where('eid', '>=', searchTerm),
      where('eid', '<=', searchTerm + '\uf8ff')
    );
    const eidSnapshot = await getDocs(eidQuery);
    eidSnapshot.forEach(doc => {
      badges.push({ id: doc.id, ...doc.data() });
    });

    // Search by lastName
    const lastNameQuery = query(
      collection(db, 'badges'),
      where('lastName', '>=', searchUpper),
      where('lastName', '<=', searchUpper + '\uf8ff')
    );
    const lastNameSnapshot = await getDocs(lastNameQuery);
    lastNameSnapshot.forEach(doc => {
      const existingBadge = badges.find(b => b.id === doc.id);
      if (!existingBadge) {
        badges.push({ id: doc.id, ...doc.data() });
      }
    });

    // Search by firstName
    const firstNameQuery = query(
      collection(db, 'badges'),
      where('firstName', '>=', searchUpper),
      where('firstName', '<=', searchUpper + '\uf8ff')
    );
    const firstNameSnapshot = await getDocs(firstNameQuery);
    firstNameSnapshot.forEach(doc => {
      const existingBadge = badges.find(b => b.id === doc.id);
      if (!existingBadge) {
        badges.push({ id: doc.id, ...doc.data() });
      }
    });

    // Convert timestamps
    const formattedBadges = badges.map(badge => ({
      ...badge,
      createdAt: badge.createdAt?.toDate(),
      printedAt: badge.printedAt?.toDate(),
      issuedAt: badge.issuedAt?.toDate(),
      expirationDate: badge.expirationDate?.toDate()
    }));

    return { success: true, data: formattedBadges };
  } catch (error) {
    console.error('Error searching badges:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Get all badges with optional status filter
 */
export const getAllBadges = async (statusFilter = null) => {
  try {
    let q = query(collection(db, 'badges'), orderBy('createdAt', 'desc'));

    if (statusFilter) {
      q = query(collection(db, 'badges'), where('status', '==', statusFilter), orderBy('createdAt', 'desc'));
    }

    const querySnapshot = await getDocs(q);
    const badges = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      printedAt: doc.data().printedAt?.toDate(),
      issuedAt: doc.data().issuedAt?.toDate(),
      expirationDate: doc.data().expirationDate?.toDate()
    }));

    return { success: true, data: badges };
  } catch (error) {
    console.error('Error getting badges:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// ============ PRINT QUEUE ============

/**
 * Add badge to print queue
 */
export const addToPrintQueue = async (badgeId, badgeData, userId, priority = 'Normal') => {
  try {
    const docRef = await addDoc(collection(db, 'badgePrintQueue'), {
      badgeId,
      eid: badgeData.eid,
      firstName: badgeData.firstName,
      lastName: badgeData.lastName,
      badgeId: badgeData.badgeId,
      priority,
      status: 'Queued',
      printerName: 'Fargo DTC1250e',
      queuedAt: serverTimestamp(),
      queuedBy: userId,
      completedAt: null,
      error: null
    });

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error adding to print queue:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get print queue
 */
export const getPrintQueue = async () => {
  try {
    const q = query(
      collection(db, 'badgePrintQueue'),
      where('status', 'in', ['Queued', 'Printing']),
      orderBy('priority', 'desc'),
      orderBy('queuedAt', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const queue = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      queuedAt: doc.data().queuedAt?.toDate(),
      completedAt: doc.data().completedAt?.toDate()
    }));

    return { success: true, data: queue };
  } catch (error) {
    console.error('Error getting print queue:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Mark badge as printed
 */
export const markBadgePrinted = async (queueId, badgeId, userId) => {
  try {
    // Update queue item
    const queueRef = doc(db, 'badgePrintQueue', queueId);
    await updateDoc(queueRef, {
      status: 'Completed',
      completedAt: serverTimestamp()
    });

    // Update badge
    const badgeRef = doc(db, 'badges', badgeId);
    await updateDoc(badgeRef, {
      printedAt: serverTimestamp(),
      printedBy: userId
    });

    return { success: true };
  } catch (error) {
    console.error('Error marking badge as printed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Mark badge as issued
 */
export const markBadgeIssued = async (badgeId, userId) => {
  try {
    const badgeRef = doc(db, 'badges', badgeId);
    await updateDoc(badgeRef, {
      issuedAt: serverTimestamp(),
      issuedBy: userId
    });

    return { success: true };
  } catch (error) {
    console.error('Error marking badge as issued:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update badge status (Pending, Cleared, Not Cleared, Suspended)
 */
export const updateBadgeStatus = async (badgeId, status, notes = '') => {
  try {
    const badgeRef = doc(db, 'badges', badgeId);
    await updateDoc(badgeRef, {
      status,
      notes,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating badge status:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete badge
 */
export const deleteBadge = async (badgeId) => {
  try {
    await deleteDoc(doc(db, 'badges', badgeId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting badge:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get badge statistics
 */
export const getBadgeStats = async () => {
  try {
    const badges = await getAllBadges();
    if (!badges.success) return badges;

    const stats = {
      total: badges.data.length,
      byStatus: {
        'Pending': 0,
        'Cleared': 0,
        'Not Cleared': 0,
        'Suspended': 0
      },
      printed: 0,
      issued: 0,
      pendingPrint: 0
    };

    badges.data.forEach(badge => {
      stats.byStatus[badge.status] = (stats.byStatus[badge.status] || 0) + 1;
      if (badge.printedAt) stats.printed++;
      if (badge.issuedAt) stats.issued++;
      if (!badge.printedAt) stats.pendingPrint++;
    });

    return { success: true, data: stats };
  } catch (error) {
    console.error('Error getting badge stats:', error);
    return { success: false, error: error.message };
  }
};
