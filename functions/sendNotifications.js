const functions = require('firebase-functions');
const admin = require('firebase-admin');

const db = admin.firestore();

/**
 * Send push notification to user's devices
 * @param {string} userId - Target user ID
 * @param {object} notification - Notification data
 */
async function sendPushNotification(userId, notification) {
    try {
        // Get user's FCM tokens
        const tokensSnapshot = await db.collection(`users/${userId}/fcmTokens`).get();

        if (tokensSnapshot.empty) {
            console.log(`No FCM tokens found for user ${userId}`);
            return { success: false, reason: 'no_tokens' };
        }

        const tokens = tokensSnapshot.docs.map(doc => doc.data().token);
        console.log(`Sending notification to ${tokens.length} device(s) for user ${userId}`);

        // Prepare FCM message
        const message = {
            notification: {
                title: notification.title,
                body: notification.body
            },
            data: notification.data || {},
            tokens: tokens
        };

        // Send multicast message
        const response = await admin.messaging().sendEachForMulticast(message);

        console.log(`✅ Successfully sent ${response.successCount} notification(s)`);
        if (response.failureCount > 0) {
            console.warn(`⚠️ Failed to send ${response.failureCount} notification(s)`);

            // Clean up invalid tokens
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    failedTokens.push(tokens[idx]);
                    console.error(`Error for token ${tokens[idx]}:`, resp.error);
                }
            });

            // Remove invalid tokens
            await cleanupInvalidTokens(userId, failedTokens);
        }

        return { success: true, successCount: response.successCount, failureCount: response.failureCount };
    } catch (error) {
        console.error('Error sending push notification:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Clean up invalid or expired FCM tokens
 */
async function cleanupInvalidTokens(userId, tokens) {
    try {
        const batch = db.batch();

        for (const token of tokens) {
            const tokenRef = db.doc(`users/${userId}/fcmTokens/${token}`);
            batch.delete(tokenRef);
        }

        await batch.commit();
        console.log(`🧹 Cleaned up ${tokens.length} invalid token(s) for user ${userId}`);
    } catch (error) {
        console.error('Error cleaning up invalid tokens:', error);
    }
}

/**
 * Firestore trigger: Send notification when loan is approved
 */
exports.onLoanApproved = functions.firestore
    .document('loans/{loanId}')
    .onUpdate(async (change, context) => {
        const before = change.before.data();
        const after = change.after.data();

        // Check if status changed to 'approved'
        if (before.status !== 'approved' && after.status === 'approved') {
            console.log(`💰 Loan ${context.params.loanId} approved, sending notification`);

            await sendPushNotification(after.userId, {
                title: '🎉 Loan Approved!',
                body: `Your ${after.loanType.replace('_', ' ')} loan of ₦${after.amount.toLocaleString()} has been approved.`,
                data: {
                    type: 'loan_approved',
                    loanId: context.params.loanId,
                    url: '/member/my-loans'
                }
            });

            // Also create in-app notification
            await db.collection('notifications').add({
                userId: after.userId,
                type: 'loan_approved',
                title: '🎉 Loan Approved!',
                message: `Your ${after.loanType.replace('_', ' ')} loan of ₦${after.amount.toLocaleString()} has been approved.`,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        // Check if status changed to 'rejected'
        if (before.status !== 'rejected' && after.status === 'rejected') {
            console.log(`❌ Loan ${context.params.loanId} rejected, sending notification`);

            await sendPushNotification(after.userId, {
                title: 'Loan Application Update',
                body: 'Your loan application was not approved. Please contact support for details.',
                data: {
                    type: 'loan_rejected',
                    loanId: context.params.loanId,
                    url: '/member/my-loans'
                }
            });
        }
    });

/**
 * Firestore trigger: Send notification for guarantor approval requests
 */
exports.onGuarantorRequestCreated = functions.firestore
    .document('guarantor_approvals/{approvalId}')
    .onCreate(async (snap, context) => {
        const approval = snap.data();

        console.log(`👥 Guarantor request created for ${approval.guarantorMemberId}`);

        // Get guarantor's userId from users collection
        const guarantorSnapshot = await db.collection('users')
            .where('memberId', '==', approval.guarantorMemberId)
            .limit(1)
            .get();

        if (!guarantorSnapshot.empty) {
            const guarantorUserId = guarantorSnapshot.docs[0].id;

            await sendPushNotification(guarantorUserId, {
                title: '👥 Guarantor Request',
                body: `${approval.applicantName} has requested you as a guarantor for a loan of ₦${approval.loanAmount.toLocaleString()}`,
                data: {
                    type: 'guarantor_request',
                    approvalId: context.params.approvalId,
                    url: '/member/guarantor-requests'
                }
            });
        }
    });

/**
 * Firestore trigger: Send notification when commodity order status changes
 */
exports.onCommodityOrderStatusChange = functions.firestore
    .document('commodityOrders/{orderId}')
    .onUpdate(async (change, context) => {
        const before = change.before.data();
        const after = change.after.data();

        // Check if status changed
        if (before.status !== after.status) {
            let title = 'Order Update';
            let body = '';

            switch (after.status) {
                case 'approved':
                    title = '✅ Order Approved';
                    body = `Your order for ${after.productName} has been approved.`;
                    break;
                case 'processing':
                    title = '📦 Order Processing';
                    body = `Your order for ${after.productName} is being processed.`;
                    break;
                case 'delivered':
                    title = '🎉 Order Delivered';
                    body = `Your order for ${after.productName} has been delivered!`;
                    break;
                case 'rejected':
                    title = 'Order Update';
                    body = `Your order for ${after.productName} was not approved.`;
                    break;
            }

            if (body) {
                await sendPushNotification(after.userId, {
                    title,
                    body,
                    data: {
                        type: 'commodity_order_update',
                        orderId: context.params.orderId,
                        status: after.status,
                        url: '/member/orders'
                    }
                });
            }
        }
    });

/**
 * Firestore trigger: Send notification when savings withdrawal is approved
 */
exports.onSavingsWithdrawalApproved = functions.firestore
    .document('savings_reduction_requests/{requestId}')
    .onUpdate(async (change, context) => {
        const before = change.before.data();
        const after = change.after.data();

        if (before.status !== 'approved' && after.status === 'approved') {
            await sendPushNotification(after.userId, {
                title: '💰 Withdrawal Approved',
                body: `Your savings withdrawal of ₦${after.amount.toLocaleString()} has been approved.`,
                data: {
                    type: 'withdrawal_approved',
                    requestId: context.params.requestId,
                    url: '/member/savings'
                }
            });
        }
    });

/**
 * Firestore trigger: Notify admins when new profile change request is created
 */
exports.onProfileChangeRequestCreated = functions.firestore
    .document('profile_change_requests/{requestId}')
    .onCreate(async (snap, context) => {
        const request = snap.data();

        console.log(`📝 New profile change request from user ${request.userId}`);

        // Get all admin users
        const adminsSnapshot = await db.collection('users')
            .where('role', 'in', ['admin', 'superAdmin'])
            .get();

        // Notify each admin
        for (const adminDoc of adminsSnapshot.docs) {
            await db.collection('notifications').add({
                userId: adminDoc.id,
                type: 'profile_change_request',
                title: '📝 New Profile Change Request',
                message: `${request.memberName || 'A member'} has requested to change their ${request.fieldToChange}`,
                read: false,
                priority: 'normal',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                metadata: {
                    requestId: context.params.requestId,
                    url: '/admin/profile-changes'
                }
            });
        }

        console.log(`✅ Notified ${adminsSnapshot.size} admin(s) of new profile change request`);
    });

/**
 * Firestore trigger: Send notification when profile change request is processed
 */
exports.onProfileChangeRequestProcessed = functions.firestore
    .document('profile_change_requests/{requestId}')
    .onUpdate(async (change, context) => {
        const before = change.before.data();
        const after = change.after.data();

        // Check if status changed to 'approved'
        if (before.status !== 'approved' && after.status === 'approved') {
            console.log(`✅ Profile change request ${context.params.requestId} approved`);

            await sendPushNotification(after.userId, {
                title: '✅ Profile Change Approved',
                body: `Your profile change request has been approved. Your ${after.fieldToChange} has been updated.`,
                data: {
                    type: 'profile_change_approved',
                    requestId: context.params.requestId,
                    url: '/member/profile'
                }
            });

            // Create in-app notification
            await db.collection('notifications').add({
                userId: after.userId,
                type: 'profile_change_approved',
                title: '✅ Profile Change Approved',
                message: `Your profile change request has been approved. Your ${after.fieldToChange} has been updated.`,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        // Check if status changed to 'rejected'
        if (before.status !== 'rejected' && after.status === 'rejected') {
            console.log(`❌ Profile change request ${context.params.requestId} rejected`);

            const reason = after.rejectionReason || 'Insufficient documentation or invalid information';

            await sendPushNotification(after.userId, {
                title: 'Profile Change Request Update',
                body: `Your profile change request was not approved. Reason: ${reason}`,
                data: {
                    type: 'profile_change_rejected',
                    requestId: context.params.requestId,
                    url: '/member/profile'
                }
            });

            // Create in-app notification
            await db.collection('notifications').add({
                userId: after.userId,
                type: 'profile_change_rejected',
                title: 'Profile Change Request Update',
                message: `Your profile change request was not approved. Reason: ${reason}`,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
    });

/**
 * Firestore trigger: Notify admins when new complaint is created
 */
exports.onComplaintCreated = functions.firestore
    .document('complaints/{complaintId}')
    .onCreate(async (snap, context) => {
        const complaint = snap.data();

        console.log(`💬 New complaint created: ${context.params.complaintId}`);

        // Get all admin users
        const adminsSnapshot = await db.collection('users')
            .where('role', 'in', ['admin', 'superAdmin'])
            .get();

        // Determine priority emoji
        const priority = complaint.priority || 'normal';
        const priorityEmoji = {
            low: '📝',
            normal: '💬',
            high: '⚠️',
            urgent: '🚨'
        }[priority];

        // Notify each admin
        for (const adminDoc of adminsSnapshot.docs) {
            await db.collection('notifications').add({
                userId: adminDoc.id,
                type: 'new_complaint',
                title: `${priorityEmoji} New Complaint`,
                message: `${complaint.subject || 'No subject'} - Priority: ${priority.toUpperCase()}`,
                read: false,
                priority: priority === 'urgent' ? 'high' : 'normal',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                metadata: {
                    complaintId: context.params.complaintId,
                    url: '/admin/complaints'
                }
            });
        }

        console.log(`✅ Notified ${adminsSnapshot.size} admin(s) of new complaint`);
    });

/**
 * Firestore trigger: Notify member when admin responds to complaint
 */
exports.onComplaintResponded = functions.firestore
    .document('complaints/{complaintId}')
    .onUpdate(async (change, context) => {
        const before = change.before.data();
        const after = change.after.data();

        // Check if admin added a response
        if (!before.adminResponse && after.adminResponse) {
            console.log(`💬 Admin responded to complaint ${context.params.complaintId}`);

            await sendPushNotification(after.userId, {
                title: '💬 Admin Responded to Your Complaint',
                body: `Your complaint "${after.subject || 'complaint'}" has been addressed.`,
                data: {
                    type: 'complaint_response',
                    complaintId: context.params.complaintId,
                    url: '/member/complaints'
                }
            });

            // Create in-app notification
            await db.collection('notifications').add({
                userId: after.userId,
                type: 'complaint_response',
                title: '💬 Admin Responded',
                message: `Your complaint "${after.subject || 'complaint'}" has been addressed.`,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        // Check if status changed to resolved
        if (before.status !== 'resolved' && after.status === 'resolved') {
            console.log(`✅ Complaint ${context.params.complaintId} resolved`);

            await sendPushNotification(after.userId, {
                title: '✅ Complaint Resolved',
                body: `Your complaint "${after.subject || 'complaint'}" has been marked as resolved.`,
                data: {
                    type: 'complaint_resolved',
                    complaintId: context.params.complaintId,
                    url: '/member/complaints'
                }
            });

            // Create in-app notification
            await db.collection('notifications').add({
                userId: after.userId,
                type: 'complaint_resolved',
                title: '✅ Complaint Resolved',
                message: `Your complaint "${after.subject || 'complaint'}" has been resolved.`,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
    });

/**
 * Scheduled function: Send payment reminders 3 days before due date
 * Runs daily at 9 AM
 */
exports.sendPaymentReminders = functions.pubsub
    .schedule('0 9 * * *')
    .timeZone('Africa/Lagos')
    .onRun(async (context) => {
        console.log('🔔 Sending payment reminders...');

        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

        // Get loans with payments due in 3 days
        // This is simplified - in production you'd track actual payment schedules
        const loansSnapshot = await db.collection('loans')
            .where('status', '==', 'approved')
            .get();

        for (const loanDoc of loansSnapshot.docs) {
            const loan = loanDoc.data();

            // Simple check: if we're near the 1st of the month, send reminder
            const today = new Date();
            if (today.getDate() >= 28 || today.getDate() <= 3) {
                await sendPushNotification(loan.userId, {
                    title: '📅 Payment Reminder',
                    body: `Your monthly loan payment is due soon. Please ensure sufficient savings balance.`,
                    data: {
                        type: 'payment_reminder',
                        loanId: loanDoc.id,
                        url: '/member/my-loans'
                    }
                });
            }
        }

        console.log('✅ Payment reminders sent');
    });

// Export the helper function for use in other Cloud Functions
exports.sendPushNotification = sendPushNotification;
