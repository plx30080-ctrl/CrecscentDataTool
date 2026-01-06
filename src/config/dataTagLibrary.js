/**
 * Data Tag Library
 *
 * Defines all available data tags for flexible column mapping.
 * Each tag represents a field that can be imported into various Firestore collections.
 */

export const DATA_TAG_LIBRARY = {
  // ==================== DATE/TIME FIELDS ====================
  date: {
    label: 'Date',
    type: 'date',
    description: 'Primary date field (required for most collections)',
    required: false, // Depends on collection
    collections: ['shiftData', 'hoursData', 'earlyLeaves', 'onPremiseData', 'branchDaily', 'recruiterData'],
    examples: ['2024-01-15', '1/15/2024', '44572'] // Excel serial number
  },
  processDate: {
    label: 'Process Date',
    type: 'date',
    description: 'Date applicant entered system',
    required: false,
    collections: ['applicants'],
    examples: ['2024-01-15', '1/15/2024']
  },
  hireDate: {
    label: 'Hire Date',
    type: 'date',
    description: 'Date employee was hired',
    required: false,
    collections: ['associates'],
    examples: ['2024-01-15', '1/15/2024']
  },
  terminationDate: {
    label: 'Termination Date',
    type: 'date',
    description: 'Date employee was terminated',
    required: false,
    collections: ['associates'],
    examples: ['2024-01-15', '1/15/2024']
  },
  tentativeStartDate: {
    label: 'Tentative Start Date',
    type: 'date',
    description: 'Expected start date for applicant',
    required: false,
    collections: ['applicants'],
    examples: ['2024-01-15', '1/15/2024']
  },
  startDate: {
    label: 'Start Date',
    type: 'date',
    description: 'Assignment start date',
    required: false,
    collections: ['assignmentStarts'],
    examples: ['2024-01-15', '1/15/2024']
  },
  dateAdded: {
    label: 'Date Added',
    type: 'date',
    description: 'Date record was added to system',
    required: false,
    collections: ['dnr'],
    examples: ['2024-01-15', '1/15/2024']
  },
  timeLeft: {
    label: 'Time Left',
    type: 'string',
    description: 'Time someone left early (text format)',
    required: false,
    collections: ['earlyLeaves'],
    examples: ['2:30 PM', '14:30', '2:30']
  },

  // ==================== PEOPLE IDENTIFICATION ====================
  name: {
    label: 'Full Name',
    type: 'string',
    description: 'Full name of person',
    required: false,
    collections: ['applicants', 'associates', 'dnr', 'badges'],
    examples: ['John Doe', 'Jane Smith']
  },
  firstName: {
    label: 'First Name',
    type: 'string',
    description: 'First name only',
    required: false,
    collections: ['applicants', 'dnr'],
    examples: ['John', 'Jane']
  },
  lastName: {
    label: 'Last Name',
    type: 'string',
    description: 'Last name only',
    required: false,
    collections: ['applicants', 'dnr'],
    examples: ['Doe', 'Smith']
  },
  associateName: {
    label: 'Associate Name',
    type: 'string',
    description: 'Name of associate/employee',
    required: false,
    collections: ['earlyLeaves'],
    examples: ['John Doe', 'Jane Smith']
  },
  recruiterName: {
    label: 'Recruiter Name',
    type: 'string',
    description: 'Name of recruiter',
    required: false,
    collections: ['recruiterData'],
    examples: ['Sarah Johnson', 'Mike Williams']
  },
  eid: {
    label: 'Employee ID',
    type: 'string',
    description: 'Employee identification number',
    required: false,
    collections: ['applicants', 'associates', 'earlyLeaves', 'dnr', 'badges'],
    examples: ['12345', 'EMP-001', 'A12345']
  },
  crmNumber: {
    label: 'CRM Number',
    type: 'string',
    description: 'ProLogistix CRM number (also used as EID)',
    required: false,
    collections: ['applicants'],
    examples: ['67890', 'CRM-12345']
  },

  // ==================== CONTACT INFORMATION ====================
  phoneNumber: {
    label: 'Phone Number',
    type: 'phone',
    description: 'Phone number (automatically normalized)',
    required: false,
    collections: ['applicants', 'associates'],
    examples: ['(555) 123-4567', '555-123-4567', '5551234567']
  },
  email: {
    label: 'Email',
    type: 'email',
    description: 'Email address',
    required: false,
    collections: ['applicants', 'associates'],
    examples: ['john@example.com', 'jane.doe@company.com']
  },

  // ==================== SHIFT & ATTENDANCE ====================
  shift: {
    label: 'Shift',
    type: 'enum',
    description: 'Shift identifier (1st, 2nd, or Mid)',
    required: false,
    enum: ['1st', '2nd', 'Mid'],
    collections: ['shiftData', 'earlyLeaves', 'associates', 'applicants', 'onPremiseData'],
    examples: ['1st', '2nd', 'Mid']
  },
  numberWorking: {
    label: 'Number Working',
    type: 'number',
    description: 'Number of associates who showed up',
    required: false,
    collections: ['shiftData'],
    examples: ['48', '52', '45']
  },
  numberRequested: {
    label: 'Number Requested',
    type: 'number',
    description: 'Number of associates requested from staffing',
    required: false,
    collections: ['shiftData'],
    examples: ['50', '55', '45']
  },
  numberRequired: {
    label: 'Number Required',
    type: 'number',
    description: 'Minimum number required for operations',
    required: false,
    collections: ['shiftData'],
    examples: ['45', '50', '40']
  },
  headcount: {
    label: 'Headcount',
    type: 'number',
    description: 'Number of people on premise',
    required: false,
    collections: ['onPremiseData'],
    examples: ['48', '52', '45']
  },
  sendHomes: {
    label: 'Send Homes',
    type: 'number',
    description: 'Number of people sent home (overstaffed)',
    required: false,
    collections: ['shiftData'],
    examples: ['2', '0', '3']
  },
  lineCuts: {
    label: 'Line Cuts',
    type: 'number',
    description: 'Number of line cuts that occurred',
    required: false,
    collections: ['shiftData'],
    examples: ['0', '1', '2']
  },

  // ==================== HOURS ====================
  shift1Hours: {
    label: '1st Shift Hours',
    type: 'number',
    description: 'Total hours worked by 1st shift',
    required: false,
    collections: ['hoursData'],
    examples: ['380', '400', '376']
  },
  shift2Hours: {
    label: '2nd Shift Hours',
    type: 'number',
    description: 'Total hours worked by 2nd shift',
    required: false,
    collections: ['hoursData'],
    examples: ['232', '250', '224']
  },
  totalHours: {
    label: 'Total Hours',
    type: 'number',
    description: 'Total hours (sum of all shifts)',
    required: false,
    collections: ['hoursData'],
    examples: ['612', '650', '600']
  },
  hoursWorked: {
    label: 'Hours Worked',
    type: 'number',
    description: 'Hours worked (generic)',
    required: false,
    collections: ['branchDaily'],
    examples: ['612', '650', '600']
  },

  // ==================== NEW STARTS ====================
  newStarts: {
    label: 'New Starts',
    type: 'complex',
    description: 'New hires (JSON array like [{\"name\":\"John\",\"eid\":\"123\"}] or empty [])',
    required: false,
    collections: ['shiftData', 'onPremiseData'],
    examples: ['[]', '[{"name":"John Doe","eid":"12345"}]', '[{"name":"Jane Smith","eid":"67890"}]']
  },
  newStartsCount: {
    label: 'New Starts (Count)',
    type: 'number',
    description: 'Number of new starts (numeric count)',
    required: false,
    collections: ['branchDaily'],
    examples: ['0', '1', '2', '5']
  },

  // ==================== STATUS FIELDS ====================
  status: {
    label: 'Status',
    type: 'enum',
    description: 'Applicant or employee status',
    required: false,
    enum: ['Started', 'CB Updated', 'Rejected', 'BG Pending', 'Adjudication Pending', 'I-9 Pending', 'Declined', 'No Contact', 'Active', 'Inactive'],
    collections: ['applicants', 'associates'],
    examples: ['Started', 'BG Pending', 'Active']
  },
  i9Cleared: {
    label: 'I-9 Cleared',
    type: 'enum',
    description: 'Whether I-9 is cleared (Yes or blank)',
    required: false,
    enum: ['Yes', ''],
    collections: ['applicants'],
    examples: ['Yes', '']
  },
  backgroundStatus: {
    label: 'Background Status',
    type: 'enum',
    description: 'Background check status',
    required: false,
    enum: ['Valid', 'Pending', 'Flagged'],
    collections: ['applicants'],
    examples: ['Valid', 'Pending', 'Flagged']
  },
  fill: {
    label: 'Fill Status',
    type: 'string',
    description: 'Fill status (freeform)',
    required: false,
    collections: ['applicants'],
    examples: ['Filled', 'Pending', 'Open']
  },
  approved: {
    label: 'Approved',
    type: 'boolean',
    description: 'Whether something is approved (true/false, yes/no)',
    required: false,
    collections: ['earlyLeaves'],
    examples: ['true', 'false', 'yes', 'no']
  },

  // ==================== PERFORMANCE & KPIs ====================
  fillRate: {
    label: 'Fill Rate',
    type: 'number',
    description: 'Fill rate percentage (0-100)',
    required: false,
    collections: ['branchDaily'],
    examples: ['95.5', '100', '87.2']
  },
  attrition: {
    label: 'Attrition',
    type: 'number',
    description: 'Number of terminations/attrition',
    required: false,
    collections: ['branchDaily'],
    examples: ['0', '1', '2', '5']
  },
  applicationsReceived: {
    label: 'Applications Received',
    type: 'number',
    description: 'Number of applications received',
    required: false,
    collections: ['recruiterData'],
    examples: ['10', '15', '20']
  },
  interviewsScheduled: {
    label: 'Interviews Scheduled',
    type: 'number',
    description: 'Number of interviews scheduled',
    required: false,
    collections: ['recruiterData'],
    examples: ['5', '8', '10']
  },
  offers: {
    label: 'Offers',
    type: 'number',
    description: 'Number of offers made',
    required: false,
    collections: ['recruiterData'],
    examples: ['3', '5', '7']
  },
  newHires: {
    label: 'New Hires',
    type: 'number',
    description: 'Number of new hires',
    required: false,
    collections: ['recruiterData'],
    examples: ['2', '4', '6']
  },

  // ==================== METADATA ====================
  position: {
    label: 'Position',
    type: 'string',
    description: 'Job position or title',
    required: false,
    collections: ['associates'],
    examples: ['Warehouse Associate', 'Forklift Operator', 'Picker']
  },
  branch: {
    label: 'Branch',
    type: 'string',
    description: 'Branch name or ID',
    required: false,
    collections: ['branchDaily'],
    examples: ['Louisville', 'Branch-001', 'KY-LOU']
  },
  recruiter: {
    label: 'Recruiter',
    type: 'string',
    description: 'Recruiter assigned to applicant',
    required: false,
    collections: ['applicants'],
    examples: ['Sarah Johnson', 'Mike Williams']
  },
  reason: {
    label: 'Reason',
    type: 'string',
    description: 'Reason for action (e.g., early leave, DNR)',
    required: false,
    collections: ['earlyLeaves', 'dnr'],
    examples: ['Family emergency', 'Sick', 'Personal', 'Policy violation']
  },
  notes: {
    label: 'Notes',
    type: 'string',
    description: 'Freeform notes or comments',
    required: false,
    collections: ['shiftData', 'earlyLeaves', 'applicants', 'associates', 'onPremiseData', 'branchDaily', 'recruiterData'],
    examples: ['Normal day', 'Equipment issues', 'Great performance']
  }
};

