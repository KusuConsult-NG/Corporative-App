import { initializeApp } from 'firebase/app';
import { getFirestore, collection, setDoc, doc, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

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
const auth = getAuth(app);

async function setupUsers() {
    // Using unique emails for this test run to ensure control over password
    const users = [
        {
            email: 'test.applicant.new@unijos.edu.ng',
            password: 'password123',
            data: {
                firstName: 'Applicant',
                lastName: 'Test',
                memberId: 'S2001',
                role: 'member',
                status: 'active',
                emailVerified: true,
                registrationFeePaid: true,
                department: 'Computer Science',
                rank: 'Lecturer',
                savingsBalance: 50000,
                createdAt: new Date()
            }
        },
        {
            email: 'test.guarantor.new@unijos.edu.ng',
            password: 'password123',
            data: {
                firstName: 'Guarantor',
                lastName: 'Test',
                memberId: 'S2002',
                role: 'member',
                status: 'active',
                emailVerified: true,
                registrationFeePaid: true,
                department: 'Computer Science',
                rank: 'Professor',
                savingsBalance: 100000,
                createdAt: new Date()
            }
        }
    ];

    for (const userData of users) {
        console.log(`Setting up user: ${userData.email}`);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
            const userId = userCredential.user.uid;

            await setDoc(doc(db, 'users', userId), {
                ...userData.data,
                userId,
                email: userData.email,
            });
            console.log(`  User ${userData.email} created!`);
        } catch (error) {
            console.log(`  User ${userData.email} already exists or error: ${error.message}`);
            // If already exists, we just proceed. The tests will use 'password123'.
        }
    }
    process.exit(0);
}

setupUsers();
