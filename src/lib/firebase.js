// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app"
import { getAnalytics } from "firebase/analytics"
import { getFirestore } from "firebase/firestore"
import { getAuth } from "firebase/auth"
import { getStorage } from "firebase/storage"

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// Helper to sanitize storage bucket URL (remove gs:// prefix if present)
const rawBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET
const storageBucket = rawBucket?.replace(/^gs:\/\//, '')

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: storageBucket,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Analytics (only in browser environment)
let analytics = null
if (typeof window !== 'undefined') {
    analytics = getAnalytics(app)
}

// Initialize Firestore
const db = getFirestore(app)

// Initialize Auth
import { setPersistence, browserLocalPersistence } from "firebase/auth"
const auth = getAuth(app)
// Force local storage persistence to work better with Playwright tests
if (typeof window !== 'undefined') {
    setPersistence(auth, browserLocalPersistence).catch(console.error)
}

// Initialize Storage
const storage = getStorage(app)

export { app, analytics, db, auth, storage }
