import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ShoppingBag, Truck, Zap, Home, Grid, Smartphone } from 'lucide-react'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import ProductCard from '../../components/ui/ProductCard'

// Mock Data
const CATEGORIES = [
    { id: 'all', label: 'All Items', icon: Grid },
    { id: 'foodstuff', label: 'Foodstuff', icon: ShoppingBag },
    { id: 'electronics', label: 'Electronics', icon: Smartphone },
    { id: 'solar', label: 'Solar & Power', icon: Zap },
    { id: 'appliances', label: 'Home Appliances', icon: Home },
]

const PRODUCTS = [
    {
        id: 1,
        name: 'Bag of Rice (50kg)',
        category: 'Foodstuff',
        categoryId: 'foodstuff',
        price: 65000,
        description: 'Premium parboiled rice, stone-free and clean. 50kg bag.',
        image: null
    },
    {
        id: 2,
        name: 'Samsung Galaxy A54',
        category: 'Electronics',
        categoryId: 'electronics',
        price: 450000,
        description: '256GB storage, 8GB RAM, 5G compatible smartphone.',
        image: null
    },
    {
        id: 3,
        name: '3.5kVA Solar Inverter System',
        category: 'Solar & Power',
        categoryId: 'solar',
        price: 1200000,
        description: 'Complete installation including panels, batteries and inverter.',
        image: null
    },
    {
        id: 4,
        name: 'Vegetable Oil (25L)',
        category: 'Foodstuff',
        categoryId: 'foodstuff',
        price: 45000,
        description: 'High quality vegetable oil for cooking and frying.',
        image: null
    },
    {
        id: 5,
        name: 'Double Door Refrigerator',
        category: 'Home Appliances',
        categoryId: 'appliances',
        price: 550000,
        description: 'Energy saving double door aesthetic refrigerator.',
        image: null
    },
    {
        id: 6,
        name: 'Smart TV 55"',
        category: 'Electronics',
        categoryId: 'electronics',
        price: 380000,
        description: '4K UHD Smart TV with built-in Netflix and YouTube.',
        image: null
    }
]

export default function CommoditiesPage() {
    const navigate = useNavigate()
    const [selectedCategory, setSelectedCategory] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [requesting, setRequesting] = useState(null)

    const filteredProducts = PRODUCTS.filter(product => {
        const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.description.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesCategory && matchesSearch
    })

    const handleRequest = (product) => {
        if (confirm(`Are you sure you want to request purchase for ${product.name}?`)) {
            setRequesting(product.id)
            // Simulate API call
            setTimeout(() => {
                alert('Request sent successfully! Admin will contact you specifically regarding delivery.')
                setRequesting(null)
            }, 1000)
        }
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
                {filteredProducts.length > 0 ? (
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
        </div>
    )
}
