import { motion } from 'framer-motion'
import { Flame, Trophy, CheckCircle, Sparkles, TrendingUp, Compass } from 'lucide-react'
import type { Habit, HabitLog } from '../../types'
import { startOfWeek, addDays, format, isSameDay } from 'date-fns'

interface TodaySideOverviewProps {
  habits: Habit[]
  allLogs: HabitLog[]
  selectedDate: Date
  currentStreak: number
}

const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export function TodaySideOverview({
  habits,
  allLogs,
  selectedDate,
  currentStreak,
}: TodaySideOverviewProps) {
  const activeHabits = habits.filter((h) => h.is_active)
  const totalCompletedLogs = allLogs.filter((l) => l.completion_status).length

  // Calculate weekly 7 days completion rate
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
  const weeklyStats = Array.from({ length: 7 }).map((_, i) => {
    const day = addDays(weekStart, i)
    const dayStr = format(day, 'yyyy-MM-dd')
    const doneCount = allLogs.filter(
      (l) => l.log_date === dayStr && l.completion_status
    ).length
    const rate = activeHabits.length > 0 ? Math.round((doneCount / activeHabits.length) * 100) : 0
    return {
      dayName: WEEK_DAYS[i],
      dateNumber: format(day, 'd'),
      rate: Math.min(rate, 100),
      isToday: isSameDay(day, new Date()),
    }
  })

  // Category counts
  const categoryCounts = activeHabits.reduce((acc, h) => {
    acc[h.category] = (acc[h.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-5">
      {/* Streaks & Milestones Card */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="bg-card border border-border/80 rounded-3xl p-5 shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            Rhythm & Momentum
          </h4>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
            Active
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Current Streak */}
          <div className="bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 rounded-2xl p-3.5 flex flex-col justify-between">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
              <Flame className="w-4 h-4 fill-white" />
            </div>
            <div className="mt-2.5">
              <span className="text-2xl font-bold font-serif text-foreground">
                {currentStreak}
              </span>
              <p className="text-xs text-muted-foreground font-medium">Day Streak</p>
            </div>
          </div>

          {/* Total Done */}
          <div className="bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 rounded-2xl p-3.5 flex flex-col justify-between">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-sm">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div className="mt-2.5">
              <span className="text-2xl font-bold font-serif text-foreground">
                {totalCompletedLogs}
              </span>
              <p className="text-xs text-muted-foreground font-medium">Total Check-ins</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Weekly Activity Mini Graph */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        className="bg-card border border-border/80 rounded-3xl p-5 shadow-sm space-y-3.5"
      >
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Weekly Activity
          </h4>
          <span className="text-xs text-muted-foreground font-medium">This Week</span>
        </div>

        {/* Mini Bars */}
        <div className="grid grid-cols-7 gap-2 pt-2 items-end h-28">
          {weeklyStats.map((item, idx) => (
            <div key={idx} className="flex flex-col items-center h-full justify-end gap-1.5">
              <span className="text-[10px] font-bold text-muted-foreground">
                {item.rate > 0 ? `${item.rate}%` : ''}
              </span>
              <div className="w-full bg-accent/60 rounded-full h-16 relative overflow-hidden flex items-end">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(item.rate, 6)}%` }}
                  transition={{ duration: 0.5, delay: idx * 0.05 }}
                  className={`w-full rounded-full transition-colors ${
                    item.rate >= 100
                      ? 'bg-emerald-500'
                      : item.rate >= 50
                      ? 'bg-primary'
                      : 'bg-primary/40'
                  }`}
                />
              </div>
              <span
                className={`text-[11px] font-medium ${
                  item.isToday ? 'text-primary font-bold' : 'text-muted-foreground'
                }`}
              >
                {item.dayName}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Categories Distribution */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
        className="bg-card border border-border/80 rounded-3xl p-5 shadow-sm space-y-3"
      >
        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Compass className="w-4 h-4 text-purple-500" />
          Habit Balance
        </h4>

        <div className="flex flex-wrap gap-2 pt-1">
          {Object.entries(categoryCounts).map(([cat, count]) => (
            <span
              key={cat}
              className="text-xs font-semibold px-3 py-1 rounded-2xl bg-accent/80 border border-border/50 text-foreground flex items-center gap-1.5"
            >
              <span className="capitalize">{cat.replace('_', ' ')}</span>
              <span className="w-4 h-4 rounded-full bg-primary/20 text-primary text-[10px] flex items-center justify-center font-bold">
                {count}
              </span>
            </span>
          ))}
        </div>
      </motion.div>

      {/* Motivational Note */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35, delay: 0.25 }}
        className="rounded-3xl bg-gradient-to-tr from-purple-500/10 via-pink-500/10 to-amber-500/10 border border-purple-500/20 p-4 relative overflow-hidden"
      >
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-purple-500 text-white flex items-center justify-center flex-shrink-0 text-sm shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-foreground">Future You Whisper</h5>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              "Small disciplines repeated with consistency every single day lead to great achievements gained slowly over time."
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
