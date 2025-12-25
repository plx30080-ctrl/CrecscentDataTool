// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// TODO: Add your own Firebase configuration from your Firebase project console
const firebaseConfig = {
  apiKey: "AIzaSyAOlZFMyO4kSd1lqbT0ItM4zR97HAVwF4U",
  authDomain: "mid-states-00821676-61ebe.firebaseapp.com",
  projectId: "mid-states-00821676-61ebe",
  storageBucket: "mid-states-00821676-61ebe.firebasestorage.app",
  messagingSenderId: "985379591620",
  appId: "1:985379591620:web:6fed48ff0c32e8b3704091"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { db, auth, storage };
