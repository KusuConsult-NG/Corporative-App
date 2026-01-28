const functions = require('firebase-functions');
const admin = require('firebase-admin');

const db = admin.firestore();

/**
 * Automated Monthly Deductions
 * Runs on the 1st of each month at 2 AM
 * Processes loan installments and commodity payments
 */
exports.processMonthlyDeductions = functions.pubsub
    .schedule('0 2 1 * *') // Cron: 2 AM on 1st of every month
    .timeZone('Africa/Lagos') // WAT timezone
    .onRun(async (context) => {
        console.log('🔄 Starting monthly deductions process...');

        const results = {
            loansProcessed: 0,
            loansFailed: 0,
            commoditiesProcessed: 0,
            commoditiesFailed: 0,
            totalDeducted: 0,
            errors: []
        };

        try {
            // Process Loan Deductions
            await processLoanDeductions(results);

            // Process Commodity Order Deductions
            await processCommodityDeductions(results);

            // Send summary notification to admins
            await sendAdminSummary(results);

            console.log('✅ Monthly deductions completed:', results);
            return results;

        } catch (error) {
            console.error('❌ Fatal error in monthly deductions:', error);
            await sendAdminAlert(error, results);
            throw error;
        }
    });

/**
 * Process all active loan deductions
 */
async function processLoanDeductions(results) {
    console.log('💰 Processing loan deductions...');

    // Get all active loans
    const loansSnapshot = await db.collection('loans')
        .where('status', '==', 'approved')
        .get();

    console.log(`Found ${loansSnapshot.size} active loans`);

    for (const loanDoc of loansSnapshot.docs) {
        const loan = { id: loanDoc.id, ...loanDoc.data() };

        try {
            // Skip if loan is fully paid
            if (loan.totalRepaid >= loan.totalAmount) {
                console.log(`Skipping loan ${loan.id} - already fully paid`);
                await db.collection('loans').doc(loan.id).update({
                    status: 'fully_paid'
                });
                continue;
            }

            // Calculate monthly payment
            const monthlyPayment = loan.monthlyPayment || (loan.totalAmount / loan.duration);
            const remainingAmount = loan.totalAmount - (loan.totalRepaid || 0);
            const deductionAmount = Math.min(monthlyPayment, remainingAmount);

            console.log(`Processing loan ${loan.id}: ₦${deductionAmount} deduction`);

            // Get member's savings balance
            const savingsSnapshot = await db.collection('savings')
                .where('memberId', '==', loan.memberId)
                .limit(1)
                .get();

            if (savingsSnapshot.empty) {
                throw new Error(`No savings account found for member ${loan.memberId}`);
            }

            const savingsDoc = savingsSnapshot.docs[0];
            const savings = savingsDoc.data();
            const savingsBalance = savings.balance || 0;

            // Check if member has sufficient balance
            if (savingsBalance < deductionAmount) {
                console.warn(`⚠️ Insufficient balance for loan ${loan.id}. Required: ₦${deductionAmount}, Available: ₦${savingsBalance}`);

                // Log failed deduction
                await logDeduction({
                    memberId: loan.memberId,
                    loanId: loan.id,
                    type: 'loan',
                    amount: deductionAmount,
                    status: 'failed',
                    reason: 'insufficient_balance',
                    savingsBalanceBefore: savingsBalance,
                    savingsBalanceAfter: savingsBalance
                });

                // Send notification to member
                await sendInsufficientBalanceNotification(loan, deductionAmount, savingsBalance);

                results.loansFailed++;
                results.errors.push({
                    loanId: loan.id,
                    memberId: loan.memberId,
                    reason: 'insufficient_balance'
                });
                continue;
            }

            // Perform deduction using a batch write for atomicity
            const batch = db.batch();

            // Update savings balance
            batch.update(savingsDoc.ref, {
                balance: admin.firestore.FieldValue.increment(-deductionAmount),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Create savings transaction
            const savingsTransactionRef = db.collection('savings_transactions').doc();
            batch.set(savingsTransactionRef, {
                memberId: loan.memberId,
                type: 'debit',
                amount: -deductionAmount,
                source: 'loan_deduction',
                loanId: loan.id,
                description: `Monthly loan payment - ${loan.loanType}`,
                date: admin.firestore.FieldValue.serverTimestamp()
            });

            // Update loan repayment
            const newTotalRepaid = (loan.totalRepaid || 0) + deductionAmount;
            const isFullyPaid = newTotalRepaid >= loan.totalAmount;

            batch.update(loanDoc.ref, {
                totalRepaid: newTotalRepaid,
                status: isFullyPaid ? 'fully_paid' : 'approved',
                lastDeductionDate: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Commit the batch
            await batch.commit();

            // Log successful deduction
            await logDeduction({
                memberId: loan.memberId,
                loanId: loan.id,
                type: 'loan',
                amount: deductionAmount,
                status: 'success',
                savingsBalanceBefore: savingsBalance,
                savingsBalanceAfter: savingsBalance - deductionAmount,
                fullyPaid: isFullyPaid
            });

            // Send success notification to member
            await sendDeductionSuccessNotification(loan, deductionAmount, isFullyPaid);

            results.loansProcessed++;
            results.totalDeducted += deductionAmount;

            console.log(`✅ Loan ${loan.id} - Deducted ₦${deductionAmount}${isFullyPaid ? ' (FULLY PAID)' : ''}`);

        } catch (error) {
            console.error(`❌ Error processing loan ${loan.id}:`, error);
            results.loansFailed++;
            results.errors.push({
                loanId: loan.id,
                memberId: loan.memberId,
                error: error.message
            });

            // Log failed deduction
            await logDeduction({
                memberId: loan.memberId,
                loanId: loan.id,
                type: 'loan',
                amount: 0,
                status: 'failed',
                reason: 'system_error',
                error: error.message
            });
        }
    }
}

/**
 * Process all commodity order deductions
 */
async function processCommodityDeductions(results) {
    console.log('🛒 Processing commodity deductions...');

    // Get all approved commodity orders with remaining deductions
    const ordersSnapshot = await db.collection('commodityOrders')
        .where('status', '==', 'approved')
        .where('deductionsRemaining', '>', 0)
        .get();

    console.log(`Found ${ordersSnapshot.size} commodity orders with pending deductions`);

    for (const orderDoc of ordersSnapshot.docs) {
        const order = { id: orderDoc.id, ...orderDoc.data() };

        try {
            const monthlyPayment = order.monthlyPayment;

            console.log(`Processing commodity order ${order.id}: ₦${monthlyPayment} deduction`);

            // Get member's savings balance
            const savingsSnapshot = await db.collection('savings')
                .where('memberId', '==', order.memberId)
                .limit(1)
                .get();

            if (savingsSnapshot.empty) {
                throw new Error(`No savings account found for member ${order.memberId}`);
            }

            const savingsDoc = savingsSnapshot.docs[0];
            const savings = savingsDoc.data();
            const savingsBalance = savings.balance || 0;

            // Check if member has sufficient balance
            if (savingsBalance < monthlyPayment) {
                console.warn(`⚠️ Insufficient balance for order ${order.id}. Required: ₦${monthlyPayment}, Available: ₦${savingsBalance}`);

                // Log failed deduction
                await logDeduction({
                    memberId: order.memberId,
                    orderId: order.id,
                    type: 'commodity',
                    amount: monthlyPayment,
                    status: 'failed',
                    reason: 'insufficient_balance',
                    savingsBalanceBefore: savingsBalance,
                    savingsBalanceAfter: savingsBalance
                });

                // Send notification to member
                await sendInsufficientBalanceNotification(order, monthlyPayment, savingsBalance, 'commodity');

                results.commoditiesFailed++;
                results.errors.push({
                    orderId: order.id,
                    memberId: order.memberId,
                    reason: 'insufficient_balance'
                });
                continue;
            }

            // Perform deduction using a batch write
            const batch = db.batch();

            // Update savings balance
            batch.update(savingsDoc.ref, {
                balance: admin.firestore.FieldValue.increment(-monthlyPayment),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Create savings transaction
            const savingsTransactionRef = db.collection('savings_transactions').doc();
            batch.set(savingsTransactionRef, {
                memberId: order.memberId,
                type: 'debit',
                amount: -monthlyPayment,
                source: 'commodity_deduction',
                orderId: order.id,
                description: `Monthly commodity payment - ${order.productName}`,
                date: admin.firestore.FieldValue.serverTimestamp()
            });

            // Update order deduction tracking
            const newDeductionsPaid = (order.deductionsPaid || 0) + 1;
            const newDeductionsRemaining = order.deductionsRemaining - 1;
            const isFullyPaid = newDeductionsRemaining <= 0;

            batch.update(orderDoc.ref, {
                deductionsPaid: newDeductionsPaid,
                deductionsRemaining: newDeductionsRemaining,
                status: isFullyPaid ? 'delivered' : 'approved',
                lastDeductionDate: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Commit the batch
            await batch.commit();

            // Log successful deduction
            await logDeduction({
                memberId: order.memberId,
                orderId: order.id,
                type: 'commodity',
                amount: monthlyPayment,
                status: 'success',
                savingsBalanceBefore: savingsBalance,
                savingsBalanceAfter: savingsBalance - monthlyPayment,
                fullyPaid: isFullyPaid
            });

            // Send success notification
            await sendDeductionSuccessNotification(order, monthlyPayment, isFullyPaid, 'commodity');

            results.commoditiesProcessed++;
            results.totalDeducted += monthlyPayment;

            console.log(`✅ Order ${order.id} - Deducted ₦${monthlyPayment}${isFullyPaid ? ' (FULLY PAID)' : ''}`);

        } catch (error) {
            console.error(`❌ Error processing commodity order ${order.id}:`, error);
            results.commoditiesFailed++;
            results.errors.push({
                orderId: order.id,
                memberId: order.memberId,
                error: error.message
            });

            // Log failed deduction
            await logDeduction({
                memberId: order.memberId,
                orderId: order.id,
                type: 'commodity',
                amount: 0,
                status: 'failed',
                reason: 'system_error',
                error: error.message
            });
        }
    }
}

/**
 * Log deduction attempt
 */
async function logDeduction(deductionData) {
    try {
        await db.collection('deduction_logs').add({
            ...deductionData,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('Error logging deduction:', error);
    }
}

/**
 * Send success notification to member
 */
async function sendDeductionSuccessNotification(item, amount, isFullyPaid, itemType = 'loan') {
    try {
        const memberId = item.memberId;
        const userId = item.userId;

        const message = isFullyPaid
            ? `Congratulations! You've completed all payments for your ${itemType === 'loan' ? 'loan' : 'commodity order'}. ₦${amount.toLocaleString()} has been deducted from your savings.`
            : `₦${amount.toLocaleString()} has been deducted from your savings for your monthly ${itemType} payment.`;

        await db.collection('notifications').add({
            userId,
            memberId,
            type: isFullyPaid ? 'payment_completed' : 'deduction_success',
            title: isFullyPaid ? '🎉 Payment Completed' : 'Monthly Deduction Processed',
            message,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('Error sending success notification:', error);
    }
}

/**
 * Send insufficient balance notification
 */
async function sendInsufficientBalanceNotification(item, requiredAmount, availableBalance, itemType = 'loan') {
    try {
        const memberId = item.memberId;
        const userId = item.userId;

        await db.collection('notifications').add({
            userId,
            memberId,
            type: 'deduction_failed',
            title: '⚠️ Insufficient Savings Balance',
            message: `Your monthly ${itemType} payment of ₦${requiredAmount.toLocaleString()} could not be processed. Your current balance is ₦${availableBalance.toLocaleString()}. Please top up your savings to avoid penalties.`,
            read: false,
            priority: 'high',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('Error sending insufficient balance notification:', error);
    }
}

/**
 * Send summary to admins
 */
async function sendAdminSummary(results) {
    try {
        // Get all admin users
        const adminsSnapshot = await db.collection('users')
            .where('role', 'in', ['admin', 'superAdmin'])
            .get();

        const summaryMessage = `
Monthly Deductions Summary:
- Loans Processed: ${results.loansProcessed}
- Loans Failed: ${results.loansFailed}
- Commodities Processed: ${results.commoditiesProcessed}
- Commodities Failed: ${results.commoditiesFailed}
- Total Deducted: ₦${results.totalDeducted.toLocaleString()}
- Errors: ${results.errors.length}
        `.trim();

        for (const adminDoc of adminsSnapshot.docs) {
            await db.collection('notifications').add({
                userId: adminDoc.id,
                type: 'admin_report',
                title: '📊 Monthly Deductions Report',
                message: summaryMessage,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        console.log('✅ Admin summary sent');
    } catch (error) {
        console.error('Error sending admin summary:', error);
    }
}

/**
 * Send alert to admins on fatal error
 */
async function sendAdminAlert(error, results) {
    try {
        const adminsSnapshot = await db.collection('users')
            .where('role', 'in', ['admin', 'superAdmin'])
            .get();

        for (const adminDoc of adminsSnapshot.docs) {
            await db.collection('notifications').add({
                userId: adminDoc.id,
                type: 'system_alert',
                title: '🚨 Monthly Deductions Failed',
                message: `The automated monthly deductions process encountered a fatal error: ${error.message}. Please review the logs immediately.`,
                read: false,
                priority: 'urgent',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
    } catch (notifError) {
        console.error('Error sending admin alert:', notifError);
    }
}
