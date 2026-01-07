# Firestore Database Schema - V3

**Last Updated**: January 2026  
**Version**: 3.0  
**Status**: Production

## Overview

The V3 schema consists of **7 core collections**, streamlined from the original 13 collections. This consolidation improves maintainability, reduces query complexity, and provides a single source of truth for associate data.

---

## Collections Structure

### 1) users
Core user directory for authentication and role management.

```javascript
{
  uid: "firebase_auth_uid",
  email: "user@example.com",
  displayName: "John Doe",
  role: "Market Manager" | "Recruiter" | "On-Site Manager" | "admin",
  branch: "Main",
  createdAt: timestamp,
  lastLogin: timestamp,
  photoURL: string? // optional profile photo
}
```

**Indexes**: Single field indexes on `email` and `role`.

---

### 2) onPremiseData
Daily headcount and staffing snapshot by shift.

```javascript
{
  date: timestamp,              // day (midnight UTC)
  shift: "1st" | "2nd",
  requested: number,            // Client requested headcount
  required: number,             // Client required headcount
  working: number,              // Actual attendance
  newStarts: number,            // Count of new starts
  sendHomes: number,            // Number of send homes
  lineCuts: number,             // Number of line cuts
  newStartEIDs: [string],       // Array of EIDs for new starts
  eidValidation: [              // Validation data for new starts
    {
      eid: string,
      status: "valid" | "invalid",
      message: string,
      applicantData: object?
    }
  ],
  employeeData: object?,        // Parsed employee data from file upload
  fileName: string?,            // Name of uploaded file
  notes: string,
  submittedBy: string,          // email
  submittedByUid: string,
  submittedAt: timestamp
}
```

**Composite Indexes**:
- `date` (desc) + `shift` (asc)

---

### 3) hoursData
Weekly hours worked with nested shift structures and daily breakdowns.

```javascript
{
  weekEnding: timestamp,        // Week ending date (Sunday)
  shift1: {
    total: number,              // 1st shift total hours
    direct: number,             // 1st shift direct hours
    indirect: number,           // 1st shift indirect hours
    byDate: {                   // Daily breakdown
      "2026-01-06": {
        direct: number,
        indirect: number,
        total: number
      },
      // ... more dates
    }
  },
  shift2: {
    total: number,              // 2nd shift total hours
    direct: number,             // 2nd shift direct hours
    indirect: number,           // 2nd shift indirect hours
    byDate: {                   // Daily breakdown
      "2026-01-06": {
        direct: number,
        indirect: number,
        total: number
      },
      // ... more dates
    }
  },
  employeeCount: number,        // Number of employees
  employeeIds: [string],        // Array of EIDs
  employeeDetails: [            // Per-employee details
    {
      eid: string,
      name: string,
      shift: 1 | 2,
      hours: number,
      directHours: number,
      indirectHours: number
    }
  ],
  fileName: string?,            // Source file name
  submittedBy: string,          // email
  submittedByUid: string,
  submittedAt: timestamp
}
```

**Composite Indexes**:
- `weekEnding` (desc)

---

### 4) branchMetrics
Unified branch and recruiter performance metrics (replaces recruiterData + branchDaily + branchWeekly).

```javascript
{
  date: timestamp?,             // For daily metrics
  weekEnding: timestamp?,       // For weekly summaries
  branch: "Main" | string,
  shift: 1 | 2,
  isWeeklySummary: boolean?,    // Flag for weekly vs daily
  recruiterStats: {
    interviewsScheduled: number,
    interviewShows: number,
    shift1Processed: number,
    shift2Processed: number,
    shift2Confirmations: number,
    nextDayConfirmations: number,
    totalApplicants: number?,   // Weekly summary field
    totalProcessed: number?     // Weekly summary field
  },
  dailyMetrics: {
    onPremise: number?,         // Daily headcount
    scheduled: number?,         // Scheduled associates
    attendance: number?,        // Attendance percentage
    totalHeadcount: number?     // Weekly summary field
  },
  notes: string,
  submittedBy: string,
  submittedByUid: string,
  submittedAt: timestamp
}
```

**Composite Indexes**:
- `date` (desc) + `branch` (asc)
- `weekEnding` (desc) + `isWeeklySummary` (asc)

---

### 5) earlyLeaves
Early departure tracking for retention analysis.

```javascript
{
  date: timestamp,
  shift: "1st" | "2nd" | 1 | 2,
  eid: string,                  // Employee ID
  name: string,
  associateId: string?,         // Link to associates doc
  leaveTime: string,            // Time of departure (HH:mm or timestamp)
  departureTime: string?,       // Alternative field name
  scheduledEnd: string?,        // Scheduled end time
  reason: string,               // Reason for early leave
  correctiveAction: string?,    // Disciplinary action taken
  notes: string?,
  createdAt: timestamp,
  createdBy: string?,
  updatedAt: timestamp?
}
```

**Composite Indexes**:
- `date` (desc) + `shift` (asc)
- `eid` (asc) + `date` (desc)

---

### 6) associates
Single source of truth for all associates (replaces applicants + dnrList).

