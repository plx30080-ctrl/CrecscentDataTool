# Flexible Upload System with Column Mapping

## Overview

A general-purpose upload feature that allows users to upload ANY spreadsheet or CSV format and map columns to predefined KPI data tags. This eliminates the need for specific column names and template formats, making data import flexible and user-friendly.

## Current Data Collections & Fields

Based on analysis of existing codebase, we have the following Firestore collections:

### 1. **shiftData** Collection
Tracks daily shift performance metrics.

**Required Fields:**
- `date` (Date) - The date of the shift
- `shift` (String) - Either "1st" or "2nd"
- `numberWorking` (Number) - Number of associates who showed up

**Optional Fields:**
- `numberRequested` (Number) - How many associates requested from staffing
- `numberRequired` (Number) - Minimum required for operations
- `sendHomes` (Number) - Number sent home due to overstaffing
- `lineCuts` (Number) - Number of line cuts that occurred
- `newStarts` (Array) - New hires who started: `[{name, eid}]`
- `notes` (String) - Any notes for that day/shift

**Auto-added Fields:**
- `submittedBy` (String) - User ID who submitted
- `submittedAt` (Timestamp) - When submitted

**KPI Tags:** `date`, `shift`, `numberWorking`, `numberRequested`, `numberRequired`, `sendHomes`, `lineCuts`, `newStarts`, `notes`

---

### 2. **hoursData** Collection
Tracks hours worked by shift.

**Required Fields:**
- `date` (Date) - The date
- `shift1Hours` (Number) - Total hours worked by 1st shift
- `shift2Hours` (Number) - Total hours worked by 2nd shift
- `totalHours` (Number) - Sum of shift1Hours + shift2Hours

**Optional Fields:**
- `associateHours` (Array) - Breakdown by associate (future use)

**Auto-added Fields:**
- `submittedBy` (String) - User ID
- `submittedAt` (Timestamp) - When submitted

**KPI Tags:** `date`, `shift1Hours`, `shift2Hours`, `totalHours`

---

### 3. **applicants** Collection
Tracks applicant pipeline from application to hire.

**Required Fields:**
- `name` (String) - Full name or separated firstName/lastName
- `status` (String) - One of: Started, CB Updated, Rejected, BG Pending, Adjudication Pending, I-9 Pending, Declined, No Contact
- `crmNumber` (String) - ProLogistix CRM ID (also used as eid)
- `processDate` (Date) - Date entered into system

**Optional Fields:**
- `firstName` (String) - First name (if name not provided)
- `lastName` (String) - Last name (if name not provided)
- `phoneNumber` (String) - Phone number (normalized to digits only)
- `email` (String) - Email address
- `eid` (String) - Employee ID (defaults to crmNumber)
- `i9Cleared` (String) - "Yes" or empty
- `backgroundStatus` (String) - Valid, Pending, or Flagged
- `shift` (String) - 1st, 2nd, or Mid
- `notes` (String) - Any notes
- `fill` (String) - Fill status
- `tentativeStartDate` (Date) - Expected start date
- `recruiter` (String) - Recruiter name
- `photoURL` (String) - Profile photo URL

**Auto-added Fields:**
- `createdBy` (String) - User ID
- `createdAt` (Timestamp) - When created
- `updatedAt` (Timestamp) - When updated

**KPI Tags:** `date`, `name`, `firstName`, `lastName`, `status`, `crmNumber`, `eid`, `processDate`, `phoneNumber`, `email`, `i9Cleared`, `backgroundStatus`, `shift`, `notes`, `fill`, `tentativeStartDate`, `recruiter`

---

### 4. **earlyLeaves** Collection
Tracks associates who left early.

**Required Fields:**
- `date` (Date) - Date of early leave
- `shift` (String) - 1st, 2nd, or Mid
- `associateName` (String) - Name of associate
- `eid` (String) - Employee ID

**Optional Fields:**
- `timeLeft` (String) - Time they left (e.g., "2:30 PM")
- `reason` (String) - Reason for leaving early
- `approved` (Boolean) - Whether approved
- `notes` (String) - Additional notes

**Auto-added Fields:**
- `submittedBy` (String) - User ID
- `submittedAt` (Timestamp) - When submitted

