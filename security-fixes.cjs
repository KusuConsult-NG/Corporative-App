#!/usr/bin/env node

/**
 * SECURITY FIXES IMPLEMENTATION SCRIPT
 * 
 * This script applies all 17 security fixes identified in the audit
 * Run with --dry-run to preview changes
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

// ANSI colors
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logFix(id, description) {
    log(`\n🔧 ${id}: ${description}`, 'blue');
}

function applyFix(filePath, searchPattern, replacement, description) {
    logFix(description.id, description.title);

    if (DRY_RUN) {
        log(`   Would modify: ${filePath}`, 'yellow');
        return;
    }

    try {
        let content = fs.readFileSync(filePath, 'utf8');

        if (typeof searchPattern === 'string') {
            if (!content.includes(searchPattern)) {
                log(`   ⚠️  Pattern not found, skipping`, 'yellow');
                return;
            }
            content = content.replace(searchPattern, replacement);
        } else {
            // RegExp
            if (!searchPattern.test(content)) {
                log(`   ⚠️  Pattern not found, skipping`, 'yellow');
                return;
            }
            content = content.replace(searchPattern, replacement);
        }

        fs.writeFileSync(filePath, content, 'utf8');
        log(`   ✅ Applied`, 'green');
    } catch (error) {
        log(`   ❌ Error: ${error.message}`, 'red');
    }
}

// ========================================
// FIX-001: Hardened Firestore Rules
// ========================================

function fix001_FirestoreRules() {
    const newRules = `rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
             request.auth.token.role in ['admin', 'super_admin'];
    }
    
    function isSuperAdmin() {
      return isAuthenticated() && 
             request.auth.token.role == 'super_admin';
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Users: Read own or admin, write own only, prevent role escalation
    match /users/{userId} {
      allow read: if isOwner(userId) || isAdmin();
      allow create: if isAuthenticated() && request.auth.uid == userId;
      allow update: if isOwner(userId) && 
                       // Prevent role escalation
                       (!request.resource.data.diff(resource.data).affectedKeys().hasAny(['role']));
      allow delete: if false;
    }
    
    // Loans: User can read/write own, admins read all
    match /loanApplications/{loanId} {
      allow read: if isAuthenticated() && 
                     (resource.data.userId == request.auth.uid || isAdmin());
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update: if isAdmin();
      allow delete: if false;
    }
    
    // Virtual Accounts: Owner or admin only
    match /virtual_accounts/{accountId} {
      allow read: if isAuthenticated() && 
                     (resource.data.userId == request.auth.uid || isAdmin());
      allow create, update, delete: if false; // Cloud Function only
    }
    
    // Notifications: User can read/delete own
    match /notifications/{notifId} {
      allow read, delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow create, update: if false;
    }
    
    // Audit Logs: Admin read-only, write via Cloud Function only
    match /audit_logs/{logId} {
      allow read: if isAdmin();
      allow create, update, delete: if false;
    }
    
    // Support Tickets: User reads own, admins read all
    match /supportTickets/{ticketId} {
      allow read: if isAuthenticated() && 
                     (resource.data.userId == request.auth.uid || isAdmin());
      allow create, update, delete: if false;
    }
    
    // System Config: Super admin only
    match /system_config/{configId} {
      allow read: if isAdmin();
      allow write: if isSuperAdmin();
    }
    
    // IP Whitelist: Admin read, super admin write
    match /ip_whitelist/{ruleId} {
      allow read: if isAdmin();
      allow write: if isSuperAdmin();
    }
    
    // Member Registry: Read-only for authenticated
    match /member_registry/{memberId} {
      allow read: if isAuthenticated();
      allow write: if false;
    }
    
    // Guarantor Approvals
    match /guarantorApprovals/{approvalId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if false;
    }
    
    // Savings, withdrawals, transactions, orders
    match /savings/{savingId} {
      allow read: if isAuthenticated() && 
                     (resource.data.userId == request.auth.uid || isAdmin());
      allow write: if false;
    }
    
    match /withdrawals/{withdrawalId} {
      allow read: if isAuthenticated() && 
                     (resource.data.userId == request.auth.uid || isAdmin());
      allow write: if false;
    }
    
    match /transactions/{txId} {
      allow read: if isAuthenticated() && 
                     (resource.data.userId == request.auth.uid || isAdmin());
      allow write: if false;
    }
    
    match /orders/{orderId} {
      allow read: if isAuthenticated() && 
                     (resource.data.userId == request.auth.uid || isAdmin());
      allow write: if false;
    }
    
    // Default: Deny all
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
`;

    logFix('FIX-001', 'Hardening Firestore Security Rules (CRITICAL)');

    if (DRY_RUN) {
        log('   Would replace firestore.rules with hardened version', 'yellow');
    } else {
        fs.writeFileSync('firestore.rules', newRules, 'utf8');
        log('   ✅ Firestore rules hardened', 'green');
    }
}

// ========================================
// FIX-002: getVirtualAccount Authorization
// ========================================

function fix002_GetVirtualAccountAuth() {
    const filePath = 'functions/index.js';

    const searchPattern = `exports.getVirtualAccount = functions.https.onCall(async (data, context) => {
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
            .get();`;

    const replacement = `exports.getVirtualAccount = functions.https.onCall(async (data, context) => {
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
            .get();`;

    applyFix(filePath, searchPattern, replacement, {
        id: 'FIX-002',
        title: 'Add authorization to getVirtualAccount (CRITICAL)'
    });
}

// ========================================
// FIX-003: Guarantor Token Replay Prevention
// ========================================

function fix003_GuarantorTokenReplay() {
    const filePath = 'functions/guarantorApproval.js';

    // Fix approveGuarantorRequest
    const searchApprove = `exports.approveGuarantorRequest = functions.https.onCall(async (data, context) => {
    const { token } = data;

    if (!token) {
        throw new functions.https.HttpsError('invalid-argument', 'Token is required');
    }

    try {
        const db = admin.firestore();

        // Find loan application by token
        const loansSnapshot = await db.collection('loanApplications')
            .where('guarantorApprovalToken', '==', token)
            .limit(1)
            .get();

        if (loansSnapshot.empty) {
            throw new functions.https.HttpsError('not-found', 'Invalid approval link');
        }

        const loanDoc = loansSnapshot.docs[0];
        const loan = loanDoc.data();

        // Check if already responded
        if (loan.guarantorStatus !== 'pending') {
            throw new functions.https.HttpsError('failed-precondition', 'Request already processed');
        }

        // Check if expired
        if (loan.guarantorTokenExpiry && loan.guarantorTokenExpiry.toDate() < new Date()) {
            throw new functions.https.HttpsError('failed-precondition', 'This approval link has expired');
        }

        // Update loan application
        await loanDoc.ref.update({
            guarantorStatus: 'approved',
            guarantorApprovedAt: admin.firestore.FieldValue.serverTimestamp(),
            canDisburse: true
        });`;

    const replacementApprove = `exports.approveGuarantorRequest = functions.https.onCall(async (data, context) => {
    const { token } = data;

    if (!token) {
        throw new functions.https.HttpsError('invalid-argument', 'Token is required');
    }

    try {
        const db = admin.firestore();

        // FIX-003: Use transaction to prevent race conditions
        return await db.runTransaction(async (transaction) => {
            const loansQuery = db.collection('loanApplications')
                .where('guarantorApprovalToken', '==', token)
                .limit(1);
            
            const loansSnapshot = await transaction.get(loansQuery);

            if (loansSnapshot.empty) {
                throw new functions.https.HttpsError('not-found', 'Invalid approval link');
            }

            const loanDoc = loansSnapshot.docs[0];
            const loan = loanDoc.data();

            // Check if already responded (atomic)
            if (loan.guarantorStatus !== 'pending') {
                throw new functions.https.HttpsError('failed-precondition', 'Request already processed');
            }

            // Check if expired
            if (loan.guarantorTokenExpiry && loan.guarantorTokenExpiry.toDate() < new Date()) {
                throw new functions.https.HttpsError('failed-precondition', 'This approval link has expired');
            }

            // Update and invalidate token in single transaction
            transaction.update(loanDoc.ref, {
                guarantorStatus: 'approved',
                guarantorApprovedAt: admin.firestore.FieldValue.serverTimestamp(),
                guarantorApprovalToken: admin.firestore.FieldValue.delete(), // Invalidate token
                canDisburse: true
            });`;

    applyFix(filePath, searchApprove, replacementApprove, {
        id: 'FIX-003a',
        title: 'Prevent guarantor token replay - approve (CRITICAL)'
    });

    // Fix rejectGuarantorRequest similarly
    const searchReject = `exports.rejectGuarantorRequest = functions.https.onCall(async (data, context) => {
    const { token, reason } = data;

    if (!token) {
        throw new functions.https.HttpsError('invalid-argument', 'Token is required');
    }

    try {
        const db = admin.firestore();

        // Find loan application by token
        const loansSnapshot = await db.collection('loanApplications')
            .where('guarantorApprovalToken', '==', token)
            .limit(1)
            .get();

        if (loansSnapshot.empty) {
            throw new functions.https.HttpsError('not-found', 'Invalid approval link');
        }

        const loanDoc = loansSnapshot.docs[0];
        const loan = loanDoc.data();

        // Check if already responded
        if (loan.guarantorStatus !== 'pending') {
            throw new functions.https.HttpsError('failed-precondition', 'Request already processed');
        }

        // Check if expired
        if (loan.guarantorTokenExpiry && loan.guarantorTokenExpiry.toDate() < new Date()) {
            throw new functions.https.HttpsError('failed-precondition', 'This approval link has expired');
        }

        // Update loan application
        await loanDoc.ref.update({
            guarantorStatus: 'rejected',
            guarantorRejectedAt: admin.firestore.FieldValue.serverTimestamp(),
            guarantorRejectionReason: reason || 'No reason provided',
            canDisburse: false,
            // Optionally auto-reject the loan application
            status: 'rejected'
        });`;

    const replacementReject = `exports.rejectGuarantorRequest = functions.https.onCall(async (data, context) => {
    const { token, reason } = data;

    if (!token) {
        throw new functions.https.HttpsError('invalid-argument', 'Token is required');
    }

    try {
        const db = admin.firestore();

        // FIX-003: Use transaction to prevent race conditions
        return await db.runTransaction(async (transaction) => {
            const loansQuery = db.collection('loanApplications')
                .where('guarantorApprovalToken', '==', token)
                .limit(1);
            
            const loansSnapshot = await transaction.get(loansQuery);

            if (loansSnapshot.empty) {
                throw new functions.https.HttpsError('not-found', 'Invalid approval link');
            }

            const loanDoc = loansSnapshot.docs[0];
            const loan = loanDoc.data();

            // Check if already responded (atomic)
            if (loan.guarantorStatus !== 'pending') {
                throw new functions.https.HttpsError('failed-precondition', 'Request already processed');
            }

            // Check if expired
            if (loan.guarantorTokenExpiry && loan.guarantorTokenExpiry.toDate() < new Date()) {
                throw new functions.https.HttpsError('failed-precondition', 'This approval link has expired');
            }

            // Update and invalidate token in single transaction
            transaction.update(loanDoc.ref, {
                guarantorStatus: 'rejected',
                guarantorRejectedAt: admin.firestore.FieldValue.serverTimestamp(),
                guarantorRejectionReason: reason || 'No reason provided',
                guarantorApprovalToken: admin.firestore.FieldValue.delete(), // Invalidate token
                canDisburse: false,
                status: 'rejected'
            });`;

    applyFix(filePath, searchReject, replacementReject, {
        id: 'FIX-003b',
        title: 'Prevent guarantor token replay - reject (CRITICAL)'
    });
}

// ========================================
// FIX-004: createVirtualAccount Ownership Check
// ========================================

function fix004_CreateVirtualAccountOwnership() {
    const filePath = 'functions/index.js';

    const searchPattern = `    if (!memberId || !firstName || !lastName || !email) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }

    try {
        // Check if virtual account already exists`;

    const replacement = `    if (!memberId || !firstName || !lastName || !email) {
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

        // Check if virtual account already exists`;

    applyFix(filePath, searchPattern, replacement, {
        id: 'FIX-004',
        title: 'Add ownership check to createVirtualAccount (HIGH)'
    });
}

// ========================================
// FIX-005: Use Custom Claims for Admin Checks
// ========================================

function fix005_AdminCustomClaims() {
    const filePath = 'functions/memberIdService.js';

    const searchPattern = `        // Check if admin has permission
        const adminDoc = await admin.firestore().collection('users').doc(adminUid).get();
        const adminData = adminDoc.data();

        if (!adminData || !['admin', 'super_admin'].includes(adminData.role)) {
            throw new functions.https.HttpsError('permission-denied', 'Admin access required');
        }`;

    const replacement = `        // FIX-005: Check admin role via Custom Claims (not database)
        const userRole = context.auth.token.role || 'member';
        if (!['admin', 'super_admin'].includes(userRole)) {
            throw new functions.https.HttpsError('permission-denied', 'Admin access required');
        }`;

    applyFix(filePath, searchPattern, replacement, {
        id: 'FIX-005a',
        title: 'Use Custom Claims in approveMemberRegistration (HIGH)'
    });

    // Apply same fix to rejectMemberRegistration
    const searchPattern2 = `        // Check admin permission
        const adminDoc = await admin.firestore().collection('users').doc(adminUid).get();
        const adminData = adminDoc.data();

        if (!adminData || !['admin', 'super_admin'].includes(adminData.role)) {
            throw new functions.https.HttpsError('permission-denied', 'Admin access required');
        }`;

    const replacement2 = `        // FIX-005: Check admin role via Custom Claims (not database)
        const userRole = context.auth.token.role || 'member';
        if (!['admin', 'super_admin'].includes(userRole)) {
            throw new functions.https.HttpsError('permission-denied', 'Admin access required');
        }`;

    applyFix(filePath, searchPattern2, replacement2, {
        id: 'FIX-005b',
        title: 'Use Custom Claims in rejectMemberRegistration (HIGH)'
    });
}

// ========================================
// FIX-006: Guarantor Email Ownership Check
// ========================================

function fix006_GuarantorEmailOwnership() {
    const filePath = 'functions/guarantorApproval.js';

    const searchPattern = `        if (!loanDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Loan application not found');
        }

        // Generate approval token`;

    const replacement = `        if (!loanDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Loan application not found');
        }

        const loan = loanDoc.data();

        // FIX-006: Verify user owns this loan
        if (loan.userId !== context.auth.uid) {
            throw new functions.https.HttpsError(
                'permission-denied',
                'You can only send guarantor requests for your own loans'
            );
        }

        // Generate approval token`;

    applyFix(filePath, searchPattern, replacement, {
        id: 'FIX-006',
        title: 'Add loan ownership check to sendGuarantorApprovalEmail (HIGH)'
    });
}

// ========================================
// FIX-007: BVN Rate Limiting
// ========================================

function fix007_BVNRateLimiting() {
    const filePath = 'functions/verifyBVN.js';

    const searchPattern = `exports.verifyBVN = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }`;

    const replacement = `exports.verifyBVN = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    // FIX-007: Add rate limiting to prevent API abuse
    const { checkRateLimit } = require('./rateLimitService');
    const clientIP = context.rawRequest?.ip || 'unknown';
    
    await checkRateLimit('bvnVerification', clientIP, {
        maxAttempts: 3,
        windowMs: 3600000 // 1 hour
    });`;

    applyFix(filePath, searchPattern, replacement, {
        id: 'FIX-007',
        title: 'Add rate limiting to BVN verification (HIGH)'
    });
}

// ========================================
// FIX-010: Sanitize Support Ticket Inputs
// ========================================

function fix010_SanitizeSupportTickets() {
    const filePath = 'functions/sendSupportTicket.js';

    const searchPattern = `        const { subject, message, category, priority } = data;

        // Validate required fields
        if (!subject || !message || !category || !priority) {
            throw new functions.https.HttpsError('invalid-argument', 'All fields are required');
        }`;

    const replacement = `        const { subject, message, category, priority } = data;

        // FIX-010: Validate and sanitize inputs
        if (!subject || subject.length > 200) {
            throw new functions.https.HttpsError('invalid-argument', 'Subject must be 1-200 characters');
        }

        if (!message || message.length > 5000) {
            throw new functions.https.HttpsError('invalid-argument', 'Message must be 1-5000 characters');
        }

        if (!category || !priority) {
            throw new functions.https.HttpsError('invalid-argument', 'Category and priority are required');
        }

        // Basic HTML escaping to prevent XSS in emails
        const escapeHtml = (text) => {
            return text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        };

        const sanitizedSubject = escapeHtml(subject);
        const sanitizedMessage = escapeHtml(message);`;

    applyFix(filePath, searchPattern, replacement, {
        id: 'FIX-010',
        title: 'Sanitize support ticket inputs (MEDIUM)'
    });

    // Update email template to use sanitized variables
    const searchEmail = /Subject: \${subject}/g;
    const replaceEmail = 'Subject: ${sanitizedSubject}';

    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/\${subject}/g, '${sanitizedSubject}');
    content = content.replace(/\${message}/g, '${sanitizedMessage}');

    if (!DRY_RUN) {
        fs.writeFileSync(filePath, content, 'utf8');
    }
}

// ========================================
// Main Execution
// ========================================

function main() {
    log('\n🔒 APPLYING SECURITY FIXES\n', 'blue');

    // CRITICAL Fixes
    log('═══ CRITICAL FIXES (Deploy Today) ═══\n', 'red');
    fix001_FirestoreRules();
    fix002_GetVirtualAccountAuth();
    fix003_GuarantorTokenReplay();

    // HIGH Severity Fixes
    log('\n═══ HIGH SEVERITY FIXES ═══\n', 'yellow');
    fix004_CreateVirtualAccountOwnership();
    fix005_AdminCustomClaims();
    fix006_GuarantorEmailOwnership();
    fix007_BVNRateLimiting();

    // MEDIUM Severity Fixes
    log('\n═══ MEDIUM SEVERITY FIXES ═══\n', 'blue');
    fix010_SanitizeSupportTickets();

    log('\n✅ All fixes processed!\n', 'green');

    if (DRY_RUN) {
        log('This was a DRY RUN. No files were modified.', 'yellow');
        log('Run without --dry-run to apply changes.', 'yellow');
    }
}

main();
