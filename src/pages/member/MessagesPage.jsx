import { useState, useEffect } from 'react'
import { Mail, Inbox, Send, Archive, Trash2, User, Calendar } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { collection, query, where, getDocs, orderBy, doc, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'

export default function MessagesPage() {
    const { user } = useAuthStore()
    const [messages, setMessages] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedMessage, setSelectedMessage] = useState(null)
    const [filter, setFilter] = useState('inbox') // 'inbox', 'sent', 'archived'

    useEffect(() => {
        fetchMessages()
    }, [filter, user])

    const fetchMessages = async () => {
        if (!user?.userId) return

        setLoading(true)
        try {
            let q
            if (filter === 'inbox') {
                q = query(
                    collection(db, 'messages'),
                    where('recipientId', '==', user.userId),
                    where('archived', '==', false),
                    orderBy('sentAt', 'desc')
                )
            } else if (filter === 'sent') {
                q = query(
                    collection(db, 'messages'),
                    where('senderId', '==', user.userId),
                    orderBy('sentAt', 'desc')
                )
            } else if (filter === 'archived') {
                q = query(
                    collection(db, 'messages'),
                    where('recipientId', '==', user.userId),
                    where('archived', '==', true),
                    orderBy('sentAt', 'desc')
                )
            }

            const snapshot = await getDocs(q)
            const messagesList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }))

            setMessages(messagesList)
        } catch (error) {
            console.error('Error fetching messages:', error)
        } finally {
            setLoading(false)
        }
    }

    const markAsRead = async (messageId) => {
        try {
            await updateDoc(doc(db, 'messages', messageId), {
                read: true
            })
            fetchMessages()
        } catch (error) {
            console.error('Error marking as read:', error)
        }
    }

    const archiveMessage = async (messageId) => {
        try {
            await updateDoc(doc(db, 'messages', messageId), {
                archived: true
            })
            setSelectedMessage(null)
            fetchMessages()
        } catch (error) {
            console.error('Error archiving message:', error)
        }
    }

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A'
        const date = timestamp.toDate()
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date)
    }

    const handleMessageClick = (message) => {
        setSelectedMessage(message)
        if (!message.read && filter === 'inbox') {
            markAsRead(message.id)
        }
    }

    const unreadCount = messages.filter(m => !m.read && filter === 'inbox').length

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                    Messages
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                    {unreadCount > 0 && `You have ${unreadCount} unread message${unreadCount !== 1 ? 's' : ''}`}
                </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setFilter('inbox')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${filter === 'inbox'
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                >
                    <Inbox size={16} className="inline mr-1" />
                    Inbox ({messages.length})
                </button>
                <button
                    onClick={() => setFilter('sent')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${filter === 'sent'
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                >
                    <Send size={16} className="inline mr-1" />
                    Sent
                </button>
                <button
                    onClick={() => setFilter('archived')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${filter === 'archived'
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                >
                    <Archive size={16} className="inline mr-1" />
                    Archived
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Messages List */}
                <Card className="lg:col-span-1 p-0 max-h-[600px] overflow-y-auto">
                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="p-8 text-center">
                            <Mail size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                            <p className="text-slate-600 dark:text-slate-400">No messages</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-200 dark:divide-slate-700">
                            {messages.map((message) => (
                                <button
                                    key={message.id}
                                    onClick={() => handleMessageClick(message)}
                                    className={`w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${selectedMessage?.id === message.id ? 'bg-slate-50 dark:bg-slate-800/50' : ''
                                        } ${!message.read && filter === 'inbox' ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-slate-200 dark:bg-slate-700 rounded-full">
                                            <User size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <p className={`text-sm truncate ${!message.read && filter === 'inbox' ? 'font-bold' : 'font-medium'} text-slate-900 dark:text-white`}>
                                                    {filter === 'sent' ? message.recipientName : message.senderName}
                                                </p>
                                                {!message.read && filter === 'inbox' && (
                                                    <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-1 font-semibold">
                                                {message.subject}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-500 truncate">
                                                {message.message}
                                            </p>
                                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                                {formatDate(message.sentAt)}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </Card>

                {/* Message Detail */}
                <Card className="lg:col-span-2">
                    {selectedMessage ? (
                        <div>
                            <div className="flex items-start justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
                                <div className="flex-1">
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                                        {selectedMessage.subject}
                                    </h2>
                                    <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                                        <div className="flex items-center gap-2">
                                            <User size={16} />
                                            <span>
                                                {filter === 'sent' ? 'To: ' : 'From: '}
                                                {filter === 'sent' ? selectedMessage.recipientName : selectedMessage.senderName}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar size={16} />
                                            <span>{formatDate(selectedMessage.sentAt)}</span>
                                        </div>
                                    </div>
                                </div>
                                {filter === 'inbox' && !selectedMessage.archived && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => archiveMessage(selectedMessage.id)}
                                    >
                                        <Archive size={16} />
                                        Archive
                                    </Button>
                                )}
                            </div>
                            <div className="prose prose-slate dark:prose-invert max-w-none">
                                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                    {selectedMessage.message}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <Mail size={64} className="text-slate-300 dark:text-slate-600 mb-4" />
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                                No Message Selected
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400">
                                Select a message from the list to view its contents
                            </p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    )
}
