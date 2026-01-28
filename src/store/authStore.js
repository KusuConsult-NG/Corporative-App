import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'firebase/auth'
import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    doc,
    getDoc,
    updateDoc,
    serverTimestamp
} from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

import { createAuditLog, AUDIT_ACTIONS, AUDIT_SEVERITY } from '../services/auditService'
export const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            isAuthenticated: false,
            loading: false,
            error: null,

            login: async (email, password) => {
                try {
                    set({ loading: true, error: null })

                    // Sign in with Firebase Auth
                    const userCredential = await signInWithEmailAndPassword(auth, email, password)
                    const firebaseUser = userCredential.user

                    // Fetch user details from Firestore
                    const q = query(
                        collection(db, 'users'),
                        where('userId', '==', firebaseUser.uid)
                    )
                    const querySnapshot = await getDocs(q)

                    if (querySnapshot.empty) {
                        throw new Error('User profile not found')
                    }

                    const userDoc = querySnapshot.docs[0]
                    const userData = { id: userDoc.id, ...userDoc.data() }

                    // Check if 2FA is enabled for admin/super_admin
                    if (userData.twoFactorEnabled && ['admin', 'super_admin'].includes(userData.role)) {
                        // Don't set user state yet - wait for 2FA verification
                        set({ loading: false })
                        return {
                            success: false,
                            requires2FA: true,
                            userData: userData,
                            firebaseUser: firebaseUser
                        }
                    }

                    // No 2FA required or not admin - complete login
                    set({
                        user: userData,
                        isAuthenticated: true,
                        loading: false
                    })

                    // Log successful login
                    await createAuditLog({
                        userId: firebaseUser.uid,
                        action: AUDIT_ACTIONS.USER_LOGIN,
                        resource: 'auth',
                        resourceId: firebaseUser.uid,
                        details: {
                            email: email,
                            role: userData.role,
                            twoFactorEnabled: userData.twoFactorEnabled || false
                        },
                        severity: AUDIT_SEVERITY.INFO
                    })

                    return { success: true }
                } catch (error) {
                    console.error('Login error:', error)

                    // Provide user-friendly error messages
                    let errorMessage = error.message

                    if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
                        errorMessage = 'Invalid email or password. Please check your credentials and try again.'
                    } else if (error.code === 'auth/user-not-found') {
                        errorMessage = 'No account found with this email address. Please register first.'
                    } else if (error.code === 'auth/invalid-email') {
                        errorMessage = 'Please enter a valid email address.'
                    } else if (error.code === 'auth/user-disabled') {
                        errorMessage = 'This account has been disabled. Please contact support.'
                    } else if (error.code === 'auth/too-many-requests') {
                        errorMessage = 'Too many failed login attempts. Please try again later or reset your password.'
                    } else if (error.code === 'auth/network-request-failed') {
                        errorMessage = 'Network error. Please check your internet connection and try again.'
                    } else if (error.message === 'User profile not found') {
                        errorMessage = 'Account setup incomplete. Please contact support.'
                    }

                    set({ loading: false, error: errorMessage })

                    // Log failed login attempt
                    await createAuditLog({
                        userId: email,
                        action: AUDIT_ACTIONS.FAILED_LOGIN_ATTEMPT,
                        resource: 'auth',
                        details: { email, errorCode: error.code, errorMessage },
                        severity: AUDIT_SEVERITY.WARNING
                    })
                    return { success: false, error: errorMessage }
                }
            },

            // Complete login after 2FA verification
            complete2FALogin: async (userData) => {
                try {
                    set({
                        user: userData,
                        isAuthenticated: true,
                        loading: false
                    })
                    return { success: true }
                } catch (error) {
                    console.error('Error completing 2FA login:', error)
                    return { success: false, error: error.message }
                }
            },

            register: async (userData) => {
                try {
                    set({ loading: true, error: null })

                    // Generate member ID based on staff ID
                    const memberId = userData.staffId

                    // Create Firebase Auth account
                    const userCredential = await createUserWithEmailAndPassword(
                        auth,
                        userData.email,
                        userData.password
                    )
                    const firebaseUser = userCredential.user

                    // Generate email verification token (simple UUID-like)
                    const verificationToken = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
                    const verificationExpiry = new Date()
                    verificationExpiry.setHours(verificationExpiry.getHours() + 24) // 24 hours

                    // Create user document in Firestore with new fields
                    await addDoc(collection(db, 'users'), {
                        userId: firebaseUser.uid,
                        memberId: memberId,
                        title: userData.title,
                        firstName: userData.firstName,
                        middleName: userData.middleName || '',
                        lastName: userData.lastName,
                        name: `${userData.title} ${userData.firstName} ${userData.middleName ? userData.middleName + ' ' : ''}${userData.lastName}`,
                        email: userData.email,
                        staffId: userData.staffId,
                        department: userData.department,
                        rank: userData.rank,
                        position: userData.position,
                        gender: userData.gender,
                        dateOfBirth: userData.dateOfBirth,
                        stateOfOrigin: userData.stateOfOrigin,
                        address: userData.address,
                        role: 'member',
                        status: 'pending', // Changed from 'active'

                        // NEW: Approval workflow fields
                        approvalStatus: 'pending',         // pending|approved|rejected
                        approvedBy: null,
                        approvedAt: null,
                        rejectionReason: null,

                        // Email verification fields
                        emailVerified: false,
                        emailVerificationToken: verificationToken,
                        emailVerificationExpiry: verificationExpiry,

                        // Payment fields
                        registrationFeePaid: false,
                        registrationFeeAmount: 2000,
                        registrationFeeReference: null,
                        registrationFeePaidAt: null,

                        // Profile fields
                        phone: userData.phone || null,
                        passport: null,
                        passportUploadedAt: null,
                        bankDetails: [],
                        nextOfKin: userData.nextOfKin,

                        // Profile completion
                        profileComplete: false,
                        profileCompletionPercentage: 0,

                        createdAt: serverTimestamp(),
                        joinedAt: serverTimestamp()
                    })

                    // Send verification email
                    const { emailService } = await import('../services/emailService')
                    const verificationLink = `${window.location.origin}/verify-email?token=${verificationToken}`
                    await emailService.sendVerificationEmail(
                        userData.email,
                        `${userData.title} ${userData.firstName} ${userData.lastName}`,
                        verificationLink
                    )

                    // Sign out immediately - don't auto-login
                    await signOut(auth)

                    set({ loading: false })
                    return { success: true, requiresVerification: true }
                } catch (error) {
                    console.error('Registration error:', error)

                    // Provide user-friendly error messages
                    let errorMessage = error.message

                    if (error.code === 'auth/email-already-in-use') {
                        errorMessage = 'This email address is already registered. Please use a different email or try logging in.'
                    } else if (error.code === 'auth/invalid-email') {
                        errorMessage = 'Please enter a valid email address.'
                    } else if (error.code === 'auth/weak-password') {
                        errorMessage = 'Password is too weak. Please use at least 6 characters.'
                    } else if (error.code === 'auth/network-request-failed') {
                        errorMessage = 'Network error. Please check your internet connection and try again.'
                    } else if (error.code === 'auth/too-many-requests') {
                        errorMessage = 'Too many attempts. Please try again later.'
                    }

                    set({ loading: false, error: errorMessage })
                    return { success: false, error: errorMessage }
                }
            },

            logout: async () => {
                try {
                    const currentUser = get().user

                    // Log logout before signing out
                    if (currentUser) {
                        await createAuditLog({
                            userId: currentUser.userId,
                            action: AUDIT_ACTIONS.USER_LOGOUT,
                            resource: 'auth',
                            resourceId: currentUser.userId,
                            details: { email: currentUser.email, role: currentUser.role },
                            severity: AUDIT_SEVERITY.INFO
                        })
                    }

                    await signOut(auth)
                    set({ user: null, isAuthenticated: false })
                } catch (error) {
                    console.error('Logout error:', error)
                    // Even if logout fails, clear local state
                    set({ user: null, isAuthenticated: false })
                }
            },

            checkSession: () => {
                // Set up a PERSISTENT auth state listener that returns cleanup function
                // This prevents infinite loops by not creating new listeners on every render
                const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
                    if (firebaseUser) {
                        // User is signed in, fetch their data
                        try {
                            const q = query(
                                collection(db, 'users'),
                                where('userId', '==', firebaseUser.uid)
                            )
                            const querySnapshot = await getDocs(q)

                            if (!querySnapshot.empty) {
                                const userDoc = querySnapshot.docs[0]
                                const userData = { id: userDoc.id, ...userDoc.data() }

                                set({
                                    user: userData,
                                    isAuthenticated: true
                                })
                            } else {
                                // User exists in Firebase Auth but not in Firestore
                                console.warn('User found in Auth but not in Firestore:', firebaseUser.uid)
                                set({ user: null, isAuthenticated: false })
                            }
                        } catch (error) {
                            console.error('Error fetching user data:', error)
                            set({ user: null, isAuthenticated: false })
                        }
                    } else {
                        // User is signed out
                        set({ user: null, isAuthenticated: false })
                    }
                })

                // Return the unsubscribe function so caller can clean up
                return unsubscribe
            },

            updateUser: (updates) => {
                set((state) => ({
                    user: state.user ? { ...state.user, ...updates } : null
                }))
            },

            // Email verification functions
            verifyEmail: async (token) => {
                try {
                    // Find user with this token
                    const q = query(
                        collection(db, 'users'),
                        where('emailVerificationToken', '==', token)
                    )
                    const querySnapshot = await getDocs(q)

                    if (querySnapshot.empty) {
                        return { success: false, error: 'Invalid verification link' }
                    }

                    const userDoc = querySnapshot.docs[0]
                    const userData = userDoc.data()

                    // Check if token has expired
                    const expiry = userData.emailVerificationExpiry?.toDate()
                    if (expiry && expiry < new Date()) {
                        return { success: false, error: 'Verification link has expired' }
                    }

                    // Update user document
                    await updateDoc(doc(db, 'users', userDoc.id), {
                        emailVerified: true,
                        emailVerificationToken: null,
                        emailVerificationExpiry: null,
                        status: 'active'
                    })

                    return { success: true, email: userData.email }
                } catch (error) {
                    console.error('Error verifying email:', error)
                    return { success: false, error: error.message }
                }
            },

            resendVerificationEmail: async (email) => {
                try {
                    // Find user by email
                    const q = query(
                        collection(db, 'users'),
                        where('email', '==', email)
                    )
                    const querySnapshot = await getDocs(q)

                    if (querySnapshot.empty) {
                        return { success: false, error: 'User not found' }
                    }

                    const userDoc = querySnapshot.docs[0]
                    const userData = userDoc.data()

                    if (userData.emailVerified) {
                        return { success: false, error: 'Email already verified' }
                    }

                    // Generate new token
                    const verificationToken = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
                    const verificationExpiry = new Date()
                    verificationExpiry.setHours(verificationExpiry.getHours() + 24)

                    // Update user document with new token
                    await updateDoc(doc(db, 'users', userDoc.id), {
                        emailVerificationToken: verificationToken,
                        emailVerificationExpiry: verificationExpiry
                    })

                    // Send new verification email
                    const { emailService } = await import('../services/emailService')
                    const verificationLink = `${window.location.origin}/verify-email?token=${verificationToken}`
                    await emailService.sendVerificationEmail(
                        email,
                        userData.name,
                        verificationLink
                    )

                    return { success: true }
                } catch (error) {
                    console.error('Error resending verification email:', error)
                    return { success: false, error: error.message }
                }
            },

            // Registration fee payment functions
            updateRegistrationFeePayment: async (userId, reference) => {
                try {
                    // Find user by userId
                    const q = query(
                        collection(db, 'users'),
                        where('userId', '==', userId)
                    )
                    const querySnapshot = await getDocs(q)

                    if (querySnapshot.empty) {
                        return { success: false, error: 'User not found' }
                    }

                    const userDoc = querySnapshot.docs[0]
                    const userData = userDoc.data()

                    // Update user document
                    await updateDoc(doc(db, 'users', userDoc.id), {
                        registrationFeePaid: true,
                        registrationFeeReference: reference,
                        registrationFeePaidAt: serverTimestamp()
                    })

                    // Update local user state
                    set((state) => ({
                        user: state.user ? {
                            ...state.user,
                            registrationFeePaid: true,
                            registrationFeeReference: reference
                        } : null
                    }))

                    // Auto-create virtual account after successful payment
                    try {
                        const { paystackService } = await import('../services/paystackService')
                        await paystackService.createMemberVirtualAccount({
                            memberId: userData.memberId,
                            firstName: userData.firstName,
                            lastName: userData.lastName,
                            email: userData.email,
                            phone: userData.phone || ''
                        })
                    } catch (accountError) {
                        console.error('Error creating virtual account:', accountError)
                        // Don't fail the payment update if virtual account creation fails
                    }

                    return { success: true }
                } catch (error) {
                    console.error('Error updating payment:', error)
                    return { success: false, error: error.message }
                }
            },

            // Profile update functions
            updateProfileField: async (userId, fieldOrObject, value) => {
                try {
                    const { user } = get()
                    if (!user) return { success: false, error: 'User session not found' }

                    let updateData = {}
                    if (typeof fieldOrObject === 'string') {
                        updateData[fieldOrObject] = value
                    } else {
                        updateData = fieldOrObject
                    }

                    // Use the document ID (user.id) directly if we have it, otherwise query
                    let userDocRef
                    if (user.id) {
                        userDocRef = doc(db, 'users', user.id)
                    } else {
                        const q = query(
                            collection(db, 'users'),
                            where('userId', '==', userId)
                        )
                        const querySnapshot = await getDocs(q)
                        if (querySnapshot.empty) return { success: false, error: 'User profile not found' }
                        userDocRef = doc(db, 'users', querySnapshot.docs[0].id)
                    }

                    await updateDoc(userDocRef, {
                        ...updateData,
                        updatedAt: serverTimestamp()
                    })

                    // Update local state
                    set((state) => ({
                        user: state.user ? { ...state.user, ...updateData } : null
                    }))

                    return { success: true }
                } catch (error) {
                    console.error('Error updating profile:', error)
                    return { success: false, error: error.message }
                }
            },
        }),
        {
            name: 'awslmcsl-auth',
        }
    )
)
