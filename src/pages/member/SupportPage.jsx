import { useState } from 'react'
import { Mail, Phone, Clock, MessageSquare, Send, ChevronDown, ChevronUp } from 'lucide-react'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import ByeLawModal from '../../components/modals/ByeLawModal'
import ContactOfficeModal from '../../components/modals/ContactOfficeModal'

const FAQ_ITEMS = [
    {
        question: 'How do I apply for a loan?',
        answer: 'You can apply for a loan by navigating to the Loans section and clicking on "Apply for New Loan". Fill out the application form with the required details including loan amount, purpose, and repayment period. Your application will be reviewed by the admin team within 2-3 business days.'
    },
    {
        question: 'How is my monthly contribution deducted?',
        answer: 'Monthly contributions are automatically deducted from your salary on your payment date. You can adjust your contribution amount in the Settings page. The minimum contribution is ₦10,000 and the maximum is ₦500,000 per month.'
    },
    {
        question: 'Can I request commodities on credit?',
        answer: 'Yes! You can browse our marketplace and request commodities on credit or installment plans. Once you submit a request, the admin will contact you regarding delivery arrangements and payment terms.'
    },
    {
        question: 'How do I check my savings balance?',
        answer: 'Your total savings balance is displayed on your dashboard. For detailed transaction history and interest earned, visit the Savings page from the main menu. You can also download your savings statement for any period.'
    },
    {
        question: 'What is the interest rate on loans?',
        answer: 'Interest rates vary depending on the loan type and amount. Personal loans typically have an 8-12% annual interest rate, while emergency loans may have different rates. The exact rate will be communicated during the loan approval process.'
    },
    {
        question: 'How can I update my profile information?',
        answer: 'Navigate to "My Profile" from the sidebar menu. Click on "Edit Details" to update your contact information. For changes to your department or official details, please contact the admin team directly.'
    }
]

