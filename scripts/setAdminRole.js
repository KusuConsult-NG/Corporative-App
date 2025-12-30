import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function promoteUserToAdmin() {
    console.log('\n🔧 Admin Role Assignment Tool\n');
    console.log('Available roles:');
    console.log('  1. member       - Regular member (no admin access)');
    console.log('  2. customerCare - Customer service/support staff');
    console.log('  3. limitedAdmin - View-only admin access');
    console.log('  4. admin        - Full admin access');
    console.log('  5. superadmin   - Super admin (can manage roles)\n');

    const email = await question('Enter user email: ');
    const roleChoice = await question('Enter role number (1-5): ');

    const roleMap = {
        '1': 'member',
        '2': 'customerCare',
        '3': 'limitedAdmin',
        '4': 'admin',
        '5': 'superadmin'
    };

    const role = roleMap[roleChoice];

    if (!role) {
        console.log('❌ Invalid role choice!');
        rl.close();
        process.exit(1);
    }

    try {
        // Find user by email
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', email.toLowerCase().trim()));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log(`❌ User with email "${email}" not found!`);
            rl.close();
            process.exit(1);
        }

        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();

        console.log(`\nFound user: ${userData.firstName} ${userData.lastName} (${userData.memberId})`);
        console.log(`Current role: ${userData.role || 'member'}`);
        console.log(`New role: ${role}`);

        const confirm = await question('\nProceed with role update? (yes/no): ');

        if (confirm.toLowerCase() !== 'yes') {
            console.log('❌ Operation cancelled.');
            rl.close();
            process.exit(0);
        }

        // Update user role
        await updateDoc(doc(db, 'users', userDoc.id), {
            role: role
        });

        console.log(`\n✅ Successfully updated ${email} to role: ${role}`);
        console.log('\n📋 Next steps:');
        console.log('  1. User must log out and log back in');
        console.log(`  2. They will be redirected to /admin/dashboard`);

        if (role === 'limitedAdmin') {
            console.log('  3. They will have VIEW-ONLY access to admin features');
        } else if (role === 'admin') {
            console.log('  3. They will have FULL admin access (approve loans, orders, etc.)');
        } else if (role === 'superadmin') {
            console.log('  3. They will have FULL admin access + ability to manage user roles');
        }

    } catch (error) {
        console.error('❌ Error updating role:', error);
    } finally {
        rl.close();
        process.exit(0);
    }
}

promoteUserToAdmin();
