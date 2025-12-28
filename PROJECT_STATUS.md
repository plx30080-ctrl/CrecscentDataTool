# Crescent Data Tool - Project Status

**Last Updated:** December 28, 2025
**Status:** Active Development
**Version:** 2.0

---

## 📋 Project Overview

The Crescent Data Tool is a comprehensive workforce management platform for Mid-States Crescent, LLC. It manages applicant tracking, badge printing, data entry, and reporting across multiple shifts and locations.

---

## ✅ Completed Features

### Phase 1: Applicant Management (Sprint 1)
- ✅ Applicant profile system with full CRUD operations
- ✅ Bulk applicant upload from Excel files
- ✅ Status pipeline tracking (12 status types)
- ✅ Email (clickable mailto links) and phone formatting
- ✅ Tentative Start Date and Notes fields
- ✅ Process Date tracking (replaced Projected Start)
- ✅ Inline status updates
- ✅ Search and filter capabilities
- ✅ Sortable columns
- ✅ Clickable names to open profiles
- ✅ Duplicate EID verification
- ✅ Print Badge integration from profile

### Phase 2: Badge Management
- ✅ Badge creation with photo capture/upload
- ✅ Badge search (by name, EID, Badge ID)
- ✅ Code 128 barcode generation
- ✅ Default placeholder images
- ✅ Print preview dialog
- ✅ HID card printer integration (browser-based)
- ✅ Badge template system (Firestore-backed)
- ✅ Print button in badge details dialog
- ✅ Badge statistics dashboard

### Sprint 2: Data Entry Restructuring
- ✅ Unified DataEntry page with dropdown selector
- ✅ On Premise data entry (headcount, new starts, file upload)
- ✅ Labor Report upload with auto-parse
- ✅ Branch Daily metrics (both shifts, no selector)
- ✅ Branch Weekly metrics
- ✅ Excel file parsing service
- ✅ Only 1st and 2nd shift options (removed 3rd/Mid)

### Phase 4: Early Leaves & DNR System
- ✅ Early Leaves management page
- ✅ Add/Edit/Delete early leave records
- ✅ Corrective action tracking (None, Warning, Suspension, DNR)
- ✅ 14/30/90 day occurrence tracking
- ✅ DNR database management
- ✅ Auto-population from Early Leaves
- ✅ Manual DNR entry
- ✅ DNR removal with audit trail
- ✅ Search and filter capabilities
- ✅ Statistics dashboard

---

## 🗂️ File Structure

### Pages (`src/pages/`)
- `ApplicantsPage.jsx` - Applicant management
- `BadgeManagement.jsx` - Badge creation and printing
- `DataEntry.jsx` - Unified data entry
- `EarlyLeavesPage.jsx` - Early leaves tracking
- `DNRManagement.jsx` - Do Not Return database
- `EnhancedHome.jsx` - Dashboard home
- `EnhancedDashboard.jsx` - Analytics dashboard
- `EnhancedProfile.jsx` - User profile
- `EnhancedUpload.jsx` - Bulk upload interface
- `ScorecardPage.jsx` - Scorecard metrics
- `AdminPanel.jsx` - Admin settings
- `DataDebug.jsx` - Data debugging tool
- `Login.jsx` / `Signup.jsx` - Authentication

### Components (`src/components/`)
**Badge Components:**
- `BadgePlaceholder.jsx` - Default avatar placeholder
- `BarcodeGenerator.jsx` - Code 128 barcode
- `BadgePreview.jsx` - Visual badge card
- `BadgePrintPreview.jsx` - Print preview dialog

**Data Entry Components:**
- `dataEntry/OnPremiseForm.jsx`
- `dataEntry/LaborReportForm.jsx`
- `dataEntry/BranchDailyForm.jsx`
- `dataEntry/BranchWeeklyForm.jsx`

**Other Components:**
- `ApplicantBulkUpload.jsx`
- `Layout.jsx`
- `PrivateRoute.jsx`
- `ErrorBoundary.jsx`

### Services (`src/services/`)
- `firestoreService.js` - Main Firestore CRUD
- `badgeService.js` - Badge operations + template management
- `dataEntryService.js` - Data entry submissions
- `printService.js` - HID printer integration
- `earlyLeaveService.js` - Early leaves & DNR management

---

## 🗃️ Firestore Collections

### Core Collections
- `users` - User profiles and authentication
- `applicants` - Applicant records
- `badges` - Badge profiles with photos
- `badgeTemplates` - Badge layout templates

### Data Entry Collections
- `onPremiseData` - Daily headcount data
- `laborReports` - Weekly labor hours
- `branchDaily` - Daily recruiting metrics
- `branchWeekly` - Weekly summaries

### Supporting Collections
- `shiftData` - Legacy shift data
- `hoursData` - Legacy hours data
- `earlyLeaves` - Early leave tracking
- `dnrDatabase` - Do Not Return list
- `uploadHistory` - Bulk upload tracking
- `auditLog` - System audit trail
- `admin` - Admin settings

---

## 🔑 Key Features

### Applicant Management
- **Process Date Tracking:** Replaced Projected Start with Process Date
- **Duplicate Detection:** Automatic EID verification
- **Badge Integration:** Print badge directly from applicant profile
- **Click-to-Edit:** Click applicant name to open profile
- **Status Pipeline:** 12 status types with inline updates

