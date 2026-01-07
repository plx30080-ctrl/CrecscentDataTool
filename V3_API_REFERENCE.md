# V3 API Reference

Quick reference for the V3 Firestore service APIs.

## Collections Overview

| Collection | Purpose | Key Fields |
|-----------|---------|-----------|
| `users` | User accounts | email, role, branch |
| `onPremiseData` | Daily headcount | date, shift, count |
| `hoursData` | Weekly hours | weekEnding, shift1, shift2 |
| `branchMetrics` | Performance metrics | date, branch, recruiterStats |
| `earlyLeaves` | Early departures | eid, date, reason |
| `associates` | Active associates | eid, name, status, pipelineStatus |
| `badges` | Badge assignments | eid, badgeNumber, assignedDate |

---

## User APIs

```javascript
// Get all users
const users = await getUsers();

// Get user by ID
const user = await getUserById(userId);

// Add/update user
await addUser(userData);
```

---

## OnPremise Data APIs

```javascript
// Add on-premise data
await addOnPremiseData({
  date: new Date(),
  shift: 1,  // 1 or 2
  count: 85,
  branch: 'Main',
  notes: 'Optional notes'
});

// Get on-premise data for date range
const data = await getOnPremiseData(startDate, endDate);

// Get aggregated by date and shift
const aggregated = await aggregateOnPremiseByDateAndShift(startDate, endDate);
```

---

## Hours Data APIs

```javascript
// Add hours data (nested shift structure)
await addHoursData({
  weekEnding: new Date('2026-01-05'),
  shift1: {
    total: 450,
    direct: 400,
    indirect: 50,
    byDate: {
      '2025-12-30': { direct: 80, indirect: 10 },
      '2025-12-31': { direct: 80, indirect: 10 }
      // ... more dates
    }
  },
  shift2: {
    total: 380,
    direct: 350,
    indirect: 30,
    byDate: {
      '2025-12-30': { direct: 70, indirect: 6 },
      '2025-12-31': { direct: 70, indirect: 6 }
      // ... more dates
    }
  }
});

// Get hours data for date range
const hours = await getHoursData(startDate, endDate);

// Get aggregate hours
const aggregate = await getAggregateHours(startDate, endDate, 'day' | 'week');
```

---

## Branch Metrics APIs

```javascript
// Add branch metrics
await addBranchMetrics({
  date: new Date(),
  branch: 'Main',
  shift: 1,
  recruiterStats: {
    totalApplicants: 50,
    started: 30,
    startRate: 60.0,
    earlyLeaves: 3,
    dnr: 2
  },
  dailyMetrics: {
    onPremise: 85,
    scheduled: 90,
    attendance: 94.4
  }
});

// Get branch metrics for date range
const metrics = await getBranchMetrics(startDate, endDate);

// Get metrics by branch
const branchData = await getBranchMetrics(startDate, endDate, 'Main');
```

---

## Associates APIs

```javascript
// Add associate
await addAssociate({
  eid: 'E123456',
  firstName: 'John',
  lastName: 'Doe',
  startDate: new Date(),
  status: 'Active',  // Active | Inactive | DNR | Terminated
  pipelineStatus: 'Started',  // Applied | Interviewing | Background Check | Orientation | Started | Declined
  recruiter: 'Jane Smith',
  shift: 1,
  branch: 'Main'
});

// Get all associates
const associates = await getAssociates();

// Get associate by EID
const associate = await getAssociateByEID('E123456');

// Update associate
await updateAssociate('docId', {
  status: 'Inactive',
  terminationDate: new Date(),
  terminationReason: 'Voluntary'
});

// Delete associate
await deleteAssociate('docId');
```

### Associate Status Fields

**status**: Current employment status
- `Active` - Currently employed
- `Inactive` - Temporarily not working
- `DNR` - Do Not Rehire (replaces dnrList collection)
- `Terminated` - Employment ended

**pipelineStatus**: Recruitment pipeline stage
- `Applied` - Application submitted
- `Interviewing` - In interview process
- `Background Check` - Background check in progress
- `Orientation` - Completed orientation
- `Started` - First day worked
- `Declined` - Candidate declined offer

---

## Early Leaves APIs

```javascript
// Add early leave
await addEarlyLeave({
  eid: 'E123456',
  name: 'John Doe',
  date: new Date(),
  shift: 1,
  reason: 'Personal',
  departureTime: '14:30',
  scheduledEnd: '17:00'
});

// Get early leaves for date range
const leaves = await getEarlyLeaves(startDate, endDate);

// Get trends
const trends = await getEarlyLeaveTrends(startDate, endDate);
```

---

## Badge APIs

```javascript
// Assign badge
await assignBadge({
  eid: 'E123456',
  name: 'John Doe',
  badgeNumber: '12345',
  assignedDate: new Date(),
  branch: 'Main'
});

// Get all badges
const badges = await getBadges();

// Get badge by EID
const badge = await getBadgeByEID('E123456');

// Return badge (mark as inactive)
await returnBadge('docId');
```

---

## Query Patterns

### Get Pipeline Counts
```javascript
const associates = await getAssociates();

const counts = {
  applied: associates.filter(a => a.pipelineStatus === 'Applied').length,
  interviewing: associates.filter(a => a.pipelineStatus === 'Interviewing').length,
  backgroundCheck: associates.filter(a => a.pipelineStatus === 'Background Check').length,
  orientation: associates.filter(a => a.pipelineStatus === 'Orientation').length,
  started: associates.filter(a => a.pipelineStatus === 'Started').length
};
```

