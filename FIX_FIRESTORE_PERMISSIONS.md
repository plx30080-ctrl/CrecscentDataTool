# Fix Firestore Permission Errors for Market Manager

## Problem
Market Manager users are getting "Missing or insufficient permissions" errors when accessing admin features like:
- Audit Logs
- Badge Templates
- User Management

## Root Cause
The Firestore security rules are missing collection definitions for `badgeTemplates` and have a naming mismatch for `auditLog` vs `auditLogs`.

## Solution
You need to update your Firestore Security Rules in the Firebase Console.

### Step-by-Step Instructions:

1. **Go to Firebase Console**
   - Open: https://console.firebase.google.com
   - Select your project: **CrecscentDataTool**

2. **Navigate to Firestore Rules**
   - Click **Firestore Database** in the left sidebar
   - Click the **Rules** tab at the top

3. **Update the Rules**
   - Copy the complete rules from `FIRESTORE_RULES.md` in this project
   - Paste them into the Firebase Console rules editor
   - The key changes are:
     - Added `badgeTemplates` collection (line 57-61)
     - Fixed `auditLogs` to `auditLog` (line 63-67)

4. **Publish the Rules**
   - Click the **Publish** button
   - Wait for confirmation

5. **Test the Fix**
   - Refresh your web app
   - Log in as Market Manager (cody.hale@employbridge.com)
   - Navigate to Admin Panel
   - All tabs should now load without permission errors

## Expected Behavior After Fix

### Market Manager Role Should Have Access To:
- ✅ User Management tab - view and update user roles
- ✅ Badge Template tab - create and edit badge templates
- ✅ Audit Logs tab - view all system activity

### What the Errors Were:
```
Missing or insufficient permissions.
FirebaseError: Missing or insufficient permissions
  at getAuditLogs (adminService.js:175)
  at loadAuditLogs (AdminPanel.jsx:118)
```

### After Fix:
No permission errors. All admin features load successfully for Market Manager users.

## Quick Verification

After updating Firestore rules, check the browser console. You should see:
- ✅ No "Missing or insufficient permissions" errors
- ✅ Audit logs loading successfully
- ✅ Badge templates loading successfully
- ✅ User list loading successfully

## Notes

- The rules allow ALL authenticated users to access admin features
- For production, you should add role-based access control to restrict:
  - Only admins and Market Managers can write to `badgeTemplates`
  - Only admins and Market Managers can write to `auditLog`
  - Only admins and Market Managers can update user roles in `users` collection

## Production-Ready Rules (Future Enhancement)

For better security, you can add role checks like this:

```javascript
// Helper function
function isAdmin() {
  return request.auth != null &&
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'Market Manager'];
}

// Badge Templates - admin only write
match /badgeTemplates/{document=**} {
  allow read: if request.auth != null;
  allow write: if isAdmin();
}

// Audit logs - admin only write
match /auditLog/{document=**} {
  allow read: if isAdmin();
  allow write: if isAdmin();
}

// User management - admin only role updates
match /users/{uid} {
  allow read: if request.auth != null;
  allow update: if request.auth.uid == uid || isAdmin();
  allow write: if request.auth.uid == uid;
}
```