/**
 * Collection-specific requirements and field mappings
 */
export const COLLECTION_REQUIREMENTS = {
  shiftData: {
    label: 'Shift Data',
    description: 'Daily shift performance metrics',
    requiredTags: ['date', 'shift', 'numberWorking'],
    optionalTags: ['numberRequested', 'numberRequired', 'sendHomes', 'lineCuts', 'newStarts', 'notes'],
    firestoreCollection: 'shiftData'
  },
  hoursData: {
    label: 'Hours Data',
    description: 'Hours worked by shift',
    requiredTags: ['date'],
    optionalTags: ['shift1Hours', 'shift2Hours', 'totalHours'],
    firestoreCollection: 'hoursData',
    computed: {
      totalHours: (row) => {
        const s1 = parseFloat(row.shift1Hours) || 0;
        const s2 = parseFloat(row.shift2Hours) || 0;
        return s1 + s2;
      }
    }
  },
  applicants: {
    label: 'Applicants',
    description: 'Applicant pipeline tracking',
    requiredTags: ['status', 'eid'],
    optionalTags: ['name', 'firstName', 'lastName', 'phoneNumber', 'email', 'crmNumber', 'processDate', 'i9Cleared', 'backgroundStatus', 'shift', 'notes', 'fill', 'tentativeStartDate', 'recruiter'],
    firestoreCollection: 'applicants',
    computed: {
      name: (row) => {
        if (row.name) return row.name;
        return `${row.firstName || ''} ${row.lastName || ''}`.trim();
      },
      eid: (row) => row.eid || row.crmNumber // Use crmNumber as EID fallback
    }
  },
  earlyLeaves: {
    label: 'Early Leaves',
    description: 'Associates who left early',
    requiredTags: ['associateName'],
    optionalTags: ['date', 'shift', 'eid', 'timeLeft', 'reason', 'approved', 'notes'],
    firestoreCollection: 'earlyLeaves'
  },
  associates: {
    label: 'Associates',
    description: 'Employee master list',
    requiredTags: ['eid', 'name'],
    optionalTags: ['shift', 'phoneNumber', 'email', 'position', 'status', 'hireDate', 'terminationDate', 'notes'],
    firestoreCollection: 'associates'
  },
  onPremiseData: {
    label: 'On-Premise Data',
    description: 'On-site attendance tracking',
    requiredTags: ['date', 'shift'],
    optionalTags: ['headcount', 'newStarts', 'notes'],
    firestoreCollection: 'onPremiseData'
  },
  branchDaily: {
    label: 'Branch Daily Metrics',
    description: 'Daily branch-level KPIs',
    requiredTags: ['date', 'branch'],
    optionalTags: ['fillRate', 'hoursWorked', 'newStartsCount', 'attrition', 'notes'],
    firestoreCollection: 'branchDaily'
  },
  recruiterData: {
    label: 'Recruiter Data',
    description: 'Recruiter performance metrics',
    requiredTags: ['date', 'recruiterName'],
    optionalTags: ['applicationsReceived', 'interviewsScheduled', 'offers', 'newHires', 'notes'],
    firestoreCollection: 'recruiterData'
  },
  dnr: {
    label: 'DNR List',
    description: 'Do Not Rehire list (reference only)',
    requiredTags: [],
    optionalTags: ['name', 'firstName', 'lastName', 'eid', 'reason', 'dateAdded', 'notes'],
    firestoreCollection: 'dnr',
    computed: {
      name: (row) => {
        if (row.name) return row.name;
        return `${row.firstName || ''} ${row.lastName || ''}`.trim();
      }
    }
  },
  badges: {
    label: 'Badge System Export',
    description: 'Badge/access system export',
    requiredTags: ['eid', 'name'],
    optionalTags: ['position', 'status', 'hireDate', 'shift', 'email', 'phoneNumber', 'notes'],
    firestoreCollection: 'badges'
  },
  assignmentStarts: {
    label: 'Assignment Starts',
    description: 'New assignment start tracking',
    requiredTags: ['eid', 'name', 'startDate'],
    optionalTags: ['position', 'shift', 'status', 'notes'],
    firestoreCollection: 'associates',
    computed: {
      hireDate: (row) => row.startDate // Map startDate to hireDate for associates
    }
  }
};

