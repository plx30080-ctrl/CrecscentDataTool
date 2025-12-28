# Implementation Blueprint & Rollout Strategy
**Project:** Crescent Data Tool Enhancement
**Date:** December 28, 2025
**Status:** Planning Phase

---

## 📋 Executive Summary

This blueprint outlines the implementation of 4 major feature enhancements to the Crescent Data Tool:
1. **Applicant Page Refinements** - UX improvements and data formatting
2. **Badge Management Enhancements** - Print functionality and badge customization
3. **Data Entry Restructuring** - Unified upload system with multiple data types
4. **Early Leaves & DNR System** - Standalone module with compliance tracking

---

## 🎯 Phase 1: Applicant Page Refinements
**Priority:** HIGH | **Complexity:** LOW | **Est. Time:** 2-3 hours

### Requirements Analysis
Based on sample data from bulk uploads, applicants have:
- Name, EID, CRM Number, Email, Phone
- Status, Shift, Process Date
- I-9 Cleared, Background Status
- Fill (Recruiter initials), Notes

### Tasks
- [ ] **Remove columns**: Source, Position (not in bulk data)
- [ ] **Add columns**: Notes, Tentative Start Date, EID (already added)
- [ ] **Format phone numbers**: Display as (XXX) XXX-XXXX
- [ ] **Format email**: Clickable mailto: links
- [ ] **Add Notes section**: Multiline text field in edit dialog
- [ ] **Update table layout**: Reorder columns for better UX

### File Changes
- `src/pages/ApplicantsPage.jsx` - Update table columns, formatters
- `src/services/firestoreService.js` - Add tentativeStartDate field support

### Data Schema Updates
```javascript
// Applicant document structure
{
  name: string,
  eid: string, // Already added (CRM Number)
  crmNumber: string,
  email: string,
  phoneNumber: string, // Format: digits only, display formatted
  status: string,
  shift: string,
  processDate: Timestamp,
  tentativeStartDate: Timestamp, // NEW
  i9Cleared: string,
  backgroundStatus: string,
  notes: string, // NEW - multiline
  fill: string,
  uploadedAt: Timestamp,
  uploadedBy: string,
  lastModified: Timestamp,
  lastModifiedBy: string
}
```

---

## 🎫 Phase 2: Badge Management Enhancements
**Priority:** HIGH | **Complexity:** MEDIUM-HIGH | **Est. Time:** 6-8 hours

### Requirements Analysis
From reference data: Badges need:
- Employee ID, Name (First/Last)
- Position, Shift
- Photo (default placeholder if missing)
- Company logo
- Barcode (Code 128 format)
- Print to Zebra DTC1250e card printer

### Tasks

#### 2.1 Print Button on Search Page
- [ ] Add "Print" button next to each badge in search results
- [ ] Add "Print Selected" for batch printing
- [ ] Implement print preview dialog

#### 2.2 Default Placeholder Image
- [ ] Create default avatar image component
- [ ] Show placeholder when photo is null/undefined
- [ ] Add "Add Photo" overlay on placeholder

#### 2.3 Badge Customization
- [ ] Create Badge Template Manager page
- [ ] Upload company logo functionality
- [ ] Drag-and-drop badge element positioning
- [ ] Resize/reposition: Photo, Name, EID, Position, Logo, Barcode
- [ ] Save template configurations to Firestore

#### 2.4 Barcode Generation (Code 128)
- [ ] Install `jsbarcode` library
- [ ] Generate Code 128 barcode from Badge ID
- [ ] Render barcode on badge preview
- [ ] Include barcode in print output

#### 2.5 HID Card Printer Integration
- [ ] Research HID Card Printer SDK/API
- [ ] Implement HID printer commands/driver integration
- [ ] Test print dialog with printer driver
- [ ] Handle printer connection errors
- [ ] Verify compatibility with HID DTC series printers

### File Changes
- `src/pages/BadgeManagement.jsx` - Add print buttons, preview
- `src/pages/BadgeTemplateEditor.jsx` - NEW: Template customization
- `src/components/BadgePreview.jsx` - NEW: Visual badge preview
- `src/components/BarcodeGenerator.jsx` - NEW: Code 128 barcode
- `src/services/badgeService.js` - Print functions
- `src/services/printService.js` - NEW: Zebra printer integration

### Dependencies
```json
{
  "jsbarcode": "^3.11.6",
  "react-draggable": "^4.4.6",
  "react-resizable": "^3.0.5"
}
```

