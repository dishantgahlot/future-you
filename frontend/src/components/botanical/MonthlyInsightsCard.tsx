import { useState, useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChartSimple,
  faChevronLeft,
  faChevronRight,
  faWandMagicSparkles,
  faExpand,
} from '@fortawesome/free-solid-svg-icons'
import { motion } from 'framer-motion'
import {
  format,
  addMonths,
  getDaysInMonth,
  setDate,
} from 'date-fns'
import type { Habit, HabitLog } from '../../types'

interface MonthlyInsightsCardProps {
  allLogs: HabitLog[]
  habits: Habit[]
  selectedDate: Date
  onSelectDate?: (date: Date) => void
  onExpand?: () => void
}

export function MonthlyInsightsCard({
  allLogs = [],
  habits = [],
  selectedDate,
  onSelectDate,
  onExpand,
}: MonthlyInsightsCardProps) {
  const [monthOffset, setMonthOffset] = useState<number>(0)
  const [hoveredBar, setHoveredBar] = useState<{
    label: string
    dateRange: string
    value: number
    completed: number
    totalExpected: number
    isFuture?: boolean
  } | null>(null)

  // Current viewed month based on selectedDate + monthOffset
  const viewedMonthDate = useMemo(() => {
    return addMonths(selectedDate, monthOffset)
  }, [selectedDate, monthOffset])

  const totalHabits = habits.length
  const daysInMonth = getDaysInMonth(viewedMonthDate)
  const yearMonthPrefix = format(viewedMonthDate, 'yyyy-MM')

  // Calculate 4 clean weeks: W1 (1-7), W2 (8-14), W3 (15-21), W4 (22-end)
  const weeksData = useMemo(() => {
    const weekSlices = [
      { label: 'W1', startDay: 1, endDay: 7, color: '#8CA25A' },
      { label: 'W2', startDay: 8, endDay: 14, color: '#8CA25A' },
      { label: 'W3', startDay: 15, endDay: 21, color: '#8CA25A' },
      { label: 'W4', startDay: 22, endDay: daysInMonth, color: '#8CA25A' },
    ]

    const now = new Date()
    const isCurrentMonth = format(viewedMonthDate, 'yyyy-MM') === format(now, 'yyyy-MM')
    const isFutureMonth = format(viewedMonthDate, 'yyyy-MM') > format(now, 'yyyy-MM')
    const currentDay = now.getDate()

    return weekSlices.map((w) => {
      let progressSum = 0
      let completedInWeek = 0
      const totalDaysInSlice = w.endDay - w.startDay + 1

      let elapsedDays = totalDaysInSlice
      let isFuture = false

      if (isCurrentMonth) {
        if (currentDay < w.startDay) {
          elapsedDays = 0
          isFuture = true
        } else if (currentDay <= w.endDay) {
          elapsedDays = currentDay - w.startDay + 1
        }
      } else if (isFutureMonth) {
        elapsedDays = 0
        isFuture = true
      }

      const maxDay = isFuture ? w.startDay - 1 : Math.min(w.endDay, isCurrentMonth ? currentDay : w.endDay)

      for (let d = w.startDay; d <= maxDay; d++) {
        const dateStr = `${yearMonthPrefix}-${String(d).padStart(2, '0')}`
        
        if (habits.length > 0) {
          let daySum = 0
          habits.forEach((h) => {
            const log = allLogs.find((l) => l.habit_id === h.id && l.log_date === dateStr)
            const target = h.target_value || 1
            const actual =
              log?.actual_value !== undefined ? log.actual_value : log?.completion_status ? target : 0
            daySum += Math.min(actual / target, 1)
            if (actual >= target && target > 0) completedInWeek++
          })
          progressSum += daySum / habits.length
        }
      }

      const percent = elapsedDays > 0 ? Math.round((progressSum / elapsedDays) * 100) : 0
      const totalExpected = elapsedDays * totalHabits

      return {
        ...w,
        value: percent,
        completed: completedInWeek,
        totalExpected,
        elapsedDays,
        isFuture,
        dateRange: `${format(viewedMonthDate, 'MMM')} ${w.startDay}–${w.endDay}`,
      }
    })
  }, [viewedMonthDate, daysInMonth, yearMonthPrefix, allLogs, habits, totalHabits])

  // Monthly average rate (only average weeks with elapsed days for active month)
  const monthlyAvg = useMemo(() => {
    if (weeksData.length === 0) return 0
    const activeWeeks = weeksData.filter((w) => !w.isFuture && w.elapsedDays > 0)
    const pts = activeWeeks.length > 0 ? activeWeeks : weeksData.slice(0, 1)
    const sum = pts.reduce((acc, w) => acc + w.value, 0)
    return Math.round(sum / pts.length)
  }, [weeksData])

  const yTicks = [100, 75, 50, 25, 0]

  return (
    <div className="bg-white dark:bg-[#0D1814] border border-botanical-border dark:border-[#223326] rounded-2xl sm:rounded-3xl p-3.5 sm:p-4.5 shadow-xs flex flex-col justify-between h-full overflow-hidden transition-colors">
      {/* Header (Responsive Wrap for Mobile) */}
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between pb-2.5 border-b border-[#E8E3D7] dark:border-[#223326] gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#EEF4E8] dark:bg-[#1D2D23] flex items-center justify-center text-[#738541] dark:text-[#9EB868] shadow-2xs flex-shrink-0">
            <FontAwesomeIcon icon={faChartSimple} className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#738541] dark:text-[#9EB868]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm xs:text-base sm:text-lg font-serif font-bold text-[#1D2516] dark:text-[#F5F2EB] leading-tight truncate whitespace-nowrap">
              Monthly Insights
            </h3>
            <p className="text-[10px] sm:text-[11px] text-[#52633E] dark:text-[#8FA387] font-semibold truncate whitespace-nowrap mt-0.5">
              Weekly progress breakdown
            </p>
          </div>
        </div>

        {/* Month Selector Controls & Expand Button */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          <span className="text-[11px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-[#EEF4E8] dark:bg-[#1D2D23] text-[#415525] dark:text-[#B6CDB0] border border-[#D5E3C4] dark:border-[#2E4334] tabular-nums whitespace-nowrap">
            {monthlyAvg}% avg
          </span>
          <div className="flex items-center bg-[#FAF7F0] dark:bg-[#15231C] rounded-xl p-0.5 border border-[#E5DFD1] dark:border-[#223326]">
            <button
              type="button"
              onClick={() => setMonthOffset((prev) => prev - 1)}
              className="p-1 rounded-lg text-[#52633E] dark:text-[#CBD8BF] hover:text-[#1D2516] dark:hover:text-white hover:bg-white dark:hover:bg-[#1D2D23] transition-colors"
              title="Previous month"
              aria-label="Previous month"
            >
              <FontAwesomeIcon icon={faChevronLeft} className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            </button>
            <span className="px-1 sm:px-2 text-[11px] sm:text-xs font-bold text-[#1D2516] dark:text-[#F5F2EB] whitespace-nowrap">
              {format(viewedMonthDate, 'MMM yyyy')}
            </span>
            <button
              type="button"
              onClick={() => setMonthOffset((prev) => prev + 1)}
              className="p-1 rounded-lg text-[#52633E] dark:text-[#CBD8BF] hover:text-[#1D2516] dark:hover:text-white hover:bg-white dark:hover:bg-[#1D2D23] transition-colors"
              title="Next month"
              aria-label="Next month"
            >
              <FontAwesomeIcon icon={faChevronRight} className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            </button>
          </div>

          {onExpand && (
            <button
              type="button"
              onClick={onExpand}
              className="p-1 sm:p-1.5 rounded-xl bg-[#FAF7F0] dark:bg-[#15231C] border border-[#E5DFD1] dark:border-[#223326] text-[#52633E] dark:text-[#CBD8BF] hover:text-[#1D2516] dark:hover:text-white hover:bg-white dark:hover:bg-[#1D2D23] transition-all shadow-2xs ml-0.5 cursor-pointer"
              title="Expand full graph & AI Progress Report"
              aria-label="Expand graph"
            >
              <FontAwesomeIcon icon={faExpand} className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Bar Chart Container (Full Length: Stretches Across Full Height and Width) */}
      <div
        className="w-full h-36 xs:h-40 sm:h-48 relative my-2 flex cursor-pointer flex-1"
        onClick={() => onExpand?.()}
        title="Click to view expanded analytics & AI Progress Report"
      >
        {/* Y-Axis Labels */}
        <div className="w-7 h-full flex flex-col justify-between text-right pr-1.5 text-[10px] text-[#767C6B] dark:text-slate-400 font-bold py-1">
          {yTicks.map((tick) => (
            <span key={tick} className="leading-none tabular-nums">{tick}%</span>
          ))}
        </div>

        {/* Chart area with bars & dashed grid */}
        <div className="flex-1 h-full relative flex items-end justify-around px-3 sm:px-5">
          {/* Dashed background lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pt-1">
            {yTicks.map((tick) => (
              <div
                key={tick}
                className="w-full border-b border-dashed border-[#E8E3D7] dark:border-[#1F293D]"
              />
            ))}
          </div>

          {/* Dynamic Bars for W1, W2, W3, W4 */}
          {weeksData.map((bar, idx) => (
            <div
              key={bar.label}
              className="flex flex-col items-center z-10 w-10 sm:w-14 cursor-pointer group"
              onMouseEnter={() =>
                setHoveredBar({
                  label: bar.label,
                  dateRange: bar.dateRange,
                  value: bar.value,
                  completed: bar.completed,
                  totalExpected: bar.totalExpected,
                  isFuture: bar.isFuture,
                })
              }
              onMouseLeave={() => setHoveredBar(null)}
              onClick={(e) => {
                e.stopPropagation()
                if (onSelectDate) {
                  const targetDate = setDate(viewedMonthDate, bar.startDay)
                  onSelectDate(targetDate)
                }
              }}
            >
              <div className="w-full h-30 sm:h-34 flex items-end justify-center relative">
                {/* Value tooltip tag above bar */}
                <div className="absolute -top-6 text-[10px] font-bold text-leaf-1 dark:text-emerald-300 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md shadow-xs border border-botanical-border dark:border-slate-700 whitespace-nowrap z-20">
                  {bar.isFuture ? 'Upcoming' : `${bar.value}%`}
                </div>

                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${bar.isFuture ? 4 : Math.max(bar.value, 6)}%` }}
                  transition={{ duration: 0.6, delay: idx * 0.08, ease: 'easeOut' }}
                  className={`w-full rounded-t-xl rounded-b-2xs shadow-xs group-hover:brightness-95 transition-all ${
                    bar.isFuture
                      ? 'bg-[#D5DEC9] dark:bg-[#1E2D23] opacity-60'
                      : 'bg-[#8CA25A] dark:bg-[#10B981]'
                  }`}
                />
              </div>
              <span className="text-[11px] text-[#767C6B] dark:text-slate-300 font-bold mt-1.5 group-hover:text-leaf-darkText dark:group-hover:text-white transition-colors">
                {bar.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Hover / Tooltip Footer (Outside of chart canvas, within card bounds) */}
      <div
        className="pt-2 border-t border-[#E8E3D7] dark:border-[#1F293D] text-xs flex items-center justify-between w-full flex-shrink-0 min-w-0 cursor-pointer"
        onClick={() => onExpand?.()}
      >
        {hoveredBar ? (
          <div className="flex items-center gap-1.5 text-leaf-darkText dark:text-slate-100 font-semibold animate-fadeIn truncate">
            <FontAwesomeIcon icon={faWandMagicSparkles} className="w-3.5 h-3.5 text-leaf-1 dark:text-emerald-400 flex-shrink-0" />
            <span className="truncate">
              {hoveredBar.label} ({hoveredBar.dateRange}):{' '}
              {hoveredBar.isFuture ? (
                <span className="text-[#8FA387] dark:text-[#A8BCA0] font-medium italic">Upcoming week</span>
              ) : (
                <span className="text-leaf-1 dark:text-emerald-400 font-bold tabular-nums">
                  {hoveredBar.value}% ({hoveredBar.completed}/{hoveredBar.totalExpected} tasks)
                </span>
              )}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full min-w-0">
            <span className="text-[11px] text-[#767C6B] dark:text-slate-400 font-medium truncate hover:text-[#1D2516] dark:hover:text-white transition-colors">
              Click graph for full details & AI Report
            </span>
            {onExpand && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onExpand()
                }}
                className="text-[11px] text-[#738541] dark:text-emerald-400 hover:text-[#1D2516] dark:hover:text-white font-bold underline flex items-center gap-1 flex-shrink-0 ml-1 cursor-pointer bg-transparent border-none p-0"
              >
                <span>Full View</span>
                <FontAwesomeIcon icon={faExpand} className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
