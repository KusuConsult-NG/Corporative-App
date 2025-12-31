import { useState } from 'react'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { storage, db, auth } from '../lib/firebase'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { AlertCircle, CheckCircle, Loader, ShieldAlert } from 'lucide-react'

export default function DiagnosticPage() {
    const [status, setStatus] = useState({
        storage: { loading: false, error: null, success: false, code: '' },
        firestore: { loading: false, error: null, success: false, code: '' }
    })

    const testStorage = async () => {
        setStatus(prev => ({ ...prev, storage: { ...prev.storage, loading: true, error: null, success: false } }))
        try {
            const user = auth.currentUser
            if (!user) throw new Error('You must be logged in to test storage (Firebase Rules often require auth)')

            // Create a tiny dummy file
            const blob = new Blob(['diagnostic test'], { type: 'text/plain' })
            const file = new File([blob], 'diagnostic.txt', { type: 'text/plain' })

            // Try to upload to the same path used by passports
            const testPath = `passports/diagnostic_${user.uid}_${Date.now()}.txt`
            const storageRef = ref(storage, testPath)

            console.log('Attempting diagnostic upload to:', testPath)
            await uploadBytes(storageRef, file)
            const url = await getDownloadURL(storageRef)

            setStatus(prev => ({
                ...prev,
                storage: { loading: false, error: null, success: true, code: 'Success!' }
            }))
            console.log('Diagnostic upload success! URL:', url)
        } catch (err) {
            console.error('Storage Diagnostic Error:', err)
            setStatus(prev => ({
                ...prev,
                storage: {
                    loading: false,
                    error: err.message,
                    success: false,
                    code: err.code || 'UNKNOWN_ERROR'
                }
            }))
        }
    }

    const testFirestore = async () => {
        setStatus(prev => ({ ...prev, firestore: { ...prev.firestore, loading: true, error: null, success: false } }))
        try {
            const user = auth.currentUser
            if (!user) throw new Error('You must be logged in to test Firestore')

            await addDoc(collection(db, 'diagnostic_logs'), {
                userId: user.uid,
                timestamp: serverTimestamp(),
                message: 'Diagnostic test write'
            })

            setStatus(prev => ({
                ...prev,
                firestore: { loading: false, error: null, success: true, code: 'Success!' }
            }))
        } catch (err) {
            console.error('Firestore Diagnostic Error:', err)
            setStatus(prev => ({
                ...prev,
                firestore: {
                    loading: false,
                    error: err.message,
                    success: false,
                    code: err.code || 'UNKNOWN_ERROR'
                }
            }))
        }
    }

    return (
        <div className="p-10 max-w-4xl mx-auto space-y-8">
            <header className="text-center">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">System Diagnostics</h1>
                <p className="text-slate-500">Troubleshoot Firebase Storage & Firestore permissions</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Storage Test */}
                <Card className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                            <ShieldAlert size={24} />
                        </div>
                        <h2 className="text-xl font-bold">Firebase Storage</h2>
                    </div>

                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                        Tests if the current user can write to the <code>passports/</code> directory.
                    </p>

                    <Button
                        onClick={testStorage}
                        loading={status.storage.loading}
                        className="w-full mb-6"
                        variant={status.storage.error ? 'outline' : 'primary'}
                    >
                        Test Upload
                    </Button>

                    {status.storage.success && (
                        <div className="flex items-center gap-2 text-green-600 font-medium">
                            <CheckCircle size={18} />
                            <span>Storage looks good!</span>
                        </div>
                    )}

                    {status.storage.error && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-red-600 font-bold uppercase text-xs">
                                <AlertCircle size={14} />
                                <span>Error Code: {status.storage.code}</span>
                            </div>
                            <div className="p-3 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-900/30">
                                {status.storage.error}
                            </div>
                        </div>
                    )}
                </Card>

                {/* Firestore Test */}
                <Card className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg">
                            <ShieldAlert size={24} />
                        </div>
                        <h2 className="text-xl font-bold">Firestore Database</h2>
                    </div>

                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                        Tests if the current user can write to a test collection.
                    </p>

                    <Button
                        onClick={testFirestore}
                        loading={status.firestore.loading}
                        className="w-full mb-6"
                        variant={status.firestore.error ? 'outline' : 'primary'}
                    >
                        Test Write
                    </Button>

                    {status.firestore.success && (
                        <div className="flex items-center gap-2 text-green-600 font-medium">
                            <CheckCircle size={18} />
                            <span>Firestore looks good!</span>
                        </div>
                    )}

                    {status.firestore.error && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-red-600 font-bold uppercase text-xs">
                                <AlertCircle size={14} />
                                <span>Error Code: {status.firestore.code}</span>
                            </div>
                            <div className="p-3 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-900/30">
                                {status.firestore.error}
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            <Card className="p-6 bg-slate-50 dark:bg-slate-900/50">
                <h3 className="font-bold mb-2">Next Steps</h3>
                <ol className="list-decimal list-inside text-sm text-slate-600 dark:text-slate-400 space-y-2">
                    <li>If you see <strong>storage/unauthorized</strong>, your Firebase Storage Rules are blocking the write.</li>
                    <li>If you see <strong>storage/retry-limit-exceeded</strong>, check your internet connection or if the Storage Bucket URL in <code>.env</code> is correct.</li>
                    <li>If both tests pass but the profile image still doesn't update, the issue is in the Profile Page component logic.</li>
                </ol>
            </Card>
        </div>
    )
}
