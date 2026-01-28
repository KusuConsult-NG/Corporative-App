// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// NOTE: Firebase config is loaded from environment variables in production
// This service worker will be configured at build time via Vite
// NEVER commit real API keys here

// Initialize Firebase in the service worker
firebase.initializeApp({
    apiKey: "AIzaSyBTUfg0lKz-ybpeqzKOfxHZUsvBLUEKvI4",
    authDomain: "device-streaming-c7297924.firebaseapp.com",
    projectId: "device-streaming-c7297924",
    storageBucket: "device-streaming-c7297924.firebasestorage.app",
    messagingSenderId: "785564049496",
    appId: "1:785564049496:web:a778b09e42d71cb18c2a2d"
});

// Retrieve Firebase Messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);

    const notificationTitle = payload.notification?.title || 'AWSLMCSL Notification';
    const notificationOptions = {
        body: payload.notification?.body || '',
        icon: '/logo.png',
        badge: '/badge.png',
        data: payload.data || {},
        actions: payload.data?.actions ? JSON.parse(payload.data.actions) : []
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notification click received:', event);

    event.notification.close();

    // Navigate to the app or specific page
    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Check if there's already a window/tab open
            for (const client of clientList) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // If no window/tab is open, open a new one
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
