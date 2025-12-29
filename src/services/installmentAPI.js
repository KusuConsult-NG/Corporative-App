import { collection, addDoc, getDocs, doc, updateDoc, serverTimestamp, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { emailService } from './emailService'

/**
 * Installment Orders API
 */
export const installmentOrdersAPI = {
    // Create installment order
    create: async (orderData) => {
        try {
            const docRef = await addDoc(collection(db, 'installment_orders'), {
                ...orderData,
                createdAt: serverTimestamp(),
                status: 'active'
            })
            return { id: docRef.id, ...orderData }
        } catch (error) {
            console.error('Error creating installment order:', error)
            throw error
        }
    },

    // Get all installment orders (admin)
    getAll: async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'installment_orders'))
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        } catch (error) {
            console.error('Error fetching installment orders:', error)
            throw error
        }
    },

    // Update installment payment
    updatePayment: async (orderId, installmentNumber, paymentAmount) => {
        try {
            const orderRef = doc(db, 'installment_orders', orderId)
            await updateDoc(orderRef, {
                [`schedule.${installmentNumber - 1}.status`]: 'paid',
                [`schedule.${installmentNumber - 1}.paidDate`]: new Date(),
                [`schedule.${installmentNumber - 1}.paidAmount`]: paymentAmount,
                updatedAt: serverTimestamp()
            })
        } catch (error) {
            console.error('Error updating installment payment:', error)
            throw error
        }
    }
}

/**
 * Broadcast Messages API
 */
export const broadcastAPI = {
    // Send broadcast message
    send: async (messageData) => {
        try {
            // 1. Create broadcast document
            const broadcastDoc = await addDoc(collection(db, 'broadcasts'), {
                ...messageData,
                sentAt: serverTimestamp(),
                status: 'sent',
                totalRecipients: 0,
                deliveredCount: 0,
                readCount: 0
            })

            // 2. Get target users
            const targetUsers = await getTargetUsers(messageData.targetAudience)

            // 3. Create individual notifications for each user
            const notificationPromises = targetUsers.map(user =>
                addDoc(collection(db, 'notifications'), {
                    userId: user.id,
                    type: 'broadcast',
                    title: messageData.subject,
                    message: messageData.message,
                    read: false,
                    broadcastId: broadcastDoc.id,
                    createdAt: serverTimestamp(),
                    actionUrl: null,
                    actionLabel: null,
                    priority: 'normal'
                })
            )

            await Promise.all(notificationPromises)

            // 4. Update broadcast with stats
            await updateDoc(doc(db, 'broadcasts', broadcastDoc.id), {
                totalRecipients: targetUsers.length,
                deliveredCount: targetUsers.length
            })

            // 5. Send emails if enabled
            if (messageData.sendEmail !== false) { // Default to true if not specified
                const emailPromises = targetUsers.map(user =>
                    emailService.sendBroadcastEmail(user.email, messageData)
                )
                await Promise.all(emailPromises)
            }

            return {
                id: broadcastDoc.id,
                recipients: targetUsers.length,
                ...messageData
            }
        } catch (error) {
            console.error('Error sending broadcast:', error)
            throw error
        }
    },

    // Get all broadcasts
    getAll: async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'broadcasts'))
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                sentAt: doc.data().sentAt?.toDate?.() || new Date()
            }))
        } catch (error) {
            console.error('Error fetching broadcasts:', error)
            throw error
        }
    }
}

// Helper function to get target users
async function getTargetUsers(targetAudience) {
    try {
        let q

        if (targetAudience === 'all') {
            q = query(collection(db, 'users'))
        } else if (targetAudience === 'members') {
            q = query(
                collection(db, 'users'),
                where('role', '==', 'member')
            )
        } else if (targetAudience === 'admins') {
            q = query(
                collection(db, 'users'),
                where('role', 'in', ['admin', 'limitedAdmin', 'superadmin'])
            )
        } else {
            q = query(collection(db, 'users'))
        }

        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }))
    } catch (error) {
        console.error('Error getting target users:', error)
        return []
    }
}
