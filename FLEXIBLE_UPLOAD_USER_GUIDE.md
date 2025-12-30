# Flexible Upload System - User Guide

## What is Flexible Upload?

The Flexible Upload system allows you to import data from **ANY spreadsheet or CSV format** without needing to match specific column names or templates. Instead of reformatting your data to match our templates, you simply map your columns to our data fields using a visual interface.

## Key Benefits

✅ **No More Template Formatting** - Use your existing spreadsheets as-is
✅ **Works with 8 Data Types** - Shift data, hours, applicants, associates, early leaves, on-premise data, branch metrics, recruiter stats
✅ **Smart Auto-Mapping** - System suggests field matches based on column names
✅ **Validation Before Import** - Catches errors before data goes into the system
✅ **Supports CSV & Excel** - Upload .csv, .xlsx, or .xls files

---

## How to Use Flexible Upload

### Step 1: Navigate to Upload Page

1. Log into Crescent Data Tool
2. Click **"Upload"** in the navigation menu
3. Select the **"Flexible Upload"** tab (first tab with tree icon)

### Step 2: Upload Your File

1. Click **"Select File"** button
2. Choose your CSV or Excel file (max 10MB)
3. System automatically detects all columns
4. Proceed to next step

**Supported Formats:**
- CSV files (.csv)
- Excel files (.xlsx, .xls)

### Step 3: Select Data Type

Choose which type of data you're importing:

| Data Type | Description | Use For |
|-----------|-------------|---------|
| **Shift Data** | Daily shift performance metrics | Number working, send homes, line cuts |
| **Hours Data** | Hours worked by shift | 1st shift hours, 2nd shift hours, total hours |
| **Applicants** | Applicant pipeline tracking | Applications, interviews, hires |
| **Early Leaves** | Associates who left early | Early leave tracking |
| **Associates** | Employee master list | Active employee roster |
| **On-Premise Data** | On-site attendance | Headcount, new starts |
| **Branch Daily Metrics** | Daily branch KPIs | Fill rate, attrition, hours |
| **Recruiter Data** | Recruiter performance | Applications, interviews, offers |

### Step 4: Map Columns to Fields

This is where the magic happens!

**For each column in your file:**
1. View sample data from your spreadsheet
2. Select which field it maps to from the dropdown
3. See description of what each field is for
4. Required fields are marked with *
5. Choose "Skip this column" for columns you don't need

**Auto-Suggestions:**
- System automatically suggests mappings based on column names
- Review and adjust suggestions as needed
- Example: Column "Work Date" → auto-mapped to "Date"

**Field Types:**
- **Date** - Dates in any format (YYYY-MM-DD, M/D/YYYY, Excel serial numbers)
- **Number** - Numeric values (hours, counts, percentages)
- **String** - Text fields (names, notes)
- **Email** - Email addresses (validated)
- **Phone** - Phone numbers (automatically normalized)
- **Enum** - Predefined options (shift, status, etc.)

### Step 5: Validate & Import

1. System validates your mappings:
   - ✅ All required fields mapped
   - ✅ No duplicate field mappings
   - ✅ Data types match (dates are dates, numbers are numbers)
   - ✅ Sample data looks correct

2. Review import summary:
   - Number of records
   - Target data type
   - Field mappings

3. Click **"Import"** button

4. Wait for confirmation (large uploads may take a minute)

5. Success! Data is now in the system

---

## Example Use Cases

### Example 1: Importing Shift Data from Different Format

**Your Spreadsheet:**
| Work Date | 1st or 2nd | Associates Present | Sent Home | Notes |
|-----------|------------|-------------------|-----------|-------|
| 1/15/2024 | 1st        | 48                | 2         | Normal day |
| 1/15/2024 | 2nd        | 29                | 0         | One new hire |

**How to Import:**
1. Upload file
2. Select **"Shift Data"**
3. Map columns:
   - "Work Date" → **Date** (required)
   - "1st or 2nd" → **Shift** (required)
   - "Associates Present" → **Number Working** (required)
   - "Sent Home" → **Send Homes** (optional)
   - "Notes" → **Notes** (optional)
4. Import!

### Example 2: Importing ProLogistix Applicant Export

**Your Spreadsheet:**
| Candidate Name | Status | PLX ID | Date Entered | Phone | Shift |
|----------------|--------|--------|--------------|-------|-------|
| John Doe | BG Pending | 12345 | 2024-01-10 | 555-1234 | 1st |
| Jane Smith | Started | 67890 | 2024-01-12 | 555-5678 | 2nd |

