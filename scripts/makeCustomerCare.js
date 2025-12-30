import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

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

async function makeCustomerCare() {
    const email = 'test.guarantor.new@unijos.edu.ng'; // Using guarantor as customer care
    const role = 'customerCare';

    try {
        console.log(`\n🎧 Setting ${email} to Customer Care...\n`);

        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log(`❌ User not found!`);
            process.exit(1);
        }

        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();

        console.log(`Found: ${userData.firstName} ${userData.lastName} (${userData.memberId})`);
        console.log(`Current role: ${userData.role || 'member'}`);

        await updateDoc(doc(db, 'users', userDoc.id), { role });

        console.log(`✅ Updated to: ${role}`);
        console.log(`\n📋 Login as Customer Care:`);
        console.log(`   Email: ${email}`);
        console.log(`   Password: password123`);
        console.log(`   Dashboard: http://localhost:3000/admin/customer-care\n`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

makeCustomerCare();
