import { useState, useEffect } from 'react'
import { X, Upload, Image as ImageIcon, AlertCircle } from 'lucide-react'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../lib/firebase'
import Button from './ui/Button'
import Card from './ui/Card'
import Input from './ui/Input'

const CATEGORIES = [
    { id: 'foodstuff', label: 'Foodstuff' },
    { id: 'electronics', label: 'Electronics' },
    { id: 'solar', label: 'Solar & Power' },
    { id: 'appliances', label: 'Home Appliances' },
]

export default function AddEditProductModal({ isOpen, onClose, product, onSave }) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        categoryId: 'foodstuff',
        price: '',
        stockQuantity: '',
        imageUrl: '',
        isAvailable: true
    })
    const [imageFile, setImageFile] = useState(null)
    const [imagePreview, setImagePreview] = useState('')
    const [uploading, setUploading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    // Populate form when editing
    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name || '',
                description: product.description || '',
                categoryId: product.categoryId || 'foodstuff',
                price: product.price || '',
                stockQuantity: product.stockQuantity || '',
                imageUrl: product.imageUrl || '',
                isAvailable: product.isAvailable !== undefined ? product.isAvailable : true
            })
            setImagePreview(product.imageUrl || '')
        } else {
            // Reset form for new product
            setFormData({
                name: '',
                description: '',
                categoryId: 'foodstuff',
                price: '',
                stockQuantity: '',
                imageUrl: '',
                isAvailable: true
            })
            setImagePreview('')
        }
        setImageFile(null)
        setError('')
    }, [product, isOpen])

    const handleImageSelect = (e) => {
        const file = e.target.files[0]
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                setError('Image size must be less than 5MB')
                return
            }

            if (!file.type.startsWith('image/')) {
                setError('Please select a valid image file')
                return
            }

            setImageFile(file)
            setImagePreview(URL.createObjectURL(file))
            setError('')
        }
    }

    const uploadImage = async () => {
        if (!imageFile) return formData.imageUrl

        try {
            setUploading(true)
            const imageRef = ref(storage, `products/${Date.now()}_${imageFile.name}`)
            await uploadBytes(imageRef, imageFile)
            const downloadURL = await getDownloadURL(imageRef)
            return downloadURL
        } catch (error) {
            console.error('Error uploading image:', error)
            throw new Error('Failed to upload image')
        } finally {
            setUploading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        // Validation
        if (!formData.name.trim()) {
            setError('Product name is required')
            return
        }

        if (!formData.price || formData.price <= 0) {
            setError('Please enter a valid price')
            return
        }

        if (!formData.stockQuantity || formData.stockQuantity < 0) {
            setError('Please enter a valid stock quantity')
            return
        }

        setSaving(true)
        try {
            // Upload image if a new one was selected
            let imageUrl = formData.imageUrl
            if (imageFile) {
                imageUrl = await uploadImage()
            }

            const productData = {
                name: formData.name.trim(),
                description: formData.description.trim(),
                categoryId: formData.categoryId,
                price: Number(formData.price),
                stockQuantity: Number(formData.stockQuantity),
                imageUrl: imageUrl || '',
                isAvailable: formData.isAvailable
            }

            await onSave(productData)
            onClose()
        } catch (error) {
            console.error('Error saving product:', error)
            setError(error.message || 'Failed to save product')
        } finally {
            setSaving(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {product ? 'Edit Product' : 'Add New Product'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                        <X size={24} />
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
                        <AlertCircle className="text-red-600 dark:text-red-400" size={20} />
                        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Image Upload */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                            Product Image
                        </label>
                        <div className="flex flex-col items-center gap-4">
                            {imagePreview ? (
                                <div className="relative w-full h-48 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden">
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setImagePreview('')
                                            setImageFile(null)
                                            setFormData({ ...formData, imageUrl: '' })
                                        }}
                                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div className="w-full h-48 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                                    <ImageIcon size={48} className="text-slate-400" />
                                </div>
                            )}

                            <label className="cursor-pointer">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                    className="hidden"
                                />
                                <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2">
                                    <Upload size={18} />
                                    {imagePreview ? 'Change Image' : 'Upload Image'}
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Product Name */}
                    <Input
                        label="Product Name"
                        required
                        placeholder="e.g., Bag of Rice 50kg"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                            Description
                        </label>
                        <textarea
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            rows="3"
                            placeholder="Brief description of the product..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                            Category <span className="text-red-500">*</span>
                        </label>
                        <select
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                            value={formData.categoryId}
                            onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                            required
                        >
                            {CATEGORIES.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Price and Stock */}
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Price (₦)"
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        />
                        <Input
                            label="Stock Quantity"
                            type="number"
                            required
                            min="0"
                            placeholder="0"
                            value={formData.stockQuantity}
                            onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                        />
                    </div>

                    {/* Availability Toggle */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <div>
                            <p className="font-semibold text-slate-900 dark:text-white">Product Available</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Members can see and order this product
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.isAvailable}
                                onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            loading={saving || uploading}
                            className="flex-1"
                        >
                            {uploading ? 'Uploading...' : saving ? 'Saving...' : product ? 'Update Product' : 'Add Product'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    )
}
