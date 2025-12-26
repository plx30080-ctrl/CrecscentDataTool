# Applicant Bulk Upload - Configuration Guide

## Overview

The applicant bulk upload feature allows you to upload Excel files containing applicant data from your recruiting system (e.g., ProLogistix CRM) directly into Firestore.

## Required Firestore Configuration

### 1. Firestore Indexes

**IMPORTANT**: You must create these indexes manually in the Firebase Console before the applicant features will work correctly.

#### How to Create Indexes:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **CrecscentDataTool**
3. Navigate to **Firestore Database** → **Indexes** tab
4. Click **Create Index**

#### Required Composite Indexes:

**Index 1: For "Pending I-9" badge query**
- Collection: `applicants`
- Fields:
  - `i9Cleared` (Ascending)
  - `status` (Ascending)
- Query Scope: Collection

**Index 2: For "Ready to Start" badge query**
- Collection: `applicants`
- Fields:
  - `status` (Ascending)
  - `i9Cleared` (Ascending)
  - `backgroundStatus` (Ascending)
- Query Scope: Collection

**Index 3: For date range queries**
- Collection: `applicants`
- Fields:
  - `processDate` (Descending)
  - `status` (Ascending)
- Query Scope: Collection

**Index 4: For CRM duplicate checking**
- Collection: `applicants`
- Fields:
  - `crmNumber` (Ascending)
  - `status` (Ascending)
- Query Scope: Collection

#### Required Single-Field Indexes:

Create single-field indexes for these fields (if not automatically created):

- `status` (Ascending)
- `processDate` (Descending)
- `fill` (Ascending)
- `shift` (Ascending)
- `crmNumber` (Ascending)
- `uploadedAt` (Descending)

**Note**: Firebase will automatically suggest creating indexes when queries fail. You can click the link in the console error message to auto-create the required index.

---

### 2. Firestore Security Rules

Update your Firestore security rules to allow bulk writes to the applicants collection.

#### Navigate to Rules:
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **CrecscentDataTool**
3. Navigate to **Firestore Database** → **Rules** tab

#### Add/Update These Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper function to check user role
    function getUserRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }

    function isAdmin() {
      return request.auth != null && getUserRole() in ['admin', 'Market Manager'];
    }

    function isRecruiter() {
      return request.auth != null && getUserRole() in ['admin', 'Market Manager', 'Recruiter', 'On-Site Manager'];
    }

    // Applicants collection
    match /applicants/{applicantId} {
      // Read: Any authenticated user
      allow read: if request.auth != null;

      // Write (create/update): Recruiters and above
      allow create, update: if isRecruiter();

      // Delete: Admins only
      allow delete: if isAdmin();
    }

    // Upload history tracking
    match /uploadHistory/{uploadId} {
      allow read: if request.auth != null;
      allow write: if isRecruiter();
    }

    // Keep existing rules for other collections...
  }
}
```

**Important Notes**:
- Adjust the role names to match your user roles system
- The rules above allow Recruiters to upload and manage applicants
- Only Admins can delete applicants
- All authenticated users can read applicant data

#### Click "Publish" to apply the rules

---

### 3. Storage Rules (Optional)

If you plan to store the original Excel files in Firebase Storage:

1. Navigate to **Storage** → **Rules** tab
2. Add these rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /uploads/applicants/{fileName} {
      // Allow upload for authenticated users
      allow write: if request.auth != null &&
        request.resource.size < 10 * 1024 * 1024 && // 10MB limit
        request.resource.contentType.matches('application/vnd.*');

      // Allow read for authenticated users
      allow read: if request.auth != null;
    }
  }
}
```

---

## Excel File Format

### Required Columns

Your Excel file must contain these columns (column headers can have line breaks):

| Column Name | Type | Required | Description |
|-------------|------|----------|-------------|
| **Status** | Text | ✅ Yes | One of: Started, CB Updated, Rejected, BG Pending, Adjudication Pending, I-9 Pending, Declined, No Contact |
| **Name** | Text | ✅ Yes | Full name of applicant |
| **CRM Number** | Text/Number | ✅ Yes | ProLogistix CRM ID |
| **Process Date** | Date | ✅ Yes | Date entered into system |

### Optional Columns

| Column Name | Type | Required | Description |
|-------------|------|----------|-------------|
| Phone Number | Text | ❌ No | Contact phone (formatted as text) |
| Email | Text | ❌ No | Email address |
| I-9 Cleared | Text | ❌ No | "Yes" or empty |
| Background Status (Valid, Pending or Flagged) | Text | ❌ No | clear, pending, flagged, or notes |
| Shift | Text | ❌ No | 1st, 2nd, or Mid |
| Notes | Text | ❌ No | Additional notes |
| Fill | Text | ❌ No | Recruiter/owner initials (e.g., "AD", "Jae") |

### Column Header Variations

The upload tool handles these column name variations:

- **Phone Number** can be: "Phone\nNumber", "Phone Number", "PhoneNumber"
- **CRM Number** can be: "CRM \nNumber", "CRM Number", "CRMNumber"
- **I-9 Cleared** can be: "I-9\nCleared", "I-9 Cleared", "I9Cleared"
- **Background Status** can be: "Background Status \n(Valid, Pending or Flagged)", "Background Status", etc.

---

## Data Validation Rules

The upload tool validates each row before importing:

### Required Field Validation
- **name**: Must not be empty
- **status**: Must not be empty and match one of the valid statuses (case-insensitive)
- **crmNumber**: Must not be empty
- **processDate**: Must be a valid date

### Optional Field Validation
- **email**: Must be valid email format (if provided)
- **shift**: Must be "1st", "2nd", or "Mid" (if provided)
- **phone**: Any format accepted, will be normalized to digits only

