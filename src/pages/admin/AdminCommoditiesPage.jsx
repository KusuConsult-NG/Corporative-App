import { ShoppingCart, Plus, Package, Truck } from 'lucide-react'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import { formatCurrency } from '../../utils/formatters'

export default function AdminCommoditiesPage() {
    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto flex flex-col gap-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Commodities Admin</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        Manage inventory and member orders
                    </p>
                </div>
                <Button>
                    <Plus size={20} />
                    Add New Product
                </Button>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 flex items-center gap-4">
                    <div className="size-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 flex items-center justify-center">
                        <Package size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Total Products</p>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">24</h3>
                    </div>
                </Card>
                <Card className="p-6 flex items-center gap-4">
                    <div className="size-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                        <Truck size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Pending Orders</p>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">8</h3>
                    </div>
                </Card>
                <Card className="p-6 flex items-center gap-4">
                    <div className="size-12 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600 flex items-center justify-center">
                        <ShoppingCart size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Total Sales (Mo)</p>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(8500000)}</h3>
                    </div>
                </Card>
            </div>

            {/* Inventory List */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Inventory</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i} className="p-0 overflow-hidden group">
                            <div className="h-40 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <Package size={48} className="text-slate-300" />
                            </div>
                            <div className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-slate-900 dark:text-white">Bag of Rice 50kg</h3>
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">In Stock</span>
                                </div>
                                <p className="text-sm text-slate-500 mb-4">Stock: 150 units</p>
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-primary">{formatCurrency(45000)}</span>
                                    <Button size="sm" variant="outline">Edit</Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    )
}
