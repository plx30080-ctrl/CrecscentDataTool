# Firestore Database Schema

## Collections Structure

### 1. users
Stores user profiles and roles.

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

### 2. shiftData
Tracks per-shift attendance, requests, and staffing metrics.

```javascript
{
  date: timestamp,
  shift: "1st" | "2nd",
  numberRequested: number,      // Client request
  numberRequired: number,        // Client expectation
  numberWorking: number,         // Actual attendance
  newStarts: [                   // Array of new employee starts
    {
      name: string,
      eid: string,
      timestamp: timestamp
    }
  ],
  sendHomes: number,             // Number of send homes
  lineCuts: number,              // Number of line cuts
  submittedBy: uid,
  submittedAt: timestamp,
  notes: string
}
```

### 3. hoursData
Tracks hours worked by associates and shifts.

```javascript
{
  date: timestamp,
  shift1Hours: number,
  shift2Hours: number,
  totalHours: number,
  associateHours: [              // Hours by individual associate
    {
      associateId: string,
      name: string,
      hours: number,
      shift: "1st" | "2nd"
    }
  ],
  submittedBy: uid,
  submittedAt: timestamp
}
```

### 4. recruiterData
Tracks recruiting activities and pipeline.

```javascript
{
  date: timestamp,
  recruiterName: string,
  recruiterUid: uid,
  interviewsScheduled: number,
  interviewShows: number,
  applicantsProcessed: number,
  dailyNotes: string,
  submittedAt: timestamp
}
```

### 5. earlyLeaves
Tracks early leave incidents for trend analysis.

```javascript
{
  date: timestamp,
  associateId: string,
  associateName: string,
  shift: "1st" | "2nd",
  leaveTime: string,             // Time they left
  scheduledEndTime: string,      // When they should have stayed until
  reason: string,                // Reason for leaving early
  correctiveAction: string,      // "Verbal Warning" | "Written Warning" | "Final Warning" | "None"
  actionDate: timestamp,
  submittedBy: uid,
  submittedAt: timestamp,
  notes: string
}
```

### 6. applicants
Tracks applicant pipeline and status.

```javascript
{
  applicantId: string,           // Unique applicant ID
  name: string,
  email: string,
  phone: string,
  source: string,                // "Indeed" | "Referral" | "Walk-in" | "Other"
  status: string,                // "Applied" | "Interviewed" | "Processed" | "Hired" | "Started" | "Rejected"
  appliedDate: timestamp,
  interviewDate: timestamp,
  processedDate: timestamp,
  projectedStartDate: timestamp,
  actualStartDate: timestamp,
  position: string,
  shift: "1st" | "2nd",
  assignedRecruiter: uid,
  notes: string,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 7. associates
Master list of all associates/employees.

```javascript
{
  eid: string,                   // Employee ID
  name: string,
  email: string,
  phone: string,
  shift: "1st" | "2nd",
  startDate: timestamp,
  status: "Active" | "Inactive" | "Terminated",
  position: string,
  totalHoursYTD: number,
  earlyLeavesCount: number,
  lastUpdated: timestamp
}
```

### 8. forecasts
Stores forecasting data and predictions.

```javascript
{
  createdAt: timestamp,
  forecastPeriod: "week" | "month" | "quarter",
  startDate: timestamp,
  endDate: timestamp,
  predictedHeadcount: number,
  recommendedHires: number,
  confidenceScore: number,       // 0-100
  basedOnData: {
    avgAttendance: number,
    avgTurnover: number,
    seasonalTrend: string
  },
  generatedBy: "system" | uid
}
```

## Indexes Required

Create these composite indexes in Firestore:

1. **shiftData**: `date` (desc), `shift` (asc)
2. **hoursData**: `date` (desc)
3. **earlyLeaves**: `associateId` (asc), `date` (desc)
4. **applicants**: `status` (asc), `projectedStartDate` (asc)
5. **associates**: `status` (asc), `shift` (asc)

## Aggregation Collections (for performance)

### dailySummary
Pre-aggregated daily metrics for fast dashboard loading.

```javascript
{
  date: timestamp,
  totalShift1Hours: number,
  totalShift2Hours: number,
  totalHours: number,
  avgAttendanceShift1: number,
  avgAttendanceShift2: number,
  newStartsCount: number,
  sendHomesCount: number,
  earlyLeavesCount: number,
  applicantsProcessed: number,
  lastUpdated: timestamp
}
```

### weeklySummary, monthlySummary
Similar structure for weekly and monthly aggregations.
