# Bulk Historical Data Import Guide

## Overview
Import 2+ years of historical data with automated validation, data cleaning, and error checking before committing to the database.

## Access the Import Tool

Navigate to: **`/bulk-import`** in your application

Or add it to your navigation menu.

## Supported Data Types

### 1. **Applicant Pipeline**
Historical applicant data from your recruitment system.

**Expected Columns:**
- `name` or `firstName` + `lastName`
- `eid` or `crmNumber` (Employee ID)
- `status` (e.g., "Processed", "Started", "Rejected")
- `processDate` (when applicant was processed)
- `tentativeStartDate` (optional)
- `email`, `phoneNumber`, `shift` (optional)

**Example Row:**
```
John Doe | 12345 | CB Updated | 2024-01-15 | 1st | john.doe@email.com
```

### 2. **Assignment Starts**
Historical record of who started work and when.

**Expected Columns:**
- `eid` (Employee ID)
- `name`
- `startDate` or `hireDate`
- `position`
- `shift`
- `status` (optional, defaults to "Active")

**Example Row:**
```
12345 | JOHN DOE | 2024-01-20 | Production Associate | 1st | Active
```

### 3. **Labor Reports**
Weekly labor reports with hours and headcount data.

**Expected Columns:**
- `weekEnding` (date)
- `totalHours`
- `headcount`
- `shift` (optional)
- `overtime`, `regularHours` (optional)

**Example Row:**
```
2024-01-21 | 2400 | 60 | 1st | 200 | 2200
```

### 4. **Early Leaves**
All recorded early leave incidents.

**Expected Columns:**
- `date`
- `eid`
- `associateName`
- `timeLeft`
- `reason`
- `hoursWorked` (optional)
- `correctiveAction` (optional)
- `shift`

**Example Row:**
```
2024-01-15 | 12345 | JOHN DOE | 2:30 PM | Personal | 6.5 | Warning | 1st
```

### 5. **DNR (Do Not Return) List**
Historical DNR database.

**Expected Columns:**
- `eid`
- `name`
- `reason`
- `dateAdded`
- `status` (optional, defaults to "Active")

**Example Row:**
```
12345 | JOHN DOE | Job Abandonment | 2024-01-10 | Active
```

### 6. **Badge System Export**
Badge data with optional photo folder.

**Expected Columns:**
- `eid`
- `name`
- `position`
- `shift`
- `status` (optional)

**Photos:**
- Upload a folder of photos
- Name format: `12345.jpg` or `John_Doe_12345.jpg`
- System will match photos to EIDs automatically

## Step-by-Step Process

### Step 1: Prepare Your Files

1. **Export from your existing systems**
   - Save as CSV or Excel (.xlsx) format
   - One file per data category

2. **Standardize your data**
   - Use consistent date formats (YYYY-MM-DD recommended)
   - Ensure EIDs are consistent across files
   - Remove any completely empty rows

3. **For badges: Prepare photo folder**
   - Collect all profile photos
   - Name them with EID in the filename
   - Supported formats: JPG, PNG

### Step 2: Upload Files

1. Click "Choose File" for each category you want to import
2. System will automatically parse and display row counts
3. For badges: Also click "Upload Photo Folder" if you have photos
4. Upload as many or as few categories as you need

**Tips:**
- You don't have to upload all categories at once
- Can import one category at a time if preferred
- Files must be CSV or Excel format

### Step 3: Review Data

1. System shows preview of each uploaded file
2. Review first 10 rows of each dataset
3. Check that columns are correctly identified
4. Look for any obvious issues

**What to check:**
- Dates are parsed correctly
- Names are complete
- EIDs are present
- No strange characters or formatting

### Step 4: Validation

System automatically validates your data:

**✅ Success Indicators:**
- All required columns present
- Data formats are correct
- No critical errors

**⚠️ Warnings:**
- Missing optional fields
- Duplicate EIDs (may be okay if from different time periods)
- Photo folder not uploaded for badges

**❌ Errors (Must Fix):**
- Missing required columns
- Invalid data formats
- Missing critical information

**If errors exist:**
- You cannot proceed to import
- Go back and fix the source file
- Re-upload the corrected file

### Step 5: Import

1. Click "Import All Data"
2. System processes each category in batches
3. Progress bar shows completion status
4. Success message when complete

**What happens:**
- Data is transformed to match database schema
- Field names are normalized
- Dates are converted to proper format
- Metadata (upload time, user) is added
- Records are committed in batches of 500

### Step 6: Verify

After import:
- Check the import summary
- Navigate to relevant pages (Applicants, Early Leaves, etc.)
- Verify data appears correctly
- Check a few random records for accuracy

## Data Transformation

The system automatically handles:

