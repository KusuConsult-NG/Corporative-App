import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, limit } from 'firebase/firestore';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
    measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function listUsers() {
    console.log('Fetching users...\n');
    const q = query(collection(db, 'users'), limit(5));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        console.log('No users found.');
        process.exit(0);
    }

    console.log(`Found ${snapshot.docs.length} users:\n`);

    snapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`${index + 1}. ${data.email || 'No email'}`);
        console.log(`   - Name: ${data.name || 'N/A'}`);
        console.log(`   - Role: ${data.role || 'N/A'}`);
        console.log(`   - Email Verified: ${data.emailVerified ? 'YES' : 'NO'}`);
        console.log(`   - Registration Fee Paid: ${data.registrationFeePaid ? 'YES' : 'NO'}`);
        console.log(`   - Approval Status: ${data.approvalStatus || 'N/A'}`);
        console.log(`   - Status: ${data.status || 'N/A'}`);
        console.log('');
    });

    process.exit(0);
}

listUsers().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
