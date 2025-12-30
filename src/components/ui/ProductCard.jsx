import { ShoppingCart, Tag, TrendingUp } from 'lucide-react'
import { formatCurrency } from '../../utils/formatters'
import Button from './Button'
import Card from './Card'

export default function ProductCard({ product, onRequest }) {
    return (
        <Card
            noPadding
            className="flex flex-col h-full overflow-hidden group hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
        >
            {/* Image Section */}
            <div className="h-56 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center relative overflow-hidden">
                {product.image ? (
                    <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                    />
                ) : (
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/5 blur-2xl"></div>
                        <ShoppingCart size={64} className="text-slate-300 dark:text-slate-600 relative z-10 group-hover:text-primary/40 transition-colors duration-300" />
                    </div>
                )}

                {/* Category Badge */}
                <div className="absolute top-4 left-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm text-slate-700 dark:text-slate-200 rounded-full shadow-lg border border-slate-200/50 dark:border-slate-700/50">
                        <Tag size={12} />
                        {product.category}
                    </span>
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>

            {/* Content Section */}
            <div className="p-5 sm:p-6 flex flex-col flex-1 bg-white dark:bg-slate-800">
                <div className="flex-1 mb-4">
                    <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white mb-2 line-clamp-2 group-hover:text-primary transition-colors min-h-[3rem]">
                        {product.name}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {product.description}
                    </p>
                </div>

                {/* Price and CTA Section */}
                <div className="space-y-3">
                    {/* Price */}
                    <div className="flex items-baseline justify-between">
                        <div>
                            <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-500 mb-1">
                                Price
                            </p>
                            <div className="flex items-baseline gap-1">
                                <p className="text-2xl sm:text-3xl font-black text-primary">
                                    {formatCurrency(product.price).split('.')[0]}
                                </p>
                                <p className="text-lg font-bold text-primary/60">
                                    .{formatCurrency(product.price).split('.')[1]}
                                </p>
                            </div>
                        </div>
                        {/* Installment Available Badge */}
                        <div className="text-right">
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-md">
                                <TrendingUp size={10} />
                                Installment
                            </span>
                        </div>
                    </div>

                    {/* Request Button */}
                    <Button
                        size="md"
                        onClick={() => onRequest(product)}
                        className="w-full shadow-md"
                        icon={<ShoppingCart size={16} />}
                    >
                        Request Item
                    </Button>
                </div>
            </div>
        </Card>
    )
}
