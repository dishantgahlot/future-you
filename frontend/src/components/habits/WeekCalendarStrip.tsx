import { startOfWeek, endOfWeek, addDays, isSameDay, isToday, format } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Habit, HabitLog } from '../../types'

interface WeekCalendarStripProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  habits: Habit[]
  allLogs: HabitLog[]
}

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function WeekCalendarStrip({
  selectedDate,
  onSelectDate,
  habits,
  allLogs,
}: WeekCalendarStripProps) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }) // Start Monday
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 })

  const weekDays = Array.from({ length: 7 }).map((_, index) =>
    addDays(weekStart, index)
  )

  const handlePrevWeek = () => {
    onSelectDate(addDays(selectedDate, -7))
  }

  const handleNextWeek = () => {
    onSelectDate(addDays(selectedDate, 7))
  }

  const handleGoToToday = () => {
    onSelectDate(new Date())
  }

  // Calculate completion percentage for each day
  const getDayCompletion = (date: Date) => {
    const activeHabits = habits.filter((h) => h.is_active)
    if (activeHabits.length === 0) return 0
    const dateStr = format(date, 'yyyy-MM-dd')
    const dayLogs = allLogs.filter(
      (l) => l.log_date === dateStr && l.completion_status
    )
    return Math.round((dayLogs.length / activeHabits.length) * 100)
  }

  return (
    <div className="bg-card border border-border/80 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3.5">
      {/* Top Header: Week range & navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
            </h4>
            <p className="text-xs text-muted-foreground">Select a day to track or review</p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5">
          {!isToday(selectedDate) && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleGoToToday}
              className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors mr-1"
            >
              Today
            </motion.button>
          )}

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handlePrevWeek}
            className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-5 h-5" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleNextWeek}
            className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Next week"
          >
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      {/* Week Days Row */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {weekDays.map((day, idx) => {
          const isSelected = isSameDay(day, selectedDate)
          const isCurrentToday = isToday(day)
          const completion = getDayCompletion(day)
          const isFullyDone = completion >= 100

          return (
            <motion.button
              key={idx}
              whileTap={{ scale: 0.92 }}
              onClick={() => onSelectDate(day)}
              className={`flex flex-col items-center justify-between py-2.5 sm:py-3.5 px-1 sm:px-2 rounded-2xl sm:rounded-3xl transition-all duration-200 relative ${
                isSelected
                  ? 'bg-gradient-to-b from-primary to-primary-light text-primary-foreground shadow-lg shadow-primary/25 scale-[1.03]'
                  : isCurrentToday
                  ? 'bg-accent/70 border border-primary/40 text-foreground'
                  : 'bg-muted/40 hover:bg-accent/60 text-foreground'
              }`}
            >
              {/* Day Name */}
              <span
                className={`text-[11px] sm:text-xs font-medium uppercase tracking-wider ${
                  isSelected
                    ? 'text-primary-foreground/90 font-semibold'
                    : 'text-muted-foreground'
                }`}
              >
                {WEEK_DAYS[day.getDay()]}
              </span>

              {/* Day Number */}
              <span
                className={`text-base sm:text-lg font-bold my-1 ${
                  isSelected ? 'text-primary-foreground' : 'text-foreground'
                }`}
              >
                {format(day, 'd')}
              </span>

              {/* Completion Indicator */}
              <div className="flex items-center justify-center mt-0.5">
                {isFullyDone ? (
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      isSelected
                        ? 'bg-white text-primary'
                        : 'bg-emerald-500 text-white'
                    }`}
                  >
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                ) : completion > 0 ? (
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      isSelected
                        ? 'bg-white/90'
                        : 'bg-emerald-500/80 animate-pulse'
                    }`}
                  />
                ) : (
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      isSelected ? 'bg-white/40' : 'bg-muted-foreground/30'
                    }`}
                  />
                )}
              </div>

              {isCurrentToday && !isSelected && (
                <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
