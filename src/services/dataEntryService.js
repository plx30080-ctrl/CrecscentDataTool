import { db } from '../firebase';
import logger from '../utils/logger';
import dayjs from 'dayjs';
import {
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
  query,
  where,
  getDocs,
  updateDoc,
  doc
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import * as XLSX from 'xlsx';

// V3 Note: syncApplicantStatuses removed - now handled inline with associates collection

/**
 * Submit On Premise data
 */
export const submitOnPremiseData = async (formData, file) => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error('User not authenticated');
    }

    const dataToSubmit = {
      date: Timestamp.fromDate(formData.date.toDate()),
      shift: formData.shift,
      requested: parseInt(formData.requested) || 0,
      required: parseInt(formData.required) || 0,
      working: parseInt(formData.working) || 0,
      newStarts: parseInt(formData.newStarts) || 0,
      sendHomes: parseInt(formData.sendHomes) || 0,
      lineCuts: parseInt(formData.lineCuts) || 0,
      notes: formData.notes || '',
      submittedAt: serverTimestamp(),
      submittedBy: user.email,
      submittedByUid: user.uid,
      newStartEIDs: formData.newStartEIDs || [],
      eidValidation: formData.eidValidation || []
    };

    // If file is provided, parse employee data
    let employeeData = null;
    if (file) {
      employeeData = await parseOnPremiseFile(file);
      dataToSubmit.employeeData = employeeData;
      dataToSubmit.fileName = file.name;
    }

    const docRef = await addDoc(collection(db, 'onPremiseData'), dataToSubmit);

    // Update associates by EID (V3 - use pipelineStatus and status fields)
    if (formData.newStartEIDs && formData.newStartEIDs.length > 0 && formData.eidValidation) {
      try {
        const date = formData.date.toDate();
        let updatedCount = 0;
        
        for (let i = 0; i < formData.newStartEIDs.length; i++) {
          const eid = formData.newStartEIDs[i];
          const validation = formData.eidValidation[i];
          
          if (!eid || !eid.trim() || !validation || !validation.applicantData) continue;
          
          // V3: Update associates collection with pipelineStatus and status
          // Only update if not already "Started" or "Active"
          if (validation.applicantData.pipelineStatus !== 'Started' && validation.applicantData.status !== 'Active') {
            await updateDoc(doc(db, 'associates', validation.applicantData.id), {
              pipelineStatus: 'Started',
              status: 'Active',
              startDate: Timestamp.fromDate(date),
              lastModified: serverTimestamp()
            });
            updatedCount++;
          }
        }
        
        if (updatedCount > 0) {
          logger.info(`Updated ${updatedCount} associates to Started/Active based on new start EIDs`);
        }
      } catch (err) {
        logger.error('Error updating associates from new start EIDs:', err);
      }
    }

    return {
      success: true,
      id: docRef.id,
      employeesProcessed: employeeData ? employeeData.length : 0
    };
  } catch (error) {
    logger.error('Error submitting on premise data:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Parse On Premise Excel file
 */
const parseOnPremiseFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        // Map employee data
        const employees = jsonData.map(row => ({
          employeeId: row['Employee ID'] || row['EID'] || row['ID'] || '',
          name: row['Name'] || row['Employee Name'] || '',
          department: row['Department'] || row['Dept'] || '',
          shift: row['Shift'] || '',
          inTime: row['In Time'] || row['Clock In'] || '',
          outTime: row['Out Time'] || row['Clock Out'] || ''
        }));

        resolve(employees);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Submit Labor Report (V3 - uses hoursData collection)
 */
export const submitLaborReport = async (data) => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error('User not authenticated');
    }

    // V3: Transform to hoursData structure with nested shift1/shift2
    const dataToSubmit = {
      weekEnding: Timestamp.fromDate(data.weekEnding.toDate()),
      shift1: {
        total: parseFloat(data.shift1Total) || 0,
        direct: parseFloat(data.shift1Direct) || 0,
        indirect: parseFloat(data.shift1Indirect) || 0,
        byDate: data.shift1ByDate || {}
      },
      shift2: {
        total: parseFloat(data.shift2Total) || 0,
        direct: parseFloat(data.shift2Direct) || 0,
        indirect: parseFloat(data.shift2Indirect) || 0,
        byDate: data.shift2ByDate || {}
      },
      employeeCount: parseInt(data.employeeCount) || 0,
      employeeIds: data.employeeIds || [],
      employeeDetails: data.employeeDetails || [],
      fileName: data.fileName || '',
      submittedAt: serverTimestamp(),
      submittedBy: user.email,
      submittedByUid: user.uid
    };

    const docRef = await addDoc(collection(db, 'hoursData'), dataToSubmit);

    // V3: Auto-update associate statuses to "Active" for EIDs in hours report
    let statusesUpdated = 0;
    if (data.employeeIds && data.employeeIds.length > 0) {
      try {
        const associatesRef = collection(db, 'associates');
        for (const eid of data.employeeIds) {
          const q = query(associatesRef, where('eid', '==', eid));
          const snapshot = await getDocs(q);
          
          if (!snapshot.empty) {
            const associateDoc = snapshot.docs[0];
            const associateData = associateDoc.data();
            
            // Update to Active if not already
            if (associateData.status !== 'Active') {
              await updateDoc(doc(db, 'associates', associateDoc.id), {
                status: 'Active',
                pipelineStatus: 'Started',
                lastModified: serverTimestamp()
              });
              statusesUpdated++;
            }
          }
        }
      } catch (err) {
        logger.error('Error updating associate statuses from hours report:', err);
      }
    }

    return { success: true, id: docRef.id, statusesUpdated };
  } catch (error) {
    logger.error('Error submitting hours data:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Submit Branch Daily metrics (V3 - uses branchMetrics collection)
 */
export const submitBranchDaily = async (formData) => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error('User not authenticated');
    }

    // V3: Transform to branchMetrics structure
    const dataToSubmit = {
      date: Timestamp.fromDate(formData.date.toDate()),
      branch: formData.branch || 'Main',
      shift: formData.shift || 1, // Can be specified or default to 1
      recruiterStats: {
        interviewsScheduled: parseInt(formData.interviewsScheduled) || 0,
        interviewShows: parseInt(formData.interviewShows) || 0,
        shift1Processed: parseInt(formData.shift1Processed) || 0,
        shift2Processed: parseInt(formData.shift2Processed) || 0,
        shift2Confirmations: parseInt(formData.shift2Confirmations) || 0,
        nextDayConfirmations: parseInt(formData.nextDayConfirmations) || 0
      },
      notes: formData.notes || '',
      submittedAt: serverTimestamp(),
      submittedBy: user.email,
      submittedByUid: user.uid
    };

    const docRef = await addDoc(collection(db, 'branchMetrics'), dataToSubmit);

    return { success: true, id: docRef.id };
  } catch (error) {
    logger.error('Error submitting branch metrics:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Submit Branch Weekly metrics (V3 - uses branchMetrics collection)
 */
export const submitBranchWeekly = async (formData) => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error('User not authenticated');
    }

    // V3: Transform to branchMetrics structure (weekly aggregation)
    const dataToSubmit = {
      weekEnding: Timestamp.fromDate(formData.weekEnding.toDate()),
      branch: formData.branch || 'Main',
      isWeeklySummary: true, // Flag to distinguish from daily metrics
      recruiterStats: {
        totalApplicants: parseInt(formData.totalApplicants) || 0,
        totalProcessed: parseInt(formData.totalProcessed) || 0
      },
      dailyMetrics: {
        totalHeadcount: parseInt(formData.totalHeadcount) || 0
      },
      notes: formData.notes || '',
      submittedAt: serverTimestamp(),
      submittedBy: user.email,
      submittedByUid: user.uid
    };

    const docRef = await addDoc(collection(db, 'branchMetrics'), dataToSubmit);

    return { success: true, id: docRef.id };
  } catch (error) {
    logger.error('Error submitting branch weekly metrics:', error);
    return { success: false, error: error.message };
  }
};
