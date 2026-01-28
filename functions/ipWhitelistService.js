const functions = require('firebase-functions')
const admin = require('firebase-admin')
const ipRangeCheck = require('ip-range-check')
const { sendAlert } = require('./emailAlertService')

/**
 * Check if an IP address is whitelisted
 * @param {string} ip - IP address to check
 * @param {string} userRole - User role (admin, super_admin, etc.)
 * @returns {Promise<{allowed: boolean, matchedRule?: object, reason?: string}>}
 */
async function isIPWhitelisted(ip, userRole) {
    try {
        // Get active whitelist rules
        const whitelist = await admin.firestore()
            .collection('ip_whitelist')
            .where('active', '==', true)
            .get()

        if (whitelist.empty) {
            // No rules = allow all (development mode)
            console.log('⚠️ No IP whitelist rules found - allowing all IPs')
            return { allowed: true, reason: 'No whitelist rules configured' }
        }

        // Check each rule
        for (const doc of whitelist.docs) {
            const rule = doc.data()
            const { ip: allowedIP, type, allowedRoles } = rule

            // Check if rule applies to this role
            if (allowedRoles && !allowedRoles.includes(userRole)) {
                continue // Skip this rule
            }

            // Check IP match
            let matches = false

            if (type === 'single') {
                matches = ip === allowedIP
            } else if (type === 'range') {
                matches = ipRangeCheck(ip, allowedIP)
            }

            if (matches) {
                console.log(`✅ IP ${ip} matched whitelist rule: ${rule.label}`)
                return {
                    allowed: true,
                    matchedRule: {
                        id: doc.id,
                        label: rule.label,
                        ip: allowedIP
                    }
                }
            }
        }

        // No match found
        console.log(`❌ IP ${ip} not in whitelist`)
        return { allowed: false, reason: 'IP not whitelisted' }
    } catch (error) {
        console.error('Error checking IP whitelist:', error)
        // Fail open for safety (don't lock out admins on errors)
        return { allowed: true, reason: 'Whitelist check failed - allowing access' }
    }
}

/**
 * Enforce IP whitelist for admin routes
 * Callable function to check if current user's IP is allowed
 */
exports.checkIPWhitelist = functions.https.onCall(async (data, context) => {
    try {
        // Must be authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be logged in')
        }

        const userIP = context.rawRequest.ip
        const userRole = context.auth.token.role || 'member'
        const userId = context.auth.uid

        // Only check for admin/super_admin roles
        if (!['admin', 'super_admin'].includes(userRole)) {
            return { allowed: true, reason: 'Not an admin role' }
        }

        // Check if enforcement is enabled
        const config = await admin.firestore()
            .collection('system_config')
            .doc('ip_whitelist')
            .get()

        const enforcementEnabled = config.exists ? config.data().enforceWhitelist : false

        // Check whitelist
        const result = await isIPWhitelisted(userIP, userRole)

        // Log access attempt
        await admin.firestore().collection('ip_access_log').add({
            userId,
            userRole,
            ip: userIP,
            allowed: result.allowed,
            matchedRule: result.matchedRule?.label || null,
            reason: result.reason || null,
            enforcementMode: enforcementEnabled ? 'enforced' : 'log_only',
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        })

        // If not allowed and enforcement is enabled
        if (!result.allowed && enforcementEnabled) {
            // Send security alert
            const userDoc = await admin.firestore().collection('users').doc(userId).get()
            const userName = userDoc.exists ? userDoc.data().name : 'Unknown'

            await sendAlert('IP_WHITELIST_VIOLATION', {
                userName,
                userId,
                userRole,
                ip: userIP,
                timestamp: new Date(),
                action: 'blocked'
            })

            throw new functions.https.HttpsError(
                'permission-denied',
                'Access denied: Your IP address is not whitelisted. Please contact an administrator.'
            )
        }

        // If not allowed but in log-only mode
        if (!result.allowed && !enforcementEnabled) {
            console.log(`⚠️ IP ${userIP} would be blocked (log-only mode)`)

            // Send alert but don't block
            const userDoc = await admin.firestore().collection('users').doc(userId).get()
            const userName = userDoc.exists ? userDoc.data().name : 'Unknown'

            await sendAlert('IP_WHITELIST_VIOLATION', {
                userName,
                userId,
                userRole,
                ip: userIP,
                timestamp: new Date(),
                action: 'logged_only'
            })
        }

        return {
            allowed: true, // Always allow in log-only mode
            ip: userIP,
            enforcementEnabled,
            matchedRule: result.matchedRule,
            wouldBeBlocked: !result.allowed && enforcementEnabled
        }
    } catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error
        }
        console.error('Error in checkIPWhitelist:', error)
        throw new functions.https.HttpsError('internal', error.message)
    }
})

/**
 * Add IP to whitelist (super admin only)
 */