### Firestore Collections
```javascript
// badgeTemplates collection
{
  name: "Default Template",
  isDefault: boolean,
  elements: {
    photo: { x, y, width, height },
    firstName: { x, y, fontSize, fontFamily },
    lastName: { x, y, fontSize, fontFamily },
    eid: { x, y, fontSize },
    position: { x, y, fontSize },
    logo: { x, y, width, height, url },
    barcode: { x, y, width, height }
  },
  cardSize: { width: 3.375, height: 2.125 }, // inches
  createdAt, createdBy
}
```

---

## 📊 Phase 3: Data Entry Restructuring
**Priority:** HIGH | **Complexity:** MEDIUM | **Est. Time:** 5-7 hours

### Requirements Analysis
From sample files, we need 4 data types:

#### 3.1 On Premise Data
**Source:** 1st Shift On Premise 12.23.25.xls
**Columns:** Employee ID, Employee Name, Dept, Shift, In Time

**Fields Needed:**
- Date, Shift
- Requested (number)
- Required (number)
- Working (number)
- New Starts (array of {name, eid})
- Send Homes (number)
- Line Cuts (number)
- Notes (text)
- Upload file (parse EIDs from file)

#### 3.2 Labor Report Data
**Source:** Weekly Labor Report 12.28.25.xls
**Columns:** Dept, File (EID), Name, Bill Rate, Daily Hours (Reg/OT/DT) per day

**Fields Needed:**
- Week Ending Date
- Direct Hours (number)
- Indirect Hours (number)
- Total Hours (number)
- Upload file (parse and auto-fill)

#### 3.3 Branch Daily Data
**Fields Needed:**
- Date
- Interviews Scheduled (number)
- Interview Shows (number)
- 1st Shift Processed (number)
- 2nd Shift Processed (number)
- 2nd Shift Confirmations (number)
- Next Day Confirmations (number)

#### 3.4 Branch Weekly Data
**Fields Needed:**
- Week Ending Date
- Total Applicants (number)
- Total Processed (number)
- Total Headcount (number)

### Tasks

#### 3.1 Remove Early Leaves from Data Entry
- [ ] Extract Early Leaves to separate page/module
- [ ] Remove from EnhancedDataEntry.jsx

#### 3.2 Create Unified Upload Interface
- [ ] Dropdown to select data type
- [ ] Dynamic form based on selection
- [ ] File upload with auto-parse
- [ ] Preview parsed data before submit
- [ ] Any user can submit (update permissions)

#### 3.3 File Parsers
- [ ] On Premise parser (extract EIDs, names, shift)
- [ ] Labor Report parser (calculate hours totals)
- [ ] Validation and error handling

### File Changes
- `src/pages/DataEntry.jsx` - NEW: Unified data entry page
- `src/components/OnPremiseForm.jsx` - NEW
- `src/components/LaborReportForm.jsx` - NEW
- `src/components/BranchDailyForm.jsx` - NEW
- `src/components/BranchWeeklyForm.jsx` - NEW
- `src/services/dataEntryService.js` - NEW: CRUD operations
- `src/services/fileParserService.js` - NEW: Excel parsing

### Firestore Collections
```javascript
// onPremiseData
{
  date: Timestamp,
  shift: "1st" | "2nd",
  requested: number,
  required: number,
  working: number,
  newStarts: [{ name, eid }],
  sendHomes: number,
  lineCuts: number,
  notes: string,
  uploadedFile: { name, url }, // Storage reference
  createdBy, createdAt
}

// laborReports
{
  weekEnding: Timestamp,
  directHours: number,
  indirectHours: number,
  totalHours: number,
  uploadedFile: { name, url },
  parsedData: object, // Full parsed report
  createdBy, createdAt
}

// branchDaily
{
  date: Timestamp,
  interviewsScheduled: number,
  interviewShows: number,
  shift1Processed: number,
  shift2Processed: number,
  shift2Confirmations: number,
  nextDayConfirmations: number,
  createdBy, createdAt
}

// branchWeekly
{
  weekEnding: Timestamp,
  totalApplicants: number,
  totalProcessed: number,
  totalHeadcount: number,
  createdBy, createdAt
}
```

---

## 🚨 Phase 4: Early Leaves & DNR System
**Priority:** CRITICAL | **Complexity:** HIGH | **Est. Time:** 8-10 hours

### Requirements Analysis
From Crescent Early Leave Tracker.xlsx:

**Early Leaves Sheet:**
- Associate Name, EID, Line, Time Left, Hours Worked
- Reason, Corrective Action, Date, Shift
- 14/30/90 day tracking columns

