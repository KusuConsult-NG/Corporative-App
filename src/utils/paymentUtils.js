import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'

/**
 * Check if a user has paid their registration fee
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - True if paid, false otherwise
 */
export const hasUserPaidRegistrationFee = async (userId) => {
    try {
        const userRef = doc(db, 'users', userId)
        const userSnap = await getDoc(userRef)

        if (!userSnap.exists()) {
            return false
        }

        const userData = userSnap.data()
        return userData.registrationFeePaid === true
    } catch (error) {
        console.error('Error checking payment status:', error)
        return false
    }
}

/**
 * Get user's full payment status information
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Payment status details
 */
export const getUserPaymentStatus = async (userId) => {
    try {
        const userRef = doc(db, 'users', userId)
        const userSnap = await getDoc(userRef)

        if (!userSnap.exists()) {
            return {
                paid: false,
                amount: null,
                date: null,
                reference: null
            }
        }

        const userData = userSnap.data()
        return {
            paid: userData.registrationFeePaid || false,
            amount: userData.registrationFeeAmount || null,
            date: userData.registrationFeeDate || null,
            reference: userData.registrationFeeReference || null
        }
    } catch (error) {
        console.error('Error getting payment status:', error)
        return {
            paid: false,
            amount: null,
            date: null,
            reference: null
        }
    }
}

/**
 * Block user and redirect to payment page if not paid
 * @param {Object} user - User object from auth store
 * @param {Function} navigate - React Router navigate function
 * @param {string} actionName - Name of action being blocked (for error message)
 * @returns {Promise<boolean>} - True if can proceed, false if blocked
 */
export const requirePayment = async (user, navigate, actionName = 'this action') => {
    if (!user || !user.userId) {
        return false
    }

    const hasPaid = await hasUserPaidRegistrationFee(user.userId)

    if (!hasPaid) {
        // Redirect to payment page
        navigate('/registration-fee', {
            state: {
                message: `Please pay the registration fee to ${actionName}`,
                returnUrl: window.location.pathname
            }
        })
        return false
    }

    return true
}

/**
 * Check payment status without redirect (for UI display)
 * @param {Object} user - User object
 * @returns {Promise<boolean>}
 */
export const checkPaymentStatusOnly = async (user) => {
    if (!user || !user.userId) {
        return false
    }
    return await hasUserPaidRegistrationFee(user.userId)
}