**KPI Tags:** `date`, `shift`, `associateName`, `eid`, `timeLeft`, `reason`, `approved`, `notes`

---

### 5. **associates** Collection
Master list of associates/employees.

**Required Fields:**
- `eid` (String) - Employee ID
- `name` (String) - Full name
- `shift` (String) - 1st, 2nd, or Mid

**Optional Fields:**
- `phoneNumber` (String) - Phone number
- `email` (String) - Email address
- `position` (String) - Job position
- `status` (String) - Active, Inactive, etc.
- `hireDate` (Date) - Date hired
- `terminationDate` (Date) - Date terminated (if applicable)
- `notes` (String) - Any notes

**Auto-added Fields:**
- `createdBy` (String) - User ID
- `createdAt` (Timestamp) - When created
- `updatedAt` (Timestamp) - When updated

**KPI Tags:** `eid`, `name`, `shift`, `phoneNumber`, `email`, `position`, `status`, `hireDate`, `terminationDate`, `notes`

---

### 6. **onPremiseData** Collection
Tracks on-premise attendance and new starts.

**Required Fields:**
- `date` (Date) - The date
- `shift` (String) - 1st, 2nd, or Mid

**Optional Fields:**
- `headcount` (Number) - Number of people on site
- `newStarts` (Array) - New hires who started: `[{name, eid}]`
- `notes` (String) - Any notes

**Auto-added Fields:**
- `submittedBy` (String) - User ID
- `submittedAt` (Timestamp) - When submitted

**KPI Tags:** `date`, `shift`, `headcount`, `newStarts`, `notes`

---

### 7. **branchDaily** Collection
Daily branch-level metrics.

**Required Fields:**
- `date` (Date) - The date
- `branch` (String) - Branch name/ID

**Optional Fields:**
- `fillRate` (Number) - Fill rate percentage (0-100)
- `hoursWorked` (Number) - Total hours worked
- `newStarts` (Number) - Number of new starts
- `attrition` (Number) - Number of terminations
- `notes` (String) - Any notes

**Auto-added Fields:**
- `submittedBy` (String) - User ID
- `submittedAt` (Timestamp) - When submitted

**KPI Tags:** `date`, `branch`, `fillRate`, `hoursWorked`, `newStarts`, `attrition`, `notes`

---

### 8. **recruiterData** Collection
Recruiter performance metrics.

**Required Fields:**
- `date` (Date) - The date
- `recruiterName` (String) - Name of recruiter

**Optional Fields:**
- `applicationsReceived` (Number) - Applications processed
- `interviewsScheduled` (Number) - Interviews scheduled
- `offers` (Number) - Offers made
- `newHires` (Number) - New hires
- `notes` (String) - Any notes

**Auto-added Fields:**
- `submittedBy` (String) - User ID
- `submittedAt` (Timestamp) - When submitted

**KPI Tags:** `date`, `recruiterName`, `applicationsReceived`, `interviewsScheduled`, `offers`, `newHires`, `notes`

---

## Complete Data Tag Library

### Date/Time Tags
- `date` - Primary date field (YYYY-MM-DD or Excel serial)
- `processDate` - Date applicant entered system
- `hireDate` - Date employee was hired
- `terminationDate` - Date employee was terminated
- `tentativeStartDate` - Expected start date
- `timeLeft` - Time someone left (string format)

### People Identification Tags
- `name` - Full name
- `firstName` - First name
- `lastName` - Last name
- `associateName` - Associate/employee name
- `recruiterName` - Recruiter name
- `eid` - Employee ID
- `crmNumber` - ProLogistix CRM number

### Contact Information Tags
- `phoneNumber` - Phone number (auto-normalized)
- `email` - Email address

### Shift & Attendance Tags
- `shift` - Shift identifier (1st, 2nd, Mid)
- `numberWorking` - Number who showed up
- `numberRequested` - Number requested from staffing
- `numberRequired` - Minimum required
- `headcount` - Number on premise
- `sendHomes` - Number sent home
- `lineCuts` - Number of line cuts

### Hours Tags
- `shift1Hours` - 1st shift hours
- `shift2Hours` - 2nd shift hours
- `totalHours` - Total hours
- `hoursWorked` - Hours worked (generic)

