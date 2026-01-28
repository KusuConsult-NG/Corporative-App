const functions = require('firebase-functions')
const admin = require('firebase-admin')
const { Resend } = require('resend')

// Initialize Resend with API key from config
// Set via: firebase functions:config:set resend.key="re_xxx..."
let resend = null
try {
    const resendKey = functions.config().resend?.key
    if (resendKey) {
        resend = new Resend(resendKey)
    }
} catch (error) {
    console.warn('Resend not configured. Email alerts will be logged only.')
}

// Alert type definitions
const ALERT_TYPES = {
    LARGE_WITHDRAWAL: {
        subject: '🚨 Large Withdrawal Alert',
        priority: 'HIGH',
        threshold: 50000
    },
    LARGE_LOAN_APPROVAL: {
        subject: '🚨 Large Loan Approved',
        priority: 'HIGH',
        threshold: 100000
    },
    LARGE_COMMODITY_ORDER: {
        subject: '⚠️ Large Commodity Order',
        priority: 'MEDIUM',
        threshold: 30000
    },
    SAVINGS_REDUCTION: {
        subject: '⚠️ Savings Reduction Request',
        priority: 'MEDIUM',
        threshold: 0
    },
    FAILED_LOGIN_ATTEMPTS: {
        subject: '⚠️ Multiple Failed Login Attempts',
        priority: 'HIGH',
        threshold: 3
    },
    NEW_DEVICE_LOGIN: {
        subject: '🔐 New Device Login Detected',
        priority: 'MEDIUM',
        threshold: 0
    },
    ROLE_CHANGE: {
        subject: '🚨 Admin Role Changed',
        priority: 'HIGH',
        threshold: 0
    },
    PROFILE_CHANGE: {
        subject: '📝 User Profile Changed',
        priority: 'LOW',
        threshold: 0
    },
    PASSWORD_CHANGE: {
        subject: '🔐 Password Changed',
        priority: 'MEDIUM',
        threshold: 0
    },
    MEMBER_APPROVED: {
        subject: '✅ Member Registration Approved',
        priority: 'LOW',
        threshold: 0
    },
    MEMBER_REJECTED: {
        subject: '❌ Member Registration Rejected',
        priority: 'LOW',
        threshold: 0
    },
    RATE_LIMIT_EXCEEDED: {
        subject: '⚠️ Rate Limit Exceeded',
        priority: 'MEDIUM',
        threshold: 0
    },
    IP_WHITELIST_VIOLATION: {
        subject: '🚨 IP Whitelist Violation',
        priority: 'HIGH',
        threshold: 0
    },
    AUDIT_LOG_ANOMALY: {
        subject: '🚨 Audit Log Anomaly Detected',
        priority: 'HIGH',
        threshold: 0
    }
}

/**
 * Get admin email addresses
 */
async function getAdminEmails() {
    try {
        // Try to get from config first
        const configEmails = functions.config().alerts?.admins
        if (configEmails) {
            return configEmails.split(',').map(email => email.trim())
        }

        // Fallback: Query Firestore for admin users
        const admins = await admin.firestore()
            .collection('users')
            .where('role', 'in', ['admin', 'super_admin'])
            .get()

        const emails = admins.docs
            .map(doc => doc.data().email)
            .filter(email => email && email.includes('@'))

        return emails.length > 0 ? emails : ['admin@awslmcsl.com'] // Default fallback
    } catch (error) {
        console.error('Error getting admin emails:', error)
        return ['admin@awslmcsl.com']
    }
}

/**
 * Generate HTML email content
 */
