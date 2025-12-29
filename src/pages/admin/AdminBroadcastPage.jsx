import { useState } from 'react'
import { Send, Users, Loader } from 'lucide-react'
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuthStore } from '../../store/authStore'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function AdminBroadcastPage() {
    const { user } = useAuthStore()
    const [formData, setFormData] = useState({
        subject: '',
        message: ''
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const handleBroadcast = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')
        setLoading(true)

        try {
            if (!formData.subject.trim() || !formData.message.trim()) {
                throw new Error('Please fill in all fields')
            }

            // Get all members
            const membersSnapshot = await getDocs(collection(db, 'users'))
            const members = membersSnapshot.docs.filter(doc => doc.data().role === 'member')

            // Send message to each member
            const promises = members.map(memberDoc => {
                const memberData = memberDoc.data()
                return addDoc(collection(db, 'messages'), {
                    senderId: user.userId,
                    senderName: user.name || 'Administrator',
                    recipientId: memberData.userId,
                    recipientName: memberData.name,
                    subject: formData.subject,
                    message: formData.message,
                    read: false,
                    archived: false,
                    broadcast: true,
                    sentAt: serverTimestamp()
                })
            })

            await Promise.all(promises)

            setSuccess(`Broadcast sent successfully to ${members.length} members!`)
            setFormData({ subject: '', message: '' })
        } catch (err) {
            setError(err.message || 'Failed to send broadcast')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-6 lg:p-10 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                    Broadcast Message
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                    Send a message to all cooperative members
                </p>
            </div>

            <Card>
                <form onSubmit={handleBroadcast} className="space-y-6">
                    <Input
                        label="Subject"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        placeholder="Enter message subject"
                        required
                    />

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Message
                        </label>
                        <textarea
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            rows={10}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                            placeholder="Type your message here..."
                            required
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-700 dark:text-green-400 text-sm">
                            {success}
                        </div>
                    )}

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                        <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 text-sm">
                            <Users size={18} />
                            <span>This message will be sent to all cooperative members</span>
                        </div>
                    </div>

                    <Button type="submit" loading={loading} className="w-full">
                        <Send size={20} />
                        Send Broadcast Message
                    </Button>
                </form>
            </Card>
        </div>
    )
}
