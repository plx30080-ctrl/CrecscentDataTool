# Data View - Quick Fix Reference

## 🔴 Red Alert: Permission Denied Error

**Message:** "Permission denied: You don't have access to read..."

**Fix:** Add Firestore rules for that collection
```javascript
match /collectionName/{document=**} {
  allow read: if request.auth != null;
  allow write: if request.auth != null;
}
```

**Collections that might need rules:**
- forecasts
- dailySummary
- weeklySummary  
- monthlySummary

---

## 📊 Yellow Warning: Data Validation Issues

**What it means:** Some records have incomplete data, but they still work.

**Not a problem if:** Data still displays and you can see the records

**Fix if needed:** 
1. Export the data (click download button)
2. Find records with issues
3. Fill in missing fields using data entry forms
4. Refresh Data View

---

## ⚪ Empty Collection: 0 Records

**Possible causes:**
1. No data uploaded yet
2. Data in different collection name
3. Upload failed

**Check:**
1. Go to data entry form for that collection
2. Upload a test record
3. Refresh Data View

**See data?** → Upload succeeded, add your real data

**Still empty?** → Collection name mismatch or no data to upload

---

## 💾 Exporting Data

**Click the Download button to:**
- Get JSON file of all records
- Analyze offline in spreadsheet
- Backup data
- Share with others

**Filename format:** `collectionName_YYYY-MM-DD.json`

---

## 🔍 Can't Find Records?

**Try:**
1. Use the Search box (filters in real-time)
2. Change rows per page (5/10/25/50/100)
3. Click Refresh button
4. Export and search in JSON file

---

## ✅ Collection Validation Status

| Status | Meaning | Action |
|--------|---------|--------|
| ✅ Valid | No issues | None needed |
| ⚠️ X Warnings | Some incomplete data | Review if needed |
| ❌ Permission Denied | Can't read collection | Update Firestore rules |
| ⚪ Empty | 0 records | Upload data |

---

## 🆘 Quick Troubleshooting Flow

```
Can't see data?
├─ Permission error? → Add Firestore rules
├─ Zero records? → Upload data or check collection name
├─ Have warnings? → Export and review
└─ Can't find record? → Use search or export JSON
```

---

## 📝 Collection Names (Use Exactly)

- users
- applicants
- associates
- badges
- badgePrintQueue
- badgeTemplates
- shiftData
- hoursData
- recruiterData
- earlyLeaves
- onPremiseData
- laborReports
- branchDaily
- branchWeekly
- applicantDocuments
- auditLog (not auditLogs!)
- dnrList
- dnrDatabase

---

## 🚀 What Works Now

✅ View data from 18 collections
✅ Search across all fields
✅ Export as JSON
✅ Automatic validation with warnings
✅ Statistics (record count, last updated, size)
✅ Clear permission error messages
✅ Support for actual Firestore collections in use

---

## ⚠️ Common Gotchas

**Q: Collection shows 13 records but I can't see them?**
A: Export as JSON - records exist but may have unexpected structure

**Q: Why so many validation warnings on Early Leaves?**
A: Records exist but some fields are incomplete - data still works

**Q: Where's Forecasts collection?**
A: Needs Firestore rule added - check Permission Denied error

**Q: Data I uploaded doesn't show up?**
A: Check that it was uploaded to correct collection name (exact match required)

---

## 📞 Need Help?

1. Read: [DATA_VIEW_TROUBLESHOOTING.md](DATA_VIEW_TROUBLESHOOTING.md)
2. Check: Console errors (F12 → Console tab)
3. Try: Exporting data to see structure
4. Verify: Firestore rules allow read access
5. Contact: System administrator

---

**Last Updated:** January 7, 2026
**Version:** 1.1 (Fixed Issues)
