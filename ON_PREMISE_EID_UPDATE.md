# On-Premise Data Entry - EID-Based System Update

## Date: January 3, 2026

## Overview
Updated the on-premise data entry system to use Employee IDs (EIDs) instead of names when recording new starts. This prevents issues with duplicate names (e.g., multiple "John Smith" starts in the same week) and provides real-time validation.

## Changes Made

### 1. Updated OnPremiseForm Component
**File:** `src/components/dataEntry/OnPremiseForm.jsx`

#### New Features:
- **EID Input Instead of Names**: When entering the number of new starts, you now input EIDs instead of full names
- **Real-Time Validation**: As you type each EID, the system immediately validates it against the applicant database
- **Status Display**: Once an EID is validated, the system shows:
  - Applicant's name
  - Current status
  - Visual indicator (green checkmark, yellow warning, or red error)

#### Validation Logic:
1. **✅ Success (Green)**: EID found and applicant is in "Finalized" or "CB Updated" status
2. **⚠️ Warning (Yellow)**: EID found but applicant is NOT in a finalized status (e.g., "BG Pending", "I-9 Pending")
3. **❌ Error (Red)**: EID not found in the applicant system

#### Error Prevention:
- Cannot submit the form if any EID has an error
- Warning states allow submission (with notification that status is not finalized)

### 2. Updated Data Entry Service
**File:** `src/services/dataEntryService.js`

#### Changes:
- Store `newStartEIDs` array instead of `newStartNames`
- Store `eidValidation` array with applicant details for each EID
- Update applicant status to "Started" using validated applicant IDs (more reliable than name matching)
- Set `actualStartDate` to the date entered in the form

### 3. UI Improvements

#### Before:
```
New Start Names:
[First Last    ] [First Last    ] [First Last    ]
```

#### After:
```
New Start EIDs:
[12345 ✓]                    [67890 ⚠️]                   [11111 ❌]
John Smith - Status: CB      Jane Doe - Status: BG       EID not found in
Updated                      Pending (Not finalized)     applicant system
```

## User Guide

### How to Enter New Starts:

1. **Enter the number** of new starts in the "New Starts" field
2. **Input fields appear** for each new start
3. **Type the EID** for each person
4. **Wait for validation** (shows loading spinner briefly)
5. **Check the status**:
   - ✅ Green checkmark = Ready to go!
   - ⚠️ Yellow warning = Not finalized (can still submit, but be aware)
   - ❌ Red error = Invalid EID (must fix before submitting)

### Example Workflow:

```
Step 1: Enter "3" in New Starts field
Step 2: Three EID input fields appear
Step 3: Type first EID "12345"
Step 4: System validates and shows: "John Smith - Status: CB Updated" ✅
Step 5: Type second EID "67890"  
Step 6: System validates and shows: "Jane Doe - Status: BG Pending (Not finalized)" ⚠️
Step 7: Type third EID "99999"
Step 8: System shows: "EID not found in applicant system" ❌
Step 9: Fix the third EID or remove it
Step 10: Submit form when all EIDs are valid
```

## Benefits

### 1. **Prevents Duplicate Name Issues**
- No more confusion when multiple people have the same name
- EIDs are unique identifiers

### 2. **Real-Time Validation**
- Catch errors before submitting
- See exactly who you're marking as "Started"
- Verify status before committing

### 3. **Data Integrity**
- More reliable matching (EID vs. name matching)
- Automatic status updates in applicant system
- Proper date tracking (actualStartDate)

### 4. **Better User Experience**
- Immediate feedback
- Clear visual indicators
- Helpful error messages

## Technical Details

### Firestore Query Strategy:
The system checks both `eid` and `crmNumber` fields to maximize compatibility:
```javascript
// Query 1: Check eid field
query(collection(db, 'applicants'), where('eid', '==', eid))

// Query 2: Check crmNumber field (fallback for bulk uploads)
query(collection(db, 'applicants'), where('crmNumber', '==', eid))
```

### Data Stored:
```javascript
{
  // ... other on-premise data fields
  newStartEIDs: ['12345', '67890'],
  eidValidation: [
    {
      eid: '12345',
      status: 'success',
      message: 'John Smith - Status: CB Updated',
      applicantData: { id: 'doc123', name: 'John Smith', status: 'CB Updated', ... }
    },
    {
      eid: '67890',
      status: 'warning',
      message: 'Jane Doe - Status: BG Pending (Not finalized)',
      applicantData: { id: 'doc456', name: 'Jane Doe', status: 'BG Pending', ... }
    }
  ]
}
```

### Status Update Logic:
When the form is submitted, for each validated EID:
- If applicant status is NOT "Started":
  - Update status to "Started"
  - Set actualStartDate to the form date
  - Update lastModified timestamp
- If already "Started": Skip (no duplicate updates)

## Testing Recommendations

1. **Test with valid EID**: Enter an EID that exists in your applicant system
2. **Test with invalid EID**: Enter an EID that doesn't exist
3. **Test with non-finalized applicant**: Enter an EID for someone in "BG Pending" status
4. **Test multiple entries**: Add 5+ new starts with various statuses
5. **Test form submission**: Verify applicant statuses update correctly

## Migration Notes

### Existing Data:
- Old on-premise data with `newStartNames` will remain in the database
- New entries will use `newStartEIDs` and `eidValidation`
- Both formats are supported (no breaking changes)

### No Database Migration Needed:
- The change is forward-compatible
- Old records still readable
- New records use improved format

## Future Enhancements (Optional)

Potential improvements for future consideration:
- Auto-complete EID from recent entries
- Bulk EID entry (paste multiple EIDs)
- Export new starts report with full applicant details
- Link to applicant profile from validation message

---

**Questions?** Contact your system administrator or check the main project documentation.
