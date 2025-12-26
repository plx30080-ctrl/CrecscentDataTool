# Firestore Security Rules

## Required Rules for Development/Testing

Add these rules to your Firestore Security Rules in Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read all user profiles and update their own
    match /users/{uid} {
      allow read: if request.auth != null;
      allow update: if request.auth.uid == uid || request.auth != null;
      allow write: if request.auth.uid == uid;
    }

    // Shift data
    match /shiftData/{document=**} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null;
    }

    // Hours data
    match /hoursData/{document=**} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null;
    }

    // Applicants
    match /applicants/{document=**} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null;
    }

    // Early leaves
    match /earlyLeaves/{document=**} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null;
    }

    // Admin collections
    match /admin/{document=**} {
      allow read, write: if request.auth != null;
    }

    // Badges
    match /badges/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }

    // Audit logs
    match /auditLogs/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

## Steps to Update Rules:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (CrecscentDataTool)
3. Navigate to **Firestore Database** → **Rules** tab
4. Replace the existing rules with the rules above
5. Click **Publish**

## For Production (More Restrictive):

Use role-based access control where only authorized managers/admins can write data.

## Required Composite Indexes

Firestore requires composite indexes for queries with multiple filters + orderBy. Create these indexes:

### Index 1: shiftData collection
- **Collection**: `shiftData`
- **Fields**: 
  - `date` (Ascending)
  - `__name__` (Descending)

### Index 2: hoursData collection  
- **Collection**: `hoursData`
- **Fields**:
  - `date` (Ascending)
  - `__name__` (Descending)

### Index 3: earlyLeaves collection
- **Collection**: `earlyLeaves`
- **Fields**:
  - `date` (Ascending)
  - `__name__` (Descending)

### Index 4: applicants collection
- **Collection**: `applicants`
- **Fields**:
  - `status` (Ascending)
  - `appliedDate` (Descending)

### How to Create Indexes:
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Firestore Database** → **Indexes** tab
4. Click **Create Index**
5. Fill in the collection and fields as listed above
6. Click **Create**

Alternatively, when you run a query that needs an index, Firestore will show you a link in the error message. Click that link to create the index automatically.
