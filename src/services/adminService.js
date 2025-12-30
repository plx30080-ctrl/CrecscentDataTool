import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import logger from '../utils/logger';

// ============ USER MANAGEMENT ============

/**
 * Get all users
 */
export const getAllUsers = async () => {
  try {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const users = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    }));

    return { success: true, data: users };
  } catch (error) {
    logger.error('Error getting users:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Update user role
 */
export const updateUserRole = async (userId, newRole, updatedBy) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      role: newRole,
      updatedAt: serverTimestamp(),
      updatedBy
    });

    // Log the action
    await logAuditAction({
      action: 'UPDATE_USER_ROLE',
      performedBy: updatedBy,
      targetUserId: userId,
      details: { newRole },
      timestamp: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    logger.error('Error updating user role:', error);
    return { success: false, error: error.message };
  }
};

// ============ BADGE TEMPLATE MANAGEMENT ============

/**
 * Save badge template configuration
 */
export const saveBadgeTemplate = async (templateData, userId) => {
  try {
    const docRef = await addDoc(collection(db, 'badgeTemplates'), {
      ...templateData,
      createdBy: userId,
      createdAt: serverTimestamp(),
      isActive: true
    });

    // Deactivate all other templates
    const templates = await getDocs(collection(db, 'badgeTemplates'));
    templates.docs.forEach(async (templateDoc) => {
      if (templateDoc.id !== docRef.id) {
        await updateDoc(doc(db, 'badgeTemplates', templateDoc.id), {
          isActive: false
        });
      }
    });

    // Log the action
    await logAuditAction({
      action: 'CREATE_BADGE_TEMPLATE',
      performedBy: userId,
      details: { templateId: docRef.id },
      timestamp: serverTimestamp()
    });

    return { success: true, id: docRef.id };
  } catch (error) {
    logger.error('Error saving badge template:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get active badge template
 */
export const getActiveBadgeTemplate = async () => {
  try {
    const q = query(
      collection(db, 'badgeTemplates'),
      where('isActive', '==', true)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { success: true, data: null };
    }

    const template = querySnapshot.docs[0];
    return {
      success: true,
      data: {
        id: template.id,
        ...template.data()
      }
    };
  } catch (error) {
    logger.error('Error getting active badge template:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all badge templates
 */
export const getAllBadgeTemplates = async () => {
  try {
    const q = query(collection(db, 'badgeTemplates'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const templates = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    }));

    return { success: true, data: templates };
  } catch (error) {
    logger.error('Error getting badge templates:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// ============ AUDIT LOG ============

/**
 * Log an audit action
 */
export const logAuditAction = async (actionData) => {
  try {
    await addDoc(collection(db, 'auditLog'), {
      ...actionData,
      timestamp: actionData.timestamp || serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    logger.error('Error logging audit action:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get audit logs with optional filters
 */
export const getAuditLogs = async (filters = {}) => {
  try {
    let q = query(collection(db, 'auditLog'), orderBy('timestamp', 'desc'));

    if (filters.userId) {
      q = query(q, where('performedBy', '==', filters.userId));
    }

    if (filters.action) {
      q = query(q, where('action', '==', filters.action));
    }

    if (filters.startDate) {
      q = query(q, where('timestamp', '>=', Timestamp.fromDate(new Date(filters.startDate))));
    }

    if (filters.endDate) {
      q = query(q, where('timestamp', '<=', Timestamp.fromDate(new Date(filters.endDate))));
    }

    const querySnapshot = await getDocs(q);
    const logs = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate()
    }));

    return { success: true, data: logs };
  } catch (error) {
    logger.error('Error getting audit logs:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Get user activity summary
 */
export const getUserActivitySummary = async (userId, startDate, endDate) => {
  try {
    const q = query(
      collection(db, 'auditLog'),
      where('performedBy', '==', userId),
      where('timestamp', '>=', Timestamp.fromDate(new Date(startDate))),
      where('timestamp', '<=', Timestamp.fromDate(new Date(endDate))),
      orderBy('timestamp', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const logs = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate()
    }));

    // Summarize by action type
    const summary = {
      totalActions: logs.length,
      byAction: {},
      recentActions: logs.slice(0, 10) // Last 10 actions
    };

    logs.forEach(log => {
      summary.byAction[log.action] = (summary.byAction[log.action] || 0) + 1;
    });

    return { success: true, data: summary };
  } catch (error) {
    logger.error('Error getting user activity summary:', error);
    return { success: false, error: error.message };
  }
};
