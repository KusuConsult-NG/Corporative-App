// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
firebase.initializeApp({
    apiKey: "AIzaSyCgEwZHMXe9J_TfmDKrRNuFGH_IqYQXxKg",
    authDomain: "awslmcsl-app.firebaseapp.com",
    projectId: "awslmcsl-app",
    storageBucket: "awslmcsl-app.firebasestorage.app",
    messagingSenderId: "625969062662",
    appId: "1:625969062662:web:3a8e9f0b5c8d7e6f1a2b3c"
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
