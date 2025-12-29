import { useState } from 'react'
import { Send, Users, Bell, AlertCircle } from 'lucide-react'
import { broadcastAPI } from '../../services/installmentAPI'
import { useAuthStore } from '../../store/authStore'
import { hasPermission, PERMISSIONS } from '../../utils/permissions'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'

export default function BroadcastPage() {
    const { user } = useAuthStore()

    // Check if user has broadcast permission
    if (!hasPermission(user, PERMISSIONS.SEND_BROADCAST)) {
        return (
            <div className="p-8">
                <div className="max-w-2xl mx-auto bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <AlertCircle className="text-red-600 dark:text-red-400" size={24} />
                        <h2 className="text-xl font-bold text-red-900 dark:text-red-100">
                            Access Denied
                        </h2>
                    </div>
                    <p className="text-red-700 dark:text-red-300">
                        You do not have permission to send broadcast messages. This feature is restricted to administrators.
                    </p>
                </div>
            </div>
        )
    }

    const [messageData, setMessageData] = useState({
        subject: '',
        message: '',
        targetAudience: 'all' // all, members, admins
    })
    const [sending, setSending] = useState(false)
    const [success, setSuccess] = useState(false)

    const handleSend = async (e) => {
        e.preventDefault()

        if (!messageData.subject.trim() || !messageData.message.trim()) {
            alert('Please fill in all fields')
            return
        }

        setSending(true)
        try {
            await broadcastAPI.send({
                ...messageData,
                sentBy: user.userId,
                senderName: user.name,
                senderRole: user.role
            })

            setSuccess(true)
            setMessageData({ subject: '', message: '', targetAudience: 'all' })
            setTimeout(() => setSuccess(false), 5000)
        } catch (error) {
            console.error('Error sending broadcast:', error)
            alert('Failed to send broadcast message')
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="p-6 lg:p-10 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Broadcast Message</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                    Send messages to all members or specific groups
                </p>
            </div>

            {success && (
                <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                    <p className="text-green-900 dark:text-green-400 font-semibold flex items-center gap-2">
                        <Bell size={20} />
                        Broadcast message sent successfully!
                    </p>
                </div>
            )}

            <Card>
                <form onSubmit={handleSend} className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                            Target Audience
                        </label>
                        <select
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                            value={messageData.targetAudience}
                            onChange={(e) => setMessageData({ ...messageData, targetAudience: e.target.value })}
                        >
                            <option value="all">All Users</option>
                            <option value="members">Members Only</option>
                            <option value="admins">Admins Only</option>
                        </select>
                    </div>

                    <Input
                        label="Subject"
                        placeholder="Message subject"
                        value={messageData.subject}
                        onChange={(e) => setMessageData({ ...messageData, subject: e.target.value })}
                        required
                    />

                    <div>
                        <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                            Message <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            rows="8"
                            placeholder="Type your message here..."
                            value={messageData.message}
                            onChange={(e) => setMessageData({ ...messageData, message: e.target.value })}
                            required
                        />
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <Users className="text-blue-600 dark:text-blue-400" size={24} />
                        <p className="text-sm text-blue-900 dark:text-blue-400">
                            <strong>Note:</strong> This message will be sent to all {messageData.targetAudience === 'all' ? 'users' : messageData.targetAudience} in the system.
                        </p>
                    </div>

                    <Button type="submit" loading={sending} className="w-full sm:w-auto">
                        <Send size={18} />
                        Send Broadcast
                    </Button>
                </form>
            </Card>
        </div>
    )
}