### Date Parsing
Accepts multiple formats:
- `2024-01-15`
- `01/15/2024`
- `1/15/2024`
- `Jan 15, 2024`
- `January 15, 2024`

### Field Name Mapping
Automatically recognizes variations:
- `Employee ID`, `EmployeeID`, `ID` → `eid`
- `First Name`, `FirstName` → `firstName`
- `Phone`, `Phone Number`, `PhoneNumber` → `phoneNumber`
- `Process Date`, `ProcessDate` → `processDate`
- Many more...

### Data Normalization
- Names converted to UPPERCASE for associates
- Phone numbers normalized
- Status fields standardized
- Empty fields handled properly

### Default Values
- Missing status defaults to appropriate value
- Missing corrective action defaults to "None"
- Timestamps added automatically

## Best Practices

### Before Import

1. **Backup current data** using the Data Backup page
2. **Clean your source data** - remove test records, duplicates
3. **Standardize formats** - use consistent date/time formats
4. **Test with sample** - import 10-20 rows first to verify
5. **Document anomalies** - note any special cases or quirks

### File Preparation

**Good practices:**
```csv
eid,name,status,processDate,shift
12345,John Doe,CB Updated,2024-01-15,1st
67890,Jane Smith,Started,2024-01-16,2nd
```

**Avoid:**
- Extra blank rows at end
- Merged cells in Excel
- Special characters in field names
- Multiple date formats in same column
- Missing headers

### During Import

1. **Start with smallest dataset** to test the process
2. **Review warnings carefully** - they may indicate issues
3. **Don't close browser** during import
4. **Wait for completion** before navigating away

### After Import

1. **Verify counts** - check that row counts match
2. **Spot check data** - review random records
3. **Test searches** - try finding specific people/records
4. **Check reports** - ensure analytics reflect new data
5. **Keep source files** - in case you need to re-import

## Common Issues & Solutions

### "Missing columns" error
**Problem:** File doesn't have required fields  
**Solution:** Add the missing columns or rename existing ones

### "No data found" error
**Problem:** File is empty or couldn't be parsed  
**Solution:** Check file format, ensure it has data rows (not just headers)

### Dates showing as numbers
**Problem:** Excel date formatting  
**Solution:** Format dates as text before exporting, or use CSV format

### Some rows not importing
**Problem:** Invalid data in those rows  
**Solution:** Check validation messages, fix source data, re-upload

### Duplicate EIDs
**Problem:** Same EID appears multiple times  
**Solution:** Usually okay for historical data (same person, different dates). If truly duplicate, clean source data.

### Photos not matching
**Problem:** Photos not linking to badges  
**Solution:** Ensure photo filenames contain the EID number

## File Size Limits

- **Recommended:** Under 10,000 rows per file
- **Maximum:** System can handle 50,000+ rows
- **Large imports:** May take several minutes

**For very large datasets:**
1. Split into multiple files by year
2. Import one file at a time
3. Monitor progress

## Data Mapping Reference

### Applicants Collection
```
Source Field → Database Field
---------------------------------
Name/Full Name → name
First Name → firstName
Last Name → lastName
Employee ID/EID/ID → eid
CRM Number → crmNumber
Status → status
Process Date → processDate
Start Date → tentativeStartDate
Email → email
Phone → phoneNumber
Shift → shift
Notes → notes
```

### Associates Collection
```
Source Field → Database Field
---------------------------------
EID → eid
Name → name (UPPERCASE)
Start Date/Hire Date → hireDate
Position → position
Shift → shift
Status → status
```

### Early Leaves Collection
```
Source Field → Database Field
---------------------------------
Date → date
EID → eid
Associate Name → associateName (UPPERCASE)
Time Left → timeLeft
Reason → reason
Hours Worked → hoursWorked
Corrective Action → correctiveAction
Shift → shift
```

### DNR Database Collection
```
Source Field → Database Field
---------------------------------
EID → eid
Name → name (UPPERCASE)
Reason → reason
Date Added → dateAdded
Status → status
```

## Tips for Success

1. **Use the backup feature first** - Safety net in case something goes wrong
2. **Import chronologically** - Start with oldest data first
3. **One category at a time** - Easier to verify and troubleshoot
4. **Keep original files** - Don't delete your source data
5. **Test with small batch** - Import 50-100 rows first
6. **Document the process** - Note any issues for future imports
7. **Check after each import** - Verify before moving to next category

## Need Help?

If you encounter issues:
1. Check validation messages carefully
2. Review your source data formatting
3. Try importing a small sample (10 rows)
4. Check the browser console for detailed error messages
5. Verify your data matches the expected format

---

**Ready to import?** Navigate to `/bulk-import` and follow the wizard!
