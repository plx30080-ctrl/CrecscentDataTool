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
import { withTimeout } from '../utils/timeout';

import logger from '../utils/logger';
import { DEFAULT_BADGE_TEMPLATE } from '../config/badgeTemplate';

// ============ BADGE MANAGEMENT ============

/**
 * Generate badge ID in format PLX-XXXXXX-ABC
 * where XXXXXX is the EID (6-8 digits, no padding) and ABC are first 3 letters of last name
 */
export const generateBadgeId = (eid, lastName) => {
  const lastNamePrefix = lastName.toUpperCase().substring(0, 3).padEnd(3, 'X');
  const eidStr = eid.toString();
  return `PLX-${eidStr}-${lastNamePrefix}`;
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
      try {
        await withTimeout(uploadBytes(storageRef, photoFile), 15000);
        photoURL = await withTimeout(getDownloadURL(storageRef), 10000);
      } catch (err) {
        logger.error('Error uploading photo to Storage:', err);
        return { success: false, error: err.message || 'Photo upload failed' };
      }
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
    logger.error('Error creating badge:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Create or update badge from applicant data
 * This syncs applicant info to badge system
 * CONCURRENCY SAFE: Uses double-check to prevent duplicate badge creation
 */
export const createOrUpdateBadgeFromApplicant = async (applicant, photoFile, userId) => {
  try {
    // Extract EID from applicant (handles both eid and crmNumber fields)
    const eid = applicant.eid || applicant.crmNumber;

    if (!eid) {
      return { success: false, error: 'Applicant must have an EID' };
    }

    // Parse name from applicant
    let firstName, lastName;
    if (applicant.firstName && applicant.lastName) {
      firstName = applicant.firstName.toUpperCase();
      lastName = applicant.lastName.toUpperCase();
    } else if (applicant.name) {
      const nameParts = applicant.name.trim().split(/\s+/);
      firstName = nameParts[0]?.toUpperCase() || '';
      lastName = nameParts.slice(1).join(' ')?.toUpperCase() || '';
    } else {
      return { success: false, error: 'Applicant must have a name' };
    }

    // Upload photo first if provided (before any database operations)
    let photoURL = '';
    if (photoFile) {
      const storageRef = ref(storage, `badges/${eid}_${Date.now()}.jpg`);
      try {
        await withTimeout(uploadBytes(storageRef, photoFile), 15000);
        photoURL = await withTimeout(getDownloadURL(storageRef), 10000);
      } catch (err) {
        logger.error('Error uploading applicant photo to Storage:', err);
        return { success: false, error: err.message || 'Photo upload failed' };
      }
    }

    // Check if badge already exists for this EID
    const existingBadge = await getBadgeByEID(eid);

    if (existingBadge.success && existingBadge.data) {
      // Update existing badge
      const updates = {
        firstName,
        lastName,
        position: applicant.position || existingBadge.data.position || '',
        shift: applicant.shift || existingBadge.data.shift || '1st',
        recruiter: applicant.recruiter || existingBadge.data.recruiter || '',
        status: applicant.status === 'Started' ? 'Cleared' : 'Pending',
        updatedAt: serverTimestamp()
      };

      if (photoURL) {
        updates.photoURL = photoURL;
      }

      await updateDoc(doc(db, 'badges', existingBadge.data.id), updates);

      return {
        success: true,
        id: existingBadge.data.id,
        badgeId: existingBadge.data.badgeId,
        isNew: false
      };
    } else {
      // Create new badge with double-check to prevent race condition
      const badgeId = generateBadgeId(eid, lastName);

      // Double-check: Query again right before creating (race condition protection)
      const doubleCheck = await getBadgeByEID(eid);
      if (doubleCheck.success && doubleCheck.data) {
        logger.info(`Race condition avoided: Badge for EID ${eid} was created by another user`);
        return {
          success: true,
          id: doubleCheck.data.id,
          badgeId: doubleCheck.data.badgeId,
          isNew: false
        };
      }

      // Safe to create
      const badgeData = {
        firstName,
        lastName,
        eid,
        badgeId,
        photoURL,
        position: applicant.position || '',
        shift: applicant.shift || '1st',
        recruiter: applicant.recruiter || '',
        status: applicant.status === 'Started' ? 'Cleared' : 'Pending',
        notes: applicant.notes || '',
        createdAt: serverTimestamp(),
        createdBy: userId,
        printedAt: null,
        printedBy: null,
        issuedAt: null,
        issuedBy: null
      };

      const docRef = await addDoc(collection(db, 'badges'), badgeData);

      return { success: true, id: docRef.id, badgeId, photoURL, isNew: true };
    }
  } catch (error) {
    logger.error('Error creating/updating badge from applicant:', error);
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
    try {
      await withTimeout(uploadBytes(storageRef, photoFile), 15000);
      const photoURL = await withTimeout(getDownloadURL(storageRef), 10000);

      await updateDoc(badgeRef, {
        photoURL,
        updatedAt: serverTimestamp()
      });

      return { success: true, photoURL };
    } catch (err) {
      logger.error('Error uploading badge photo:', err);
      return { success: false, error: err.message || 'Photo upload failed' };
    }
  } catch (error) {
    logger.error('Error updating badge photo:', error);
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
    logger.error('Error updating badge:', error);
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
    logger.error('Error getting badge:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Search badges by name (firstName or lastName) or EID
 */
export const searchBadges = async (searchTerm) => {
  try {
    const badges = [];
    const applicants = [];
    const searchUpper = searchTerm.toUpperCase();

    // Search badges by EID
    const eidQuery = query(
      collection(db, 'badges'),
      where('eid', '>=', searchTerm),
      where('eid', '<=', searchTerm + '\uf8ff')
    );
    const eidSnapshot = await getDocs(eidQuery);
    eidSnapshot.forEach(doc => {
      badges.push({ id: doc.id, ...doc.data(), source: 'badge' });
    });

    // Search badges by lastName
    const lastNameQuery = query(
      collection(db, 'badges'),
      where('lastName', '>=', searchUpper),
      where('lastName', '<=', searchUpper + '\uf8ff')
    );
    const lastNameSnapshot = await getDocs(lastNameQuery);
    lastNameSnapshot.forEach(doc => {
      const existingBadge = badges.find(b => b.id === doc.id);
      if (!existingBadge) {
        badges.push({ id: doc.id, ...doc.data(), source: 'badge' });
      }
    });

    // Search badges by firstName
    const firstNameQuery = query(
      collection(db, 'badges'),
      where('firstName', '>=', searchUpper),
      where('firstName', '<=', searchUpper + '\uf8ff')
    );
    const firstNameSnapshot = await getDocs(firstNameQuery);
    firstNameSnapshot.forEach(doc => {
      const existingBadge = badges.find(b => b.id === doc.id);
      if (!existingBadge) {
        badges.push({ id: doc.id, ...doc.data(), source: 'badge' });
      }
    });

    // Also search applicants by CRM Number (which is used as EID)
    const crmQuery = query(
      collection(db, 'applicants'),
      where('crmNumber', '>=', searchTerm),
      where('crmNumber', '<=', searchTerm + '\uf8ff')
    );
    const crmSnapshot = await getDocs(crmQuery);
    crmSnapshot.forEach(doc => {
      const data = doc.data();
      applicants.push({
        id: doc.id,
        ...data,
        source: 'applicant',
        // Convert applicant data to badge-like format for display
        firstName: data.name?.split(' ')[0]?.toUpperCase() || '',
        lastName: data.name?.split(' ').slice(1).join(' ')?.toUpperCase() || '',
        eid: data.eid || data.crmNumber
      });
    });

    // Search applicants by name (case-insensitive partial match)
    const allApplicantsSnapshot = await getDocs(collection(db, 'applicants'));
    allApplicantsSnapshot.forEach(doc => {
      const data = doc.data();
      const name = (data.name || '').toLowerCase();
      const searchLower = searchTerm.toLowerCase();

      if (name.includes(searchLower) && !applicants.find(a => a.id === doc.id)) {
        applicants.push({
          id: doc.id,
          ...data,
          source: 'applicant',
          firstName: data.name?.split(' ')[0]?.toUpperCase() || '',
          lastName: data.name?.split(' ').slice(1).join(' ')?.toUpperCase() || '',
          eid: data.eid || data.crmNumber
        });
      }
    });

    // Combine and convert timestamps
    const allResults = [...badges, ...applicants].map(item => ({
      ...item,
      createdAt: item.createdAt?.toDate?.(),
      printedAt: item.printedAt?.toDate?.(),
      issuedAt: item.issuedAt?.toDate?.(),
      expirationDate: item.expirationDate?.toDate?.(),
      processDate: item.processDate?.toDate?.()
    }));

    return { success: true, data: allResults };
  } catch (error) {
    logger.error('Error searching badges:', error);
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
    logger.error('Error getting badges:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Delete a badge
 */
export const deleteBadge = async (badgeId) => {
  try {
    await deleteDoc(doc(db, 'badges', badgeId));
    return { success: true };
  } catch (error) {
    logger.error('Error deleting badge:', error);
    return { success: false, error: error.message };
  }
};

export const deleteBadgesByEid = async (eid) => {
  try {
    const q = query(collection(db, 'badges'), where('eid', '==', eid));
    const snapshot = await getDocs(q);
    for (const docSnap of snapshot.docs) {
      await deleteDoc(doc(db, 'badges', docSnap.id));
    }
    return { success: true, deleted: snapshot.size };
  } catch (error) {
    logger.error('Error deleting badges by EID:', error);
    return { success: false, error: error.message };
  }
};


// ============ PRINT QUEUE ============

/**
 * Add badge to print queue
 */
export const addToPrintQueue = async (badgeId, badgeData, userId, priority = 'Normal') => {
  try {
    // Generate badge ID if it doesn't exist
    const badgeIdValue = badgeData.badgeId || generateBadgeId(badgeData.eid, badgeData.lastName);

    const docRef = await addDoc(collection(db, 'badgePrintQueue'), {
      badgeDocId: badgeId,
      eid: badgeData.eid,
      firstName: badgeData.firstName,
      lastName: badgeData.lastName,
      badgeId: badgeIdValue,
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
    logger.error('Error adding to print queue:', error);
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
    logger.error('Error getting print queue:', error);
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
    logger.error('Error marking badge as printed:', error);
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
    logger.error('Error marking badge as issued:', error);
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
    logger.error('Error updating badge status:', error);
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
    logger.error('Error deleting badge:', error);
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
    logger.error('Error getting badge stats:', error);
    return { success: false, error: error.message };
  }
};

// ============ BADGE TEMPLATE MANAGEMENT ============

/**
 * Get default badge template
 */
export const getDefaultTemplate = async () => {
  try {
    const templatesQuery = query(
      collection(db, 'badgeTemplates'),
      where('isDefault', '==', true)
    );
    const querySnapshot = await getDocs(templatesQuery);

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        success: true,
        data: { id: doc.id, ...doc.data() }
      };
    }

    // Return centralized default template if none in database
    return {
      success: true,
      data: DEFAULT_BADGE_TEMPLATE
    };
  } catch (error) {
    logger.error('Error getting default template:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Save badge template
 */
export const saveTemplate = async (templateData, userId) => {
  try {
    const docRef = await addDoc(collection(db, 'badgeTemplates'), {
      ...templateData,
      createdAt: serverTimestamp(),
      createdBy: userId,
      lastModified: serverTimestamp(),
      lastModifiedBy: userId
    });

    return { success: true, id: docRef.id };
  } catch (error) {
    logger.error('Error saving template:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update badge template
 */
export const updateTemplate = async (templateId, templateData, userId) => {
  try {
    const templateRef = doc(db, 'badgeTemplates', templateId);
    await updateDoc(templateRef, {
      ...templateData,
      lastModified: serverTimestamp(),
      lastModifiedBy: userId
    });

    return { success: true };
  } catch (error) {
    logger.error('Error updating template:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all badge templates
 */
export const getAllTemplates = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'badgeTemplates'));
    const templates = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return { success: true, data: templates };
  } catch (error) {
    logger.error('Error getting templates:', error);
    return { success: false, error: error.message };
  }
};
