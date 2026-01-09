# Comprehensive Prompt: Crescent Management Platform

## Project Overview

Build a **Workforce Management Platform** called "Crescent Management Platform" for managing staffing operations at a warehouse/distribution center. The platform tracks daily shift attendance, labor hours, employee badges, early leave incidents, and recruiter metrics. It is built with **React 19** + **Vite** + **Firebase** (Firestore, Auth, Storage) + **Material-UI 7**.

---

## Technology Stack

```
Frontend:
- React 19.2.0 with Vite 7.2.4 (ES modules)
- React Router DOM 7.11.0 (BrowserRouter with nested routes)
- Material-UI 7.3.6 (@mui/material, @mui/icons-material)
- @emotion/react & @emotion/styled 11.14.x
- MUI X Date Pickers 8.23.0 with dayjs 1.11.19
- Chart.js 4.5.1 with react-chartjs-2 5.3.1

Data Processing:
- papaparse 5.5.3 (CSV parsing)
- xlsx 0.18.5 (Excel parsing)
- jsbarcode 3.12.1 (barcode generation)

Backend:
- Firebase 12.7.0 (Authentication, Firestore, Storage)

Testing:
- Vitest 4.0.16
- @testing-library/react

Build:
- Vite with manual chunks for code splitting (react-vendor, mui-vendor, chart-vendor, firebase-vendor, xlsx-vendor)
- GitHub Pages deployment with base path: /CrecscentDataTool/
```

---

## Project Structure

```
/
├── index.html                    # Entry HTML with SPA redirect handler
├── vite.config.js               # Vite config with manual chunks
├── package.json
├── firebase.json                # Firebase hosting config
├── firestore.rules              # Firestore security rules
├── storage.rules                # Storage security rules
├── public/
│   ├── images/plx-logo.png      # Company logo
│   └── placeholder-avatar.png
└── src/
    ├── main.jsx                 # React entry + Chart.js registration
    ├── App.jsx                  # Route definitions
    ├── firebase.js              # Firebase initialization
    ├── theme.js                 # MUI theme (deepPurple primary, amber secondary)
    ├── index.css
    ├── contexts/
    │   ├── AuthContext.js       # Context definition
    │   ├── AuthProvider.jsx     # Firebase Auth provider
    │   ├── NotificationContextCore.js
    │   └── NotificationContext.jsx
    ├── hooks/
    │   ├── useAuth.js
    │   └── useNotification.js
    ├── services/
    │   ├── firestoreService.js  # Core CRUD operations
    │   ├── adminService.js      # User management, audit logs
    │   ├── badgeService.js      # Badge lifecycle management
    │   ├── dataEntryService.js  # Form submission logic
    │   ├── earlyLeaveService.js # Early leave + DNR tracking
    │   └── printService.js      # Badge printing
    ├── pages/
    │   ├── Login.jsx
    │   ├── Signup.jsx
    │   ├── EnhancedHome.jsx     # Dashboard home
    │   ├── DataEntry.jsx        # Form selector
    │   ├── UnifiedDashboard.jsx # Analytics selector
    │   ├── FirstShiftDashboard.jsx
    │   ├── SecondShiftDashboard.jsx
    │   ├── RecruiterDashboard.jsx
    │   ├── NewStartsAnalytics.jsx
    │   ├── YOYComparison.jsx
    │   ├── BadgeManagement.jsx
    │   ├── EarlyLeavesPage.jsx
    │   ├── AdminPanel.jsx
    │   ├── EnhancedProfile.jsx
    │   ├── BulkHistoricalImport.jsx
    │   ├── AdminBulkUpload.jsx
    │   ├── BadgePhotoUpload.jsx
    │   ├── DataBackup.jsx
    │   ├── DataCleaner.jsx
    │   └── DataDebug.jsx
    ├── components/
    │   ├── Layout.jsx           # AppBar with navigation
    │   ├── PrivateRoute.jsx     # Auth protection
    │   ├── ErrorBoundary.jsx
    │   ├── BadgePreview.jsx
    │   ├── BadgePrintPreview.jsx
    │   ├── BadgePlaceholder.jsx
    │   ├── BarcodeGenerator.jsx
    │   ├── DataView.jsx         # Generic data table
    │   ├── FlexibleUpload.jsx
    │   └── dataEntry/
    │       ├── OnPremiseForm.jsx
    │       ├── LaborReportForm.jsx
    │       ├── BranchDailyForm.jsx
    │       └── BranchWeeklyForm.jsx
    ├── config/
    │   ├── badgeTemplate.js     # CR80 card template config
    │   └── dataTagLibrary.js    # Field mapping definitions
    └── utils/
        ├── logger.js            # Dev-only console logging
        ├── exportUtils.js
        ├── laborParser.js
        ├── recruiterUtils.js
        └── timeout.js           # Promise timeout utility
```

