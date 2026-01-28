const functions = require('firebase-functions');
const admin = require('firebase-admin');

const db = admin.firestore();

/**
 * Scheduled function: Escalate stale complaints
 * Runs daily at 8 AM WAT to check for complaints open >24 hours
 */
exports.escalateStaleComplaints = functions.pubsub
    .schedule('0 8 * * *') // Daily at 8 AM
    .timeZone('Africa/Lagos') // WAT timezone
    .onRun(async (context) => {
        console.log('🔍 Checking for stale complaints to escalate...');

        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        try {
            // Get all open complaints older than 24 hours
            const complaintsSnapshot = await db.collection('complaints')
                .where('status', '==', 'open')
                .get();

            let escalatedCount = 0;

            for (const complaintDoc of complaintsSnapshot.docs) {
                const complaint = complaintDoc.data();
                const createdAt = complaint.createdAt.toDate();

                // Check if complaint is older than 24 hours and not already escalated
                if (createdAt < twentyFourHoursAgo && !complaint.escalated) {
                    // Escalate to urgent if not already
                    const newPriority = complaint.priority === 'urgent' ? 'urgent' : 'urgent';

                    await db.collection('complaints').doc(complaintDoc.id).update({
                        priority: newPriority,
                        escalated: true,
                        escalatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        previousPriority: complaint.priority || 'normal'
                    });

                    // Notify super admins only (to avoid spam)
                    const superAdminsSnapshot = await db.collection('users')
                        .where('role', '==', 'superAdmin')
                        .get();

                    for (const adminDoc of superAdminsSnapshot.docs) {
                        await db.collection('notifications').add({
                            userId: adminDoc.id,
                            type: 'complaint_escalated',
                            title: '🚨 Complaint Escalated',
                            message: `Complaint "${complaint.subject || 'No subject'}" has been open for 24+ hours`,
                            read: false,
                            priority: 'high',
                            createdAt: admin.firestore.FieldValue.serverTimestamp(),
                            metadata: {
                                complaintId: complaintDoc.id,
                                url: '/admin/complaints'
                            }
                        });
                    }

                    escalatedCount++;
                    console.log(`⬆️ Escalated complaint ${complaintDoc.id}: "${complaint.subject}"`);
                }
            }

            console.log(`✅ Escalated ${escalatedCount} stale complaint(s)`);
            return { escalatedCount };

        } catch (error) {
            console.error('❌ Error escalating stale complaints:', error);
            throw error;
        }
    });
