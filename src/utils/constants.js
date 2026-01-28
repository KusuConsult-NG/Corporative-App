export const BANK_DETAILS = {
    bankName: 'GTBank',
    accountName: 'AWSLMCSL Coop',
    accountNumber: '0123456789'
}

export const SUPPORT_CONTACT = {
    email: 'support@anchoragecs.com',
    phone: '08065810868',
    phone2: '08136905553',
    address: 'University of Jos Library, PMB 2084'
}

export const TRANSACTION_LIMITS = {
    minDeposit: 100,
    maxDeposit: 1000000,
    minWithdrawal: 1000,
    maxWithdrawal: 500000
}

// Loan limits and constraints
export const LOAN_LIMITS = {
    swift_relief: {
        max: 30000,
        duration: 3, // months
        interestRate: 6 // 6% for 3 months
    },
    advancement: {
        maxMultiplier: 2, // 2x user's savings
        duration: 6, // months
        interestRate: 12 // 12% for 6 months
    },
    progress_plus: {
        maxMultiplier: 3, // 3x user's savings
        minDuration: 6,
        maxDuration: 12,
        interestRate: 18 // 18% per annum
    }
}

// Registration and verification settings
export const REGISTRATION = {
    feeAmount: 2000, // ₦2,000
    verificationExpiryHours: 24,
    maxResendAttempts: 5,
    resendCooldownMinutes: 5
}

// General security settings
export const SECURITY = {
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 30,
    sessionTimeoutMinutes: 60,
    passwordMinLength: 8,
    maxFileUploadSizeMB: 5
}
