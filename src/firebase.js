
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCXZZdEXQXwDM7lxL2jF0HsY1ERb77L38o",
  authDomain: "scorecard-d1.firebaseapp.com",
  databaseURL: "https://scorecard-d1-default-rtdb.firebaseio.com",
  projectId: "scorecard-d1",
  storageBucket: "scorecard-d1.firebasestorage.app",
  messagingSenderId: "1097221066064",
  appId: "1:1097221066064:web:c6f589439275ead5103055",
  measurementId: "G-TSXRH0WNW6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);