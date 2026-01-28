const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const crypto = require('crypto');

admin.initializeApp();
const db = admin.firestore();

// Import loan validation function
const { validateLoanEligibility } = require('./validateLoan');

// Paystack configuration
const PAYSTACK_SECRET_KEY = functions.config().paystack?.secret_key || process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_API_URL = 'https://api.paystack.co';

// Helper: Make Paystack API calls
async function callPaystackAPI(endpoint, method = 'GET', body = null) {
    const url = `${PAYSTACK_API_URL}${endpoint}`;
    const options = {
        method,
        headers: {
            'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
        },
    };

    if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Paystack API error');
    }

    return data;
}

// Helper: Verify Paystack webhook signature
function verifyPaystackSignature(req) {
    const hash = crypto
        .createHmac('sha512', PAYSTACK_SECRET_KEY)
        .update(JSON.stringify(req.body))
        .digest('hex');
    return hash === req.headers['x-paystack-signature'];
}

// Cloud Function: Create Virtual Account for Member
exports.createVirtualAccount = functions.https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const { memberId, firstName, lastName, email, phone } = data;

    if (!memberId || !firstName || !lastName || !email) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }

    try {
        // FIX-004: Verify user owns this memberId
        const userDoc = await db.collection('users').doc(context.auth.uid).get();
        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found');
        }

        const userData = userDoc.data();
        if (userData.memberId !== memberId) {
            throw new functions.https.HttpsError(
                'permission-denied',
                'You can only create virtual accounts for yourself'
            );
        }

        // Check if virtual account already exists
        const existingAccount = await db.collection('virtual_accounts')
            .where('memberId', '==', memberId)
            .limit(1)
            .get();

        if (!existingAccount.empty) {
            return { success: true, message: 'Virtual account already exists', data: existingAccount.docs[0].data() };
        }

        // Step 1: Create/Get Paystack Customer
        let customerCode;
        try {
            const customerResponse = await callPaystackAPI('/customer', 'POST', {
                email,
                first_name: firstName,
                last_name: lastName,
                phone,
            });
            customerCode = customerResponse.data.customer_code;
        } catch (error) {
            // If customer exists, fetch it
            if (error.message.includes('already exists')) {
                const fetchResponse = await callPaystackAPI(`/customer/${email}`);
                customerCode = fetchResponse.data.customer_code;
            } else {
                throw error;
            }
        }

        // Step 2: Create Dedicated Virtual Account
        const accountResponse = await callPaystackAPI('/dedicated_account', 'POST', {
            customer: customerCode,
            preferred_bank: 'wema-bank', // or 'titan-paystack'
        });

        const accountData = accountResponse.data;

        // Step 3: Save to Firestore
        const virtualAccountDoc = {
            memberId,
            userId: context.auth.uid,
            accountNumber: accountData.account_number,
            accountName: accountData.account_name,
            bankName: accountData.bank.name,
            bankCode: accountData.bank.slug,
            paystackCustomerCode: customerCode,
            paystackAccountId: accountData.id,
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastDepositAt: null,
        };

        await db.collection('virtual_accounts').add(virtualAccountDoc);

        return {
            success: true,
            message: 'Virtual account created successfully',
            data: virtualAccountDoc,
        };

    } catch (error) {
        console.error('Error creating virtual account:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// Cloud Function: Paystack Webhook Handler
exports.paystackWebhook = functions.https.onRequest(async (req, res) => {
    return cors(req, res, async () => {
        // Only accept POST requests
        if (req.method !== 'POST') {
            return res.status(405).send('Method Not Allowed');
        }

        // Verify Paystack signature
        if (!verifyPaystackSignature(req)) {
            console.error('Invalid Paystack signature');
            return res.status(401).send('Invalid signature');
        }

        const event = req.body;
        console.log('Webhook received:', event.event);

        try {
            // Handle charge.success event (successful deposit)
            if (event.event === 'charge.success') {
                const { data } = event;

                // Find the virtual account
                const accountSnapshot = await db.collection('virtual_accounts')
                    .where('accountNumber', '==', data.authorization?.account_number)
                    .limit(1)
                    .get();

                if (accountSnapshot.empty) {
                    console.warn('Virtual account not found:', data.authorization?.account_number);
                    return res.status(200).send('Account not found');
                }

                const accountDoc = accountSnapshot.docs[0];
                const accountData = accountDoc.data();
                const memberId = accountData.memberId;

                // Amount in kobo, convert to naira
                const amount = data.amount / 100;

                // Check for duplicate transaction
                const existingTransaction = await db.collection('wallet_transactions')
                    .where('paystackReference', '==', data.reference)
                    .limit(1)
                    .get();

                if (!existingTransaction.empty) {
                    console.log('Duplicate transaction detected:', data.reference);
                    return res.status(200).send('Already processed');
                }

                // Get or create wallet
                const walletSnapshot = await db.collection('wallets')
                    .where('memberId', '==', memberId)
                    .limit(1)
                    .get();

                let walletRef;
                let currentBalance = 0;

                if (walletSnapshot.empty) {
                    // Create new wallet
                    walletRef = await db.collection('wallets').add({
                        memberId,
                        balance: 0,
                        currency: 'NGN',
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                } else {
                    walletRef = walletSnapshot.docs[0].ref;
                    currentBalance = walletSnapshot.docs[0].data().balance || 0;
                }

                // Update wallet balance
                const newBalance = currentBalance + amount;
                await walletRef.update({
                    balance: newBalance,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                // Record transaction
                await db.collection('wallet_transactions').add({
                    walletId: walletRef.id,
                    memberId,
                    type: 'credit',
                    amount,
                    source: 'virtual_account',
                    virtualAccountNumber: accountData.accountNumber,
                    paystackReference: data.reference,
                    paystackEvent: event.event,
                    paymentMethod: 'bank_transfer',
                    description: `Deposit via ${accountData.bankName}`,
                    status: 'success',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                // Update last deposit time on virtual account
                await accountDoc.ref.update({
                    lastDepositAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                // Create notification
                await db.collection('notifications').add({
                    userId: accountData.userId,
                    type: 'payment_received',
                    title: 'Deposit Successful',
                    message: `Your wallet has been credited with ₦${amount.toLocaleString()}`,
                    read: false,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                console.log(`Successfully processed deposit: ₦${amount} for member ${memberId}`);
            }

            // Send success response
            res.status(200).send('Webhook processed');

        } catch (error) {
            console.error('Webhook error:', error);
            // Still return 200 to prevent Paystack retries
            res.status(200).send('Error logged');
        }
    });
});

// Cloud Function: Get Virtual Account by Member ID
exports.getVirtualAccount = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const { memberId } = data;

    if (!memberId) {
        throw new functions.https.HttpsError('invalid-argument', 'Member ID required');
    }

    try {
        // FIX-002: Check user ownership
        const userDoc = await db.collection('users').doc(context.auth.uid).get();
        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found');
        }

        const userData = userDoc.data();
        const userRole = context.auth.token.role || 'member';

        // Only allow if user owns the memberId OR is admin
        if (userData.memberId !== memberId && !['admin', 'super_admin'].includes(userRole)) {
            throw new functions.https.HttpsError(
                'permission-denied',
                'You can only view your own virtual account'
            );
        }

        const accountSnapshot = await db.collection('virtual_accounts')
            .where('memberId', '==', memberId)
            .limit(1)
            .get();

        if (accountSnapshot.empty) {
            return { success: false, message: 'No virtual account found' };
        }

        return {
            success: true,
            data: accountSnapshot.docs[0].data(),
        };
    } catch (error) {
        console.error('Error fetching virtual account:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// Export loan validation function
exports.validateLoanEligibility = validateLoanEligibility;

// Import and export monthly deductions function
const { processMonthlyDeductions } = require('./monthlyDeductions');
exports.processMonthlyDeductions = processMonthlyDeductions;

// Import and export notification functions
const notifications = require('./sendNotifications');
exports.onLoanApproved = notifications.onLoanApproved;
exports.onGuarantorRequestCreated = notifications.onGuarantorRequestCreated;
exports.onCommodityOrderStatusChange = notifications.onCommodityOrderStatusChange;
exports.onSavingsWithdrawalApproved = notifications.onSavingsWithdrawalApproved;
exports.onProfileChangeRequestCreated = notifications.onProfileChangeRequestCreated;
exports.onProfileChangeRequestProcessed = notifications.onProfileChangeRequestProcessed;
exports.onComplaintCreated = notifications.onComplaintCreated;
exports.onComplaintResponded = notifications.onComplaintResponded;
exports.sendPaymentReminders = notifications.sendPaymentReminders;

// Import and export escalation function
const escalation = require('./escalateStaleComplaints');
exports.escalateStaleComplaints = escalation.escalateStaleComplaints;

// Import and export export service functions
// Export service (temporarily disabled - requires Node 20 compatible PDF library)
// const exportService = require('./exportService');
// exports.exportLoansPDF = exportService.exportLoansPDF;
// exports.exportLoansExcel = exportService.exportLoansExcel;
// exports.exportMembersExcel = exportService.exportMembersExcel;
// exports.exportSavingsPDF = exportService.exportSavingsPDF;


// Import and export 2FA service functions
const twoFactorService = require('./twoFactorService');
exports.setup2FA = twoFactorService.setup2FA;
exports.enable2FA = twoFactorService.enable2FA;
exports.verify2FA = twoFactorService.verify2FA;
exports.disable2FA = twoFactorService.disable2FA;
exports.regenerateBackupCodes = twoFactorService.regenerateBackupCodes;

// Import and export rate limiting functions
const rateLimitService = require('./rateLimitService');
exports.clearRateLimit = rateLimitService.clearRateLimit;
exports.getRateLimitStatus = rateLimitService.getRateLimitStatus;
exports.getAllRateLimits = rateLimitService.getAllRateLimits;

// Import and export Member ID service functions
const memberIdService = require('./memberIdService');
exports.approveMemberRegistration = memberIdService.approveMemberRegistration;
exports.rejectMemberRegistration = memberIdService.rejectMemberRegistration;

// Import and export Email Alert service
const emailAlertService = require('./emailAlertService');
exports.testEmailAlert = emailAlertService.testEmailAlert;

// Import and export Security Monitor functions
const securityMonitor = require('./securityMonitor');
exports.monitorFailedLogins = securityMonitor.monitorFailedLogins;
exports.monitorLargeWithdrawals = securityMonitor.monitorLargeWithdrawals;
exports.monitorRoleChanges = securityMonitor.monitorRoleChanges;
exports.monitorSavingsReduction = securityMonitor.monitorSavingsReduction;
exports.monitorLargeCommodityOrders = securityMonitor.monitorLargeCommodityOrders;
exports.logFailedLogin = securityMonitor.logFailedLogin;

// Import and export IP Whitelist service
const ipWhitelistService = require('./ipWhitelistService');
exports.checkIPWhitelist = ipWhitelistService.checkIPWhitelist;
exports.addIPToWhitelist = ipWhitelistService.addIPToWhitelist;
exports.removeIPFromWhitelist = ipWhitelistService.removeIPFromWhitelist;
exports.toggleIPWhitelistEnforcement = ipWhitelistService.toggleIPWhitelistEnforcement;
exports.getMyIP = ipWhitelistService.getMyIP;

// Import and export Device Tracker service
const deviceTracker = require('./deviceTracker');
exports.registerDevice = deviceTracker.registerDevice;
exports.getUserDevices = deviceTracker.getUserDevices;
exports.trustDevice = deviceTracker.trustDevice;
exports.removeDevice = deviceTracker.removeDevice;
exports.renameDevice = deviceTracker.renameDevice;

// Import and export Guarantor Approval functions
const guarantorApproval = require('./guarantorApproval');
exports.sendGuarantorApprovalEmail = guarantorApproval.sendGuarantorApprovalEmail;
exports.getGuarantorApprovalByToken = guarantorApproval.getGuarantorApprovalByToken;
exports.approveGuarantorRequest = guarantorApproval.approveGuarantorRequest;
exports.rejectGuarantorRequest = guarantorApproval.rejectGuarantorRequest;
exports.resendGuarantorApprovalEmail = guarantorApproval.resendGuarantorApprovalEmail;

// Import and export BVN Verification functions
const verifyBVNModule = require('./verifyBVN');
exports.verifyBVN = verifyBVNModule.verifyBVN;
exports.resolveBVN = verifyBVNModule.resolveBVN;

// Import and export NIN Slip Upload functions
const uploadNINSlipModule = require('./uploadNINSlip');
exports.uploadNINSlip = uploadNINSlipModule.uploadNINSlip;
exports.deleteNINSlip = uploadNINSlipModule.deleteNINSlip;

// Cloud Function: Send Verification Email
exports.sendVerificationEmail = functions.https.onCall(async (data, context) => {
    const { email, userName, verificationLink } = data;

    if (!email || !userName || !verificationLink) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }

    try {
        const RESEND_API_KEY = functions.config().resend?.key || process.env.RESEND_API_KEY;

        if (!RESEND_API_KEY || RESEND_API_KEY === 'undefined') {
            console.warn('Email service not configured. Skipping verification email.');
            return { success: false, message: 'Email service not configured' };
        }

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from: 'AWSLMCSL Cooperative <noreply@awslmcsl.org>',
                to: email,
                subject: 'Verify Your Email Address',
                html: `
                    <!DOCTYPE html>
                    <html>
                    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2>Welcome to AWSLMCSL!</h2>
                        <p>Dear ${userName},</p>
                        <p>Please verify your email address by clicking the button below:</p>
                        <p style="text-align: center;">
                            <a href="${verificationLink}" style="display: inline-block; background: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold;">Verify Email Address</a>
                        </p>
                        <p style="color: #6b7280; font-size: 14px;">This link will expire in 24 hours.</p>
                    </body>
                    </html>
                `
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Resend API error:', errorText);
            throw new Error(`Failed to send email: ${response.status}`);
        }

        return { success: true };
    } catch (error) {
        console.error('Error sending verification email:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// Import and export Support Ticket function
const supportTicket = require('./sendSupportTicket');
exports.sendSupportTicketEmail = supportTicket.sendSupportTicketEmail;
