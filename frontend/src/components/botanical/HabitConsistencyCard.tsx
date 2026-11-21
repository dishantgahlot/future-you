import { useState, useMemo, useRef, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCalendarDays,
  faFire,
  faCalendarCheck,
} from '@fortawesome/free-solid-svg-icons'
import { format, subDays, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns'
import type { Habit, HabitLog } from '../../types'
import { getLoggedInDates } from '../../utils/habitStorage'
import { isFutureDate, calculateMonthlyAttendance } from '../../utils/adherence'

interface HabitConsistencyCardProps {
  allLogs: HabitLog[]
  habits: Habit[]
  selectedDate: Date
  onSelectDate: (date: Date) => void
}

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function HabitConsistencyCard({
  allLogs = [],
  habits = [],
  selectedDate,
  onSelectDate,
}: HabitConsistencyCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  // Range mode: '16w' fits mobile screens perfectly without horizontal scrolling; '52w' shows the full year
  const [weeksRange, setWeeksRange] = useState<'16w' | '52w'>('16w')

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 640) {
      setWeeksRange('52w')
    }
  }, [])

  // Hover state for bottom information bar
  const [hoveredDay, setHoveredDay] = useState<{
    dateStr: string
    displayDate: string
    completedCount: number
    totalCount: number
    percent: number
    isFuture?: boolean
  } | null>(null)

  // Floating tooltip state directly above the hovered square
  const [hoveredCell, setHoveredCell] = useState<{
    boxLeft: number
    topY: number
    arrowX: number
    tooltipWidth: number
    displayDate: string
    completedCount: number
    totalCount: number
    percent: number
    isFuture?: boolean
  } | null>(null)

  // Map of completed habits & true progress percent per date
  const adherenceByDate = useMemo(() => {
    const map = new Map<string, { percent: number; completed: number }>()
    if (habits.length === 0) return map

    const grouped = new Map<string, HabitLog[]>()
    for (const log of allLogs) {
      const arr = grouped.get(log.log_date) || []
      arr.push(log)
      grouped.set(log.log_date, arr)
    }

    grouped.forEach((dayLogs, dateStr) => {
      let progressSum = 0
      let completed = 0

      habits.forEach((h) => {
        const log = dayLogs.find((l) => l.habit_id === h.id)
        const target = log?.target_value || h.target_value || 1
        const actual =
          log?.actual_value !== undefined ? log.actual_value : log?.completion_status ? target : 0
        progressSum += Math.min(actual / target, 1)
        if (actual >= target && target > 0) completed++
      })

      const percent = Math.round((progressSum / habits.length) * 100)
      map.set(dateStr, { percent, completed })
    })

    return map
  }, [allLogs, habits])

  // Fixed 52-week grid (All 12 Months / 365 Days, all 7 days per week)
  const gridWeeks = useMemo(() => {
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 })
    const gridStart = startOfWeek(subDays(weekEnd, 51 * 7), { weekStartsOn: 1 })
    const days = eachDayOfInterval({ start: gridStart, end: weekEnd })

    const weeks: Date[][] = []
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7))
    }
    return weeks
  }, [selectedDate])

  // Displayed weeks based on weeksRange (16w for mobile zero-scroll fit; 52w for whole year)
  const displayedWeeks = useMemo(() => {
    if (weeksRange === '16w') {
      return gridWeeks.slice(gridWeeks.length - 16)
    }
    return gridWeeks
  }, [gridWeeks, weeksRange])

  // Month labels cleanly positioned across the displayed weeks without repeating
  const monthPositions = useMemo(() => {
    const positions: { monthName: string; weekIndex: number }[] = []
    const seenMonths = new Set<string>()
    let lastWeekIdx = -10
    const minGap = weeksRange === '16w' ? 2 : 3

    displayedWeeks.forEach((week, wIdx) => {
      // Find the first day of month (days 1-7) in this week
      const firstOfMonth = week.find((d) => d.getDate() <= 7)
      if (firstOfMonth) {
        const mName = format(firstOfMonth, 'MMM')
        if (!seenMonths.has(mName) && wIdx - lastWeekIdx >= minGap) {
          seenMonths.add(mName)
          lastWeekIdx = wIdx
          positions.push({
            monthName: mName,
            weekIndex: wIdx,
          })
        }
      }
    })
    return positions
  }, [displayedWeeks, weeksRange])

  // Total active days
  const activeDaysCount = useMemo(() => {
    let count = 0
    adherenceByDate.forEach((info) => {
      if (info.percent > 0 || info.completed > 0) count++
    })
    return count
  }, [adherenceByDate])

  // Total completions across all time
  const totalCompletions = useMemo(() => {
    let count = 0
    adherenceByDate.forEach((info) => {
      count += info.completed
    })
    return count
  }, [adherenceByDate])

  // Monthly Attendance percentage (calculated relative to elapsed days in month, excluding future dates)
  const { monthlyAttendancePercent, monthLabel } = useMemo(() => {
    const loggedDates = getLoggedInDates()
    const res = calculateMonthlyAttendance(selectedDate, loggedDates)
    return {
      monthlyAttendancePercent: res.percent,
      monthLabel: res.monthLabel,
    }
  }, [selectedDate, allLogs])

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd')

  const getCellColor = (percent: number, completed: number, isFuture: boolean) => {
    if (isFuture) {
      return 'bg-[#F2EFE9] dark:bg-[#15231C] border border-dashed border-[#DDD7CA] dark:border-[#223326] opacity-60 cursor-default'
    }
    if (percent === 0 && completed === 0) {
      return 'bg-[#ECE7DC] dark:!bg-[#CBD5E1] dark:bg-[#CBD5E1] habit-cell-empty hover:bg-[#DDD8CB] dark:hover:!bg-[#E2E8F0]' // 0% (Comfortable off-white, reduced glare in dark mode)
    }
    if (percent < 35) return 'bg-[#C4D5A9] dark:!bg-[#A3E4B2] hover:bg-[#B5C895] dark:hover:!bg-[#BBF2C8]' // Light progress (soft light green)
    if (percent < 70) return 'bg-[#8CA25A] dark:!bg-[#4ADE80] hover:bg-[#7D934D] dark:hover:!bg-[#6EE7B7]' // Medium progress
    if (percent < 95) return 'bg-[#738541] dark:!bg-[#22C55E] hover:bg-[#637336] dark:hover:!bg-[#16A34A]' // High progress
    return 'bg-[#3E4F20] dark:!bg-[#15803D] hover:bg-[#313F18] dark:hover:!bg-[#166534]' // 95%+ complete (darker green)
  }

  // Handle cell hover with absolute bounding box clamping: Tooltip can NEVER clip off edges
  const handleCellHover = (
    e: React.MouseEvent<HTMLButtonElement>,
    day: Date,
    dayData: { percent: number; completed: number },
    totalCount: number
  ) => {
    if (!cardRef.current) return
    const buttonRect = e.currentTarget.getBoundingClientRect()
    const cardRect = cardRef.current.getBoundingClientRect()

    const cellCenterX = buttonRect.left - cardRect.left + buttonRect.width / 2
    const cellTopY = buttonRect.top - cardRect.top

    // Estimated tooltip dimensions
    const tooltipWidth = 240
    const edgePadding = 12

    // Position tooltip box so it's centered over cell but strictly clamped within card boundaries
    const idealLeft = cellCenterX - tooltipWidth / 2
    const minLeft = edgePadding
    const maxLeft = Math.max(minLeft, cardRect.width - tooltipWidth - edgePadding)
    const boxLeft = Math.max(minLeft, Math.min(maxLeft, idealLeft))

    // Caret arrow points exactly at cellCenterX relative to boxLeft
    const arrowX = cellCenterX - boxLeft
    const clampedArrowX = Math.max(16, Math.min(tooltipWidth - 16, arrowX))
    const isFuture = isFutureDate(day)

    setHoveredCell({
      boxLeft,
      topY: cellTopY,
      arrowX: clampedArrowX,
      tooltipWidth,
      displayDate: format(day, 'MMM d, yyyy'),
      completedCount: isFuture ? 0 : dayData.completed,
      totalCount: isFuture ? 0 : totalCount,
      percent: isFuture ? 0 : dayData.percent,
      isFuture,
    })

    setHoveredDay({
      dateStr: format(day, 'yyyy-MM-dd'),
      displayDate: format(day, 'EEE, MMM d, yyyy'),
      completedCount: isFuture ? 0 : dayData.completed,
      totalCount: isFuture ? 0 : totalCount,
      percent: isFuture ? 0 : dayData.percent,
      isFuture,
    })
  }

  const handleCellLeave = () => {
    setHoveredCell(null)
    setHoveredDay(null)
  }

  return (
    <div
      ref={cardRef}
      className="relative bg-white/95 dark:bg-[#0D1814] border border-[#E8E2D5] dark:border-[#223326] rounded-2xl sm:rounded-3xl px-4 sm:px-6 py-4 sm:py-5 shadow-[0_2px_12px_rgba(29,37,22,0.03)] flex flex-col justify-between w-full transition-colors"
    >
      {/* 1. Header with Title, Range Toggle & Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 sm:pb-3 border-b border-[#E8E3D7] dark:border-[#223326]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#EEF4E8] dark:bg-[#1D2D23] flex items-center justify-center text-[#738541] dark:text-[#9EB868] shadow-2xs">
              <FontAwesomeIcon icon={faCalendarDays} className="text-xs sm:text-sm" />
            </div>
            <h3 className="text-base sm:text-2xl font-serif font-bold text-[#1D2516] dark:text-[#F5F2EB] leading-tight">
              Habit Consistency
            </h3>
          </div>

          {/* View Range Toggle (16w Fit for mobile / 52w Full Year) */}
          <div className="flex items-center p-0.5 bg-[#EEF4E8] dark:bg-[#1D2D23] rounded-lg border border-[#CCD8B8] dark:border-[#2E4334]">
            <button
              type="button"
              onClick={() => setWeeksRange('16w')}
              className={`px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-md transition-all cursor-pointer ${
                weeksRange === '16w'
                  ? 'bg-white dark:bg-[#2E4334] text-[#415525] dark:text-[#D5E3C4] shadow-xs'
                  : 'text-[#6F6759] dark:text-[#9BAF90] hover:text-[#1D2516]'
              }`}
            >
              16w
            </button>
            <button
              type="button"
              onClick={() => setWeeksRange('52w')}
              className={`px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-md transition-all cursor-pointer ${
                weeksRange === '52w'
                  ? 'bg-white dark:bg-[#2E4334] text-[#415525] dark:text-[#D5E3C4] shadow-xs'
                  : 'text-[#6F6759] dark:text-[#9BAF90] hover:text-[#1D2516]'
              }`}
            >
              52w
            </button>
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#EEF4E8] dark:bg-[#1D2D23] border border-[#CCD8B8] dark:border-[#2E4334] rounded-xl text-xs font-semibold text-[#415525] dark:text-[#B6CDB0]">
            <FontAwesomeIcon icon={faCalendarCheck} className="text-[#556E2B] dark:text-[#A8D968] text-xs" />
            <span>{monthlyAttendancePercent}% attendance ({monthLabel})</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FAF8F3] dark:bg-[#15231C] border border-[#E8E2D5] dark:border-[#223326] rounded-xl text-xs font-semibold text-[#415525] dark:text-[#B6CDB0]">
            <FontAwesomeIcon icon={faFire} className="text-[#D97706] text-xs" />
            <span>{activeDaysCount} active days</span>
          </div>

          <div className="px-2.5 py-1 bg-[#FAF8F3] dark:bg-[#15231C] border border-[#E8E2D5] dark:border-[#223326] rounded-xl text-xs font-semibold text-[#738541] dark:text-[#9EB868]">
            <span>{totalCompletions} logs</span>
          </div>
        </div>
      </div>

      {/* 2. Heatmap Grid with All 7 Days - Zero Horizontal Scroll on Any Screen */}
      <div className="pt-3.5 sm:pt-4 w-full overflow-hidden pb-1">
        <div className="w-full">
          {/* Month Labels Row aligned across columns */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 w-full mb-2.5 select-none">
            {/* Spacer matching Day labels column width */}
            <div className="w-4 sm:w-7 shrink-0" />

            {/* Columns relative space for month labels */}
            <div className="flex-1 relative h-4 sm:h-5 text-[9px] sm:text-[11px] font-bold text-[#6F6759] dark:text-[#9BAF90] uppercase tracking-wider">
              {monthPositions.map((pos) => {
                const leftPercent = (pos.weekIndex / displayedWeeks.length) * 100
                return (
                  <span
                    key={`${pos.monthName}-${pos.weekIndex}`}
                    style={{ left: `${leftPercent}%` }}
                    className="absolute top-0 transform -translate-x-1 whitespace-nowrap"
                  >
                    {pos.monthName}
                  </span>
                )
              })}
            </div>
          </div>

          {/* Grid Body: 7 Day Rows of Squircles with Matching Day Labels */}
          <div className={`flex flex-col w-full ${weeksRange === '52w' ? 'gap-1 sm:gap-1.5' : 'gap-1.5 sm:gap-2'}`}>
            {ALL_DAYS.map((dayName, dayIdx) => (
              <div key={dayName} className="flex items-center gap-1.5 sm:gap-2.5 w-full">
                {/* Day Label on Left: Single letter on mobile to save horizontal space */}
                <div className="w-4 sm:w-7 text-[8px] sm:text-[10px] font-bold uppercase text-[#767C6B] dark:text-[#9BAF90] select-none shrink-0 leading-none">
                  <span className="sm:hidden">{dayName[0]}</span>
                  <span className="hidden sm:inline">{dayName}</span>
                </div>

                {/* Squircles for this day of the week across displayed weeks */}
                <div className={`flex-1 flex items-center w-full min-w-0 ${weeksRange === '52w' ? 'gap-[1.5px] sm:gap-1.5' : 'gap-1 sm:gap-1.5'}`}>
                  {displayedWeeks.map((week) => {
                    const day = week[dayIdx]
                    if (!day) return null
                    const dateStr = format(day, 'yyyy-MM-dd')
                    const dayData = adherenceByDate.get(dateStr) || { percent: 0, completed: 0 }
                    const isSelected = dateStr === selectedDateStr
                    const total = habits.length || 6
                    const isFuture = isFutureDate(day)

                    return (
                      <button
                        key={dateStr}
                        type="button"
                        disabled={isFuture}
                        onClick={() => {
                          if (isFuture) return
                          onSelectDate(day)
                          setHoveredDay({
                            dateStr: format(day, 'yyyy-MM-dd'),
                            displayDate: format(day, 'EEE, MMM d, yyyy'),
                            completedCount: dayData.completed,
                            totalCount: total,
                            percent: dayData.percent,
                            isFuture: false,
                          })
                        }}
                        onMouseEnter={(e) => handleCellHover(e, day, dayData, total)}
                        onMouseLeave={handleCellLeave}
                        aria-label={
                          isFuture
                            ? `${format(day, 'MMM d')}: Upcoming day (Not yet)`
                            : `${format(day, 'MMM d')}: ${dayData.completed} completed (${dayData.percent}%)`
                        }
                        className={`flex-1 min-w-0 aspect-square transition-all duration-75 relative shadow-2xs ${
                          isFuture ? 'cursor-default' : 'cursor-pointer'
                        } ${
                          weeksRange === '52w'
                            ? 'rounded-[1.5px] sm:rounded-[3.5px]'
                            : 'rounded-[3px] sm:rounded-[4px]'
                        } ${getCellColor(
                          dayData.percent,
                          dayData.completed,
                          isFuture
                        )} ${
                          isSelected
                            ? 'ring-2 ring-[#1D2516] dark:ring-[#22C55E] ring-offset-1 sm:ring-offset-2 dark:ring-offset-[#0D1814] scale-110 sm:scale-115 shadow-md z-10'
                            : isFuture
                            ? ''
                            : 'hover:scale-125 hover:z-20 hover:shadow-xs'
                        }`}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

        {/* 3. Bottom Information Bar & GitHub Intensity Legend */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-3 mt-3 border-t border-[#ECE7DC] dark:border-[#223326] text-xs">
          {hoveredDay ? (
            <div className="flex items-center gap-1.5 text-[#1D2516] dark:text-[#F5F2EB] font-semibold text-xs">
              <span className={`w-2.5 h-2.5 rounded-[2.5px] ${hoveredDay.isFuture ? 'bg-[#DDD7CA] dark:bg-[#26382C]' : 'bg-[#738541] dark:bg-[#22C55E]'}`} />
              <span>
                {hoveredDay.displayDate}:{' '}
                {hoveredDay.isFuture ? (
                  <span className="text-[#8E9B85] italic font-normal">Upcoming (not yet elapsed)</span>
                ) : (
                  <strong className="text-[#415525] dark:text-[#22C55E]">
                    {hoveredDay.completedCount}/{hoveredDay.totalCount} habits completed ({hoveredDay.percent}%)
                  </strong>
                )}
              </span>
            </div>
          ) : (
            <span className="text-[11px] text-[#6F6759] dark:text-[#9BAF90] font-medium">
              <span className="sm:hidden">Tap any day for details</span>
              <span className="hidden sm:inline">Hover over any day for details · Click to view that date</span>
            </span>
          )}

          {/* GitHub-style Legend: Less ◻️ 🟩 🟩 🟩 More */}
          <div className="flex items-center gap-1.5 text-[11px] text-[#6F6759] dark:text-[#9BAF90] font-semibold self-end sm:self-auto">
            <span>Less</span>
            <div className="w-3 h-3 rounded-[3px] bg-[#ECE7DC] dark:!bg-[#CBD5E1] dark:bg-[#CBD5E1] habit-cell-empty" title="0%" />
            <div className="w-3 h-3 rounded-[3px] bg-[#C4D5A9] dark:bg-[#A3E4B2]" title="<35%" />
            <div className="w-3 h-3 rounded-[3px] bg-[#8CA25A] dark:bg-[#4ADE80]" title="<70%" />
            <div className="w-3 h-3 rounded-[3px] bg-[#738541] dark:bg-[#22C55E]" title="<95%" />
            <div className="w-3 h-3 rounded-[3px] bg-[#3E4F20] dark:bg-[#15803D]" title="95%+" />
            <span>More</span>
          </div>
        </div>

      {/* 4. GitHub-Style Floating Tooltip DIRECTLY ABOVE the Hovered Button (Strictly Inside Bounds) */}
      {hoveredCell && (
        <div
          style={{
            left: `${hoveredCell.boxLeft}px`,
            top: `${hoveredCell.topY - 8}px`,
            width: `${hoveredCell.tooltipWidth}px`,
          }}
          className="absolute -translate-y-full z-50 pointer-events-none transition-all duration-75 animate-fade-in"
        >
          <div className="relative bg-[#1D2516] dark:bg-[#15231C] text-[#F6F3EB] dark:text-[#F5F2EB] text-xs py-2 px-3 rounded-xl shadow-xl flex items-center justify-center gap-1.5 border border-[#3E4F20]/60 dark:border-[#223326] whitespace-nowrap">
            {hoveredCell.isFuture ? (
              <>
                <span className="font-bold text-[#A3B899]">Upcoming (Not yet)</span>
                <span className="text-[#D8D2C4] dark:text-[#9BAF90]">on {hoveredCell.displayDate}</span>
              </>
            ) : (
              <>
                <span className="font-bold text-[#A9C378] dark:text-[#34D399]">
                  {hoveredCell.completedCount > 0
                    ? `${hoveredCell.completedCount} completed`
                    : '0 completed'}
                </span>
                <span className="text-[#D8D2C4] dark:text-[#9BAF90]">on {hoveredCell.displayDate}</span>
              </>
            )}

            {/* Downward Caret Arrow Pointing Exactly at the Hovered Cell */}
            <div
              style={{
                left: `${hoveredCell.arrowX}px`,
              }}
              className="absolute -translate-x-1/2 top-full w-0 h-0 border-x-[5px] border-x-transparent border-t-[5px] border-t-[#1D2516] dark:border-t-[#15231C]"
            />
          </div>
        </div>
      )}
    </div>
  )
}
