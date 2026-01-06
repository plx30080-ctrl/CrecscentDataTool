# Flexible Upload - Collection Requirements

Updated: January 6, 2026

This document defines the required and optional fields for each collection type in the Flexible Upload system.

## Collection Types

### Applicant Pipeline
**Collection:** `applicants`  
**Description:** Applicant pipeline tracking

**Required Fields:**
- Status (must be one of the valid statuses)
- EID (Employee ID) - can use CRM Number as fallback

**Optional Fields:**
- Name (can be constructed from First Name + Last Name)
- First Name
- Last Name
- Phone Number
- Email
- CRM Number
- Process Date
- I-9 Cleared
- Background Status
- Shift
- Notes
- Fill
- Tentative Start Date
- Recruiter

**Notes:**
- If Name is not provided, it will be automatically constructed from First Name + Last Name
- EID will fallback to CRM Number if not explicitly provided
- Process Date is now optional (was previously required)

---

### Early Leaves
**Collection:** `earlyLeaves`  
**Description:** Associates who left early

**Required Fields:**
- Associate Name

**Optional Fields:**
- Date
- Shift
- EID (may not be available for historical data)
- Time Left
- Reason
- Approved
- Notes

**Notes:**
- EID is **optional** because historical data may not have Employee IDs
- Date and Shift are optional to accommodate various data formats

---

### DNR List
**Collection:** `dnr`  
**Description:** Do Not Rehire reference list

**Required Fields:**
- None (reference only)

**Optional Fields:**
- Name
- First Name
- Last Name
- EID
- Reason
- Date Added
- Notes

**Notes:**
- DNR typically only has First Name and Last Name for reference purposes
- Name will be automatically constructed from First Name + Last Name if not provided
- No EID required - this is just a reference list

---

### Assignment Starts
**Collection:** `associates` (stored as associates with hire date)  
**Description:** New assignment start tracking

**Required Fields:**
- EID (Employee ID)
- Name
- Start Date

**Optional Fields:**
- Position
- Shift
- Status
- Notes

**Notes:**
- Start Date is automatically mapped to Hire Date when saved to associates collection
- Position is **optional** (not stored in system)

---

### Badge System Export
**Collection:** `badges`  
**Description:** Badge/access system export

**Required Fields:**
- EID (Employee ID)
- Name

**Optional Fields:**
- Position
- Status
- Hire Date
- Shift
- Email
- Phone Number
- Notes

**Notes:**
- Position is **optional** (not typically stored)

---

### Associates
**Collection:** `associates`  
**Description:** Employee master list

**Required Fields:**
- EID (Employee ID)
- Name

**Optional Fields:**
- Shift
- Phone Number
- Email
- Position
- Status
- Hire Date
- Termination Date
- Notes

**Notes:**
- Shift is now optional (was previously required)
- Position is optional

---

## Column Name Matching

The system uses fuzzy matching to automatically map your Excel/CSV columns to the correct fields. Common variations are recognized, including:

- **Name variations:** Name, Full Name, Employee Name, Associate Name, First + Last Name
- **EID variations:** EID, Employee ID, Employee Number, Associate ID, ID
- **CRM variations:** CRM Number, CRM, CRM #, CRM ID
- **Date variations:** Date, Start Date, Process Date, Hire Date, Date Added
- **Status variations:** Status, Current Status, Applicant Status, Employment Status

---

## How to Use Flexible Upload

1. **Upload File**: Select your Excel (.xlsx, .xls) or CSV file
2. **Select Collection**: Choose the collection type (Applicants, Early Leaves, DNR, etc.)
3. **Map Columns**: The system auto-suggests mappings - review and adjust as needed
4. **Validate & Import**: System validates required fields before importing

---

## Common Issues

### "Missing name" errors
- Make sure you have either a **Name** column OR both **First Name** and **Last Name** columns
- The system will automatically combine First Name + Last Name if Name is not provided

### "Missing EID" errors
- For **Applicants**: EID is required, but can use CRM Number as fallback
- For **Early Leaves**: EID errors appear as warnings only (not blocking)
- For **DNR**: No EID required

### "Missing columns" errors
- Check that required fields are mapped in Step 3
- Use the auto-suggest feature - it recognizes many column name variations
- Skip optional columns that don't exist in your file

---

## Need Help?

If you encounter issues with a specific file format:
1. Check the column names match the variations listed above
2. Ensure required fields are present
3. Review the validation messages in Step 3 before importing