### New Starts Tags
- `newStarts` - Array or count of new starts

### Applicant Status Tags
- `status` - Applicant/employee status
- `i9Cleared` - I-9 cleared (Yes/No)
- `backgroundStatus` - Background check status (Valid/Pending/Flagged)
- `fill` - Fill status
- `approved` - Approval status (boolean)

### Performance & KPI Tags
- `fillRate` - Fill rate percentage
- `attrition` - Attrition count
- `applicationsReceived` - Applications received
- `interviewsScheduled` - Interviews scheduled
- `offers` - Offers made
- `newHires` - New hires count

### Metadata Tags
- `position` - Job position
- `branch` - Branch name/ID
- `reason` - Reason (e.g., for early leave)
- `notes` - Freeform notes
- `photoURL` - Photo URL

---

## Data Tag Definitions (for Implementation)

```javascript
export const DATA_TAG_LIBRARY = {
  // Date/Time Fields
  date: {
    label: 'Date',
    type: 'date',
    description: 'Primary date field',
    required: true,
    collections: ['shiftData', 'hoursData', 'earlyLeaves', 'onPremiseData', 'branchDaily', 'recruiterData']
  },
  processDate: {
    label: 'Process Date',
    type: 'date',
    description: 'Date applicant entered system',
    required: false,
    collections: ['applicants']
  },
  hireDate: {
    label: 'Hire Date',
    type: 'date',
    description: 'Date employee was hired',
    required: false,
    collections: ['associates']
  },
  terminationDate: {
    label: 'Termination Date',
    type: 'date',
    description: 'Date employee was terminated',
    required: false,
    collections: ['associates']
  },
  tentativeStartDate: {
    label: 'Tentative Start Date',
    type: 'date',
    description: 'Expected start date',
    required: false,
    collections: ['applicants']
  },
  timeLeft: {
    label: 'Time Left',
    type: 'string',
    description: 'Time someone left (e.g., "2:30 PM")',
    required: false,
    collections: ['earlyLeaves']
  },

  // People Identification
  name: {
    label: 'Full Name',
    type: 'string',
    description: 'Full name of person',
    required: false,
    collections: ['applicants', 'associates']
  },
  firstName: {
    label: 'First Name',
    type: 'string',
    description: 'First name',
    required: false,
    collections: ['applicants']
  },
  lastName: {
    label: 'Last Name',
    type: 'string',
    description: 'Last name',
    required: false,
    collections: ['applicants']
  },
  associateName: {
    label: 'Associate Name',
    type: 'string',
    description: 'Name of associate/employee',
    required: false,
    collections: ['earlyLeaves']
  },
  recruiterName: {
    label: 'Recruiter Name',
    type: 'string',
    description: 'Name of recruiter',
    required: false,
    collections: ['recruiterData']
  },
  eid: {
    label: 'Employee ID',
    type: 'string',
    description: 'Employee identification number',
    required: false,
    collections: ['applicants', 'associates', 'earlyLeaves']
  },
  crmNumber: {
    label: 'CRM Number',
    type: 'string',
    description: 'ProLogistix CRM number',
    required: false,
    collections: ['applicants']
  },

  // Contact Information
  phoneNumber: {
    label: 'Phone Number',
    type: 'phone',
    description: 'Phone number (auto-normalized)',
    required: false,
    collections: ['applicants', 'associates']
  },
  email: {
    label: 'Email',
    type: 'email',
    description: 'Email address',
    required: false,
    collections: ['applicants', 'associates']
  },

  // Shift & Attendance
  shift: {
    label: 'Shift',
    type: 'enum',
    description: 'Shift identifier',
    required: false,
    enum: ['1st', '2nd', 'Mid'],
    collections: ['shiftData', 'earlyLeaves', 'associates', 'applicants', 'onPremiseData']
  },
  numberWorking: {
    label: 'Number Working',
    type: 'number',
    description: 'Number of associates who showed up',
    required: false,
    collections: ['shiftData']
  },
  numberRequested: {
    label: 'Number Requested',
    type: 'number',
    description: 'Number requested from staffing',
    required: false,
    collections: ['shiftData']
  },
  numberRequired: {
    label: 'Number Required',
    type: 'number',
    description: 'Minimum required for operations',
    required: false,
    collections: ['shiftData']
  },
  headcount: {
    label: 'Headcount',
    type: 'number',
    description: 'Number of people on premise',
    required: false,
    collections: ['onPremiseData']
  },
  sendHomes: {
    label: 'Send Homes',
    type: 'number',
    description: 'Number sent home',
    required: false,
    collections: ['shiftData']
  },
  lineCuts: {
    label: 'Line Cuts',
    type: 'number',
    description: 'Number of line cuts',
    required: false,
    collections: ['shiftData']
  },

  // Hours
  shift1Hours: {
    label: '1st Shift Hours',
    type: 'number',
    description: 'Total hours worked by 1st shift',
    required: false,
    collections: ['hoursData']
  },
  shift2Hours: {
    label: '2nd Shift Hours',
    type: 'number',
    description: 'Total hours worked by 2nd shift',
    required: false,
    collections: ['hoursData']
  },
  totalHours: {
    label: 'Total Hours',
    type: 'number',
    description: 'Total hours (sum of all shifts)',
    required: false,
    collections: ['hoursData']
  },
  hoursWorked: {
    label: 'Hours Worked',
    type: 'number',
    description: 'Hours worked (generic)',
    required: false,
    collections: ['branchDaily']
  },

  // New Starts
  newStarts: {
    label: 'New Starts',
    type: 'complex',
    description: 'New hires (array of {name, eid} or count)',
    required: false,
    collections: ['shiftData', 'onPremiseData', 'branchDaily']
  },

  // Status Fields
  status: {
    label: 'Status',
    type: 'enum',
    description: 'Applicant or employee status',
    required: false,
    enum: ['Started', 'CB Updated', 'Rejected', 'BG Pending', 'Adjudication Pending', 'I-9 Pending', 'Declined', 'No Contact', 'Active', 'Inactive'],
    collections: ['applicants', 'associates']
  },
  i9Cleared: {
    label: 'I-9 Cleared',
    type: 'enum',
    description: 'I-9 cleared status',
    required: false,
    enum: ['Yes', ''],
    collections: ['applicants']
  },
  backgroundStatus: {
    label: 'Background Status',
    type: 'enum',
    description: 'Background check status',
    required: false,
    enum: ['Valid', 'Pending', 'Flagged'],
    collections: ['applicants']
  },
  fill: {
    label: 'Fill Status',
    type: 'string',
    description: 'Fill status',
    required: false,
    collections: ['applicants']
  },
  approved: {
    label: 'Approved',
    type: 'boolean',
    description: 'Approval status',
    required: false,
    collections: ['earlyLeaves']
  },

  // Performance & KPIs
  fillRate: {
    label: 'Fill Rate',
    type: 'number',
    description: 'Fill rate percentage (0-100)',
    required: false,
    collections: ['branchDaily']
  },
  attrition: {
    label: 'Attrition',
    type: 'number',
    description: 'Attrition count',
    required: false,
    collections: ['branchDaily']
  },
  applicationsReceived: {
    label: 'Applications Received',
    type: 'number',
    description: 'Number of applications received',
    required: false,
    collections: ['recruiterData']
  },
  interviewsScheduled: {
    label: 'Interviews Scheduled',
    type: 'number',
    description: 'Number of interviews scheduled',
    required: false,
    collections: ['recruiterData']
  },
  offers: {
    label: 'Offers',
    type: 'number',
    description: 'Number of offers made',
    required: false,
    collections: ['recruiterData']
  },
  newHires: {
    label: 'New Hires',
    type: 'number',
    description: 'Number of new hires',
    required: false,
    collections: ['recruiterData']
  },

  // Metadata
  position: {
    label: 'Position',
    type: 'string',
    description: 'Job position/title',
    required: false,
    collections: ['associates']
  },
  branch: {
    label: 'Branch',
    type: 'string',
    description: 'Branch name or ID',
    required: false,
    collections: ['branchDaily']
  },
  reason: {
    label: 'Reason',
    type: 'string',
    description: 'Reason (e.g., for early leave)',
    required: false,
    collections: ['earlyLeaves']
  },
  notes: {
    label: 'Notes',
    type: 'string',
    description: 'Freeform notes/comments',
    required: false,
    collections: ['shiftData', 'earlyLeaves', 'applicants', 'associates', 'onPremiseData', 'branchDaily', 'recruiterData']
  }
};
```

