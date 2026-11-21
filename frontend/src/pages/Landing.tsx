import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faFire,
  faCalendarCheck,
  faCompass,
  faChartSimple,
  faArrowRight,
  faCheck,
  faAward,
} from '@fortawesome/free-solid-svg-icons'

export function Landing() {
  return (
    <div className="min-h-screen bg-[#FAF7F0] dark:bg-[#091312] text-[#1D2516] dark:text-[#F5F2EB] selection:bg-[#DFE7CF] selection:text-[#2E3B22] relative overflow-hidden transition-colors flex flex-col justify-between">
      {/* Decorative Botanical Leaf Assets in Background */}
      <div className="absolute -top-12 -left-12 w-72 sm:w-96 pointer-events-none opacity-40 dark:opacity-15 select-none z-0">
        <img
          src="/botanical/leaf-3.png"
          alt=""
          className="w-full h-auto object-contain transform -rotate-12"
        />
      </div>
      <div className="absolute top-1/3 -right-20 w-80 sm:w-104 pointer-events-none opacity-30 dark:opacity-10 select-none z-0">
        <img
          src="/botanical/leaf-1.png"
          alt=""
          className="w-full h-auto object-contain transform rotate-45"
        />
      </div>
      <div className="absolute -bottom-20 -left-16 w-80 sm:w-104 pointer-events-none opacity-35 dark:opacity-15 select-none z-0">
        <img
          src="/botanical/leaf-2.png"
          alt=""
          className="w-full h-auto object-contain transform rotate-12"
        />
      </div>

      {/* 1. Header / Navbar */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-3 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#EEF4E8] dark:bg-[#16271D] border border-[#CCD8B8] dark:border-[#22352B] flex items-center justify-center text-[#4A6225] dark:text-[#A8D968] group-hover:bg-[#E2ECD6] dark:group-hover:bg-[#1A2A20] transition-all shadow-2xs">
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6 transform -rotate-12"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M17.5,3C14,3 9,5.5 6,9C3,12.5 3,17.5 3,21C6.5,21 11.5,21 15,18C18.5,15 21,10 21,6.5C21,4.5 19.5,3 17.5,3M15.5,6C16.33,6 17,6.67 17,7.5C17,8.33 16.33,9 15.5,9C14.67,9 14,8.33 14,7.5C14,6.67 14.67,6 15.5,6M7,17C7,14 9,11.5 12,10C10.5,13 10,15.5 7,17Z" />
            </svg>
          </div>
          <span className="font-serif italic font-bold text-xl sm:text-2xl tracking-tight text-[#1D2516] dark:text-[#F5F2EB]">
            Future You
          </span>
        </Link>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <Link
            to="/login"
            className="px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[#4A6225] dark:text-[#C5DDB0] hover:text-[#1D2516] dark:hover:text-[#F5F2EB] hover:bg-[#EEF4E8] dark:hover:bg-[#16271D] transition-all"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-[#4A6225] hover:bg-[#3D521E] dark:bg-[#4E6826] dark:hover:bg-[#41581F] text-white transition-all shadow-xs flex items-center gap-1.5"
          >
            <span>Sign Up</span>
            <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
          </Link>
        </div>
      </header>

      {/* 2. Main Hero Section (Single Screen Focused) */}
      <main className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 flex flex-col justify-center gap-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Column: Value Proposition & CTAs */}
          <div className="lg:col-span-7 space-y-5 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EEF4E8] dark:bg-[#16271D] border border-[#CCD8B8] dark:border-[#22352B] text-xs font-semibold text-[#4A6225] dark:text-[#A8D968]">
              <span className="w-2 h-2 rounded-full bg-[#738541] animate-pulse" />
              <span>Botanical Habit Studio & Life Twin</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-serif font-bold tracking-tight text-[#1D2516] dark:text-[#F5F2EB] leading-[1.15]">
              Become who you are capable of being.
            </h1>

            <p className="text-sm sm:text-base text-[#5C6E56] dark:text-[#A8BCA0] font-medium leading-relaxed max-w-xl mx-auto lg:mx-0">
              Future You connects your daily routines to who you become in 6 months and 5 years. Master the 70% continuous progress rule, protect multi-day streaks, and simulate your trajectory with grounded AI.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-1">
              <Link
                to="/register"
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#4A6225] hover:bg-[#3D521E] dark:bg-[#4E6826] dark:hover:bg-[#41581F] text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <span>Start Growing Today</span>
                <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white dark:bg-[#0E1714] border border-[#E8E2D5] dark:border-[#1E2E27] text-[#1D2516] dark:text-[#F5F2EB] hover:bg-[#F5F1E8] dark:hover:bg-[#15231C] font-semibold text-sm transition-all flex items-center justify-center"
              >
                Sign In to Your Garden
              </Link>
            </div>

            {/* Quick Guarantees */}
            <div className="pt-2 flex items-center justify-center lg:justify-start gap-5 text-xs text-[#7A8C74] dark:text-[#8FA387] font-medium">
              <span className="flex items-center gap-1.5">
                <FontAwesomeIcon icon={faCheck} className="text-[#738541] dark:text-[#A8D968]" />
                <span>Zero guilt 70% rule</span>
              </span>
              <span className="flex items-center gap-1.5">
                <FontAwesomeIcon icon={faCheck} className="text-[#738541] dark:text-[#A8D968]" />
                <span>Auto-recurring daily habits</span>
              </span>
              <span className="flex items-center gap-1.5">
                <FontAwesomeIcon icon={faCheck} className="text-[#738541] dark:text-[#A8D968]" />
                <span>Grounded What-If AI</span>
              </span>
            </div>
          </div>

          {/* Right Column: High-Fidelity Botanical Mockup Card */}
          <div className="lg:col-span-5 w-full">
            <div className="bg-white/95 dark:bg-[#0E1714] border border-[#E8E2D5] dark:border-[#1E2E27] rounded-3xl p-5 sm:p-6 shadow-xl shadow-black/5 dark:shadow-black/30 space-y-4">
              {/* Mockup Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#ECE7DC] dark:border-[#1E2E27]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="font-serif font-bold text-sm text-[#1D2516] dark:text-[#F5F2EB]">
                    Daily Botanical Slate
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-[#415525] dark:text-[#A8D968] bg-[#EEF4E8] dark:bg-[#16271D] px-2 py-0.5 rounded-lg border border-[#CCD8B8] dark:border-[#22352B]">
                  Active Streak: 3 Days
                </span>
              </div>

              {/* Stats Bar Preview */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[#FAF8F3] dark:bg-[#131F19] p-2.5 rounded-xl border border-[#E8E2D5] dark:border-[#1E2E27] text-center">
                  <div className="text-[#D97706] text-xs mb-0.5">
                    <FontAwesomeIcon icon={faFire} />
                  </div>
                  <div className="text-sm font-bold text-[#1D2516] dark:text-[#F5F2EB]">3 Days</div>
                  <div className="text-[10px] text-[#7A8C74] dark:text-[#8FA387]">Current Streak</div>
                </div>
                <div className="bg-[#FAF8F3] dark:bg-[#131F19] p-2.5 rounded-xl border border-[#E8E2D5] dark:border-[#1E2E27] text-center">
                  <div className="text-[#738541] text-xs mb-0.5">
                    <FontAwesomeIcon icon={faCalendarCheck} />
                  </div>
                  <div className="text-sm font-bold text-[#1D2516] dark:text-[#F5F2EB]">56%</div>
                  <div className="text-[10px] text-[#7A8C74] dark:text-[#8FA387]">Adherence</div>
                </div>
                <div className="bg-[#FAF8F3] dark:bg-[#131F19] p-2.5 rounded-xl border border-[#E8E2D5] dark:border-[#1E2E27] text-center">
                  <div className="text-[#B45309] text-xs mb-0.5">
                    <FontAwesomeIcon icon={faAward} />
                  </div>
                  <div className="text-sm font-bold text-[#1D2516] dark:text-[#F5F2EB]">Quickdraw</div>
                  <div className="text-[10px] text-[#7A8C74] dark:text-[#8FA387]">Unlocked Nov 18</div>
                </div>
              </div>

              {/* Habit Squircle Row Preview */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs font-semibold text-[#1D2516] dark:text-[#F5F2EB]">
                  <span>Today's Routines</span>
                  <span className="text-[#7A8C74] dark:text-[#8FA387] font-normal">Auto-recurring daily</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF8F3] dark:bg-[#131F19] border border-[#E8E2D5] dark:border-[#1E2E27]">
                    <span className="text-xs font-semibold text-[#1D2516] dark:text-[#F5F2EB]">Morning Hydration</span>
                    <span className="text-[11px] font-bold text-[#4A6225] dark:text-[#A8D968]">100% (Done)</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF8F3] dark:bg-[#131F19] border border-[#E8E2D5] dark:border-[#1E2E27]">
                    <span className="text-xs font-semibold text-[#1D2516] dark:text-[#F5F2EB]">90-Min Deep Study</span>
                    <span className="text-[11px] font-bold text-[#738541] dark:text-[#B6DB8A]">68% (70% Win)</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF8F3] dark:bg-[#131F19] border border-[#E8E2D5] dark:border-[#1E2E27]">
                    <span className="text-xs font-semibold text-[#1D2516] dark:text-[#F5F2EB]">Evening Disconnect</span>
                    <span className="text-[11px] text-[#8C7A6B] dark:text-[#9BAF90]">Ready for tonight</span>
                  </div>
                </div>
              </div>

              {/* Future Me Preview Snippet */}
              <div className="p-3 rounded-2xl bg-[#EEF4E8] dark:bg-[#16271D] border border-[#CCD8B8] dark:border-[#22352B] space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#4A6225] dark:text-[#A8D968]">
                  <FontAwesomeIcon icon={faCompass} />
                  <span>Future You AI Projection</span>
                </div>
                <p className="text-[11px] text-[#556244] dark:text-[#9BAF90] italic leading-tight">
                  "Maintaining this 3-day consistency compounds into 45+ extra hours of deep focus over the next 6 months."
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Core Feature Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="bg-white/80 dark:bg-[#0E1714] border border-[#E8E2D5] dark:border-[#1E2E27] rounded-2xl p-4 space-y-1.5 shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-[#EEF4E8] dark:bg-[#16271D] text-[#4A6225] dark:text-[#A8D968] flex items-center justify-center text-xs">
              <FontAwesomeIcon icon={faCheck} />
            </div>
            <h3 className="font-serif font-bold text-sm text-[#1D2516] dark:text-[#F5F2EB]">
              Auto-Recurring Daily Habits
            </h3>
            <p className="text-xs text-[#5C6E56] dark:text-[#8FA387] leading-relaxed">
              New days instantiate with active daily habits automatically. Streaks never break just because you forgot to copy.
            </p>
          </div>

          <div className="bg-white/80 dark:bg-[#0E1714] border border-[#E8E2D5] dark:border-[#1E2E27] rounded-2xl p-4 space-y-1.5 shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-[#EEF4E8] dark:bg-[#16271D] text-[#4A6225] dark:text-[#A8D968] flex items-center justify-center text-xs">
              <FontAwesomeIcon icon={faFire} />
            </div>
            <h3 className="font-serif font-bold text-sm text-[#1D2516] dark:text-[#F5F2EB]">
              70% Rule & Realistic Streaks
            </h3>
            <p className="text-xs text-[#5C6E56] dark:text-[#8FA387] leading-relaxed">
              Continuous progress beats perfectionism. Avoid zero-days and celebrate partial wins that conquer inertia.
            </p>
          </div>

          <div className="bg-white/80 dark:bg-[#0E1714] border border-[#E8E2D5] dark:border-[#1E2E27] rounded-2xl p-4 space-y-1.5 shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-[#EEF4E8] dark:bg-[#16271D] text-[#4A6225] dark:text-[#A8D968] flex items-center justify-center text-xs">
              <FontAwesomeIcon icon={faChartSimple} />
            </div>
            <h3 className="font-serif font-bold text-sm text-[#1D2516] dark:text-[#F5F2EB]">
              Shared Transparent Insights
            </h3>
            <p className="text-xs text-[#5C6E56] dark:text-[#8FA387] leading-relaxed">
              Future days are excluded from averages and shown as upcoming. Dashboard and Insights numbers never disagree.
            </p>
          </div>

          <div className="bg-white/80 dark:bg-[#0E1714] border border-[#E8E2D5] dark:border-[#1E2E27] rounded-2xl p-4 space-y-1.5 shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-[#EEF4E8] dark:bg-[#16271D] text-[#4A6225] dark:text-[#A8D968] flex items-center justify-center text-xs">
              <FontAwesomeIcon icon={faCompass} />
            </div>
            <h3 className="font-serif font-bold text-sm text-[#1D2516] dark:text-[#F5F2EB]">
              Future You & What-If Chat
            </h3>
            <p className="text-xs text-[#5C6E56] dark:text-[#8FA387] leading-relaxed">
              Simulate 6-month and 5-year trajectories grounded strictly in your live habit completion data.
            </p>
          </div>
        </div>
      </main>

      {/* 4. Footer */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 border-t border-[#ECE7DC] dark:border-[#1E2E27] flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-[#7A8C74] dark:text-[#8FA387]">
        <p>© {new Date().getFullYear()} Future You · Cultivating personal potential with care.</p>
        <div className="flex items-center gap-4 text-[11px]">
          <Link to="/terms" className="text-[#4A6225] dark:text-[#A8D968] hover:underline">
            Terms of Growth
          </Link>
          <span>•</span>
          <Link to="/privacy" className="text-[#4A6225] dark:text-[#A8D968] hover:underline">
            Privacy Sanctuary
          </Link>
        </div>
      </footer>
    </div>
  )
}
