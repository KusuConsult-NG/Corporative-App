import { useState, useEffect } from 'react'
import { ShoppingCart, Plus, Package, Truck, AlertTriangle, Search, Edit2, Trash2 } from 'lucide-react'
import { commoditiesAPI } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import AddEditProductModal from '../../components/AddEditProductModal'
import { formatCurrency } from '../../utils/formatters'

export default function AdminCommoditiesPage() {
    const { user } = useAuthStore()
    const [products, setProducts] = useState([])
    const [statistics, setStatistics] = useState({
        totalProducts: 0,
        pendingOrders: 0,
        monthlySales: 0,
        lowStockCount: 0
    })
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [selectedProduct, setSelectedProduct] = useState(null)
    const [deleteConfirm, setDeleteConfirm] = useState(null)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const [productsData, statsData] = await Promise.all([
                commoditiesAPI.getAll(),
                commoditiesAPI.getStatistics()
            ])
            setProducts(productsData)
            setStatistics(statsData)
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSaveProduct = async (productData) => {
        try {
            if (selectedProduct) {
                // Update existing product
                await commoditiesAPI.update(selectedProduct.id, productData)
            } else {
                // Create new product
                await commoditiesAPI.create(productData)
            }
            await fetchData()
            setShowModal(false)
            setSelectedProduct(null)
        } catch (error) {
            console.error('Error saving product:', error)
            throw error
        }
    }

    const handleEditProduct = (product) => {
        setSelectedProduct(product)
        setShowModal(true)
    }

    const handleDeleteProduct = async (productId) => {
        try {
            await commoditiesAPI.delete(productId)
            await fetchData()
            setDeleteConfirm(null)
        } catch (error) {
            console.error('Error deleting product:', error)
            alert(error.message || 'Failed to delete product')
        }
    }

    const filteredProducts = products.filter(product =>
        product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto flex flex-col gap-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Product Management</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        Manage marketplace inventory and pricing
                    </p>
                </div>
                <Button onClick={() => {
                    setSelectedProduct(null)
                    setShowModal(true)
                }}>
                    <Plus size={20} />
                    Add New Product
                </Button>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="p-6 flex items-center gap-4">
                    <div className="size-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 flex items-center justify-center">
                        <Package size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Total Products</p>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                            {loading ? '...' : statistics.totalProducts}
                        </h3>
                    </div>
                </Card>
                <Card className="p-6 flex items-center gap-4">
                    <div className="size-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                        <Truck size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Pending Orders</p>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                            {loading ? '...' : statistics.pendingOrders}
                        </h3>
                    </div>
                </Card>
                <Card className="p-6 flex items-center gap-4">
                    <div className="size-12 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600 flex items-center justify-center">
                        <ShoppingCart size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Monthly Sales</p>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                            {loading ? '...' : formatCurrency(statistics.monthlySales)}
                        </h3>
                    </div>
                </Card>
                <Card className="p-6 flex items-center gap-4">
                    <div className="size-12 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Low Stock</p>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                            {loading ? '...' : statistics.lowStockCount}
                        </h3>
                    </div>
                </Card>
            </div>

            {/* Search */}
            <div className="w-full md:w-96">
                <Input
                    placeholder="Search products..."
                    icon={Search}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Products Grid */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Inventory</h2>

                {loading ? (
                    <div className="py-16 text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                        <p className="text-slate-600 dark:text-slate-400">Loading products...</p>
                    </div>
                ) : filteredProducts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {filteredProducts.map((product) => (
                            <Card key={product.id} className="p-0 overflow-hidden group">
                                <div className="h-40 bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                                    {product.imageUrl ? (
                                        <img
                                            src={product.imageUrl}
                                            alt={product.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <Package size={48} className="text-slate-300" />
                                    )}
                                </div>
                                <div className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-slate-900 dark:text-white line-clamp-2 flex-1">
                                            {product.name}
                                        </h3>
                                        <span className={`text-xs px-2 py-0.5 rounded ml-2 whitespace-nowrap ${product.isAvailable
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                                            }`}>
                                            {product.isAvailable ? 'Available' : 'Unavailable'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 capitalize">
                                        {product.categoryId}
                                    </p>
                                    <p className={`text-sm mb-4 ${product.stockQuantity < 20
                                            ? 'text-red-600 dark:text-red-400 font-semibold'
                                            : 'text-slate-500 dark:text-slate-400'
                                        }`}>
                                        Stock: {product.stockQuantity} units
                                    </p>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-bold text-primary">
                                            {formatCurrency(product.price)}
                                        </span>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleEditProduct(product)}
                                                title="Edit"
                                            >
                                                <Edit2 size={16} />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setDeleteConfirm(product)}
                                                title="Delete"
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="py-12 text-center">
                        <div className="mx-auto size-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-4">
                            <Package size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                            No products found
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-4">
                            {searchQuery ? 'Try adjusting your search' : 'Get started by adding your first product'}
                        </p>
                        {!searchQuery && (
                            <Button onClick={() => {
                                setSelectedProduct(null)
                                setShowModal(true)
                            }}>
                                <Plus size={20} />
                                Add Product
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Add/Edit Product Modal */}
            <AddEditProductModal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false)
                    setSelectedProduct(null)
                }}
                product={selectedProduct}
                onSave={handleSaveProduct}
            />

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="max-w-md w-full">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                            Delete Product
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-6">
                            Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?
                            This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => handleDeleteProduct(deleteConfirm.id)}
                                className="flex-1 bg-red-600 hover:bg-red-700"
                            >
                                <Trash2 size={18} />
                                Delete
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    )
}