---

## UI Design: Flexible Upload Flow

### Step 1: Upload File
- User uploads CSV or Excel file
- System parses and displays preview of first 10 rows
- Shows all detected columns

### Step 2: Select Target Collection
- User selects which collection to import to:
  - Shift Data
  - Hours Data
  - Applicants
  - Early Leaves
  - Associates
  - On-Premise Data
  - Branch Daily
  - Recruiter Data

### Step 3: Map Columns to Data Tags
- For each column in the uploaded file:
  - Show column name
  - Show sample values (first 3 rows)
  - Dropdown to select data tag from library
  - Option to "Skip Column" (ignore)
  - Smart suggestions based on column name matching

### Step 4: Validation
- Validate that required fields for target collection are mapped
- Show warnings for:
  - Missing required fields
  - Invalid data types
  - Duplicate column mappings
- Allow user to fix issues

### Step 5: Confirm & Import
- Show summary:
  - Target collection
  - Number of rows to import
  - Field mapping table
- Import button with progress indicator
- Success/error feedback

---

## Technical Implementation

### New Component: `FlexibleUpload.jsx`

**Features:**
- File upload (CSV/Excel)
- Collection selector dropdown
- Dynamic column mapping interface
- Smart column name matching
- Validation engine
- Import progress tracking

### New Service Functions in `firestoreService.js`

