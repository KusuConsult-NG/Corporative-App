const admin = require('firebase-admin');

/**
 * Log audit event to Firestore
 * @param {object} eventData - Event data to log
 */
async function logAuditEvent(eventData) {
    try {
        await admin.firestore().collection('audit_logs').add({
            ...eventData,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('Audit event logged:', eventData.action);
    } catch (error) {
        console.error('Error logging audit event:', error);
        // Don't throw - audit logging shouldn't break main functionality
    }
}

module.exports = {
    logAuditEvent
};