### Badge System
- **Photo Support:** Webcam capture or file upload
- **Placeholder Images:** Professional gray avatar when no photo
- **Barcode:** Code 128 format from Badge ID
- **Template System:** Customizable badge layouts in Firestore
- **Print Preview:** See badge before printing
- **HID Printer:** Browser-based printing (CR80 badge size: 3.375" x 2.125")

### Data Entry
- **Unified Interface:** Single page with dropdown selector
- **Shift Flexibility:** Only 1st and 2nd shift (removed 3rd/Mid)
- **Branch Daily:** Both shifts in one form (no selector needed)
- **Auto-Parsing:** Labor Report Excel files auto-calculate hours
- **File Upload:** On Premise employee roster upload

### Early Leaves & DNR
- **Early Leave Tracking:** Full CRUD for early leave records
- **Corrective Actions:** None, Warning, 5 Day Suspension, DNR
- **Occurrence Tracking:** 14/30/90 day counters
- **DNR Database:** Permanent Do Not Return list
- **Auto-Population:** DNR entries auto-created from early leaves
- **Name Matching:** Levenshtein distance algorithm for fuzzy matching
- **Audit Trail:** Track who added/removed DNR entries and when

---

## 📊 Data Schemas

### Applicant
```javascript
{
  firstName, lastName, eid, email, phone,
  status, shift,
  processDate: Timestamp,  // Changed from projectedStartDate
  tentativeStartDate: Timestamp,
  notes: string,
  photoURL: string,
  // Bulk upload fields
  name: string,  // Full name (parsed into firstName/lastName)
  crmNumber: string  // Alternative EID
}
```

### Badge
```javascript
{
  firstName, lastName, eid,
  badgeId: "PLX-########-ABC",
  photoURL, position, shift, status,
  printedAt, issuedAt,
  createdAt, createdBy
}
```

### Branch Daily (Updated)
```javascript
{
  date: Timestamp,
  interviewsScheduled, interviewShows,
  shift1Processed, shift2Processed,
  shift2Confirmations, nextDayConfirmations,
  notes, submittedAt, submittedBy
}
```

---

## 🚧 Pending Items

### Immediate Tasks
1. Add PLX Logo to badge template
2. Add test1.png as default placeholder image
3. Ensure barcode shows on badge preview
4. Verify CR80 badge dimensions
5. UI/UX improvements:
   - Widen UI layout
   - Fix dark text on dark backgrounds

### Future Phases
- **Sprint 3:** Early Leaves & DNR System
  - Standalone Early Leaves page
  - DNR database
  - Applicant DNR verification
  - Auto-flagging system

- **Badge Template Editor:** (Optional)
  - Drag/drop element positioning
  - Logo upload and positioning
  - Save custom templates

---

## 🔧 Configuration

### Firebase
- **Project:** mid-states-00821676-61ebe
- **Auth:** Email/Password
- **Database:** Firestore (nam5 region)
- **Storage:** Badge photos
- **Hosting:** None (using GitHub Pages)

### Deployment
- **GitHub Pages:** https://plx30080-ctrl.github.io/CrecscentDataTool/
- **Build Command:** `npm run build`
- **Deploy:** Push to `main` branch (GitHub Actions)

### Environment
- **Node.js:** v18+
- **React:** 18.x
- **Vite:** 7.x
- **Material-UI:** 6.x

---

## 📝 Documentation Files

### Keep These
- `README.md` - Main project documentation
- `IMPLEMENTATION_BLUEPRINT.md` - Full feature roadmap
- `SPRINT_1_COMPLETE.md` - Applicant page enhancements
- `SPRINT_2_COMPLETE.md` - Data entry restructuring
- `PHASE_2_COMPLETE.md` - Badge management enhancements
- `PROJECT_STATUS.md` - This file (current status)

### Reference Docs
- `FIREBASE_SETUP.md` - Firebase configuration
- `FIRESTORE_INDEXES.md` - Index requirements
- `FIRESTORE_RULES.md` - Security rules
- `FIRESTORE_SCHEMA.md` - Database schema
- `ADMIN_PANEL.md` - Admin panel guide
- `BADGE_SYSTEM.md` - Badge system documentation
- `APPLICANT_UPLOAD_CONFIGURATION.md` - Bulk upload guide
- `CSV_UPLOAD_GUIDE.md` - CSV format guide
- `DEPLOYMENT.md` - Deployment instructions

---

## 🛠️ Recent Changes (Dec 28, 2025)

### Applicant Page
- Parse `name` field into `firstName` and `lastName` for bulk uploads
- Changed "Projected Start Date" to "Process Date"
- Removed "Actions" column
- Made applicant names clickable (opens profile)
- Renamed dialog from "Edit Applicant" to "Applicant Profile"
- Added "Print Badge" button to profile dialog
- Added duplicate EID verification (updates existing instead of creating duplicate)

### Badge Management
- Added "Print Badge" button to badge details dialog

### Data Entry
- Removed 3rd and Mid shift options (only 1st and 2nd)
- Updated Branch Daily to show both shifts without selector
- Updated data schema to match new Branch Daily structure

### Code Cleanup
- Deleted `AboutPage.jsx` (unused)
- Deleted `EnhancedDataEntry.jsx` (replaced by `DataEntry.jsx`)
- Consolidated documentation (removed 9 outdated files)

---

## 📞 Support

For questions or issues:
- Check `README.md` for getting started
- Review `IMPLEMENTATION_BLUEPRINT.md` for feature roadmap
- See sprint completion docs for detailed feature lists

---

**Next Steps:** Add PLX Logo and test1.png to badge system, then continue with Sprint 3 (Early Leaves & DNR)
