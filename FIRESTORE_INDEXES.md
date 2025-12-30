# Firestore Indexes

This project includes Firestore composite index definitions in `firestore.indexes.json`.

## When to deploy
Deploy the indexes to your Firebase project if you see errors in the console indicating a missing index for a query (e.g. "failed-precondition: The query requires an index").

## How to deploy (CLI)
1. Install the Firebase CLI (if not installed):
   npm install -g firebase-tools

2. Authenticate and pick your project:
   firebase login
   firebase use --add <your-firebase-project-id>

3. (Optional) If you haven't initialized the project with Firebase in this repo yet, run:
   firebase init firestore

4. Deploy only the Firestore indexes:
   firebase deploy --only firestore:indexes

5. After deploying, indexes can take several minutes to build — check the Firebase Console (Firestore -> Indexes) for progress.

## Notes
- The `projectId` used by the app is visible in `src/firebase.js` (`projectId: "mid-states-00821676-61ebe"`). Make sure to select the correct Firebase project when running `firebase use` or when logging in.
- Added index for `dnrDatabase` to support queries filtering by `status` and ordering by `dateAdded` — see `firestore.indexes.json`.
- If you prefer, you can also create indexes through the Firebase Console UI (Firestore -> Indexes -> Add Index).

If you want, I can also run the deployment here (I will need Firebase CLI access and to be authenticated — let me know if you want me to proceed).