# Firebase Setup Instructions

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Name it "mid-states-workforce" (or your preferred name)
4. Enable Google Analytics (optional)
5. Create the project

## Step 2: Enable Authentication

1. In the Firebase Console, go to **Authentication** > **Sign-in method**
2. Enable **Email/Password** authentication
3. (Optional) Enable **Google** sign-in for easier access

## Step 3: Create Firestore Database

1. Go to **Firestore Database** > **Create database**
2. Start in **production mode**
3. Choose your preferred region (us-central1 recommended)

## Step 3.5: Enable Firebase Storage (for Badge Photos)

1. Go to **Storage** in the left menu
2. Click **Get started**
3. Start in **production mode**
4. Use same region as Firestore
5. Click **Done**

## Step 4: Set Firestore Security Rules

Go to **Firestore Database** > **Rules** and paste the rules from below.

### Firestore Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }

    // Helper function to get user role
    function getUserRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }

    // Users collection - users can read their own data, admins can read all
    match /users/{userId} {
      allow read: if isAuthenticated() && (request.auth.uid == userId || getUserRole() in ['admin', 'Market Manager']);
      allow write: if isAuthenticated() && request.auth.uid == userId;
      allow create: if isAuthenticated();
    }

    // Shift data - role-based access
    match /shiftData/{docId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && getUserRole() in ['On-Site Manager', 'Market Manager', 'admin'];
    }

    // Hours data - role-based access
    match /hoursData/{docId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && getUserRole() in ['Market Manager', 'admin'];
    }

    // Recruiter data
    match /recruiterData/{docId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && getUserRole() in ['Recruiter', 'Market Manager', 'admin'];
    }

    // Early leaves data
    match /earlyLeaves/{docId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && getUserRole() in ['On-Site Manager', 'Market Manager', 'admin'];
    }

    // Applicants data
    match /applicants/{docId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && getUserRole() in ['Recruiter', 'Market Manager', 'admin'];
    }

    // Associates data
    match /associates/{docId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && getUserRole() in ['Market Manager', 'admin'];
    }

    // Badge data
    match /badges/{docId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && getUserRole() in ['On-Site Manager', 'Market Manager', 'admin'];
    }

    // Badge print queue
    match /badgePrintQueue/{docId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && getUserRole() in ['On-Site Manager', 'Market Manager', 'admin'];
    }

    // Badge templates (Admin only)
    match /badgeTemplates/{docId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && getUserRole() in ['Market Manager', 'admin'];
    }

    // Audit logs (Admin/Market Manager read, system writes)
    match /auditLog/{docId} {
      allow read: if isAuthenticated() && getUserRole() in ['Market Manager', 'admin'];
      allow write: if isAuthenticated(); // All authenticated users can create audit logs
    }
  }
}
```

### Storage Rules:

Go to **Storage** > **Rules** and paste:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Badge photos - authenticated users can read, only managers can write
    match /badges/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        get(/databases/(default)/documents/users/$(request.auth.uid)).data.role in ['On-Site Manager', 'Market Manager', 'admin'];
    }
  }
}
```

## Step 5: Get Your Firebase Config

1. In Firebase Console, go to **Project settings** (gear icon)
2. Scroll to "Your apps" section
3. Click the **Web** icon (</>)
4. Register your app with a nickname (e.g., "Mid-States Workforce App")
5. Copy the `firebaseConfig` object

## Step 6: Update src/firebase.js

Replace the placeholder values in `src/firebase.js` with your actual Firebase config values.

## Step 7: Create First Admin User

After updating firebase.js:
1. Run the app: `npm run dev`
2. Sign up with your email at the Crescent Management Platform signup page
3. Go to Firebase Console > Firestore Database
4. Find your user document in the `users` collection
5. Manually add a field: `role: "admin"`

Now you're ready to use Crescent Management Platform V0.1!
