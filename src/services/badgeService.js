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

    // Return hardcoded default if none in database
    return {
      success: true,
      data: {
        name: 'Default Template',
        isDefault: true,
        cardSize: { width: 337.5, height: 212.5 }, // CR80 standard: 3.375" x 2.125"
        elements: {
          photo: { x: 20, y: 40, width: 100, height: 120 },
          firstName: { x: 135, y: 50, fontSize: 18, fontFamily: 'Arial, sans-serif', fontWeight: 'bold' },
          lastName: { x: 135, y: 75, fontSize: 18, fontFamily: 'Arial, sans-serif', fontWeight: 'bold' },
          eid: { x: 135, y: 105, fontSize: 14, fontFamily: 'Arial, sans-serif' },
          position: { x: 135, y: 125, fontSize: 12, fontFamily: 'Arial, sans-serif' },
          shift: { x: 135, y: 142, fontSize: 12, fontFamily: 'Arial, sans-serif' },
          logo: { x: 240, y: 10, width: 80, height: 30, url: '/CrecscentDataTool/images/plx-logo.png' },
          barcode: { x: 80, y: 168, width: 180, height: 35 }
        }
      }
    };
  } catch (error) {
    console.error('Error getting default template:', error);
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
    console.error('Error saving template:', error);
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
    console.error('Error updating template:', error);
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
    console.error('Error getting templates:', error);
    return { success: false, error: error.message };
  }
};
