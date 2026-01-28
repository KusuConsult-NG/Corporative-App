const admin = require('firebase-admin');
const functions = require('firebase-functions');
const { createAuditLog, AUDIT_ACTIONS, AUDIT_SEVERITY } = require('./auditService');

/**
 * Generate next Member ID in sequence
 * Format: AWSL-YYYY-NNNN
 */
async function generateNextMemberId() {
    const db = admin.firestore();
    const year = new Date().getFullYear();

    // Use transaction to prevent race conditions
    const counterRef = db.collection('member_id_counter').doc(String(year));

    return db.runTransaction(async (transaction) => {
        const counterDoc = await transaction.get(counterRef);

        let nextNumber = 1;
        if (counterDoc.exists) {
            nextNumber = counterDoc.data().lastNumber + 1;
        }

        // Update counter
        transaction.set(counterRef, {
            year,
            lastNumber: nextNumber,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // Format: AWSL-2026-0001
        const memberId = `AWSL-${year}-${String(nextNumber).padStart(4, '0')}`;

        return memberId;
    });
}

/**
 * Approve user registration and generate Member ID
 */
exports.approveMemberRegistration = functions.https.onCall(async (data, context) => {
    // Verify admin authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const adminUid = context.auth.uid;
    const { userId } = data;

    if (!userId) {
        throw new functions.https.HttpsError('invalid-argument', 'userId is required');
    }

    try {
        // Check if admin has permission
        const adminDoc = await admin.firestore().collection('users').doc(adminUid).get();
        const adminData = adminDoc.data();

        if (!adminData || !['admin', 'super_admin'].includes(adminData.role)) {
            throw new functions.https.HttpsError('permission-denied', 'Admin access required');
        }

        // Get user to approve
        const userRef = admin.firestore().collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found');
        }

        const userData = userDoc.data();

        // Check if already processed
        if (userData.approvalStatus === 'approved') {
            throw new functions.https.HttpsError('already-exists', 'User already approved');
        }

        if (userData.approvalStatus === 'rejected') {
            throw new functions.https.HttpsError('failed-precondition', 'User was previously rejected. Contact super admin to reset.');
        }

        // Generate Member ID
        const memberId = await generateNextMemberId();

        // Update user document
        await userRef.update({
            memberId,
            approvalStatus: 'approved',
            approvedBy: adminUid,
            approvedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Create member registry entry
        await admin.firestore().collection('member_registry').doc(memberId).set({
            memberId,
            userId,
            fullName: userData.name,
            phoneNumber: userData.phoneNumber || null,
            email: userData.email,
            dateAssigned: admin.firestore.FieldValue.serverTimestamp(),
            assignedBy: adminUid
        });

        // Create audit log
        await createAuditLog({
            userId: adminUid,
            action: AUDIT_ACTIONS.MEMBER_APPROVED || 'MEMBER_APPROVED',
            resource: 'users',
            resourceId: userId,
            details: {
                memberId,
                memberName: userData.name,
                memberEmail: userData.email
            },
            severity: AUDIT_SEVERITY.INFO
        });

        // TODO: Send approval email notification to user

        return { success: true, memberId };
    } catch (error) {
        console.error('Error approving registration:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Reject user registration
 */
exports.rejectMemberRegistration = functions.https.onCall(async (data, context) => {
    // Verify admin
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const adminUid = context.auth.uid;
    const { userId, reason } = data;

    if (!userId || !reason) {
        throw new functions.https.HttpsError('invalid-argument', 'userId and reason are required');
    }

    try {
        // Check admin permission
        const adminDoc = await admin.firestore().collection('users').doc(adminUid).get();
        const adminData = adminDoc.data();

        if (!adminData || !['admin', 'super_admin'].includes(adminData.role)) {
            throw new functions.https.HttpsError('permission-denied', 'Admin access required');
        }

        // Get user to reject
        const userRef = admin.firestore().collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found');
        }

        const userData = userDoc.data();

        // Check if already approved (can't reject approved users)
        if (userData.approvalStatus === 'approved') {
            throw new functions.https.HttpsError('failed-precondition', 'Cannot reject an approved user');
        }

        // Update user
        await userRef.update({
            approvalStatus: 'rejected',
            rejectionReason: reason,
            rejectedBy: adminUid,
            rejectedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Create audit log
        await createAuditLog({
            userId: adminUid,
            action: AUDIT_ACTIONS.MEMBER_REJECTED || 'MEMBER_REJECTED',
            resource: 'users',
            resourceId: userId,
            details: {
                memberName: userData.name,
                memberEmail: userData.email,
                reason
            },
            severity: AUDIT_SEVERITY.WARNING
        });

        // TODO: Send rejection email

        return { success: true };
    } catch (error) {
        console.error('Error rejecting registration:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});


// Functions already exported above via exports.approveMemberRegistration and exports.rejectMemberRegistration
