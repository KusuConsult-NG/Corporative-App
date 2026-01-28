const admin = require('firebase-admin');

// Initialize with environment variable
process.env.GOOGLE_APPLICATION_CREDENTIALS = '/Users/mac/Downloads/device-streaming-c7297924-firebase-adminsdk-fbsvc-21df50dc23.json';

admin.initializeApp();

const db = admin.firestore();

async function initializeSecurity() {
    try {
        console.log('🔧 Initializing Phase 3 Advanced Security...');

        // Get public IP
        const https = require('https');
        const publicIP = await new Promise((resolve, reject) => {
            https.get('https://api.ipify.org?format=json', (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data).ip);
                    } catch (e) {
                        resolve('127.0.0.1');
                    }
                });
            }).on('error', () => resolve('127.0.0.1'));
        });

        // Initialize system config
        const systemConfigRef = db.collection('system').doc('config');
        await systemConfigRef.set({
            security: {
                ipWhitelistEnabled: false,
                ipWhitelist: [publicIP],
                rateLimitEnabled: true,
                maxRequestsPerMinute: 60,
                auditLogEnabled: true
            },
            maintenance: {
                enabled: false,
                message: ''
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        console.log('✅ System configuration initialized');
        console.log(`✅ Your IP (${publicIP}) added to whitelist`);

        // Create audit log entry
        const auditRef = db.collection('auditLogs').doc();
        await auditRef.set({
            action: 'SYSTEM_INIT',
            user: 'system',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            details: 'Phase 3 Advanced Security initialized'
        });

        console.log('✅ Audit logging initialized');

        // Grant admin role to jos@jos.com
        try {
            const userRecord = await admin.auth().getUserByEmail('jos@jos.com');
            await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true });

            const usersSnapshot = await db.collection('users')
                .where('userId', '==', userRecord.uid)
                .get();

            if (!usersSnapshot.empty) {
                const userDoc = usersSnapshot.docs[0];
                await userDoc.ref.update({ role: 'admin' });
                console.log(`✅ Admin role granted to: jos@jos.com`);
            }
        } catch (e) {
            console.log('⚠️  Admin role setup skipped:', e.message);
        }

        console.log('🎉 Phase 3 Advanced Security setup complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error initializing security:', error);
        process.exit(1);
    }
}

initializeSecurity();
