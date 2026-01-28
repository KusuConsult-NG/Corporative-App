const functions = require('firebase-functions')
const admin = require('firebase-admin')
const crypto = require('crypto')

/**
 * Generate a unique guarantor approval token
 */
function generateApprovalToken() {
    return crypto.randomBytes(32).toString('hex')
}

/**
 * Send guarantor approval request email
 * Called when loan application is submitted
 */
exports.sendGuarantorApprovalEmail = functions.https.onCall(async (data, context) => {
    // Authenticate user
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }

    const { loanApplicationId, guarantorEmail, borrowerName, loanAmount, loanPurpose } = data

    if (!loanApplicationId || !guarantorEmail) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields')
    }

    try {
        const db = admin.firestore()

        // Get loan application
        const loanRef = db.collection('loanApplications').doc(loanApplicationId)
        const loanDoc = await loanRef.get()

        if (!loanDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Loan application not found')
        }

        const loan = loanDoc.data()

        // FIX-006: Verify user owns this loan
        if (loan.userId !== context.auth.uid) {
            throw new functions.https.HttpsError(
                'permission-denied',
                'You can only send guarantor requests for your own loans'
            )
        }

        // Generate approval token
        const approvalToken = generateApprovalToken()
        const tokenExpiry = new Date()
        tokenExpiry.setDate(tokenExpiry.getDate() + 7) // 7 days expiry

        // Update loan application with token
        await loanRef.update({
            guarantorApprovalToken: approvalToken,
            guarantorTokenExpiry: admin.firestore.Timestamp.fromDate(tokenExpiry),
            guarantorStatus: 'pending'
        })

        // Create approval link
        const approvalLink = `${process.env.VITE_APP_URL || 'http://localhost:3000'}/guarantor-approval/${approvalToken}`

        // Send email using Resend
        const { Resend } = require('resend')
        const resendKey = functions.config().resend?.key

        if (!resendKey) {
            console.warn('Resend API key not configured. Email not sent.')
            return { success: false, message: 'Email service not configured' }
        }

        const resend = new Resend(resendKey)

        await resend.emails.send({
            from: 'AWSLMCSL Cooperative <noreply@awslmcsl.org>',
            to: guarantorEmail,
            subject: 'Guarantor Request for Loan Application',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                        .detail-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
                        .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
                        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
                        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Guarantor Request</h1>
                            <p>AWSLMCSL Cooperative Society</p>
                        </div>
                        <div class="content">
                            <p>Dear Member,</p>
                            <p><strong>${borrowerName}</strong> has requested you to be a guarantor for their loan application.</p>
                            <div class="detail-box">
                                <h3 style="margin-top: 0; color: #667eea;">Loan Details</h3>
                                <p><strong>Applicant:</strong> ${borrowerName}</p>
                                <p><strong>Loan Amount:</strong> ₦${loanAmount.toLocaleString()}</p>
                                <p><strong>Purpose:</strong> ${loanPurpose}</p>
                            </div>
                            <div class="warning">
                                <p style="margin: 0;"><strong>⚠️ Important:</strong> As a guarantor, you agree to take financial responsibility if the borrower defaults on this loan.</p>
                            </div>
                            <p style="text-align: center;">
                                <a href="${approvalLink}" class="button">Review & Respond to Request</a>
                            </p>
                            <p style="font-size: 14px; color: #6b7280;">
                                This link will expire on ${tokenExpiry.toLocaleDateString()}. 
                                If you did not expect this email, please ignore it.
                            </p>
                        </div>
                        <div class="footer">
                            <p>AWSLMCSL Cooperative Society<br>This is an automated message, please do not reply.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        })

        console.log(`✅ Guarantor email sent to ${guarantorEmail} for loan ${loanApplicationId}`)

        return {
            success: true,
            approvalToken,
            expiresAt: tokenExpiry.toISOString()
        }
    } catch (error) {
        console.error('Error sending guarantor approval email:', error)
        throw new functions.https.HttpsError('internal', error.message)
    }
})

/**
 * Get guarantor approval details by token
 * Public endpoint (no authentication required)
 */
