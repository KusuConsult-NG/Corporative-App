const functions = require('firebase-functions')
const admin = require('firebase-admin')
const { sendAlert } = require('./emailAlertService')

/**
 * Register or verify a device fingerprint for a user
 * Called on login/page load
 */
exports.registerDevice = functions.https.onCall(async (data, context) => {
    try {
        // Must be authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be logged in')
        }

        const userId = context.auth.uid
        const { fingerprint, deviceInfo } = data

        if (!fingerprint) {
            throw new functions.https.HttpsError('invalid-argument', 'Fingerprint required')
        }

        // Check if device already exists
        const existingDevice = await admin.firestore()
            .collection('user_devices')
            .where('userId', '==', userId)
            .where('fingerprint', '==', fingerprint)
            .limit(1)
            .get()

        if (!existingDevice.empty) {
            // Device exists - update last seen
            const deviceDoc = existingDevice.docs[0]
            await deviceDoc.ref.update({
                lastSeen: admin.firestore.FieldValue.serverTimestamp(),
                lastIP: context.rawRequest.ip,
                loginCount: admin.firestore.FieldValue.increment(1)
            })

            console.log(`✅ Known device for user ${userId}`)
            return {
                isNewDevice: false,
                deviceId: deviceDoc.id,
                deviceName: deviceDoc.data().name
            }
        }

        // New device detected
        const userDoc = await admin.firestore().collection('users').doc(userId).get()
        const userData = userDoc.data()
        const userName = userData?.name || 'Unknown User'
        const userRole = userData?.role || 'member'

        // Generate device name
        const deviceName = generateDeviceName(deviceInfo)

        // Add new device
        const newDevice = await admin.firestore().collection('user_devices').add({
            userId,
            fingerprint,
            name: deviceName,
            deviceInfo: {
                browser: deviceInfo?.browser || 'Unknown',
                os: deviceInfo?.os || 'Unknown',
                platform: deviceInfo?.platform || 'Unknown',
                userAgent: deviceInfo?.userAgent || context.rawRequest.headers['user-agent']
            },
            firstSeen: admin.firestore.FieldValue.serverTimestamp(),
            lastSeen: admin.firestore.FieldValue.serverTimestamp(),
            lastIP: context.rawRequest.ip,
            loginCount: 1,
            trusted: false,
            active: true
        })

        // Log audit event
        await admin.firestore().collection('audit_logs').add({
            action: 'NEW_DEVICE_LOGIN',
            actorId: userId,
            actorRole: userRole,
            details: {
                deviceId: newDevice.id,
                deviceName,
                fingerprint: fingerprint.substring(0, 16) + '...', // Truncate for privacy
                ip: context.rawRequest.ip,
                browser: deviceInfo?.browser,
                os: deviceInfo?.os
            },
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        })

        // Send security alert for admins and super_admins only
        if (['admin', 'super_admin'].includes(userRole)) {
            await sendAlert('NEW_DEVICE_LOGIN', {
                userName,
                userId,
                userRole,
                deviceName,
                browser: deviceInfo?.browser || 'Unknown',
                os: deviceInfo?.os || 'Unknown',
                ip: context.rawRequest.ip,
                timestamp: new Date()
            })
        }

        console.log(`🆕 New device registered for user ${userId}: ${deviceName}`)

        return {
            isNewDevice: true,
            deviceId: newDevice.id,
            deviceName,
            requiresVerification: ['admin', 'super_admin'].includes(userRole)
        }
    } catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error
        }
        console.error('Error registering device:', error)
        throw new functions.https.HttpsError('internal', error.message)
    }
})

/**
 * Get all devices for current user
 */
