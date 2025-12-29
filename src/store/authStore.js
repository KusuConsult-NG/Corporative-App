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

                    set({
                        user: userData,
                        isAuthenticated: true,
                        loading: false
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
                    return { success: false, error: errorMessage }
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
                        phone: null,
                        passport: null,
                        passportUploadedAt: null,
                        bankDetails: [],
                        nextOfKin: userData.nextOfKin,

                        // Profile completion
                        profileComplete: false,
                        profileCompletionPercentage: 0,

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
                    await signOut(auth)
                    set({ user: null, isAuthenticated: false })
                } catch (error) {
                    console.error('Logout error:', error)
                    // Even if logout fails, clear local state
                    set({ user: null, isAuthenticated: false })
                }
            },

            checkSession: async () => {
                try {
                    // Firebase Auth handles session persistence automatically
                    // This will be called by the auth state listener
                    return new Promise((resolve) => {
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
                                    }
                                } catch (error) {
                                    console.error('Error fetching user data:', error)
                                    set({ user: null, isAuthenticated: false })
                                }
                            } else {
                                // User is signed out
                                set({ user: null, isAuthenticated: false })
                            }
                            unsubscribe()
                            resolve()
                        })
                    })
                } catch (error) {
                    set({ user: null, isAuthenticated: false })
                }
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

                    return { success: true }
                } catch (error) {
                    console.error('Error updating payment:', error)
                    return { success: false, error: error.message }
                }
            },

            // Profile update functions
            updateProfileField: async (userId, field, value) => {
                try {
                    const q = query(
                        collection(db, 'users'),
                        where('userId', '==', userId)
                    )
                    const querySnapshot = await getDocs(q)

                    if (querySnapshot.empty) {
                        return { success: false, error: 'User not found' }
                    }

                    const userDoc = querySnapshot.docs[0]
                    await updateDoc(doc(db, 'users', userDoc.id), {
                        [field]: value
                    })

                    // Update local state
                    set((state) => ({
                        user: state.user ? { ...state.user, [field]: value } : null
                    }))

                    return { success: true }
                } catch (error) {
                    console.error('Error updating profile field:', error)
                    return { success: false, error: error.message }
                }
            },
        }),
        {
            name: 'awslmcsl-auth',
        }
    )
)
