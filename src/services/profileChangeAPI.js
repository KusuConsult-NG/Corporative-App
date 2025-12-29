import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'

/**
 * Profile Change Request API
 */
export const profileChangeAPI = {
    // Create change request
    create: async (requestData) => {
        try {
            const docRef = await addDoc(collection(db, 'profile_change_requests'), {
                ...requestData,
                status: 'pending',
                createdAt: serverTimestamp()
            })
            return { id: docRef.id, ...requestData }
        } catch (error) {
            console.error('Error creating profile change request:', error)
            throw error
        }
    },

    // Get all requests (admin)
    getAll: async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'profile_change_requests'))
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        } catch (error) {
            console.error('Error fetching change requests:', error)
            throw error
        }
    },

    // Get user's requests
    getByUser: async (userId) => {
        try {
            const q = query(
                collection(db, 'profile_change_requests'),
                where('userId', '==', userId)
            )
            const querySnapshot = await getDocs(q)
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        } catch (error) {
            console.error('Error fetching user change requests:', error)
            throw error
        }
    }
}
