import { Link } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'

export function Privacy() {
  return (
    <div className="min-h-screen bg-[#FAF7F0] dark:bg-[#091312] text-[#1D2516] dark:text-[#F5F2EB] px-4 py-12 transition-colors">
      <div className="max-w-2xl mx-auto space-y-8">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#4A6225] dark:text-[#A8D968] hover:underline transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Sign In</span>
        </Link>

        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF4E8] dark:bg-[#16271D] text-[#4A6225] dark:text-[#A8D968] text-xs font-semibold border border-[#CCD8B8] dark:border-[#22352B]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Privacy Sanctuary</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight">
            Privacy Sanctuary
          </h1>
          <p className="text-xs sm:text-sm text-[#6F7762] dark:text-[#9BAF90]">
            Last updated: November 2026 · Your habit journey is confidential and protected.
          </p>
        </div>

        {/* Card Content */}
        <div className="bg-white dark:bg-[#0E1714] border border-[#E8E2D5] dark:border-[#1E2E27] rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <section className="space-y-2">
            <h2 className="text-base font-serif font-bold text-[#2D3B18] dark:text-[#C5DDB0]">
              1. What We Collect
            </h2>
            <p className="text-xs sm:text-sm text-[#556244] dark:text-[#9BAF90] leading-relaxed">
              We only collect data necessary to calculate your streaks, display your consistency heatmaps, and power your Future You simulations: habit definitions, target values, daily check-in logs, and optional journal reflections.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-serif font-bold text-[#2D3B18] dark:text-[#C5DDB0]">
              2. How Your Data is Used
            </h2>
            <p className="text-xs sm:text-sm text-[#556244] dark:text-[#9BAF90] leading-relaxed">
              Your habit data is processed exclusively to provide personalized statistics, visual progress heatmaps, and AI reflections. We never share your data with advertisers, third-party data brokers, or external trackers.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-serif font-bold text-[#2D3B18] dark:text-[#C5DDB0]">
              3. Encryption & Storage
            </h2>
            <p className="text-xs sm:text-sm text-[#556244] dark:text-[#9BAF90] leading-relaxed">
              All communications between your device and our servers are encrypted in transit via TLS/HTTPS and stored securely in dedicated PostgreSQL databases with row-level access controls.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-serif font-bold text-[#2D3B18] dark:text-[#C5DDB0]">
              4. You Control Your Data
            </h2>
            <p className="text-xs sm:text-sm text-[#556244] dark:text-[#9BAF90] leading-relaxed">
              You can modify, archive, or permanently delete your habits and logs at any point. Account deletion permanently removes all associated data from our systems.
            </p>
          </section>
        </div>

        <div className="text-center text-xs text-[#8D947F] dark:text-[#6E8268]">
          <Link to="/terms" className="text-[#4A6225] dark:text-[#A8D968] hover:underline font-semibold">
            Read our Terms of Growth
          </Link>
        </div>
      </div>
    </div>
  )
}
