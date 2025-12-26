# Fix User Profile - Manual Steps

## Problem
Your user document in Firestore uses the old structure (random document ID), and the security rules are preventing the app from finding it.

## Solution: Manually Migrate in Firebase Console

### Step 1: Find Your Current User Document

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **crescentmanagement**
3. Go to **Firestore Database**
4. Click on the `users` collection
5. Look for a document that has your email address
6. Click on that document to open it

### Step 2: Note Your User UID

From the error in your console, your UID is:
```
yHtqUaAfJ8gzc8cFjCSFnOz9dXn2
```

### Step 3: Check Current Document Structure

Your current document probably looks like:
- **Document ID**: Something random like `abc123xyz`
- **Fields**:
  - `uid: yHtqUaAfJ8gzc8cFjCSFnOz9dXn2`
  - `email: your-email@example.com`
  - `displayName: Your Name`
  - `role: Market Manager`
  - `createdAt: timestamp`
  - `lastLogin: timestamp`

### Step 4: Create New Document with Correct Structure

1. In Firestore, while viewing the `users` collection, click **Add document**
2. For **Document ID**, enter: `yHtqUaAfJ8gzc8cFjCSFnOz9dXn2` (your UID from the error)
3. Add these fields (copy from your old document):
   - **Field**: `email` | **Type**: string | **Value**: (your email)
   - **Field**: `displayName` | **Type**: string | **Value**: (your name)
   - **Field**: `role` | **Type**: string | **Value**: `Market Manager`
   - **Field**: `createdAt` | **Type**: timestamp | **Value**: (copy from old doc or set to current time)
   - **Field**: `lastLogin` | **Type**: timestamp | **Value**: (copy from old doc or set to current time)
4. Click **Save**

### Step 5: Delete Old Document (Optional)

1. Go back to the `users` collection
2. Find your old document (the one with the random ID)
3. Click the three dots menu → **Delete document**
4. Confirm deletion

### Step 6: Test

1. Refresh your app in the browser
2. The error should be gone
3. Your profile should now show "Market Manager" as your role
4. The admin panel should be accessible

## Alternative: Temporary Security Rule Fix

If you want to use the FixMyUserProfile component instead, temporarily update your Firestore security rules:

### Temporary Rules (Only for Migration)

Replace line 53 in your security rules with:

```javascript
// TEMPORARY - for user profile migration
match /users/{userId} {
  allow read: if isAuthenticated(); // Allow any authenticated user to read any user doc
  allow write: if isAuthenticated() && request.auth.uid == userId;
  allow create: if isAuthenticated();
}
```

Then:
1. Save the rules
2. Wait 30 seconds for them to deploy
3. Refresh your app
4. Go to Profile page
5. Click "Fix My Profile"
6. After it succeeds, **immediately change the rules back** to:

```javascript
match /users/{userId} {
  allow read: if isAuthenticated() && (request.auth.uid == userId || getUserRole() in ['admin', 'Market Manager']);
  allow write: if isAuthenticated() && request.auth.uid == userId;
  allow create: if isAuthenticated();
}
```

## Recommended Approach

**Use the manual approach (Steps 1-6)** - it's safer and doesn't require temporarily weakening your security rules.

---

**After fixing, your role will display correctly and you'll have access to the Admin Panel!**
