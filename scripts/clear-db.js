import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc } from 'firebase/firestore';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from the root directory
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

if (!firebaseConfig.apiKey) {
    console.error('Firebase config not found in .env. Please check your .env file.');
    process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const collectionsList = [
    'users', 'savings', 'savings_transactions', 'loans',
    'guarantor_approvals', 'commodities', 'commodity_orders',
    'commodityOrders', 'wallets', 'wallet_transactions',
    'reports', 'messages', 'approvalRequests'
];

async function clearAll() {
    console.log('Starting database clearance...');

    try {
        for (const colName of collectionsList) {
            console.log(`Clearing collection: ${colName}`);
            const snapshot = await getDocs(collection(db, colName));

            if (snapshot.empty) {
                console.log(`  Collection ${colName} is already empty.`);
                continue;
            }

            const deletePromises = snapshot.docs.map(async (d) => {
                // Check for deductions if it's a loan
                if (colName === 'loans') {
                    const deductionsSnapshot = await getDocs(collection(db, 'loans', d.id, 'deductions'));
                    const subDeletePromises = deductionsSnapshot.docs.map(sd => deleteDoc(sd.ref));
                    await Promise.all(subDeletePromises);
                    if (!deductionsSnapshot.empty) {
                        console.log(`    Cleared ${deductionsSnapshot.size} deductions for loan ${d.id}`);
                    }
                }
                return deleteDoc(d.ref);
            });

            await Promise.all(deletePromises);
            console.log(`  Finished clearing: ${colName} (${snapshot.size} docs)`);
        }
        console.log('Database cleared successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error clearing database:', error.message);
        process.exit(1);
    }
}

clearAll();
