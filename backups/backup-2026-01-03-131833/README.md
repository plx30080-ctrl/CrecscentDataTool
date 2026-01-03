# Firestore Backup

**Backup Date:** 2026-01-03T13:20:42.233Z
**Total Documents:** 0
**Collections Backed Up:** 0

## Collections



## How to Use This Backup

1. **View Data:** Open any .json file to see the backed up data
2. **Restore Data:** Use the restore-data.js script (if available) or manually import
3. **Selective Restore:** You can restore individual collections by importing specific JSON files

## File Format

Each JSON file contains an array of documents:
```json
[
  {
    "id": "document-id",
    "data": {
      "field1": "value1",
      "field2": "value2"
    }
  }
]
```

## Notes

- Timestamps are converted to ISO 8601 format strings
- All data types are preserved as closely as possible
- Document IDs are included for reference
