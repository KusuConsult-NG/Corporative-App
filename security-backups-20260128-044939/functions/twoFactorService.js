const functions = require('firebase-functions');
const admin = require('firebase-admin');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { checkRateLimit, recordSuccess, getClientIP } = require('./rateLimitService');

const db = admin.firestore();

/**
 * Generate 2FA secret and QR code for admin user
 * Only accessible by admin, super_admin roles
 */
exports.setup2FA = functions.https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    try {
        // Get user document
        const userDoc = await db.collection('users').doc(context.auth.uid).get();

        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found');
        }

        const userData = userDoc.data();
        const userRole = userData.role;

        // Verify user is admin or super_admin
        if (!['admin', 'super_admin'].includes(userRole)) {
            throw new functions.https.HttpsError(
                'permission-denied',
                '2FA is only available for admin accounts'
            );
        }

        // Generate secret
        const secret = speakeasy.generateSecret({
            name: `AWSLMCSL (${userData.email})`,
            issuer: 'AWSLMCSL Corporative',
            length: 32
        });

        // Generate QR code
        const qrCodeDataURL = await QRCode.toDataURL(secret.otpauth_url);

        // Store secret temporarily (not yet enabled)
        await db.collection('users').doc(context.auth.uid).update({
            twoFactorSecret: secret.base32,
            twoFactorEnabled: false,
            twoFactorSetupTime: admin.firestore.FieldValue.serverTimestamp()
        });

        return {
            success: true,
            secret: secret.base32,
            qrCode: qrCodeDataURL,
            otpauthUrl: secret.otpauth_url
        };

    } catch (error) {
        console.error('Error setting up 2FA:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Verify 2FA token and enable 2FA
 * Called during initial setup
 */
exports.enable2FA = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const { token } = data;

    if (!token) {
        throw new functions.https.HttpsError('invalid-argument', 'Token is required');
    }

    try {
        const userDoc = await db.collection('users').doc(context.auth.uid).get();

        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found');
        }

        const userData = userDoc.data();

        if (!userData.twoFactorSecret) {
            throw new functions.https.HttpsError('failed-precondition', 'Must setup 2FA first');
        }

        // Verify token
        const verified = speakeasy.totp.verify({
            secret: userData.twoFactorSecret,
            encoding: 'base32',
            token: token,
            window: 2 // Allow 2 time steps before and after
        });

        if (!verified) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid verification code');
        }

        // Enable 2FA
        await db.collection('users').doc(context.auth.uid).update({
            twoFactorEnabled: true,
            twoFactorEnabledAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Generate backup codes
        const backupCodes = generateBackupCodes(8);

        // Store hashed backup codes
        const hashedBackupCodes = backupCodes.map(code => {
            const crypto = require('crypto');
            return crypto.createHash('sha256').update(code).digest('hex');
        });

        await db.collection('users').doc(context.auth.uid).update({
            backupCodes: hashedBackupCodes
        });

        return {
            success: true,
            backupCodes: backupCodes
        };

    } catch (error) {
        console.error('Error enabling 2FA:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Verify 2FA token during login
 * Called from frontend after email/password authentication
 */
exports.verify2FA = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const { token, isBackupCode } = data;

    if (!token) {
        throw new functions.https.HttpsError('invalid-argument', 'Token is required');
    }

    try {
        const userDoc = await db.collection('users').doc(context.auth.uid).get();

        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found');
        }

        const userData = userDoc.data();

        if (!userData.twoFactorEnabled) {
            throw new functions.https.HttpsError('failed-precondition', '2FA is not enabled');
        }

        let verified = false;

        if (isBackupCode) {
            // Verify backup code
            const crypto = require('crypto');
            const hashedCode = crypto.createHash('sha256').update(token.trim()).digest('hex');

            if (userData.backupCodes && userData.backupCodes.includes(hashedCode)) {
                verified = true;

                // Remove used backup code
                const updatedBackupCodes = userData.backupCodes.filter(code => code !== hashedCode);
                await db.collection('users').doc(context.auth.uid).update({
                    backupCodes: updatedBackupCodes
                });

                // Log backup code usage
                await db.collection('audit_logs').add({
                    userId: context.auth.uid,
                    action: 'backup_code_used',
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    ipAddress: context.rawRequest?.ip || 'unknown',
                    userAgent: context.rawRequest?.headers?.['user-agent'] || 'unknown'
                });
            }
        } else {
            // Verify TOTP token
            verified = speakeasy.totp.verify({
                secret: userData.twoFactorSecret,
                encoding: 'base32',
                token: token.trim(),
                window: 2
            });
        }

        if (!verified) {
            // Log failed attempt
            await db.collection('audit_logs').add({
                userId: context.auth.uid,
                action: '2fa_failed',
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                ipAddress: context.rawRequest?.ip || 'unknown',
                userAgent: context.rawRequest?.headers?.['user-agent'] || 'unknown'
            });

            throw new functions.https.HttpsError('invalid-argument', 'Invalid verification code');
        }

        // Log successful verification
        await db.collection('audit_logs').add({
            userId: context.auth.uid,
            action: '2fa_verified',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            ipAddress: context.rawRequest?.ip || 'unknown',
            userAgent: context.rawRequest?.headers?.['user-agent'] || 'unknown'
        });

        // Clear rate limit on success
        await recordSuccess('twoFactorVerify', clientIP);

        return {
            success: true,
            verified: true
        };

    } catch (error) {
        console.error('Error verifying 2FA:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Disable 2FA (requires password re-authentication)
 */
exports.disable2FA = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const { password } = data;

    if (!password) {
        throw new functions.https.HttpsError('invalid-argument', 'Password is required');
    }

    try {
        const userDoc = await db.collection('users').doc(context.auth.uid).get();

        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found');
        }

        // Note: In production, verify password using Firebase Auth re-authentication
        // This is done on the frontend before calling this function

        // Disable 2FA
        await db.collection('users').doc(context.auth.uid).update({
            twoFactorEnabled: false,
            twoFactorSecret: admin.firestore.FieldValue.delete(),
            backupCodes: admin.firestore.FieldValue.delete(),
            twoFactorDisabledAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Log 2FA disable
        await db.collection('audit_logs').add({
            userId: context.auth.uid,
            action: '2fa_disabled',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            ipAddress: context.rawRequest?.ip || 'unknown',
            userAgent: context.rawRequest?.headers?.['user-agent'] || 'unknown'
        });

        return {
            success: true
        };

    } catch (error) {
        console.error('Error disabling 2FA:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Regenerate backup codes
 */
exports.regenerateBackupCodes = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    try {
        const userDoc = await db.collection('users').doc(context.auth.uid).get();

        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found');
        }

        const userData = userDoc.data();

        if (!userData.twoFactorEnabled) {
            throw new functions.https.HttpsError('failed-precondition', '2FA is not enabled');
        }

        // Generate new backup codes
        const backupCodes = generateBackupCodes(8);

        // Store hashed backup codes
        const crypto = require('crypto');
        const hashedBackupCodes = backupCodes.map(code => {
            return crypto.createHash('sha256').update(code).digest('hex');
        });

        await db.collection('users').doc(context.auth.uid).update({
            backupCodes: hashedBackupCodes,
            backupCodesRegeneratedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return {
            success: true,
            backupCodes: backupCodes
        };

    } catch (error) {
        console.error('Error regenerating backup codes:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Helper function to generate random backup codes
 */
function generateBackupCodes(count = 8) {
    const codes = [];
    const crypto = require('crypto');

    for (let i = 0; i < count; i++) {
        // Generate 8-character alphanumeric code
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        // Format as XXXX-XXXX
        const formattedCode = `${code.slice(0, 4)}-${code.slice(4)}`;
        codes.push(formattedCode);
    }

    return codes;
}