/**
 * Get tags available for a specific collection
 */
export const getTagsForCollection = (collectionKey) => {
  const tags = {};
  Object.entries(DATA_TAG_LIBRARY).forEach(([key, value]) => {
    if (value.collections.includes(collectionKey)) {
      tags[key] = value;
    }
  });
  return tags;
};

/**
 * Get required tags for a collection
 */
export const getRequiredTags = (collectionKey) => {
  return COLLECTION_REQUIREMENTS[collectionKey]?.requiredTags || [];
};

/**
 * Get optional tags for a collection
 */
export const getOptionalTags = (collectionKey) => {
  return COLLECTION_REQUIREMENTS[collectionKey]?.optionalTags || [];
};

/**
 * Suggest tag based on column name using fuzzy matching
 */
export const suggestTag = (columnName, collectionKey) => {
  const normalized = columnName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const availableTags = getTagsForCollection(collectionKey);

  // Exact match
  if (availableTags[normalized]) {
    return normalized;
  }

  // Check tag labels and common variations
  const variations = {
    'date': ['date', 'workdate', 'day', 'dateofwork'],
    'processDate': ['processdate', 'dateprocessed', 'entrydate'],
    'startDate': ['startdate', 'assignmentstart', 'hiredate', 'begindate'],
    'dateAdded': ['dateadded', 'added', 'createdate'],
    'shift': ['shift', 'shifttype', 'shiftname', '1stor2nd'],
    'numberWorking': ['numberworking', 'working', 'numworking', 'presentassociates', 'associatespresent', 'attendees'],
    'numberRequested': ['numberrequested', 'requested', 'numrequested', 'associatesrequested'],
    'numberRequired': ['numberrequired', 'required', 'numrequired', 'minimumrequired'],
    'name': ['name', 'fullname', 'employeename', 'associate', 'associatename'],
    'firstName': ['firstname', 'fname', 'givenname', 'first'],
    'lastName': ['lastname', 'lname', 'surname', 'familyname', 'last'],
    'phoneNumber': ['phonenumber', 'phone', 'mobile', 'cellphone', 'telephone', 'contact'],
    'email': ['email', 'emailaddress', 'e mail', 'mail'],
    'eid': ['eid', 'employeeid', 'empid', 'associateid', 'id', 'employeenumber'],
    'crmNumber': ['crmnumber', 'crm', 'crmid', 'plxid'],
    'shift1Hours': ['shift1hours', '1sthours', 'firstshifthours', 's1hours'],
    'shift2Hours': ['shift2hours', '2ndhours', 'secondshifthours', 's2hours'],
    'totalHours': ['totalhours', 'total', 'allhours'],
    'status': ['status', 'currentstatus', 'applicantstatus', 'employmentstatus'],
    'position': ['position', 'jobtitle', 'title', 'role'],
    'reason': ['reason', 'notes', 'comments'],
    'timeLeft': ['timeleft', 'lefttime', 'departuretime', 'exittime'],
    'associateName': ['associatename', 'associate', 'employeename', 'name'],
    'newStarts': ['newstarts', 'newhires', 'starts'],
    'sendHomes': ['sendhomes', 'senthome', 'overstaffed'],
    'lineCuts': ['linecuts', 'cuts'],
    'notes': ['notes', 'comments', 'remarks', 'note', 'comment']
  };

  for (const [tag, patterns] of Object.entries(variations)) {
    if (availableTags[tag] && patterns.some(p => normalized.includes(p) || p.includes(normalized))) {
      return tag;
    }
  }

  return null;
};

export default DATA_TAG_LIBRARY;
