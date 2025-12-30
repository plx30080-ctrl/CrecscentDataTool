# Firebase Storage CORS Configuration Fix

## Problem
Your application is experiencing CORS errors when uploading badge photos from GitHub Pages (`https://plx30080-ctrl.github.io`) to Firebase Storage:

```
Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/...' from origin 'https://plx30080-ctrl.github.io'
has been blocked by CORS policy: Response to preflight request doesn't pass access control check
```

## Solution
Configure Firebase Storage to allow cross-origin requests from your GitHub Pages domain.

## Files Created

1. **storage.cors.json** - CORS configuration for Firebase Storage
2. **storage.rules** - Security rules for Firebase Storage
3. **firebase.json** - Updated to include storage configuration

## Step-by-Step Fix

### Step 1: Initialize Firebase Storage (REQUIRED FIRST!)

Firebase Storage hasn't been set up yet for your project. You MUST do this first:

1. Go to [Firebase Console - Storage](https://console.firebase.google.com/project/mid-states-00821676-61ebe/storage)
2. Click **"Get Started"**
3. Review the security rules dialog and click **"Next"**
4. Select location: **nam5** (to match your Firestore location)
5. Click **"Done"**

This creates the storage bucket that your application needs.

### Step 2: Deploy Storage Security Rules

Now deploy the security rules using Firebase CLI:

```bash
firebase deploy --only storage
```

This applies the `storage.rules` file that controls who can read/write files.

### Step 3: Apply CORS Configuration

You need Google Cloud SDK's `gsutil` tool for CORS configuration.

**If you don't have gcloud/gsutil installed:**

**macOS/Linux:**
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init
```

**Windows:**
Download from: https://cloud.google.com/sdk/docs/install

**Authenticate and configure:**

```bash
# Authenticate
gcloud auth login

# Set your project
gcloud config set project mid-states-00821676-61ebe

# Install gsutil if needed
gcloud components install gsutil
```

### Step 4: Find Your Actual Bucket Name

After initializing Storage in Step 1, find the real bucket name:

```bash
gsutil ls -p mid-states-00821676-61ebe
```

This will show the actual bucket URL (it might be `.appspot.com` or `.firebasestorage.app`).

### Step 5: Apply CORS Configuration

Use the bucket name from Step 4 (replace `YOUR-BUCKET-NAME` with the actual bucket):

```bash
gsutil cors set storage.cors.json gs://YOUR-BUCKET-NAME
```

**Most likely one of these:**
```bash
# Try this first (newer Firebase projects):
gsutil cors set storage.cors.json gs://mid-states-00821676-61ebe.firebasestorage.app

# Or this (older Firebase projects):
gsutil cors set storage.cors.json gs://mid-states-00821676-61ebe.appspot.com
```

### Step 6: Verify CORS Configuration

Check that CORS was applied correctly:

```bash
gsutil cors get gs://YOUR-BUCKET-NAME
```

You should see output showing your CORS configuration with `https://plx30080-ctrl.github.io` listed.

### Step 7: Test the Fix

1. Clear your browser cache
2. Navigate to your app: https://plx30080-ctrl.github.io/CrecscentDataTool/applicants
3. Try uploading a badge photo
4. The upload should now work without CORS errors

## Quick Start (Simplified Steps)

If you just want the essential commands after initializing Storage:

```bash
# 1. Initialize Storage in Firebase Console first!
# Go to: https://console.firebase.google.com/project/mid-states-00821676-61ebe/storage

# 2. Deploy storage rules
firebase deploy --only storage

# 3. List buckets to find the real name
gsutil ls -p mid-states-00821676-61ebe

# 4. Apply CORS (use the bucket name from step 3)
gsutil cors set storage.cors.json gs://YOUR-ACTUAL-BUCKET-NAME

# 5. Verify
gsutil cors get gs://YOUR-ACTUAL-BUCKET-NAME
```

## Alternative: Firebase Console Method

### For Storage Initialization:
**Required first step** - Cannot be done via CLI:
1. Go to [Firebase Console - Storage](https://console.firebase.google.com/project/mid-states-00821676-61ebe/storage)
2. Click "Get Started" and follow the wizard

### For Storage Rules:
Can be done via Console OR CLI:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `mid-states-00821676-61ebe`
3. Navigate to Storage → Rules
4. Copy the contents of `storage.rules` into the editor
5. Click "Publish"

### For CORS Configuration:
Unfortunately, CORS configuration for Firebase Storage **can only be set via gsutil**. There's no UI option in the Firebase Console.

## Understanding the CORS Configuration

The `storage.cors.json` file allows:

- **Origin**: `https://plx30080-ctrl.github.io` (your GitHub Pages domain)
- **Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Max Age**: 3600 seconds (1 hour cache for preflight requests)
- **Headers**: Standard headers for file uploads

## Understanding the Storage Rules

The `storage.rules` file:

- Allows authenticated users to upload badge photos (max 5MB, images only)
- Allows authenticated users to upload applicant documents (max 10MB)
- Restricts all other access
- Validates file sizes and image types for security

## Adding Additional Domains

If you need to allow uploads from additional domains (e.g., localhost for development), update `storage.cors.json`:

```json
[
  {
    "origin": [
      "https://plx30080-ctrl.github.io",
      "http://localhost:5173",
      "http://localhost:3000"
    ],
    "method": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "maxAgeSeconds": 3600,
    "responseHeader": ["Content-Type", "Authorization", "Content-Length", "User-Agent", "X-Requested-With"]
  }
]
```

Then reapply with:
```bash
gsutil cors set storage.cors.json gs://mid-states-00821676-61ebe.appspot.com
```

## Troubleshooting

### CORS Still Not Working
1. Clear browser cache completely
2. Try incognito/private browsing mode
3. Wait 5-10 minutes for changes to propagate
4. Verify CORS configuration: `gsutil cors get gs://...`

### Authentication Errors
```bash
gcloud auth application-default login
```

### Permission Denied
Make sure you're logged in with an account that has Owner or Editor role for the Firebase project.

### gsutil Not Found
Make sure you've completed Step 1 and restarted your terminal.

## Verification Commands

```bash
# Check project
gcloud config list

# Check CORS
gsutil cors get gs://mid-states-00821676-61ebe.appspot.com

# Check storage rules
firebase deploy --only storage --dry-run
```

## Security Notes

- Storage rules require authentication for all uploads
- Badge photos limited to 5MB and image types only
- Applicant documents limited to 10MB
- All reads require authentication
- CORS only allows requests from specified domains

## Next Steps

After applying these fixes:

1. Deploy storage rules: `firebase deploy --only storage`
2. Apply CORS configuration: `gsutil cors set storage.cors.json gs://...`
3. Test badge photo uploads in production
4. Monitor Firebase Console for any security alerts

## Resources

- [Firebase Storage CORS Documentation](https://firebase.google.com/docs/storage/web/download-files#cors_configuration)
- [Google Cloud SDK Installation](https://cloud.google.com/sdk/docs/install)
- [Firebase Storage Security Rules](https://firebase.google.com/docs/storage/security)
