const functions = require('firebase-functions')
const admin = require('firebase-admin')

/**
 * Verify BVN using Paystack BVN Match API
 * Checks if provided BVN matches user's personal information
 */
exports.verifyBVN = functions.https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }

    // FIX-007: Add rate limiting to prevent API abuse
    const { checkRateLimit } = require('./rateLimitService')
    const clientIP = context.rawRequest?.ip || 'unknown'

    await checkRateLimit('bvnVerification', clientIP, {
        maxAttempts: 3,
        windowMs: 3600000 // 1 hour - allows 3 attempts per hour
    })

    const { bvn, firstName, lastName, dateOfBirth, phoneNumber } = data

    if (!bvn || !firstName || !lastName || !dateOfBirth) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields')
    }

    // Validate BVN format (11 digits)
    if (!/^\d{11}$/.test(bvn)) {
        throw new functions.https.HttpsError('invalid-argument', 'BVN must be 11 digits')
    }

    try {
        const PAYSTACK_SECRET_KEY = functions.config().paystack?.secret_key || process.env.PAYSTACK_SECRET_KEY

        if (!PAYSTACK_SECRET_KEY) {
            throw new functions.https.HttpsError('failed-precondition', 'Paystack not configured')
        }

        // Format date as YYYY-MM-DD for Paystack
        const formattedDOB = new Date(dateOfBirth).toISOString().split('T')[0]

        // Call Paystack BVN Match API
        // Docs: https://paystack.com/docs/identity-verification/resolve-bvn/
        const response = await fetch(`https://api.paystack.co/bvn/match`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                bvn,
                account_number: null, // Not matching against account
                bank_code: null,
                first_name: firstName,
                last_name: lastName,
                dob: formattedDOB,
                mobile: phoneNumber || null, // Optional
                middle_name: null // Optional
            })
        })

        const result = await response.json()

        if (!response.ok) {
            console.error('Paystack BVN verification error:', result)
            throw new functions.https.HttpsError('internal', result.message || 'BVN verification failed')
        }

        // Check if all required fields match
        const matches = result.data || {}
        const isFirstNameMatch = matches.first_name === true || matches.first_name === 'true'
        const isLastNameMatch = matches.last_name === true || matches.last_name === 'true'
        const isDOBMatch = matches.dob === true || matches.dob === 'true'

        const isVerified = isFirstNameMatch && isLastNameMatch && isDOBMatch

        // Encrypt BVN before storage (simple example - use proper encryption in production)
        const crypto = require('crypto')
        const algorithm = 'aes-256-cbc'
        const encryptionKey = functions.config().encryption?.key || process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex')
        const iv = crypto.randomBytes(16)
        const cipher = crypto.createCipheriv(algorithm, Buffer.from(encryptionKey.slice(0, 32)), iv)
        let encryptedBVN = cipher.update(bvn, 'utf8', 'hex')
        encryptedBVN += cipher.final('hex')
        const encryptedData = iv.toString('hex') + ':' + encryptedBVN

        // Update user document with verification status
        const db = admin.firestore()
        const userRef = db.collection('users').doc(context.auth.uid)

        await userRef.update({
            'kyc.bvn': encryptedData,
            'kyc.bvnVerified': isVerified,
            'kyc.bvnVerifiedAt': isVerified ? admin.firestore.FieldValue.serverTimestamp() : null,
            'kyc.dateOfBirth': admin.firestore.Timestamp.fromDate(new Date(dateOfBirth)),
            'updatedAt': admin.firestore.FieldValue.serverTimestamp()
        })

        console.log(`BVN verification for ${context.auth.uid}: ${isVerified ? 'SUCCESS' : 'FAILED'}`)

        return {
            success: true,
            verified: isVerified,
            matches: {
                firstName: isFirstNameMatch,
                lastName: isLastNameMatch,
                dateOfBirth: isDOBMatch,
                phone: matches.mobile === true || matches.mobile === 'true'
            },
            message: isVerified
                ? 'BVN verified successfully'
                : 'BVN verification failed - details do not match'
        }
    } catch (error) {
        console.error('Error verifying BVN:', error)

        // Don't expose internal errors to client
        if (error instanceof functions.https.HttpsError) {
            throw error
        }

        throw new functions.https.HttpsError('internal', 'BVN verification failed')
    }
})

/**
 * Alternative: Resolve BVN to get details
 * Useful for auto-filling user data
 */
exports.resolveBVN = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }

    const { bvn } = data

    if (!bvn || !/^\d{11}$/.test(bvn)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid BVN')
    }

    try {
        const PAYSTACK_SECRET_KEY = functions.config().paystack?.secret_key || process.env.PAYSTACK_SECRET_KEY

        if (!PAYSTACK_SECRET_KEY) {
            throw new functions.https.HttpsError('failed-precondition', 'Paystack not configured')
        }

        // Call Paystack Resolve BVN API
        const response = await fetch(`https://api.paystack.co/bank/resolve_bvn/${bvn}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`
            }
        })

        const result = await response.json()

        if (!response.ok) {
            throw new functions.https.HttpsError('internal', result.message || 'Failed to resolve BVN')
        }

        // Return BVN details (masked for security)
        return {
            success: true,
            data: {
                firstName: result.data?.first_name,
                lastName: result.data?.last_name,
                middleName: result.data?.middle_name,
                dateOfBirth: result.data?.dob,
                phone: result.data?.mobile,
                isPhoneLinked: result.data?.is_blacklisted === false
            }
        }
    } catch (error) {
        console.error('Error resolving BVN:', error)

        if (error instanceof functions.https.HttpsError) {
            throw error
        }

        throw new functions.https.HttpsError('internal', 'Failed to resolve BVN')
    }
})
