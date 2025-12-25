// Migration script to fix user document structure
// Run this with: node migrate-user.js

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';

// Your Firebase config (from src/firebase.js)
const firebaseConfig = {
  apiKey: "AIzaSyDlppJWV9eOJ4mWs8UU7G7PFxZADlWmB6c",
  authDomain: "crescentmanagement.firebaseapp.com",
  projectId: "crescentmanagement",
  storageBucket: "crescentmanagement.firebasestorage.app",
  messagingSenderId: "938453762903",
  appId: "1:938453762903:web:c1db056af23e81ebeaf23d",
  measurementId: "G-9KRGHLPQR2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateUsers() {
  console.log('Starting user migration...\n');

  try {
    // Get all users
    const usersSnapshot = await getDocs(collection(db, 'users'));

    console.log(`Found ${usersSnapshot.size} user document(s)\n`);

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const oldDocId = userDoc.id;

      console.log(`Processing user: ${userData.email}`);
      console.log(`  Old document ID: ${oldDocId}`);
      console.log(`  User data:`, userData);

      // Check if this document needs migration
      // (document ID doesn't match the UID, or there's a separate 'uid' field)
      if (userData.uid && userData.uid !== oldDocId) {
        console.log(`  Needs migration! Creating new document with UID as ID...`);

        // Create new document with UID as document ID
        const newDocRef = doc(db, 'users', userData.uid);
        await setDoc(newDocRef, {
          email: userData.email,
          displayName: userData.displayName,
          role: userData.role,
          createdAt: userData.createdAt,
          lastLogin: userData.lastLogin
        });

        console.log(`  ✓ Created new document: users/${userData.uid}`);

        // Delete old document
        await deleteDoc(doc(db, 'users', oldDocId));
        console.log(`  ✓ Deleted old document: users/${oldDocId}`);
        console.log(`  Migration complete for ${userData.email}\n`);
      } else {
        console.log(`  No migration needed (already using correct structure)\n`);
      }
    }

    console.log('Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

migrateUsers();
