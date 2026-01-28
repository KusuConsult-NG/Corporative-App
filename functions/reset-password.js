#!/usr/bin/env node
const admin = require('firebase-admin');

// Initialize with service account
const serviceAccount = require('/Users/mac/Corporative App/functions/service-account-key.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

async function resetPassword() {
    const uid = 'vwoCrt3QpgSvFeRUMbJPKfkvgKY2';
    const newPassword = '12345Gg!';

    try {
        await admin.auth().updateUser(uid, {
            password: newPassword
        });
        console.log('✅ Password successfully reset for boo@boo.com');
        console.log('New password: 12345Gg!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error resetting password:', error.message);
        process.exit(1);
    }
}

resetPassword();