### Date Format Handling
- Accepts Excel date serial numbers (e.g., 45300)
- Accepts ISO date strings (e.g., "2024-01-15")
- Accepts common date formats (e.g., "1/15/2024", "Jan 15, 2024")

### Duplicate Detection
- Before importing, the tool checks for existing applicants with matching CRM numbers
- If duplicates are found, a warning is displayed
- You can choose to:
  - **Append**: Keep existing records and add new ones (may create duplicates)
  - **Replace All**: Delete all existing applicants and import fresh data

---

## Upload Process

### Step-by-Step:

1. **Navigate to Bulk Data Upload page**
   - Click "Dashboard" → "Bulk Data Upload"
   - Select the "Applicant Data" tab

2. **Upload Excel File**
   - Click "Select Excel File"
   - Choose your .xlsx or .xls file (max 10MB)
   - File will be parsed and validated automatically

3. **Review Preview**
   - Check the status breakdown (e.g., "546 Started, 345 CB Updated...")
   - Review the first 20 sample records
   - Look for validation errors or duplicate warnings

4. **Choose Import Option**
   - **Append New Records**: Keeps existing data, adds new applicants
   - **Replace All Data**: Deletes all existing applicants, imports fresh set

5. **Confirm Import**
   - Click "Import [X] Applicants"
   - Progress is tracked in the browser console
   - Wait for success message

6. **Verify**
   - Navigate to Applicants page
   - Confirm data was imported correctly

---

## Error Handling

### Common Errors and Solutions:

**Error: "Missing required field 'name'"**
- **Cause**: A row has an empty Name column
- **Solution**: Fill in all Name fields or remove empty rows

**Error: "Invalid status 'XYZ'"**
- **Cause**: Status value doesn't match valid options
- **Solution**: Use one of: Started, CB Updated, Rejected, BG Pending, Adjudication Pending, I-9 Pending, Declined, No Contact

**Error: "Invalid date '...'"**
- **Cause**: Process Date is not a recognized date format
- **Solution**: Format dates as YYYY-MM-DD or use Excel date cells

**Error: "Invalid email '...'"**
- **Cause**: Email format is incorrect
- **Solution**: Use valid email format (user@domain.com) or leave empty

**Error: "File size exceeds 10MB limit"**
- **Cause**: Excel file is too large
- **Solution**: Split into multiple files or remove unnecessary columns

**Error: "Validation Errors Dialog"**
- A dialog will show all validation errors with row numbers
- You can download an error report
- Fix the errors in Excel and re-upload

---

## Firestore Data Structure

Each applicant document in Firestore has this structure:

```javascript
{
  // Core applicant data from Excel
  status: "Started",                    // Required
  name: "John Doe",                     // Required
  phoneNumber: "3145551234",            // Optional (digits only)
  email: "john@example.com",            // Optional
  crmNumber: "12345678",                // Required
  processDate: Timestamp,               // Required (Firestore Timestamp)
  i9Cleared: "Yes",                     // Optional ("Yes" or "")
  backgroundStatus: "clear",            // Optional
  shift: "1st",                         // Optional ("1st", "2nd", "Mid")
  notes: "Additional notes",            // Optional
  fill: "AD",                           // Optional

  // Metadata (automatically added)
  uploadedAt: Timestamp,                // When this record was uploaded
  uploadedBy: "userId123",              // User ID who uploaded
  lastModified: Timestamp,              // Last modification time
  lastModifiedBy: "userId123"           // User ID who last modified
}
```

---

## Testing Checklist

After setting up Firestore configuration, test these scenarios:

- [ ] Upload valid Excel file with all columns (should succeed)
- [ ] Upload file with missing optional columns (should succeed with defaults)
- [ ] Upload file with invalid status (should show validation errors)
- [ ] Upload file with invalid dates (should show validation errors)
- [ ] Upload file with duplicate CRM numbers (should show warning)
- [ ] Upload 100+ records (should complete without errors)
- [ ] Test "Replace All" mode (should delete old data)
- [ ] Test "Append" mode (should keep old data)
- [ ] Verify uploaded data appears on Applicants page
- [ ] Check that status breakdown displays correctly
- [ ] Verify Firestore indexes are working (no index errors in console)
- [ ] Verify security rules allow bulk writes for your role
- [ ] Test with malformed Excel file (should fail gracefully)
- [ ] Test file size limit (10MB+) (should reject)

---

## Troubleshooting

### Issue: "Missing or insufficient permissions" error

**Solution**:
1. Check Firestore security rules are updated (see section 2 above)
2. Verify your user role has write access to `applicants` collection
3. Make sure you're signed in as a user with Recruiter or Admin role

### Issue: Firestore index errors in console

**Solution**:
1. Look for a link in the error message like "The query requires an index..."
2. Click the link to auto-create the index
3. Wait 1-2 minutes for index to build
4. Retry the operation

### Issue: Upload succeeds but data doesn't appear

**Solution**:
1. Refresh the Applicants page
2. Check Firestore Console to see if documents were created
3. Verify date filters on Applicants page match your data
4. Check browser console for errors

### Issue: Excel file won't parse

**Solution**:
1. Make sure file is .xlsx or .xls format
2. Open file in Excel and re-save to ensure it's not corrupted
3. Check that column headers are in the first row
4. Remove any merged cells or complex formatting

---

## Performance Notes

- Uploads are batched in groups of 500 (Firestore limit)
- For 1,000+ applicants, expect 30-60 seconds upload time
- Large files (1,000+ rows) should be split for better performance
- Progress is logged to browser console every batch

---

## Support

If you encounter issues not covered in this guide:

1. Check browser console (F12) for detailed error messages
2. Review Firestore security rules
3. Verify all required indexes are created
4. Check that Excel file matches the required format
5. Try uploading a small test file (10-20 rows) first
