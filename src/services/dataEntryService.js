import { db } from '../firebase';
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

/**
 * Sync applicant statuses to "Started" when they appear in labor reports
 */
const syncApplicantStatuses = async (employeeIds) => {
  try {
    let updatedCount = 0;

    for (const eid of employeeIds) {
      // Find applicant by EID or crmNumber
      const q = query(
        collection(db, 'applicants'),
        where('eid', '==', eid)
      );

      const querySnapshot = await getDocs(q);

      // Also check crmNumber field for bulk uploads
      if (querySnapshot.empty) {
        const q2 = query(
          collection(db, 'applicants'),
          where('crmNumber', '==', eid)
        );
        const querySnapshot2 = await getDocs(q2);

        querySnapshot2.forEach(async (document) => {
          const currentStatus = document.data().status;
          // Only update if not already "Started"
          if (currentStatus !== 'Started') {
            await updateDoc(doc(db, 'applicants', document.id), {
              status: 'Started',
              lastModified: serverTimestamp()
            });
            updatedCount++;
          }
        });
      } else {
        querySnapshot.forEach(async (document) => {
          const currentStatus = document.data().status;
          // Only update if not already "Started"
          if (currentStatus !== 'Started') {
            await updateDoc(doc(db, 'applicants', document.id), {
              status: 'Started',
              lastModified: serverTimestamp()
            });
            updatedCount++;
          }
        });
      }
    }

    console.log(`Updated ${updatedCount} applicant statuses to "Started"`);
    return { success: true, updatedCount };
  } catch (error) {
    console.error('Error syncing applicant statuses:', error);
    return { success: false, error: error.message };
  }
};

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
      submittedByUid: user.uid
    };

    // If file is provided, parse employee data
    let employeeData = null;
    if (file) {
      employeeData = await parseOnPremiseFile(file);
      dataToSubmit.employeeData = employeeData;
      dataToSubmit.fileName = file.name;
    }

    const docRef = await addDoc(collection(db, 'onPremiseData'), dataToSubmit);

    return {
      success: true,
      id: docRef.id,
      employeesProcessed: employeeData ? employeeData.length : 0
    };
  } catch (error) {
    console.error('Error submitting on premise data:', error);
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
 * Submit Labor Report
 */
export const submitLaborReport = async (data) => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error('User not authenticated');
    }

    const dataToSubmit = {
      weekEnding: Timestamp.fromDate(data.weekEnding.toDate()),
      directHours: parseFloat(data.directHours) || 0,
      indirectHours: parseFloat(data.indirectHours) || 0,
      totalHours: parseFloat(data.totalHours) || 0,
      employeeCount: parseInt(data.employeeCount) || 0,
      employeeIds: data.employeeIds || [],
      fileName: data.fileName || '',
      submittedAt: serverTimestamp(),
      submittedBy: user.email,
      submittedByUid: user.uid
    };

    const docRef = await addDoc(collection(db, 'laborReports'), dataToSubmit);

    // Auto-update applicant statuses to "Started" for EIDs in labor report
    if (data.employeeIds && data.employeeIds.length > 0) {
      await syncApplicantStatuses(data.employeeIds);
    }

    return { success: true, id: docRef.id, statusesUpdated: data.employeeIds?.length || 0 };
  } catch (error) {
    console.error('Error submitting labor report:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Submit Branch Daily metrics
 */
export const submitBranchDaily = async (formData) => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error('User not authenticated');
    }

    const dataToSubmit = {
      date: Timestamp.fromDate(formData.date.toDate()),
      interviewsScheduled: parseInt(formData.interviewsScheduled) || 0,
      interviewShows: parseInt(formData.interviewShows) || 0,
      shift1Processed: parseInt(formData.shift1Processed) || 0,
      shift2Processed: parseInt(formData.shift2Processed) || 0,
      shift2Confirmations: parseInt(formData.shift2Confirmations) || 0,
      nextDayConfirmations: parseInt(formData.nextDayConfirmations) || 0,
      notes: formData.notes || '',
      submittedAt: serverTimestamp(),
      submittedBy: user.email,
      submittedByUid: user.uid
    };

    const docRef = await addDoc(collection(db, 'branchDaily'), dataToSubmit);

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error submitting branch daily:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Submit Branch Weekly metrics
 */
export const submitBranchWeekly = async (formData) => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error('User not authenticated');
    }

    const dataToSubmit = {
      weekEnding: Timestamp.fromDate(formData.weekEnding.toDate()),
      totalApplicants: parseInt(formData.totalApplicants) || 0,
      totalProcessed: parseInt(formData.totalProcessed) || 0,
      totalHeadcount: parseInt(formData.totalHeadcount) || 0,
      notes: formData.notes || '',
      submittedAt: serverTimestamp(),
      submittedBy: user.email,
      submittedByUid: user.uid
    };

    const docRef = await addDoc(collection(db, 'branchWeekly'), dataToSubmit);

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error submitting branch weekly:', error);
    return { success: false, error: error.message };
  }
};
