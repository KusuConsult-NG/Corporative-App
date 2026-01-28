import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Wallet,
    TrendingUp,
    Calendar,
    Download,
    ArrowUpRight,
    ArrowDownLeft,
    PieChart,
    Settings,
    MoreHorizontal,
    Plus
} from 'lucide-react'
import { formatCurrency, formatDate } from '../../utils/formatters'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import AddFundsModal from '../../components/AddFundsModal'
import VirtualAccountCard from '../../components/VirtualAccountCard'
import { walletAPI } from '../../services/api'
import { paystackService } from '../../services/paystackService'
import { useAuthStore } from '../../store/authStore'

export default function SavingsPage() {
    const navigate = useNavigate()
    const { user } = useAuthStore()
    const [wallet, setWallet] = useState(null)
    const [transactions, setTransactions] = useState([])
    const [virtualAccount, setVirtualAccount] = useState(null)
    const [loading, setLoading] = useState(true)
    const [loadingAccount, setLoadingAccount] = useState(true)
    const [showAddFunds, setShowAddFunds] = useState(false)

    // Fetch wallet and transactions
    useEffect(() => {
        const fetchWalletData = async () => {
            if (!user?.memberId) return

            try {
                setLoading(true)
                const walletData = await walletAPI.getWallet(user.memberId)
                const transactionsData = await walletAPI.getTransactions(user.memberId)

                setWallet(walletData)
                setTransactions(transactionsData)
            } catch (error) {
                console.error('Error fetching wallet data:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchWalletData()
    }, [user?.memberId])

    // Fetch virtual account
    useEffect(() => {
        const fetchVirtualAccount = async () => {
            if (!user?.memberId) return
            try {
                setLoadingAccount(true)
                const account = await paystackService.getVirtualAccount(user.memberId)
                setVirtualAccount(account)
            } catch (error) {
                console.error('Error fetching virtual account:', error)
            } finally {
                setLoadingAccount(false)
            }
        }
        fetchVirtualAccount()
    }, [user?.memberId])

    // Refresh wallet after adding funds
    const handleFundsAdded = async () => {
        const walletData = await walletAPI.getWallet(user.memberId)
        const transactionsData = await walletAPI.getTransactions(user.memberId)
        setWallet(walletData)
        setTransactions(transactionsData)
    }

    // Calculate stats
    const totalCredits = transactions.filter(tx => tx.type === 'credit').reduce((sum, tx) => sum + tx.amount, 0)
    const monthlyAverage = transactions.length > 0 ? totalCredits / Math.max(transactions.length, 1) : 0

    if (loading) {
        return (
            <div className="p-6 lg:p-10 max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto flex flex-col gap-8">
            {/* Virtual Account Activation Banner (if not activated) */}
            {!virtualAccount && !loadingAccount && (
                <Card className="bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/30">
                    <div className="p-6 flex items-start gap-4">
                        <div className="size-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                            <Wallet className="text-primary" size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">
                                Get Your Virtual Account
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                                Receive deposits instantly with a dedicated Nigerian bank account.
                                No charges, instant deposits, and CBN-compliant.
                            </p>
                            <div className="flex flex-wrap gap-2 mb-4">
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-100 dark:bg-green-900/30 text-xs font-semibold text-green-700 dark:text-green-400">
                                    ✓ Instant Deposits
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/30 text-xs font-semibold text-blue-700 dark:text-blue-400">
                                    ✓ No Charges
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-100 dark:bg-purple-900/30 text-xs font-semibold text-purple-700 dark:text-purple-400">
                                    ✓ CBN-Compliant
                                </span>
                            </div>
                            <Button
                                onClick={() => navigate('/member/wallet-onboarding')}
                                className="bg-primary hover:bg-primary/90"
                            >
                                Activate Virtual Account →
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {/* Virtual Account Section */}
            <VirtualAccountCard accountData={virtualAccount} loading={loadingAccount} />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My Wallet</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        Manage your virtual wallet and view transaction history
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => navigate('/member/settings')}>
                        <Settings size={20} />
                        Settings
                    </Button>
                    <Button onClick={() => setShowAddFunds(true)}>
                        <Plus size={20} />
                        Add Funds
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Balance */}
                <Card className="relative overflow-hidden group hover:border-primary/50 transition-colors">
                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Wallet size={100} className="text-primary" />
                    </div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="size-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                            <Wallet size={24} />
                        </div>
                        {wallet && wallet.balance > 0 && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                <ArrowUpRight size={12} />
                                Active
                            </span>
                        )}
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Wallet Balance</p>
                        <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                            {formatCurrency(wallet?.balance || 0).split('.')[0]}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                            Last updated: {wallet ? formatDate(new Date()) : 'N/A'}
                        </p>
                    </div>
                </Card>

                {/* Total Added */}
                <Card className="group hover:border-primary/50 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                        <div className="size-12 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-500">
                            <TrendingUp size={24} />
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Total Added</p>
                        <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                            {formatCurrency(totalCredits).split('.')[0]}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </Card>

                {/* Average Transaction */}
                <Card className="group hover:border-primary/50 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                        <div className="size-12 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-500">
                            <PieChart size={24} />
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Average Add</p>
                        <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                            {formatCurrency(monthlyAverage).split('.')[0]}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                            Per transaction
                        </p>
                    </div>
                </Card>
            </section>

            {/* Transaction History */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Transaction History</h2>
                </div>

                {transactions.length === 0 ? (
                    <Card className="text-center py-12">
                        <div className="flex flex-col items-center gap-4">
                            <div className="size-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <Wallet size={32} className="text-slate-400" />
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                                    No Transactions Yet
                                </h4>
                                <p className="text-slate-500 dark:text-slate-400">
                                    Add funds to your wallet to get started
                                </p>
                            </div>
                            <Button onClick={() => setShowAddFunds(true)} className="mt-4">
                                <Plus size={20} />
                                Add Funds Now
                            </Button>
                        </div>
                    </Card>
                ) : (
                    <Card className="overflow-hidden p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Date</th>
                                        <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Description</th>
                                        <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Method</th>
                                        <th className="px-6 py-4 text-right font-semibold text-slate-600 dark:text-slate-400">Amount</th>
                                        <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-400">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {transactions.map((tx) => (
                                        <tr
                                            key={tx.id}
                                            className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                                        >
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                                {tx.createdAt ? formatDate(new Date(tx.createdAt.seconds * 1000)) : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                                {tx.description || 'Wallet Top-up'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold capitalize bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                    {tx.paymentMethod === 'card' ? 'Card' : tx.paymentMethod === 'bank_transfer' ? 'Bank' : 'USSD'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-green-600 dark:text-green-500">
                                                +{formatCurrency(tx.amount)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                    {tx.status === 'success' ? 'Successful' : tx.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
            </section>

            {/* Add Funds Modal */}
            <AddFundsModal
                isOpen={showAddFunds}
                onClose={() => setShowAddFunds(false)}
                onSuccess={handleFundsAdded}
            />
        </div>
    )
}