```javascript
{
  eid: string,                  // Employee ID (primary key)
  firstName: string,
  lastName: string,
  name: string?,                // Full name (computed or stored)
  email: string?,
  phone: string?,
  
  // V3 Status Fields
  status: "Active" | "Inactive" | "DNR" | "Terminated",
  pipelineStatus: "Applied" | "Interviewing" | "Background Check" | "Orientation" | "Started" | "Declined",
  
  // Dates
  createdAt: timestamp,
  startDate: timestamp?,        // First day worked
  terminationDate: timestamp?,
  lastModified: timestamp,
  
  // Work Details
  shift: 1 | 2 | "1st" | "2nd",
  shiftPreference: string?,
  branch: string,
  daysWorked: number?,
  totalHoursWorked: number?,
  
  // Recruitment
  recruiter: string,            // Recruiter name
  recruiterUid: string?,
  processDate: timestamp?,
  plannedStartDate: timestamp?,
  
  // Additional Fields
  badgeNumber: string?,
  photoURL: string?,
  i9Cleared: boolean?,
  backgroundCheckStatus: string?,
  notes: string?,
  
  // Termination (if applicable)
  terminationReason: string?,
  eligibleForRehire: boolean?
}
```

**Composite Indexes**:
- `pipelineStatus` (asc) + `recruiter` (asc)
- `status` (asc) + `startDate` (desc)
- `recruiter` (asc) + `startDate` (desc)

**Key Changes from Legacy**:
- `status`: Employment status (Active/DNR/Terminated) - **DNR is now a status value, not a separate collection**
- `pipelineStatus`: Recruitment stage (Applied/Interviewing/Started)
- Replaces separate `applicants` and `dnrList` collections

---

### 7) badges
Badge assignments and print tracking.

```javascript
{
  eid: string,                  // Link to associates
  name: string,
  badgeNumber: string,          // Badge ID
  status: "Active" | "Inactive" | "Clear" | "Not Clear" | "Tentative",
  photoURL: string?,            // Badge photo
  assignedDate: timestamp,
  returnedDate: timestamp?,
  lastPrintAt: timestamp?,
  printCount: number,
  branch: string?,
  notes: string?,
  createdAt: timestamp,
  createdBy: string?,
  updatedAt: timestamp?
}
```

**Composite Indexes**:
- `status` (asc) + `assignedDate` (desc)

---

## Removed Collections (Legacy)

The following collections **NO LONGER EXIST** in V3:

1. **applicants** → Merged into `associates` with `pipelineStatus` field
2. **shiftData** → Replaced by `onPremiseData`
3. **recruiterData** → Merged into `branchMetrics`
4. **branchDaily** → Merged into `branchMetrics`
5. **branchWeekly** → Merged into `branchMetrics` (with `isWeeklySummary` flag)
6. **laborReports** → Replaced by `hoursData` with nested shift structure
7. **dnrList** → Now a `status` value in `associates`

---

## Data Migration Notes

### Applicants → Associates
- `applicants.status` → `associates.pipelineStatus`
- New field: `associates.status` for employment status
- DNR list consolidated into `associates.status = 'DNR'`

### Labor Reports → Hours Data
- Flat structure → Nested `shift1` and `shift2` objects
- Added `byDate` for daily breakdown within each shift
- Week-based grouping instead of daily

### Branch Data → Branch Metrics
- `recruiterData` + `branchDaily` → Single `branchMetrics` document
- Daily metrics use `date` field
- Weekly summaries use `weekEnding` + `isWeeklySummary: true`

---

## Query Patterns

### Get Pipeline Counts
```javascript
const associates = await getAssociates();
const counts = {
  applied: associates.filter(a => a.pipelineStatus === 'Applied').length,
  started: associates.filter(a => a.pipelineStatus === 'Started').length
};
```

### Get DNR List
```javascript
const associates = await getAssociates();
const dnrList = associates.filter(a => a.status === 'DNR');
```

### Get Active Associates
```javascript
const associates = await getAssociates();
const active = associates.filter(a => a.status === 'Active');
```

### Get Hours by Week
```javascript
const hours = await getHoursData(startDate, endDate);
const weeklyTotals = hours.map(week => ({
  weekEnding: week.weekEnding,
  shift1Total: week.shift1.total,
  shift2Total: week.shift2.total,
  grandTotal: week.shift1.total + week.shift2.total
}));
```

---

## Security Rules

