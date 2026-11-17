import { motion } from 'framer-motion'
import { Plus, Flame, Award, Target, Sparkles } from 'lucide-react'
import { format } from 'date-fns'

interface DailyProgressHeroProps {
  completedCount: number
  totalCount: number
  streakDays: number
  selectedDate: Date
  userName?: string
  onAddHabit: () => void
}

export function DailyProgressHero({
  completedCount,
  totalCount,
  streakDays,
  selectedDate,
  userName = 'Alex',
  onAddHabit,
}: DailyProgressHeroProps) {
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const getMotivationalMessage = () => {
    if (totalCount === 0) return 'Add your first habit to begin your journey!'
    if (percent === 100) return 'Flawless day! You crushed every single habit!'
    if (percent >= 75) return 'Almost there! Just a couple more to a perfect day!'
    if (percent >= 50) return 'Over halfway through! Great rhythm today!'
    if (percent > 0) return 'Off to a solid start. Keep the momentum going!'
    return 'Ready to make today count? Tap to check off your habits!'
  }

  // Circular progress math
  const radius = 38
  const circumference = 2 * Math.PI * radius
  const strokeOffset = circumference - (percent / 100) * circumference

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-sky-500/10 dark:from-emerald-950/40 dark:via-gray-900 dark:to-sky-950/40 border border-emerald-500/20 p-5 sm:p-7 shadow-sm"
    >
      {/* Subtle decorative background blur shapes */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-sky-400/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left Side: Greeting & Status */}
        <div className="space-y-2 max-w-lg">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              {format(selectedDate, 'EEEE, MMMM d')}
            </span>

            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20 inline-flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              {streakDays} Day Streak
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-foreground tracking-tight">
            {getGreeting()}, <span className="text-primary">{userName}</span>
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground font-medium">
            {getMotivationalMessage()}
          </p>

          <div className="pt-2 flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              onClick={onAddHabit}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-sm shadow-md shadow-emerald-500/20 hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              New Habit
            </motion.button>

            <span className="text-xs font-semibold text-muted-foreground">
              {completedCount} of {totalCount} completed
            </span>
          </div>
        </div>

        {/* Right Side: Circular Progress Widget */}
        <div className="flex items-center gap-5 bg-card/80 dark:bg-card/40 backdrop-blur-md border border-border/60 p-4 sm:p-5 rounded-3xl self-start md:self-center shadow-sm">
          <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
              {/* Background track */}
              <circle
                cx="48"
                cy="48"
                r={radius}
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-muted/40"
              />
              {/* Animated Progress Circle */}
              <motion.circle
                cx="48"
                cy="48"
                r={radius}
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                className="text-emerald-500"
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: strokeOffset }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{
                  strokeDasharray: circumference,
                }}
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xl font-bold font-serif text-foreground">
                {percent}%
              </span>
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                Done
              </span>
            </div>
          </div>

          <div className="space-y-1.5 pr-2">
            <h4 className="text-sm font-bold text-foreground">Daily Progress</h4>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Target className="w-3.5 h-3.5 text-emerald-500" />
              <span>{completedCount} habits done</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span>{Math.max(0, totalCount - completedCount)} remaining</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
