# Analytics Dashboards - Getting Started Guide

## Overview

Your Crescent Management Platform has **7 integrated analytics dashboards** that provide comprehensive insights into staffing, labor, and recruiting operations:

1. **Overview Dashboard** - Executive summary of all metrics
2. **Labor Reports Dashboard** - Weekly labor data and breakdowns
3. **Recruiter Efficiency Dashboard** - Recruiting pipeline and performance
4. **1st Shift Metrics Dashboard** - First shift specific analytics
5. **2nd Shift Metrics Dashboard** - Second shift specific analytics
6. **Year-Over-Year Comparison** - Historical trend analysis
7. **New Starts Analytics** - Employee onboarding tracking

## Access the Dashboards

### Unified Dashboard Hub
Navigate to: **Dashboard** (or **Analytics Dashboard** in menu)

This provides a dropdown to select any of the 7 dashboards.

### Individual Dashboard Pages
Each dashboard has its own direct URL:
- `/dashboard` - Unified hub (selector)
- `/enhanced-dashboard` - Overview Dashboard
- `/labor-reports` - Labor Reports Dashboard
- `/recruiter-dashboard` - Recruiter Efficiency
- `/first-shift` - 1st Shift Metrics
- `/second-shift` - 2nd Shift Metrics
- `/yoy-comparison` - Year-Over-Year
- `/new-starts` - New Starts Analytics

## What You Need

### 1. Data Sources
Each dashboard pulls from one or more data collections:

**Collection Requirements:**
- ✅ `onPremiseData` - Daily attendance and headcount tracking
- ✅ `laborReports` - Weekly labor reports with shift hours
- ✅ `applicants` - Applicant pipeline data
- ✅ `associates` - Employee master records
- ✅ `earlyLeaves` - Early leave incidents
- ✅ `branchDaily` - Daily branch metrics
- ✅ `badges` - Badge records

**Data Entry Points:**
- On-Premise Data Form → submits to `onPremiseData` collection
- Labor Report Form → submits to `laborReports` collection
- Data Entry page → adds applicants, earlyLeaves data
- Bulk Import → loads multiple records at once

### 2. Firestore Rules
All collections must have read/write permissions for authenticated users.

**Status Check:** Data View (Admin Panel) should show all collections without permission errors.

### 3. Sample/Historical Data
Dashboards work best with data spanning at least 30-60 days.

**Quick Start:**
- Use Bulk Import to load sample labor data
- Or manually enter a few on-premise records via the Data Entry form

## Dashboard Details

### Overview Dashboard (`/enhanced-dashboard`)

**Displays:**
- Average attendance rate
- Fill rate (working vs. requested)
- Average send-homes
- Total new starts
- Trend charts for hours and attendance
- 30-day forecast
- Early leave analysis
- Applicant pipeline status

**Data Needed:** onPremiseData, laborReports, applicants, earlyLeaves

**Time Range:** 30 days (configurable)

**If Empty:** 
- Check Data View for onPremiseData and laborReports records
- Verify data is within the selected date range
- Try exporting data to see what's available

---

### Labor Reports Dashboard (`/labor-reports`)

**Displays:**
- List of all labor reports
- Weekly totals (direct/indirect hours)
- Daily breakdown by shift
- Employee details
- Export to Excel

**Data Needed:** laborReports collection

**How It Works:**
1. Select a report from dropdown
2. View weekly summary
3. See daily/shift breakdown
4. Export data to Excel

**If No Reports Show:**
- Go to Data Entry → Submit Labor Report
- Or Bulk Import → Upload labor data
- Wait for data to sync (usually instant)

---

### Recruiter Efficiency Dashboard (`/recruiter-dashboard`)

**Displays:**
- All applicants with current status
- Associates list (employees)
- DNR list (do not recruit)
- Early leave incidents
- Pipeline funnel
- Recruiter statistics

**Data Needed:** applicants, associates, dnrList, earlyLeaves

**Features:**
- Filter by date range (7/30/90 days, all)
- Color-coded applicant status
- Track recruitment progress

**If Data Missing:**
- Go to Applicants Page → add applicant records
- Use Bulk Import → load applicant list
- Check DNR Management for blocks

---

### 1st Shift Metrics Dashboard (`/first-shift`)

**Displays:**
- 1st shift headcount trends
- Total hours worked
- On-premise hours
- New starts (1st shift)
- Daily metrics table
- Average hours per person

**Data Needed:** onPremiseData, laborReports (1st shift records)

**Filters:** Date range picker (defaults to last 30 days)

**Calculation:**
- Pulls on-premise data for 1st shift only
- Merges with labor report hours
- Shows aggregated metrics

---

### 2nd Shift Metrics Dashboard (`/second-shift`)

**Displays:**
- 2nd shift headcount trends
- Total hours worked
- On-premise hours
- Daily metrics table
- Shift comparison

**Data Needed:** onPremiseData, laborReports (2nd shift records)

**Same as 1st Shift** but filtered for "2nd" shift only.

---

### Year-Over-Year Comparison (`/yoy-comparison`)

