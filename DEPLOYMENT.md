# Deployment Guide - Crescent Management Platform

## GitHub Pages Deployment

This guide will help you deploy the Crescent Management Platform to GitHub Pages for production testing.

### Prerequisites

1. A GitHub account
2. Git installed on your machine
3. Your repository pushed to GitHub

### Step 1: Update Firebase Configuration

Before deploying, ensure your Firebase project allows requests from your GitHub Pages domain:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **crescentmanagement**
3. Go to **Authentication** → **Settings** → **Authorized domains**
4. Add your GitHub Pages domain:
   - Format: `YOUR-USERNAME.github.io`
   - Example: `johndoe.github.io`
5. Click **Add domain**

### Step 2: Update Vite Base Path

The `vite.config.js` file has been configured with:

```javascript
base: '/mid-states/'
```

**IMPORTANT**: Replace `'mid-states'` with your actual GitHub repository name if it's different.

If your repo name is different:
1. Open `vite.config.js`
2. Change the `base` value to match your repo name
3. Example: If your repo is `crescent-platform`, use `base: '/crescent-platform/'`

### Step 3: Initialize Git Repository (if not already done)

```bash
git init
git add .
git commit -m "Initial commit - Crescent Management Platform V0.1"
```

### Step 4: Create GitHub Repository

1. Go to [GitHub](https://github.com)
2. Click **New repository**
3. Name it: `mid-states` (or whatever name you prefer)
4. Make it **Public** (required for free GitHub Pages)
5. **Do NOT** initialize with README, .gitignore, or license
6. Click **Create repository**

### Step 5: Link Local Repo to GitHub

Replace `YOUR-USERNAME` with your GitHub username:

```bash
git remote add origin https://github.com/YOUR-USERNAME/mid-states.git
git branch -M main
git push -u origin main
```

### Step 6: Deploy to GitHub Pages

Run the deployment command:

```bash
npm run deploy
```

This will:
1. Build your project (`npm run build`)
2. Create a `gh-pages` branch
3. Push the built files to GitHub Pages

### Step 7: Enable GitHub Pages

1. Go to your GitHub repository
2. Click **Settings**
3. Scroll to **Pages** (left sidebar)
4. Under **Source**, select:
   - Branch: `gh-pages`
   - Folder: `/ (root)`
5. Click **Save**

### Step 8: Access Your Deployed App

Your app will be available at:
```
https://YOUR-USERNAME.github.io/mid-states/
```

**Note**: It may take 1-2 minutes for the initial deployment to be live.

### Step 9: Fix Your User Profile

Once deployed and you can access the app:

1. Navigate to your deployed app URL
2. Log in with your account
3. Go to the **Profile** page
4. You'll see an orange **"User Profile Fix Tool"** box
5. Click **"Fix My Profile"** button
6. Wait for the success message
7. Refresh the page
8. Your role should now display correctly as "Market Manager"

## Updating Your Deployment

Whenever you make changes to your code:

```bash
# 1. Commit your changes
git add .
git commit -m "Description of changes"

# 2. Push to GitHub
git push

# 3. Deploy to GitHub Pages
npm run deploy
```

## Troubleshooting

### Issue: 404 Error on Refresh

**Cause**: GitHub Pages doesn't support client-side routing by default.

**Solution**: Add a `404.html` redirect file:

```bash
# This is already included in your build process
# The 404.html file will redirect to index.html
```

### Issue: Firebase Permission Errors

**Cause**: GitHub Pages domain not authorized in Firebase.

**Solution**:
1. Go to Firebase Console → Authentication → Settings → Authorized domains
2. Add your `username.github.io` domain

### Issue: Blank Page After Deployment

**Cause**: Incorrect base path in `vite.config.js`.

**Solution**:
1. Verify your `base` value matches your repo name exactly
2. Rebuild and redeploy: `npm run deploy`

### Issue: Assets Not Loading

**Cause**: Incorrect asset paths.

**Solution**: Ensure all imports use relative paths, not absolute paths.

## Production Environment Variables

Your Firebase configuration is already in `src/firebase.js` and is safe to deploy publicly since:
- API keys for Firebase are meant to be public
- Security is handled by Firestore Security Rules
- Authentication protects your data

**DO NOT** commit any `.env` files with sensitive admin keys or secrets.

## Firebase Security Rules

Ensure your Firestore Security Rules are properly configured (see `FIREBASE_SETUP.md`).

The rules should:
- Require authentication for all reads/writes
- Restrict admin operations to Market Managers and Admins
- Validate data before writes

## Monitoring Your Deployment

### Check Build Status
- GitHub Actions may show build status in your repo
- Check the **Actions** tab on GitHub

### View Deployment Logs
```bash
# Local build test
npm run build
npm run preview
```

### Firebase Usage
- Monitor authentication, database, and storage usage in Firebase Console
- Check for any security rule violations

## Rolling Back a Deployment

If you need to roll back:

```bash
# 1. Find the commit you want to roll back to
git log

# 2. Reset to that commit
git reset --hard COMMIT_HASH

# 3. Force push
git push -f origin main

# 4. Redeploy
npm run deploy
```

## Next Steps After Deployment

1. ✅ Test all features in production
2. ✅ Fix your user profile using the fix tool
3. ✅ Test badge creation with photo upload
4. ✅ Test admin panel functionality
5. ✅ Create test applicants and badges
6. ✅ Verify role-based access control
7. ✅ Test on different devices/browsers
8. ✅ Remove the debug components from EnhancedProfile.jsx once everything works

## Clean Up After Testing

Once your profile is fixed and everything works:

1. Remove the `FixMyUserProfile` component import and usage from `EnhancedProfile.jsx`
2. Remove the debug info box (the blue Alert showing userProfile JSON)
3. Delete `/src/utils/FixMyUserProfile.jsx`
4. Commit and redeploy

## Support

For issues with:
- **Deployment**: Check GitHub Pages documentation
- **Firebase**: Check Firebase Console logs
- **Build errors**: Check the terminal output during `npm run build`

---

**Your Crescent Management Platform is ready for production testing!** 🚀

Deploy URL Format: `https://YOUR-USERNAME.github.io/mid-states/`
