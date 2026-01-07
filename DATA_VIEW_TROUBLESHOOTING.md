# Data View - Troubleshooting Guide

## Common Issues and Solutions

### 1. Empty Collections (No Data Showing)

**Issue:** Collections like Shift Data, Hours Data, Recruiter Data, or Associates show 0 records.

**Possible Causes:**
- No data has been uploaded yet
- Data is being stored in a different collection name
- Data upload failed silently

**Solutions:**
1. Check if data was actually imported:
   - Go to the appropriate data entry form for that collection
   - Try uploading sample data to verify the system works
   - Check the Data Management tab for import history

2. Verify collection names in code match Firestore:
   - The app uses specific collection names like `shiftData`, `hoursData`, etc.
   - If you're using different names, data won't be found

3. Check if data is in a different time period:
   - Some collections may only show recent data
   - Try using the search feature to find older records

### 2. Permission Denied Errors

**Issue:** Collections show "Permission denied: You don't have access to read" message.

**Firestore Rules Problem:**
The collection exists but your Firestore security rules don't allow reads.

**Solution - Update Firestore Security Rules:**

1. Go to Firebase Console → Firestore Database → Rules
2. Add these rules for each collection that shows permission errors:

```javascript
// For missing collections, add rules like:
match /forecasts/{document=**} {
  allow read: if request.auth != null;
  allow write: if request.auth != null;
}

match /dailySummary/{document=**} {
  allow read: if request.auth != null;
  allow write: if request.auth != null;
}

match /weeklySummary/{document=**} {
  allow read: if request.auth != null;
  allow write: if request.auth != null;
}

match /monthlySummary/{document=**} {
  allow read: if request.auth != null;
  allow write: if request.auth != null;
}
```

3. Click **Publish** to apply the rules
4. Return to the app and refresh the page
5. Try viewing the collection again

### 3. Early Leaves Has Validation Warnings

**Issue:** Early Leaves collection shows multiple validation warnings.

**Common Warnings:**
- "X record(s) missing associate ID"
- "X record(s) missing date"
- "X record(s) missing reason for early leave"

**What This Means:**
- Records exist but some have incomplete data
- This is a **warning**, not an error - the data still displays

**How to Fix:**
1. Export the data as JSON (click download icon)
2. Review the exported records to see which ones have missing fields
3. Go to the Early Leaves form and complete the missing information
4. Re-submit the corrected records
5. Refresh the Data View to see updated validation

### 4. Badges Collection Has Validation Warnings

**Issue:** Badges collection shows warnings like "X record(s) missing employee ID (EID)" or "X record(s) missing badge holder name"

**Solutions:**
1. The warnings indicate incomplete badge records
2. Go to Badge Management in Admin Panel
3. Find and update the incomplete badge records
4. Ensure all badges have required fields:
   - Employee ID (EID)
   - Badge holder name
   - Badge status

### 5. Collections Show Data But With Many Warnings

**Issue:** Data is visible but there are multiple validation warnings.

**What to Do:**
1. **Don't Panic** - Validation warnings are non-critical
2. Review the specific warnings listed
3. Decide if you need to correct the data:
   - **Critical Issues** (missing IDs, wrong status) → Fix immediately
   - **Minor Issues** (extra fields, format inconsistencies) → Can be left as-is
4. Use search to find problematic records
5. Export data for offline analysis if needed

### 6. 13 Records Showing But Can't See Them

**Issue:** Shows "13 records" in stats but table appears empty.

**Possible Causes:**
- Collection data structure differs from expected format
- Records may have nested/complex data
- Browser rendering issue

**Solutions:**
1. Try exporting the data (click download button)
   - This downloads all records as JSON
   - You can open it in a text editor or JSON viewer
2. Try searching for common values
3. Refresh the page and try again
4. Check if records have an `id` field (required for display)

## Understanding Validation Messages

### Info Level (No Alert)
- Collection is empty or has no issues
- All records appear valid

### Warning Level (Yellow Alert)
- Some records missing optional or recommended fields
- Status values may be inconsistent
- **Action:** Review and correct if needed

### Error Level (Red Alert)
- Critical issues preventing data integrity
- Required fields are missing
- **Action:** Fix immediately before using data

## Data Upload Troubleshooting

### If Data Still Doesn't Appear After Upload

1. **Check Data Management Tab:**
   - Go to Admin → Data Management
   - Review import history
   - Check for error messages

2. **Verify Data Format:**
   - Check that CSV/Excel files have correct headers
   - Ensure data types match expected formats
   - Look for encoding issues (UTF-8 recommended)

3. **Check Collection Names:**
   - Data must be uploaded to the correct collection
   - Common collections: `applicants`, `associates`, `badges`, `shiftData`, etc.

4. **Check Firestore Rules:**
   - Verify your account has write access to the collection
   - Admin account should have full access

### Manual Data Entry

If bulk upload isn't working, try entering data manually:

1. Go to the appropriate form (e.g., Applicants Page, Shift Data entry)
2. Enter a single record
3. Submit and verify it appears in Data View
4. If it works, the form is fine - check your bulk upload file format

## Checking Data Sync Status

**To verify data is synced correctly:**

1. Look at "Last Updated" timestamp
   - Recent timestamp = data is current
   - Old timestamp = data hasn't been updated

2. Check "Total Records"
   - Growing number = new data being added
   - Stable number = no new data
   - Zero = collection empty

3. Compare across related collections:
   - Applicants ↔ Associates (applicants should become associates)
   - Shift Data ↔ Hours Data (should have similar date ranges)

## Performance Considerations

### Large Collections (1000+ Records)

- Data View limits queries to 1000 records per collection
- For larger datasets:
  1. Export as JSON (download button)
  2. Analyze locally with spreadsheet or programming tools
  3. Use search to find specific records

### Slow Loading

- Large objects within records can slow rendering
- Try exporting instead of viewing in browser
- Use search to narrow down visible records

## Firestore Rules Complete Template

If you want all collections configured at once:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read and write to most collections
    match /{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

**Warning:** This is permissive for development only. For production, use more restrictive rules.

## Reporting Issues

If you encounter issues not covered here:

1. **Export the data:** Use the download button to get JSON
2. **Check the browser console:** Open DevTools (F12) → Console tab for errors
3. **Document what you see:**
   - Collection name
   - Error message (if any)
   - Number of records (if showing)
   - Validation warnings (if any)

## Quick Checklist

- [ ] Firestore rules allow authenticated read access
- [ ] Data was actually imported/uploaded
- [ ] Looking at the correct collection name
- [ ] Collection has been refreshed after data import
- [ ] Browser cache cleared (Ctrl+Shift+Delete or Cmd+Shift+Delete)
- [ ] Logged in as admin/market manager user
