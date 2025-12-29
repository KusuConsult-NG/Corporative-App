import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    onSnapshot,
    orderBy,
    limit
} from 'firebase/firestore'
import { db } from '../lib/firebase'

/**
 * Get user's unread notification count
 */
export const getUnreadCount = async (userId) => {
    try {
        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', userId),
            where('read', '==', false)
        )
        const snapshot = await getDocs(q)
        return snapshot.size
    } catch (error) {
        console.error('Error getting unread count:', error)
        return 0
    }
}

/**
 * Get all notifications for a user
 */
export const getUserNotifications = async (userId, limitCount = 50) => {
    try {
        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        )
        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || new Date()
        }))
    } catch (error) {
        console.error('Error getting notifications:', error)
        return []
    }
}

/**
 * Mark notification as read
 */
export const markAsRead = async (notificationId) => {
    try {
        await updateDoc(doc(db, 'notifications', notificationId), {
            read: true,
            readAt: serverTimestamp()
        })

        return true
    } catch (error) {
        console.error('Error marking notification as read:', error)
        return false
    }
}

/**
 * Mark all notifications as read for a user
 */
export const markAllAsRead = async (userId) => {
    try {
        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', userId),
            where('read', '==', false)
        )
        const snapshot = await getDocs(q)

        const updatePromises = snapshot.docs.map(document =>
            updateDoc(doc(db, 'notifications', document.id), {
                read: true,
                readAt: serverTimestamp()
            })
        )

        await Promise.all(updatePromises)
        return snapshot.size
    } catch (error) {
        console.error('Error marking all as read:', error)
        return 0
    }
}

/**
 * Delete a notification
 */
export const deleteNotification = async (notificationId) => {
    try {
        await deleteDoc(doc(db, 'notifications', notificationId))
        return true
    } catch (error) {
        console.error('Error deleting notification:', error)
        return false
    }
}

/**
 * Create a system notification for a user
 */
export const createSystemNotification = async ({
    userId,
    type,
    title,
    message,
    actionUrl = null,
    actionLabel = null,
    priority = 'normal',
    metadata = {}
}) => {
    try {
        const notificationData = {
            userId,
            type,
            title,
            message,
            read: false,
            createdAt: serverTimestamp(),
            actionUrl,
            actionLabel,
            priority,
            broadcastId: null,
            ...metadata
        }

        const docRef = await addDoc(collection(db, 'notifications'), notificationData)
        return { id: docRef.id, ...notificationData }
    } catch (error) {
        console.error('Error creating system notification:', error)
        throw error
    }
}

/**
 * Create broadcast notifications for multiple users
 */
export const createBroadcastNotifications = async (broadcastId, broadcastData, userIds) => {
    try {
        const notifications = userIds.map(userId => ({
            userId,
            type: 'broadcast',
            title: broadcastData.subject,
            message: broadcastData.message,
            read: false,
            createdAt: serverTimestamp(),
            broadcastId,
            actionUrl: null,
            actionLabel: null,
            priority: 'normal'
        }))

        const createPromises = notifications.map(notification =>
            addDoc(collection(db, 'notifications'), notification)
        )

        await Promise.all(createPromises)
        return notifications.length
    } catch (error) {
        console.error('Error creating broadcast notifications:', error)
        throw error
    }
}

/**
 * Subscribe to real-time notification updates
 */
export const subscribeToNotifications = (userId, callback) => {
    try {
        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(50)
        )

        return onSnapshot(q, (snapshot) => {
            const notifications = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate?.() || new Date()
            }))
            callback(notifications)
        })
    } catch (error) {
        console.error('Error subscribing to notifications:', error)
        return () => { } // Return empty unsubscribe function
    }
}

/**
 * Subscribe to real-time unread count updates
 */
export const subscribeToUnreadCount = (userId, callback) => {
    try {
        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', userId),
            where('read', '==', false)
        )

        return onSnapshot(q, (snapshot) => {
            callback(snapshot.size)
        })
    } catch (error) {
        console.error('Error subscribing to unread count:', error)
        return () => { } // Return empty unsubscribe function
    }
}

/**
 * Get notification type icon
 */
export const getNotificationIcon = (type) => {
    const icons = {
        broadcast: 'MessageSquare',
        loan_status: 'CreditCard',
        payment_due: 'DollarSign',
        order_update: 'Package',
        savings_milestone: 'PiggyBank',
        guarantor_request: 'UserCheck',
        system: 'Bell'
    }
    return icons[type] || 'Bell'
}

/**
 * Get notification type color
 */
export const getNotificationColor = (type) => {
    const colors = {
        broadcast: 'blue',
        loan_status: 'green',
        payment_due: 'yellow',
        order_update: 'purple',
        savings_milestone: 'green',
        guarantor_request: 'orange',
        system: 'gray'
    }
    return colors[type] || 'gray'
}

/**
 * Format relative time for notifications (e.g., "2 hours ago")
 */
export const getTimeAgo = (date) => {
    const now = new Date()
    const diffMs = now - new Date(date)
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSecs < 60) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`

    return new Date(date).toLocaleDateString()
}

/**
 * Increment broadcast read count
 */
export const incrementBroadcastReadCount = async (broadcastId) => {
    try {
        const broadcastRef = doc(db, 'broadcasts', broadcastId)
        const broadcastDoc = await getDocs(query(collection(db, 'broadcasts'), where('__name__', '==', broadcastId)))

        if (!broadcastDoc.empty) {
            const currentReadCount = broadcastDoc.docs[0].data().readCount || 0
            await updateDoc(broadcastRef, {
                readCount: currentReadCount + 1
            })
        }
    } catch (error) {
        console.error('Error incrementing broadcast read count:', error)
    }
}
