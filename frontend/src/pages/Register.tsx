import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Lock, User, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function Register() {
  const navigate = useNavigate()
  const { signUp } = useAuth()

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const validateForm = () => {
    if (!formData.full_name.trim()) return 'Full name is required'
    if (!formData.email.trim()) return 'Email is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) return 'Please enter a valid email address'
    if (formData.password.length < 8) return 'Password must be at least 8 characters'
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match'
    if (!agreedToTerms) return 'Please agree to the Terms of Growth & Privacy Policy'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setError('')
    setLoading(true)

    const { error: signUpError } = await signUp(
      formData.email.trim(),
      formData.password,
      formData.full_name.trim()
    )

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
    } else {
      navigate('/login', {
        state: {
          email: formData.email.trim(),
          message: 'Account created successfully! Please sign in with your password.',
        },
      })
    }
  }

  const passwordStrength = {
    checks: [
      { label: 'At least 8 characters', test: formData.password.length >= 8 },
      { label: 'Uppercase letter', test: /[A-Z]/.test(formData.password) },
      { label: 'Lowercase letter', test: /[a-z]/.test(formData.password) },
      { label: 'Number', test: /\d/.test(formData.password) },
      { label: 'Special character', test: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password) },
    ],
  }
  const score = passwordStrength.checks.filter(c => c.test).length

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[#FAF7F0] dark:bg-[#091312] px-4 py-12 overflow-hidden selection:bg-[#DFE7CF] selection:text-[#2E3B22] transition-colors">
      {/* Decorative Botanical Leaf Assets */}
      <div className="absolute -top-12 -right-12 w-64 sm:w-80 pointer-events-none opacity-40 dark:opacity-15 select-none z-0">
        <img
          src="/botanical/leaf-3.png"
          alt=""
          className="w-full h-auto object-contain transform rotate-45"
        />
      </div>
      <div className="absolute -bottom-16 -left-12 w-64 sm:w-88 pointer-events-none opacity-35 dark:opacity-15 select-none z-0">
        <img
          src="/botanical/leaf-2.png"
          alt=""
          className="w-full h-auto object-contain transform -rotate-12"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        {/* Brand Header */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2.5 group mb-3">
            <div className="w-11 h-11 rounded-2xl bg-[#EEF4E8] dark:bg-[#16271D] border border-[#CCD8B8] dark:border-[#22352B] flex items-center justify-center text-[#4A6225] dark:text-[#A8D968] group-hover:bg-[#E2ECD6] dark:group-hover:bg-[#1A2A20] transition-all shadow-2xs">
              <svg
                className="w-6 h-6 transform -rotate-12"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M17.5,3C14,3 9,5.5 6,9C3,12.5 3,17.5 3,21C6.5,21 11.5,21 15,18C18.5,15 21,10 21,6.5C21,4.5 19.5,3 17.5,3M15.5,6C16.33,6 17,6.67 17,7.5C17,8.33 16.33,9 15.5,9C14.67,9 14,8.33 14,7.5C14,6.67 14.67,6 15.5,6M7,17C7,14 9,11.5 12,10C10.5,13 10,15.5 7,17Z" />
              </svg>
            </div>
            <span className="font-serif italic font-bold text-2xl sm:text-3xl tracking-tight text-[#1D2516] dark:text-[#F5F2EB]">
              Future You
            </span>
          </Link>

          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1D2516] dark:text-[#F5F2EB] tracking-tight">
            Plant the seeds of tomorrow
          </h1>
          <p className="text-sm text-[#767C6B] dark:text-[#A8BCA0] mt-1.5 max-w-xs mx-auto">
            Create an account to track habits, unlock your twin, and grow daily.
          </p>
        </div>

        {/* Auth Card Container */}
        <div className="bg-white dark:bg-[#0E1714] border border-[#E8E2D5] dark:border-[#1E2E27] rounded-3xl p-5 sm:p-8 shadow-xl shadow-black/5 dark:shadow-black/40">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 rounded-2xl flex items-start gap-2.5"
            >
              <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm font-medium">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label htmlFor="full_name" className="block text-xs font-semibold uppercase tracking-wider text-[#43522C] dark:text-[#A8D968] mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[#4A6225] dark:text-[#A8D968]" />
                <input
                  id="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Dishant Gahlot"
                  className="w-full pl-11 pr-4 py-2.5 sm:py-3 bg-[#FAF7F0] dark:bg-[#121D18] border border-[#E8E2D5] dark:border-[#22352B] rounded-2xl text-[#1D2516] dark:text-[#F5F2EB] placeholder:text-[#9BA18F] dark:placeholder:text-[#6E8268] text-sm focus:outline-none focus:ring-2 focus:ring-[#738541]/30 focus:border-[#738541] focus:bg-white dark:focus:bg-[#15231C] transition-all"
                  required
                  autoComplete="name"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-[#43522C] dark:text-[#A8D968] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[#4A6225] dark:text-[#A8D968]" />
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="you@example.com"
                  className="w-full pl-11 pr-4 py-2.5 sm:py-3 bg-[#FAF7F0] dark:bg-[#121D18] border border-[#E8E2D5] dark:border-[#22352B] rounded-2xl text-[#1D2516] dark:text-[#F5F2EB] placeholder:text-[#9BA18F] dark:placeholder:text-[#6E8268] text-sm focus:outline-none focus:ring-2 focus:ring-[#738541]/30 focus:border-[#738541] focus:bg-white dark:focus:bg-[#15231C] transition-all"
                  required
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-[#43522C] dark:text-[#A8D968] mb-1.5">
                Create Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[#4A6225] dark:text-[#A8D968]" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="••••••••••••"
                  className="w-full pl-11 pr-11 py-2.5 sm:py-3 bg-[#FAF7F0] dark:bg-[#121D18] border border-[#E8E2D5] dark:border-[#22352B] rounded-2xl text-[#1D2516] dark:text-[#F5F2EB] placeholder:text-[#9BA18F] dark:placeholder:text-[#6E8268] text-sm focus:outline-none focus:ring-2 focus:ring-[#738541]/30 focus:border-[#738541] focus:bg-white dark:focus:bg-[#15231C] transition-all"
                  required
                  autoComplete="new-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8DA55D] hover:text-[#43522C] dark:text-[#A8D968]/70 dark:hover:text-[#A8D968] transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-2.5 p-3 bg-[#FAF7F0] dark:bg-[#121D18] rounded-2xl border border-[#E8E2D5] dark:border-[#22352B] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#43522C] dark:text-[#A8D968]">Password strength</span>
                    <span className="font-semibold text-[#4A6225] dark:text-[#A8D968]">
                      {score <= 2 ? 'Weak' : score <= 4 ? 'Good' : 'Strong'}
                    </span>
                  </div>
                  <div className="h-1.5 bg-[#E8E2D5] dark:bg-[#1A2820] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(score / 5) * 100}%` }}
                      className={`h-full rounded-full transition-all duration-300 ${
                        score <= 2 ? 'bg-amber-500' : score <= 4 ? 'bg-[#8DA55D]' : 'bg-[#4A6225] dark:bg-[#A8D968]'
                      }`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-1">
                    {passwordStrength.checks.map((check, index) => (
                      <div key={index} className="flex items-center gap-1.5">
                        <CheckCircle2
                          className={`w-3.5 h-3.5 flex-shrink-0 ${
                            check.test ? 'text-[#4A6225] dark:text-[#A8D968]' : 'text-[#CCD8B8] dark:text-[#2E4233]'
                          }`}
                        />
                        <span className={check.test ? 'text-[#2D3421] dark:text-[#E2EBD8] font-medium' : 'text-[#9BA18F] dark:text-[#6E8268]'}>
                          {check.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-semibold uppercase tracking-wider text-[#43522C] dark:text-[#A8D968] mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[#4A6225] dark:text-[#A8D968]" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="••••••••••••"
                  className="w-full pl-11 pr-11 py-2.5 sm:py-3 bg-[#FAF7F0] dark:bg-[#121D18] border border-[#E8E2D5] dark:border-[#22352B] rounded-2xl text-[#1D2516] dark:text-[#F5F2EB] placeholder:text-[#9BA18F] dark:placeholder:text-[#6E8268] text-sm focus:outline-none focus:ring-2 focus:ring-[#738541]/30 focus:border-[#738541] focus:bg-white dark:focus:bg-[#15231C] transition-all"
                  required
                  autoComplete="new-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8DA55D] hover:text-[#43522C] dark:text-[#A8D968]/70 dark:hover:text-[#A8D968] transition-colors cursor-pointer"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Passwords do not match
                </p>
              )}
            </div>

            {/* Terms Agreement */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  required
                  className="mt-0.5 w-4 h-4 rounded text-[#4A6225] border-[#CCD8B8] dark:border-[#22352B] focus:ring-[#738541] accent-[#4A6225] cursor-pointer"
                />
                <span className="text-xs text-[#767C6B] dark:text-[#A8BCA0] leading-snug">
                  I agree to the{' '}
                  <Link to="/terms" className="text-[#4A6225] dark:text-[#A8D968] font-medium hover:underline">
                    Terms of Growth
                  </Link>
                  {' '}and{' '}
                  <Link to="/privacy" className="text-[#4A6225] dark:text-[#A8D968] font-medium hover:underline">
                    Privacy Sanctuary
                  </Link>
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#4A6225] hover:bg-[#3D521E] dark:bg-[#4E6826] dark:hover:bg-[#41581F] active:scale-[0.99] text-white rounded-2xl font-semibold text-sm shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Switch to Login */}
          <div className="mt-6 text-center pt-4 border-t border-[#F0ECE1] dark:border-[#1E2E27]">
            <p className="text-xs text-[#767C6B] dark:text-[#A8BCA0]">
              Already cultivating your habits?{' '}
              <Link to="/login" className="text-[#4A6225] dark:text-[#A8D968] font-semibold hover:underline transition-colors">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
