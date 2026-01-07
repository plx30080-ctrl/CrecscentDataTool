# Analytics Dashboards - Troubleshooting Guide

## Dashboard Data Flow

```
Data Entry Form
     ↓
Firestore Collections
     ↓
Dashboard Service Functions
     ↓
Component State/Charts
     ↓
User Interface
```

## Common Issues & Solutions

### Issue #1: Dashboard Shows "Loading..." Forever

**Symptoms:**
- Spinner keeps spinning
- No data or error message appears
- Page hangs after 10+ seconds

**Root Causes:**
1. Collection doesn't have read permissions
2. Service function is throwing an error silently
3. Network connection issue

**Solutions:**

```bash
# Step 1: Check browser console for errors
- Open DevTools (F12)
- Go to Console tab
- Look for red errors
- Take note of exact error message
```

```bash
# Step 2: Check Data View access
- Go to Admin Panel → Data View
- Try accessing same collection
- Does it work or show permission error?
```

```bash
# Step 3: Check Firestore rules
- Firebase Console → Firestore → Rules
- Verify collection rules exist
- Re-deploy rules if needed:
  firebase deploy --only firestore:rules
```

**If still broken:**
- Hard refresh browser (Ctrl+Shift+R)
- Clear browser cache
- Try different browser
- Check network tab in DevTools

---

### Issue #2: Dashboard Shows No Data (But Loads)

**Symptoms:**
- "No data found" or empty charts
- Dashboard loads in 2-3 seconds
- KPIs show 0 or N/A

**Root Causes:**
1. No data in collection for selected date range
2. Data exists but in wrong collection
3. Date filters are too narrow
4. Data format doesn't match expectations

**Solutions:**

**Step 1: Check If Data Exists**
```
Admin Panel → Data View
- Select collection (e.g., "On Premise Data")
- Does it show "0 records" or "X records"?
- If 0: no data exists yet
- If > 0: data exists but dashboard can't find it
```

**Step 2: Check Date Range**
```
- Dashboard shows "Last 30 days" by default
- Use date picker to expand range
- Try "Last 90 days" or "All time"
- Check if data appears when range expands
```

**Step 3: Check Data Format**
```
Data View → Select collection → Download JSON
- Look at date field format
- Check if status values are valid
- Verify numbers aren't stored as text
```

**Step 4: Verify Collection Names**
```
Each dashboard expects specific collections:
- Overview: onPremiseData, laborReports, applicants
- Labor Reports: laborReports
- Recruiter: applicants, associates, earlyLeaves
- Shift dashboards: onPremiseData, laborReports
```

**If still no data:**
- Try submitting one record via data entry form
- Refresh dashboard
- Does new record appear immediately?
  - Yes: System works, need more data
  - No: There's a deeper issue

---

### Issue #3: One Metric Shows but Others Don't

**Symptoms:**
- Some KPI cards have numbers
- Some KPI cards show 0 or N/A
- Charts are empty but data exists

**Root Causes:**
1. Different metrics come from different collections
2. One collection is empty/has permissions issue
3. Data logic for that specific metric has a bug

**Solutions:**

**Identify Which Collection is Missing:**
- Overview Dashboard: 
  - Attendance: from onPremiseData
  - Hours: from laborReports
  - New Starts: from applicants or onPremiseData
  - Early Leaves: from earlyLeaves

**Check Data View for Each Collection:**
```
Data View:
- onPremiseData: should have records with "working" field
- laborReports: should have "dailyBreakdown" with hours
- applicants: should have "status" and dates
- earlyLeaves: should have "date" and "reason"
```

**If One Collection is Empty:**
- Enter sample data for that collection
- Or use Bulk Import for that specific data type

**If Collections Have Data But Still Nothing Shows:**
- Check console for specific error for that metric
- That metric's calculation function may have a bug
- Provide error details to support

---

### Issue #4: Charts Show Wrong Data

**Symptoms:**
- Numbers don't match data entry
- Chart jumps around when you change filters
- Negative values or impossible numbers

**Root Causes:**
1. Data aggregation logic error
2. Date calculations are wrong
3. Duplicate data being counted twice
4. Mixed data types (text vs. numbers)

**Solutions:**

**Step 1: Export and Manually Check**
```
Data View:
- Select collection
- Download as JSON
- Search for specific dates
- Count manually: is aggregate correct?
```

**Step 2: Check Date Range**
```
- Dashboard date filter range
- Collection query date range
- Are they the same?
- Off-by-one errors with timezones?
```

**Step 3: Look for Duplicates**
```
Data View → Data validation warnings
- "Duplicate IDs detected"?
- Multiple entries for same date?
- Same record submitted twice?
```

**Step 4: Check Aggregation Function**
```
If hours data looks wrong:
- getAggregateHours() merges hoursData + laborReports
- One source might be overriding the other
- Check which is being used
```

**Fix Duplicate Data:**
1. Identify duplicate records in Data View
2. Export them
3. Contact admin to delete duplicates
4. Re-enter data once

---

### Issue #5: Recruiter Dashboard Shows Errors

**Symptoms:**
- "Failed to load recruiter data"
- Some sections empty, others populated
- Date range filter doesn't work

**Root Causes:**
1. Missing collections (applicants, associates)
2. DNR list has invalid data
3. Early leaves collection empty/inaccessible

