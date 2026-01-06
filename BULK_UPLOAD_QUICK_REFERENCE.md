# Applicant Bulk Upload - Quick Reference

## Required Columns

| Column Name | Description | Example |
|-------------|-------------|---------|
| **Name** | Full name of applicant | John Doe || **First Name** (optional if Name is provided) | First name | John |
| **Last Name** (optional if Name is provided) | Last name | Doe || **Status** | Current status in pipeline | Started, CB Updated, Rejected, BG Pending, etc. |
| **EID** (or Employee ID) | Unique employee identifier | 12345 |
| **Process Date** | Date entered into system | 2026-01-06 |

## Optional Columns

| Column Name | Description | Example |
|-------------|-------------|---------|
| Phone Number | Contact phone | 555-1234 |
| Email | Email address | john.doe@example.com |
| I-9 Cleared | Whether I-9 is completed | Yes / (blank) |
| Background Status | BG check status | Valid, Pending, Flagged |
| Shift | Work shift | 1st, 2nd, Mid |
| Notes | Additional notes | Any text |
| Fill | Fill information | Any text |
| Recruiter | Recruiter name | Jane Smith |
| Tentative Start | Projected start date | 2026-01-15 |
| **CRM Number** (Legacy) | Old identifier format | 12345 |

## Valid Status Values

✅ Started  
✅ CB Updated  
✅ Rejected  
✅ BG Pending  
✅ Adjudication Pending  
✅ I-9 Pending  
✅ Declined  
✅ No Contact  

## Valid Shift Values

- 1st
- 2nd  
- Mid

## Column Name Variations (All Accepted)

### For Name:
- `Name` (full name)
- `First Name` + `Last Name` (automatically combined)

### For EID:
- `EID`
- `Employee ID`
- `Employee Number`
- `CRM Number` (legacy - automatically converted to EID)
- `CRM` (legacy)

### For Phone:
- `Phone`
- `Phone Number`

### For I-9:
- `I-9 Cleared`
- `I-9`

### For Email:
- `Email`
- `Email Address`

### For Background Status:
- `Background Status`
- `Background Status (Valid, Pending or Flagged)`

### For Tentative Start:
- `Tentative Start`
- `Tentative Start Date`

## Important Notes

### ✅ EID is Unified Across System
- Same EID = Same person everywhere (applicants, associates, badges)
- System prevents duplicate EIDs across all collections
- If someone exists with that EID, you'll get a warning

### ✅ Multi-File Upload
- You can select multiple Excel files at once
- Perfect for uploading weekly labor reports in bulk
- All files are processed and combined into one upload

### ✅ Duplicate Detection
When uploading, system checks if EID already exists in:
- Applicants collection
- Associates collection  
- Badges collection

If found, you'll see a warning showing:
- Which collection has the duplicate
- The person's name and current status
- Whether to append or replace

### ✅ Import Options

**Append Mode** (Default):
- Adds new records to existing data
- Keeps all existing applicants
- May create duplicates if same EID uploaded twice

**Replace Mode**:
- Deletes ALL existing applicants first
- Then uploads new data
- Use when you have a complete fresh dataset

## Excel File Tips

1. **Use consistent column names** - Use exact names from the table above
2. **Check date format** - Dates should be recognizable (YYYY-MM-DD preferred)
3. **Verify EIDs** - Make sure EIDs are correct before uploading
4. **File size limit** - Each file max 10MB
5. **File format** - .xlsx or .xls only

## Example Excel Structure

```
| Name      | Status  | EID   | Process Date | Phone      | Email           | Shift | Recruiter   |
|-----------|---------|-------|--------------|------------|-----------------|-------|-------------|
| John Doe  | Started | 12345 | 2026-01-01   | 555-1234   | john@email.com  | 1st   | Jane Smith  |
| Jane Doe  | BG Pending | 67890 | 2026-01-02 | 555-5678 | jane@email.com | 2nd   | Bob Jones   |
```

## Common Errors

❌ **Missing Name**: Every row must have a name  
❌ **Missing Status**: Every row needs a valid status  
❌ **Missing EID**: Every row needs either EID or CRM Number  
❌ **Missing Process Date**: Date is required  
❌ **Invalid Status**: Status must be one of the valid values  
❌ **Invalid Shift**: Shift must be 1st, 2nd, or Mid  
❌ **Invalid Email**: Email format must be valid (optional field)  

## After Upload

### Preview Screen Shows:
- Total records to import
- Status breakdown (how many in each status)
- First 20 rows preview
- List of files processed (for multi-file uploads)
- Any duplicate warnings

### Status Breakdown Cards
See at-a-glance how many applicants in each status:
- Started: 45
- CB Updated: 12
- BG Pending: 8
- etc.

### Duplicate Warning
If duplicates found, you'll see:
```
⚠️ 3 Duplicate EID(s) Found

The following associates already exist in the system:
• EID 12345 - John Doe (applicants)
• EID 67890 - Jane Smith (associates)
• EID 11111 - Bob Jones (badges)
```

## DNR (Do Not Return) Check

System automatically checks for DNR matches:
- Searches by EID and Name
- Shows warning if match found
- Options:
  - Cancel upload and review
  - Override and proceed (requires manager approval)

## Need Help?

See full documentation:
- **EID_UNIFICATION_GUIDE.md** - Detailed migration guide
- **APPLICANT_UPLOAD_CONFIGURATION.md** - Upload system details
- **BULK_IMPORT_GUIDE.md** - General bulk import info
