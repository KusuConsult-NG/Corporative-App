// Currency formatter
export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 2,
    }).format(amount).replace('NGN', '₦')
}

// Date formatter
export const formatDate = (date, format = 'MMM dd, yyyy') => {
    if (!date) return ''
    const d = new Date(date)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    if (format === 'MMM dd, yyyy') {
        return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
    }

    // Add more formats as needed
    return d.toLocaleDateString()
}

// Number formatter
export const formatNumber = (num) => {
    return new Intl.NumberFormat('en-NG').format(num)
}

// Truncate text
export const truncate = (text, length = 50) => {
    if (!text) return ''
    return text.length > length ? text.substring(0, length) + '...' : text
}

// Class name merger
export const cn = (...classes) => {
    return classes.filter(Boolean).join(' ')
}
