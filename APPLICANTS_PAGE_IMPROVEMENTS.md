# Applicants Page Improvements

## Summary of Changes

Successfully implemented all requested improvements to the Applicants Page including delete functionality, process date column, bulk purge feature, and improved dialog layout.

## Changes Implemented

### 1. ✅ Delete Button Added

**Location**: Applicants table Actions column

**Features**:
- Red delete button with trash icon next to Documents button
- Confirmation dialog before deletion
- Success/error messages
- Automatically refreshes the list after deletion
- Shows deleted applicant's name in success message

**Code**: [src/pages/ApplicantsPage.jsx](src/pages/ApplicantsPage.jsx:883-890)

```javascript
<IconButton
  size="small"
  color="error"
  onClick={() => handleDeleteApplicant(applicant)}
  title="Delete Applicant"
>
  <Delete />
</IconButton>
```

### 2. ✅ Process Date Column Added

**Location**: New column in applicants table between Shift and Tentative Start

**Features**:
- Sortable column (click header to sort)
- Formatted as "MMM D, YYYY" (e.g., "Dec 30, 2025")
- Shows "-" if no process date
- Default sort field (newest to oldest)

**Visual Position**: Now shows 10 columns total:
1. EID
2. Name
3. Email
4. Phone
5. Status
6. Shift
7. **Process Date** (NEW)
8. Tentative Start
9. Notes
10. Actions

**Code**: [src/pages/ApplicantsPage.jsx](src/pages/ApplicantsPage.jsx:772-780)

### 3. ✅ Default Sort Set to Process Date (Newest First)

**Configuration**:
```javascript
const [sortField, setSortField] = useState('processDate');
const [sortDirection, setSortDirection] = useState('desc');
```

**Behavior**:
- Applicants sorted by process date descending by default
- Newest applicants appear first
- Click column header to toggle sort direction
- Process Date column header shows active sort indicator

**Code**: [src/pages/ApplicantsPage.jsx](src/pages/ApplicantsPage.jsx:58-59)

### 4. ✅ Bulk Purge Feature for Old Applicants

**Access**: Admin and Market Manager only

**Location**: Button at top right of page (before Export Phone List button)

**Features**:
- **Purge Old Records** button (red outlined with DeleteSweep icon)
- Only visible to admin and Market Manager roles
- Purges applicants that meet ALL criteria:
  - Process date is 6+ months old
  - Status is NOT "Started" (includes: Applied, Interviewed, Processed, Hired, Rejected, CB Updated, BG Pending, Adjudication Pending, I-9 Pending, Declined, No Contact)
- Shows count before confirmation
- Detailed confirmation dialog
- Success message shows number deleted
- Uses batch delete for efficiency

**Code**: [src/pages/ApplicantsPage.jsx](src/pages/ApplicantsPage.jsx:573-616)

**Purge Logic**:
```javascript
const sixMonthsAgo = dayjs().subtract(6, 'months').toDate();
const nonStartedStatuses = ['Applied', 'Interviewed', 'Processed', 'Hired',
  'Rejected', 'CB Updated', 'BG Pending', 'Adjudication Pending',
  'I-9 Pending', 'Declined', 'No Contact'];

const applicantsToPurge = applicants.filter(applicant => {
  const processDate = applicant.processDate instanceof Date
    ? applicant.processDate
    : new Date(applicant.processDate);

  const isOld = processDate < sixMonthsAgo;
  const didntStart = nonStartedStatuses.includes(applicant.status);

  return isOld && didntStart;
});
```

### 5. ✅ Applicant Profile Dialog Redesign

**Improvements**:
- Added section headers for better organization:
  - **Photo** (blue header)
  - **Personal Information** (blue header)
  - **Employment Details** (blue header)
- Increased spacing between sections (from 2 to 3)
- Color-coded section headers (primary blue)
- Better visual hierarchy

**Sections**:

1. **Photo Section**
   - Webcam capture option
   - File upload option
   - Live preview
   - Gray background for visual separation

2. **Personal Information**
   - First Name, Last Name, Employee ID (3 columns)
   - Email, Phone (2 columns)

3. **Employment Details**
   - Status, Shift (2 columns)
   - Recruiter, Process Date (2 columns)
   - Tentative Start Date (row continues)
   - Notes (full width, multiline)

**Code**: [src/pages/ApplicantsPage.jsx](src/pages/ApplicantsPage.jsx:990-1183)

## Backend Changes

### New Functions in firestoreService.js

#### 1. `deleteApplicant(applicantId)`

Deletes a single applicant record.

**Parameters**:
- `applicantId`: Document ID of applicant to delete

**Returns**:
```javascript
{ success: true } | { success: false, error: string }
```

**Code**: [src/services/firestoreService.js](src/services/firestoreService.js:330-340)

#### 2. `bulkDeleteApplicants(applicantIds)`

