/**
 * Script to create an admin user in Firestore
 * Usage: node scripts/create-admin.js <email>
 */

const admin = require('firebase-admin');
const serviceAccount = require('../functions/service-account.json');

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function createAdmin(email) {
    try {
        // Find user by email
        const usersSnapshot = await db.collection('users')
            .where('email', '==', email)
            .limit(1)
            .get();

        if (usersSnapshot.empty) {
            console.error(`❌ No user found with email: ${email}`);
            console.log('\n💡 Tip: The user must register first at /auth before being promoted to admin');
            process.exit(1);
        }

        const userDoc = usersSnapshot.docs[0];
        const userId = userDoc.id;

        // Update user to admin
        await db.collection('users').doc(userId).update({
            role: 'Super Admin',
            registrationStatus: 'approved',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log('✅ Success! User promoted to Super Admin');
        console.log(`📧 Email: ${email}`);
        console.log(`🆔 User ID: ${userId}`);
        console.log('\n🎉 You can now login as admin at /auth');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
    console.error('❌ Please provide an email address');
    console.log('\nUsage: node scripts/create-admin.js <email>');
    console.log('Example: node scripts/create-admin.js admin@example.com');
    process.exit(1);
}

createAdmin(email);
