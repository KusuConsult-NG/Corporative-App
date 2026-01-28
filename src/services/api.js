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
    /**
     * Send guarantor approval email (NEW MODE - uses Cloud Function)
     */
    sendGuarantorApprovalEmail: async (loanApplicationId, guarantorEmail, borrowerName, loanAmount, loanPurpose) => {
        try {
            const { getFunctions, httpsCallable } = await import('firebase/functions')
            const { app } = await import('../lib/firebase')

            const functions = getFunctions(app)
            const sendEmail = httpsCallable(functions, 'sendGuarantorApprovalEmail')

            const result = await sendEmail({
                loanApplicationId,
                guarantorEmail,
                borrowerName,
                loanAmount,
                loanPurpose
            })

            return result.data
        } catch (error) {
            console.error('Error sending guarantor email:', error)
            throw error
        }
    },

    /**
     * Get guarantor approval details by token (PUBLIC - no auth required)
     */
    getGuarantorApprovalByToken: async (token) => {
        try {
            const { getFunctions, httpsCallable } = await import('firebase/functions')
            const { app } = await import('../lib/firebase')

            const functions = getFunctions(app)
            const getApproval = httpsCallable(functions, 'getGuarantorApprovalByToken')

            const result = await getApproval({ token })
            return result.data
        } catch (error) {
            console.error('Error getting guarantor approval:', error)
            throw error
        }
    },

    /**
     * Approve guarantor request (PUBLIC - no auth required)
     */
    updateGuarantorStatus: async (token, status, reason = null) => {
        try {
            const { getFunctions, httpsCallable } = await import('firebase/functions')
            const { app } = await import('../lib/firebase')

            const functions = getFunctions(app)

            if (status === 'approved') {
                const approveRequest = httpsCallable(functions, 'approveGuarantorRequest')
                const result = await approveRequest({ token })
                return result.data
            } else if (status === 'rejected') {
                const rejectRequest = httpsCallable(functions, 'rejectGuarantorRequest')
                const result = await rejectRequest({ token, reason })
                return result.data
            } else {
                throw new Error(`Invalid status: ${status}`)
            }
        } catch (error) {
            console.error('Error updating guarantor status:', error)
            throw error
        }
    },

    /**
     * Resend guarantor approval email
     */
    resendGuarantorApprovalEmail: async (loanApplicationId) => {
        try {
            const { getFunctions, httpsCallable } = await import('firebase/functions')
            const { app } = await import('../lib/firebase')

            const functions = getFunctions(app)
            const resendEmail = httpsCallable(functions, 'resendGuarantorApprovalEmail')

            const result = await resendEmail({ loanApplicationId })
            return result.data
        } catch (error) {
            console.error('Error resending guarantor email:', error)
            throw error
        }
    },

    // LEGACY METHODS (kept for backward compatibility, will be removed later)
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

    create: async (productData) => {
        try {
            const product = await addDoc(collection(db, 'commodities'), {
                ...productData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            })
            return { id: product.id, ...productData }
        } catch (error) {
            console.error('Error creating product:', error)
            throw error
        }
    },

    update: async (commodityId, updates) => {
        try {
            const commodityRef = doc(db, 'commodities', commodityId)
            await updateDoc(commodityRef, {
                ...updates,
                updatedAt: serverTimestamp()
            })
            return { id: commodityId, ...updates }
        } catch (error) {
            console.error('Error updating product:', error)
            throw error
        }
    },

    delete: async (commodityId) => {
        try {
            // Check if there are any pending orders for this product
            const ordersQuery = query(
                collection(db, 'commodityOrders'),
                where('productId', '==', commodityId),
                where('status', 'in', ['pending_approval', 'approved', 'processing'])
            )
            const ordersSnapshot = await getDocs(ordersQuery)

            if (!ordersSnapshot.empty) {
                throw new Error('Cannot delete product with active orders')
            }

            // Delete the product
            await deleteDoc(doc(db, 'commodities', commodityId))
            return { id: commodityId }
        } catch (error) {
            console.error('Error deleting product:', error)
            throw error
        }
    },

    getStatistics: async () => {
        try {
            // Get total products
            const productsSnapshot = await getDocs(collection(db, 'commodities'))
            const totalProducts = productsSnapshot.size

            // Get pending orders
            const pendingOrdersQuery = query(
                collection(db, 'commodityOrders'),
                where('status', '==', 'pending_approval')
            )
            const pendingSnapshot = await getDocs(pendingOrdersQuery)
            const pendingOrders = pendingSnapshot.size

            // Get current month's sales
            const now = new Date()
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

            const allOrdersSnapshot = await getDocs(collection(db, 'commodityOrders'))
            let monthlySales = 0

            allOrdersSnapshot.docs.forEach(doc => {
                const order = doc.data()
                const orderDate = order.orderedAt?.toDate?.() || order.createdAt?.toDate?.()

                if (orderDate && orderDate >= firstDayOfMonth) {
                    monthlySales += order.totalAmount || 0
                }
            })

            // Calculate low stock count
            let lowStockCount = 0
            productsSnapshot.docs.forEach(doc => {
                const product = doc.data()
                if (product.stockQuantity && product.stockQuantity < 20) {
                    lowStockCount++
                }
            })

            return {
                totalProducts,
                pendingOrders,
                monthlySales,
                lowStockCount
            }
        } catch (error) {
            console.error('Error fetching statistics:', error)
            throw error
        }
    },

    placeOrder: async (orderData) => {
        try {
            const order = await addDoc(collection(db, 'commodityOrders'), {
                ...orderData,
                status: 'pending_approval',
                orderedAt: serverTimestamp()
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
                collection(db, 'commodityOrders'),
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
            const q = query(collection(db, 'commodityOrders'))
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