### Get Current Pool (Ready to Start)
```javascript
const associates = await getAssociates();
const currentPool = associates.filter(a => 
  a.pipelineStatus === 'Orientation' && 
  a.status !== 'Active'
).length;
```

### Get Active Associates
```javascript
const associates = await getAssociates();
const active = associates.filter(a => a.status === 'Active');
```

### Get DNR List
```javascript
const associates = await getAssociates();
const dnrList = associates.filter(a => a.status === 'DNR');
```

### Get Recruiter Performance
```javascript
const associates = await getAssociates();
const recruiterMap = new Map();

associates.forEach(assoc => {
  const recruiter = assoc.recruiter || 'Unassigned';
  if (!recruiterMap.has(recruiter)) {
    recruiterMap.set(recruiter, {
      totalApplicants: 0,
      started: 0
    });
  }
  
  const stats = recruiterMap.get(recruiter);
  if (assoc.pipelineStatus) stats.totalApplicants++;
  if (assoc.pipelineStatus === 'Started') stats.started++;
});

const recruiterStats = Array.from(recruiterMap.entries()).map(([name, stats]) => ({
  recruiter: name,
  ...stats,
  startRate: ((stats.started / stats.totalApplicants) * 100).toFixed(1)
}));
```

---

## Date Handling

All date fields are Firestore Timestamps that can be converted:

```javascript
// Add data with Date object
await addOnPremiseData({
  date: new Date(),  // Automatically converted to Timestamp
  shift: 1,
  count: 85
});

// Read data - convert Timestamp to Date
const data = await getOnPremiseData(startDate, endDate);
data.forEach(item => {
  const dateObj = item.date.toDate();  // Firestore Timestamp → JS Date
  console.log(dateObj.toLocaleDateString());
});
```

---

## Error Handling

All API functions handle errors internally and log them:

```javascript
try {
  const associates = await getAssociates();
  // Process data
} catch (error) {
  // Error already logged by service
  console.error('Failed to load associates:', error);
}
```

---

## Migration from Legacy

### Applicants → Associates
```javascript
// OLD
const applicants = await getApplicants();
const pipeline = await getApplicantPipeline();

// NEW
const associates = await getAssociates();
const applied = associates.filter(a => a.pipelineStatus === 'Applied');
const started = associates.filter(a => a.pipelineStatus === 'Started');
```

### ShiftData → OnPremiseData
```javascript
// OLD
const shifts = await getShiftData(startDate, endDate);

// NEW
const onPremise = await getOnPremiseData(startDate, endDate);
const aggregated = await aggregateOnPremiseByDateAndShift(startDate, endDate);
```

### RecruiterData + BranchDaily → BranchMetrics
```javascript
// OLD
const recruiterData = await getRecruiterData(startDate, endDate);
const branchDaily = await getBranchDailyData(startDate, endDate);

// NEW
const metrics = await getBranchMetrics(startDate, endDate);
// Includes both recruiter stats and daily metrics
```

### DNR List → Associate Status
```javascript
// OLD
const dnrList = await getDNRList();

// NEW
const associates = await getAssociates();
const dnrList = associates.filter(a => a.status === 'DNR');
```

---

## Best Practices

### 1. Use Date Ranges for Queries
```javascript
// Good: Specific date range
const data = await getOnPremiseData(
  new Date('2026-01-01'),
  new Date('2026-01-31')
);

// Avoid: Fetching all data
const allData = await getOnPremiseData(); // No parameters = all data
```

### 2. Filter in Memory for Simple Queries
```javascript
// Good: Fetch once, filter multiple times
const associates = await getAssociates();
const active = associates.filter(a => a.status === 'Active');
const dnr = associates.filter(a => a.status === 'DNR');
const byRecruiter = associates.filter(a => a.recruiter === 'John Doe');

// Avoid: Multiple queries
const active = await getAssociates().then(a => a.filter(...));
const dnr = await getAssociates().then(a => a.filter(...));
```

### 3. Handle Timestamps Consistently
```javascript
// Convert Firestore Timestamps to Date objects early
const associates = await getAssociates();
const formatted = associates.map(assoc => ({
  ...assoc,
  startDate: assoc.startDate?.toDate(),
  createdAt: assoc.createdAt?.toDate()
}));
```

### 4. Use Optional Chaining for Nested Data
```javascript
const hours = await getHoursData(startDate, endDate);
hours.forEach(week => {
  const shift1Total = week.shift1?.total || 0;
  const shift2Total = week.shift2?.total || 0;
  const mondayDirect = week.shift1?.byDate?.['2026-01-06']?.direct || 0;
});
```

---

## Performance Tips

### Use Indexes for Complex Queries
If you see slow queries, add composite indexes in `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "associates",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "recruiter", "order": "ASCENDING"},
        {"fieldPath": "pipelineStatus", "order": "ASCENDING"}
      ]
    }
  ]
}
```

### Paginate Large Results
```javascript
// For displaying large datasets, implement pagination
const LIMIT = 50;
let lastDoc = null;

const query = query(
  collection(db, 'associates'),
  orderBy('createdAt', 'desc'),
  limit(LIMIT),
  ...(lastDoc ? [startAfter(lastDoc)] : [])
);
```

---

## Related Documentation
- [V3_MIGRATION_COMPLETE.md](./V3_MIGRATION_COMPLETE.md) - Migration summary
- [FIRESTORE_SCHEMA.md](./FIRESTORE_SCHEMA.md) - Detailed schema docs
- [firestoreService.js](./src/services/firestoreService.js) - Source code

---

Last Updated: January 2026
