import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where
} from 'firebase/firestore';
import { db } from '../firebase';
import logger from '../utils/logger';

/**
 * Get all recruiter mappings (initials → UID/name)
 */
export const getRecruiterMappings = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'recruiterMappings'));
    const mappings = {};
    
    snapshot.forEach(doc => {
      mappings[doc.data().initials.toUpperCase()] = {
        id: doc.id,
        ...doc.data()
      };
    });
    
    return mappings;
  } catch (error) {
    logger.error('Error fetching recruiter mappings:', error);
    return {};
  }
};

/**
 * Get a single recruiter mapping by initials
 */
export const getRecruiterByInitials = async (initials) => {
  try {
    if (!initials) return null;
    
    const q = query(
      collection(db, 'recruiterMappings'),
      where('initials', '==', initials.toUpperCase())
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    
    return snapshot.docs[0].data();
  } catch (error) {
    logger.error('Error fetching recruiter by initials:', error);
    return null;
  }
};

/**
 * Create or update a recruiter mapping
 * @param {string} initials - Recruiter initials (e.g., "JD")
 * @param {string} uid - User ID from auth
 * @param {string} fullName - Recruiter's full name
 * @param {string} email - Recruiter's email
 */
export const setRecruiterMapping = async (initials, uid, fullName, email) => {
  try {
    if (!initials || !uid) {
      throw new Error('Initials and UID are required');
    }

    const mappingId = initials.toUpperCase();
    const mappingRef = doc(db, 'recruiterMappings', mappingId);
    
    await setDoc(mappingRef, {
      initials: initials.toUpperCase(),
      uid,
      fullName,
      email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    logger.info(`Recruiter mapping set: ${initials} → ${fullName}`);
    return { success: true, mappingId };
  } catch (error) {
    logger.error('Error setting recruiter mapping:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Resolve recruiter initials to UID
 * Supports multiple formats: "JD", "J.D.", "J D"
 */
export const resolveRecruiterInitials = async (initialsStr) => {
  try {
    if (!initialsStr) return null;

    // Clean and normalize the input
    const normalized = initialsStr
      .toUpperCase()
      .replace(/\./g, '')
      .replace(/\s/g, '')
      .trim();

    if (!normalized) return null;

    const mapping = await getRecruiterByInitials(normalized);
    return mapping ? mapping.uid : null;
  } catch (error) {
    logger.error('Error resolving recruiter initials:', error);
    return null;
  }
};

/**
 * Get all users who are recruiters (from users collection)
 */
export const getAvailableRecruiters = async () => {
  try {
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'Recruiter')
    );
    
    const snapshot = await getDocs(q);
    const recruiters = [];
    
    snapshot.forEach(doc => {
      recruiters.push({
        uid: doc.id,
        displayName: doc.data().displayName,
        email: doc.data().email
      });
    });
    
    return recruiters.sort((a, b) => 
      a.displayName.localeCompare(b.displayName)
    );
  } catch (error) {
    logger.error('Error fetching available recruiters:', error);
    return [];
  }
};

/**
 * Delete a recruiter mapping
 */
export const deleteRecruiterMapping = async (initials) => {
  try {
    const mappingId = initials.toUpperCase();
    await deleteDoc(doc(db, 'recruiterMappings', mappingId));
    
    logger.info(`Recruiter mapping deleted: ${initials}`);
    return { success: true };
  } catch (error) {
    logger.error('Error deleting recruiter mapping:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Batch update applicants with recruiter UIDs based on initials
 * Used when you upload with initials and want to convert them to UIDs
 */
export const updateApplicantRecruitersFromInitials = async (applicantIds, recruiterInitials) => {
  try {
    const recruiterUid = await resolveRecruiterInitials(recruiterInitials);
    
    if (!recruiterUid) {
      return {
        success: false,
        error: `Could not resolve recruiter initials: ${recruiterInitials}`
      };
    }

    const batch = [];
    
    for (const applicantId of applicantIds) {
      const applicantRef = doc(db, 'applicants', applicantId);
      batch.push(
        updateDoc(applicantRef, {
          assignedRecruiter: recruiterUid,
          updatedAt: new Date().toISOString()
        })
      );
    }

    await Promise.allSettled(batch);
    
    logger.info(`Updated ${applicantIds.length} applicants with recruiter: ${recruiterInitials}`);
    return { success: true, updated: applicantIds.length };
  } catch (error) {
    logger.error('Error updating applicant recruiters:', error);
    return { success: false, error: error.message };
  }
};
