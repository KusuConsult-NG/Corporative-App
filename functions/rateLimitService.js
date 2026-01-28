const functions = require('firebase-functions')
const admin = require('firebase-admin')

// Rate limit configurations
const RATE_LIMITS = {
    // Authentication endpoints (per IP)
    login: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxAttempts: 5,
        lockoutDuration: 30 * 60 * 1000 // 30 minutes
    },
    twoFactorVerify: {
        windowMs: 15 * 60 * 1000,
        maxAttempts: 5,
        lockoutDuration: 30 * 60 * 1000
    },
    passwordReset: {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxAttempts: 3,
        lockoutDuration: 60 * 60 * 1000 // 1 hour
    },

    // API endpoints (per user)
    loanApplication: {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxAttempts: 3,
        lockoutDuration: 2 * 60 * 60 * 1000 // 2 hours
    },
    savingsWithdrawal: {
        windowMs: 60 * 60 * 1000,
        maxAttempts: 5,
        lockoutDuration: 60 * 60 * 1000
    },
    dataExport: {
        windowMs: 60 * 60 * 1000,
        maxAttempts: 10,
        lockoutDuration: 60 * 60 * 1000
    }
}

/**
 * Check if an IP or user is rate limited
 * @param {string} endpoint - The endpoint being accessed
 * @param {string} identifier - IP address or user ID
 * @returns {Promise<{allowed: boolean, retryAfter?: number}>}
 */
async function checkRateLimit(endpoint, identifier) {
    const config = RATE_LIMITS[endpoint]
    if (!config) {
        return { allowed: true }
    }

    const now = Date.now()
    const rateLimitRef = admin.firestore()
        .collection('rate_limits')
        .doc(`${endpoint}_${identifier}`)

    try {
        const doc = await rateLimitRef.get()

        if (!doc.exists) {
            // First request - create record
            await rateLimitRef.set({
                endpoint,
                identifier,
                attempts: 1,
                windowStart: now,
                lastAttempt: now,
                lockedUntil: null
            })
            return { allowed: true }
        }

        const data = doc.data()

        // Check if currently locked out
        if (data.lockedUntil && now < data.lockedUntil) {
            const retryAfter = Math.ceil((data.lockedUntil - now) / 1000)
            return {
                allowed: false,
                retryAfter,
                reason: 'locked_out'
            }
        }

        // Check if we're in a new window
        if (now - data.windowStart > config.windowMs) {
            // Reset window
            await rateLimitRef.set({
                endpoint,
                identifier,
                attempts: 1,
                windowStart: now,
                lastAttempt: now,
                lockedUntil: null
            })
            return { allowed: true }
        }

        // Check if we've exceeded the limit
        if (data.attempts >= config.maxAttempts) {
            const lockedUntil = now + config.lockoutDuration
            await rateLimitRef.update({
                attempts: data.attempts + 1,
                lastAttempt: now,
                lockedUntil
            })

            const retryAfter = Math.ceil(config.lockoutDuration / 1000)
            return {
                allowed: false,
                retryAfter,
                reason: 'rate_limit_exceeded'
            }
        }

        // Increment attempts
        await rateLimitRef.update({
            attempts: data.attempts + 1,
            lastAttempt: now
        })

        return { allowed: true }
    } catch (error) {
        console.error('Rate limit check error:', error)
        // Fail open - allow request if rate limit check fails
        return { allowed: true }
    }
}

/**
 * Record a successful operation (resets counter for certain operations)
 * @param {string} endpoint - The endpoint
 * @param {string} identifier - IP address or user ID
 */
async function recordSuccess(endpoint, identifier) {
    const rateLimitRef = admin.firestore()
        .collection('rate_limits')
        .doc(`${endpoint}_${identifier}`)

    try {
        // For authentication endpoints, reset on success
        if (['login', 'twoFactorVerify'].includes(endpoint)) {
            await rateLimitRef.delete()
        }
    } catch (error) {
        console.error('Record success error:', error)
    }
}

/**
 * Admin override - Clear rate limit for an identifier
 * @param {string} endpoint - The endpoint
 * @param {string} identifier - IP address or user ID
 */
