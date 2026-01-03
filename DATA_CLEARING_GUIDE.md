# Data Clearing Guide

## Overview
This guide explains how to safely clear all data from your Firestore database to start fresh with historical data uploads for 2024 and 2025.

## What Gets Cleared

The following collections will be **completely emptied**:
- ✓ `applicants` - All applicant records
- ✓ `associates` - All associate records  
- ✓ `badges` - All badge records
- ✓ `earlyLeaves` - All early leave records
- ✓ `dnrDatabase` - All DNR (Do Not Return) records
- ✓ `laborReports` - All labor report data
- ✓ `onPremiseData` - All on-premise daily data
- ✓ `branchDaily` - All branch daily reports
- ✓ `branchWeekly` - All branch weekly reports
- ✓ `hoursData` - All hours worked data
- ✓ `shiftData` - All shift data
- ✓ `recruiterData` - All recruiter activity data
- ✓ `applicantDocuments` - Document metadata (files in storage remain)

## What Gets Preserved

The following collections will **NOT be deleted**:
- ✓ `users` - Your user accounts and profiles
- ✓ `auditLog` - Audit trail for compliance
- ✓ `badgeTemplates` - Your badge templates

## Prerequisites

1. **Node.js must be installed** (you already have this based on your project)
2. **You must be in the project directory**

## Step-by-Step Instructions

### Step 1: Navigate to Project Directory
```bash
cd /workspaces/CrecscentDataTool
```

### Step 2: Run the Clearing Script
```bash
node clear-all-data.js
```

### Step 3: Confirm the Action
You will see a warning message like this:
```
⚠️  WARNING: This will permanently delete ALL data from the following collections:
   applicants, associates, badges, earlyLeaves, dnrDatabase, ...

✓ The following collections will be preserved:
   users, auditLog, badgeTemplates

❗ This action CANNOT be undone!

Are you sure you want to proceed? Type "YES" to confirm:
```

**Type `YES` (all capitals) and press Enter to proceed.**

Any other input will cancel the operation.

### Step 4: Wait for Completion
The script will:
1. Process each collection one by one
2. Show progress for each collection
3. Display a summary when complete

Example output:
```
📦 Clearing collection: applicants
   Found 1,234 document(s) to delete
   Deleted 500/1234 documents...
   Deleted 1000/1234 documents...
   Deleted 1234/1234 documents...
   ✓ Successfully cleared "applicants" (1234 documents)

═══════════════════════════════════════════════════
   Summary
═══════════════════════════════════════════════════
✓ Successfully cleared: 13 collection(s)
✗ Failed: 0 collection(s)
📊 Total documents deleted: 5,678

✅ Data clearing process complete!
   You can now upload fresh data for 2024 and 2025.
```

## After Clearing Data

Once the data is cleared, you can:

1. **Upload Historical Data** - Use the Flexible Upload feature to upload your 2024 and 2025 data files
2. **Verify Data** - Check the Applicants page, Analytics dashboards, etc. to ensure data is loading correctly
3. **No Configuration Changes Needed** - All your settings, user accounts, and templates remain intact

## Important Notes

### Firestore Storage Files
- The script only clears document metadata from the `applicantDocuments` collection
- Actual files in Firebase Storage are NOT deleted automatically
- If you want to clear storage files too, you'll need to do that separately through the Firebase Console

### Can't Undo
- Once you run this script and confirm with "YES", there is no way to recover the deleted data
- Make sure you have backups if you need to preserve any current data

### Users and Permissions
- All user accounts remain active
- User roles and permissions are preserved
- You don't need to re-setup any users

### Audit Trail
- The audit log is preserved for compliance
- Historical audit records remain accessible

## Alternative: Selective Clearing

If you only want to clear specific collections (not all), you can modify the script:

1. Open `clear-all-data.js` in an editor
2. Find the `COLLECTIONS_TO_CLEAR` array (around line 51)
3. Remove any collections you want to keep from that array
4. Save and run the script

Example - only clear applicants and associates:
```javascript
const COLLECTIONS_TO_CLEAR = [
  'applicants',
  'associates'
];
```

## Troubleshooting

### "Permission Denied" Error
- Make sure you're authenticated with Firebase
- Check your Firestore security rules allow admin operations

### Script Hangs or Times Out
- Large collections may take time to delete
- The script processes in batches of 500 documents at a time
- Be patient and let it complete

### Firestore Quota Limits
- If you have very large collections (100k+ documents), you may hit Firestore quota limits
- In this case, run the script multiple times or contact Firebase support

## Need Help?

If you encounter issues:
1. Check the error message in the console
2. Verify your Firebase configuration in the script
3. Ensure your Firestore security rules permit deletions
4. Check the Firebase Console for any service disruptions

## Ready to Start Fresh?

Once you're ready:
```bash
node clear-all-data.js
```

Then type `YES` when prompted to clear all data and start fresh!
