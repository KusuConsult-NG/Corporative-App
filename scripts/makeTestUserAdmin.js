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

async function makeTestUserSuperAdmin() {
    const email = 'test.applicant.new@unijos.edu.ng';
    const role = 'superadmin';

    try {
        console.log(`\n🔧 Setting ${email} to ${role}...\n`);

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
        console.log(`\n📋 Next: Log out and log back in to see admin dashboard\n`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

makeTestUserSuperAdmin();
