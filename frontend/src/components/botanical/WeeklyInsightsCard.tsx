import { useState, useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowTrendUp,
  faChevronLeft,
  faChevronRight,
  faWandMagicSparkles,
  faExpand,
} from '@fortawesome/free-solid-svg-icons'
import { motion } from 'framer-motion'
import { startOfWeek, addDays, format, addWeeks, isSameDay } from 'date-fns'
import type { Habit, HabitLog } from '../../types'
import { calculateWeekAdherence } from '../../utils/adherence'

interface WeeklyInsightsCardProps {
  allLogs: HabitLog[]
  habits: Habit[]
  selectedDate: Date
  onSelectDate: (date: Date) => void
  onExpand?: () => void
}

export function WeeklyInsightsCard({
  allLogs = [],
  habits = [],
  selectedDate,
  onSelectDate,
  onExpand,
}: WeeklyInsightsCardProps) {
  const [weekOffset, setWeekOffset] = useState<number>(0)
  const [hoveredPoint, setHoveredPoint] = useState<{
    day: string
    date: Date
    value: number
    completed: number
    total: number
    isFuture?: boolean
  } | null>(null)

  // Current base week based on selectedDate + weekOffset
  const currentWeekDate = useMemo(() => {
    return addWeeks(selectedDate, weekOffset)
  }, [selectedDate, weekOffset])

  const weekStart = useMemo(() => {
    return startOfWeek(currentWeekDate, { weekStartsOn: 1 }) // Monday start
  }, [currentWeekDate])

  const weekEnd = useMemo(() => {
    return addDays(weekStart, 6)
  }, [weekStart])

  // Compute weekly adherence using shared adherence engine
  const weekData = useMemo(() => {
    return calculateWeekAdherence(weekStart, habits, allLogs)
  }, [weekStart, habits, allLogs])

  const points = weekData.points
  const weeklyAvg = weekData.weeklyAvg

  // Graph geometry for 7 points with broad spacious resolution that stretches full length
  const width = 460
  const height = 170
  const padLeft = 34
  const padRight = 16
  const padTop = 8
  const padBottom = 20

  const graphWidth = width - padLeft - padRight
  const graphHeight = height - padTop - padBottom

  // Find last known valid adherence value for stable positioning of upcoming points
  const lastKnownValue = points.filter((p) => !p.isFuture && p.value !== null).pop()?.value ?? 0

  const coords = points.map((p, i) => {
    const x = padLeft + (i / (points.length - 1)) * graphWidth
    const pct = p.isFuture ? lastKnownValue : (p.value ?? 0)
    const y = padTop + graphHeight - (pct / 100) * graphHeight
    return { ...p, x, y }
  })

  // Generate smooth SVG curve path strictly for elapsed days
  const elapsedCoords = coords.filter((c) => !c.isFuture && c.hasHabits && c.value !== null)
  let pathD = ''
  let areaD = ''

  if (elapsedCoords.length > 0) {
    pathD = `M ${elapsedCoords[0].x} ${elapsedCoords[0].y}`
    for (let i = 0; i < elapsedCoords.length - 1; i++) {
      const p0 = elapsedCoords[i]
      const p1 = elapsedCoords[i + 1]
      const mx = (p0.x + p1.x) / 2
      pathD += ` C ${mx} ${p0.y}, ${mx} ${p1.y}, ${p1.x} ${p1.y}`
    }
    areaD = `${pathD} L ${elapsedCoords[elapsedCoords.length - 1].x} ${padTop + graphHeight} L ${elapsedCoords[0].x} ${padTop + graphHeight} Z`
  }

  // Dashed connector to upcoming points if any
  let upcomingLineD = ''
  const firstFutureIdx = coords.findIndex((c) => c.isFuture)
  if (elapsedCoords.length > 0 && firstFutureIdx > 0) {
    const lastElapsed = elapsedCoords[elapsedCoords.length - 1]
    const nextPt = coords[firstFutureIdx]
    upcomingLineD = `M ${lastElapsed.x} ${lastElapsed.y} L ${nextPt.x} ${nextPt.y}`
  }

  return (
    <div className="bg-white dark:bg-[#0D1814] border border-[#E3DDCF] dark:border-[#223326] rounded-2xl sm:rounded-3xl p-3.5 sm:p-4.5 shadow-xs flex flex-col justify-between h-full group overflow-hidden transition-colors">
      {/* Header with Navigation Controls (Responsive Wrap for Mobile) */}
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between pb-2.5 border-b border-[#E8E3D7] dark:border-[#223326] gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#EEF4E8] dark:bg-[#1D2D23] flex items-center justify-center text-[#738541] dark:text-[#9EB868] shadow-2xs flex-shrink-0">
            <FontAwesomeIcon icon={faArrowTrendUp} className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#738541] dark:text-[#9EB868]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm xs:text-base sm:text-lg font-serif font-bold text-[#1D2516] dark:text-[#F5F2EB] leading-tight truncate whitespace-nowrap">
              Weekly Insights
            </h3>
            <p className="text-[10px] sm:text-[11px] text-[#52633E] dark:text-[#8FA387] font-semibold truncate whitespace-nowrap mt-0.5">
              {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
            </p>
          </div>
        </div>

        {/* Weekly Avg Pill, Prev/Next Arrows & Expand Button */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          <span className="text-[11px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-[#EEF4E8] dark:bg-[#1D2D23] text-[#415525] dark:text-[#B6CDB0] border border-[#D5E3C4] dark:border-[#2E4334] tabular-nums whitespace-nowrap">
            {weeklyAvg}% avg
          </span>
          <div className="flex items-center bg-[#FAF7F0] dark:bg-[#15231C] rounded-xl p-0.5 border border-[#E5DFD1] dark:border-[#223326]">
            <button
              type="button"
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className="p-1 rounded-lg text-[#52633E] dark:text-[#CBD8BF] hover:text-[#1D2516] dark:hover:text-white hover:bg-white dark:hover:bg-[#1D2D23] transition-colors"
              title="Previous week"
              aria-label="Previous week"
            >
              <FontAwesomeIcon icon={faChevronLeft} className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset(0)}
              className={`px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold rounded-md transition-colors whitespace-nowrap ${
                weekOffset === 0
                  ? 'bg-white dark:bg-[#1D2D23] text-leaf-1 dark:text-[#A8D968] shadow-xs'
                  : 'text-botanical-mutedText dark:text-[#8FA387]'
              }`}
            >
              Now
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset((prev) => prev + 1)}
              className="p-1 rounded-lg text-botanical-mutedText dark:text-[#8FA387] hover:text-leaf-darkText dark:hover:text-white hover:bg-white dark:hover:bg-[#1D2D23] transition-colors"
              title="Next week"
              aria-label="Next week"
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

      {/* SVG Line Chart (Full Length: Stretches Across Full Height and Width) */}
      <div
        className="w-full h-36 xs:h-40 sm:h-48 relative my-2 cursor-pointer flex-1"
        onClick={() => onExpand?.()}
        title="Click to view expanded analytics & AI Progress Report"
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          <defs>
            <linearGradient id="leafGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#738541" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#738541" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines & Y-axis labels */}
          {[100, 75, 50, 25, 0].map((val) => {
            const y = padTop + graphHeight - (val / 100) * graphHeight
            return (
              <g key={val}>
                <text
                  x={padLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="text-[10px] fill-[#767C6B] dark:fill-slate-400 font-bold tabular-nums"
                >
                  {val}%
                </text>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#E8E3D7"
                  className="dark:stroke-[#1F293D]"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                />
              </g>
            )
          })}

          {/* Area fill */}
          <motion.path
            d={areaD}
            fill="url(#leafGrad)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          />

          {/* Smooth Line Curve for Elapsed Days */}
          {pathD && (
            <motion.path
              d={pathD}
              fill="none"
              stroke="#738541"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          )}

          {/* Subtle Upcoming Dashed Guide to Future Point */}
          {upcomingLineD && (
            <path
              d={upcomingLineD}
              fill="none"
              stroke="#A8B598"
              strokeWidth="1.8"
              strokeDasharray="3 3"
              className="opacity-40 dark:opacity-30"
            />
          )}

          {/* Data Points */}
          {coords.map((pt) => {
            const isSelected = isSameDay(pt.fullDate, selectedDate)
            return (
              <g
                key={pt.day}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectDate(pt.fullDate)
                }}
                onMouseEnter={() =>
                  setHoveredPoint({
                    day: pt.day,
                    date: pt.fullDate,
                    value: pt.value ?? 0,
                    completed: pt.completed,
                    total: pt.total,
                    isFuture: pt.isFuture,
                  })
                }
                onMouseLeave={() => setHoveredPoint(null)}
              >
                {/* Hit area */}
                <circle cx={pt.x} cy={pt.y} r={16} fill="transparent" />

                {/* Outer ring on selected or hover */}
                {isSelected && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={8}
                    fill="none"
                    stroke={pt.isFuture ? '#8FA387' : '#3E4F20'}
                    strokeWidth="2.5"
                  />
                )}

                {/* Main dot: Hollow grey for upcoming days, solid green for active days */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? 5.5 : pt.isFuture ? 3.5 : 4}
                  fill={pt.isFuture ? '#F6F3EB' : isSelected ? '#3E4F20' : '#738541'}
                  stroke={pt.isFuture ? '#9CA88E' : '#FFFFFF'}
                  strokeWidth={pt.isFuture ? 1.5 : 2}
                  strokeDasharray={pt.isFuture ? '2 2' : undefined}
                  className="transition-all hover:r-6"
                />

                {/* Day label */}
                <text
                  x={pt.x}
                  y={height - 4}
                  textAnchor="middle"
                  className={`text-[11px] font-bold transition-colors ${
                    pt.isFuture
                      ? 'fill-[#9BAF90] dark:fill-slate-500 font-normal italic'
                      : isSelected
                      ? 'fill-[#2C3E14] dark:fill-emerald-400 font-extrabold'
                      : 'fill-[#767C6B] dark:fill-slate-400'
                  }`}
                >
                  {pt.day}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Hover / Status Footer (Outside of chart canvas, within card bounds) */}
      <div
        className="pt-2 border-t border-[#E8E3D7] dark:border-[#1F293D] text-xs flex items-center justify-between w-full flex-shrink-0 min-w-0 cursor-pointer"
        onClick={() => onExpand?.()}
      >
        {hoveredPoint ? (
          <div className="flex items-center gap-1.5 text-leaf-darkText dark:text-slate-100 font-semibold animate-fadeIn truncate">
            <FontAwesomeIcon icon={faWandMagicSparkles} className="w-3.5 h-3.5 text-leaf-1 dark:text-emerald-400 flex-shrink-0" />
            <span className="truncate">
              {format(hoveredPoint.date, 'EEE, MMM d')}:{' '}
              {hoveredPoint.isFuture ? (
                <span className="text-[#8FA387] dark:text-[#A8BCA0] font-medium italic">Upcoming day (Not yet)</span>
              ) : hoveredPoint.total === 0 ? (
                <span className="text-[#8FA387] dark:text-[#A8BCA0] font-medium italic">No habits scheduled</span>
              ) : (
                <span className="text-leaf-1 dark:text-emerald-400 font-bold tabular-nums">
                  {hoveredPoint.value}% ({hoveredPoint.completed}/{hoveredPoint.total} habits)
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