export default function SupportPage() {
    const [expandedFaq, setExpandedFaq] = useState(null)
    const [byeLawModalOpen, setByeLawModalOpen] = useState(false)
    const [contactOfficeModalOpen, setContactOfficeModalOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [ticketForm, setTicketForm] = useState({
        subject: '',
        category: 'general',
        message: '',
        priority: 'medium'
    })

    const handleSubmitTicket = async (e) => {
        e.preventDefault()
        setSubmitting(true)

        try {
            // Import Cloud Functions
            const { functions } = await import('../../lib/firebase')
            const { httpsCallable } = await import('firebase/functions')

            // Call Cloud Function
            const sendTicket = httpsCallable(functions, 'sendSupportTicketEmail')
            const result = await sendTicket({
                subject: ticketForm.subject,
                message: ticketForm.message,
                category: ticketForm.category,
                priority: ticketForm.priority
            })

            if (result.data.success) {
                alert(result.data.message)
                setTicketForm({ subject: '', category: 'general', message: '', priority: 'medium' })
            }
        } catch (error) {
            console.error('Error submitting support ticket:', error)
            alert('Failed to submit ticket. Please try again or contact us directly.')
        } finally {
            setSubmitting(false)
        }
    }

    const toggleFaq = (index) => {
        setExpandedFaq(expandedFaq === index ? null : index)
    }

    return (
        <div className="p-6 lg:p-10 max-w-5xl mx-auto flex flex-col gap-8">
            {/* Header */}
            <div className="text-center">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Support Center</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-2">
                    We're here to help! Find answers or contact us directly
                </p>
            </div>

            {/* Contact Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="text-center hover:border-primary/50 transition-colors">
                    <div className="size-14 mx-auto rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 mb-4">
                        <Phone size={28} />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-2">Phone Support</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                        Call us directly for urgent issues
                    </p>
                    <p className="font-semibold text-primary">08065810868</p>
                    <p className="text-sm text-primary mt-1">08136905553</p>
                    <p className="text-xs text-slate-400 mt-1">Mon-Fri, 8AM - 5PM</p>
                </Card>

                <Card className="text-center hover:border-primary/50 transition-colors">
                    <div className="size-14 mx-auto rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-500 mb-4">
                        <Mail size={28} />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-2">Email Support</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                        Send us an email anytime
                    </p>
                    <p className="font-semibold text-primary">support@anchoragecs.com</p>
                    <p className="text-xs text-slate-400 mt-1">Response within 24 hours</p>
                </Card>

                <Card className="text-center hover:border-primary/50 transition-colors">
                    <div className="size-14 mx-auto rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-500 mb-4">
                        <Clock size={28} />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-2">Office Hours</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                        Visit us at our office
                    </p>
                    <p className="font-semibold text-slate-900 dark:text-white">Monday - Friday</p>
                    <p className="text-xs text-slate-400 mt-1">8:00 AM - 5:00 PM</p>
                </Card>
            </div>

            {/* Submit Ticket Form */}
            <Card>
                <div className="flex items-start gap-4 mb-6">
                    <div className="size-12 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-500">
                        <MessageSquare size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Submit a Support Ticket</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Describe your issue and we'll get back to you as soon as possible
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmitTicket} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Subject
                        </label>
                        <Input
                            required
                            type="text"
                            placeholder="Briefly describe your issue"
                            value={ticketForm.subject}
                            onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Category
                        </label>
                        <select
                            value={ticketForm.category}
                            onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        >
                            <option value="general">General Inquiry</option>
                            <option value="loans">Loans</option>
                            <option value="savings">Savings</option>
                            <option value="commodities">Commodities</option>
                            <option value="technical">Technical Issue</option>
                            <option value="account">Account Management</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Priority
                        </label>
                        <select
                            value={ticketForm.priority}
                            onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        >
                            <option value="low">Low - General question</option>
                            <option value="medium">Medium - Standard support</option>
                            <option value="high">High - Urgent issue</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Message
                        </label>
                        <textarea
                            required
                            rows={6}
                            placeholder="Provide detailed information about your issue..."
                            value={ticketForm.message}
                            onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={submitting}>
                        <Send size={20} />
                        {submitting ? 'Submitting...' : 'Submit Ticket'}
                    </Button>
                </form>
            </Card>

            {/* FAQ Section */}
            <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Frequently Asked Questions</h2>
                <div className="space-y-3">
                    {FAQ_ITEMS.map((faq, index) => (
                        <Card key={index} className="p-0 overflow-hidden">
                            <button
                                onClick={() => toggleFaq(index)}
                                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                            >
                                <h3 className="font-semibold text-slate-900 dark:text-white pr-4">
                                    {faq.question}
                                </h3>
                                {expandedFaq === index ? (
                                    <ChevronUp size={20} className="text-primary flex-shrink-0" />
                                ) : (
                                    <ChevronDown size={20} className="text-slate-400 flex-shrink-0" />
                                )}
                            </button>
                            {expandedFaq === index && (
                                <div className="px-6 pb-4 pt-2 text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
                                    {faq.answer}
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            </div>

            {/* Additional Resources */}
            <Card className="bg-gradient-to-br from-primary/5 to-purple-500/5 border-primary/20">
                <div className="text-center">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                        Need More Help?
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                        Check out our complete documentation or contact the cooperative office directly
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button variant="outline" onClick={() => setByeLawModalOpen(true)}>
                            View Documentation
                        </Button>
                        <Button onClick={() => setContactOfficeModalOpen(true)}>
                            Contact Office
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Bye-Law Modal */}
            <ByeLawModal isOpen={byeLawModalOpen} onClose={() => setByeLawModalOpen(false)} />

            {/* Contact Office Modal */}
            <ContactOfficeModal isOpen={contactOfficeModalOpen} onClose={() => setContactOfficeModalOpen(false)} />
        </div>
    )
}
