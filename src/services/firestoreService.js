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
  startAfter,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';

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
    console.error('Error adding shift data:', error);
    return { success: false, error: error.message };
  }
};

export const getShiftData = async (startDate, endDate, shift = null) => {
  try {
    let q = query(
      collection(db, 'shiftData'),
      where('date', '>=', Timestamp.fromDate(new Date(startDate))),
      where('date', '<=', Timestamp.fromDate(new Date(endDate))),
      orderBy('date', 'desc')
    );

    if (shift) {
      q = query(q, where('shift', '==', shift));
    }

    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate()
    }));
    return { success: true, data };
  } catch (error) {
    console.error('Error getting shift data:', error);
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
    console.error('Error adding hours data:', error);
    return { success: false, error: error.message };
  }
};

export const getHoursData = async (startDate, endDate) => {
  try {
    const q = query(
      collection(db, 'hoursData'),
      where('date', '>=', Timestamp.fromDate(new Date(startDate))),
      where('date', '<=', Timestamp.fromDate(new Date(endDate))),
      orderBy('date', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate()
    }));
    return { success: true, data };
  } catch (error) {
    console.error('Error getting hours data:', error);
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
    console.error('Error aggregating hours:', error);
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
    console.error('Error adding recruiter data:', error);
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
    console.error('Error getting recruiter data:', error);
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
    console.error('Error adding early leave:', error);
    return { success: false, error: error.message };
  }
};

export const getEarlyLeaves = async (startDate, endDate, associateId = null) => {
  try {
    let q = query(
      collection(db, 'earlyLeaves'),
      where('date', '>=', Timestamp.fromDate(new Date(startDate))),
      where('date', '<=', Timestamp.fromDate(new Date(endDate))),
      orderBy('date', 'desc')
    );

    if (associateId) {
      q = query(q, where('associateId', '==', associateId));
    }

    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate(),
      actionDate: doc.data().actionDate?.toDate()
    }));
    return { success: true, data };
  } catch (error) {
    console.error('Error getting early leaves:', error);
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
    console.error('Error calculating early leave trends:', error);
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
    console.error('Error adding applicant:', error);
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
    console.error('Error updating applicant:', error);
    return { success: false, error: error.message };
  }
};

export const getApplicants = async (status = null) => {
  try {
    let q = collection(db, 'applicants');

    if (status) {
      q = query(q, where('status', '==', status), orderBy('appliedDate', 'desc'));
    } else {
      q = query(q, orderBy('appliedDate', 'desc'));
    }

    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      appliedDate: doc.data().appliedDate?.toDate(),
      interviewDate: doc.data().interviewDate?.toDate(),
      processedDate: doc.data().processedDate?.toDate(),
      projectedStartDate: doc.data().projectedStartDate?.toDate(),
      actualStartDate: doc.data().actualStartDate?.toDate()
    }));
    return { success: true, data };
  } catch (error) {
    console.error('Error getting applicants:', error);
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
        'Applied': 0,
        'Interviewed': 0,
        'Processed': 0,
        'Hired': 0,
        'Started': 0,
        'Rejected': 0
      },
      projectedStarts: [],
      conversionRate: 0
    };

    result.data.forEach(applicant => {
      pipeline.byStatus[applicant.status] = (pipeline.byStatus[applicant.status] || 0) + 1;

      if (applicant.projectedStartDate && applicant.status === 'Hired') {
        pipeline.projectedStarts.push({
          name: applicant.name,
          date: applicant.projectedStartDate
        });
      }
    });

    // Calculate conversion rate (Applied -> Started)
    const applied = pipeline.byStatus['Applied'] + pipeline.byStatus['Interviewed'] +
                    pipeline.byStatus['Processed'] + pipeline.byStatus['Hired'] +
                    pipeline.byStatus['Started'];
    const started = pipeline.byStatus['Started'];
    pipeline.conversionRate = applied > 0 ? ((started / applied) * 100).toFixed(1) : 0;

    // Sort projected starts by date
    pipeline.projectedStarts.sort((a, b) => new Date(a.date) - new Date(b.date));

    return { success: true, data: pipeline };
  } catch (error) {
    console.error('Error calculating applicant pipeline:', error);
    return { success: false, error: error.message };
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
    console.error('Error adding associate:', error);
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
    console.error('Error getting associates:', error);
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
    console.error('Error creating user profile:', error);
    return { success: false, error: error.message };
  }
};

export const getUserProfile = async (uid) => {
  try {
    console.log('getUserProfile called with UID:', uid);

    // First try to get document by UID as document ID
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      console.log('Found user by direct UID lookup:', docSnap.data());
      return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
    }

    console.log('User not found by direct UID, trying query...');

    // Fall back to querying by uid field (for older user documents)
    const q = query(collection(db, 'users'), where('uid', '==', uid), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log('User not found by query either');
      return { success: false, error: 'User not found' };
    }

    const userData = querySnapshot.docs[0].data();
    console.log('Found user by query:', userData);
    return { success: true, data: { id: querySnapshot.docs[0].id, ...userData } };
  } catch (error) {
    console.error('Error getting user profile:', error);
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
    console.error('Error updating last login:', error);
    return { success: false, error: error.message };
  }
};
