// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCMJYNTTLY5BeM4hECkyTC9SMpaIjO5ziQ",
    authDomain: "tesis-acac7.firebaseapp.com",
    projectId: "tesis-acac7",
    storageBucket: "tesis-acac7.firebasestorage.app",
    messagingSenderId: "398721050399",
    appId: "1:398721050399:web:409e772dcbeb364677722a",
    measurementId: "G-X2V42NQ5H8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

import { getAuth } from "firebase/auth";
export const auth = getAuth(app);