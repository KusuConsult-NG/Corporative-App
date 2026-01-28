#!/usr/bin/env node
/**
 * Create required Firestore documents for Phase 3 Advanced Security
 * Run with: node create-firestore-docs.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin with project ID
admin.initializeApp({
    projectId: 'corporative-app'
});

const db = admin.firestore();

async function createDocuments() {
    console.log('🚀 Creating Firestore documents for Phase 3...\n');

    try {
        // Step 1: Create system_config/ip_whitelist
        console.log('📋 Step 1: Creating system_config/ip_whitelist...');

        await db.collection('system_config').doc('ip_whitelist').set({
            enforceWhitelist: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            modifiedBy: 'setup_script',
            lastModified: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log('✅ Created system_config/ip_whitelist (enforcement: DISABLED)\n');

        // Step 2: Add IP to whitelist
        console.log('📋 Step 2: Adding IP 102.91.103.159 to whitelist...');

        await db.collection('ip_whitelist').add({
            ip: '102.91.103.159',
            type: 'single',
            label: 'My Current IP',
            allowedRoles: ['admin', 'super_admin'],
            active: true,
            addedBy: 'setup_script',
            addedAt: admin.firestore.FieldValue.serverTimestamp()
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
        console.log('\n✅ Ready for testing!\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('\nMake sure you\'re logged in: firebase login');
        process.exit(1);
    }
}

createDocuments();
