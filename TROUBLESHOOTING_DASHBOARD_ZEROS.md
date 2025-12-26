# Troubleshooting Dashboard Showing Zeros

## Problem
The dashboard loads successfully but shows 0 for all metrics (Avg Attendance, Fill Rate, New Starts, Send Homes).

## Common Causes

### 1. No Data in Firestore (Most Common)
The dashboard shows zeros when there's no shift data in the selected date range.

**How to Fix:**
1. Upload data using the **Bulk Data Upload** page
2. Navigate to: Dashboard → Bulk Data Upload (in the navigation menu)
3. Download the CSV template
4. Fill in your data
5. Upload the file

### 2. Date Range Doesn't Match Data
The dashboard defaults to the last 30 days. If your data is older or newer, you won't see it.

**How to Fix:**
1. On the dashboard, use the **Start Date** and **End Date** pickers
2. Adjust the date range to match when you have data
3. Click outside the date picker to trigger a refresh

### 3. Data Upload Failed Silently
Sometimes the upload might show success but the data didn't actually save to Firestore.

**How to Check:**
Open the browser console (F12) and look for:
- ✅ **Success**: `Dashboard data loaded: { shiftResult: { success: true, data: [Array] }}`
- ❌ **No Data**: `Dashboard data loaded: { shiftResult: { success: true, data: [] }}`
- ❌ **Error**: `Error loading dashboard data: ...`

## Step-by-Step Data Upload Guide

### 1. Navigate to Bulk Upload Page
- Click "Dashboard" in the top menu
- Find "Bulk Data Upload" link (or navigate directly to /upload)

### 2. Download CSV Template
- Click "Download Template" button
- Opens a file: `workforce_data_template.csv`
- Template contains sample data with all required fields

### 3. Prepare Your Data
The CSV must have these columns:

**Required Columns:**
- `date` - Format: YYYY-MM-DD (e.g., "2024-01-15")
- `shift` - Values: "1st" or "2nd"
- `numberWorking` - Number of associates who showed up

**Optional Columns:**
- `numberRequested` - How many you requested
- `numberRequired` - How many were required
- `sendHomes` - How many were sent home
- `lineCuts` - Number of line cuts
- `newStarts` - JSON array: `[{"name":"John Doe","eid":"12345"}]`
- `shift1Hours` - Total hours for 1st shift
- `shift2Hours` - Total hours for 2nd shift
- `notes` - Any notes

**Example CSV:**
```csv
date,shift,numberRequested,numberRequired,numberWorking,sendHomes,lineCuts,newStarts,shift1Hours,shift2Hours,notes
2024-12-20,1st,50,45,48,2,1,[],380,0,Good day
2024-12-20,2nd,30,28,27,0,0,[],0,216,Short staffed
2024-12-21,1st,50,45,46,0,0,"[{""name"":""Jane Smith"",""eid"":""67890""}]",368,0,New hire started
```

### 4. Upload Your CSV
- Click "Select CSV File" button
- Choose your filled CSV file
- Preview will show first 10 rows
- Review the data to ensure it looks correct
- Click "Upload X Records to Firestore"
- Wait for success message

### 5. Verify Upload Succeeded
After upload completes, you should see:
- ✅ Green success message: "Successfully uploaded X records!"
- If you see partial success: "Successfully uploaded X records! (Y failed)"
  - Check console for errors on failed records

### 6. Check Dashboard
- Navigate back to Dashboard
- Adjust date range to match your uploaded data
- You should now see:
  - Avg Attendance > 0
  - Fill Rate > 0%
  - Charts with data points

## Debugging Checklist

### Browser Console Debugging
Open browser console (F12) and check:

1. **After loading dashboard:**
   ```javascript
   // Look for this log:
   Dashboard data loaded: {
     shiftResult: { success: true, data: [...] },  // Should have items in array
     hoursResult: { success: true, data: {...} },
     earlyLeavesResult: { ... },
     pipelineResult: { ... }
   }
   ```

2. **Check for permission errors:**
   ```
   Missing or insufficient permissions
   ```
   - If you see this, follow instructions in `FIX_FIRESTORE_PERMISSIONS.md`

3. **Check for query errors:**
   ```
   Error loading dashboard data: ...
   ```
   - This indicates a Firestore query issue

### Firestore Console Verification
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: CrecscentDataTool
3. Navigate to **Firestore Database**
4. Check these collections exist and have data:
   - ✅ `shiftData` - Should have documents with date, shift, numberWorking, etc.
   - ✅ `hoursData` - Should have documents with date, shift1Hours, shift2Hours
   - ✅ `applicants` - (Optional) Recruiting pipeline data
   - ✅ `earlyLeaves` - (Optional) Early leave tracking

### Common Upload Errors

**Error: "No valid data found in CSV"**
- **Cause**: Missing required fields (date, shift, numberWorking)
- **Fix**: Ensure every row has at least: date, shift, and numberWorking

**Error: "Invalid date: [some date]"**
- **Cause**: Date format is incorrect
- **Fix**: Use YYYY-MM-DD format (e.g., 2024-12-20, not 12/20/2024)

**Error: "Failed to parse newStarts"**
- **Cause**: newStarts JSON is malformed
- **Fix**: Use proper JSON format: `[{"name":"John","eid":"123"}]` or leave empty: `[]`

**Partial upload (X succeeded, Y failed)**
- **Cause**: Some rows have invalid data
- **Fix**: Check browser console for which rows failed and why

## Quick Test Data

If you just want to test the dashboard, use this minimal CSV:

```csv
date,shift,numberRequested,numberRequired,numberWorking,sendHomes,lineCuts,newStarts,shift1Hours,shift2Hours,notes
2024-12-15,1st,50,45,48,2,0,[],384,0,Test data
2024-12-15,2nd,30,28,29,0,0,[],0,232,Test data
2024-12-16,1st,50,45,47,1,0,[],376,0,Test data
2024-12-16,2nd,30,28,28,0,0,[],0,224,Test data
2024-12-17,1st,50,45,46,0,0,[],368,0,Test data
2024-12-17,2nd,30,28,27,0,1,[],0,216,Test data
2024-12-18,1st,50,45,49,3,0,"[{""name"":""Test Person"",""eid"":""99999""}]",392,0,Test data
2024-12-18,2nd,30,28,30,0,0,[],0,240,Test data
```

## After Uploading Data

Once you've uploaded data:
1. Dashboard KPIs should show real numbers
2. "Attendance Trend" chart should display a line graph
3. "Hours Tracking" chart should show bar graphs
4. Date range filter should work to show different time periods

## Still Showing Zeros?

If you've uploaded data and dashboard still shows zeros:

1. **Check date range**: Ensure the Start Date and End Date on dashboard encompass your data dates
2. **Hard refresh browser**: Press Ctrl+Shift+R (Cmd+Shift+R on Mac) to clear cache
3. **Check browser console**: Look for any errors or permission issues
4. **Verify Firestore rules**: Follow `FIX_FIRESTORE_PERMISSIONS.md` to ensure you have read access
5. **Check Firestore data**: Open Firebase Console and verify data is actually in the `shiftData` collection

## Contact Points

If you're still stuck:
1. Check browser console for specific error messages
2. Verify Firestore security rules are updated (see `FIX_FIRESTORE_PERMISSIONS.md`)
3. Ensure you're logged in as a user with proper permissions
4. Try uploading a single day's worth of test data first
