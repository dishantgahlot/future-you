import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Loader2, AlertCircle, CheckCircle2, ArrowLeft, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function ForgotPassword() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Email address is required')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please provide a valid email address')
      return
    }

    setLoading(true)

    const { error: resetError } = await resetPassword(email.trim())
    if (resetError) {
      setError(resetError.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[#FAF7F0] dark:bg-[#091312] px-4 py-12 overflow-hidden selection:bg-[#DFE7CF] selection:text-[#2E3B22] transition-colors">
      {/* Decorative Botanical Leaf Assets */}
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
            {success ? 'Recovery link sent' : 'Recover your path'}
          </h1>
          <p className="text-sm text-[#767C6B] dark:text-[#A8BCA0] mt-1.5 max-w-xs mx-auto">
            {success
              ? 'Check your inbox for step-by-step password reset instructions.'
              : 'Enter your email address and we will dispatch a secure recovery link.'}
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-white dark:bg-[#0E1714] border border-[#E8E2D5] dark:border-[#1E2E27] rounded-3xl p-7 sm:p-8 shadow-xl shadow-black/5 dark:shadow-black/40">
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

          {success ? (
            <div className="space-y-5 text-center py-2">
              <div className="w-14 h-14 rounded-2xl bg-[#EEF4E8] dark:bg-[#16271D] text-[#4A6225] dark:text-[#A8D968] flex items-center justify-center mx-auto shadow-xs border border-[#CCD8B8] dark:border-[#22352B]">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-[#1D2516] dark:text-[#F5F2EB]">Instructions Dispatched</p>
                <p className="text-xs text-[#767C6B] dark:text-[#A8BCA0] leading-relaxed">
                  We sent a recovery message to <strong className="text-[#1D2516] dark:text-[#F5F2EB]">{email}</strong>. Follow the link inside to set a new password.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  to="/login"
                  className="w-full py-3 bg-[#4A6225] hover:bg-[#3D521E] dark:bg-[#4E6826] dark:hover:bg-[#41581F] text-white rounded-2xl font-semibold text-sm shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to Sign In</span>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-4.5">
              <div>
                <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-[#43522C] dark:text-[#A8D968] mb-1.5">
                  Your Account Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[#4A6225] dark:text-[#A8D968]" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-11 pr-4 py-3 bg-[#FAF7F0] dark:bg-[#121D18] border border-[#E8E2D5] dark:border-[#22352B] rounded-2xl text-[#1D2516] dark:text-[#F5F2EB] placeholder:text-[#9BA18F] dark:placeholder:text-[#6E8268] text-sm focus:outline-none focus:ring-2 focus:ring-[#738541]/30 focus:border-[#738541] focus:bg-white dark:focus:bg-[#15231C] transition-all"
                    required
                    autoComplete="email"
                    disabled={loading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#4A6225] hover:bg-[#3D521E] dark:bg-[#4E6826] dark:hover:bg-[#41581F] active:scale-[0.99] text-white rounded-2xl font-semibold text-sm shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Sending recovery email...</span>
                  </>
                ) : (
                  <>
                    <span>Send Recovery Link</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {!success && (
            <div className="mt-6 text-center pt-4 border-t border-[#F0ECE1] dark:border-[#1E2E27]">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4A6225] dark:text-[#A8D968] hover:underline transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to sign in</span>
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
