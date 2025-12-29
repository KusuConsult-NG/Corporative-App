import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useThemeStore } from './store/themeStore'
import { useEffect } from 'react'

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
import CommoditiesPage from './pages/member/CommoditiesPage'
import ProfilePage from './pages/member/ProfilePage'
import MyOrdersPage from './pages/member/MyOrdersPage'
import SettingsPage from './pages/member/SettingsPage'
import SupportPage from './pages/member/SupportPage'


// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminApprovalsPage from './pages/admin/AdminApprovalsPage'
import LoanRequestsPage from './pages/admin/LoanRequestsPage'
import MembersPage from './pages/admin/MembersPage'
import AdminSavingsPage from './pages/admin/AdminSavingsPage'
import AdminCommoditiesPage from './pages/admin/AdminCommoditiesPage'
import ReportsPage from './pages/admin/ReportsPage'

// Public Pages
import GuarantorApprovalPage from './pages/GuarantorApprovalPage'

// Layout
import MemberLayout from './components/layout/MemberLayout'
import AdminLayout from './components/layout/AdminLayout'

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
        <Router>
            <Routes>
                {/* Public Routes */}
                <Route path="/auth" element={!isAuthenticated ? <AuthPage /> : <Navigate to={user?.role === 'admin' ? '/admin/dashboard' : '/member/dashboard'} />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route path="/email-verification-pending" element={<EmailVerificationPendingPage />} />
                <Route path="/registration-fee" element={<RegistrationFeePage />} />
                <Route path="/guarantor-approval/:token" element={<GuarantorApprovalPage />} />

                {/* Member Routes */}
                <Route path="/member" element={isAuthenticated && user?.role === 'member' ? <MemberLayout /> : <Navigate to="/auth" />}>
                    <Route path="dashboard" element={<MemberDashboard />} />
                    <Route path="savings" element={<SavingsPage />} />
                    <Route path="loans/apply" element={<LoanApplicationPage />} />
                    <Route path="loans" element={<MyLoansPage />} />
                    <Route path="commodities" element={<CommoditiesPage />} />
                    <Route path="orders" element={<MyOrdersPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="support" element={<SupportPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                </Route>

                {/* Admin Routes */}
                <Route path="/admin" element={isAuthenticated && (user?.role === 'admin' || user?.role === 'superadmin') ? <AdminLayout /> : <Navigate to="/auth" />}>
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="approvals" element={<AdminApprovalsPage />} />
                    <Route path="loans/requests" element={<LoanRequestsPage />} />
                    <Route path="members" element={<MembersPage />} />
                    <Route path="savings" element={<AdminSavingsPage />} />
                    <Route path="commodities" element={<AdminCommoditiesPage />} />
                    <Route path="reports" element={<ReportsPage />} />
                </Route>

                {/* Default Route */}
                <Route path="/" element={<Navigate to="/auth" />} />
            </Routes>
        </Router>
    )
}

export default App
