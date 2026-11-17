import { useMemo } from 'react'
import { Flame, Trophy, Award, ChevronRight, Sprout, BookOpen, Dumbbell, Moon } from 'lucide-react'
import { parseISO, differenceInCalendarDays } from 'date-fns'
import type { HabitLog } from '../../types'

interface StreaksCardProps {
  allLogs?: HabitLog[]
}

export function StreaksCard({ allLogs = [] }: StreaksCardProps) {
  const { currentStreak, bestStreak } = useMemo(() => {
    // Collect unique active dates
    const activeDates = Array.from(
      new Set(allLogs.filter((l) => l.completion_status).map((l) => l.log_date))
    ).sort() // ascending order

    if (activeDates.length === 0) {
      return { currentStreak: 0, bestStreak: 0 }
    }

    let maxStreak = 1
    let tempStreak = 1

    for (let i = 1; i < activeDates.length; i++) {
      const prevDate = parseISO(activeDates[i - 1])
      const currDate = parseISO(activeDates[i])
      const diff = differenceInCalendarDays(currDate, prevDate)

      if (diff === 1) {
        tempStreak++
        maxStreak = Math.max(maxStreak, tempStreak)
      } else if (diff > 1) {
        tempStreak = 1
      }
    }

    // Current streak ending today or yesterday
    const today = new Date()
    const lastActive = parseISO(activeDates[activeDates.length - 1])
    const daysSinceLast = differenceInCalendarDays(today, lastActive)

    const curr = daysSinceLast <= 1 ? tempStreak : 0

    return { currentStreak: curr, bestStreak: Math.max(maxStreak, curr) }
  }, [allLogs])

  return (
    <div className="bg-white border border-botanical-border rounded-2xl sm:rounded-3xl p-3.5 sm:p-4.5 shadow-xs flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2.5 border-b border-botanical-border/40">
        <div className="w-7 h-7 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 shadow-xs">
          <Flame className="w-4 h-4" />
        </div>
        <h3 className="text-lg font-serif font-bold text-leaf-darkText leading-none">
          Streaks
        </h3>
      </div>

      {/* Two Metric Boxes */}
      <div className="grid grid-cols-2 gap-2.5 pt-2.5">
        {/* Current Streak */}
        <div className="bg-botanical-cream/60 border border-botanical-border/70 rounded-xl p-2.5 sm:p-3 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Flame className="w-4 h-4 fill-amber-500/30" />
          </div>
          <div>
            <h4 className="text-base sm:text-lg font-serif font-bold text-leaf-darkText leading-none">
              {currentStreak} {currentStreak === 1 ? 'Day' : 'Days'}
            </h4>
            <p className="text-[11px] text-botanical-mutedText font-medium mt-0.5">
              Current Streak
            </p>
          </div>
        </div>

        {/* Best Streak */}
        <div className="bg-botanical-cream/60 border border-botanical-border/70 rounded-xl p-2.5 sm:p-3 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-leaf-pill text-leaf-1 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-base sm:text-lg font-serif font-bold text-leaf-darkText leading-none">
              {bestStreak} {bestStreak === 1 ? 'Day' : 'Days'}
            </h4>
            <p className="text-[11px] text-botanical-mutedText font-medium mt-0.5">
              Best Streak
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function BadgesCard() {
  const badges = [
    { icon: Sprout, bg: 'bg-[#EEF4E8]', border: 'border-[#738541]', text: 'text-[#738541]', title: 'Early Sprout' },
    { icon: BookOpen, bg: 'bg-[#FDF2EC]', border: 'border-[#C87850]', text: 'text-[#C87850]', title: 'Knowledge Seeker' },
    { icon: Dumbbell, bg: 'bg-[#FDF6EA]', border: 'border-[#C88E3E]', text: 'text-[#C88E3E]', title: 'Iron Routine' },
    { icon: Moon, bg: 'bg-[#F2EEF8]', border: 'border-[#7E6BA5]', text: 'text-[#7E6BA5]', title: 'Night Owl Tamer' },
  ]

  return (
    <div className="bg-white border border-botanical-border rounded-2xl sm:rounded-3xl p-3.5 sm:p-4.5 shadow-xs flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2.5 border-b border-botanical-border/40">
        <div className="w-7 h-7 rounded-xl bg-leaf-pill flex items-center justify-center text-leaf-1 shadow-xs">
          <Award className="w-4 h-4" />
        </div>
        <h3 className="text-lg font-serif font-bold text-leaf-darkText leading-none">
          Badges
        </h3>
      </div>

      {/* Badges Row */}
      <div className="flex items-center justify-between gap-2.5 pt-2.5">
        <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto no-scrollbar py-0.5">
          {badges.map((b, i) => (
            <div
              key={i}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 ${b.border} ${b.bg} ${b.text} flex items-center justify-center shadow-xs hover:scale-105 transition-transform cursor-pointer flex-shrink-0`}
              title={b.title}
            >
              <b.icon className="w-4 h-4 stroke-[2.2]" />
            </div>
          ))}
        </div>

        {/* More Pill */}
        <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-botanical-cream/80 border border-botanical-border text-[11px] font-semibold text-leaf-darkText hover:bg-black/5 transition-colors flex-shrink-0 cursor-pointer">
          <span>+3 more</span>
          <ChevronRight className="w-3.5 h-3.5 text-botanical-mutedText" />
        </button>
      </div>
    </div>
  )
}