---

## Firebase Database Schema (Firestore Collections)

### 1. users/{uid}

```javascript
{
  email: string,
  displayName: string,
  role: "On-Site Manager" | "Recruiter" | "Market Manager" | "admin",
  photoURL: string | null,
  createdAt: Timestamp,
  lastLogin: Timestamp,
  lastUpdated: Timestamp
}
```

### 2. onPremiseData/{id} - Daily shift attendance

```javascript
{
  date: Timestamp,
  shift: "1st" | "2nd",
  requested: number,          // Requested headcount
  required: number,           // Required headcount
  working: number,            // Actually working
  newStarts: number,          // Count of new starts
  newStartEIDs: string[],     // Array of EIDs for new starts
  eidValidation: object[],    // Validation results for each EID
  sendHomes: number,          // People sent home
  lineCuts: number,           // Line cuts
  notes: string,
  fileName: string | null,    // If Excel file uploaded
  employeeData: object[] | null,
  submittedBy: string,        // Email
  submittedByUid: string,
  submittedAt: Timestamp
}
```

### 3. hoursData/{id} - Labor hours (weekly)

```javascript
{
  weekEnding: Timestamp,
  shift1: {
    total: number,
    direct: number,
    indirect: number,
    byDate: object
  },
  shift2: {
    total: number,
    direct: number,
    indirect: number,
    byDate: object
  },
  employeeCount: number,
  employeeIds: string[],
  employeeDetails: object[],
  fileName: string,
  submittedAt: Timestamp,
  submittedBy: string,
  submittedByUid: string
}
```

### 4. branchMetrics/{id} - Branch/recruiter metrics

```javascript
{
  date: Timestamp | null,
  weekEnding: Timestamp | null,  // For weekly summaries
  branch: string,
  shift: number,
  isWeeklySummary: boolean | null,
  recruiterStats: {
    interviewsScheduled: number,
    interviewShows: number,
    shift1Processed: number,
    shift2Processed: number,
    shift2Confirmations: number,
    nextDayConfirmations: number,
    totalApplicants: number,    // Weekly only
    totalProcessed: number      // Weekly only
  },
  dailyMetrics: {
    totalHeadcount: number
  },
  notes: string,
  submittedAt: Timestamp,
  submittedBy: string,
  submittedByUid: string
}
```

### 5. associates/{id} - Employee records (single source of truth)

```javascript
{
  eid: string,                  // Employee ID (6-8 digits)
  firstName: string,
  lastName: string,
  name: string,                 // Full name fallback
  status: "Active" | "Inactive" | "Terminated",
  pipelineStatus: "Applied" | "Interviewed" | "Processed" | "CB Updated" | "Finalized" | "Hired" | "Started",
  shift: "1st" | "2nd",
  position: string,
  recruiter: string,
  startDate: Timestamp,
  photoURL: string | null,
  crmNumber: string | null,     // Legacy field, same as eid
  notes: string,
  lastModified: Timestamp,
  lastUpdated: Timestamp
}
```

### 6. badges/{id} - Badge records

```javascript
{
  eid: string,
  badgeId: string,              // Format: "PLX-{eid}-{lastName3chars}"
  firstName: string,
  lastName: string,
  photoURL: string,
  position: string,
  shift: "1st" | "2nd",
  recruiter: string,
  status: "Pending" | "Cleared" | "Not Cleared" | "Suspended",
  notes: string,
  createdAt: Timestamp,
  createdBy: string,
  printedAt: Timestamp | null,
  printedBy: string | null,
  issuedAt: Timestamp | null,
  issuedBy: string | null,
  updatedAt: Timestamp
}
```

### 7. earlyLeaves/{id} - Early leave incidents

```javascript
{
  eid: string,
  associateName: string,
  date: Timestamp,
  shift: "1st" | "2nd",
  line: string,
  timeLeft: string,             // e.g., "2:30 PM"
  hoursWorked: number,
  reason: "Personal" | "Medical" | "Family Emergency" | "Transportation" | "Childcare" | "No Call No Show" | "Other",
  correctiveAction: "None" | "Warning" | "5 Day Suspension" | "DNR",
  days14: number,               // Occurrences in 14 days
  days30: number,               // Occurrences in 30 days
  days90: number,               // Occurrences in 90 days
  uploadedAt: Timestamp,
  uploadedBy: string,
  lastModified: Timestamp,
  lastModifiedBy: string
}
```

