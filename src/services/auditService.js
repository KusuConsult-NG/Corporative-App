import { collection, addDoc, serverTimestamp, query, orderBy, limit, where, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'

/**
 * Audit Log Service
 * Centralized logging for critical operations
 */

// Audit action types
export const AUDIT_ACTIONS = {
    // Authentication
    USER_LOGIN: 'user_login',
    USER_LOGOUT: 'user_logout',
    PASSWORD_RESET: 'password_reset',
    TWO_FA_ENABLED: '2fa_enabled',
    TWO_FA_DISABLED: '2fa_disabled',
    TWO_FA_VERIFIED: '2fa_verified',
    TWO_FA_FAILED: '2fa_failed',
    BACKUP_CODE_USED: 'backup_code_used',

    // User Management
    USER_CREATED: 'user_created',
    USER_UPDATED: 'user_updated',
    USER_DEACTIVATED: 'user_deactivated',
    USER_REACTIVATED: 'user_reactivated',
    ROLE_CHANGED: 'role_changed',
    STATUS_CHANGED: 'status_changed',

    // Loan Management
    LOAN_APPLIED: 'loan_applied',
    LOAN_APPROVED: 'loan_approved',
    LOAN_REJECTED: 'loan_rejected',
    LOAN_ACTIVATED: 'loan_activated',
    LOAN_DEACTIVATED: 'loan_deactivated',
    LOAN_REPAYMENT: 'loan_repayment',
    LOAN_FULLY_REPAID: 'loan_fully_repaid',

    // Savings Management
    SAVINGS_DEPOSIT: 'savings_deposit',
    SAVINGS_WITHDRAWAL: 'savings_withdrawal',
    SAVINGS_REDUCTION_REQUESTED: 'savings_reduction_requested',
    SAVINGS_REDUCTION_APPROVED: 'savings_reduction_approved',
    SAVINGS_REDUCTION_REJECTED: 'savings_reduction_rejected',

    // Commodity Management
    COMMODITY_CREATED: 'commodity_created',
    COMMODITY_UPDATED: 'commodity_updated',
    COMMODITY_DELETED: 'commodity_deleted',
    COMMODITY_ORDER_PLACED: 'commodity_order_placed',
    COMMODITY_ORDER_APPROVED: 'commodity_order_approved',
    COMMODITY_ORDER_REJECTED: 'commodity_order_rejected',
    COMMODITY_ORDER_DELIVERED: 'commodity_order_delivered',

    // Profile Management
    PROFILE_UPDATED: 'profile_updated',
    PROFILE_CHANGE_REQUESTED: 'profile_change_requested',
    PROFILE_CHANGE_APPROVED: 'profile_change_approved',
    PROFILE_CHANGE_REJECTED: 'profile_change_rejected',
    BANK_DETAILS_UPDATED: 'bank_details_updated',

    // System Operations
    DATA_EXPORTED: 'data_exported',
    BULK_UPDATE: 'bulk_update',
    SYSTEM_SETTING_CHANGED: 'system_setting_changed',
    NOTIFICATION_SENT: 'notification_sent',

    // Security
    SUSPICIOUS_ACTIVITY: 'suspicious_activity',
    FAILED_LOGIN_ATTEMPT: 'failed_login_attempt',
    UNAUTHORIZED_ACCESS_ATTEMPT: 'unauthorized_access_attempt',
}

// Audit severity levels
export const AUDIT_SEVERITY = {
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    CRITICAL: 'critical'
}

/**
 * Create an audit log entry
 * @param {Object} params - Audit log parameters
 * @param {string} params.userId - ID of the user performing the action
 * @param {string} params.action - Action type  (use AUDIT_ACTIONS constants)
 * @param {string} params.resource - Resource affected (e.g., 'users', 'loans')
 * @param {string} params.resourceId - ID of the affected resource
 * @param {Object} params.details - Additional details about the action
 * @param {string} params.severity - Severity level (default: INFO)
 * @param {string} params.ipAddress - IP address of the user
 * @param {string} params.userAgent - User agent string
 */
export async function createAuditLog({
    userId,
    action,
    resource = null,
    resourceId = null,
    details = {},
    severity = AUDIT_SEVERITY.INFO,
    ipAddress = 'unknown',
    userAgent = 'unknown'
}) {
    try {
        await addDoc(collection(db, 'audit_logs'), {
            userId,
            action,
            resource,
            resourceId,
            details,
            severity,
            ipAddress,
            userAgent,
            timestamp: serverTimestamp(),
            createdAt: new Date() // For immediate use before server timestamp
        })
    } catch (error) {
        console.error('Error creating audit log:', error)
        // Don't throw - audit logging should not break the main operation
    }
}

/**
 * Get audit logs with filters
 * @param {Object} filters - Filter options
 * @param {string} filters.userId - Filter by user ID
 * @param {string} filters.action - Filter by action type
 * @param {string} filters.resource - Filter by resource type
 * @param {Date} filters.startDate - Filter by start date
 * @param {Date} filters.endDate - Filter by end date
 * @param {number} filters.limit - Max number of results (default: 100)
 */
export async function getAuditLogs(filters = {}) {
    try {
        let q = query(collection(db, 'audit_logs'))

        // Apply filters
        if (filters.userId) {
            q = query(q, where('userId', '==', filters.userId))
        }

        if (filters.action) {
            q = query(q, where('action', '==', filters.action))
        }

        if (filters.resource) {
            q = query(q, where('resource', '==', filters.resource))
        }

        if (filters.severity) {
            q = query(q, where('severity', '==', filters.severity))
        }

        if (filters.startDate) {
            q = query(q, where('createdAt', '>=', filters.startDate))
        }

        if (filters.endDate) {
            q = query(q, where('createdAt', '<=', filters.endDate))
        }

        // Order by timestamp descending (most recent first)
        q = query(q, orderBy('createdAt', 'desc'))

        // Apply limit
        const limitCount = filters.limit || 100
        q = query(q, limit(limitCount))

        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate(),
            createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt
        }))
    } catch (error) {
        console.error('Error fetching audit logs:', error)
        return []
    }
}

/**
 * Get audit logs for a specific user
 */
export async function getUserAuditLogs(userId, limitCount = 50) {
    return getAuditLogs({ userId, limit: limitCount })
}

/**
 * Get audit logs for a specific resource
 */
export async function getResourceAuditLogs(resource, resourceId, limitCount = 50) {
    try {
        const q = query(
            collection(db, 'audit_logs'),
            where('resource', '==', resource),
            where('resourceId', '==', resourceId),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        )

        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate(),
            createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt
        }))
    } catch (error) {
        console.error('Error fetching resource audit logs:', error)
        return []
    }
}

/**
 * Get Security-related audit logs (failed logins, suspicious activity, etc.)
 */
export async function getSecurityAuditLogs(limitCount = 100) {
    const securityActions = [
        AUDIT_ACTIONS.FAILED_LOGIN_ATTEMPT,
        AUDIT_ACTIONS.UNAUTHORIZED_ACCESS_ATTEMPT,
        AUDIT_ACTIONS.SUSPICIOUS_ACTIVITY,
        AUDIT_ACTIONS.TWO_FA_FAILED
    ]

    try {
        const q = query(
            collection(db, 'audit_logs'),
            where('action', 'in', securityActions),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        )

        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate(),
            createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt
        }))
    } catch (error) {
        console.error('Error fetching security audit logs:', error)
        return []
    }
}
