import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ShoppingBag, Truck, Zap, Home, Grid, Smartphone } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { requirePayment } from '../../utils/paymentUtils'
import { commoditiesAPI } from '../../services/api'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import ProductCard from '../../components/ui/ProductCard'
import CommodityOrderModal from '../../components/CommodityOrderModal'

// Category Configuration
const CATEGORIES = [
    { id: 'all', label: 'All Items', icon: Grid },
    { id: 'foodstuff', label: 'Foodstuff', icon: ShoppingBag },
    { id: 'electronics', label: 'Electronics', icon: Smartphone },
    { id: 'solar', label: 'Solar & Power', icon: Zap },
    { id: 'appliances', label: 'Home Appliances', icon: Home },
]

export default function CommoditiesPage() {
    const navigate = useNavigate()
    const { user } = useAuthStore()
    const [selectedCategory, setSelectedCategory] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedProduct, setSelectedProduct] = useState(null)
    const [showOrderModal, setShowOrderModal] = useState(false)
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)

    // Check payment status on mount
    useEffect(() => {
        const checkPayment = async () => {
            await requirePayment(user, navigate, 'order commodities')
        }
        if (user) {
            checkPayment()
        }
    }, [user, navigate])

    // Fetch commodities from Firebase
    useEffect(() => {
        const fetchCommodities = async () => {
            try {
                setLoading(true)
                const data = await commoditiesAPI.getAll()
                setProducts(data)
            } catch (error) {
                console.error('Error fetching commodities:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchCommodities()
    }, [])

    const filteredProducts = products.filter(product => {
        const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory
        const matchesSearch = product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.description?.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesCategory && matchesSearch
    })

    const handleRequest = (product) => {
        setSelectedProduct(product)
        setShowOrderModal(true)
    }

    const closeOrderModal = () => {
        setShowOrderModal(false)
        setSelectedProduct(null)
    }

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto flex flex-col gap-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Marketplace</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        Purchase commodities on credit/installments
                    </p>
                </div>
                <Button onClick={() => navigate('/member/orders')}>
                    <Truck size={20} />
                    View My Orders
                </Button>
            </div>

            {/* Search and Filter */}
            <div className="space-y-6">
                <div className="w-full md:w-96">
                    <Input
                        placeholder="Search products..."
                        icon={Search}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Category Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {CATEGORIES.map((category) => {
                        const Icon = category.icon
                        return (
                            <button
                                key={category.id}
                                onClick={() => setSelectedCategory(category.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all whitespace-nowrap border ${selectedCategory === category.id
                                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/25'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary/50 dark:hover:border-primary/50'
                                    }`}
                            >
                                <Icon size={18} />
                                {category.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {loading ? (
                    <div className="col-span-full py-16 text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                        <p className="text-slate-600 dark:text-slate-400">Loading commodities...</p>
                    </div>
                ) : filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            onRequest={handleRequest}
                        />
                    ))
                ) : (
                    <div className="col-span-full py-12 text-center">
                        <div className="mx-auto size-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-4">
                            <Search size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                            No products found
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400">
                            Try adjusting your search or category filter
                        </p>
                    </div>
                )}
            </div>

            {/* Commodity Order Modal */}
            <CommodityOrderModal
                isOpen={showOrderModal}
                onClose={closeOrderModal}
                product={selectedProduct}
            />
        </div>
    )
}
