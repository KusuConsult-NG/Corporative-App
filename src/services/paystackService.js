import { getFunctions, httpsCallable } from 'firebase/functions'
import { db } from '../lib/firebase'
import { collection, query, where, getDocs, limit } from 'firebase/firestore'

const functions = getFunctions()

/**
 * Paystack Service - Frontend integration with Cloud Functions
 */

// Create virtual account for a member
export async function createMemberVirtualAccount(memberData) {
    try {
        const createAccount = httpsCallable(functions, 'createVirtualAccount')
        const result = await createAccount({
            memberId: memberData.memberId,
            firstName: memberData.firstName,
            lastName: memberData.lastName,
            email: memberData.email,
            phone: memberData.phone || '',
        })

        return result.data
    } catch (error) {
        console.error('Error creating virtual account:', error)
        throw new Error(error.message || 'Failed to create virtual account')
    }
}

// Get virtual account for a member
export async function getVirtualAccount(memberId) {
    try {
        // First try from Cloud Function
        const getAccount = httpsCallable(functions, 'getVirtualAccount')
        const result = await getAccount({ memberId })

        if (result.data.success) {
            return result.data.data
        }

        // Fallback: Query Firestore directly
        const q = query(
            collection(db, 'virtual_accounts'),
            where('memberId', '==', memberId),
            limit(1)
        )
        const querySnapshot = await getDocs(q)

        if (!querySnapshot.empty) {
            return querySnapshot.docs[0].data()
        }

        return null
    } catch (error) {
        console.error('Error fetching virtual account:', error)
        throw error
    }
}

// Get deposit history (from wallet_transactions)
export async function getDepositHistory(memberId, limitCount = 20) {
    try {
        const q = query(
            collection(db, 'wallet_transactions'),
            where('memberId', '==', memberId),
            where('source', '==', 'virtual_account')
        )
        const querySnapshot = await getDocs(q)

        const deposits = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }))

        // Sort by date (newest first)
        return deposits.sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0
            const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0
            return bTime - aTime
        }).slice(0, limitCount)
    } catch (error) {
        console.error('Error fetching deposit history:', error)
        throw error
    }
}

export const paystackService = {
    createMemberVirtualAccount,
    getVirtualAccount,
    getDepositHistory,
}