### 8. badgePrintQueue/{id} - Print queue

```javascript
{
  badgeDocId: string,
  badgeId: string,
  eid: string,
  firstName: string,
  lastName: string,
  priority: "Normal" | "High",
  status: "Queued" | "Printing" | "Completed",
  printerName: string,
  queuedAt: Timestamp,
  queuedBy: string,
  completedAt: Timestamp | null,
  error: string | null
}
```

### 9. auditLog/{id} - Audit trail

```javascript
{
  action: string,               // e.g., "UPDATE_USER_ROLE", "CREATE_BADGE"
  performedBy: string,          // User UID
  targetUserId: string | null,
  details: object,
  timestamp: Timestamp
}
```

### 10. dnrDatabase/{id} - Do Not Rehire list

```javascript
{
  eid: string,
  associateName: string,
  reason: string,
  source: string,               // e.g., "Early Leave"
  earlyLeaveId: string | null,
  status: "Active" | "Removed",
  dateAdded: Timestamp,
  addedBy: string,
  removedAt: Timestamp | null,
  removedBy: string | null,
  notes: string
}
```

---

## Firebase Storage Structure

```
/badges/{eid}_{timestamp}.jpg     - Badge photos
/user-photos/{uid}                - User profile photos
/applicant-documents/{id}/        - Applicant documents
```

---

## Authentication & Authorization

### Roles

- **On-Site Manager**: Default role. Can enter on-premise data, view dashboards.
- **Recruiter**: Can enter branch metrics, view recruiter dashboards.
- **Market Manager**: Can access Admin Panel, manage users, view all data.
- **admin**: Full access to all features.

### AuthProvider Implementation

- Firebase email/password authentication
- On auth state change: fetch user profile from `users/{uid}`
- Update `lastLogin` timestamp on login
- Create profile in Firestore on signup with default role "On-Site Manager"
- Provide: `currentUser`, `userProfile`, `loading`, `login`, `logout`, `signup`, `resetPassword`, `hasRole`, `isAdmin`, `refreshUserProfile`

### Protected Routes

Wrap all routes except `/login` and `/signup` in `<PrivateRoute>` which redirects to `/login` if not authenticated.

### Role-Based Navigation

Show "Admin" button in navbar only for `Market Manager` or `admin` roles.

---

## Core Features

### 1. Home Dashboard (EnhancedHome.jsx)

- Welcome message with user's name and current date
- Quick stats cards with gradient backgrounds:
  - Today's Attendance (from onPremiseData)
  - Active Pipeline (associates with pipelineStatus)
  - Current Pool (Processed in last 14 days)
  - Conversion Rate
- Quick action cards: Enter Data, View Dashboard, Badge Management, Performance Scorecard, Manage Applicants, Upload Data
- Role-specific tips section

### 2. Data Entry (DataEntry.jsx)

Dropdown selector for four form types:

#### a) OnPremiseForm

- Date picker, Shift selector (1st/2nd)
- Numeric fields: Requested, Required, Working, New Starts, Send Homes, Line Cuts
- Dynamic EID input fields based on New Starts count
- EID validation against `associates` collection:
  - Show green checkmark if found and status is "CB Updated" or "Finalized"
  - Show yellow warning if found but different status
  - Show red error if not found
- Optional Excel file upload for employee roster
- On submit: Save to `onPremiseData`, update associate statuses to "Started"/"Active"

#### b) LaborReportForm

- Week Ending date picker
- Excel file upload (required)
- Parse Excel to calculate:
  - Total/Direct/Indirect hours
  - Employee count
  - Daily breakdown by shift
  - Per-shift totals
- Display parsed data in tables before submission
- On submit: Save to `hoursData`, update associate statuses to "Active"

#### c) BranchDailyForm

- Date, Branch, Shift fields
- Recruiter stats: Interviews Scheduled, Interview Shows, Shift 1/2 Processed, etc.
- Save to `branchMetrics`

#### d) BranchWeeklyForm

- Week Ending date, Branch
- Weekly summary fields
- Save to `branchMetrics` with `isWeeklySummary: true`

### 3. Analytics Dashboard (UnifiedDashboard.jsx)

Dropdown selector for dashboards:

#### a) First/Second Shift Dashboard

- Date range picker (default: last 30 days)
- Summary cards: Total Hours, New Starts, Avg Headcount, On Premise Hours, Avg Hrs/Person
- Line chart: Headcount & Hours trends (dual Y-axis)
- Data table: Daily breakdown with Requested, Working, Hours, Direct Hours, New Starts, Send Homes

#### b) RecruiterDashboard

- Recruiter efficiency metrics from `branchMetrics`

