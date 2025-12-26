# CSV Bulk Upload Guide

## Quick Start

1. Navigate to **Bulk Data Upload** page in the app
2. Click **"Download Template (5 Sample Rows)"**
3. Open the template in Excel or Google Sheets
4. Replace the sample data with your real data
5. Save as CSV and upload

## CSV Structure

### Required Columns

Every row MUST have these columns:

| Column | Format | Example | Description |
|--------|--------|---------|-------------|
| `date` | YYYY-MM-DD | `2024-01-15` | The date (required) |
| `shift` | Text | `1st` or `2nd` | Shift identifier (required) |
| `numberWorking` | Number | `48` | Associates who showed up (required) |

### Optional Columns

These columns are optional but recommended for full analytics:

| Column | Format | Example | Description |
|--------|--------|---------|-------------|
| `numberRequested` | Number | `50` | How many associates you requested |
| `numberRequired` | Number | `45` | Minimum required for operations |
| `sendHomes` | Number | `2` | Number sent home (overstaffed) |
| `lineCuts` | Number | `1` | Number of line cuts |
| `newStarts` | JSON Array | `[]` or `[{"name":"John Doe","eid":"12345"}]` | New hires who started |
| `shift1Hours` | Number | `380` | Total hours for 1st shift (use 0 for 2nd shift rows) |
| `shift2Hours` | Number | `232` | Total hours for 2nd shift (use 0 for 1st shift rows) |
| `notes` | Text | `Short staffed` | Any notes for the day |

## Important Patterns

### Two Rows Per Date

**Each date typically needs TWO rows** - one for 1st shift and one for 2nd shift:

```csv
date,shift,numberRequested,numberWorking,shift1Hours,shift2Hours
2024-01-15,1st,50,48,380,0
2024-01-15,2nd,30,29,0,232
```

### newStarts Format

The `newStarts` column uses JSON format:

**No new hires:**
```csv
newStarts
[]
```

**One new hire:**
```csv
newStarts
[{"name":"John Doe","eid":"12345"}]
```

**Multiple new hires:**
```csv
newStarts
[{"name":"John Doe","eid":"12345"},{"name":"Jane Smith","eid":"67890"}]
```

**Important:** In Excel/Sheets, you might need to wrap this in quotes if it contains commas:
```csv
newStarts
"[{""name"":""John Doe"",""eid"":""12345""},{""name"":""Jane Smith"",""eid"":""67890""}]"
```

## Full Example CSV

Here's a complete example showing 3 days of data:

```csv
date,shift,numberRequested,numberRequired,numberWorking,sendHomes,lineCuts,newStarts,shift1Hours,shift2Hours,notes
2024-01-15,1st,50,45,48,2,0,[],380,0,Overstaffed
2024-01-15,2nd,30,28,29,0,1,[],0,232,
2024-01-16,1st,50,45,47,1,0,[],376,0,
2024-01-16,2nd,30,28,28,0,0,"[{""name"":""Jane Smith"",""eid"":""67890""}]",0,224,New hire started
2024-01-17,1st,50,45,46,0,0,[],368,0,
2024-01-17,2nd,30,28,27,0,2,[],0,216,Short staffed
```

## Tips for Large Datasets

### Uploading a Full Year of Data

If you have a full year (365 days × 2 shifts = ~730 rows):

1. **Use Excel/Google Sheets Formula** to generate dates:
   - Start with `2024-01-01` in cell A2
   - In A3, use `=A2` (same date for 2nd shift)
   - In A4, use `=A2+1` (next day, 1st shift)
   - Continue pattern down

2. **Fill shift column** with alternating pattern:
   - Row 2: `1st`
   - Row 3: `2nd`
   - Row 4: `1st`
   - Row 5: `2nd`
   - Copy pattern down

3. **Fill in your data** for each row

4. **Save as CSV**:
   - Excel: File → Save As → CSV (Comma delimited)
   - Google Sheets: File → Download → Comma Separated Values (.csv)

### Formula Examples

**Excel/Sheets formula for alternating shifts:**
```
=IF(MOD(ROW(),2)=0,"1st","2nd")
```

**Excel/Sheets formula for shift1Hours (0 for 2nd shift rows):**
```
=IF(B2="1st", 380, 0)
```

**Excel/Sheets formula for shift2Hours (0 for 1st shift rows):**
```
=IF(B2="2nd", 232, 0)
```

## Common Issues and Solutions

### Issue: "Invalid date" errors

**Cause:** Date format is wrong
**Solution:** Use YYYY-MM-DD format (e.g., `2024-01-15`, not `1/15/2024` or `01-15-2024`)

**Excel Fix:**
1. Select the date column
2. Right-click → Format Cells
3. Category: Custom
4. Type: `yyyy-mm-dd`
5. Click OK

### Issue: "No valid data found in CSV"

**Cause:** Missing required columns (date, shift, numberWorking)
**Solution:** Ensure every row has:
- A valid date in YYYY-MM-DD format
- Either "1st" or "2nd" in the shift column
- A number in the numberWorking column

### Issue: "Failed to parse newStarts"

**Cause:** Invalid JSON in newStarts column
**Solution:**
- Use `[]` for no new hires
- Use proper JSON syntax: `[{"name":"John","eid":"123"}]`
- In Excel, wrap complex JSON in double quotes

### Issue: Only partial data uploaded (X succeeded, Y failed)

**Cause:** Some rows have errors while others are valid
**Solution:**
1. Check browser console (F12) for specific error messages
2. Look for row numbers in the error messages
3. Fix those specific rows and re-upload

## After Upload

### Verify Upload Success

1. Navigate to the **Debug** page (`/debug`)
2. Click "Check Firestore Data"
3. Verify:
   - Total Records matches your CSV row count
   - Earliest/Latest dates match your data range
   - Sample records look correct

### View Your Data

1. Go to **Dashboard** page
2. Set **Start Date** to your earliest date
3. Set **End Date** to your latest date
4. Dashboard should populate with charts and metrics

## Troubleshooting

### Dashboard Still Shows Zeros

1. Check the date range picker on dashboard
2. Make sure it encompasses your data dates
3. Use the Debug page to find the correct date range

### Upload Shows Success But Data Missing

1. Check Firestore security rules are updated (see `FIX_FIRESTORE_PERMISSIONS.md`)
2. Check browser console for permission errors
3. Try uploading a small test file (5-10 rows) first

### Large File Upload Takes Too Long

- Uploads process one row at a time
- For 730 rows, expect 2-5 minutes
- You'll see progress logs in console every 10 rows
- Don't close the browser tab while uploading

## Need Help?

- Check browser console (F12) for detailed error messages
- Review `TROUBLESHOOTING_DASHBOARD_ZEROS.md` for dashboard issues
- Review `FIX_FIRESTORE_PERMISSIONS.md` for permission errors
- Use the Debug page (`/debug`) to verify data is in Firestore