**How to Import:**
1. Upload Excel file
2. Select **"Applicants"**
3. Map columns:
   - "Candidate Name" → **Full Name** (required)
   - "Status" → **Status** (required)
   - "PLX ID" → **CRM Number** (required)
   - "Date Entered" → **Process Date** (required)
   - "Phone" → **Phone Number** (optional)
   - "Shift" → **Shift** (optional)
4. Import!

### Example 3: Importing Weekly Hours Report

**Your Spreadsheet:**
| Week Ending | Shift 1 Total | Shift 2 Total |
|-------------|---------------|---------------|
| 1/15/2024   | 380           | 232           |
| 1/16/2024   | 376           | 224           |

**How to Import:**
1. Upload CSV
2. Select **"Hours Data"**
3. Map columns:
   - "Week Ending" → **Date** (required)
   - "Shift 1 Total" → **1st Shift Hours** (optional)
   - "Shift 2 Total" → **2nd Shift Hours** (optional)
   - System auto-calculates **Total Hours**
4. Import!

### Example 4: Importing Branch Daily KPIs

**Your Spreadsheet:**
| Date | Location | Fill % | Hours | New Starts | Terminations |
|------|----------|--------|-------|------------|--------------|
| 1/15/2024 | Louisville | 95.5 | 612 | 2 | 0 |
| 1/16/2024 | Louisville | 100 | 650 | 0 | 1 |

**How to Import:**
1. Upload file
2. Select **"Branch Daily Metrics"**
3. Map columns:
   - "Date" → **Date** (required)
   - "Location" → **Branch** (required)
   - "Fill %" → **Fill Rate** (optional)
   - "Hours" → **Hours Worked** (optional)
   - "New Starts" → **New Starts (Count)** (optional)
   - "Terminations" → **Attrition** (optional)
4. Import!

---

## Complete Field Reference

### Shift Data Fields

**Required:**
- ✅ **Date** - The date of the shift
- ✅ **Shift** - Either "1st" or "2nd"
- ✅ **Number Working** - Number of associates who showed up

**Optional:**
- Number Requested - Associates requested from staffing
- Number Required - Minimum required for operations
- Send Homes - Number sent home (overstaffing)
- Line Cuts - Number of line cuts
- New Starts - New hires (JSON format: `[]` or `[{"name":"John","eid":"123"}]`)
- Notes - Any notes

### Hours Data Fields

**Required:**
- ✅ **Date** - The date

**Optional:**
- 1st Shift Hours - Hours worked by 1st shift
- 2nd Shift Hours - Hours worked by 2nd shift
- Total Hours - Auto-calculated if not provided

### Applicant Fields

**Required:**
- ✅ **Full Name** - Full name or use First Name + Last Name
- ✅ **Status** - Started, CB Updated, Rejected, BG Pending, Adjudication Pending, I-9 Pending, Declined, or No Contact
- ✅ **CRM Number** - ProLogistix CRM ID
- ✅ **Process Date** - Date entered into system

**Optional:**
- First Name - If not using Full Name
- Last Name - If not using Full Name
- Phone Number - Auto-normalized
- Email - Validated
- Employee ID - Defaults to CRM Number
- I-9 Cleared - "Yes" or blank
- Background Status - Valid, Pending, or Flagged
- Shift - 1st, 2nd, or Mid
- Notes
- Fill Status
- Tentative Start Date
- Recruiter

### Early Leave Fields

**Required:**
- ✅ **Date** - Date of early leave
- ✅ **Shift** - 1st, 2nd, or Mid
- ✅ **Associate Name** - Name of associate
- ✅ **Employee ID** - Employee ID

**Optional:**
- Time Left - Time they left (e.g., "2:30 PM")
- Reason - Reason for leaving early
- Approved - True/false or yes/no
- Notes

### Associate Fields

**Required:**
- ✅ **Employee ID** - Employee ID
- ✅ **Full Name** - Full name
- ✅ **Shift** - 1st, 2nd, or Mid

**Optional:**
- Phone Number
- Email
- Position - Job title
- Status - Active, Inactive
- Hire Date
- Termination Date
- Notes

### On-Premise Data Fields

**Required:**
- ✅ **Date** - The date
- ✅ **Shift** - 1st, 2nd, or Mid

