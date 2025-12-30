/**
 * Permission System for Role-Based Access Control
 * 
 * This module defines roles, permissions, and utility functions
 * for checking user access throughout the application.
 */

// ========== ROLE DEFINITIONS ==========
export const ROLES = {
    MEMBER: 'member',
    CUSTOMER_CARE: 'customerCare',
    ADMIN: 'admin',
    SUPER_ADMIN: 'superadmin'
}

// ========== PERMISSION DEFINITIONS ==========
export const PERMISSIONS = {
    // Member Management
    VIEW_MEMBERS: 'view_members',
    EDIT_MEMBERS: 'edit_members',
    DELETE_MEMBERS: 'delete_members',

    // Loan Management
    VIEW_LOANS: 'view_loans',
    APPROVE_LOANS: 'approve_loans',
    REJECT_LOANS: 'reject_loans',
    EDIT_LOANS: 'edit_loans',

    // Savings Management
    VIEW_SAVINGS: 'view_savings',
    APPROVE_SAVINGS_REDUCTION: 'approve_savings_reduction',
    EDIT_SAVINGS: 'edit_savings',

    // Commodity Management
    VIEW_COMMODITY_ORDERS: 'view_commodity_orders',
    APPROVE_COMMODITY_ORDERS: 'approve_commodity_orders',
    MANAGE_COMMODITIES: 'manage_commodities', // Add/Edit/Delete commodities

    // Reports & Analytics
    VIEW_REPORTS: 'view_reports',
    EXPORT_REPORTS: 'export_reports',

    // Communications
    SEND_BROADCAST: 'send_broadcast',
    VIEW_COMPLAINTS: 'view_complaints',
    RESPOND_COMPLAINTS: 'respond_complaints',

    // Profile Management
    APPROVE_PROFILE_CHANGES: 'approve_profile_changes',

    // Role Management (Super Admin only)
    MANAGE_ROLES: 'manage_roles',

    // Approvals
    VIEW_APPROVALS: 'view_approvals',
    PROCESS_APPROVALS: 'process_approvals'
}

// ========== ROLE-PERMISSION MAPPING ==========
export const ROLE_PERMISSIONS = {
    [ROLES.MEMBER]: [
        // Members have no admin permissions
    ],

    [ROLES.CUSTOMER_CARE]: [
        // Customer Care / Support Staff
        // Can view data and respond to member inquiries
        PERMISSIONS.VIEW_MEMBERS, // To look up member details
        PERMISSIONS.VIEW_LOANS, // To answer loan questions
        PERMISSIONS.VIEW_SAVINGS, // To answer savings questions
        PERMISSIONS.VIEW_COMMODITY_ORDERS, // To answer order inquiries
        PERMISSIONS.VIEW_REPORTS, // To view reports
        PERMISSIONS.VIEW_COMPLAINTS, // To see complaints
        PERMISSIONS.RESPOND_COMPLAINTS, // To respond to complaints
        PERMISSIONS.VIEW_APPROVALS, // To see pending approvals
        PERMISSIONS.PROCESS_APPROVALS, // Fixed: Needed this to approve things!
        PERMISSIONS.SEND_BROADCAST,
    ],

    // Backward compatibility for old role name
    'limitedAdmin': [
        PERMISSIONS.VIEW_MEMBERS,
        PERMISSIONS.VIEW_LOANS,
        PERMISSIONS.VIEW_SAVINGS,
        PERMISSIONS.VIEW_COMMODITY_ORDERS,
        PERMISSIONS.VIEW_REPORTS,
        PERMISSIONS.VIEW_COMPLAINTS,
        PERMISSIONS.RESPOND_COMPLAINTS,
        PERMISSIONS.VIEW_APPROVALS,
        PERMISSIONS.PROCESS_APPROVALS,
        PERMISSIONS.SEND_BROADCAST,
    ],

    [ROLES.ADMIN]: [
        // All permissions except role management
        ...Object.values(PERMISSIONS).filter(p => p !== PERMISSIONS.MANAGE_ROLES),
    ],

    [ROLES.SUPER_ADMIN]: [
        // All permissions
        ...Object.values(PERMISSIONS),
    ]
}

