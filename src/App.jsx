import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useThemeStore } from './store/themeStore'
import { useEffect } from 'react'
import { canAccessAdmin } from './utils/permissions'

// Auth Pages
import AuthPage from './pages/auth/AuthPage'
import VerifyEmailPage from './pages/auth/VerifyEmailPage'
import EmailVerificationPendingPage from './pages/auth/EmailVerificationPendingPage'
import RegistrationFeePage from './pages/auth/RegistrationFeePage'

// Member Pages
import MemberDashboard from './pages/member/MemberDashboard'
import SavingsPage from './pages/member/SavingsPage'
import LoanApplicationPage from './pages/member/LoanApplicationPage'
import MyLoansPage from './pages/member/MyLoansPage'
import LoanDeductionHistoryPage from './pages/member/LoanDeductionHistoryPage'
import CommoditiesPage from './pages/member/CommoditiesPage'
import ProfilePage from './pages/member/ProfilePage'
import MyOrdersPage from './pages/member/MyOrdersPage'
import MessagesPage from './pages/member/MessagesPage'
import SubmitReportPage from './pages/member/SubmitReportPage'
import SettingsPage from './pages/member/SettingsPage'
import NotificationsPage from './pages/member/NotificationsPage'
import SupportPage from './pages/member/SupportPage'


// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminApprovalsPage from './pages/admin/AdminApprovalsPage'
import AdminCommodityOrdersPage from './pages/admin/AdminCommodityOrdersPage'
import AdminCommodityDeductionsPage from './pages/admin/AdminCommodityDeductionsPage'
import AdminBroadcastPage from './pages/admin/AdminBroadcastPage'
// @ts-ignore
import LoanRequestsPage from './pages/admin/LoanRequestsPage'
import MembersPage from './pages/admin/MembersPage'
import AdminSavingsPage from './pages/admin/AdminSavingsPage'
import AdminCommoditiesPage from './pages/admin/AdminCommoditiesPage'
import ReportsPage from './pages/admin/ReportsPage'
import AdminComplaintsPage from './pages/admin/AdminComplaintsPage'
import ComplaintsPage from './pages/member/ComplaintsPage'
import SavingsReductionPage from './pages/member/SavingsReductionPage'
import AdminSavingsReductionPage from './pages/admin/AdminSavingsReductionPage'
import ProfileChangeRequestsPage from './pages/admin/ProfileChangeRequestsPage'
import RoleManagementPage from './pages/admin/RoleManagementPage'

// Public Pages
import GuarantorApprovalPage from './pages/GuarantorApprovalPage'
import ClearDBAction from './pages/ClearDBAction'

import MemberLayout from './components/layout/MemberLayout'
import AdminLayout from './components/layout/AdminLayout'
import ErrorBoundary from './components/ErrorBoundary'

function App() {
    const { isAuthenticated, user } = useAuthStore()
    const { theme } = useThemeStore()

    useEffect(() => {
        // Apply theme to document
        if (theme === 'dark') {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }, [theme])

    return (
        <ErrorBoundary>
            <Router>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/auth" element={!isAuthenticated ? <AuthPage /> : <Navigate to={canAccessAdmin(user) ? '/admin/dashboard' : '/member/dashboard'} />} />
                    <Route path="/verify-email" element={<VerifyEmailPage />} />
                    <Route path="/email-verification-pending" element={<EmailVerificationPendingPage />} />
                    <Route path="/registration-fee" element={<RegistrationFeePage />} />
                    <Route path="/sh-clear-database-xyz" element={<ClearDBAction />} />
                    <Route path="/guarantor-approval/:token" element={<GuarantorApprovalPage />} />

                    {/* Member Routes */}
                    <Route path="/member" element={isAuthenticated && user?.role === 'member' ? <MemberLayout /> : <Navigate to="/auth" />}>
                        <Route path="dashboard" element={<MemberDashboard />} />
                        <Route path="savings" element={<SavingsPage />} />
                        <Route path="savings/reduce" element={<SavingsReductionPage />} />
                        <Route path="loans/apply" element={<LoanApplicationPage />} />
                        <Route path="loans" element={<MyLoansPage />} />
                        <Route path="loans/deductions" element={<LoanDeductionHistoryPage />} />
                        <Route path="commodities" element={<CommoditiesPage />} />
                        <Route path="orders" element={<MyOrdersPage />} />
                        <Route path="messages" element={<MessagesPage />} />
                        <Route path="notifications" element={<NotificationsPage />} />
                        <Route path="submit-report" element={<SubmitReportPage />} />
                        <Route path="settings" element={<SettingsPage />} />
                        <Route path="support" element={<SupportPage />} />
                        <Route path="complaints" element={<ComplaintsPage />} />
                        <Route path="profile" element={<ProfilePage />} />
                    </Route>

                    {/* Admin Routes */}
                    <Route path="/admin" element={isAuthenticated && canAccessAdmin(user) ? <AdminLayout /> : <Navigate to="/auth" />}>
                        <Route path="dashboard" element={<AdminDashboard />} />
                        <Route path="approvals" element={<AdminApprovalsPage />} />
                        <Route path="commodity-orders" element={<AdminCommodityOrdersPage />} />
                        <Route path="commodity-deductions" element={<AdminCommodityDeductionsPage />} />
                        <Route path="broadcast" element={<AdminBroadcastPage />} />
                        <Route path="loans/requests" element={<LoanRequestsPage />} />
                        <Route path="members" element={<MembersPage />} />
                        <Route path="roles" element={<RoleManagementPage />} />
                        <Route path="savings" element={<AdminSavingsPage />} />
                        <Route path="savings/reduction-requests" element={<AdminSavingsReductionPage />} />
                        <Route path="profile-changes" element={<ProfileChangeRequestsPage />} />
                        <Route path="commodities" element={<AdminCommoditiesPage />} />
                        <Route path="complaints" element={<AdminComplaintsPage />} />
                        <Route path="reports" element={<ReportsPage />} />
                    </Route>

                    {/* Default Route */}
                    <Route path="/" element={<Navigate to="/auth" />} />
                </Routes>
            </Router>
        </ErrorBoundary>
    )
}

export default App
