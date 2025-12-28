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
                    set({ loading: false, error: error.message })
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

                    // Create user document in Firestore
                    await addDoc(collection(db, 'users'), {
                        userId: firebaseUser.uid,
                        memberId: memberId,
                        title: userData.title,
                        firstName: userData.firstName,
                        lastName: userData.lastName,
                        name: `${userData.title} ${userData.firstName} ${userData.lastName}`,
                        email: userData.email,
                        staffId: userData.staffId,
                        department: userData.department,
                        role: 'member',
                        status: 'active',
                        joinedAt: serverTimestamp()
                    })

                    // Auto-login after registration
                    return await get().login(userData.email, userData.password)
                } catch (error) {
                    set({ loading: false, error: error.message })
                    return { success: false, error: error.message }
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
        }),
        {
            name: 'awslmcsl-auth',
        }
    )
)
