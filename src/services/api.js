import {
    collection,
    addDoc,
    getDocs,
    getDoc,
    doc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { emailService } from './emailService'

// Savings API
export const savingsAPI = {
    getBalance: async (memberId) => {
        try {
            const q = query(
                collection(db, 'savings'),
                where('memberId', '==', memberId),
                limit(1)
            )
            const querySnapshot = await getDocs(q)
            return querySnapshot.empty ? null : querySnapshot.docs[0].data()
        } catch (error) {
            console.error('Error fetching savings balance:', error)
            throw error
        }
    },

    getTransactions: async (memberId, limitCount = 50) => {
        try {
            const q = query(
                collection(db, 'savings_transactions'),
                where('memberId', '==', memberId)
            )
            const querySnapshot = await getDocs(q)
            const transactions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            return transactions.sort((a, b) => {
                const aTime = a.date?.seconds || 0
                const bTime = b.date?.seconds || 0
                return bTime - aTime
            }).slice(0, limitCount)
        } catch (error) {
            console.error('Error fetching transactions:', error)
            throw error
        }
    },

    createTransaction: async (transactionData) => {
        try {
            const docRef = await addDoc(collection(db, 'savings_transactions'), {
                ...transactionData,
                date: serverTimestamp()
            })
            return { id: docRef.id, ...transactionData }
        } catch (error) {
            console.error('Error creating transaction:', error)
            throw error
        }
    }
}

// Loans API
export const loansAPI = {
    applyForLoan: async (loanData) => {
        try {
            console.log('💾 Creating loan document in Firestore...')
            const loan = await addDoc(collection(db, 'loans'), {
                ...loanData,
                status: 'pending_guarantors',
                totalRepaid: 0,
                createdAt: serverTimestamp(),
                guarantorsApproved: 0,
                guarantorsRequired: loanData.guarantorsRequired || 2
            })

            console.log('✅ Loan document created with ID:', loan.id)

            // Create guarantor approval requests if guarantors are provided
            if (loanData.guarantors && loanData.guarantors.length > 0) {
                console.log(`📧 Creating ${loanData.guarantors.length} guarantor approval requests...`)
                await Promise.all(
                    loanData.guarantors.map((guarantor, index) => {
                        console.log(`  Creating approval ${index + 1}/${loanData.guarantors.length} for ${guarantor.name}`)
                        return guarantorAPI.createGuarantorApproval({
                            loanId: loan.id,
                            guarantorMemberId: guarantor.memberId,
                            guarantorName: guarantor.name,
                            guarantorFileNumber: guarantor.fileNumber,
                            guarantorEmail: guarantor.email,
                            applicantName: loanData.applicantName,
                            loanAmount: loanData.amount,
                            loanPurpose: loanData.purpose
                        })
                    })
                )
                console.log('✅ All guarantor approvals created successfully')
            }

            return { id: loan.id, ...loanData }
        } catch (error) {
            console.error('❌ Error in applyForLoan:', error)
            throw error
        }
    },

    getLoans: async (memberId) => {
        try {
            const q = query(
                collection(db, 'loans'),
                where('memberId', '==', memberId)
            )
            const querySnapshot = await getDocs(q)
            const loans = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

            // Sort by createdAt in JavaScript to avoid needing a Firestore composite index
            return loans.sort((a, b) => {
                const aTime = a.createdAt?.seconds || 0
                const bTime = b.createdAt?.seconds || 0
                return bTime - aTime // Descending order (newest first)
            })
        } catch (error) {
            console.error('Error fetching loans:', error)
            throw error
        }
    },

    getAllLoans: async (status = null) => {
        try {
            let q = query(collection(db, 'loans'))

            if (status) {
                q = query(
                    collection(db, 'loans'),
                    where('status', '==', status)
                )
            }

            const querySnapshot = await getDocs(q)
            const loans = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

            return loans.sort((a, b) => {
                const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0
                const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0
                return bTime - aTime
            })
        } catch (error) {
            console.error('Error fetching all loans:', error)
            throw error
        }
    },

    updateLoanStatus: async (loanId, status, approvedBy = null) => {
        try {
            const loanRef = doc(db, 'loans', loanId)
            const updateData = {
                status,
                ...(status === 'approved' && {
                    approvedAt: serverTimestamp(),
                    approvedBy
                })
            }

            await updateDoc(loanRef, updateData)
            return { id: loanId, ...updateData }
        } catch (error) {
            console.error('Error updating loan status:', error)
            throw error
        }
    }
}

// Guarantor API
export const guarantorAPI = {
    createGuarantorApproval: async (approvalData) => {
        try {
            // Generate unique token
            const approvalToken = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

            // Calculate expiration (3 days from now)
            const expiresAt = new Date()
            expiresAt.setDate(expiresAt.getDate() + 3)

            const approval = await addDoc(collection(db, 'guarantor_approvals'), {
                ...approvalData,
                status: 'pending',
                approvalToken,
                createdAt: serverTimestamp(),
                expiresAt: Timestamp.fromDate(expiresAt)
            })

            // Send email notification to guarantor
            try {
                await emailService.sendGuarantorNotification(
                    approvalData.guarantorEmail,
                    {
                        applicantName: approvalData.applicantName,
                        loanAmount: approvalData.loanAmount,
                        loanPurpose: approvalData.loanPurpose,
                        approvalLink: `${window.location.origin}/guarantor-approval/${approvalToken}`
                    }
                )
            } catch (emailError) {
                console.error('Failed to send email notification:', emailError)
                // Don't fail the whole operation if email fails
            }

            return { id: approval.id, ...approvalData, approvalToken }
        } catch (error) {
            console.error('Error creating guarantor approval:', error)
            throw error
        }
    },

    getGuarantorApprovalsByLoan: async (loanId) => {
        try {
            const q = query(
                collection(db, 'guarantor_approvals'),
                where('loanId', '==', loanId)
            )
            const querySnapshot = await getDocs(q)
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        } catch (error) {
            console.error('Error fetching guarantor approvals:', error)
            throw error
        }
    },

    getGuarantorApprovalsByMember: async (memberId) => {
        try {
            const q = query(
                collection(db, 'guarantor_approvals'),
                where('guarantorMemberId', '==', memberId)
            )
            const querySnapshot = await getDocs(q)
            const approvals = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            return approvals.sort((a, b) => {
                const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0
                const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0
                return bTime - aTime
            })
        } catch (error) {
            console.error('Error fetching member guarantor requests:', error)
            throw error
        }
    },

    getGuarantorApprovalByToken: async (token) => {
        try {
            const q = query(
                collection(db, 'guarantor_approvals'),
                where('approvalToken', '==', token),
                limit(1)
            )
            const querySnapshot = await getDocs(q)
            if (querySnapshot.empty) return null

            const docSnap = querySnapshot.docs[0]
            return { id: docSnap.id, ...docSnap.data() }
        } catch (error) {
            console.error('Error fetching guarantor approval by token:', error)
            throw error
        }
    },

    updateGuarantorStatus: async (approvalId, status, reason = null) => {
        try {
            const approvalRef = doc(db, 'guarantor_approvals', approvalId)
            const updateData = {
                status,
                ...(status === 'approved' && { approvedAt: serverTimestamp() }),
                ...(reason && { rejectionReason: reason })
            }

            await updateDoc(approvalRef, updateData)

            // Get the approval to get loanId
            const approvalDoc = await getDoc(approvalRef)
            const approval = approvalDoc.data()

            // Update loan status if all guarantors have approved
            if (status === 'approved' && approval.loanId) {
                await guarantorAPI.checkAndUpdateLoanStatus(approval.loanId)
            }

            return { id: approvalId, ...updateData }
        } catch (error) {
            console.error('Error updating guarantor status:', error)
            throw error
        }
    },

    checkAndUpdateLoanStatus: async (loanId) => {
        try {
            const approvals = await guarantorAPI.getGuarantorApprovalsByLoan(loanId)
            const approvedCount = approvals.filter(a => a.status === 'approved').length
            const totalRequired = approvals.length

            // Update loan with guarantor approval count
            const loanRef = doc(db, 'loans', loanId)
            await updateDoc(loanRef, {
                guarantorsApproved: approvedCount,
                status: approvedCount >= totalRequired ? 'pending' : 'pending_guarantors'
            })
        } catch (error) {
            console.error('Error updating loan status:', error)
            throw error
        }
    }
}

// Commodities API
export const commoditiesAPI = {
    getAll: async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'commodities'))
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        } catch (error) {
            console.error('Error fetching commodities:', error)
            throw error
        }
    },

    getById: async (commodityId) => {
        try {
            const docRef = doc(db, 'commodities', commodityId)
            const docSnap = await getDoc(docRef)

            if (!docSnap.exists()) {
                throw new Error('Commodity not found')
            }

            return { id: docSnap.id, ...docSnap.data() }
        } catch (error) {
            console.error('Error fetching commodity:', error)
            throw error
        }
    },

    placeOrder: async (orderData) => {
        try {
            const order = await addDoc(collection(db, 'commodity_orders'), {
                ...orderData,
                status: 'pending',
                createdAt: serverTimestamp()
            })
            return { id: order.id, ...orderData }
        } catch (error) {
            console.error('Error placing order:', error)
            throw error
        }
    },

    getOrders: async (memberId) => {
        try {
            const q = query(
                collection(db, 'commodity_orders'),
                where('memberId', '==', memberId)
            )
            const querySnapshot = await getDocs(q)
            const orders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            return orders.sort((a, b) => {
                const aTime = a.createdAt?.seconds || 0
                const bTime = b.createdAt?.seconds || 0
                return bTime - aTime
            })
        } catch (error) {
            console.error('Error fetching orders:', error)
            throw error
        }
    },

    getAllOrders: async () => {
        try {
            const q = query(collection(db, 'commodity_orders'))
            const querySnapshot = await getDocs(q)
            const orders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            return orders.sort((a, b) => {
                const aTime = a.createdAt?.seconds || 0
                const bTime = b.createdAt?.seconds || 0
                return bTime - aTime
            })
        } catch (error) {
            console.error('Error fetching all orders:', error)
            throw error
        }
    }
}

