#!/usr/bin/env node
/**
 * Simple Firestore Setup Script (No Service Account Needed)
 * Uses Firebase Admin SDK with Application Default Credentials
 */

const admin = require('firebase-admin');

// Initialize with application default credentials (or use existing app)
try {
    admin.initializeApp();
} catch (e) {
    // Already initialized
    console.log('Firebase already initialized');
}

const db = admin.firestore();

async function setupFirestore() {
    console.log('🚀 Setting up Firestore documents for Phase 3...\n');

    try {
        // Step 1: Create system_config/ip_whitelist
        console.log('📋 Step 1: Creating system_config/ip_whitelist...');
        const systemConfigRef = db.collection('system_config').doc('ip_whitelist');

        await systemConfigRef.set({
            enforceWhitelist: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            modifiedBy: 'setup_script',
            lastModified: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log('✅ Created system_config/ip_whitelist (enforcement: DISABLED)\n');

        // Step 2: Add IP to whitelist
        console.log('📋 Step 2: Adding IP 102.91.103.159 to whitelist...');
        const ipWhitelistRef = db.collection('ip_whitelist');

        await ipWhitelistRef.add({
            ip: '102.91.103.159',
            type: 'single',
            label: 'Automated Setup IP',
            allowedRoles: ['admin', 'super_admin'],
            active: true,
            addedBy: 'setup_script',
            addedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastModified: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log('✅ Added IP 102.91.103.159 to whitelist\n');

        // Summary
        console.log('='.repeat(60));
        console.log('🎉 Firestore Setup Complete!');
        console.log('='.repeat(60));
        console.log('\n📊 Created Documents:\n');
        console.log('  1. system_config/ip_whitelist');
        console.log('     └─ enforceWhitelist: false (log-only mode)');
        console.log('\n  2. ip_whitelist/[auto-id]');
        console.log('     ├─ IP: 102.91.103.159');
        console.log('     ├─ Type: single');
        console.log('     └─ Roles: admin, super_admin');
        console.log('\n✅ Ready for deployment!');
        console.log('\nNext step: firebase deploy --only functions\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('\nTroubleshooting:');
        console.error('  1. Make sure you\'re logged in: firebase login');
        console.error('  2. Try: export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account.json"');
        console.error('  3. Or run: firebase use corporative-app');
        process.exit(1);
    }
}

setupFirestore();
