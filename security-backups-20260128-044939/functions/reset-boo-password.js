const admin = require('firebase-admin');

// Use application default credentials from environment
admin.initializeApp();

async function resetPassword() {
    const uid = 'vwoCrt3QpgSvFeRUMbJPKfkvgKY2';
    const newPassword = '12345Gg!';

    try {
        await admin.auth().updateUser(uid, {
            password: newPassword
        });
        console.log('✅ Password successfully reset for boo@boo.com');
        console.log('Email: boo@boo.com');
        console.log('Password: 12345Gg!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

resetPassword();
