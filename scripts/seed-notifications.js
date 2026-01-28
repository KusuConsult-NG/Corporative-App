import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Initialize Firebase Admin with service account
const serviceAccountPath = '/Users/mac/Downloads/device-streaming-c7297924-firebase-adminsdk-fbsvc-21df50dc23.json';
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function seedNotifications() {
    try {
        console.log('🔍 Finding user jos@jos.com...');

        // Find the user with email jos@jos.com
        const usersSnapshot = await db.collection('users')
            .where('email', '==', 'jos@jos.com')
            .limit(1)
            .get();

        if (usersSnapshot.empty) {
            console.error('❌ User jos@jos.com not found in Firestore');
            process.exit(1);
        }

        const userDoc = usersSnapshot.docs[0];
        const userData = userDoc.data();
        const userId = userData.userId;

        console.log(`✅ Found user: ${userData.name}`);
        console.log(`   User ID: ${userId}`);
        console.log(`   Email: ${userData.email}`);

        // Sample notifications
        const notifications = [
            {
                userId: userId,
                type: 'system',
                title: 'Welcome to AWSLMCSL Cooperative',
                message: 'Your account has been successfully set up. Start saving and enjoy our benefits!',
                read: false,
                createdAt: admin.firestore.Timestamp.fromDate(new Date('2026-01-27T10:00:00Z')),
                metadata: {}
            },
            {
                userId: userId,
                type: 'loan_approved',
                title: 'Loan Application Approved',
                message: 'Congratulations! Your Swift Relief loan of ₦30,000 has been approved.',
                read: false,
                createdAt: admin.firestore.Timestamp.fromDate(new Date('2026-01-27T14:30:00Z')),
                metadata: {
                    loanId: 'LOAN-SR-001',
                    loanType: 'Swift Relief',
                    amount: 30000,
                    interestRate: 6,
                    duration: 3
                }
            },
            {
                userId: userId,
                type: 'payment_received',
                title: 'Savings Deposit Received',
                message: 'Your savings deposit of ₦5,000 has been successfully received and credited.',
                read: true,
                createdAt: admin.firestore.Timestamp.fromDate(new Date('2026-01-26T16:45:00Z')),
                metadata: {
                    amount: 5000,
                    reference: 'PAY-20260126-001',
                    paymentMethod: 'bank_transfer'
                }
            },
            {
                userId: userId,
                type: 'savings_milestone',
                title: 'Savings Milestone Achieved',
                message: 'Congratulations! You have reached ₦25,000 in total savings.',
                read: true,
                createdAt: admin.firestore.Timestamp.fromDate(new Date('2026-01-25T09:15:00Z')),
                metadata: {
                    milestone: 25000,
                    currentBalance: 25000
                }
            },
            {
                userId: userId,
                type: 'commodity_ready',
                title: 'Commodity Order Ready',
                message: 'Your commodity order #ORD-001 is ready for pickup.',
                read: false,
                createdAt: admin.firestore.Timestamp.fromDate(new Date('2026-01-27T18:20:00Z')),
                metadata: {
                    orderId: 'ORD-001',
                    items: ['Rice 50kg', 'Cooking Oil 5L']
                }
            },
            {
                userId: userId,
                type: 'profile_update',
                title: 'Profile Update Required',
                message: 'Please complete your profile by uploading your passport photograph and bank details.',
                read: false,
                createdAt: admin.firestore.Timestamp.fromDate(new Date('2026-01-28T00:00:00Z')),
                metadata: {
                    missingFields: ['passport', 'bankDetails'],
                    completionPercentage: 57
                }
            },
            {
                userId: userId,
                type: 'loan_reminder',
                title: 'Loan Repayment Reminder',
                message: 'Your loan repayment of ₦10,600 is due on February 5, 2026.',
                read: false,
                createdAt: admin.firestore.Timestamp.fromDate(new Date('2026-01-27T08:00:00Z')),
                metadata: {
                    loanId: 'LOAN-SR-001',
                    amountDue: 10600,
                    dueDate: '2026-02-05'
                }
            },
            {
                userId: userId,
                type: 'system',
                title: 'Maintenance Notice',
                message: 'System maintenance scheduled for January 30, 2026 from 2:00 AM to 4:00 AM.',
                read: true,
                createdAt: admin.firestore.Timestamp.fromDate(new Date('2026-01-24T12:00:00Z')),
                metadata: {
                    maintenanceStart: '2026-01-30T02:00:00Z',
                    maintenanceEnd: '2026-01-30T04:00:00Z'
                }
            }
        ];

        console.log(`\n📝 Creating ${notifications.length} notifications...`);

        let count = 0;
        for (const notification of notifications) {
            await db.collection('notifications').add(notification);
            count++;
            console.log(`   ✓ ${count}/${notifications.length} - ${notification.title}`);
        }

        console.log(`\n✅ Successfully seeded ${count} notifications for ${userData.name}!`);
        console.log(`\n📊 Summary:`);
        console.log(`   - Unread: ${notifications.filter(n => !n.read).length}`);
        console.log(`   - Read: ${notifications.filter(n => n.read).length}`);
        console.log(`   - Types: ${[...new Set(notifications.map(n => n.type))].join(', ')}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding notifications:', error);
        process.exit(1);
    }
}

seedNotifications();
