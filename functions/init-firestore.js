#!/usr/bin/env node
/**
 * Firestore Initialization Script
 * Sets up required documents for Phase 3 Advanced Security Features
 */

const admin = require('firebase-admin');
const https = require('https');

// Initialize Firebase Admin
const serviceAccount = require('./service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

/**
 * Get public IP address
 */
function getPublicIP() {
    return new Promise((resolve, reject) => {
        https.get('https://api.ipify.org?format=json', (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const ip = JSON.parse(data).ip;
                    resolve(ip);
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

/**
 * Initialize system configuration
 */
async function initializeSystemConfig() {
    console.log('\n📋 Step 1: Creating system_config/ip_whitelist...');

    const configRef = db.collection('system_config').doc('ip_whitelist');
    const configDoc = await configRef.get();

    if (configDoc.exists) {
        console.log('⚠️  system_config/ip_whitelist already exists');
        console.log('   Current enforcement status:', configDoc.data().enforceWhitelist);
        return configDoc.data();
    }

    const configData = {
        enforceWhitelist: false,  // Start in log-only mode
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastModified: admin.firestore.FieldValue.serverTimestamp(),
        modifiedBy: 'initialization_script'
    };

    await configRef.set(configData);
    console.log('✅ Created system_config/ip_whitelist (enforcement: disabled)');
    return configData;
}

/**
 * Add IP to whitelist
 */
async function addIPToWhitelist(ip) {
    console.log(`\n🌐 Step 2: Adding IP ${ip} to whitelist...`);

    // Check if IP already exists
    const existingQuery = await db.collection('ip_whitelist')
        .where('ip', '==', ip)
        .where('active', '==', true)
        .get();

    if (!existingQuery.empty) {
        console.log('⚠️  IP already in whitelist');
        const existingDoc = existingQuery.docs[0];
        console.log('   Label:', existingDoc.data().label);
        return existingDoc.data();
    }

    // Add new whitelist rule
    const whitelistData = {
        ip: ip,
        type: 'single',
        label: 'Initialization IP (Your Current IP)',
        allowedRoles: ['admin', 'super_admin'],
        active: true,
        addedBy: 'initialization_script',
        addedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastModified: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('ip_whitelist').add(whitelistData);
    console.log('✅ Added IP to whitelist');
    return whitelistData;
}

/**
 * Display summary
 */
function displaySummary(config, ipData, publicIP) {
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Firestore Initialization Complete!');
    console.log('='.repeat(60));
    console.log('\n📊 Summary:\n');
    console.log('  System Configuration:');
    console.log('    ├─ Document: system_config/ip_whitelist');
    console.log('    └─ Enforcement: DISABLED (log-only mode)');
    console.log('\n  IP Whitelist:');
    console.log(`    ├─ IP Address: ${publicIP}`);
    console.log(`    ├─ Type: ${ipData.type}`);
    console.log(`    ├─ Label: ${ipData.label}`);
    console.log('    └─ Allowed Roles: admin, super_admin');
    console.log('\n⚠️  Next Steps:\n');
    console.log('  1. Monitor ip_access_log for 1-2 weeks');
    console.log('  2. Add any additional legitimate IPs');
    console.log('  3. When ready, enable enforcement via:');
    console.log('     - Admin UI: /admin/ip-whitelist');
    console.log('     - Or update system_config/ip_whitelist: { enforceWhitelist: true }');
    console.log('\n✅ You can now deploy Cloud Functions:');
    console.log('   firebase deploy --only functions');
    console.log('\n' + '='.repeat(60) + '\n');
}

/**
 * Main execution
 */
async function main() {
    try {
        console.log('🚀 Initializing Firestore for Phase 3 Advanced Security');
        console.log('='.repeat(60));

        // Get public IP
        console.log('\n🔍 Detecting your public IP address...');
        const publicIP = await getPublicIP();
        console.log(`✅ Your public IP: ${publicIP}`);

        // Initialize system config
        const config = await initializeSystemConfig();

        // Add IP to whitelist
        const ipData = await addIPToWhitelist(publicIP);

        // Display summary
        displaySummary(config, ipData, publicIP);

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error during initialization:', error.message);
        console.error('\nPlease ensure:');
        console.error('  1. service-account-key.json exists in functions/ directory');
        console.error('  2. Firebase Admin SDK is installed: npm install');
        console.error('  3. You have internet connection (to detect IP)');
        process.exit(1);
    }
}

// Run
main();
