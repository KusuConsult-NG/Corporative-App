import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Building2, Hash, ArrowRight, Info, Shield } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { canAccessAdmin } from '../../utils/permissions'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'

export default function AuthPage() {
    const [mode, setMode] = useState('login') // 'login' or 'register'
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()
    const { login } = useAuthStore()

    // Login form state
    const [loginData, setLoginData] = useState({
        email: '',
        password: '',
    })

    // Registration form state
    const [registerData, setRegisterData] = useState({
        title: '',
        firstName: '',
        middleName: '',
        lastName: '',
        email: '',
        staffId: '',
        department: '',
        rank: '',
        position: '',
        gender: '',
        dateOfBirth: '',
        stateOfOrigin: '',
        address: '',
        nextOfKin: {
            name: '',
            phone: '',
            relation: '',
            address: ''
        },
        password: '',
    })

    const [agreedToTerms, setAgreedToTerms] = useState(false)

    const [errors, setErrors] = useState({})

    const validateEmail = (email) => {
        const trimmedEmail = email.trim().toLowerCase()
        if (!trimmedEmail.endsWith('@unijos.edu.ng')) {
            return 'Email must be a valid @unijos.edu.ng address'
        }
        return null
    }

    const handleLogin = async (e) => {
        e.preventDefault()
        setErrors({})
        setLoading(true)

        // Trim email before validation
        const trimmedEmail = loginData.email.trim().toLowerCase()

        // Validation
        const emailError = validateEmail(trimmedEmail)
        if (emailError) {
            setErrors({ email: emailError })
            setLoading(false)
            return
        }

        // Call real login function
        const result = await login(trimmedEmail, loginData.password)

        setLoading(false)

        if (result.success) {
            // Get updated user from store
            const { user } = useAuthStore.getState()
            navigate(canAccessAdmin(user) ? '/admin/dashboard' : '/member/dashboard')
        } else {
            setErrors({ password: result.error || 'Invalid credentials' })
        }
    }

    const handleRegister = async (e) => {
        e.preventDefault()
        setErrors({})
        setLoading(true)

        // Trim email before validation
        const trimmedEmail = registerData.email.trim().toLowerCase()

        // Validation
        const emailError = validateEmail(trimmedEmail)
        if (emailError) {
            setErrors({ email: emailError })
            setLoading(false)
            return
        }

        // Validate Staff Number format (Alphanumeric)
        const staffNumberPattern = /^[a-zA-Z0-9]+$/
        if (!staffNumberPattern.test(registerData.staffId)) {
            setErrors({ staffId: 'Staff Number must contain only letters and numbers' })
            setLoading(false)
            return
        }

        // Call real register function from auth store with trimmed email
        const { register } = useAuthStore.getState()
        const result = await register({
            ...registerData,
            email: trimmedEmail
        })

        setLoading(false)

        if (result.success) {
            // Navigate to email verification pending page
            navigate('/email-verification-pending', {
                state: { email: trimmedEmail }
            })
        } else {
            setErrors({ password: result.error || 'Registration failed' })
        }
    }

    return (
        <div className="flex flex-col lg:flex-row min-h-screen w-full">
            {/* Left Side: Hero / Branding (Desktop only) */}
            <div className="hidden lg:flex w-1/2 bg-[#f0f4f8] relative overflow-hidden flex-col justify-between p-12 xl:p-20">
                {/* Background Decoration */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary via-blue-700 to-blue-900"></div>
                </div>

                <div className="relative z-10 h-full flex flex-col justify-center text-white">
                    <div className="mb-8">
                        <div className="inline-flex items-center justify-center p-3 bg-white/10 backdrop-blur-md rounded-xl mb-6 border border-white/20 shadow-lg">
                            <img src="/logo.png" alt="AWSLMCSL Logo" className="size-10 object-contain" />
                        </div>
                        <h1 className="text-3xl xl:text-4xl font-black leading-tight tracking-[-0.033em] mb-4">
                            Anchorage Welfare Savings and Loans Multipurpose Cooperative Society Limited
                        </h1>
                        <p className="text-lg text-blue-50/90 font-light leading-relaxed max-w-lg">
                            Exclusive welfare, savings and loans platform for university community.
                        </p>
                    </div>

                    <div className="flex gap-4 mt-8">
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg backdrop-blur-sm border border-white/10">
                            <Shield className="text-green-300" size={20} />
                            <span className="text-sm font-medium">Secure Platform</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg backdrop-blur-sm border border-white/10">
                            <svg className="w-5 h-5 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-medium">Easy Savings</span>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 text-xs text-blue-100/60 mt-auto pt-8">
                    © 2025 Anchorage Welfare Savings and Loans Multipurpose Cooperative Society Limited.
                </div>
            </div>

            {/* Right Side: Auth Forms */}
            <div className="w-full lg:w-1/2 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12 bg-white dark:bg-[#1a2632] overflow-y-auto">
                <div className="w-full max-w-[480px] flex flex-col gap-6">
                    {/* Mobile Only Header */}
                    <div className="lg:hidden w-full h-32 rounded-xl bg-primary/10 mb-4 overflow-hidden relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary to-blue-600 opacity-90"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <h1 className="text-white text-2xl font-bold">Unijos Cooperative</h1>
                        </div>
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex w-full bg-[#f0f4f8] dark:bg-gray-800 p-1.5 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setMode('login')}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${mode === 'login'
                                ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                                : 'text-gray-500 dark:text-gray-400'
                                }`}
                        >
                            Login
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('register')}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${mode === 'register'
                                ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                                : 'text-gray-500 dark:text-gray-400'
                                }`}
                        >
                            Register
                        </button>
                    </div>

                    {/* Section Header */}
                    <div className="text-center sm:text-left mt-2">
                        <h2 className="text-slate-900 dark:text-white text-2xl sm:text-3xl font-bold leading-tight tracking-tight">
                            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                        </h2>
                        <p className="text-[#4c739a] dark:text-gray-400 text-sm mt-2">
                            {mode === 'login'
                                ? 'Enter your official Unijos credentials to access your dashboard.'
                                : 'Register with your official Unijos email to join the cooperative.'}
                        </p>
                    </div>

                    {/* Login Form */}
                    {mode === 'login' && (
                        <form onSubmit={handleLogin} className="flex flex-col gap-5 mt-2">
                            <Input
                                label="Official Unijos Email"
                                type="email"
                                icon={Mail}
                                placeholder="staff.name@unijos.edu.ng"
                                value={loginData.email}
                                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                                error={errors.email}
                                required
                            />

                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-slate-900 dark:text-gray-200 text-sm font-semibold">
                                        Password
                                    </label>
                                    <a href="#" className="text-xs font-medium text-primary hover:text-blue-600 hover:underline">
                                        Forgot Password?
                                    </a>
                                </div>
                                <Input
                                    type={showPassword ? 'text' : 'password'}
                                    icon={Lock}
                                    placeholder="••••••••"
                                    value={loginData.password}
                                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                                    error={errors.password}
                                    showPasswordToggle
                                    onTogglePassword={() => setShowPassword(!showPassword)}
                                    required
                                />
                            </div>

                            <Button type="submit" loading={loading} className="mt-4">
                                <span>Log In to Dashboard</span>
                                <ArrowRight size={18} />
                            </Button>
                        </form>
                    )}

                    {/* Registration Form */}
                    {mode === 'register' && (
                        <form onSubmit={handleRegister} className="flex flex-col gap-5 mt-2">
                            <div className="flex flex-col gap-2">
                                <label className="text-slate-900 dark:text-gray-200 text-sm font-semibold">
                                    Title <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={registerData.title}
                                    onChange={(e) => setRegisterData({ ...registerData, title: e.target.value })}
                                    className="w-full px-4 py-3 rounded-lg border border-[#e7edf3] dark:border-gray-700 bg-white dark:bg-gray-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    required
                                >
                                    <option value="">Select Title</option>
                                    <option value="Prof">Prof</option>
                                    <option value="Dr">Dr</option>
                                    <option value="Mr">Mr</option>
                                    <option value="Mrs">Mrs</option>
                                    <option value="Miss">Miss</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <Input
                                    label="First Name"
                                    type="text"
                                    icon={User}
                                    placeholder="John"
                                    value={registerData.firstName}
                                    onChange={(e) => setRegisterData({ ...registerData, firstName: e.target.value })}
                                    required
                                />
                                <Input
                                    label="Middle Name"
                                    type="text"
                                    icon={User}
                                    placeholder="Michael"
                                    value={registerData.middleName}
                                    onChange={(e) => setRegisterData({ ...registerData, middleName: e.target.value })}
                                />
                                <Input
                                    label="Last Name"
                                    type="text"
                                    icon={User}
                                    placeholder="Doe"
                                    value={registerData.lastName}
                                    onChange={(e) => setRegisterData({ ...registerData, lastName: e.target.value })}
                                    required
                                />
                            </div>

                            <Input
                                label="Official Unijos Email"
                                type="email"
                                icon={Mail}
                                placeholder="staff.name@unijos.edu.ng"
                                value={registerData.email}
                                onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                                error={errors.email}
                                required
                            />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Input
                                    label="Staff Number"
                                    type="text"
                                    icon={Hash}
                                    placeholder="S1234"
                                    value={registerData.staffId}
                                    onChange={(e) => setRegisterData({ ...registerData, staffId: e.target.value })}
                                    error={errors.staffId}
                                    required
                                />
                                <Input
                                    label="Department"
                                    type="text"
                                    icon={Building2}
                                    placeholder="Computer Science"
                                    value={registerData.department}
                                    onChange={(e) => setRegisterData({ ...registerData, department: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-slate-900 dark:text-gray-200 text-sm font-semibold">
                                        Rank <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={registerData.rank}
                                        onChange={(e) => setRegisterData({ ...registerData, rank: e.target.value })}
                                        className="w-full px-4 py-3 rounded-lg border border-[#e7edf3] dark:border-gray-700 bg-white dark:bg-gray-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        required
                                    >
                                        <option value="">Select Rank</option>
                                        <option value="Professor">Professor</option>
                                        <option value="Associate Professor">Associate Professor</option>
                                        <option value="Senior Lecturer">Senior Lecturer</option>
                                        <option value="Lecturer I">Lecturer I</option>
                                        <option value="Lecturer II">Lecturer II</option>
                                        <option value="Assistant Lecturer">Assistant Lecturer</option>
                                        <option value="Senior Administrative Officer">Senior Administrative Officer</option>
                                        <option value="Administrative Officer">Administrative Officer</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <Input
                                    label="Position"
                                    type="text"
                                    placeholder="e.g., Head of Department"
                                    value={registerData.position}
                                    onChange={(e) => setRegisterData({ ...registerData, position: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-slate-900 dark:text-gray-200 text-sm font-semibold">
                                        Gender <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={registerData.gender}
                                        onChange={(e) => setRegisterData({ ...registerData, gender: e.target.value })}
                                        className="w-full px-4 py-3 rounded-lg border border-[#e7edf3] dark:border-gray-700 bg-white dark:bg-gray-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        required
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                    </select>
                                </div>
                                <Input
                                    label="Date of Birth"
                                    type="date"
                                    value={registerData.dateOfBirth}
                                    onChange={(e) => setRegisterData({ ...registerData, dateOfBirth: e.target.value })}
                                    required
                                />
                                <Input
                                    label="State of Origin"
                                    type="text"
                                    placeholder="e.g., Plateau State"
                                    value={registerData.stateOfOrigin}
                                    onChange={(e) => setRegisterData({ ...registerData, stateOfOrigin: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-slate-900 dark:text-gray-200 text-sm font-semibold">
                                    Residential Address <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    rows="2"
                                    className="flex w-full rounded-xl border bg-white dark:bg-gray-800 p-4 text-base text-slate-900 dark:text-white placeholder:text-[#93adc8] dark:placeholder:text-slate-500 transition-all border-[#cfdbe7] dark:border-gray-600 focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    placeholder="Enter your full address"
                                    value={registerData.address}
                                    onChange={(e) => setRegisterData({ ...registerData, address: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="border-t border-slate-200 dark:border-gray-700 pt-4 mt-2">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Next of Kin Information</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Input
                                        label="Next of Kin Name"
                                        type="text"
                                        placeholder="Full name"
                                        value={registerData.nextOfKin.name}
                                        onChange={(e) => setRegisterData({
                                            ...registerData,
                                            nextOfKin: { ...registerData.nextOfKin, name: e.target.value }
                                        })}
                                        required
                                    />
                                    <Input
                                        label="Next of Kin Phone"
                                        type="tel"
                                        placeholder="08012345678"
                                        value={registerData.nextOfKin.phone}
                                        onChange={(e) => setRegisterData({
                                            ...registerData,
                                            nextOfKin: { ...registerData.nextOfKin, phone: e.target.value }
                                        })}
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                    <Input
                                        label="Relationship"
                                        type="text"
                                        placeholder="e.g., Spouse, Sibling"
                                        value={registerData.nextOfKin.relation}
                                        onChange={(e) => setRegisterData({
                                            ...registerData,
                                            nextOfKin: { ...registerData.nextOfKin, relation: e.target.value }
                                        })}
                                        required
                                    />
                                    <div className="flex flex-col gap-2">
                                        <label className="text-slate-900 dark:text-gray-200 text-sm font-semibold">
                                            Next of Kin Address <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="flex w-full rounded-xl border bg-white dark:bg-gray-800 px-4 py-3 text-base text-slate-900 dark:text-white placeholder:text-[#93adc8] dark:placeholder:text-slate-500 transition-all border-[#cfdbe7] dark:border-gray-600 focus:border-primary focus:ring-2 focus:ring-primary/20"
                                            placeholder="Address"
                                            value={registerData.nextOfKin.address}
                                            onChange={(e) => setRegisterData({
                                                ...registerData,
                                                nextOfKin: { ...registerData.nextOfKin, address: e.target.value }
                                            })}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <Input
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                icon={Lock}
                                placeholder="••••••••"
                                value={registerData.password}
                                onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                                error={errors.password}
                                showPasswordToggle
                                onTogglePassword={() => setShowPassword(!showPassword)}
                                required
                            />

                            {/* Terms & Conditions Agreement  */}
                            <div className="mt-4">
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={agreedToTerms}
                                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                                        className="mt-1 w-4 h-4 text-primary bg-white dark:bg-gray-800 border-slate-300 dark:border-gray-600 rounded focus:ring-primary focus:ring-2"
                                        required
                                    />
                                    <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                        I agree to the{' '}
                                        <a
                                            href="https://www.google.com/search?q=cooperative+society+bylaws+nigeria"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline font-semibold"
                                        >
                                            Terms and Conditions
                                        </a>
                                        {' '}and{' '}
                                        <a
                                            href="https://www.google.com/search?q=cooperative+society+bylaws+nigeria"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline font-semibold"
                                        >
                                            By-laws
                                        </a>
                                        {' '}of AWSLMCSL Cooperative Society
                                    </span>
                                </label>
                            </div>

                            <Button
                                type="submit"
                                loading={loading}
                                className="mt-4"
                                fullWidth
                                disabled={!agreedToTerms || loading}
                            >
                                Create Account
                            </Button>
                        </form>
                    )}

                    {/* Helpful Links / Footer */}
                    <div className="flex flex-col gap-4 border-t border-[#e7edf3] dark:border-gray-700 pt-6">
                        <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/30">
                            <Info className="text-primary shrink-0" size={20} />
                            <p className="text-xs text-[#4c739a] dark:text-gray-300 leading-snug">
                                <strong>New Staff?</strong> Ensure you have your active @unijos.edu.ng email ready. Registration involves a one-time membership fee.
                            </p>
                        </div>

                        <div className="flex justify-center items-center gap-2 text-sm text-[#4c739a] dark:text-gray-400">
                            <Lock size={16} />
                            <span>Payments secured by <strong>Paystack</strong></span>
                        </div>

                        <div className="flex justify-center gap-6 mt-2">
                            <a href="#" className="text-xs text-[#4c739a] hover:text-primary">Privacy Policy</a>
                            <a href="#" className="text-xs text-[#4c739a] hover:text-primary">Terms of Service</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