// Members API (Admin)
export const membersAPI = {
    getAll: async () => {
        try {
            const q = query(collection(db, 'users'))
            const querySnapshot = await getDocs(q)
            const users = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            return users.sort((a, b) => {
                const aTime = a.joinedAt?.seconds || 0
                const bTime = b.joinedAt?.seconds || 0
                return bTime - aTime
            })
        } catch (error) {
            console.error('Error fetching members:', error)
            throw error
        }
    },

    getById: async (memberId) => {
        try {
            const q = query(
                collection(db, 'users'),
                where('memberId', '==', memberId),
                limit(1)
            )
            const querySnapshot = await getDocs(q)
            return querySnapshot.empty ? null : { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() }
        } catch (error) {
            console.error('Error fetching member:', error)
            throw error
        }
    },

    updateMember: async (documentId, updates) => {
        try {
            const memberRef = doc(db, 'users', documentId)
            await updateDoc(memberRef, updates)
            return { id: documentId, ...updates }
        } catch (error) {
            console.error('Error updating member:', error)
            throw error
        }
    }
}

// Wallet API
export const walletAPI = {
    // Get or create wallet for a member
    getWallet: async (memberId) => {
        try {
            const q = query(
                collection(db, 'wallets'),
                where('memberId', '==', memberId),
                limit(1)
            )
            const querySnapshot = await getDocs(q)

            if (querySnapshot.empty) {
                // Create wallet if it doesn't exist
                const walletData = {
                    memberId: memberId,
                    balance: 0,
                    currency: 'NGN',
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                }
                const walletRef = await addDoc(collection(db, 'wallets'), walletData)
                return { id: walletRef.id, ...walletData, balance: 0 }
            }

            return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() }
        } catch (error) {
            console.error('Error fetching wallet:', error)
            throw error
        }
    },

    // Record a transaction and update wallet balance
    recordTransaction: async (transactionData) => {
        try {
            // Get wallet
            const wallet = await walletAPI.getWallet(transactionData.memberId)

            // Calculate new balance
            const newBalance = wallet.balance + transactionData.amount

            // Update wallet balance
            const walletRef = doc(db, 'wallets', wallet.id)
            await updateDoc(walletRef, {
                balance: newBalance,
                updatedAt: serverTimestamp()
            })

            // Record transaction
            const transaction = await addDoc(collection(db, 'wallet_transactions'), {
                walletId: wallet.id,
                memberId: transactionData.memberId,
                type: 'credit',
                amount: transactionData.amount,
                paymentMethod: transactionData.paymentMethod || 'card',
                paystackReference: transactionData.paystackReference || null,
                description: transactionData.description || 'Wallet Top-up',
                status: 'success',
                createdAt: serverTimestamp()
            })

            return {
                id: transaction.id,
                newBalance: newBalance,
                ...transactionData
            }
        } catch (error) {
            console.error('Error recording transaction:', error)
            throw error
        }
    },

    // Get wallet transactions
    getTransactions: async (memberId, limitCount = 20) => {
        try {
            const q = query(
                collection(db, 'wallet_transactions'),
                where('memberId', '==', memberId)
            )
            const querySnapshot = await getDocs(q)
            const transactions = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }))

            // Sort by createdAt in JavaScript (newest first)
            return transactions.sort((a, b) => {
                const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0
                const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0
                return bTime - aTime
            }).slice(0, limitCount)
        } catch (error) {
            console.error('Error fetching transactions:', error)
            throw error
        }
    }
}
