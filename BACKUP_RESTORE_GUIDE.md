# Backup & Restore Guide

## Overview
This guide explains how to safely backup and restore your Firestore data.

## Quick Start

### Step 1: Backup Your Data
```bash
node backup-data.js
```

This creates a timestamped backup in `backups/backup-YYYY-MM-DD-HHMMSS/`

### Step 2: Clear Data (Optional)
```bash
node clear-all-data.js
```

### Step 3: Restore if Needed
```bash
node restore-data.js backup-2026-01-03-143022
```

---

## Backup Process

### Running a Backup

```bash
cd /workspaces/CrecscentDataTool
node backup-data.js
```

**You will be prompted for authentication:**
```
🔐 Firebase Authentication Required
Please enter your Firebase credentials to backup data:

Email: your-email@example.com
Password: ********
✓ Authentication successful!
```

Use the same credentials you use to log into the application.

### What Gets Backed Up

**All collections** are included in the backup:
- ✓ applicants
- ✓ associates
- ✓ badges
- ✓ earlyLeaves
- ✓ dnrDatabase
- ✓ laborReports
- ✓ onPremiseData
- ✓ branchDaily
- ✓ branchWeekly
- ✓ hoursData
- ✓ shiftData
- ✓ recruiterData
- ✓ applicantDocuments
- ✓ users
- ✓ auditLog
- ✓ badgeTemplates

### Backup Output

The script creates a folder structure like this:
```
backups/
└── backup-2026-01-03-143022/
    ├── MANIFEST.json          # Backup metadata
    ├── README.md              # Backup information
    ├── applicants.json        # Applicant data
    ├── associates.json        # Associate data
    ├── badges.json            # Badge data
    └── ... (all collections)
```

### Understanding the Files

**MANIFEST.json** - Contains:
- Backup date and time
- List of collections backed up
- Document counts per collection
- Total document count

**README.md** - Human-readable backup information

**Collection JSON files** - Each contains:
```json
[
  {
    "id": "document-id-123",
    "data": {
      "field1": "value1",
      "field2": "value2",
      "timestamp": "2026-01-03T14:30:22.000Z"
    }
  }
]
```

### Backup Output Example

```
═══════════════════════════════════════════════════
   Firestore Data Backup Script
═══════════════════════════════════════════════════

📁 Backup directory: /workspaces/CrecscentDataTool/backups/backup-2026-01-03-143022

🚀 Starting backup process...

📦 Backing up collection: applicants
   ✓ Backed up 1,234 document(s) to applicants.json

📦 Backing up collection: associates
   ✓ Backed up 5,678 document(s) to associates.json

📦 Backing up collection: badges
   ✓ Backed up 890 document(s) to badges.json

... (continues for all collections)

═══════════════════════════════════════════════════
   Backup Summary
═══════════════════════════════════════════════════
✓ Successfully backed up: 16 collection(s)
✗ Failed: 0 collection(s)
📊 Total documents backed up: 12,345

📁 Backup location: /workspaces/CrecscentDataTool/backups/backup-2026-01-03-143022

✅ Backup complete!
   You can now safely run the clear-all-data.js script.
   To restore, keep the backup folder: backup-2026-01-03-143022
```

---

## Restore Process

### Full Restore

Restore all collections from a backup:
```bash
node restore-data.js backup-2026-01-03-143022
```

**You will be prompted for authentication:**
```
🔐 Firebase Authentication Required
Please enter your Firebase credentials to restore data:

Email: your-email@example.com
Password: ********
✓ Authentication successful!
```

### Selective Restore

Restore only a specific collection:
```bash
node restore-data.js backup-2026-01-03-143022 --collection applicants
```

### Skip Existing Documents

Restore without overwriting existing documents:
```bash
node restore-data.js backup-2026-01-03-143022 --skip-existing
```

### List Available Backups

If you forget the backup folder name:
```bash
ls backups/
```

Or run the restore script without arguments:
```bash
node restore-data.js
```

### Restore Process Flow

1. **Specify backup folder**
2. **Script shows confirmation prompt**:
   ```
   ⚠️  WARNING: This will restore data from backup to Firestore.
   📁 Backup folder: backup-2026-01-03-143022
   📦 All collections in backup will be restored
   
   ⚠️  This may overwrite existing data!
   
   Are you sure you want to proceed? Type "YES" to confirm:
   ```
3. **Type "YES" to confirm**
4. **Data is restored in batches**
5. **Summary is displayed**