function generateEmailHTML(type, data) {
    const alertType = ALERT_TYPES[type]
    const timestamp = new Date().toLocaleString('en-NG', {
        timeZone: 'Africa/Lagos',
        dateStyle: 'full',
        timeStyle: 'long'
    })

    let content = ''

    switch (type) {
        case 'LARGE_WITHDRAWAL':
            content = `
        <p><strong>Amount:</strong> ₦${data.amount.toLocaleString()}</p>
        <p><strong>User:</strong> ${data.userName} (${data.memberId})</p>
        <p><strong>Account Type:</strong> ${data.accountType}</p>
        <p><strong>Current Balance:</strong> ₦${data.balance?.toLocaleString() || 'N/A'}</p>
      `
            break

        case 'LARGE_LOAN_APPROVAL':
            content = `
        <p><strong>Loan Amount:</strong> ₦${data.amount.toLocaleString()}</p>
        <p><strong>Borrower:</strong> ${data.userName} (${data.memberId})</p>
        <p><strong>Loan Type:</strong> ${data.loanType}</p>
        <p><strong>Duration:</strong> ${data.duration} months</p>
        <p><strong>Approved By:</strong> ${data.approvedBy}</p>
      `
            break

        case 'FAILED_LOGIN_ATTEMPTS':
            content = `
        <p><strong>User:</strong> ${data.userName || 'Unknown'}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Attempts:</strong> ${data.attempts}</p>
        <p><strong>IP Address:</strong> ${data.ip || 'Unknown'}</p>
        <p><strong>Time Window:</strong> Last 10 minutes</p>
      `
            break

        case 'NEW_DEVICE_LOGIN':
            content = `
        <p><strong>User:</strong> ${data.userName} (${data.memberId})</p>
        <p><strong>Device:</strong> ${data.deviceInfo || 'Unknown'}</p>
        <p><strong>Browser:</strong> ${data.browser || 'Unknown'}</p>
        <p><strong>IP Address:</strong> ${data.ip || 'Unknown'}</p>
        <p><strong>Location:</strong> ${data.location || 'Unknown'}</p>
      `
            break

        case 'ROLE_CHANGE':
            content = `
        <p><strong>User:</strong> ${data.userName} (${data.memberId})</p>
        <p><strong>Old Role:</strong> ${data.oldRole}</p>
        <p><strong>New Role:</strong> ${data.newRole}</p>
        <p><strong>Changed By:</strong> ${data.changedBy}</p>
      `
            break

        default:
            content = `<pre>${JSON.stringify(data, null, 2)}</pre>`
    }

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: bold; }
        .badge-high { background: #fee2e2; color: #991b1b; }
        .badge-medium { background: #fef3c7; color: #92400e; }
        .badge-low { background: #dbeafe; color: #1e40af; }
        p { margin: 8px 0; }
        strong { color: #1f2937; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="margin: 0;">${alertType.subject}</h2>
          <span class="badge badge-${alertType.priority.toLowerCase()}">${alertType.priority}</span>
        </div>
        <div class="content">
          <p style="font-size: 14px; color: #6b7280; margin-bottom: 16px;">${timestamp}</p>
          ${content}
        </div>
        <div class="footer">
          <p>AWSLMCSL Joseph Sarwuan Tarka University Staff Multi-Purpose Cooperative Society</p>
          <p>This is an automated alert. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Send alert email using Resend
 * @param {string} type - Alert type from ALERT_TYPES
 * @param {object} data - Alert data
 * @param {boolean} force - Force send even if under threshold
 */
async function sendAlert(type, data, force = false) {
    try {
        const alertType = ALERT_TYPES[type]
        if (!alertType) {
            console.error(`Unknown alert type: ${type}`)
            return { success: false, error: 'Unknown alert type' }
        }

        // Check threshold (if applicable)
        if (!force && alertType.threshold > 0 && data.amount < alertType.threshold) {
            console.log(`Alert ${type} skipped: amount ${data.amount} below threshold ${alertType.threshold}`)
            return { success: true, skipped: true, reason: 'Below threshold' }
        }

        // Rate limiting: Check if same alert was sent recently (within 1 hour)
        const recentAlertKey = `${type}_${data.userId || data.memberId || 'system'}`
        const recentAlert = await admin.firestore()
            .collection('alert_history')
            .where('key', '==', recentAlertKey)
            .where('timestamp', '>', new Date(Date.now() - 60 * 60 * 1000))
            .limit(1)
            .get()

        if (!recentAlert.empty && !force) {
            console.log(`Alert ${type} skipped: duplicate within 1 hour`)
            return { success: true, skipped: true, reason: 'Rate limited' }
        }

        // Get admin emails
        const adminEmails = await getAdminEmails()
        if (adminEmails.length === 0) {
            throw new Error('No admin emails configured')
        }

        // Generate email HTML
        const html = generateEmailHTML(type, data)

        // Send email via Resend
        const fromEmail = functions.config().resend?.from || 'alerts@awslmcsl.com'

        if (!resend) {
            // Resend not configured - log only
            console.log('📧 EMAIL ALERT (Resend not configured):', {
                type,
                to: adminEmails,
                subject: alertType.subject,
                data
            })

            // Still save to history
            await admin.firestore().collection('alert_history').add({
                key: recentAlertKey,
                type,
                data,
                recipients: adminEmails,
                status: 'logged_only',
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            })

            return { success: true, logged: true }
        }

        // Send to all admins
        const emailPromises = adminEmails.map(to =>
            resend.emails.send({
                from: fromEmail,
                to,
                subject: alertType.subject,
                html
            })
        )

        await Promise.all(emailPromises)

        // Save to alert history
        await admin.firestore().collection('alert_history').add({
            key: recentAlertKey,
            type,
            data,
            recipients: adminEmails,
            status: 'sent',
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        })

        console.log(`✅ Alert sent: ${type} to ${adminEmails.length} recipients`)
        return { success: true, recipients: adminEmails.length }
    } catch (error) {
        console.error(`Error sending alert ${type}:`, error)

        // Log failed alert
        await admin.firestore().collection('alert_history').add({
            type,
            data,
            status: 'failed',
            error: error.message,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        })

        return { success: false, error: error.message }
    }
}

/**
 * Callable function to test email alerts
 */
exports.testEmailAlert = functions.https.onCall(async (data, context) => {
    // Only admins can test
    if (!context.auth || !['admin', 'super_admin'].includes(context.auth.token.role)) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can test alerts')
    }

    const result = await sendAlert('LARGE_WITHDRAWAL', {
        amount: 75000,
        userName: 'Test User',
        memberId: 'AWSL-2026-0001',
        accountType: 'Savings',
        balance: 150000
    }, true) // Force send

    return result
})

module.exports = {
    sendAlert,
    ALERT_TYPES,
    testEmailAlert: exports.testEmailAlert
}
