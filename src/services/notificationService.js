import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, deleteDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * Notification Service
 * Handles Firebase Cloud Messaging for push notifications
 */

let messaging = null;

// Initialize FCM
export function initializeMessaging(firebaseApp) {
    try {
        messaging = getMessaging(firebaseApp);
        console.log('✅ Firebase Cloud Messaging initialized');
        return messaging;
    } catch (error) {
        console.error('❌ Error initializing FCM:', error);
        return null;
    }
}

/**
 * Request notification permissions and get FCM token
 */
export async function requestNotificationPermission(userId) {
    try {
        // Check if notifications are supported
        if (!('Notification' in window)) {
            console.warn('This browser does not support notifications');
            return null;
        }

        // Check if messaging is initialized
        if (!messaging) {
            console.error('Firebase messaging not initialized');
            return null;
        }

        // Request permission
        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
            console.log('✅ Notification permission granted');

            // Get FCM token
            const token = await getToken(messaging, {
                vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || 'YOUR_VAPID_KEY_HERE'
            });

            if (token) {
                console.log('📱 FCM Token:', token);

                // Save token to Firestore
                await saveFCMToken(userId, token);

                return token;
            } else {
                console.warn('No FCM token available');
                return null;
            }
        } else if (permission === 'denied') {
            console.warn('❌ Notification permission denied');
            return null;
        } else {
            console.log('Notification permission not granted yet');
            return null;
        }
    } catch (error) {
        console.error('Error requesting notification permission:', error);
        return null;
    }
}

/**
 * Save FCM token to Firestore
 */
async function saveFCMToken(userId, token) {
    try {
        // Detect device and browser info
        const deviceInfo = {
            token,
            device: getDeviceType(),
            browser: getBrowserInfo(),
            createdAt: new Date(),
            lastUsed: new Date()
        };

        // Save to user's fcmTokens subcollection
        const tokenRef = doc(collection(db, `users/${userId}/fcmTokens`), token);
        await setDoc(tokenRef, deviceInfo, { merge: true });

        console.log('✅ FCM token saved to Firestore');
    } catch (error) {
        console.error('Error saving FCM token:', error);
        throw error;
    }
}

/**
 * Remove FCM token from Firestore
 */
export async function removeFCMToken(userId, token) {
    try {
        const tokenRef = doc(db, `users/${userId}/fcmTokens`, token);
        await deleteDoc(tokenRef);
        console.log('✅ FCM token removed from Firestore');
    } catch (error) {
        console.error('Error removing FCM token:', error);
    }
}

/**
 * Setup foreground message listener
 */
export function setupForegroundMessageListener(onMessageCallback) {
    if (!messaging) {
        console.error('Firebase messaging not initialized');
        return null;
    }

    // Listen for messages when the app is in the foreground
    const unsubscribe = onMessage(messaging, (payload) => {
        console.log('📬 Foreground message received:', payload);

        const notificationTitle = payload.notification?.title || 'New Notification';
        const notificationBody = payload.notification?.body || '';

        // Call the callback with notification data
        if (onMessageCallback) {
            onMessageCallback({
                title: notificationTitle,
                body: notificationBody,
                data: payload.data || {}
            });
        }

        // Show browser notification if permission is granted
        if (Notification.permission === 'granted') {
            new Notification(notificationTitle, {
                body: notificationBody,
                icon: '/logo.png',
                badge: '/badge.png',
                data: payload.data || {}
            });
        }
    });

    return unsubscribe;
}

/**
 * Get device type
 */
function getDeviceType() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        return 'tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
        return 'mobile';
    }
    return 'desktop';
}

/**
 * Get browser info
 */
function getBrowserInfo() {
    const ua = navigator.userAgent;
    let browser = 'Unknown';

    if (ua.includes('Firefox')) {
        browser = 'Firefox';
    } else if (ua.includes('Chrome')) {
        browser = 'Chrome';
    } else if (ua.includes('Safari')) {
        browser = 'Safari';
    } else if (ua.includes('Edge')) {
        browser = 'Edge';
    } else if (ua.includes('Opera') || ua.includes('OPR')) {
        browser = 'Opera';
    }

    return browser;
}

/**
 * Check if notification is enabled for this user
 */
export function isNotificationEnabled() {
    return Notification.permission === 'granted';
}

/**
 * Show a test notification
 */
export function showTestNotification() {
    if (Notification.permission === 'granted') {
        new Notification('Test Notification', {
            body: 'Push notifications are working!',
            icon: '/logo.png'
        });
    } else {
        console.warn('Notification permission not granted');
    }
}
