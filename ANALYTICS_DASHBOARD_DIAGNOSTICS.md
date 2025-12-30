# Analytics Dashboard Diagnostics Guide

## Overview

This guide helps diagnose and fix issues with analytics dashboards not showing recent data.

## Recent Fixes

### ✅ Home Page Dashboard Button
**Issue:** Dashboard button pointed to `/dashboard` instead of `/analytics`
**Fix:** Updated [EnhancedHome.jsx:50](src/pages/EnhancedHome.jsx#L50) to point to `/analytics`
**Status:** Fixed and deployed

## Data Flow Architecture

### How Data Gets to Dashboards

```
Data Entry → Firestore Collections → Dashboard Queries → Chart Display
```

1. **Data Entry** ([src/pages/DataEntry.jsx](src/pages/DataEntry.jsx))
   - User enters data via Data Entry page
   - Calls `addShiftData()` or `addHoursData()` from firestoreService

2. **Firestore Collections**
   - `shiftData` - Daily shift metrics (numberWorking, numberRequested, etc.)
   - `hoursData` - Hours worked by shift
   - `onPremiseData` - On-site attendance tracking
   - `earlyLeaves` - Early leave records

3. **Dashboard Queries** ([src/services/firestoreService.js](src/services/firestoreService.js))
   - `getShiftData(startDate, endDate)` - Queries shiftData collection
   - `getHoursData(startDate, endDate)` - Queries hoursData collection
   - `getAggregateHours(startDate, endDate, groupBy)` - Aggregates hours data

4. **Chart Display** ([src/pages/EnhancedDashboard.jsx](src/pages/EnhancedDashboard.jsx))
   - Attendance Trends: Uses `dashboardData.shifts`
   - Hours Tracking: Uses `dashboardData.hours`

## Common Issues & Solutions

### Issue 1: Attendance Trends Not Showing Recent Data

**Symptoms:**
- Chart is empty or doesn't show data from yesterday/today
- Data was entered via Data Entry page

**Diagnosis Steps:**

1. **Check Date Range**
   - Dashboard default: Last 30 days
   - Location: [EnhancedDashboard.jsx:69-70](src/pages/EnhancedDashboard.jsx#L69-L70)
   ```javascript
   const [startDate, setStartDate] = useState(dayjs().subtract(30, 'days'));
   const [endDate, setEndDate] = useState(dayjs());
   ```
   - **Action:** Verify end date is set to today

2. **Check Data Was Saved to Correct Collection**
   - Open browser console (F12)
   - Look for "Dashboard data loaded:" log
   - Check `shiftResult.dataCount` - should show number of records
   - **Action:** If count is 0, data wasn't saved to `shiftData` collection

3. **Verify Firestore Query**
   - Query code: [firestoreService.js:38-70](src/services/firestoreService.js#L38-L70)
   - Uses date range with `where('date', '>=', ...)` and `where('date', '<=', ...)`
   - **Action:** Check browser console for query errors

4. **Check Firestore Console**
   - Go to Firebase Console → Firestore Database
   - Navigate to `shiftData` collection
   - Verify records exist with recent dates
   - **Important:** Dates should be stored as Firestore Timestamps
   - **Action:** If dates are strings, that's the problem

### Issue 2: Hours Tracking Not Updating After Upload

**Symptoms:**
- Hours chart doesn't show recently uploaded data
- Data was uploaded via Bulk Upload page

**Diagnosis Steps:**

1. **Check Which Upload Method Was Used**
   - **Shift & Hours Data tab:** Saves to `shiftData` AND `hoursData`
   - **Applicant Data tab:** Saves to `applicants` only
   - **Flexible Upload tab:** Can save to any collection
   - **Action:** Verify data was uploaded to `hoursData` collection

2. **Check Upload Success**
   - Look for success message after upload
   - Check browser console for upload errors
   - Verify upload count matches expected rows
   - **Action:** If upload failed, check error message

3. **Verify Data Structure**
   - Hours data needs these fields:
     - `date` (Timestamp)
     - `shift1Hours` (number)
     - `shift2Hours` (number)
     - `totalHours` (number)
   - **Action:** Check Firestore console for correct field names

4. **Check Aggregate Query**
   - Hours chart uses `getAggregateHours()`: [firestoreService.js:115-163](src/services/firestoreService.js#L115-L163)
   - Groups data by day
   - **Action:** Check console logs for aggregation results

### Issue 3: Dashboard Shows Old Data

**Symptoms:**
- Dashboard loads but shows data from weeks/months ago
- Recent data exists in Firestore

**Diagnosis Steps:**

1. **Check Dashboard Refresh**
   - Dashboard loads data on mount and when date range changes
   - **Action:** Try changing the date range to force a refresh
   - Use date pickers at top of dashboard

2. **Check Browser Cache**
   - Browser may be caching old data
   - **Action:** Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
   - Or clear browser cache

3. **Check Data Entry Date**
   - Verify the date you entered data for
   - Data Entry might default to a different date
   - **Action:** Re-enter data for correct date if needed

## Debugging in Production

### Enable Debug Logging

The app already has console logging enabled. Open browser dev tools (F12) and look for:

```javascript
logger.info('Dashboard data loaded:', { ... })
```

**What to check:**
- `shiftResult.dataCount` - Should match number of shift records
- `hoursResult.dataKeys` - Should match number of unique dates
- `shiftResult.sample` - Shows first record to verify data structure

### Check Firestore Directly

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click "Firestore Database" in left sidebar
4. Navigate to collection (shiftData, hoursData, etc.)
5. Verify:
   - Records exist
   - Dates are Timestamps (not strings)
   - Field names match code expectations
   - `submittedBy` and `submittedAt` fields exist

### Check Firestore Indexes

**Required indexes:** [firestore.indexes.json](firestore.indexes.json)

**For shiftData:**
- Index on `date` (ASC) - Lines 133-146
- Index on `shift` (ASC) + `date` (DESC) - Lines 148-165

**For hoursData:**
- Index on `date` (ASC) - Lines 118-131

**To deploy indexes:**
```bash
firebase deploy --only firestore:indexes
```

**Check index status:**
1. Firebase Console → Firestore Database → Indexes tab
2. Verify all indexes show "Enabled" status
3. If "Building", wait for completion

## Data Entry Verification

### Test Data Entry Flow

1. Navigate to Data Entry page
2. Select today's date
3. Enter test data:
   - Number Working: 50
   - Number Requested: 55
   - Shift: 1st
4. Submit
5. Check browser console for success
6. Navigate to Analytics page
7. Verify data appears in Attendance Trends

### Test Bulk Upload Flow

1. Navigate to Upload page
2. Select "Shift & Hours Data" tab
3. Download template
4. Fill in recent dates (yesterday, today)
5. Upload file
6. Check for success message
7. Navigate to Analytics page
8. Verify data appears in both Attendance Trends and Hours Tracking

## Collection Structure Reference

### shiftData Collection

```javascript
{
  date: Timestamp,              // Required
  shift: "1st" | "2nd",        // Required
  numberWorking: number,        // Required
  numberRequested: number,      // Optional
  numberRequired: number,       // Optional
  sendHomes: number,            // Optional
  lineCuts: number,             // Optional
  newStarts: Array,             // Optional: [{name, eid}]
  notes: string,                // Optional
  submittedBy: string,          // Auto-added
  submittedAt: Timestamp        // Auto-added
}
```

### hoursData Collection

```javascript
{
  date: Timestamp,              // Required
  shift1Hours: number,          // Optional
  shift2Hours: number,          // Optional
  totalHours: number,           // Computed or provided
  associateHours: Array,        // Optional
  submittedBy: string,          // Auto-added
  submittedAt: Timestamp        // Auto-added
}
```

## Query Debugging

### Check Query Constraints

**Attendance Trends query:** [firestoreService.js:48-58](src/services/firestoreService.js#L48-L58)

```javascript
const constraints = [
  where('date', '>=', Timestamp.fromDate(start)),
  where('date', '<=', Timestamp.fromDate(end)),
  orderBy('date', 'asc')
];
```

**Hours Tracking query:** [firestoreService.js:98-103](src/services/firestoreService.js#L98-L103)

```javascript
const q = query(
  collection(db, 'hoursData'),
  where('date', '>=', Timestamp.fromDate(start)),
  where('date', '<=', Timestamp.fromDate(end)),
  orderBy('date', 'asc')
);
```

### Common Query Errors

**Error:** "The query requires an index"
- **Cause:** Missing Firestore index
- **Fix:** Deploy indexes: `firebase deploy --only firestore:indexes`

**Error:** "Invalid field path"
- **Cause:** Field name mismatch
- **Fix:** Check field names in Firestore console match code

**Error:** "Permission denied"
- **Cause:** Firestore rules blocking query
- **Fix:** Check [firestore.rules](firestore.rules) allows read access

## Troubleshooting Checklist

Before reporting an issue, verify:

- [ ] Data was entered for the correct date
- [ ] Date is within the dashboard's date range (last 30 days by default)
- [ ] Data was saved to the correct Firestore collection
- [ ] Dates in Firestore are stored as Timestamps (not strings)
- [ ] Field names match expected structure
- [ ] Firestore indexes are deployed and enabled
- [ ] Browser console shows no errors
- [ ] Hard refresh was attempted (Ctrl+Shift+R)
- [ ] Firestore console shows records exist

## Quick Fixes

### Fix 1: Force Dashboard Refresh

1. Navigate to Analytics page
2. Change date range using date pickers
3. Click away from date picker to trigger reload
4. Data should reload

### Fix 2: Re-enter Data

1. Navigate to Data Entry page
2. Check date is correct (today/yesterday)
3. Re-enter data
4. Verify success message
5. Navigate to Analytics
6. Check if data appears

### Fix 3: Deploy Indexes

If seeing "requires an index" errors:

```bash
firebase deploy --only firestore:indexes
```

Wait 2-5 minutes for indexes to build, then refresh dashboard.

### Fix 4: Clear Browser Cache

1. Open Dev Tools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"
4. Navigate to Analytics page

## Known Limitations

1. **Date Range:** Dashboard only shows last 30 days by default
   - **Workaround:** Use date pickers to select custom range

2. **Real-time Updates:** Dashboard doesn't auto-refresh
   - **Workaround:** Manual refresh or change date range

3. **Timezone Issues:** All dates normalized to UTC
   - **Workaround:** Ensure data entry uses correct date

4. **Aggregate Delays:** Large datasets may take longer to aggregate
   - **Expected:** 1-2 seconds for 1000+ records

## Getting Help

If issues persist after following this guide:

1. **Check Browser Console**
   - Press F12
   - Look for red errors
   - Copy error messages

2. **Check Firestore Console**
   - Verify data exists
   - Check field structure
   - Note collection name

3. **Gather Debug Info**
   - Which dashboard (Overview, Labor Reports, etc.)?
   - What data is missing?
   - When was data entered?
   - What method (Data Entry, Bulk Upload)?
   - Any error messages?

4. **Report Issue**
   - Include all debug info above
   - Screenshot of issue
   - Browser console logs

## Code References

| Feature | File | Lines |
|---------|------|-------|
| Dashboard Loading | [EnhancedDashboard.jsx](src/pages/EnhancedDashboard.jsx) | 72-170 |
| Shift Data Query | [firestoreService.js](src/services/firestoreService.js) | 38-70 |
| Hours Data Query | [firestoreService.js](src/services/firestoreService.js) | 88-113 |
| Hours Aggregation | [firestoreService.js](src/services/firestoreService.js) | 115-163 |
| Attendance Chart | [EnhancedDashboard.jsx](src/pages/EnhancedDashboard.jsx) | 208-250 |
| Hours Chart | [EnhancedDashboard.jsx](src/pages/EnhancedDashboard.jsx) | 252-277 |
| Data Entry | [DataEntry.jsx](src/pages/DataEntry.jsx) | - |
| Bulk Upload | [EnhancedUpload.jsx](src/pages/EnhancedUpload.jsx) | - |

---

**Last Updated:** 2025-12-30
**Build Status:** ✅ Passing
