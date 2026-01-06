# EID Unification Migration Guide

## Overview

This migration unifies the employee identifier system across all collections in the Crescent Data Tool. Previously, the `applicants` collection used `crmNumber` as the primary identifier, while other collections (`associates`, `badges`, `earlyLeaves`) used `eid`. This inconsistency has been resolved.

## What Changed

### 1. **Primary Identifier**
- **Before**: `applicants` used `crmNumber`, other collections used `eid`
- **After**: ALL collections now use `eid` as the primary identifier
- **Legacy Support**: `crmNumber` is still supported as a fallback for existing data

### 2. **Duplicate Detection**
- **Before**: Only checked `crmNumber` in `applicants` collection
- **After**: Checks `eid` across ALL collections (`applicants`, `associates`, `badges`)
- **Benefit**: Prevents the same person from being added multiple times across different sections

### 3. **Column Mapping**
- Excel uploads now accept:
  - `EID` (preferred)
  - `Employee ID` (mapped to `eid`)
  - `Employee Number` (mapped to `eid`)
  - `CRM Number` (legacy, mapped to `crmNumber`, but also sets `eid`)

## Migration Steps

### Step 1: Backup Your Data

**IMPORTANT**: Before running the migration, backup your Firestore database.

```bash
# Using the existing backup script
node backup-data.js
```

This creates a timestamped backup in the `backups/` directory.

### Step 2: Run the Migration Script

```bash
node migrate-eid-unification.js
```

#### What the Script Does:

1. **Scans all applicant records**
   - If `eid` is missing but `crmNumber` exists → copies `crmNumber` to `eid`
   - If `eid` exists → keeps it as-is (it's the authoritative value)
   - If both exist and differ → keeps `eid`, logs a warning

2. **Checks for conflicts across collections**
   - Finds all EIDs used in `applicants`, `associates`, and `badges`
   - Reports any cases where the same EID has different names
   - Helps you identify data quality issues

3. **Generates a detailed report**
   - Shows migration statistics
   - Lists any conflicts or issues
   - Provides next steps

#### Expected Output:

```
🚀 Starting EID Unification Migration...

📋 Migrating Applicants Collection...
Found 150 applicant records to process
  ✓ Migrated: John Doe - Set eid to 12345
  ✓ OK: Jane Smith - EID and CRM# match: 67890
  ...
  💾 Committed batch of 150 updates

✅ Applicants Migration Complete:
   - Migrated: 85
   - Already OK: 60
   - Errors: 5

🔍 Checking for EID conflicts across collections...
   - Applicants: 150 unique EIDs
   - Associates: 45 unique EIDs
   - Badges: 38 unique EIDs

✅ No EID conflicts found - all names match across collections!

📊 EID UNIFICATION MIGRATION REPORT
============================================================
Applicants Collection:
  ✓ Records migrated: 85
  ✓ Records already OK: 60
  ✗ Errors encountered: 5

Cross-Collection Analysis:
  ✅ All EIDs are consistent across collections

Next Steps:
  1. Review any warnings or conflicts above
  2. Deploy updated application code
  3. Test duplicate detection with new uploads
  4. Monitor logs for any EID-related issues
============================================================
```

### Step 2: Review Migration Results

Check the output for:
- **Errors**: Any records that couldn't be migrated (review manually)
- **Warnings**: Cases where EID and CRM# differ (verify which is correct)
- **Conflicts**: Same EID with different names across collections (data quality issue)

### Step 3: Deploy Updated Code

The application code has already been updated to:
- Use `eid` as the primary identifier
- Check for duplicates across all collections
- Support both `EID` and `CRM Number` columns for backward compatibility

Simply restart your application or deploy the changes.

## Testing the Migration

### Test 1: Upload with EID Column

Create a test Excel file with these columns:
- `Name`
- `Status`
- `EID` (preferred)
- `Process Date`

Upload it via Applicant Bulk Upload. It should work perfectly.

### Test 2: Upload with CRM Number Column (Legacy)

Create a test Excel file with:
- `Name`
- `Status`
- `CRM Number` (legacy format)
- `Process Date`

Upload it. The system will automatically map `CRM Number` to `eid`.

### Test 3: Duplicate Detection

Try uploading an applicant with an EID that already exists in:
- The applicants table
- The associates table
- The badges table

You should see a warning: **"Duplicate EID(s) Found"** showing which collection already has that EID.

### Test 4: Multi-File Upload

Select multiple Excel files (e.g., weekly labor reports) and upload them all at once. All files should be processed and combined into a single batch.

## Rollback Plan

If something goes wrong:

1. **Restore from backup**:
   ```bash
   node restore-data.js
   ```
   Select the backup created in Step 1.

2. **Revert code changes**:
   ```bash
   git checkout HEAD~1 src/components/ApplicantBulkUpload.jsx
   git checkout HEAD~1 src/services/firestoreService.js
   git checkout HEAD~1 src/services/dataEntryService.js
   ```

3. **Restart application**

## Frequently Asked Questions

### Q: What if I have records with only crmNumber and no eid?
**A**: The migration script automatically copies `crmNumber` to `eid` for these records.

### Q: What if eid and crmNumber are different?
**A**: The script keeps `eid` as the authoritative value (EID is the primary identifier). It logs a warning so you can review these cases.

### Q: Will old Excel files with "CRM Number" column still work?
**A**: Yes! The system supports both `EID` and `CRM Number` columns. `CRM Number` values are automatically mapped to `eid`.

### Q: What about DNR (Do Not Return) list?
**A**: DNR continues to use name-based matching (by design). It doesn't use EID because people may not have an EID when flagged as DNR.

### Q: Can someone exist in both applicants and associates with same EID?
**A**: Yes, this is intentional! Someone might be:
  - In `applicants` while going through the hiring pipeline
  - Then moved to `associates` when they start working
  - And have a record in `badges` for their ID badge

The unified EID ensures these all refer to the same person.

### Q: What if duplicate warning shows up?
**A**: The warning tells you that someone with that EID already exists in the system. Review:
  - Are they the same person? (expected for someone returning)
  - Is it a data entry error? (wrong EID)
  - Should they be updated instead of added? (use Replace mode)

## Summary of Benefits

✅ **Unified Identifier**: One EID across entire platform  
✅ **Duplicate Prevention**: System-wide duplicate detection  
✅ **Data Integrity**: Same person = same EID everywhere  
✅ **Backward Compatible**: Legacy files still work  
✅ **Multi-File Upload**: Upload multiple Excel files at once  
✅ **Better Tracking**: Easy to track person's journey from applicant → associate → badge holder

## Support

If you encounter issues:
1. Check the migration report for specific errors
2. Review the application logs
3. Verify your Excel file has either `EID` or `CRM Number` column
4. Ensure EID values are consistent across your data sources

For technical support, review the code comments in:
- `src/components/ApplicantBulkUpload.jsx`
- `src/services/firestoreService.js`
- `migrate-eid-unification.js`
