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
        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png']
        if (!validTypes.includes(file.type)) {
            throw new Error('Invalid file type. Please upload a JPG or PNG image.')
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024 // 5MB
        if (file.size > maxSize) {
            throw new Error('File size too large. Maximum size is 5MB.')
        }

        // Create a unique file name
        const timestamp = Date.now()
        const fileName = `passports/${userId}_${timestamp}.${file.type.split('/')[1]}`

        // Create a reference to the file location
        const storageRef = ref(storage, fileName)

        // Upload the file
        await uploadBytes(storageRef, file)

        // Get the download URL
        const downloadURL = await getDownloadURL(storageRef)

        return downloadURL
    } catch (error) {
        console.error('Error uploading passport:', error)
        throw error
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
        if (!passportURL) return

        // Extract the file path from the URL
        const url = new URL(passportURL)
        const pathMatch = url.pathname.match(/\/o\/(.+?)\?/)

        if (pathMatch && pathMatch[1]) {
            const filePath = decodeURIComponent(pathMatch[1])
            const storageRef = ref(storage, filePath)
            await deleteObject(storageRef)
        }
    } catch (error) {
        console.error('Error deleting passport:', error)
        // Don't throw - deletion failure shouldn't block upload
    }
}
