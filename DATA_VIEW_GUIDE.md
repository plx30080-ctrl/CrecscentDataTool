# Data View & Validation - Admin Panel Feature

## Overview

The Data View tab in the Admin Panel provides Market Managers and Administrators with a comprehensive tool to view, validate, and monitor data across all Firestore collections. This feature ensures data integrity and helps identify potential issues before they impact operations.

## Access

**Who Can Access:**
- Market Managers
- Admins

Navigate to: **Admin Panel → Data View** tab

## Features

### 1. Collection Selection

View data from any of the following collections:

- **Users** - User profiles and roles
- **Shift Data** - Per-shift attendance and metrics
- **Hours Data** - Hours worked by associates
- **Recruiter Data** - Recruiting activities and pipeline
- **Early Leaves** - Early leave incidents
- **Applicants** - Applicant pipeline and status
- **Associates** - Master list of employees
- **Badges** - Badge management
- **Badge Print Queue** - Badges ready to print
- **Forecasts** - Forecasting data and predictions
- **Daily Summary** - Pre-aggregated daily metrics
- **Weekly Summary** - Weekly aggregations
- **Monthly Summary** - Monthly aggregations
- **Audit Logs** - System activity logs
- **Badge Templates** - Badge template designs

### 2. Real-Time Statistics

For each collection, view:

- **Total Records** - Number of documents in the collection
- **Last Updated** - Most recent modification timestamp
- **Data Status** - Validation status (Valid/Has Issues)
- **Storage Size** - Estimated size of collection data

### 3. Data Validation

Automatic validation checks include:

#### Users Collection
- Missing email addresses
- Missing user roles
- Missing display names

#### Shift Data Collection
- Missing dates or shift designations
- Working count exceeds required count
- Negative values

#### Hours Data Collection
- Missing dates
- Negative total hours
- Mismatch between total and calculated hours

#### Applicants Collection
- Invalid status values
- Missing projected start dates for hired applicants
- Missing applicant names

#### Associates Collection
- Missing employee IDs (EID)
- Invalid status values
- Missing start dates

#### Badges Collection
- Missing employee IDs
- Missing badge holder names
- Missing creation timestamps

#### Early Leaves Collection
- Missing associate IDs
- Missing dates or reasons
- Missing leave times

### 4. Data Table Features

- **Pagination** - View 5, 10, 25, 50, or 100 records per page
- **Search** - Filter records by any field value
- **Column Display** - Automatic column generation based on data structure
- **Object Preview** - Hover over object fields to see full JSON
- **Timestamp Formatting** - Automatic date/time formatting
- **Horizontal Scrolling** - Handle wide tables with many columns

### 5. Data Export

Export collection data as JSON files with:
- Filename format: `{collection}_{date}.json`
- Complete data structure preserved
- Timestamp in filename for version tracking

### 6. Refresh Capability

Manually refresh data at any time to see the latest changes without reloading the entire page.

## How to Use

### Viewing Collection Data

1. Navigate to **Admin Panel → Data View** tab
2. Select a collection from the dropdown menu
3. View automatic statistics and validation results
4. Browse data in the table below

### Searching Data

1. Select a collection
2. Enter search term in the search box
3. Results filter in real-time across all fields

### Exporting Data

1. Select a collection with data
2. Click the download icon button
3. JSON file downloads to your browser's download folder
4. Filename includes collection name and current date

### Refreshing Data

1. While viewing a collection
2. Click the refresh icon button
3. Latest data loads from Firestore

### Interpreting Validation Results

**Green "Valid" Status:**
- No issues detected
- Data is properly structured
- All required fields present

**Yellow "Has Issues" Status:**
- Validation warnings displayed in alert box
- Review specific issues listed
- Consider correcting data in respective forms

## Validation Rules

### Critical Issues
- Missing required fields (IDs, names, dates)
- Invalid status values
- Negative numeric values where inappropriate

### Warning Issues
- Calculated value mismatches
- Missing recommended fields
- Unusual data patterns

### Info Notices
- Empty collections
- Missing timestamp fields
- Duplicate ID detection

## Best Practices

### Regular Monitoring
- Check Data View weekly to ensure data integrity
- Review validation warnings after bulk imports
- Monitor collection sizes for performance

### Before Major Operations
- Verify data before running reports
- Check data consistency before bulk updates
- Export data as backup before clearing operations

### Troubleshooting
- Use search to find specific records
- Export data for offline analysis
- Reference validation messages for data corrections

## Performance Considerations

- Collections limited to 1000 records per query
- For larger datasets, consider exporting and analyzing offline
- Pagination ensures smooth browsing experience
- Search filters data client-side for instant results

## Technical Details

### Collection Query
- Uses Firestore getDocs with 1000 document limit
- Automatically maps document IDs to data
- Preserves original data structure

### Statistics Calculation
- Scans all documents for timestamp fields
- Estimates storage size based on JSON serialization
- Identifies most recent update across multiple timestamp fields

### Validation Engine
- Collection-specific validation rules
- Generic validation for unsupported collections
- Non-blocking validation (doesn't prevent viewing)

### Data Formatting
- Firestore timestamps converted to readable dates
- Boolean values displayed as Yes/No
- Objects compressed with info icon tooltip
- Long text truncated with full value in tooltip

## Future Enhancements

Planned features for future releases:

- [ ] Inline data editing capabilities
- [ ] CSV export option
- [ ] Advanced filtering (date ranges, multi-field)
- [ ] Data comparison between collections
- [ ] Sync status indicators
- [ ] Automated data quality reports
- [ ] Chart visualizations of validation trends
- [ ] Scheduled validation reports via email

## Related Features

- **Data Management** - Backup and restore operations
- **Audit Logs** - Track who made changes
- **User Management** - Review user data
- **Badge Management** - View badge records

## Support

For issues or questions about the Data View feature:
1. Check validation messages for specific guidance
2. Review related documentation for data entry
3. Contact system administrator
4. Check audit logs for recent changes

## Change Log

### Version 1.0 (January 2026)
- Initial release
- 15 supported collections
- Automatic validation engine
- Real-time statistics
- JSON export capability
- Search and pagination