**Corrective Action Sheet:**
- Date, Associate Name, EID, Shift
- Corrective Action (None, Warning, Suspension, DNR)
- Offense Category

**DNR Logic:**
- "DNR" = Do Not Return (permanent ban)
- When applicant uploaded, check against DNR database
- Flag applicant if EID or Name matches DNR record

### Tasks

#### 4.1 Early Leaves Management Page
- [ ] Create standalone Early Leaves page
- [ ] File upload (Excel parser)
- [ ] Data grid with edit/delete capabilities
- [ ] Filter by date range, shift, corrective action
- [ ] Search by name/EID

#### 4.2 DNR Database System
- [ ] Create DNR collection
- [ ] Auto-populate from Early Leaves where action = "DNR"
- [ ] Manual DNR entry form
- [ ] View/edit/remove DNR entries

#### 4.3 Applicant DNR Verification
- [ ] Check applicants against DNR on upload
- [ ] Flag matching applicants (by EID, name similarity)
- [ ] Review interface for flagged applicants
- [ ] Override/approve mechanism

#### 4.4 Corrective Action Tracking
- [ ] Separate Corrective Action table
- [ ] Link to Early Leaves
- [ ] Associate history view
- [ ] Escalation tracking (warnings → suspension → DNR)

### File Changes
- `src/pages/EarlyLeavesPage.jsx` - NEW: Main page
- `src/pages/DNRManagement.jsx` - NEW: DNR database
- `src/components/EarlyLeaveUpload.jsx` - NEW: File upload
- `src/components/EarlyLeaveTable.jsx` - NEW: Editable grid
- `src/components/DNRChecker.jsx` - NEW: Verification component
- `src/services/earlyLeaveService.js` - NEW: CRUD operations
- `src/services/dnrService.js` - NEW: DNR checking logic
- `src/utils/nameMatching.js` - NEW: Fuzzy name matching

### Firestore Collections
```javascript
// earlyLeaves
{
  associateName: string,
  eid: string,
  line: string,
  timeLeft: string | number, // Excel time format
  hoursWorked: number,
  reason: string,
  correctiveAction: string,
  date: Timestamp,
  shift: string,
  days14: number, // Count
  days30: number,
  days90: number,
  uploadedAt, uploadedBy,
  lastModified, lastModifiedBy
}

// correctiveActions
{
  date: Timestamp,
  associateName: string,
  eid: string,
  shift: string,
  action: "None" | "Warning" | "5 Day Suspension" | "DNR",
  offenseCategory: string | array,
  notes: string,
  createdBy, createdAt
}

// dnrDatabase
{
  associateName: string,
  eid: string,
  reason: string, // From offense category
  dateAdded: Timestamp,
  addedBy: string,
  source: "Early Leave" | "Manual", // How added
  earlyLeaveId: string, // Reference to early leave
  status: "Active" | "Removed",
  removedAt: Timestamp,
  removedBy: string,
  notes: string
}

// applicantFlags
{
  applicantId: string,
  dnrId: string,
  matchType: "EID" | "Name" | "Both",
  matchScore: number, // 0-100 for name matching
  flaggedAt: Timestamp,
  reviewedBy: string,
  reviewedAt: Timestamp,
  status: "Pending" | "Approved" | "Rejected",
  notes: string
}
```

### Firestore Indexes
```json
{
  "collectionGroup": "dnrDatabase",
  "fields": [
    { "fieldPath": "eid", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "dnrDatabase",
  "fields": [
    { "fieldPath": "associateName", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "earlyLeaves",
  "fields": [
    { "fieldPath": "date", "order": "DESCENDING" },
    { "fieldPath": "shift", "order": "ASCENDING" }
  ]
}
```

---

## 🔒 Security & Permissions Updates

### Firestore Rules
```javascript
// Data entry collections - any authenticated user
match /onPremiseData/{doc} {
  allow read: if request.auth != null;
  allow write: if request.auth != null;
}

match /laborReports/{doc} {
  allow read: if request.auth != null;
  allow write: if request.auth != null;
}

match /branchDaily/{doc} {
  allow read: if request.auth != null;
  allow write: if request.auth != null;
}

match /branchWeekly/{doc} {
  allow read: if request.auth != null;
  allow write: if request.auth != null;
}

// DNR - restricted to admins/managers
match /dnrDatabase/{doc} {
  allow read: if request.auth != null;
  allow write: if isAdminOrManager();
}

match /earlyLeaves/{doc} {
  allow read: if request.auth != null;
  allow create, update: if request.auth != null;
  allow delete: if isAdminOrManager();
}

// Badge templates
match /badgeTemplates/{doc} {
  allow read: if request.auth != null;
  allow write: if isAdminOrManager();
}
```