exports.clearRateLimit = functions.https.onCall(async (data, context) => {
    // Verify admin/super_admin access
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }

    const userDoc = await admin.firestore()
        .collection('users')
        .where('userId', '==', context.auth.uid)
        .limit(1)
        .get()

    if (userDoc.empty) {
        throw new functions.https.HttpsError('not-found', 'User not found')
    }

    const userData = userDoc.docs[0].data()
    if (!['admin', 'super_admin'].includes(userData.role)) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required')
    }

    const { endpoint, identifier } = data

    if (!endpoint || !identifier) {
        throw new functions.https.HttpsError('invalid-argument', 'Endpoint and identifier required')
    }

    try {
        const rateLimitRef = admin.firestore()
            .collection('rate_limits')
            .doc(`${endpoint}_${identifier}`)

        await rateLimitRef.delete()

        // Log the override
        await admin.firestore().collection('audit_logs').add({
            userId: context.auth.uid,
            action: 'rate_limit_cleared',
            resource: 'rate_limits',
            resourceId: `${endpoint}_${identifier}`,
            details: { endpoint, identifier },
            severity: 'warning',
            ipAddress: context.rawRequest?.ip || 'unknown',
            userAgent: context.rawRequest?.headers['user-agent'] || 'unknown',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: new Date()
        })

        return { success: true, message: 'Rate limit cleared' }
    } catch (error) {
        console.error('Clear rate limit error:', error)
        throw new functions.https.HttpsError('internal', 'Failed to clear rate limit')
    }
})

/**
 * Get rate limit status for an identifier
 */
exports.getRateLimitStatus = functions.https.onCall(async (data, context) => {
    // Verify admin access
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }

    const userDoc = await admin.firestore()
        .collection('users')
        .where('userId', '==', context.auth.uid)
        .limit(1)
        .get()

    if (userDoc.empty) {
        throw new functions.https.HttpsError('not-found', 'User not found')
    }

    const userData = userDoc.docs[0].data()
    if (!['admin', 'super_admin'].includes(userData.role)) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required')
    }

    const { identifier } = data

    if (!identifier) {
        throw new functions.https.HttpsError('invalid-argument', 'Identifier required')
    }

    try {
        const snapshot = await admin.firestore()
            .collection('rate_limits')
            .where('identifier', '==', identifier)
            .get()

        const limits = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            windowStart: doc.data().windowStart,
            lastAttempt: doc.data().lastAttempt,
            lockedUntil: doc.data().lockedUntil
        }))

        return { success: true, limits }
    } catch (error) {
        console.error('Get rate limit status error:', error)
        throw new functions.https.HttpsError('internal', 'Failed to get rate limit status')
    }
})

/**
 * Get all active rate limits (admin only)
 */
exports.getAllRateLimits = functions.https.onCall(async (data, context) => {
    // Verify admin access
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }

    const userDoc = await admin.firestore()
        .collection('users')
        .where('userId', '==', context.auth.uid)
        .limit(1)
        .get()

    if (userDoc.empty) {
        throw new functions.https.HttpsError('not-found', 'User not found')
    }

    const userData = userDoc.docs[0].data()
    if (!['admin', 'super_admin'].includes(userData.role)) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required')
    }

    try {
        const now = Date.now()
        const snapshot = await admin.firestore()
            .collection('rate_limits')
            .where('lockedUntil', '>', now)
            .orderBy('lockedUntil', 'desc')
            .limit(100)
            .get()

        const limits = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            windowStart: doc.data().windowStart,
            lastAttempt: doc.data().lastAttempt,
            lockedUntil: doc.data().lockedUntil
        }))

        return { success: true, limits, count: limits.length }
    } catch (error) {
        console.error('Get all rate limits error:', error)
        throw new functions.https.HttpsError('internal', 'Failed to get rate limits')
    }
})

// Helper function to get client IP from request
function getClientIP(context) {
    // Try to get IP from X-Forwarded-For header (for proxied requests)
    const forwardedFor = context.rawRequest?.headers['x-forwarded-for']
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim()
    }

    // Fall back to direct IP
    return context.rawRequest?.ip || 'unknown'
}

module.exports = {
    checkRateLimit,
    recordSuccess,
    getClientIP,
    RATE_LIMITS
}
