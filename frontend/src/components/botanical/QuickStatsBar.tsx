import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFire, faCircleCheck, faCalendarCheck } from '@fortawesome/free-solid-svg-icons'
import { parseISO, differenceInCalendarDays } from 'date-fns'
import type { Habit, HabitLog } from '../../types'
import { calculateUserBadges } from '../../utils/achievementBadges'
import { GitHubBadgeMedallion } from '../profile/GitHubBadgeItem'
import { getLoggedInDates } from '../../utils/habitStorage'
import { calculateMonthlyAttendance } from '../../utils/adherence'

interface QuickStatsBarProps {
  allLogs: HabitLog[]
  habits: Habit[]
  todayLogs?: HabitLog[]
  selectedDate: Date
}

export function QuickStatsBar({
  allLogs = [],
  habits = [],
  selectedDate,
}: QuickStatsBarProps) {
  const navigate = useNavigate()

  // 1. Current streak & Best streak calculation
  const { currentStreak, bestStreak } = useMemo(() => {
    const activeDates = Array.from(
      new Set(allLogs.filter((l) => l.completion_status).map((l) => l.log_date))
    ).sort()

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

    const today = new Date()
    const lastActive = parseISO(activeDates[activeDates.length - 1])
    const daysSinceLast = differenceInCalendarDays(today, lastActive)
    const curr = daysSinceLast <= 1 ? tempStreak : 0

    return {
      currentStreak: curr,
      bestStreak: maxStreak,
    }
  }, [allLogs])

  // 2. All-time completed habit checkmarks
  const totalCompletions = useMemo(() => {
    return allLogs.filter((l) => l.completion_status).length
  }, [allLogs])

  // 3. Monthly Attendance Percentage (resets every month)
  // Calculated based on elapsed days in the month up to today, excluding future days
  const { monthlyAttendancePercent, loggedInDaysCount, daysInMonth, monthLabel } = useMemo(() => {
    const loggedDates = getLoggedInDates()
    const res = calculateMonthlyAttendance(selectedDate, loggedDates)

    return {
      monthlyAttendancePercent: res.percent,
      loggedInDaysCount: res.loggedCount,
      daysInMonth: res.elapsedDays,
      monthLabel: res.monthLabel,
    }
  }, [selectedDate, allLogs])

  // 4. Dynamic Badges calculation based on user progress
  const { unlockedCount, latestBadge } = useMemo(() => {
    return calculateUserBadges(habits, allLogs, currentStreak)
  }, [habits, allLogs, currentStreak])

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
      {/* 1. Current Streak */}
      <div className="bg-white dark:bg-[#0D1814] border border-[#E3DDCF] dark:border-[#223326] rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 shadow-xs flex items-center justify-between gap-1.5 sm:gap-2 min-w-0 transition-colors">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="w-7 h-7 xs:w-8 xs:h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#FEF3E2] dark:bg-amber-950/40 flex items-center justify-center text-[#D97706] dark:text-amber-400 flex-shrink-0 shadow-2xs">
            <FontAwesomeIcon icon={faFire} className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 text-[#D97706] dark:text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm xs:text-base sm:text-lg lg:text-xl font-serif font-bold text-[#1D2516] dark:text-[#F5F2EB] leading-none tabular-nums truncate">
              {currentStreak} {currentStreak === 1 ? 'day' : 'days'}
            </h4>
            <p className="text-[10px] xs:text-[11px] sm:text-xs text-[#52633E] dark:text-[#8FA387] font-semibold mt-0.5 sm:mt-1 truncate">
              Current Streak
            </p>
          </div>
        </div>
        <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] shrink-0 font-bold bg-[#EEF4E8] dark:bg-[#1D2D23] text-[#415525] dark:text-[#B6CDB0] border border-[#D5E3C4] dark:border-[#2E4334] tabular-nums">
          Best: {bestStreak}d
        </span>
      </div>

      {/* 2. Total Completions (All-Time Recorded) */}
      <div className="bg-white dark:bg-[#0D1814] border border-[#E3DDCF] dark:border-[#223326] rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 shadow-xs flex items-center justify-between gap-1.5 sm:gap-2 min-w-0 transition-colors">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="w-7 h-7 xs:w-8 xs:h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#EEF4E8] dark:bg-[#1D2D23] flex items-center justify-center text-[#738541] dark:text-[#9EB868] flex-shrink-0 shadow-2xs">
            <FontAwesomeIcon icon={faCircleCheck} className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 text-[#738541] dark:text-[#9EB868]" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm xs:text-base sm:text-lg lg:text-xl font-serif font-bold text-[#1D2516] dark:text-[#F5F2EB] leading-none tabular-nums truncate">
              {totalCompletions} logs
            </h4>
            <p className="text-[10px] xs:text-[11px] sm:text-xs text-[#52633E] dark:text-[#8FA387] font-semibold mt-0.5 sm:mt-1 truncate">
              Total Completions
            </p>
          </div>
        </div>
        <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] shrink-0 font-bold bg-[#FAF7F0] dark:bg-[#15231C] text-[#738541] dark:text-[#9EB868] border border-[#E5DFD1] dark:border-[#223326]">
          All Time
        </span>
      </div>

      {/* 3. Monthly Attendance Percentage */}
      <div className="bg-white dark:bg-[#0D1814] border border-[#E3DDCF] dark:border-[#223326] rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 shadow-xs flex items-center justify-between gap-1.5 sm:gap-2 min-w-0 transition-colors">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="w-7 h-7 xs:w-8 xs:h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#EEF4E8] dark:bg-[#1D2D23] flex items-center justify-center text-[#738541] dark:text-[#9EB868] flex-shrink-0 shadow-2xs">
            <FontAwesomeIcon icon={faCalendarCheck} className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 text-[#738541] dark:text-[#9EB868]" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm xs:text-base sm:text-lg lg:text-xl font-serif font-bold text-[#1D2516] dark:text-[#F5F2EB] leading-none tabular-nums truncate">
              {monthlyAttendancePercent}%
            </h4>
            <p className="text-[10px] xs:text-[11px] sm:text-xs text-[#52633E] dark:text-[#8FA387] font-semibold mt-0.5 sm:mt-1 truncate">
              Monthly Attendance
            </p>
          </div>
        </div>
        <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] shrink-0 font-bold bg-[#EEF4E8] dark:bg-[#1D2D23] text-[#415525] dark:text-[#B6CDB0] border border-[#D5E3C4] dark:border-[#2E4334] tabular-nums">
          {loggedInDaysCount}/{daysInMonth}d · {monthLabel}
        </span>
      </div>

      {/* 4. Badges & Achievements Card */}
      <div
        onClick={() => navigate('/badges')}
        className="bg-white dark:bg-[#0D1814] border border-[#E3DDCF] dark:border-[#223326] hover:border-[#CCD8B8] dark:hover:border-[#38592A] rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 shadow-xs hover:shadow-card transition-all flex items-center justify-between gap-1.5 sm:gap-2 min-w-0 cursor-pointer group select-none"
        title="View your unlocked badges and achievements"
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {latestBadge ? (
            <div className="shrink-0 scale-75 xs:scale-90 sm:scale-100 origin-left">
              <GitHubBadgeMedallion badge={latestBadge} size={36} />
            </div>
          ) : (
            <div className="w-7 h-7 xs:w-8 xs:h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#EEF4E8] dark:bg-[#1D2D23] flex items-center justify-center text-[#738541] dark:text-[#9EB868] flex-shrink-0 shadow-2xs">
              <FontAwesomeIcon icon={faCircleCheck} className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#738541] dark:text-[#9EB868]" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h4 className="text-sm xs:text-base sm:text-lg lg:text-xl font-serif font-bold text-[#1D2516] dark:text-[#F5F2EB] leading-none tabular-nums group-hover:text-[#4A6225] dark:group-hover:text-[#A8D968] transition-colors truncate">
              {unlockedCount} {unlockedCount === 1 ? 'Badge' : 'Badges'}
            </h4>
            <p className="text-[10px] xs:text-[11px] sm:text-xs text-[#52633E] dark:text-[#8FA387] font-semibold mt-0.5 sm:mt-1 truncate">
              {unlockedCount > 0 && latestBadge ? latestBadge.title : 'Start Tracking'}
            </p>
          </div>
        </div>
        <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] shrink-0 font-bold bg-[#FAF7F0] dark:bg-[#15231C] group-hover:bg-[#EEF4E8] dark:group-hover:bg-[#1D2D23] text-[#556E2B] dark:text-[#A8D968] border border-[#E5DFD1] dark:border-[#223326] transition-colors items-center gap-1">
          <span>Badges</span>
          <span>→</span>
        </span>
      </div>
    </div>
  )
}