exports.getGuarantorApprovalByToken = functions.https.onCall(async (data, context) => {
    const { token } = data

    if (!token) {
        throw new functions.https.HttpsError('invalid-argument', 'Token is required')
    }

    try {
        const db = admin.firestore()

        // Find loan application by token
        const loansSnapshot = await db.collection('loanApplications')
            .where('guarantorApprovalToken', '==', token)
            .limit(1)
            .get()

        if (loansSnapshot.empty) {
            throw new functions.https.HttpsError('not-found', 'Invalid or expired approval link')
        }

        const loanDoc = loansSnapshot.docs[0]
        const loan = loanDoc.data()

        // Check if already responded
        if (loan.guarantorStatus !== 'pending') {
            return {
                status: loan.guarantorStatus,
                message: loan.guarantorStatus === 'approved'
                    ? 'You have already approved this request'
                    : 'This request has already been declined'
            }
        }

        // Check if expired
        if (loan.guarantorTokenExpiry && loan.guarantorTokenExpiry.toDate() < new Date()) {
            throw new functions.https.HttpsError('failed-precondition', 'This approval link has expired')
        }

        // Return loan details for display
        return {
            $id: loanDoc.id,
            applicantName: loan.userName || 'Unknown',
            loanAmount: loan.amount,
            loanPurpose: loan.purpose,
            loanType: loan.loanType,
            duration: loan.duration,
            status: 'pending',
            expiresAt: loan.guarantorTokenExpiry ? loan.guarantorTokenExpiry.toDate().toISOString() : null
        }
    } catch (error) {
        console.error('Error getting guarantor approval:', error)
        throw new functions.https.HttpsError('internal', error.message)
    }
})

/**
 * Approve guarantor request
 * Public endpoint (no authentication required)
 */
exports.approveGuarantorRequest = functions.https.onCall(async (data, context) => {
    const { token } = data

    if (!token) {
        throw new functions.https.HttpsError('invalid-argument', 'Token is required')
    }

    try {
        const db = admin.firestore()

        // FIX-003: Use transaction to prevent race conditions and token replay
        return await db.runTransaction(async (transaction) => {
            // Find loan application by token
            const loansQuery = db.collection('loanApplications')
                .where('guarantorApprovalToken', '==', token)
                .limit(1)

            const loansSnapshot = await transaction.get(loansQuery)

            if (loansSnapshot.empty) {
                throw new functions.https.HttpsError('not-found', 'Invalid approval link')
            }

            const loanDoc = loansSnapshot.docs[0]
            const loan = loanDoc.data()

            // Check if already responded (atomic check within transaction)
            if (loan.guarantorStatus !== 'pending') {
                throw new functions.https.HttpsError('failed-precondition', 'Request already processed')
            }

            // Check if expired
            if (loan.guarantorTokenExpiry && loan.guarantorTokenExpiry.toDate() < new Date()) {
                throw new functions.https.HttpsError('failed-precondition', 'This approval link has expired')
            }

            // Update AND invalidate token in single atomic transaction
            transaction.update(loanDoc.ref, {
                guarantorStatus: 'approved',
                guarantorApprovedAt: admin.firestore.FieldValue.serverTimestamp(),
                guarantorApprovalToken: admin.firestore.FieldValue.delete(), // ✅ Invalidate token immediately
                canDisburse: true
            })

            // Return data for notification (sent outside transaction)
            return {
                loanId: loanDoc.id,
                userId: loan.userId,
                amount: loan.amount
            }
        }).then(async (result) => {
            // Send notification AFTER transaction succeeds
            const { sendNotification } = require('./sendNotifications')
            await sendNotification({
                userId: result.userId,
                title: '✅ Guarantor Approved',
                message: `Your guarantor has approved your loan application for ₦${result.amount.toLocaleString()}`,
                type: 'loan_update',
                data: {
                    loanId: result.loanId,
                    status: 'guarantor_approved'
                }
            })

            console.log(`✅ Guarantor approved loan ${result.loanId}`)

            return {
                success: true,
                message: 'You have successfully approved the guarantor request'
            }
        })
    } catch (error) {
        console.error('Error approving guarantor request:', error)
        throw new functions.https.HttpsError('internal', error.message)
    }
})

/**
 * Reject guarantor request
 * Public endpoint (no authentication required)
 */