**Displays:**
- Current year vs. prior year metrics
- Headcount comparison
- Hours comparison
- Trends and patterns
- Detailed breakdown table

**Modes:**
- Daily - Day by day comparison
- YTD - Year-to-date comparison

**Data Needed:** onPremiseData, laborReports

**Example:**
- Compares Jan 1-7, 2026 vs. Jan 1-7, 2025
- Shows trends and percentage changes

---

### New Starts Analytics (`/new-starts`)

**Displays:**
- New employees by date
- Source (applicants, on-premise, etc.)
- Status tracking
- Timeline view
- Summary statistics

**Data Needed:** applicants, onPremiseData

**Reconciliation Logic:**
- Checks applicants with "Started" status
- Compares with on-premise data
- Flags discrepancies

---

## Troubleshooting

### Dashboard Shows No Data

**Check #1: Data Exists?**
1. Go to Admin Panel → Data View
2. Select a collection (e.g., `onPremiseData`)
3. See if records exist

**Check #2: Date Range**
- All dashboards default to last 30 days
- Make sure your data is within that range
- Use the date picker to expand the range

**Check #3: Collection Permissions**
- Go to Data View
- Try to access each collection
- If you see "Permission denied" errors, check Firestore rules

**Check #4: Data Format**
- Export data as JSON from Data View
- Check that dates, numbers, and statuses are correct
- Invalid data won't display

### Dashboard Loads But Shows Errors

**Check Logs:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for red error messages
4. Check what collection/query failed

**Common Issues:**
- Missing collection (e.g., `branchDaily` not set up)
- Invalid date format
- Missing required fields
- Permission denied on a collection

### Slow Loading

**Optimization:**
- Reduce date range (shorter time period = faster)
- Close other browser tabs
- Clear browser cache (Ctrl+Shift+Delete)
- Check browser network speed

### Charts Not Showing

**Fix:**
1. Refresh the page (F5)
2. Check console for JavaScript errors
3. Verify data has at least 2 data points for charts
4. Try a different date range

## Quick Data Entry

### For Testing/Demo

**Option 1: Manual Entry (Quickest for Few Records)**
1. Go to Data Entry page
2. Fill in On-Premise Data form
3. Submit
4. Refresh dashboard

**Option 2: Bulk Import (Best for Many Records)**
1. Go to Admin Panel → Data Management → Bulk Import
2. Choose data type (e.g., Labor Reports)
3. Upload CSV/Excel file
4. Follow import wizard
5. Dashboards update automatically

**Option 3: Copy Sample Data**
- Check `Sample Uploads/` folder in project
- Download sample labor reports CSV
- Use Bulk Import to load
- Dashboards immediately show data

## Performance Baseline

**Expected Load Times:**
- Overview Dashboard: 2-3 seconds
- Labor Reports: 1-2 seconds
- Recruiter: 1-2 seconds
- Shift dashboards: 2-3 seconds
- YoY Comparison: 2-3 seconds

**If slower:** Check data volume and network speed

## Next Steps

1. ✅ Verify Firestore rules are deployed (completed with earlier fix)
2. ✅ Check Data View for existing data
3. 📊 Enter or import sample data
4. 📈 Navigate to each dashboard
5. 🔧 Configure date ranges as needed
6. 📞 Use dashboards for operations reporting

## Key Functions

All dashboards use these core service functions:

| Function | Collection | Purpose |
|----------|-----------|---------|
| `getShiftData()` | shiftData | Daily shift records |
| `getOnPremiseData()` | onPremiseData | Attendance tracking |
| `getAggregateHours()` | hoursData + laborReports | Merged hours analysis |
| `getApplicantPipeline()` | applicants | Recruitment funnel |
| `getRecruiterData()` | recruiterData | Recruiter statistics |
| `getEarlyLeaveTrends()` | earlyLeaves | Early leave analysis |
| `getLaborReports()` | laborReports | Weekly labor data |
| `getNewStartsSummary()` | applicants + onPremiseData | New employee tracking |

## FAQs

**Q: Why are dashboards empty?**
A: No data in collections for the selected date range. Use Data Entry or Bulk Import to add records.

**Q: Can I view historical data?**
A: Yes! Use the date picker on each dashboard to select different date ranges.

**Q: Why do shift dashboards show different numbers?**
A: 1st and 2nd shift pull different subsets of data. Numbers won't match exactly due to different time periods.

**Q: How often do dashboards update?**
A: Real-time! Refresh (F5) to see latest data after submitting new records.

**Q: Can I export dashboard data?**
A: Labor Reports dashboard has Excel export. Others can use Data View to export as JSON.

## Support

- **Data View Issues:** See [DATA_VIEW_TROUBLESHOOTING.md](DATA_VIEW_TROUBLESHOOTING.md)
- **Data Entry Issues:** Check Data Entry page documentation
- **Firestore Rules:** See [FIRESTORE_RULES_DEPLOYMENT.md](FIRESTORE_RULES_DEPLOYMENT.md)
- **Bulk Import:** See [BULK_IMPORT_GUIDE.md](BULK_IMPORT_GUIDE.md)

---

**Last Updated:** January 7, 2026
**Version:** 1.0 - Initial Release