// ========== UTILITY FUNCTIONS ==========

/**
 * Check if a user has a specific permission
 * @param {Object} user - User object with role property
 * @param {string} permission - Permission to check
 * @returns {boolean} - True if user has permission
 */
export function hasPermission(user, permission) {
    if (!user || !user.role) {
        return false
    }

    const userPermissions = ROLE_PERMISSIONS[user.role] || []
    return userPermissions.includes(permission)
}

/**
 * Check if user has any of the specified permissions
 * @param {Object} user - User object with role property
 * @param {Array<string>} permissions - Array of permissions to check
 * @returns {boolean} - True if user has at least one permission
 */
export function hasAnyPermission(user, permissions) {
    if (!user || !user.role || !Array.isArray(permissions)) {
        return false
    }

    return permissions.some(permission => hasPermission(user, permission))
}

/**
 * Check if user has all of the specified permissions
 * @param {Object} user - User object with role property
 * @param {Array<string>} permissions - Array of permissions to check
 * @returns {boolean} - True if user has all permissions
 */
export function hasAllPermissions(user, permissions) {
    if (!user || !user.role || !Array.isArray(permissions)) {
        return false
    }

    return permissions.every(permission => hasPermission(user, permission))
}

/**
 * Check if user can access admin routes
 * @param {Object} user - User object with role property
 * @returns {boolean} - True if user has admin access
 */
export function canAccessAdmin(user) {
    if (!user || !user.role) {
        return false
    }

    return [ROLES.CUSTOMER_CARE, ROLES.ADMIN, ROLES.SUPER_ADMIN, 'limitedAdmin'].includes(user.role)
}

/**
 * Check if user is a super admin
 * @param {Object} user - User object with role property
 * @returns {boolean} - True if user is super admin
 */
export function isSuperAdmin(user) {
    return user?.role === ROLES.SUPER_ADMIN
}

/**
 * Check if user is at least an admin (admin or super admin)
 * @param {Object} user - User object with role property
 * @returns {boolean} - True if user is admin or super admin
 */
export function isFullAdmin(user) {
    return user?.role === ROLES.ADMIN || user?.role === ROLES.SUPER_ADMIN
}

/**
 * Get all permissions for a given role
 * @param {string} role - Role to get permissions for
 * @returns {Array<string>} - Array of permissions
 */
export function getPermissionsForRole(role) {
    return ROLE_PERMISSIONS[role] || []
}

/**
 * Get user-friendly role display name
 * @param {string} role - Role identifier
 * @returns {string} - Display name for role
 */
export function getRoleDisplayName(role) {
    const roleNames = {
        [ROLES.MEMBER]: 'Member',
        [ROLES.CUSTOMER_CARE]: 'Customer Care',
        'limitedAdmin': 'Customer Care', // Backward compatibility
        [ROLES.ADMIN]: 'Administrator',
        [ROLES.SUPER_ADMIN]: 'Super Administrator'
    }

    return roleNames[role] || 'Unknown Role'
}

/**
 * Get role badge color
 * @param {string} role - Role identifier
 * @returns {string} - Tailwind color classes
 */
export function getRoleBadgeColor(role) {
    const colors = {
        [ROLES.MEMBER]: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
        [ROLES.CUSTOMER_CARE]: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
        'limitedAdmin': 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300', // Backward compatibility
        [ROLES.ADMIN]: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
        [ROLES.SUPER_ADMIN]: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
    }

    return colors[role] || 'bg-gray-100 text-gray-700'
}

/**
 * Check if a role can be assigned by the current user
 * @param {Object} currentUser - Current user object
 * @param {string} targetRole - Role to be assigned
 * @returns {boolean} - True if current user can assign this role
 */
export function canAssignRole(currentUser, targetRole) {
    // Only super admins can assign roles
    if (!isSuperAdmin(currentUser)) {
        return false
    }

    // Super admins can assign any role
    return Object.values(ROLES).includes(targetRole)
}