#### c) NewStartsAnalytics

- New starts trend analysis from `onPremiseData`

#### d) YOYComparison

- Year-over-year comparison charts

### 4. Badge Management (BadgeManagement.jsx)

Three tabs:

#### a) Create Badge

- Form: First Name*, Last Name*, EID*, Status, Position, Shift, Recruiter, Notes
- Photo capture: Webcam button or File upload
- Badge ID auto-generated: `PLX-{eid}-{lastName3chars}`
- Save to `badges` collection with photo in Storage

#### b) Lookup & Verify

- Search by name or EID (searches both `badges` and `associates`)
- Display results as cards with photo, name, EID, status chip
- View Details dialog: full info, update status buttons (Mark Cleared/Not Cleared), Print button, Mark Issued
- Delete badge button (for badge source only)

#### c) Print Queue

- List badges in queue (status: Queued/Printing)
- Select all / individual selection
- Bulk print button
- Mark as Printed button per item

#### Stats Cards

- Total Badges, Cleared, Printed, Pending Print

#### Badge Template (CR80 Card Standard)

```javascript
{
  cardSize: { width: 212.5, height: 337.5 },  // Portrait at 100 DPI
  elements: {
    logo: { x: 66, y: 30, width: 80, height: 30, url: '/images/plx-logo.png' },
    photo: { x: 56, y: 75, width: 100, height: 120 },
    firstName: { x: 0, y: 205, fontSize: 16, fontWeight: 'bold', textAlign: 'center', width: 212.5 },
    lastName: { x: 0, y: 225, fontSize: 16, fontWeight: 'bold', textAlign: 'center', width: 212.5 },
    eid: { x: 0, y: 225, fontSize: 12, textAlign: 'center', hidden: true },
    position: { x: 0, y: 250, fontSize: 11, textAlign: 'center', width: 212.5 },
    shift: { x: 0, y: 262, fontSize: 11, textAlign: 'center', hidden: true },
    barcode: { x: 6, y: 275, width: 200, height: 40 }
  }
}
```

### 5. Early Leaves Page (EarlyLeavesPage.jsx)

- Stats cards: Total Early Leaves, Warnings, Suspensions, DNR count
- Filters: Search by name/EID, Shift filter, Corrective Action filter
- Data table with all fields
- Add/Edit dialog with full form
- Delete confirmation
- Corrective action options: None, Warning, 5 Day Suspension, DNR
- Reasons: Personal, Medical, Family Emergency, Transportation, Childcare, No Call No Show, Other
- Occurrence tracking: 14/30/90 day counts
- Auto-add to DNR database when action is "DNR"

### 6. Admin Panel (AdminPanel.jsx)

Four tabs (Market Manager/admin only):

#### a) User Management

- Table: Email, Name, Role, Created, Actions
- Role chip colors: admin=error, Market Manager=primary, On-Site Manager=success, Recruiter=warning
- Change Role button -> Dialog with role dropdown
- Delete User button (cannot delete self)
- Printer status section (stub)

#### b) Audit Logs

- Filter by User dropdown
- Filter by Action dropdown
- List with action chip, performer email, timestamp, details

#### c) Data Management

- Cards linking to:
  - Backup Data (/backup)
  - Clear All Data (/clear-data)
  - Bulk Historical Import (/bulk-import)

#### d) Data View

- Generic DataView component for viewing raw collection data

### 7. Profile Page (EnhancedProfile.jsx)

- Display/edit name, email
- Profile photo upload/delete
- Last login time
- Role display

### 8. Bulk Import Pages

- CSV/Excel file upload
- Field mapping interface
- Preview data before import
- Batch write to Firestore (500 per batch)

---

## Key Services

### firestoreService.js

Functions for each collection:

- `addHoursData`, `getHoursData`, `getAggregateHours`
- `addEarlyLeave`, `getEarlyLeaves`, `getEarlyLeaveTrends`
- `addAssociate`, `updateAssociate`, `getAssociates`, `getAssociateByEID`
- `addBadge`, `updateBadge`, `getBadges`, `getBadgeByEID`
- `createUserProfile`, `getUserProfile`, `updateUserProfile`, `updateUserLastLogin`, `updateUserPhoto`, `deleteUserPhoto`, `deleteUserProfile`
- `addOnPremiseData`, `getOnPremiseData`, `aggregateOnPremiseByDateAndShift`
- `addBranchMetrics`, `getBranchMetrics`
- `flexibleBulkUpload` - Batch write with 500-doc limit

### badgeService.js