**Solutions:**

**Collections Required:**
- applicants ✅ Must exist
- associates ✅ Must exist
- dnrList ⚠️ Can be empty, but must be accessible
- earlyLeaves ⚠️ Can be empty, but must be accessible

**Check Each Collection:**
```
Data View:
1. Try "Applicants" - should load
2. Try "Associates" - should load
3. Try "DNR List" - should load (even if 0 records)
4. Try "Early Leaves" - should load (even if 0 records)

Any permission errors? Check Firestore rules.
```

**Add Sample Data:**
```
If collections are empty:
1. Applicants Page → Add applicants
2. Bulk Import → Load employee list to "associates"
3. Continue without DNR/Early Leaves (optional)
```

---

### Issue #6: Shift Dashboard Numbers Don't Match

**Symptoms:**
- 1st Shift headcount ≠ 2nd Shift headcount
- Total isn't sum of shifts
- Hours don't line up

**Root Causes:**
1. Data is split by shift (correct behavior)
2. Each pulls different subset of data
3. On-premise data vs. labor report data mismatch
4. Timezone or date boundary issues

**This is Actually Correct!**
- 1st and 2nd shift dashboards intentionally show different data
- On-Premise Data records have a "shift" field
- Each dashboard filters for its own shift
- Totals won't match because they're not counting same days

**Example:**
```
On-Premise Data:
- Jan 6: 1st Shift = 50 working
- Jan 6: 2nd Shift = 40 working

1st Shift Dashboard shows: 50
2nd Shift Dashboard shows: 40
Total: 90 ✓ (correct)
```

**If Numbers Truly Don't Make Sense:**
1. Export data and verify manually
2. Check "shift" field values in data
3. Ensure data isn't duplicated across shifts

---

### Issue #7: Year-Over-Year Comparison Shows No Prior Year Data

**Symptoms:**
- Current year shows data
- Prior year is empty
- Nothing to compare

**Root Causes:**
1. No data from last year in database
2. Date calculation is wrong
3. Both years querying same period

**Solutions:**

**Expected Behavior:**
- Comparing same period last year
- Example: Jan 1-7, 2026 vs. Jan 1-7, 2025
- If your data only has 2026 records, prior year will be empty

**This is Normal:**
- YoY is for mature systems with historical data
- If using first time, won't have prior year
- Add historical data via Bulk Import
- Come back after 1 year to see comparisons

**To Test With Sample Data:**
1. Use Bulk Import
2. Upload historical data from 2025
3. Set dates to span both 2025 and 2026
4. YoY comparison will work

---

### Issue #8: Forecast Shows "N/A" or Unrealistic Numbers

**Symptoms:**
- Forecast line is flat or missing
- Numbers are 0 or negative
- "Unable to generate forecast" message

**Root Causes:**
1. Not enough historical data (need 30+ days)
2. No new starts data
3. Forecast calculation error

**Solutions:**

**Requirements for Forecast:**
- At least 30-60 days of onPremiseData
- At least some applicants with "Started" status
- Valid date ranges

**If Not Enough Data:**
1. Add more historical data via Bulk Import
2. Or wait 30 days for system to gather data
3. Forecast improves with more history

**If Forecast Still Broken:**
1. Check console for forecast errors
2. Verify historical data is valid
3. Ensure applicants have proper dates

---

## Debugging Checklist

When a dashboard doesn't work:

- [ ] Is browser console showing errors? (F12)
- [ ] Can you access same collection in Data View?
- [ ] Is collection showing permission error in Data View?
- [ ] Does collection have records? (0 or >0)
- [ ] Are records within date range? (check dates)
- [ ] Is data valid format? (export and review JSON)
- [ ] Can you manually verify calculations? (export and count)
- [ ] Does hard refresh help? (Ctrl+Shift+R)
- [ ] Have Firestore rules been deployed? (check rules in Console)
- [ ] Is there network latency? (check DevTools network tab)

---

## Error Messages Reference

| Error | Cause | Fix |
|-------|-------|-----|
| "Failed to load dashboard data" | Network or service error | Refresh page, check network |
| "Permission denied" | Firestore rules issue | Deploy updated rules |
| "No data found" | Collection empty | Enter or import data |
| "Invalid date format" | Date data corrupted | Re-enter record with valid date |
| "Cannot read property 'map'" | Data structure unexpected | Check data format in Data View |
| "undefined is not a function" | Missing service function | Check if collection exists |

---

## Getting Help

**Step 1: Gather Information**
- Exact error message (from console)
- Which dashboard failing
- Expected vs. actual data
- Steps to reproduce

**Step 2: Check Documentation**
- [DASHBOARDS_GETTING_STARTED.md](DASHBOARDS_GETTING_STARTED.md) - Overview
- [DATA_VIEW_TROUBLESHOOTING.md](DATA_VIEW_TROUBLESHOOTING.md) - Data issues
- [FIRESTORE_RULES_DEPLOYMENT.md](FIRESTORE_RULES_DEPLOYMENT.md) - Permission issues

**Step 3: Test in Data View**
- Can you see collection in Data View?
- Does it have the right data?
- Are there validation warnings?

**Step 4: Check Browser Console**
- Open DevTools (F12)
- Look for red errors
- Take screenshot
- Include in support request

---

**Last Updated:** January 7, 2026
**Version:** 1.0
