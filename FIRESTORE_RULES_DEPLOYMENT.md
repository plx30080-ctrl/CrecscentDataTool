# Firebase Rules Deployment via CLI

## Quick Start

### Option 1: Using the Deployment Script (Easiest)

```bash
chmod +x deploy-firestore-rules.sh
./deploy-firestore-rules.sh
```

This script will:
1. Check if Firebase CLI is installed
2. Verify you're logged in
3. Show the rules being deployed
4. Ask for confirmation
5. Deploy the rules

### Option 2: Manual Deployment

#### Step 1: Install Firebase CLI (if not already installed)
```bash
npm install -g firebase-tools
```

#### Step 2: Login to Firebase
```bash
firebase login
```

This opens a browser to authenticate with your Google account.

#### Step 3: Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

#### Step 4: Verify Deployment
The CLI will show:
```
✔  firestore:rules deployed successfully

Project Console: https://console.firebase.google.com/project/YOUR_PROJECT_ID
```

## What Gets Deployed

The updated `firestore.rules` file includes:

### New Collections (Previously Missing)
- `forecasts` - Forecasting data and predictions
- `dailySummary` - Pre-aggregated daily metrics  
- `weeklySummary` - Weekly aggregations
- `monthlySummary` - Monthly aggregations

### Existing Collections (Already Configured)
- `users` - User profiles and roles
- `applicants` - Applicant pipeline
- `associates` - Employee master list
- `badges` - Badge management
- `badgePrintQueue` - Print queue
- `badgeTemplates` - Badge designs
- `shiftData` - Shift attendance metrics
- `hoursData` - Hours worked
- `recruiterData` - Recruiting activities
- `earlyLeaves` - Early leave incidents
- `onPremiseData` - On-premises data
- `laborReports` - Labor reports
- `branchDaily` - Daily branch metrics
- `branchWeekly` - Weekly branch metrics
- `badgeTemplates` - Badge templates
- `auditLog` - System audit logs
- `dnrList` - Do Not Recruit list
- `dnrDatabase` - DNR database
- `applicantDocuments` - Applicant documents
- `uploadHistory` - Upload history

## Rules Summary

All authenticated users can:
- **READ** all documents in all collections
- **WRITE** all documents in all collections (create, update, delete)

Users must be logged in (`request.auth != null`).

**Note:** Users can update their own profile (`/users/{uid}`), but others can create/read all user docs.

## Troubleshooting

### Firebase CLI not found
```bash
npm install -g firebase-tools
```

### Permission denied error
```bash
firebase login
firebase projects:list  # Verify correct project
firebase deploy --only firestore:rules
```

### Rules validation error
Check `firestore.rules` syntax - the file must be valid JSON-compatible Firestore rules.

### Want to see current rules first?
```bash
firebase firestore:describe-indexes
```

## Rollback (If Needed)

If you need to revert to previous rules:

```bash
# Get version history
firebase firestore:describe-indexes

# Firebase Console → Firestore → Rules → Version History
```

## Verify Deployment in Code

After deploying, test in the app:

1. Go to Admin Panel → Data View
2. Try viewing the collections that previously showed permission errors:
   - Forecasts
   - Daily Summary
   - Weekly Summary
   - Monthly Summary
3. Refresh the page if needed
4. Data should now load

## Security Considerations

**Current Rules (Development/Testing):**
- All authenticated users can read/write everything
- Good for development and testing

**For Production, Consider:**
- Restricting writes to admins only
- Role-based access control
- Collection-specific permissions
- Time-based access
- IP restrictions

Example production rules:
```javascript
// Only admins can write
match /forecasts/{document=**} {
  allow read: if request.auth != null;
  allow write: if request.auth.token.isAdmin == true;
}
```

## CLI Command Reference

```bash
# Deploy only Firestore rules
firebase deploy --only firestore:rules

# Deploy everything (rules + indexes)
firebase deploy

# Deploy specific project
firebase deploy --project PROJECT_ID --only firestore:rules

# Watch for changes and redeploy
firebase deploy --only firestore:rules --watch

# Preview changes without deploying
firebase deploy --only firestore:rules --dry-run
```

## Getting Help

```bash
# Show all Firebase CLI commands
firebase help

# Show help for specific command
firebase deploy --help
firebase firestore --help
```

## What Changed

**Updated File:** `firestore.rules`

**Added Collections:**
- forecasts
- dailySummary  
- weeklySummary
- monthlySummary

These were causing "permission denied" errors in the Data View because the Firestore rules didn't include them.

**Status:** Ready to deploy whenever you run the script or manual command above.