exports.getUserDevices = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be logged in')
        }

        const userId = context.auth.uid

        const devicesSnapshot = await admin.firestore()
            .collection('user_devices')
            .where('userId', '==', userId)
            .where('active', '==', true)
            .orderBy('lastSeen', 'desc')
            .get()

        const devices = devicesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            // Don't send full fingerprint to client
            fingerprint: doc.data().fingerprint.substring(0, 16) + '...'
        }))

        return { devices }
    } catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error
        }
        console.error('Error getting user devices:', error)
        throw new functions.https.HttpsError('internal', error.message)
    }
})

/**
 * Trust a device (mark as verified)
 */
exports.trustDevice = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be logged in')
        }

        const { deviceId } = data
        const userId = context.auth.uid

        if (!deviceId) {
            throw new functions.https.HttpsError('invalid-argument', 'Device ID required')
        }

        // Verify device belongs to user
        const deviceDoc = await admin.firestore().collection('user_devices').doc(deviceId).get()

        if (!deviceDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Device not found')
        }

        if (deviceDoc.data().userId !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'Device does not belong to user')
        }

        // Mark as trusted
        await deviceDoc.ref.update({
            trusted: true,
            trustedAt: admin.firestore.FieldValue.serverTimestamp()
        })

        console.log(`✅ Device ${deviceId} marked as trusted`)
        return { success: true }
    } catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error
        }
        console.error('Error trusting device:', error)
        throw new functions.https.HttpsError('internal', error.message)
    }
})

/**
 * Remove/revoke a device
 */
exports.removeDevice = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be logged in')
        }

        const { deviceId } = data
        const userId = context.auth.uid

        if (!deviceId) {
            throw new functions.https.HttpsError('invalid-argument', 'Device ID required')
        }

        // Verify device belongs to user
        const deviceDoc = await admin.firestore().collection('user_devices').doc(deviceId).get()

        if (!deviceDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Device not found')
        }

        if (deviceDoc.data().userId !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'Device does not belong to user')
        }

        // Soft delete (mark as inactive)
        await deviceDoc.ref.update({
            active: false,
            removedAt: admin.firestore.FieldValue.serverTimestamp()
        })

        // Log audit event
        const userDoc = await admin.firestore().collection('users').doc(userId).get()
        await admin.firestore().collection('audit_logs').add({
            action: 'DEVICE_REMOVED',
            actorId: userId,
            actorRole: userDoc.data()?.role || 'member',
            details: {
                deviceId,
                deviceName: deviceDoc.data().name
            },
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        })

        console.log(`🗑️ Device ${deviceId} removed`)
        return { success: true }
    } catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error
        }
        console.error('Error removing device:', error)
        throw new functions.https.HttpsError('internal', error.message)
    }
})

/**
 * Rename a device
 */
exports.renameDevice = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be logged in')
        }

        const { deviceId, name } = data
        const userId = context.auth.uid

        if (!deviceId || !name) {
            throw new functions.https.HttpsError('invalid-argument', 'Device ID and name required')
        }

        // Verify device belongs to user
        const deviceDoc = await admin.firestore().collection('user_devices').doc(deviceId).get()

        if (!deviceDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Device not found')
        }

        if (deviceDoc.data().userId !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'Device does not belong to user')
        }

        // Update name
        await deviceDoc.ref.update({ name })

        console.log(`✏️ Device ${deviceId} renamed to "${name}"`)
        return { success: true }
    } catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error
        }
        console.error('Error renaming device:', error)
        throw new functions.https.HttpsError('internal', error.message)
    }
})

/**
 * Generate a friendly device name from device info
 */
function generateDeviceName(deviceInfo) {
    if (!deviceInfo) {
        return 'Unknown Device'
    }

    const { browser, os, platform } = deviceInfo

    // Try to create a meaningful name
    if (browser && os) {
        return `${browser} on ${os}`
    }

    if (platform) {
        return platform
    }

    return 'Unknown Device'
}

module.exports = {
    registerDevice: exports.registerDevice,
    getUserDevices: exports.getUserDevices,
    trustDevice: exports.trustDevice,
    removeDevice: exports.removeDevice,
    renameDevice: exports.renameDevice
}