exports.addIPToWhitelist = functions.https.onCall(async (data, context) => {
    try {
        // Only super admins can add IPs
        if (!context.auth || context.auth.token.role !== 'super_admin') {
            throw new functions.https.HttpsError(
                'permission-denied',
                'Only super admins can add IPs to whitelist'
            )
        }

        const { ip, type, label, allowedRoles } = data

        // Validate inputs
        if (!ip || !type || !label) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required fields')
        }

        if (!['single', 'range'].includes(type)) {
            throw new functions.https.HttpsError('invalid-argument', 'Type must be "single" or "range"')
        }

        // Validate IP format
        if (type === 'single') {
            const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
            if (!ipRegex.test(ip)) {
                throw new functions.https.HttpsError('invalid-argument', 'Invalid IP address format')
            }
        } else if (type === 'range') {
            const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/
            if (!cidrRegex.test(ip)) {
                throw new functions.https.HttpsError('invalid-argument', 'Invalid CIDR range format')
            }
        }

        // Add to whitelist
        const docRef = await admin.firestore().collection('ip_whitelist').add({
            ip,
            type,
            label,
            allowedRoles: allowedRoles || ['admin', 'super_admin'],
            active: true,
            addedBy: context.auth.uid,
            addedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastModified: admin.firestore.FieldValue.serverTimestamp()
        })

        // Log action
        await admin.firestore().collection('audit_logs').add({
            action: 'IP_WHITELIST_ADD',
            actorId: context.auth.uid,
            actorRole: context.auth.token.role,
            details: { ip, type, label },
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        })

        console.log(`✅ Added IP to whitelist: ${label} (${ip})`)
        return { success: true, id: docRef.id }
    } catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error
        }
        console.error('Error adding IP to whitelist:', error)
        throw new functions.https.HttpsError('internal', error.message)
    }
})

/**
 * Remove IP from whitelist (super admin only)
 */
exports.removeIPFromWhitelist = functions.https.onCall(async (data, context) => {
    try {
        // Only super admins can remove IPs
        if (!context.auth || context.auth.token.role !== 'super_admin') {
            throw new functions.https.HttpsError(
                'permission-denied',
                'Only super admins can remove IPs from whitelist'
            )
        }

        const { id } = data

        if (!id) {
            throw new functions.https.HttpsError('invalid-argument', 'IP whitelist ID required')
        }

        // Get the rule before deleting
        const ruleDoc = await admin.firestore().collection('ip_whitelist').doc(id).get()

        if (!ruleDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'IP whitelist rule not found')
        }

        const rule = ruleDoc.data()

        // Soft delete (mark as inactive)
        await ruleDoc.ref.update({
            active: false,
            removedBy: context.auth.uid,
            removedAt: admin.firestore.FieldValue.serverTimestamp()
        })

        // Log action
        await admin.firestore().collection('audit_logs').add({
            action: 'IP_WHITELIST_REMOVE',
            actorId: context.auth.uid,
            actorRole: context.auth.token.role,
            details: { ip: rule.ip, label: rule.label },
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        })

        console.log(`🗑️ Removed IP from whitelist: ${rule.label}`)
        return { success: true }
    } catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error
        }
        console.error('Error removing IP from whitelist:', error)
        throw new functions.https.HttpsError('internal', error.message)
    }
})

/**
 * Toggle IP whitelist enforcement (super admin only)
 */
exports.toggleIPWhitelistEnforcement = functions.https.onCall(async (data, context) => {
    try {
        // Only super admins can toggle enforcement
        if (!context.auth || context.auth.token.role !== 'super_admin') {
            throw new functions.https.HttpsError(
                'permission-denied',
                'Only super admins can toggle enforcement'
            )
        }

        const { enforce } = data

        if (typeof enforce !== 'boolean') {
            throw new functions.https.HttpsError('invalid-argument', 'enforce must be boolean')
        }

        // Update system config
        await admin.firestore()
            .collection('system_config')
            .doc('ip_whitelist')
            .set({
                enforceWhitelist: enforce,
                lastModified: admin.firestore.FieldValue.serverTimestamp(),
                modifiedBy: context.auth.uid
            }, { merge: true })

        // Log action
        await admin.firestore().collection('audit_logs').add({
            action: 'IP_WHITELIST_ENFORCEMENT_TOGGLE',
            actorId: context.auth.uid,
            actorRole: context.auth.token.role,
            details: { enforceWhitelist: enforce },
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        })

        console.log(`⚙️ IP whitelist enforcement: ${enforce ? 'ENABLED' : 'DISABLED'}`)
        return { success: true, enforceWhitelist: enforce }
    } catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error
        }
        console.error('Error toggling enforcement:', error)
        throw new functions.https.HttpsError('internal', error.message)
    }
})

/**
 * Get current user's IP address
 * Useful for adding their own IP to whitelist
 */
exports.getMyIP = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in')
    }

    return { ip: context.rawRequest.ip }
})

module.exports = {
    isIPWhitelisted,
    checkIPWhitelist: exports.checkIPWhitelist,
    addIPToWhitelist: exports.addIPToWhitelist,
    removeIPFromWhitelist: exports.removeIPFromWhitelist,
    toggleIPWhitelistEnforcement: exports.toggleIPWhitelistEnforcement,
    getMyIP: exports.getMyIP
}