```javascript
// Generic bulk upload function
export const flexibleBulkUpload = async (collection, mappedData, userId) => {
  // Handles uploading to any collection with proper field mapping
}

// Validation function
export const validateFlexibleUpload = (collection, mappings, data) => {
  // Validates that required fields are present
  // Returns validation errors
}
```

### Data Tag Library Module: `dataTagLibrary.js`

Contains the complete `DATA_TAG_LIBRARY` object with all field definitions.

---

## Benefits

1. **Flexibility**: Users can upload ANY spreadsheet format without reformatting
2. **User-Friendly**: Visual column mapping instead of strict templates
3. **Reusable**: One upload interface for all 8 data collections
4. **Smart**: Auto-suggests mappings based on column names
5. **Safe**: Validates before import to prevent bad data
6. **Extensible**: Easy to add new collections and tags in the future

---

## Future Enhancements

1. **Save Mapping Templates**: Allow users to save column mappings for reuse
2. **Transform Functions**: Add data transformation options (e.g., uppercase, date format conversion)
3. **Duplicate Detection**: Check for duplicates before import
4. **Partial Import**: Allow importing only selected rows
5. **Import History**: Track all imports with ability to rollback
6. **Export Templates**: Generate blank templates for each collection

---

## Example Use Cases

### Use Case 1: Importing Shift Data from Different Format
**Current:** User has spreadsheet with columns: "Work Date", "1st or 2nd", "Associates Present"
**Solution:**
1. Upload file
2. Select "Shift Data" collection
3. Map: "Work Date" → `date`, "1st or 2nd" → `shift`, "Associates Present" → `numberWorking`
4. Import!

### Use Case 2: Importing ProLogistix Applicant Export
**Current:** User exports from ProLogistix with non-standard column names
**Solution:**
1. Upload Excel file
2. Select "Applicants" collection
3. Map columns to tags (system auto-suggests based on similarity)
4. Import with validation

### Use Case 3: Importing Weekly Hours Report
**Current:** User has report with "Week Ending", "Shift 1 Total", "Shift 2 Total"
**Solution:**
1. Upload CSV
2. Select "Hours Data" collection
3. Map: "Week Ending" → `date`, "Shift 1 Total" → `shift1Hours`, "Shift 2 Total" → `shift2Hours`
4. Import (system auto-calculates `totalHours`)

---

## Next Steps

1. Create `dataTagLibrary.js` module with complete tag definitions
2. Build `FlexibleUpload.jsx` component with mapping UI
3. Add `flexibleBulkUpload()` function to `firestoreService.js`
4. Integrate into EnhancedUpload page as new tab
5. Test with various spreadsheet formats
6. Document user guide with examples
