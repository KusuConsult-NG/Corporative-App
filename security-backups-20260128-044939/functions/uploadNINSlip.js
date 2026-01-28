const functions = require('firebase-functions')
const admin = require('firebase-admin')
const { Storage } = require('@google-cloud/storage')
const crypto = require('crypto')

const storage = new Storage()

/**
 * Upload NIN slip to Firebase Storage
 * Required for Tier 2 and Tier 3 accounts
 */
exports.uploadNINSlip = functions.https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }

    const { fileData, fileName, fileType } = data

    if (!fileData || !fileName) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing file data or name')
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    if (!allowedTypes.includes(fileType)) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Invalid file type. Only JPG, PNG, and PDF are allowed'
        )
    }

    // Validate file size (fileData is base64, so calculate original size)
    const base64Length = fileData.length - (fileData.indexOf(',') + 1)
    const fileSizeBytes = (base64Length * 3) / 4
    const maxSizeBytes = 5 * 1024 * 1024 // 5MB

    if (fileSizeBytes > maxSizeBytes) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'File size exceeds 5MB limit'
        )
    }

    try {
        const userId = context.auth.uid
        const db = admin.firestore()

        // Generate unique filename to prevent overwrites
        const timestamp = Date.now()
        const fileExtension = fileName.split('.').pop()
        const sanitizedFileName = `nin_slip_${timestamp}.${fileExtension}`

        // Storage path: nin_slips/{userId}/{filename}
        const bucketName = functions.config().firebase?.storageBucket || `${admin.instanceId().app.options.projectId}.appspot.com`
        const bucket = storage.bucket(bucketName)
        const filePath = `nin_slips/${userId}/${sanitizedFileName}`
        const file = bucket.file(filePath)

        // Convert base64 to buffer
        const base64Data = fileData.split(',')[1] || fileData
        const fileBuffer = Buffer.from(base64Data, 'base64')

        // Upload file with metadata
        await file.save(fileBuffer, {
            metadata: {
                contentType: fileType,
                metadata: {
                    uploadedBy: userId,
                    uploadedAt: new Date().toISOString(),
                    originalName: fileName,
                    purpose: 'nin_verification'
                }
            },
            public: false // Not publicly accessible
        })

        console.log(`NIN slip uploaded: ${filePath}`)

        // Generate signed URL (valid for 7 days for admin review)
        const [signedUrl] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
        })

        // Get user document to check for existing NIN slip
        const userRef = db.collection('users').doc(userId)
        const userDoc = await userRef.get()
        const userData = userDoc.data()

        // Delete old NIN slip if exists
        if (userData?.kyc?.ninSlipUrl) {
            try {
                // Extract old file path from URL or storage reference
                const oldFilePath = userData.kyc.ninSlipPath
                if (oldFilePath) {
                    const oldFile = bucket.file(oldFilePath)
                    await oldFile.delete()
                    console.log(`Deleted old NIN slip: ${oldFilePath}`)
                }
            } catch (deleteError) {
                console.warn('Failed to delete old NIN slip:', deleteError.message)
                // Continue even if deletion fails
            }
        }

        // Update user document
        await userRef.update({
            'kyc.ninSlipUrl': signedUrl,
            'kyc.ninSlipPath': filePath, // Store path for future deletion
            'kyc.ninSlipUploadedAt': admin.firestore.FieldValue.serverTimestamp(),
            'kyc.ninVerified': true, // Mark as uploaded (admin can review later if needed)
            'kyc.ninVerifiedAt': admin.firestore.FieldValue.serverTimestamp(),
            'updatedAt': admin.firestore.FieldValue.serverTimestamp()
        })

        return {
            success: true,
            url: signedUrl,
            path: filePath,
            message: 'NIN slip uploaded successfully'
        }
    } catch (error) {
        console.error('Error uploading NIN slip:', error)

        if (error instanceof functions.https.HttpsError) {
            throw error
        }

        throw new functions.https.HttpsError('internal', 'Failed to upload NIN slip')
    }
})

/**
 * Delete NIN slip (if user wants to re-upload)
 */
exports.deleteNINSlip = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }

    try {
        const userId = context.auth.uid
        const db = admin.firestore()

        // Get user document
        const userRef = db.collection('users').doc(userId)
        const userDoc = await userRef.get()
        const userData = userDoc.data()

        if (!userData?.kyc?.ninSlipPath) {
            return {
                success: true,
                message: 'No NIN slip to delete'
            }
        }

        // Delete from storage
        const bucketName = functions.config().firebase?.storageBucket || `${admin.instanceId().app.options.projectId}.appspot.com`
        const bucket = storage.bucket(bucketName)
        const file = bucket.file(userData.kyc.ninSlipPath)

        await file.delete()

        // Update user document
        await userRef.update({
            'kyc.ninSlipUrl': admin.firestore.FieldValue.delete(),
            'kyc.ninSlipPath': admin.firestore.FieldValue.delete(),
            'kyc.ninSlipUploadedAt': admin.firestore.FieldValue.delete(),
            'kyc.ninVerified': false,
            'kyc.ninVerifiedAt': admin.firestore.FieldValue.delete(),
            'updatedAt': admin.firestore.FieldValue.serverTimestamp()
        })

        return {
            success: true,
            message: 'NIN slip deleted successfully'
        }
    } catch (error) {
        console.error('Error deleting NIN slip:', error)

        if (error instanceof functions.https.HttpsError) {
            throw error
        }

        throw new functions.https.HttpsError('internal', 'Failed to delete NIN slip')
    }
})