exports.rejectGuarantorRequest = functions.https.onCall(async (data, context) => {
    const { token, reason } = data

    if (!token) {
        throw new functions.https.HttpsError('invalid-argument', 'Token is required')
    }

    try {
        const db = admin.firestore()

        // FIX-003: Use transaction to prevent race conditions and token replay
        return await db.runTransaction(async (transaction) => {
            // Find loan application by token
            const loansQuery = db.collection('loanApplications')
                .where('guarantorApprovalToken', '==', token)
                .limit(1)

            const loansSnapshot = await transaction.get(loansQuery)

            if (loansSnapshot.empty) {
                throw new functions.https.HttpsError('not-found', 'Invalid approval link')
            }

            const loanDoc = loansSnapshot.docs[0]
            const loan = loanDoc.data()

            // Check if already responded (atomic check within transaction)
            if (loan.guarantorStatus !== 'pending') {
                throw new functions.https.HttpsError('failed-precondition', 'Request already processed')
            }

            // Check if expired
            if (loan.guarantorTokenExpiry && loan.guarantorTokenExpiry.toDate() < new Date()) {
                throw new functions.https.HttpsError('failed-precondition', 'This approval link has expired')
            }

            // Update AND invalidate token in single atomic transaction
            transaction.update(loanDoc.ref, {
                guarantorStatus: 'rejected',
                guarantorRejectedAt: admin.firestore.FieldValue.serverTimestamp(),
                guarantorRejectionReason: reason || 'No reason provided',
                guarantorApprovalToken: admin.firestore.FieldValue.delete(), // ✅ Invalidate token immediately
                canDisburse: false,
                // Optionally auto-reject the loan application
                status: 'rejected'
            })

            // Return data for notification (sent outside transaction)
            return {
                loanId: loanDoc.id,
                userId: loan.userId,
                reason: reason || 'No reason provided'
            }
        }).then(async (result) => {
            // Send notification AFTER transaction succeeds
            const { sendNotification } = require('./sendNotifications')
            await sendNotification({
                userId: result.userId,
                title: '❌ Guarantor Declined',
                message: `Your guarantor has declined your loan application. ${result.reason ? `Reason: ${result.reason}` : ''}`,
                type: 'loan_update',
                data: {
                    loanId: result.loanId,
                    status: 'guarantor_rejected',
                    reason: result.reason
                }
            })

            console.log(`❌ Guarantor rejected loan ${result.loanId}`)

            return {
                success: true,
                message: 'You have declined the guarantor request'
            }
        })
    } catch (error) {
        console.error('Error rejecting guarantor request:', error)
        throw new functions.https.HttpsError('internal', error.message)
    }
})

/**
 * Resend guarantor approval email
 * Authenticated endpoint - only loan applicant can resend
 */
exports.resendGuarantorApprovalEmail = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }

    const { loanApplicationId } = data

    if (!loanApplicationId) {
        throw new functions.https.HttpsError('invalid-argument', 'Loan application ID is required')
    }

    try {
        const db = admin.firestore()

        // Get loan application
        const loanRef = db.collection('loanApplications').doc(loanApplicationId)
        const loanDoc = await loanRef.get()

        if (!loanDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Loan application not found')
        }

        const loan = loanDoc.data()

        // Verify user owns this loan
        if (loan.userId !== context.auth.uid) {
            throw new functions.https.HttpsError('permission-denied', 'You do not own this loan application')
        }

        // Check if guarantor already responded
        if (loan.guarantorStatus === 'approved') {
            throw new functions.https.HttpsError('failed-precondition', 'Guarantor has already approved')
        }

        if (loan.guarantorStatus === 'rejected') {
            throw new functions.https.HttpsError('failed-precondition', 'Guarantor has already declined')
        }

        // Generate new token
        const approvalToken = generateApprovalToken()
        const tokenExpiry = new Date()
        tokenExpiry.setDate(tokenExpiry.getDate() + 7)

        // Update loan with new token
        await loanRef.update({
            guarantorApprovalToken: approvalToken,
            guarantorTokenExpiry: admin.firestore.Timestamp.fromDate(tokenExpiry)
        })

        // Resend email
        const approvalLink = `${process.env.VITE_APP_URL || 'http://localhost:3000'}/guarantor-approval/${approvalToken}`

        const { Resend } = require('resend')
        const resendKey = functions.config().resend?.key

        if (!resendKey) {
            throw new functions.https.HttpsError('failed-precondition', 'Email service not configured')
        }

        const resend = new Resend(resendKey)

        await resend.emails.send({
            from: 'AWSLMCSL Cooperative <noreply@awslmcsl.org>',
            to: loan.guarantorEmail,
            subject: 'Reminder: Guarantor Request for Loan Application',
            html: `
                <!DOCTYPE html>
                <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1>Guarantor Request Reminder</h1>
                    </div>
                    <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
                        <p>This is a reminder that <strong>${loan.userName}</strong> has requested you to be a guarantor for their loan application.</p>
                        <p style="text-align: center; margin: 30px 0;">
                            <a href="${approvalLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Review Request</a>
                        </p>
                        <p style="font-size: 14px; color: #6b7280;">This link expires on ${tokenExpiry.toLocaleDateString()}</p>
                    </div>
                </body>
                </html>
            `
        })

        console.log(`✅ Guarantor reminder email sent for loan ${loanApplicationId}`)

        return {
            success: true,
            message: 'Reminder email sent successfully'
        }
    } catch (error) {
        console.error('Error resending guarantor email:', error)
        throw new functions.https.HttpsError('internal', error.message)
    }
})
