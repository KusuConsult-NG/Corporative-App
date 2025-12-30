import { ShoppingCart } from 'lucide-react'
import { formatCurrency } from '../../utils/formatters'
import Button from './Button'
import Card from './Card'

export default function ProductCard({ product, onRequest }) {
    return (
        <Card
            noPadding
            className="flex flex-col h-full overflow-hidden group hover:border-primary/50 transition-all duration-300 hover:shadow-md"
        >
            {/* Image Placeholder */}
            <div className="h-48 bg-slate-100 dark:bg-slate-800 flex items-center justify-center relative overflow-hidden shrink-0">
                {product.image ? (
                    <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <ShoppingCart size={48} className="text-slate-300 dark:text-slate-600" />
                )}

                {/* Category Badge */}
                <div className="absolute top-3 left-3">
                    <span className="px-2 py-1 text-xs font-bold bg-white/90 dark:bg-slate-900/90 backdrop-blur text-slate-700 dark:text-slate-300 rounded-lg shadow-sm">
                        {product.category}
                    </span>
                </div>
            </div>

            <div className="p-5 flex flex-col flex-1">
                <div className="flex-1">
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1 line-clamp-1">
                        {product.name}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">
                        {product.description}
                    </p>
                </div>

                <div className="mt-4 flex items-end justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/50 flex-wrap">
                    <div className="flex-grow min-w-fit">
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500 mb-0.5">
                            Price
                        </p>
                        <p className="text-xl font-bold text-primary whitespace-nowrap">
                            {formatCurrency(product.price)}
                        </p>
                    </div>
                    <Button
                        size="sm"
                        onClick={() => onRequest(product)}
                        className="shadow-sm whitespace-nowrap"
                    >
                        Request
                    </Button>
                </div>
            </div>
        </Card>
    )
}
