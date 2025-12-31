import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '../lib/firebase'

/**
 * Upload passport photo to Firebase Storage
 * @param {File} file - The image file to upload
 * @param {string} userId - The user's ID
 * @returns {Promise<string>} - The download URL of the uploaded file
 */
export const uploadPassport = async (file, userId) => {
    try {
        // Validate file type - check both MIME type and extension
        const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
        const validExtensions = ['jpg', 'jpeg', 'png', 'webp']

        const fileExtension = file.name.split('.').pop().toLowerCase()
        const isValidMime = validMimeTypes.includes(file.type)
        const isValidExtension = validExtensions.includes(fileExtension)

        if (!isValidMime && !isValidExtension) {
            throw new Error('Invalid file type. Please upload a JPG, PNG, or WebP image.')
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024 // 5MB
        if (file.size > maxSize) {
            throw new Error('File size too large. Maximum size is 5MB.')
        }

        // Create a unique file name
        const timestamp = Date.now()
        // Use extension from name if available, otherwise fallback to 'jpg'
        const finalExtension = isValidExtension ? fileExtension : (file.type.split('/')[1] || 'jpg')
        const fileName = `passports/${userId}_${timestamp}.${finalExtension}`

        // Create a reference to the file location
        const storageRef = ref(storage, fileName)

        // Upload the file
        await uploadBytes(storageRef, file)

        // Get the download URL
        const downloadURL = await getDownloadURL(storageRef)

        return downloadURL
    } catch (error) {
        console.error('Detailed storage upload error:', {
            code: error.code,
            message: error.message,
            userId,
            fileName: file.name
        })

        if (error.code === 'storage/unauthorized') {
            throw new Error('Upload permission denied. Please ensure you are logged in.')
        } else if (error.code === 'storage/quota-exceeded') {
            throw new Error('Storage quota exceeded. Please contact support.')
        }

        throw new Error(error.message || 'Failed to upload image to server.')
    }
}

/**
 * Get the passport photo URL for a user
 * @param {string} userId - The user's ID
 * @returns {Promise<string|null>} - The download URL or null if not found
 */
export const getPassportURL = async (userId) => {
    try {
        const storageRef = ref(storage, `passports/${userId}`)
        const downloadURL = await getDownloadURL(storageRef)
        return downloadURL
    } catch (error) {
        // File doesn't exist
        return null
    }
}

/**
 * Delete old passport photo
 * @param {string} passportURL - The URL of the passport to delete
 */
export const deletePassport = async (passportURL) => {
    try {
        if (!passportURL || !passportURL.startsWith('http')) return

        // Create a reference from the URL directly
        const storageRef = ref(storage, passportURL)
        await deleteObject(storageRef)
    } catch (error) {
        console.error('Error deleting passport:', error)
        // Don't throw - deletion failure shouldn't block upload
    }
}