Firestore rules restrict access to the 7 V3 collections only:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write V3 collections
    match /{collection}/{document=**} {
      allow read, write: if request.auth != null && 
        collection in ['users', 'onPremiseData', 'hoursData', 
                       'branchMetrics', 'earlyLeaves', 'associates', 'badges'];
    }
  }
}
```

---

## Composite Indexes

All composite indexes are defined in [firestore.indexes.json](./firestore.indexes.json):

- Associates: `pipelineStatus` + `recruiter`, `status` + `startDate`
- OnPremiseData: `date` + `shift`
- HoursData: `weekEnding` (desc)
- BranchMetrics: `date` + `branch`, `weekEnding` + `isWeeklySummary`
- EarlyLeaves: `date` + `shift`, `eid` + `date`
- Badges: `status` + `assignedDate`

Deploy indexes with: `firebase deploy --only firestore:indexes`

---

## API Reference

See [V3_API_REFERENCE.md](./V3_API_REFERENCE.md) for complete API documentation.

---

## Related Documentation

- [V3_MIGRATION_COMPLETE.md](./V3_MIGRATION_COMPLETE.md) - Migration summary
- [V3_API_REFERENCE.md](./V3_API_REFERENCE.md) - API documentation
- [firestoreService.js](./src/services/firestoreService.js) - Service implementation

---

**Status**: ✅ Production Schema - V3.0  
**Last Updated**: January 2026


### 1) users
Core user directory.

```javascript
{
  uid: "firebase_auth_uid",
  email: "user@example.com",
  displayName: "John Doe",
  role: "Market Manager", // "Market Manager" | "Recruiter" | "On-Site Manager" | "admin"
  createdAt: timestamp,
  lastLogin: timestamp
}
```

### 2) onPremiseData
Daily headcount and staffing snapshot by shift.

```javascript
{
  date: timestamp,        // day (normalize to midnight UTC or local)
  shift: "1st" | "2nd",
  numberRequested: number,      // Client request
  numberRequired: number,        // Client expectation
  numberWorking: number,         // Actual attendance
  newStarts: [            // array of new starts for that shift
    {
      name: string,
      eid: string
    }
  ],
  sendHomes: number,             // Number of send homes
  lineCuts: number,              // Number of line cuts
  submittedBy: uid,
  submittedAt: timestamp,
  notes: string
}
```

### 3) hoursData
Hours worked by shift with direct/indirect breakdown and per-associate details.

```javascript
{
  date: timestamp,
  shift1: {
    total: number,            // 1st shift total hours worked
    direct: number,           // 1st shift direct hours
    indirect: number          // 1st shift indirect hours
  },
  shift2: {
    total: number,            // 2nd shift total hours worked
    direct: number,           // 2nd shift direct hours
    indirect: number          // 2nd shift indirect hours
  },
  totalHours: number,         // overall hours for the day
  associateHours: [           // optional per-associate detail
    {
      eid: string,
      name: string,
      hours: number,
      shift: "1st" | "2nd"
    }
  ],
  createdAt: timestamp?,
  updatedAt: timestamp?
}
```

### 4) branchMetrics
Recruiter/branch daily activity metrics.

```javascript
{
  date: timestamp,
  recruiterName: string,
  recruiterUid: uid,
  interviewsScheduled: number,
  interviewShows: number,
  applicantsProcessed: number,
  applicantsCount: number,    // total applicants in pipeline that day
  dailyNotes: string?,
  createdAt: timestamp?,
  updatedAt: timestamp?
}
```

### 5) earlyLeaves
Early leave incidents.

```javascript
{
  date: timestamp,
  shift: "1st" | "2nd",
  leaveTime: string,          // clock-out time (string or HH:mm)
  reason: string,
  correctiveAction: string,   // e.g. verbal/written/final warning/none
  notes: string?,
  eid: string?,               // optional link to associate
  name: string?,              // optional name for reference
  createdAt: timestamp?,
  updatedAt: timestamp?
}
```

### 6) associates
Single source of truth for all people (replaces separate applicants).

```javascript
{
  eid: string,                 // Employee ID (primary key)
  name: string,
  email: string?,
  phone: string?,
  pipelineStatus: string,      // e.g. "BG pending" | "cleared" | "started" | "suspended" | "DNR"
  processDate: timestamp?,
  plannedStartDate: timestamp?,
  actualStartDate: timestamp?,
  shiftPreference: "1st" | "2nd" | "either" | string,
  assignedRecruiter: string?,  // name or uid
  notes: string?,
  lastUpdated: timestamp?,
  totalHoursWorked: number?,
  totalEarlyLeaves: number?,
  badgeId: string?,
  status: string?              // optional overall status
}
```

### 7) badges
Badge details and print history.

```javascript
{
  badgeId: string,             // unique badge identifier
  eid: string,                 // link to associates
  photoURL: string?,
  status: string,              // e.g. "Clear" | "Not Clear" | "Tentative"
  lastPrintAt: timestamp?,
  printCount: number?,
  createdAt: timestamp?,
  updatedAt: timestamp?
}
```

## Notes
- Applicants are consolidated into `associates`; use `pipelineStatus` to track state instead of a separate applicants collection.
- Labor report uploads should map into both `associates` (to upsert people) and `hoursData` (for daily hours by shift and per-associate breakdowns).
- On-premise daily headcount lives in `onPremiseData` (per shift, per day).
- Recruiter/branch daily activity lives in `branchMetrics`.

## Suggested Indexes (to add later)
- `onPremiseData`: date desc, shift asc
- `hoursData`: date desc
- `earlyLeaves`: date desc, shift asc
- `associates`: pipelineStatus asc, shiftPreference asc
