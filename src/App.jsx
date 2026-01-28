import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useThemeStore } from './store/themeStore'
import { useEffect, lazy, Suspense } from 'react'
import * as React from 'react'
import { canAccessAdmin } from './utils/permissions'
import { initializeMessaging, requestNotificationPermission, setupForegroundMessageListener } from './services/notificationService'
import { app } from './lib/firebase'
import { useToast } from './context/ToastContext'
import LoadingSkeleton from './components/ui/LoadingSkeleton'

// Auth Pages (small, keep eager)
import AuthPage from './pages/auth/AuthPage'
import VerifyEmailPage from './pages/auth/VerifyEmailPage'
import EmailVerificationPendingPage from './pages/auth/EmailVerificationPendingPage'
import RegistrationFeePage from './pages/auth/RegistrationFeePage'
import ApprovalPendingPage from './pages/auth/ApprovalPendingPage'
import RegistrationRejectedPage from './pages/auth/RegistrationRejectedPage'

// Member Pages - Lazy Load
const MemberDashboard = lazy(() => import('./pages/member/MemberDashboard'))
const SavingsPage = lazy(() => import('./pages/member/SavingsPage'))
const LoanApplicationPage = lazy(() => import('./pages/member/LoanApplicationPage'))
const MyLoansPage = lazy(() => import('./pages/member/MyLoansPage'))
const LoanDeductionHistoryPage = lazy(() => import('./pages/member/LoanDeductionHistoryPage'))
const CommoditiesPage = lazy(() => import('./pages/member/CommoditiesPage'))
const ProfilePage = lazy(() => import('./pages/member/ProfilePage'))
const MyOrdersPage = lazy(() => import('./pages/member/MyOrdersPage'))
const WalletOnboardingPage = lazy(() => import('./pages/member/WalletOnboardingPage'))

const SubmitReportPage = lazy(() => import('./pages/member/SubmitReportPage'))

const SettingsPage = lazy(() => import('./pages/member/SettingsPage'))
const NotificationsPage = lazy(() => import('./pages/member/NotificationsPage'))
const SupportPage = lazy(() => import('./pages/member/SupportPage'))
const ComplaintsPage = lazy(() => import('./pages/member/ComplaintsPage'))
const SavingsReductionPage = lazy(() => import('./pages/member/SavingsReductionPage'))

// Admin Pages - Lazy Load
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminApprovalsPage = lazy(() => import('./pages/admin/AdminApprovalsPage'))
const AdminCommodityOrdersPage = lazy(() => import('./pages/admin/AdminCommodityOrdersPage'))
const AdminCommodityDeductionsPage = lazy(() => import('./pages/admin/AdminCommodityDeductionsPage'))
const AdminBroadcastPage = lazy(() => import('./pages/admin/AdminBroadcastPage'))
const LoanRequestsPage = lazy(() => import('./pages/admin/LoanRequestsPage'))
const MembersPage = lazy(() => import('./pages/admin/MembersPage'))
const AdminSavingsPage = lazy(() => import('./pages/admin/AdminSavingsPage'))
const AdminCommoditiesPage = lazy(() => import('./pages/admin/AdminCommoditiesPage'))
const ReportsPage = lazy(() => import('./pages/admin/ReportsPage'))
const AnalyticsPage = lazy(() => import('./pages/admin/AnalyticsPage'))
const AdminComplaintsPage = lazy(() => import('./pages/admin/AdminComplaintsPage'))
const AdminSavingsReductionPage = lazy(() => import('./pages/admin/AdminSavingsReductionPage'))
const ProfileChangeRequestsPage = lazy(() => import('./pages/admin/ProfileChangeRequestsPage'))
const RoleManagementPage = lazy(() => import('./pages/admin/RoleManagementPage'))
const AdminSecuritySettingsPage = lazy(() => import('./pages/admin/AdminSecuritySettingsPage'))
const AuditLogsPage = lazy(() => import('./pages/admin/AuditLogsPage'))
const RateLimitsPage = lazy(() => import('./pages/admin/RateLimitsPage'))
const CustomerCareDashboard = lazy(() => import('./pages/admin/CustomerCareDashboard'))
const RegistrationApprovalsPage = lazy(() => import('./pages/admin/RegistrationApprovalsPage'))
const IPWhitelistPage = lazy(() => import('./pages/admin/IPWhitelistPage'))
const CentralizedApprovalsPage = lazy(() => import('./pages/admin/CentralizedApprovalsPage'))
const SecurityMonitoringPage = lazy(() => import('./pages/admin/SecurityMonitoringPage'))

// Public Pages (small, keep eager)
import GuarantorApprovalPage from './pages/GuarantorApprovalPage'
import ClearDBAction from './pages/ClearDBAction'
import DiagnosticPage from './pages/DiagnosticPage'

// Layouts
import MemberLayout from './components/layout/MemberLayout'
import AdminLayout from './components/layout/AdminLayout'
import ErrorBoundary from './components/ErrorBoundary'
import SessionTimeoutWarning from './components/SessionTimeoutWarning'
import PWAUpdatePrompt from './components/PWAUpdatePrompt'



// Hooks
import { useSessionTimeout } from './hooks/useSessionTimeout'
import { usePrefetchOnIdle } from './hooks/usePrefetch'

