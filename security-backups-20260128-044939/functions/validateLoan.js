/**
 * Cloud Function: Validate Loan Eligibility
 * 
 * This function performs server-side validation of loan applications
 * to prevent client-side bypass of eligibility checks.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

const db = admin.firestore();

// Loan configuration
const LOAN_LIMITS = {
    swift_relief: {
        max: 30000,
        duration: 3,
        interestRate: 6
    },
    advancement: {
        maxMultiplier: 2,
        duration: 6,
        interestRate: 12
    },
    progress_plus: {
        maxMultiplier: 3,
        minDuration: 6,
        maxDuration: 12,
        interestRate: 18
    }
};

exports.validateLoanEligibility = functions.https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const { loanType, amount, duration } = data;

    if (!loanType || !amount || !duration) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Missing required fields: loanType, amount, duration'
        );
    }

    try {
        // Get user document
        const userQuery = await db.collection('users')
            .where('userId', '==', context.auth.uid)
            .limit(1)
            .get();

        if (userQuery.empty) {
            throw new functions.https.HttpsError('not-found', 'User not found');
        }

        const userDoc = userQuery.docs[0];
        const userData = userDoc.data();
        const memberId = userData.memberId;

        // Check email verification
        if (!userData.emailVerified) {
            return {
                eligible: false,
                reason: 'Email must be verified before applying for loans'
            };
        }

        // Check registration fee payment
        if (!userData.registrationFeePaid) {
            return {
                eligible: false,
                reason: 'Registration fee must be paid before applying for loans'
            };
        }

        // Check for active loans
        const activeLoansQuery = await db.collection('loans')
            .where('userId', '==', context.auth.uid)
            .where('status', 'in', ['pending', 'approved', 'active'])
            .limit(1)
            .get();

        if (!activeLoansQuery.empty) {
            return {
                eligible: false,
                reason: 'You already have an active or pending loan application'
            };
        }

        // Validate loan type
        if (!LOAN_LIMITS[loanType]) {
            return {
                eligible: false,
                reason: 'Invalid loan type'
            };
        }

        const loanConfig = LOAN_LIMITS[loanType];

        // Validate duration
        if (loanType === 'swift_relief' || loanType === 'advancement') {
            if (duration !== loanConfig.duration) {
                return {
                    eligible: false,
                    reason: `${loanType} loans must be exactly ${loanConfig.duration} months`
                };
            }
        } else if (loanType === 'progress_plus') {
            if (duration < loanConfig.minDuration || duration > loanConfig.maxDuration) {
                return {
                    eligible: false,
                    reason: `Progress Plus loans must be between ${loanConfig.minDuration} and ${loanConfig.maxDuration} months`
                };
            }
        }

        // Type-specific validation
        let maxEligibleAmount = 0;

        switch (loanType) {
            case 'swift_relief':
                maxEligibleAmount = loanConfig.max;
                break;

            case 'advancement':
            case 'progress_plus': {
                // Get user's savings balance
                const walletQuery = await db.collection('wallets')
                    .where('memberId', '==', memberId)
                    .limit(1)
                    .get();

                if (walletQuery.empty) {
                    return {
                        eligible: false,
                        reason: 'No savings found. You must have savings to qualify for this loan type.'
                    };
                }

                const walletData = walletQuery.docs[0].data();
                const balance = walletData.balance || 0;

                if (balance <= 0) {
                    return {
                        eligible: false,
                        reason: 'Insufficient savings. You must have a positive savings balance.'
                    };
                }

                maxEligibleAmount = balance * loanConfig.maxMultiplier;

                // Check membership duration for advancement/progress_plus
                const requiredMonths = loanType === 'advancement' ? 3 : 6;
                const joinDate = userData.joinedAt?.toDate();

                if (joinDate) {
                    const monthsSinceJoining = Math.floor(
                        (new Date() - joinDate) / (1000 * 60 * 60 * 24 * 30)
                    );

                    if (monthsSinceJoining < requiredMonths) {
                        return {
                            eligible: false,
                            reason: `You must be a member for at least ${requiredMonths} months. Current: ${monthsSinceJoining} month(s).`
                        };
                    }
                }

                break;
            }

            default:
                return {
                    eligible: false,
                    reason: 'Invalid loan type'
                };
        }

        // Validate amount
        if (amount <= 0) {
            return {
                eligible: false,
                reason: 'Loan amount must be greater than zero'
            };
        }

        if (amount > maxEligibleAmount) {
            return {
                eligible: false,
                reason: `Maximum eligible amount is ₦${maxEligibleAmount.toLocaleString()}. Requested: ₦${amount.toLocaleString()}`
            };
        }

        // Calculate repayment details
        let interestAmount = 0;
        if (loanType === 'swift_relief') {
            interestAmount = amount * 0.06;
        } else if (loanType === 'advancement') {
            interestAmount = amount * 0.12;
        } else if (loanType === 'progress_plus') {
            const years = duration / 12;
            interestAmount = amount * 0.18 * years;
        }

        const totalRepayment = amount + interestAmount;
        const monthlyPayment = totalRepayment / duration;

        return {
            eligible: true,
            maxEligibleAmount,
            repaymentDetails: {
                principal: amount,
                interestRate: loanConfig.interestRate,
                interestAmount,
                totalRepayment,
                monthlyPayment,
                duration
            }
        };

    } catch (error) {
        console.error('Error validating loan eligibility:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
