const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const crypto = require('crypto');

admin.initializeApp();
const db = admin.firestore();

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
