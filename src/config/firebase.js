import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

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

const app = getApps()[0] ?? initializeApp(firebaseConfig);

let authInstance;
if (Platform.OS === 'web') {
    authInstance = getAuth(app);
} else {
    try {
        // Metro resolves the React Native Firebase Auth entry, which exposes
        // the AsyncStorage adapter even though the browser entry does not.
        const { getReactNativePersistence } = require('firebase/auth');
        authInstance = initializeAuth(app, {
            persistence: getReactNativePersistence(AsyncStorage),
        });
    } catch (error) {
        // Fast refresh can evaluate this module after Auth already exists.
        if (error?.code === 'auth/already-initialized') {
            authInstance = getAuth(app);
        } else {
            throw error;
        }
    }
}

// Initialize Firebase services
export const auth = authInstance;
export const db = getFirestore(app);
