import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useUserProfile } from '../contexts/UserProfileContext'

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn, resendConfirmationEmail } = useAuth()
  const { recordNewLogin } = useUserProfile()
  
  const [email, setEmail] = useState(() => (location.state as any)?.email || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState('')
  const [infoMessage, setInfoMessage] = useState(() => (location.state as any)?.message || '')

  const handleResend = async () => {
    if (!email.trim()) return
    setResending(true)
    setResendSuccess('')
    const { error: resendErr } = await resendConfirmationEmail(email.trim())
    setResending(false)
    if (resendErr) {
      setError(resendErr.message)
    } else {
      setResendSuccess('Account verified or confirmation link dispatched! Try signing in now.')
      setError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfoMessage('')
    setResendSuccess('')

    const trimmed = email.trim()
    if (!trimmed.includes('@')) {
      setError('Please sign in with your full email address (e.g. you@example.com), not a username.')
      return
    }

    setLoading(true)

    const { error } = await signIn(trimmed, password)
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      recordNewLogin('Account Sign In')
      navigate('/dashboard', { replace: true })
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[#FAF7F0] dark:bg-[#091312] px-4 py-12 overflow-hidden selection:bg-[#DFE7CF] selection:text-[#2E3B22] transition-colors">
      {/* Decorative Botanical Leaf Assets in Background */}
      <div className="absolute -top-12 -left-12 w-64 sm:w-80 pointer-events-none opacity-40 dark:opacity-15 select-none z-0">
        <img
          src="/botanical/leaf-3.png"
          alt=""
          className="w-full h-auto object-contain transform -rotate-12"
        />
      </div>
      <div className="absolute -bottom-16 -right-12 w-64 sm:w-88 pointer-events-none opacity-35 dark:opacity-15 select-none z-0">
        <img
          src="/botanical/leaf-2.png"
          alt=""
          className="w-full h-auto object-contain transform rotate-6"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        {/* Brand Header */}
        <div className="text-center mb-7">
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
            Cultivate your potential
          </h1>
          <p className="text-sm text-[#767C6B] dark:text-[#A8BCA0] mt-1.5 max-w-xs mx-auto">
            Sign in to track your habits, consistency & shape your future self.
          </p>
        </div>

        {/* Auth Card Container */}
        <div className="bg-white dark:bg-[#0E1714] border border-[#E8E2D5] dark:border-[#1E2E27] rounded-3xl p-5 sm:p-8 shadow-xl shadow-black/5 dark:shadow-black/40">
          {infoMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded-2xl flex items-start gap-2.5 text-xs sm:text-sm font-medium"
            >
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <p>{infoMessage}</p>
            </motion.div>
          )}

          {resendSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded-2xl flex items-start gap-2.5 text-xs sm:text-sm font-medium"
            >
              <ArrowRight className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <p>{resendSuccess}</p>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 rounded-2xl flex flex-col gap-2"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm font-medium">{error}</p>
              </div>

              {error.toLowerCase().includes('email not confirmed') && (
                <div className="pt-2 border-t border-rose-200/60 dark:border-rose-900/40 flex items-center justify-between">
                  <span className="text-[11px] text-rose-700 dark:text-rose-400">Need verification?</span>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="text-xs font-semibold underline text-rose-900 dark:text-rose-200 hover:text-rose-950 cursor-pointer disabled:opacity-50"
                  >
                    {resending ? 'Verifying...' : 'Verify Email & Sign In'}
                  </button>
                </div>
              )}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-4.5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-[#43522C] dark:text-[#A8D968] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[#4A6225] dark:text-[#A8D968]" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.replace(/['"`]/g, '').trim())}
                  placeholder="you@example.com"
                  className="w-full pl-11 pr-4 py-3 bg-[#FAF7F0] dark:bg-[#121D18] border border-[#E8E2D5] dark:border-[#22352B] rounded-2xl text-[#1D2516] dark:text-[#F5F2EB] placeholder:text-[#9BA18F] dark:placeholder:text-[#6E8268] text-sm focus:outline-none focus:ring-2 focus:ring-[#738541]/30 focus:border-[#738541] focus:bg-white dark:focus:bg-[#15231C] transition-all"
                  required
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-[#43522C] dark:text-[#A8D968]">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-[#4A6225] dark:text-[#A8D968] hover:underline font-medium transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[#4A6225] dark:text-[#A8D968]" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-11 pr-11 py-3 bg-[#FAF7F0] dark:bg-[#121D18] border border-[#E8E2D5] dark:border-[#22352B] rounded-2xl text-[#1D2516] dark:text-[#F5F2EB] placeholder:text-[#9BA18F] dark:placeholder:text-[#6E8268] text-sm focus:outline-none focus:ring-2 focus:ring-[#738541]/30 focus:border-[#738541] focus:bg-white dark:focus:bg-[#15231C] transition-all"
                  required
                  autoComplete="current-password"
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
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-[#4A6225] border-[#CCD8B8] dark:border-[#22352B] focus:ring-[#738541] accent-[#4A6225] cursor-pointer"
                />
                <span className="text-xs text-[#767C6B] dark:text-[#A8BCA0]">Remember this device</span>
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
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Switch to Register */}
          <div className="mt-6 text-center pt-4 border-t border-[#F0ECE1] dark:border-[#1E2E27]">
            <p className="text-xs text-[#767C6B] dark:text-[#A8BCA0]">
              New to Future You?{' '}
              <Link to="/register" className="text-[#4A6225] dark:text-[#A8D968] font-semibold hover:underline transition-colors">
                Begin your journey (Sign Up)
              </Link>
            </p>
          </div>
        </div>

        {/* Bottom Terms & Privacy */}
        <div className="mt-6 text-center text-xs text-[#8D947F] dark:text-[#6E8268]">
          <p>By continuing, you agree to cultivate with care.</p>
          <div className="flex justify-center gap-4 mt-1.5 text-[11px]">
            <Link to="/terms" className="text-[#4A6225] dark:text-[#A8D968] hover:underline">Terms of Growth</Link>
            <span>•</span>
            <Link to="/privacy" className="text-[#4A6225] dark:text-[#A8D968] hover:underline">Privacy Sanctuary</Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
