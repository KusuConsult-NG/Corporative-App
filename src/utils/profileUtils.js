/**
 * Calculate profile completion percentage
 * @param {Object} user - The user object
 * @returns {number} - Percentage (0-100)
 */
export const calculateProfileCompletion = (user) => {
    if (!user) return 0

    const requiredFields = [
        'name',
        'email',
        'staffId',
        'department',
        'phone',
        'passport',
        'bankDetails' // At least one approved bank account
    ]

    let completedFields = 0
    const total = requiredFields.length

    if (user.name) completedFields++
    if (user.email) completedFields++
    if (user.staffId) completedFields++
    if (user.department) completedFields++
    if (user.phone) completedFields++
    if (user.passport) completedFields++
    if (user.bankDetails && user.bankDetails.length > 0) {
        // Check if at least one bank account is approved
        const hasApprovedBank = user.bankDetails.some(bank => bank.status === 'approved')
        if (hasApprovedBank) completedFields++
    }

    return Math.round((completedFields / total) * 100)
}

/**
 * Check if profile is complete
 * @param {Object} user - The user object
 * @returns {boolean}
 */
export const isProfileComplete = (user) => {
    return calculateProfileCompletion(user) === 100
}

/**
 * Get list of missing profile fields
 * @param {Object} user - The user object
 * @returns {Array<string>} - Array of missing field labels
 */
export const getMissingProfileFields = (user) => {
    if (!user) return []

    const missing = []

    if (!user.phone) missing.push('Phone Number')
    if (!user.passport) missing.push('Passport Photo')

    // Check for approved bank account
    const hasApprovedBank = user.bankDetails && user.bankDetails.some(bank => bank.status === 'approved')
    if (!hasApprovedBank) missing.push('Approved Bank Account')

    return missing
}

/**
 * Check if user can apply for a loan
 * @param {Object} user - The user object
 * @returns {Object} - { canApply: boolean, reason: string }
 */
export const canApplyForLoan = (user) => {
    if (!user) {
        return { canApply: false, reason: 'User not found' }
    }

    // Check email verification
    if (!user.emailVerified) {
        return { canApply: false, reason: 'Please verify your email address first' }
    }

    // Check registration fee payment
    if (!user.registrationFeePaid) {
        return { canApply: false, reason: 'Please complete your registration fee payment' }
    }

    // Check passport photo
    if (!user.passport) {
        return { canApply: false, reason: 'Please upload your passport photo' }
    }

    // Check phone number
    if (!user.phone) {
        return { canApply: false, reason: 'Please add your phone number to your profile' }
    }

    // Check approved bank account
    const hasApprovedBank = user.bankDetails && user.bankDetails.some(bank => bank.status === 'approved')
    if (!hasApprovedBank) {
        return { canApply: false, reason: 'Please add and get approval for at least one bank account' }
    }

    return { canApply: true, reason: '' }
}

/**
 * Format bank account number for display (mask middle digits)
 * @param {string} accountNumber - The account number
 * @returns {string} - Formatted account number
 */
export const formatBankAccount = (accountNumber) => {
    if (!accountNumber || accountNumber.length < 8) return accountNumber

    const first = accountNumber.slice(0, 3)
    const last = accountNumber.slice(-3)
    const middle = '*'.repeat(accountNumber.length - 6)

    return `${first}${middle}${last}`
}