- `generateBadgeId(eid, lastName)` -> `PLX-{eid}-{lastName3chars}`
- `createBadge`, `updateBadge`, `deleteBadge`
- `getBadgeByEID` - With photo fallback from Storage and associates
- `searchBadges` - Searches badges AND associates
- `createOrUpdateBadgeFromApplicant` - Sync from applicant data
- `updateBadgePhoto`, `discoverAndLinkPhotos`
- `addToPrintQueue`, `getPrintQueue`, `markBadgePrinted`, `markBadgeIssued`
- `updateBadgeStatus`, `getBadgeStats`
- `getDefaultTemplate`, `saveTemplate`, `updateTemplate`, `getAllTemplates`

### adminService.js

- `getAllUsers`, `updateUserRole`
- `saveBadgeTemplate`, `getActiveBadgeTemplate`, `getAllBadgeTemplates`
- `logAuditAction`, `getAuditLogs`, `getUserActivitySummary`

### earlyLeaveService.js

- `createEarlyLeave`, `updateEarlyLeave`, `deleteEarlyLeave`
- `getEarlyLeaves`, `searchEarlyLeaves`, `getEarlyLeaveStats`
- `addToDNR`, `removeFromDNR`, `restoreFromDNR`, `getDNRDatabase`, `checkDNR`
- `calculateNameSimilarity` - Levenshtein distance for fuzzy matching
- `bulkUploadEarlyLeaves`, `bulkUploadDNR`

### printService.js

- `sendToPrinter(badge, template)` - Opens print window with badge HTML
- `buildPrintHTML(badge, template)` - Generates print-ready HTML
- `checkPrinterStatus`, `getAvailablePrinters` - Stubs for HID printer integration

### dataEntryService.js

- `submitOnPremiseData(formData, file)`
- `parseOnPremiseFile(file)` - Excel parsing
- `submitLaborReport(data)` - With associate status updates
- `submitBranchDaily(formData)`, `submitBranchWeekly(formData)`

---

## UI Theme

```javascript
createTheme({
  palette: {
    primary: { main: deepPurple[500] },  // #673ab7
    secondary: { main: amber[500] }       // #ffc107
  },
  typography: {
    fontFamily: ['"Montserrat"', '"Roboto"', 'sans-serif'].join(',')
  }
})
```

---

## Chart.js Setup

Register in main.jsx:

```javascript
ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
)
```

Use `<Line>` and `<Bar>` from react-chartjs-2 with dual Y-axis for headcount/hours charts.

---

## Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read: if request.auth != null;
      allow update: if request.auth.uid == uid || request.auth != null;
      allow write: if request.auth.uid == uid;
    }

    match /onPremiseData/{document=**} { allow read, write: if request.auth != null; }
    match /hoursData/{document=**} { allow read, write: if request.auth != null; }
    match /branchMetrics/{document=**} { allow read, write: if request.auth != null; }
    match /earlyLeaves/{document=**} { allow read, write: if request.auth != null; }
    match /associates/{document=**} { allow read, write: if request.auth != null; }
    match /badges/{document=**} { allow read, write: if request.auth != null; }
  }
}
```

---

## Critical Implementation Notes

1. **Date Handling**: Use `dayjs` for UI, convert to Firebase `Timestamp` for storage. Always convert back to Date on read.

2. **Batch Writes**: Firestore limit is 500 operations per batch. Split larger uploads.

3. **EID Validation**: When entering new starts, validate EID against `associates` collection. Check both `eid` and legacy `crmNumber` fields.

4. **Photo Fallback Chain**: When displaying badge without photo, check Storage for `badges/{eid}/*`, then check associate record for photoURL.

5. **DNR Auto-Add**: When early leave corrective action is "DNR", automatically create entry in `dnrDatabase`.

6. **Status Updates**: When submitting on-premise data with new start EIDs or labor report with employee IDs, update corresponding associate records to `pipelineStatus: "Started"`, `status: "Active"`.

7. **Barcode Format**: Use CODE128 format via jsbarcode. Badge ID format: `PLX-{eid}-{lastName first 3 chars padded with X}`.

8. **Vite Base Path**: Set `base: '/CrecscentDataTool/'` for GitHub Pages deployment.

9. **SPA Redirect**: Include 404.html and redirect handler script in index.html for GitHub Pages.

10. **Logger**: Create development-only logger that's silent in production.

---

## Getting Started

1. Create Firebase project, enable Auth (email/password), Firestore, Storage
2. Copy Firebase config to `src/firebase.js`
3. Deploy Firestore rules and Storage rules
4. Create initial admin user manually or via signup
5. Run `npm install && npm run dev`

---

This prompt contains everything needed to recreate the Crescent Management Platform from scratch with identical functionality, architecture, and database structure.