function App() {
    const { isAuthenticated, user } = useAuthStore()
    const { theme } = useThemeStore()
    const toast = useToast()

    // Session timeout management
    const { showWarning, remainingTime, extendSession } = useSessionTimeout()



    // Prefetch routes based on user role when idle
    usePrefetchOnIdle(
        user?.role === 'admin'
            ? {
                // Common admin routes
                AdminDashboard,
                LoanRequestsPage,
                MembersPage,
                AdminApprovalsPage,
                RegistrationApprovalsPage,
            }
            : isAuthenticated
                ? {
                    // Common member routes
                    MemberDashboard,
                    SavingsPage,
                    MyLoansPage,
                    ProfilePage,
                }
                : {},
        2000 // Wait 2 seconds after idle before prefetching
    )

    // Initialize theme
    useEffect(() => {
        // Apply theme to document
        if (theme === 'dark') {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }, [theme])

    // Initialize notifications for authenticated users
    useEffect(() => {
        if (!isAuthenticated || !user?.userId) {
            return
        }

        // Only initialize notifications for users who have completed onboarding
        const hasCompletedOnboarding = user?.emailVerified && user?.registrationFeePaid
        if (!hasCompletedOnboarding) {
            console.log('Skipping notification initialization - user onboarding incomplete')
            return
        }

        console.log('🔔 Initializing push notifications for user:', user.userId)

        // Initialize FCM messaging
        const messaging = initializeMessaging(app)

        if (!messaging) {
            console.warn('FCM not initialized - notifications disabled')
            return
        }

        // Request permission and setup listener
        requestNotificationPermission(user.userId).then((token) => {
            if (token) {
                console.log('✅ Notifications enabled successfully')

                // Setup foreground message listener
                const unsubscribe = setupForegroundMessageListener((notification) => {
                    // Show in-app toast notification
                    if (toast?.showToast) {
                        toast.showToast({
                            title: notification.title,
                            message: notification.body,
                            type: 'info',
                            duration: 5000
                        })
                    }
                })

                // Cleanup on unmount
                return () => {
                    if (unsubscribe) unsubscribe()
                }
            } else {
                console.log('Notification permission not granted')
            }
        }).catch((error) => {
            console.error('Error initializing notifications:', error)
        })
    }, [isAuthenticated, user?.userId, user?.emailVerified, user?.registrationFeePaid, toast])

    return (
        <ErrorBoundary>
            <Router>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/auth" element={!isAuthenticated ? <AuthPage /> : <Navigate to={canAccessAdmin(user) ? '/admin/dashboard' : '/member/dashboard'} />} />
                    <Route path="/verify-email" element={<VerifyEmailPage />} />
                    <Route path="/email-verification-pending" element={<EmailVerificationPendingPage />} />
                    <Route path="/registration-fee" element={<RegistrationFeePage />} />
                    <Route path="/approval-pending" element={<ApprovalPendingPage />} />
                    <Route path="/registration-rejected" element={<RegistrationRejectedPage />} />
                    <Route path="/sh-clear-database-xyz" element={<ClearDBAction />} />
                    <Route path="/guarantor-approval/:token" element={<GuarantorApprovalPage />} />
                    <Route path="/diagnostic" element={<DiagnosticPage />} />

                    {/* Member Routes */}
                    <Route path="/member" element={isAuthenticated && user?.role === 'member' ? <MemberLayout /> : <Navigate to="/auth" />}>
                        <Route path="dashboard" element={<Suspense fallback={<LoadingSkeleton variant="dashboard" />}><MemberDashboard /></Suspense>} />
                        <Route path="savings" element={<SavingsPage />} />
                        <Route path="savings/reduce" element={<SavingsReductionPage />} />
                        <Route path="loans/apply" element={<LoanApplicationPage />} />
                        <Route path="loans" element={<MyLoansPage />} />
                        <Route path="loans/deductions" element={<LoanDeductionHistoryPage />} />
                        <Route path="commodities" element={<CommoditiesPage />} />
                        <Route path="orders" element={<MyOrdersPage />} />

                        <Route path="notifications" element={<NotificationsPage />} />
                        <Route path="submit-report" element={<SubmitReportPage />} />

                        <Route path="settings" element={<SettingsPage />} />
                        <Route path="support" element={<SupportPage />} />
                        <Route path="complaints" element={<ComplaintsPage />} />
                        <Route path="profile" element={<ProfilePage />} />
                        <Route path="wallet-onboarding" element={<WalletOnboardingPage />} />
                    </Route>

                    {/* Admin Routes */}
                    <Route path="/admin" element={isAuthenticated && canAccessAdmin(user) ? <AdminLayout /> : <Navigate to="/auth" />}>
                        <Route path="dashboard" element={<Suspense fallback={<LoadingSkeleton variant="dashboard" />}><AdminDashboard /></Suspense>} />
                        <Route path="customer-care" element={<CustomerCareDashboard />} />
                        <Route path="all-approvals" element={<CentralizedApprovalsPage />} />
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
                        <Route path="analytics" element={<AnalyticsPage />} />
                        <Route path="security" element={<AdminSecuritySettingsPage />} />
                        <Route path="audit-logs" element={<AuditLogsPage />} />
                        <Route path="registrations" element={<RegistrationApprovalsPage />} />
                        <Route path="ip-whitelist" element={<IPWhitelistPage />} />
                        <Route path="rate-limits" element={<RateLimitsPage />} />
                        <Route path="security-monitoring" element={<SecurityMonitoringPage />} />
                    </Route>

                    {/* Default Route */}
                    <Route path="/" element={<Navigate to="/auth" />} />
                </Routes>

                {/* Session Timeout Warning Modal */}
                {showWarning && (
                    <SessionTimeoutWarning
                        remainingTime={remainingTime}
                        onExtend={extendSession}
                    />
                )}



                {/* PWA Update Prompt */}
                <PWAUpdatePrompt />
            </Router>
        </ErrorBoundary>
    )
}

export default App
