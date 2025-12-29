import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
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

async function activateUsers() {
    const emails = ['applicant.test@unijos.edu.ng', 'guarantor.test@unijos.edu.ng'];

    for (const email of emails) {
        console.log(`Activating user: ${email}`);
        const q = query(collection(db, 'users'), where('email', '==', email));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            console.log(`  User ${email} not found.`);
            continue;
        }

        const userDoc = snapshot.docs[0];
        await updateDoc(doc(db, 'users', userDoc.id), {
            status: 'active',
            emailVerified: true,
            registrationFeePaid: true,
            registrationFeePaidAt: new Date()
        });
        console.log(`  User ${email} activated!`);
    }
    process.exit(0);
}

activateUsers().catch(err => {
    console.error(err);
    process.exit(1);
});