---

## Complete Workflow Example

### Scenario: Clear and Reload Historical Data

```bash
# Step 1: Backup current data (safety net)
node backup-data.js

# Output: Creates backups/backup-2026-01-03-143022/

# Step 2: Clear all data
node clear-all-data.js

# Type "YES" to confirm

# Step 3: Upload new historical data
# (Use your application's upload features)

# Step 4: If something goes wrong, restore from backup
node restore-data.js backup-2026-01-03-143022

# Type "YES" to confirm
```

---

## Advanced Usage

### Restore Only Specific Collections

If you only need to restore certain data:

```bash
# Restore only applicants
node restore-data.js backup-2026-01-03-143022 --collection applicants

# Restore only users
node restore-data.js backup-2026-01-03-143022 --collection users
```

### Merge Data (Don't Overwrite)

To add backup data without overwriting existing documents:

```bash
node restore-data.js backup-2026-01-03-143022 --skip-existing
```

This is useful when:
- You want to recover deleted documents
- You're merging data from multiple sources
- You want to preserve newer data

### Manual Data Inspection

You can open any JSON file to inspect the data:

```bash
# View applicants data
cat backups/backup-2026-01-03-143022/applicants.json

# Or use a text editor
code backups/backup-2026-01-03-143022/applicants.json
```

### Selective Manual Restore

If you need fine-grained control:

1. Open the collection JSON file
2. Find the specific documents you need
3. Manually import them via Firebase Console or custom script

---

## Best Practices

### 1. **Always Backup Before Major Changes**
```bash
# Before clearing data
node backup-data.js
node clear-all-data.js

# Before bulk operations
node backup-data.js
# ... perform bulk operations
```

### 2. **Keep Multiple Backups**

Don't delete old backups immediately. Keep backups for:
- Before major migrations
- End of month/quarter
- Before system upgrades

### 3. **Test Restore Process**

Periodically test your restore process:
```bash
# 1. Create test backup
node backup-data.js

# 2. Note the backup folder name
# 3. Try restoring to verify it works
node restore-data.js backup-YYYY-MM-DD-HHMMSS --collection users
```

### 4. **Backup Storage**

- Backups are stored locally in `backups/` folder
- Consider copying backups to external storage
- Use cloud storage for additional safety

```bash
# Copy to external location
cp -r backups/backup-2026-01-03-143022 /path/to/external/storage/

# Or compress for storage
tar -czf backup-2026-01-03.tar.gz backups/backup-2026-01-03-143022/
```

---

## Troubleshooting

### Error: "Backup folder not found"

Make sure you're in the project directory:
```bash
cd /workspaces/CrecscentDataTool
ls backups/
```

### Error: "Permission denied"

Check that you have write permissions:
```bash
chmod +w backups/
```

### Large Backups Taking Long Time

This is normal for large datasets. The script processes collections one at a time and shows progress.

### Restore Fails Midway

- The script uses batches of 500 documents
- Already-restored documents remain
- You can re-run the restore with `--skip-existing` to continue

### Out of Disk Space

Check available disk space:
```bash
df -h
```

Compress old backups:
```bash
tar -czf old-backups.tar.gz backups/backup-2025-*
rm -rf backups/backup-2025-*
```

---

## File Formats

### Timestamps

All Firestore timestamps are converted to ISO 8601 format:
```json
{
  "createdAt": "2026-01-03T14:30:22.123Z"
}
```

During restore, these are automatically converted back to Firestore Timestamps.

### Document IDs

Original document IDs are preserved:
```json
[
  {
    "id": "abc123def456",
    "data": { ... }
  }
]
```

### Nested Data

Complex nested structures are preserved:
```json
{
  "data": {
    "name": "John Doe",
    "address": {
      "street": "123 Main St",
      "city": "Springfield"
    },
    "tags": ["tag1", "tag2"]
  }
}
```

---

## Safety Features

### Backup Script
- ✓ Non-destructive (read-only)
- ✓ Creates timestamped folders (no overwrites)
- ✓ Includes metadata for verification

### Restore Script
- ✓ Requires explicit "YES" confirmation
- ✓ Shows what will be restored
- ✓ Optional skip-existing mode
- ✓ Batch processing with progress updates

---

## Questions?

- Check the MANIFEST.json in your backup folder for details
- Review the README.md in each backup for specific information
- Inspect JSON files directly to see your data

**Remember:** Always backup before clearing data!
