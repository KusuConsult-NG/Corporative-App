// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app"
import { getAnalytics } from "firebase/analytics"
import { getFirestore, collection, doc, setDoc, serverTimestamp } from "firebase/firestore"
import { getAuth } from "firebase/auth"
import { getStorage } from "firebase/storage"
import { getMessaging, getToken, onMessage } from "firebase/messaging"
import { getFunctions } from "firebase/functions"

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

// Initialize Firebase Cloud Messaging
let messaging = null
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
        messaging = getMessaging(app)
    } catch (error) {
        console.warn('FCM not supported in this browser:', error)
    }
}

// VAPID key for FCM (Firebase Project Settings > Cloud Messaging > Web Push certificates)
const VAPID_KEY = 'BKpV8fXVqJ9YQJbZJ_VxqXdZ8wKXZ5N9Z7Z8Z9Z0Z1Z2Z3Z4Z5Z6Z7Z8Z9Z0Z1Z2Z3Z4Z5Z6Z7Z8Z9Z0Z1Z2'

/**
 * Request notification permission from the user
 * @returns {Promise<boolean>} true if permission granted
 */
export async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.warn('This browser does not support notifications')
        return false
    }

    if (Notification.permission === 'granted') {
        return true
    }

    if (Notification.permission === 'denied') {
        console.warn('Notification permission denied')
        return false
    }

    try {
        const permission = await Notification.requestPermission()
        return permission === 'granted'
    } catch (error) {
        console.error('Error requesting notification permission:', error)
        return false
    }
}

/**
 * Get FCM token for this device
 * @returns {Promise<string|null>} FCM token or null
 */
export async function getFCMToken() {
    if (!messaging) {
        console.warn('FCM not initialized')
        return null
    }

    try {
        const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY })
        if (currentToken) {
            console.log('FCM token:', currentToken)
            return currentToken
        } else {
            console.warn('No FCM token available. Request permission to generate one.')
            return null
        }
    } catch (error) {
        console.error('Error getting FCM token:', error)
        return null
    }
}

/**
 * Save FCM token to Firestore
 * @param {string} userId - User ID
 * @param {string} token - FCM token
 */
export async function saveFCMToken(userId, token) {
    if (!userId || !token) {
        console.warn('Missing userId or token')
        return
    }

    try {
        const tokenRef = doc(db, 'users', userId, 'fcmTokens', token)
        await setDoc(tokenRef, {
            token,
            createdAt: serverTimestamp(),
            lastUsed: serverTimestamp(),
            userAgent: navigator.userAgent
        }, { merge: true })

        console.log('FCM token saved to Firestore')
    } catch (error) {
        console.error('Error saving FCM token:', error)
    }
}

/**
 * Listen for foreground messages
 * @param {Function} callback - Callback to handle message
 */
export function onForegroundMessage(callback) {
    if (!messaging) {
        console.warn('FCM not initialized')
        return () => { }
    }

    return onMessage(messaging, callback)
}

// Initialize Cloud Functions
const functions = getFunctions(app)

export { app, analytics, db, auth, storage, messaging, functions }
