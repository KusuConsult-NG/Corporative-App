#!/usr/bin/env node

/**
 * Create Admin User Script
 * 
 * This script creates a super admin user with all permissions:
 * - Creates Firebase Auth account
 * - Creates Firestore user document
 * - Sets custom claims for admin role
 * - Bypasses all security gates (email verification, approval, fee payment)
 * 
 * Usage: node scripts/create-admin-user.js
 */

import admin from 'firebase-admin'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import readline from 'readline'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Initialize readline for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

const question = (query) => new Promise((resolve) => rl.question(query, resolve))

// Check if service account key exists
const serviceAccountPath = join(__dirname, '..', 'serviceAccountKey.json')
let serviceAccount

try {
    serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))
} catch (error) {
    console.error('❌ Error: serviceAccountKey.json not found!')
    console.error('Please download your Firebase service account key:')
    console.error('1. Go to Firebase Console → Project Settings → Service Accounts')
    console.error('2. Click "Generate new private key"')
    console.error('3. Save as serviceAccountKey.json in project root')
    process.exit(1)
}

// Initialize Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
})

const auth = admin.auth()
const db = admin.firestore()

async function createAdminUser() {
    console.log('\n🔧 AWSLMCSL Cooperative - Admin User Creator\n')
    console.log('This will create a super admin user with full permissions.\n')

    // Get user input
    const email = await question('Enter admin email: ')
    const password = await question('Enter admin password (min 6 characters): ')
    const firstName = await question('Enter first name (default: Admin): ') || 'Admin'
    const lastName = await question('Enter last name (default: User): ') || 'User'
    const phone = await question('Enter phone (default: +2348000000000): ') || '+2348000000000'
    const staffId = await question('Enter staff ID (default: ADMIN001): ') || 'ADMIN001'

    rl.close()

    console.log('\n⏳ Creating admin user...\n')

    try {
        // Step 1: Create Firebase Auth user
        console.log('1️⃣ Creating Firebase Auth account...')
        const userRecord = await auth.createUser({
            email: email,
            password: password,
            emailVerified: true,  // Pre-verify email
            displayName: `${firstName} ${lastName}`
        })

        console.log(`✅ Auth user created with UID: ${userRecord.uid}`)

        // Step 2: Set custom claims for admin role
        console.log('\n2️⃣ Setting custom claims (super_admin role)...')
        await auth.setCustomUserClaims(userRecord.uid, {
            role: 'super_admin'
        })
        console.log('✅ Custom claims set')

        // Step 3: Create Firestore user document
        console.log('\n3️⃣ Creating Firestore user document...')
        const userData = {
            userId: userRecord.uid,
            email: email,
            emailVerified: true,  // Bypass gate 1
            role: 'super_admin',
            approvalStatus: 'approved',  // Bypass gate 2
            registrationFeePaid: true,   // Bypass gate 3

            // Personal info
            firstName: firstName,
            lastName: lastName,
            middleName: '',
            name: `${firstName} ${lastName}`,
            phone: phone,
            staffId: staffId,
            membershipId: staffId,
            memberId: staffId,

            // Profile
            profileComplete: true,
            profileCompletionPercentage: 100,
            status: 'active',

            // Security
            twoFactorEnabled: false,
            kycStatus: 'verified',
            kycVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),

            // Optional fields
            title: '',
            department: 'Administration',
            rank: 'Super Admin',
            position: 'System Administrator',
            gender: '',
            dateOfBirth: null,
            stateOfOrigin: '',
            address: '',
            passport: null,
            passportUploadedAt: null,
            bankDetails: [],
            nextOfKin: null,
            guarantors: [],

            // Payment fields
            registrationFeeAmount: 0,
            registrationFeeReference: 'ADMIN_BYPASS',
            registrationFeePaidAt: admin.firestore.FieldValue.serverTimestamp(),

            // Approval fields
            approvedBy: 'SYSTEM',
            approvedAt: admin.firestore.FieldValue.serverTimestamp(),
            rejectionReason: null,

            // Email verification
            emailVerificationToken: null,
            emailVerificationExpiry: null,

            // Timestamps
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            joinedAt: admin.firestore.FieldValue.serverTimestamp()
        }

        // Use UID as document ID (matches security rules)
        await db.collection('users').doc(userRecord.uid).set(userData)
        console.log('✅ Firestore document created')

        // Success summary
        console.log('\n✅ SUCCESS! Admin user created successfully!\n')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('📧 Email:', email)
        console.log('🆔 UID:', userRecord.uid)
        console.log('👤 Role: super_admin')
        console.log('✅ Email verified: true')
        console.log('✅ Approved: true')
        console.log('✅ Fee paid: true')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
        console.log('🎯 You can now login at:')
        console.log('   https://corporative-app.vercel.app/auth\n')
        console.log('⚠️  Note: You may need to wait a few minutes for')
        console.log('   custom claims to propagate.\n')

        process.exit(0)

    } catch (error) {
        console.error('\n❌ Error creating admin user:', error.message)

        if (error.code === 'auth/email-already-exists') {
            console.error('\n💡 This email is already registered.')
            console.error('   Delete the user from Firebase Console first, or use a different email.')
        } else if (error.code === 'auth/weak-password') {
            console.error('\n💡 Password must be at least 6 characters.')
        }

        process.exit(1)
    }
}

// Run the script
createAdminUser()