Batch deletes multiple applicant records efficiently.

**Parameters**:
- `applicantIds`: Array of document IDs to delete

**Returns**:
```javascript
{ success: true, deletedCount: number } | { success: false, error: string }
```

**Features**:
- Uses Firestore batch writes for efficiency
- Deletes up to 500 records per batch
- Logs deletion count

**Code**: [src/services/firestoreService.js](src/services/firestoreService.js:343-359)

## UI/UX Improvements

### Confirmation Dialogs

**Delete Single Applicant**:
```
Are you sure you want to delete [Name]?

This action cannot be undone.
```

**Bulk Purge**:
```
This will permanently delete [N] applicants that:
- Were processed more than 6 months ago
- Did not start or were rejected/declined

This action cannot be undone.

Continue?
```

### Success/Error Messages

- **Delete Success**: "[Name] has been deleted" (3 second display)
- **Purge Success**: "Successfully purged [N] old applicant records" (5 second display)
- **Purge No Records**: "No applicants found that meet purge criteria..." (5 second display)
- **Delete Error**: "Failed to delete applicant: [error]"
- **Purge Error**: "Failed to purge applicants: [error]"

## Security & Access Control

### Delete Single Applicant
- Available to all authenticated users
- Requires confirmation
- Cannot be undone

### Bulk Purge
- **Restricted**: Admin and Market Manager roles only
- Button not visible to other users
- Prevents accidental mass deletion by regular users

## Testing Checklist

- [x] Delete button appears in Actions column
- [x] Delete confirmation dialog works
- [x] Applicant is deleted from database
- [x] List refreshes after deletion
- [x] Process Date column displays correctly
- [x] Process Date column is sortable
- [x] Default sort is Process Date descending
- [x] Purge button only visible to admin/Market Manager
- [x] Purge correctly identifies old applicants
- [x] Purge excludes "Started" status
- [x] Batch delete works efficiently
- [x] Dialog sections have clear headers
- [x] All fields still functional
- [x] App builds successfully
- [x] Firebase deployed successfully

## Sync to Badge vs Print Badge

**Clarification** (as requested):

### Sync to Badge
- **Purpose**: Creates or updates the badge database record
- **Action**: Syncs applicant data (name, photo, EID, shift, position) to the badge system
- **When**: When you want to update badge information without printing
- **Result**: Badge record created/updated in Firestore `badges` collection

### Print Badge
- **Purpose**: Physically print a badge card
- **Action**:
  1. Retrieves or creates badge from applicant data
  2. Opens print preview dialog
  3. Sends badge design to card printer
- **When**: When you need a physical badge card
- **Result**: Badge preview shown, sent to printer, timestamps updated

**Workflow**: Typically "Sync to Badge" first to ensure data is current, then "Print Badge" when ready for physical card.

## Future Enhancement Suggestion

### Auto-Sync Badge System

Based on your request: *"Can we have the badge system auto-sync? Even better would be if the badge system was built off the applicant system, so it just pulled the profile information at time of print"*

**Recommendation**:
- Remove "Sync to Badge" button
- Keep only "Print Badge" button
- Print Badge automatically:
  1. Pulls latest applicant data
  2. Creates/updates badge record
  3. Shows print preview
  4. Sends to printer

**Benefits**:
- Simpler workflow (one button instead of two)
- Always prints with latest data
- Eliminates sync step
- Reduces user confusion

**Implementation**: Would require modifying `handlePrintBadge()` to always sync before showing preview.

## Files Modified

1. **[src/pages/ApplicantsPage.jsx](src/pages/ApplicantsPage.jsx)**
   - Added Delete icon import
   - Added deleteApplicant, bulkDeleteApplicants imports
   - Added userProfile from useAuth
   - Added handleDeleteApplicant function
   - Added handlePurgeOldApplicants function
   - Added Process Date column to table
   - Added Delete button to Actions column
   - Added Purge Old Records button (admin only)
   - Reorganized dialog with section headers
   - Updated colspan for empty state

2. **[src/services/firestoreService.js](src/services/firestoreService.js)**
   - Added deleteApplicant function
   - Added bulkDeleteApplicants function

## Deployment Status

✅ **Built**: Successfully compiled
✅ **Deployed**: Firebase Storage rules deployed
✅ **Ready**: All features ready for production use

## Next Steps

1. Push changes to GitHub (auto-deploys via GitHub Actions)
2. Test in production environment
3. Train users on new features:
   - Delete button for individual records
   - Purge button for bulk cleanup (admin/managers)
   - New Process Date column for sorting
4. Consider implementing auto-sync badge feature

## Notes

- Default sort already set to Process Date (newest first)
- All table columns (10 total) remain accessible
- Delete and purge operations are permanent and cannot be undone
- Purge feature helps maintain database hygiene by removing old, inactive applicants
- Improved dialog layout provides better visual organization without changing functionality
