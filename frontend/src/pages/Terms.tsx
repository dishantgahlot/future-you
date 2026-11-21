import { Link } from 'react-router-dom'
import { ArrowLeft, Sprout } from 'lucide-react'

export function Terms() {
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
            <Sprout className="w-3.5 h-3.5" />
            <span>Foundational Principles</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight">
            Terms of Growth
          </h1>
          <p className="text-xs sm:text-sm text-[#6F7762] dark:text-[#9BAF90]">
            Last updated: November 2026 · Built to protect your focus, trajectory, and personal commitment.
          </p>
        </div>

        {/* Card Content */}
        <div className="bg-white dark:bg-[#0E1714] border border-[#E8E2D5] dark:border-[#1E2E27] rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <section className="space-y-2">
            <h2 className="text-base font-serif font-bold text-[#2D3B18] dark:text-[#C5DDB0]">
              1. The Pact with Your Future Self
            </h2>
            <p className="text-xs sm:text-sm text-[#556244] dark:text-[#9BAF90] leading-relaxed">
              Future You is designed as a sanctuary for deliberate personal growth. By using this service, you agree to treat your daily habits with intention. We provide behavioral diagnostics, consistency tracking, and compound projection tools to support your authentic growth.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-serif font-bold text-[#2D3B18] dark:text-[#C5DDB0]">
              2. The 70% Rule & Realistic Consistency
            </h2>
            <p className="text-xs sm:text-sm text-[#556244] dark:text-[#9BAF90] leading-relaxed">
              We reject all-or-nothing perfectionism. Hitting 70% of a daily target is celebrated as a valid win that overcomes inertia. You remain in complete control of all habit targets, schedules, and definitions.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-serif font-bold text-[#2D3B18] dark:text-[#C5DDB0]">
              3. Data Ownership & Sovereignty
            </h2>
            <p className="text-xs sm:text-sm text-[#556244] dark:text-[#9BAF90] leading-relaxed">
              Your habit logs, reflections, and personal entries are exclusively yours. We never sell, monetize, or exploit your habit data for external advertising. You can export or delete your account data at any time from Settings.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-serif font-bold text-[#2D3B18] dark:text-[#C5DDB0]">
              4. Artificial Intelligence & Guidance
            </h2>
            <p className="text-xs sm:text-sm text-[#556244] dark:text-[#9BAF90] leading-relaxed">
              Projections, What-If simulations, and Future You letters are generated using mathematical compounding models and generative AI for inspirational and reflective purposes. They do not constitute formal medical or clinical advice.
            </p>
          </section>
        </div>

        <div className="text-center text-xs text-[#8D947F] dark:text-[#6E8268]">
          <Link to="/privacy" className="text-[#4A6225] dark:text-[#A8D968] hover:underline font-semibold">
            Read our Privacy Sanctuary
          </Link>
        </div>
      </div>
    </div>
  )
}
