import { db, storage } from '../firebase';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import logger from '../utils/logger';

/**
 * Upload a document for an applicant
 * @param {string} applicantId - Applicant document ID
 * @param {File} file - File to upload
 * @param {string} documentType - Type of document (e.g., 'I-9', 'Background Check', 'Offer Letter')
 * @param {string} notes - Optional notes about the document
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export const uploadApplicantDocument = async (applicantId, file, documentType, notes = '') => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Create storage reference
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const storageRef = ref(storage, `applicant-documents/${applicantId}/${fileName}`);

    // Upload file
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    // Create document record in Firestore
    const docData = {
      applicantId,
      fileName: file.name,
      storagePath: snapshot.ref.fullPath,
      downloadURL,
      documentType,
      notes,
      fileSize: file.size,
      mimeType: file.type,
      uploadedAt: serverTimestamp(),
      uploadedBy: user.email,
      uploadedByUid: user.uid
    };

    const docRef = await addDoc(collection(db, 'applicantDocuments'), docData);

    return {
      success: true,
      data: {
        id: docRef.id,
        ...docData,
        uploadedAt: new Date()
      }
    };
  } catch (error) {
    logger.error('Error uploading document:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all documents for an applicant
 * @param {string} applicantId - Applicant document ID
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getApplicantDocuments = async (applicantId) => {
  try {
    const q = query(
      collection(db, 'applicantDocuments'),
      where('applicantId', '==', applicantId),
      orderBy('uploadedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const documents = [];

    querySnapshot.forEach((doc) => {
      documents.push({
        id: doc.id,
        ...doc.data(),
        uploadedAt: doc.data().uploadedAt?.toDate()
      });
    });

    return { success: true, data: documents };
  } catch (error) {
    logger.error('Error getting applicant documents:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete a document
 * @param {string} documentId - Document ID in Firestore
 * @param {string} storagePath - Path to file in Firebase Storage
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deleteApplicantDocument = async (documentId, storagePath) => {
  try {
    // Delete from storage
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);

    // Delete from Firestore
    await deleteDoc(doc(db, 'applicantDocuments', documentId));

    return { success: true };
  } catch (error) {
    logger.error('Error deleting document:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get document type icon
 * @param {string} mimeType - MIME type of the document
 * @returns {string} - Icon name for Material-UI
 */
export const getDocumentIcon = (mimeType) => {
  if (!mimeType) return 'Description';

  if (mimeType.includes('pdf')) return 'PictureAsPdf';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'Description';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'TableChart';
  if (mimeType.includes('image')) return 'Image';
  if (mimeType.includes('text')) return 'TextSnippet';

  return 'InsertDriveFile';
};

/**
 * Format file size
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};
