import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
// IMPORTANT: Replace these with your actual Firebase config object from Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyA32xinZn7wrfzQ1pt5ZSWKEfhNytZ3dAU",
    authDomain: "pds-app-39787.firebaseapp.com",
    projectId: "pds-app-39787",
    storageBucket: "pds-app-39787.firebasestorage.app",
    messagingSenderId: "117252505608",
    appId: "1:117252505608:web:72e01a2d4329974c3851bd",
    measurementId: "G-TQWBPKKWST"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