---

## 📦 Dependencies to Install

```bash
npm install --save \
  jsbarcode \
  react-draggable \
  react-resizable \
  string-similarity
```

---

## 🗺️ Rollout Strategy

### Sprint 1 (Immediate - Days 1-2)
**Goal:** Quick wins, foundational improvements

1. ✅ **Phase 1: Applicant Page** (2-3 hrs)
   - Remove Source/Position columns
   - Add Notes field
   - Add Tentative Start Date
   - Format phone/email
   - Test with existing data

**Deliverable:** Improved applicant management UX

### Sprint 2 (Days 3-5)
**Goal:** Data entry restructuring

2. **Phase 3: Data Entry** (5-7 hrs)
   - Create unified Data Entry page
   - Implement 4 data type forms
   - Build Excel parsers
   - Test file uploads
   - Update permissions

**Deliverable:** Streamlined data entry system

### Sprint 3 (Days 6-8)
**Goal:** Critical compliance feature

3. **Phase 4: Early Leaves & DNR** (8-10 hrs)
   - Build Early Leaves page
   - Implement DNR database
   - Create applicant verification
   - Build flagging system
   - Test with sample data

**Deliverable:** Compliance tracking system

### Sprint 4 (Days 9-12)
**Goal:** Badge system enhancement

4. **Phase 2: Badge Management** (6-8 hrs)
   - Add print buttons
   - Implement default images
   - Build badge template editor
   - Generate Code 128 barcodes
   - Integrate Zebra printer
   - Test print workflow

**Deliverable:** Full badge printing solution

### Sprint 5 (Days 13-14)
**Goal:** Testing, refinement, deployment

5. **Integration Testing**
   - End-to-end testing
   - Performance optimization
   - Bug fixes
   - User acceptance testing
   - Documentation

**Deliverable:** Production-ready system

---

## 🧪 Testing Checklist

### Applicant Page
- [ ] Column visibility correct (no Source/Position)
- [ ] Phone displays as (XXX) XXX-XXXX
- [ ] Email is clickable mailto link
- [ ] Notes field saves and displays
- [ ] Tentative start date picker works
- [ ] Sorting/filtering still functional

### Badge Management
- [ ] Print button appears on search results
- [ ] Default avatar shows when no photo
- [ ] Barcode generates correctly (Code 128)
- [ ] Template editor saves configurations
- [ ] Logo upload works
- [ ] Print dialog opens
- [ ] Test print to Zebra DTC1250e

### Data Entry
- [ ] Dropdown switches forms correctly
- [ ] On Premise upload parses file
- [ ] Labor Report calculates totals
- [ ] Branch Daily/Weekly save correctly
- [ ] All users can submit data
- [ ] Validation errors display

### Early Leaves & DNR
- [ ] Excel upload parses both sheets
- [ ] Early leaves are editable
- [ ] DNR auto-populates from "DNR" actions
- [ ] Applicant upload checks DNR
- [ ] Flagged applicants appear in review
- [ ] Name matching works (fuzzy)
- [ ] Override mechanism functions

---

## 📈 Success Metrics

- **Applicant Page:** 100% of columns match requirements, phone/email formatted
- **Badge Management:** Successful test print to DTC1250e
- **Data Entry:** All 4 data types upload and save correctly
- **DNR System:** Zero false negatives (all DNR matches caught)

---

## 🚀 Deployment Plan

1. **Backup:** Export current Firestore data
2. **Database:** Deploy Firestore indexes and rules
3. **Build:** `npm run build`
4. **Deploy:** `firebase deploy`
5. **Verify:** Test all features in production
6. **Monitor:** Check for errors in 24 hours
7. **Document:** Update user training materials

---

## 📞 Support & Documentation

### User Guides to Create
- [ ] Applicant Management Guide
- [ ] Badge Printing Guide
- [ ] Data Entry Guide (all 4 types)
- [ ] Early Leaves & DNR Guide
- [ ] Badge Template Customization

### Technical Documentation
- [ ] API documentation for services
- [ ] Firestore schema reference
- [ ] Excel file format specifications
- [ ] Printer setup guide (Zebra DTC1250e)

---

**Next Steps:** Begin Sprint 1 - Applicant Page Refinements