**Optional:**
- Headcount - Number on site
- New Starts - JSON format
- Notes

### Branch Daily Metrics Fields

**Required:**
- ✅ **Date** - The date
- ✅ **Branch** - Branch name or ID

**Optional:**
- Fill Rate - Percentage (0-100)
- Hours Worked - Total hours
- New Starts (Count) - Number of new starts
- Attrition - Number of terminations
- Notes

### Recruiter Data Fields

**Required:**
- ✅ **Date** - The date
- ✅ **Recruiter Name** - Name of recruiter

**Optional:**
- Applications Received
- Interviews Scheduled
- Offers
- New Hires
- Notes

---

## Tips & Best Practices

### ✅ Do's

- **Review Auto-Suggestions** - System is smart, but always verify
- **Use Sample Data** - Look at the sample values to confirm correct mapping
- **Map All Required Fields** - System won't let you import without them
- **Test with Small File First** - Upload 10-20 rows first to test mapping
- **Keep Notes Column** - Always map notes for additional context
- **Use Consistent Date Formats** - Excel serial numbers or YYYY-MM-DD work best

### ❌ Don'ts

- **Don't Skip Required Fields** - You'll get validation errors
- **Don't Map Same Field Twice** - Each field can only map to one column
- **Don't Ignore Validation Errors** - Fix them before importing
- **Don't Import Unverified Data** - Always review sample values first
- **Don't Upload Huge Files** - Split files over 10MB

---

## Troubleshooting

### "Required field not mapped"

**Problem:** You didn't map all required fields for the selected data type.

**Solution:**
1. Check which fields are marked with * (required)
2. Map your columns to these fields
3. All required fields must be mapped before import

### "Field is mapped to multiple columns"

**Problem:** You mapped the same field to two different columns.

**Solution:**
1. Each field can only be mapped once
2. Choose which column has the correct data
3. Set other columns to "Skip this column"

### "Invalid date"

**Problem:** System can't parse the date format in your file.

**Solution:**
1. Check your date format (YYYY-MM-DD works best)
2. Excel serial numbers are supported
3. Make sure date cells are formatted as dates, not text

### "Non-numeric value in number field"

**Problem:** You mapped a text column to a number field.

**Solution:**
1. Verify the sample data shown
2. Make sure you mapped the correct column
3. Check for text in numeric columns (like "N/A" or "-")

### "Invalid email"

**Problem:** Email format is incorrect.

**Solution:**
1. Check email format: must be user@domain.com
2. Remove any spaces or special characters
3. Leave blank if email not available

---

## Advanced Features

### Computed Fields

Some fields are automatically calculated:

- **Total Hours** = 1st Shift Hours + 2nd Shift Hours
- **Employee ID** defaults to CRM Number for applicants

### Data Normalization

System automatically normalizes:

- **Phone Numbers** - Strips formatting, keeps digits only
- **Dates** - Converts Excel serial, ISO dates, etc. to standard format
- **Booleans** - Converts "yes", "true", "1" to true

### Upload History

All imports are logged with:
- Collection imported to
- Number of records
- Who uploaded
- When uploaded

---

## FAQ

**Q: Can I upload the same data twice?**
A: Yes, but it will create duplicates. Consider deleting old data first if replacing.

**Q: What's the maximum file size?**
A: 10MB. If larger, split into multiple files.

**Q: Can I upload multiple data types at once?**
A: No, each upload is for one data type. Upload multiple times for different types.

**Q: What if my column names don't match?**
A: That's the whole point! Map any column names to our fields.

**Q: Can I save my column mappings?**
A: Not yet - planned for future release. For now, document your mappings.

**Q: What happens if import fails?**
A: No data is saved. Fix errors and try again.

**Q: Can I undo an import?**
A: No automated undo. You'd need to manually delete records or use admin tools.

**Q: Does this replace the old upload methods?**
A: No, old methods still work. This is an additional flexible option.

---

## Need Help?

If you encounter issues:

1. **Check Validation Errors** - Read the error messages carefully
2. **Review Sample Data** - Make sure columns match what you expect
3. **Test Small File First** - Upload 10 rows to test your mapping
4. **Contact Support** - Reach out if you're stuck

---

## Version History

**v1.0** - Initial release
- 8 data collections supported
- Smart auto-mapping
- Validation engine
- CSV and Excel support
