import { collection, query, where, addDoc, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'

/**
 * Complaint Management API
 */
export const complaintsAPI = {
    // Create a new complaint
    create: async (complaintData) => {
        try {
            const docRef = await addDoc(collection(db, 'complaints'), {
                ...complaintData,
                status: 'open',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            })
            return { id: docRef.id, ...complaintData, status: 'open' }
        } catch (error) {
            console.error('Error creating complaint:', error)
            throw error
        }
    },

    // Get all complaints
    getAll: async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'complaints'))
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        } catch (error) {
            console.error('Error fetching complaints:', error)
            throw error
        }
    },

    // Get complaints by user
    getByUser: async (userId) => {
        try {
            const q = query(
                collection(db, 'complaints'),
                where('userId', '==', userId)
            )
            const querySnapshot = await getDocs(q)
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        } catch (error) {
            console.error('Error fetching user complaints:', error)
            throw error
        }
    },

    // Update complaint status
    updateStatus: async (complaintId, status, response = null) => {
        try {
            const complaintRef = doc(db, 'complaints', complaintId)
            const updateData = {
                status,
                updatedAt: serverTimestamp()
            }
            if (response) {
                updateData.adminResponse = response
                updateData.respondedAt = serverTimestamp()
            }
            await updateDoc(complaintRef, updateData)
            return { id: complaintId, ...updateData }
        } catch (error) {
            console.error('Error updating complaint:', error)
            throw error
        }
    }
}

/**
 * Savings Reduction Request API  
 */
export const savingsReductionAPI = {
    // Create reduction request
    create: async (requestData) => {
        try {
            const docRef = await addDoc(collection(db, 'savings_reduction_requests'), {
                ...requestData,
                status: 'pending',
                createdAt: serverTimestamp()
            })
            return { id: docRef.id, ...requestData }
        } catch (error) {
            console.error('Error creating savings reduction request:', error)
            throw error
        }
    },

    // Get all requests (admin)
    getAll: async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'savings_reduction_requests'))
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        } catch (error) {
            console.error('Error fetching reduction requests:', error)
            throw error
        }
    },

    // Get user's requests
    getByUser: async (userId) => {
        try {
            const q = query(
                collection(db, 'savings_reduction_requests'),
                where('userId', '==', userId)
            )
            const querySnapshot = await getDocs(q)
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        } catch (error) {
            console.error('Error fetching user reduction requests:', error)
            throw error
        }
    },

    // Approve/decline request
    updateStatus: async (requestId, status, adminNote = null) => {
        try {
            const requestRef = doc(db, 'savings_reduction_requests', requestId)
            const updateData = {
                status,
                processedAt: serverTimestamp()
            }
            if (adminNote) {
                updateData.adminNote = adminNote
            }
            await updateDoc(requestRef, updateData)
            return { id: requestId, ...updateData }
        } catch (error) {
            console.error('Error updating reduction request:', error)
            throw error
        }
    }
}
