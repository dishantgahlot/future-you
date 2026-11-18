import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChartLine,
  faChartBar,
  faArrowTrendUp,
  faFire,
  faCheckCircle,
  faBullseye,
  faBrain,
  faTriangleExclamation,
  faArrowUpRightFromSquare,
  faRotateRight,
  faWandMagicSparkles,
  faLink,
  faCircleCheck,
  faSeedling,
  faMoon,
  faBookOpen,
  faDumbbell,
  faPersonWalking,
  faDroplet,
  faMobileScreen,
  faSpa,
  faAppleWhole,
} from '@fortawesome/free-solid-svg-icons'
import { format, startOfWeek, addDays, getDaysInMonth } from 'date-fns'
import { getLocalHabits, getAllLocalLogs } from '../utils/habitStorage'
import { useUserProfile } from '../contexts/UserProfileContext'
import { aiApi } from '../services/api'

function getHabitFAIcon(name: string, cat?: string) {
  const n = (name || '').toLowerCase()
  const c = (cat || '').toLowerCase()
  if (n.includes('sleep') || c.includes('sleep') || n.includes('bed')) return faMoon
  if (n.includes('study') || n.includes('focus') || n.includes('learn') || c.includes('learning') || n.includes('read')) return faBookOpen
  if (n.includes('workout') || n.includes('gym') || n.includes('exercise') || c.includes('fitness')) return faDumbbell
  if (n.includes('walk') || n.includes('step') || n.includes('run')) return faPersonWalking
  if (n.includes('hydrat') || n.includes('water')) return faDroplet
  if (n.includes('screen') || n.includes('phone')) return faMobileScreen
  if (n.includes('mind') || n.includes('meditat') || c.includes('mental')) return faSpa
  if (n.includes('diet') || n.includes('food') || c.includes('nutrition')) return faAppleWhole
  return faSeedling
}

interface Shortcoming {
  habitName: string
  issue: string
  missedCountOrTarget: string
  rootCauseAnalysis: string
}

interface AreaOfImprovement {
  domain: string
  currentBottleneck: string
  whyItMatters: string
}

interface HowToImprove {
  title: string
  stepByStep: string[]
  habitStackTrigger?: string
  timeframe: string
}

interface TipAndTrick {
  title: string
  technique: string
  practicalExample: string
}

interface RecommendedResource {
  name: string
  url: string
  type: string
  description: string
  relevantToIssue: string
}

interface AIProgressReport {
  period: 'weekly' | 'monthly'
  periodLabel: string
  adherenceRate: number
  executiveSummary: string
  topPerformingHabits?: Array<{ name: string; category: string; streak: number; rate: number }>
  shortcomings: Shortcoming[]
  areasOfImprovement: AreaOfImprovement[]
  howToImprove: HowToImprove[]
  tipsAndTricks: TipAndTrick[]
  recommendedResources: RecommendedResource[]
  motivationalNote: string
  usedFallback?: boolean
  model?: string
}

export function InsightsPage() {
  const { fullName } = useUserProfile()
  const [viewPeriod, setViewPeriod] = useState<'weekly' | 'monthly'>('weekly')
  const [selectedDate] = useState(new Date())

  // AI Progress Report State
  const [aiReport, setAiReport] = useState<AIProgressReport | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)

  const [habits, setHabits] = useState(() => getLocalHabits())
  const [allLogs, setAllLogs] = useState(() => getAllLocalLogs())

  useEffect(() => {
    const handleSync = () => {
      setHabits(getLocalHabits())
      setAllLogs(getAllLocalLogs())
    }
    window.addEventListener('future-you-storage-updated', handleSync)
    window.addEventListener('storage', handleSync)
    window.addEventListener('focus', handleSync)
    return () => {
      window.removeEventListener('future-you-storage-updated', handleSync)
      window.removeEventListener('storage', handleSync)
      window.removeEventListener('focus', handleSync)
    }
  }, [])

  const weekStart = useMemo(() => {
    return startOfWeek(selectedDate, { weekStartsOn: 1 })
  }, [selectedDate])

  const totalHabits = habits.length || 6

  // 7-Day Adherence Trajectory
  const weeklyPoints = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const dayDate = addDays(weekStart, i)
      const dayStr = format(dayDate, 'yyyy-MM-dd')

      let progressSum = 0
      let completedCount = 0

      habits.forEach((h) => {
        const log = allLogs.find((l) => l.habit_id === h.id && l.log_date === dayStr)
        const target = h.target_value || 1
        const actual =
          log?.actual_value !== undefined ? log.actual_value : log?.completion_status ? target : 0
        progressSum += Math.min(actual / target, 1)
        if (actual >= target && target > 0) completedCount++
      })

      const percent = habits.length > 0 ? Math.round((progressSum / habits.length) * 100) : 0

      return {
        day: format(dayDate, 'EEE'),
        fullDate: dayDate,
        dateStr: dayStr,
        value: percent,
        completed: completedCount,
        total: totalHabits,
      }
    })
  }, [weekStart, allLogs, habits, totalHabits])

  const weeklyAvg = useMemo(() => {
    const now = new Date()
    now.setHours(23, 59, 59, 999)
    const elapsedPoints = weeklyPoints.filter((p) => p.fullDate <= now)
    const pts = elapsedPoints.length > 0 ? elapsedPoints : weeklyPoints
    const sum = pts.reduce((acc, p) => acc + p.value, 0)
    return Math.round(sum / pts.length)
  }, [weeklyPoints])

  // Monthly 4-Week Breakdown
  const daysInMonth = useMemo(() => getDaysInMonth(selectedDate), [selectedDate])
  const yearMonthPrefix = useMemo(() => format(selectedDate, 'yyyy-MM'), [selectedDate])

  const monthlyWeeks = useMemo(() => {
    const now = new Date()
    const isCurrentMonth = format(selectedDate, 'yyyy-MM') === format(now, 'yyyy-MM')
    const isFutureMonth = format(selectedDate, 'yyyy-MM') > format(now, 'yyyy-MM')
    const currentDay = now.getDate()

    return [
      { label: 'W1', startDay: 1, endDay: 7 },
      { label: 'W2', startDay: 8, endDay: 14 },
      { label: 'W3', startDay: 15, endDay: 21 },
      { label: 'W4', startDay: 22, endDay: daysInMonth },
    ].map((w) => {
      let progressSum = 0
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
          })
          progressSum += daySum / habits.length
        }
      }

      const percent = elapsedDays > 0 ? Math.round((progressSum / elapsedDays) * 100) : 0

      return {
        ...w,
        value: percent,
        elapsedDays,
        isFuture,
        dateRange: `${format(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), w.startDay), 'MMM d')} - ${format(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), w.endDay), 'MMM d')}`,
      }
    })
  }, [selectedDate, yearMonthPrefix, daysInMonth, habits, allLogs])

  const monthlyAvg = useMemo(() => {
    if (monthlyWeeks.length === 0) return 0
    const activeWeeks = monthlyWeeks.filter((w) => !w.isFuture && w.elapsedDays > 0)
    const pts = activeWeeks.length > 0 ? activeWeeks : monthlyWeeks.slice(0, 1)
    const sum = pts.reduce((acc, w) => acc + w.value, 0)
    return Math.round(sum / pts.length)
  }, [monthlyWeeks])

  // Top Habit by Consistency
  const topHabit = useMemo(() => {
    if (habits.length === 0) return { name: 'Morning Hydration', rate: 92 }

    const rates = habits.map((h) => {
      const logs = allLogs.filter((l) => l.habit_id === h.id)
      const completed = logs.filter((l) => {
        const target = h.target_value || 1
        const actual = l.actual_value !== undefined ? l.actual_value : l.completion_status ? target : 0
        return actual >= target
      }).length

      const totalExpected = logs.length > 0 ? logs.length : 14
      const rate = Math.round((completed / totalExpected) * 100)
      return { name: h.name, rate: Math.max(rate, 45) }
    })

    rates.sort((a, b) => b.rate - a.rate)
    return rates[0]
  }, [habits, allLogs])

  // SVG Chart Geometry
  const svgWidth = 640
  const svgHeight = 220
  const padLeft = 40
  const padRight = 24
  const padTop = 20
  const padBottom = 35
  const graphWidth = svgWidth - padLeft - padRight
  const graphHeight = svgHeight - padTop - padBottom

  const coords = weeklyPoints.map((p, i) => {
    const x = padLeft + (i / (weeklyPoints.length - 1)) * graphWidth
    const y = padTop + graphHeight - (p.value / 100) * graphHeight
    return { ...p, x, y }
  })

  let pathD = `M ${coords[0].x} ${coords[0].y}`
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i]
    const p1 = coords[i + 1]
    const mx = (p0.x + p1.x) / 2
    pathD += ` C ${mx} ${p0.y}, ${mx} ${p1.y}, ${p1.x} ${p1.y}`
  }

  const areaD = `${pathD} L ${coords[coords.length - 1].x} ${padTop + graphHeight} L ${coords[0].x} ${padTop + graphHeight} Z`

  // Generate AI Progress Report Function
  const handleGenerateReport = async () => {
    setIsGenerating(true)
    setReportError(null)

    try {
      const res = await aiApi.generateProgressReport({
        period: viewPeriod,
        habits,
        logs: allLogs,
        userName: fullName || 'Dishant',
      })

      if (res.data) {
        setAiReport(res.data)
      } else if (res.error) {
        setReportError(res.error)
      }
    } catch (err: any) {
      setReportError(err?.message || 'Failed to generate AI Progress Report.')
    } finally {
      setIsGenerating(false)
    }
  }

  // Clear report when switching period so user generates the relevant one
  useEffect(() => {
    setAiReport(null)
  }, [viewPeriod])

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* 1. Header Card */}
      <div className="bg-white/95 dark:bg-[#0D1814] rounded-3xl border border-[#E8E2D5] dark:border-[#223326] p-5 sm:p-6 shadow-[0_2px_12px_rgba(29,37,22,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#EAEFE2] dark:bg-[#1D2D23] text-[#4E6228] dark:text-[#B6CDB0] text-xs font-semibold uppercase tracking-wider mb-2 border border-transparent dark:border-[#2E4334]">
            <FontAwesomeIcon icon={faBrain} className="w-3 h-3 text-[#738541] dark:text-[#9EB868]" />
            <span>Habit Analytics & AI Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1D2516] dark:text-[#F5F2EB] tracking-tight">
            Progress & Performance Insights
          </h1>
          <p className="text-xs sm:text-sm text-[#4E5642] dark:text-[#9BAF90] mt-1">
            Visual adherence trends, weekly & monthly consistency metrics, and personalized growth diagnosis.
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="inline-flex p-1 rounded-2xl bg-[#FAF8F3] dark:bg-[#15231C] border border-[#E8E2D5] dark:border-[#223326] self-start sm:self-center">
          <button
            type="button"
            onClick={() => setViewPeriod('weekly')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewPeriod === 'weekly'
                ? 'bg-[#738541] dark:bg-[#4E6826] text-white shadow-xs'
                : 'text-[#6F6759] dark:text-[#9BAF90] hover:text-[#1D2516] dark:hover:text-[#F5F2EB]'
            }`}
          >
            <FontAwesomeIcon icon={faChartLine} className="text-xs" />
            <span>Weekly</span>
          </button>
          <button
            type="button"
            onClick={() => setViewPeriod('monthly')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewPeriod === 'monthly'
                ? 'bg-[#738541] dark:bg-[#4E6826] text-white shadow-xs'
                : 'text-[#6F6759] dark:text-[#9BAF90] hover:text-[#1D2516] dark:hover:text-[#F5F2EB]'
            }`}
          >
            <FontAwesomeIcon icon={faChartBar} className="text-xs" />
            <span>Monthly</span>
          </button>
        </div>
      </div>

      {/* 2. Three Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white dark:bg-[#0D1814] border border-[#E8E2D5] dark:border-[#223326] rounded-2xl p-4 sm:p-5 shadow-xs transition-colors">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#738541] dark:text-[#9EB868] block">
            Average Adherence
          </span>
          <span className="text-2xl sm:text-3xl font-serif font-bold text-[#1D2516] dark:text-[#F5F2EB] mt-1 block tabular-nums">
            {viewPeriod === 'weekly' ? weeklyAvg : monthlyAvg}%
          </span>
          <span className="text-xs text-[#6F6759] dark:text-[#8FA387] font-semibold flex items-center gap-1 mt-0.5">
            <FontAwesomeIcon icon={faArrowTrendUp} className="text-[#738541] dark:text-[#9EB868]" />
            <span>Based on {viewPeriod === 'weekly' ? '7-day' : '30-day'} logged progress</span>
          </span>
        </div>

        <div className="bg-white dark:bg-[#0D1814] border border-[#E8E2D5] dark:border-[#223326] rounded-2xl p-4 sm:p-5 shadow-xs transition-colors">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#738541] dark:text-[#9EB868] block">
            Top Consistency Habit
          </span>
          <span className="text-2xl sm:text-3xl font-serif font-bold text-[#1D2516] dark:text-[#F5F2EB] mt-1 block truncate">
            {topHabit.name}
          </span>
          <span className="text-xs text-[#6F6759] dark:text-[#8FA387] font-semibold flex items-center gap-1 mt-0.5">
            <FontAwesomeIcon icon={faBullseye} className="text-[#738541] dark:text-[#9EB868]" />
            <span>{topHabit.rate}% adherence level</span>
          </span>
        </div>

        <div className="bg-white dark:bg-[#0D1814] border border-[#E8E2D5] dark:border-[#223326] rounded-2xl p-4 sm:p-5 shadow-xs transition-colors">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#738541] dark:text-[#9EB868] block">
            Routine Status
          </span>
          <span className="text-2xl sm:text-3xl font-serif font-bold text-[#1D2516] dark:text-[#F5F2EB] mt-1 block">
            {weeklyAvg >= 75 ? 'Optimal' : weeklyAvg >= 50 ? 'Steady' : 'Building'}
          </span>
          <span className="text-xs text-[#6F6759] dark:text-[#8FA387] font-semibold flex items-center gap-1 mt-0.5">
            <FontAwesomeIcon icon={faFire} className="text-[#E5B54F] dark:text-amber-400" />
            <span>{habits.length} active intentions</span>
          </span>
        </div>
      </div>

      {/* 3. Main Chart Canvas */}
      <div className="bg-white dark:bg-[#0D1814] border border-[#E8E2D5] dark:border-[#223326] rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 transition-colors">
        <div className="flex items-center justify-between pb-3 border-b border-[#ECE7DC] dark:border-[#223326]">
          <div>
            <h3 className="font-serif font-bold text-base sm:text-lg text-[#1D2516] dark:text-[#F5F2EB]">
              {viewPeriod === 'weekly' ? 'Weekly Adherence Trajectory' : 'Monthly Progress Breakdown'}
            </h3>
            <p className="text-xs text-[#6F6759] dark:text-[#8FA387] font-medium mt-0.5">
              {viewPeriod === 'weekly'
                ? `Week of ${format(weekStart, 'MMMM d, yyyy')}`
                : `${format(selectedDate, 'MMMM yyyy')} across 4 weekly milestones`}
            </p>
          </div>

          <span className="text-xs font-bold text-[#415525] dark:text-[#B6CDB0] bg-[#EEF4E8] dark:bg-[#1D2D23] border border-transparent dark:border-[#2E4334] px-2.5 py-1 rounded-lg">
            {viewPeriod === 'weekly' ? `${weeklyAvg}% weekly avg` : `${monthlyAvg}% monthly avg`}
          </span>
        </div>

        {viewPeriod === 'weekly' ? (
          /* Weekly SVG Line Chart */
          <div className="w-full h-56 sm:h-64 relative">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="insightsAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#738541" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#738541" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[100, 75, 50, 25, 0].map((val) => {
                const y = padTop + graphHeight - (val / 100) * graphHeight
                return (
                  <g key={val}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={padLeft + graphWidth}
                      y2={y}
                      stroke="#EAE4D6"
                      className="dark:stroke-[#1F293D]"
                      strokeDasharray="2 3"
                    />
                    <text
                      x={padLeft - 8}
                      y={y + 3}
                      textAnchor="end"
                      fill="#8C8271"
                      className="dark:fill-slate-400 font-bold"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      {val}%
                    </text>
                  </g>
                )
              })}

              {/* Area Gradient Fill */}
              <path d={areaD} fill="url(#insightsAreaGrad)" />

              {/* Smooth Trajectory Line */}
              <path
                d={pathD}
                fill="none"
                stroke="#738541"
                className="dark:stroke-emerald-400"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Points */}
              {coords.map((p, idx) => (
                <g key={idx}>
                  <circle cx={p.x} cy={p.y} r="4.5" fill="#FFFFFF" stroke="#738541" className="dark:stroke-emerald-400" strokeWidth="2.5" />
                  <text
                    x={p.x}
                    y={padTop + graphHeight + 18}
                    textAnchor="middle"
                    fill="#1D2516"
                    className="dark:fill-slate-200 font-bold"
                    fontSize="11"
                    fontWeight="bold"
                  >
                    {p.day}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        ) : (
          /* Monthly 4-Week Bar Chart */
          <div className="w-full py-4">
            <div className="flex items-end justify-around gap-4 h-48 sm:h-56 max-w-xl mx-auto">
              {monthlyWeeks.map((bar) => (
                <div key={bar.label} className="flex flex-col items-center flex-1 max-w-[85px]">
                  <span className="text-xs font-bold text-[#1D2516] dark:text-white mb-1.5 tabular-nums">
                    {bar.value}%
                  </span>
                  <div className="w-full h-36 bg-[#FAF8F3] dark:bg-slate-800 rounded-t-xl overflow-hidden flex items-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(bar.value, 6)}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className="w-full rounded-t-xl bg-[#738541] dark:bg-emerald-500"
                    />
                  </div>
                  <span className="text-xs font-bold text-[#1D2516] dark:text-white mt-2">{bar.label}</span>
                  <span className="text-[10px] text-[#6F6759] dark:text-slate-400 font-medium">{bar.dateRange}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. AI PROGRESS REPORT GENERATION SECTION (Google Gemini Powered) */}
      <div className="bg-white dark:bg-[#0D1814] rounded-3xl border border-[#E8E2D5] dark:border-[#223326] p-5 sm:p-6 shadow-xs space-y-5 transition-colors">
        {/* Banner Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#ECE7DC] dark:border-[#223326]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EEF4E8] dark:bg-[#1D2D23] text-[#556E2B] dark:text-[#9EB868] flex items-center justify-center text-sm shadow-2xs">
              <FontAwesomeIcon icon={faWandMagicSparkles} />
            </div>
            <div>
              <h2 className="font-serif font-bold text-base sm:text-lg text-[#1D2516] dark:text-[#F5F2EB] tracking-tight flex items-center gap-2">
                <span>{viewPeriod === 'weekly' ? 'Weekly AI Growth Report' : 'Monthly Habit Diagnosis'}</span>
              </h2>
              <p className="text-[11px] text-[#6F6759] dark:text-[#8FA387]">
                Visual adherence breakdown & point-by-point shortcomings analysis
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-all cursor-pointer flex-shrink-0 ${
              isGenerating
                ? 'bg-[#738541]/70 dark:bg-[#4E6826]/70 cursor-not-allowed'
                : 'bg-[#738541] hover:bg-[#5E6D34] dark:bg-[#4E6826] dark:hover:bg-[#41581F] active:scale-98'
            }`}
          >
            <FontAwesomeIcon
              icon={isGenerating ? faRotateRight : faWandMagicSparkles}
              className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`}
            />
            <span>
              {isGenerating
                ? 'Generating...'
                : aiReport
                ? 'Refresh Report'
                : `Generate ${viewPeriod === 'weekly' ? 'Weekly' : 'Monthly'} Report`}
            </span>
          </button>
        </div>

        {reportError && (
          <div className="p-3 rounded-xl bg-[#FDF2F0] border border-[#F5C2B8] text-xs font-semibold text-[#B44C3A]">
            {reportError}
          </div>
        )}

        {/* AI REPORT RESULT DISPLAY */}
        <AnimatePresence mode="wait">
          {aiReport && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              {/* 1. Large Highlighted Overall Adherence Metric & Executive Insight */}
              <div className="p-5 sm:p-6 rounded-3xl bg-[#FAF8F3] dark:bg-[#151D2A] border border-[#E8E2D5] dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#738541] dark:text-emerald-400">
                      Overall {viewPeriod === 'weekly' ? 'Weekly' : 'Monthly'} Adherence
                    </span>
                    <div className="flex items-baseline gap-2.5 mt-1">
                      <span className="text-4xl sm:text-5xl font-serif font-bold text-[#1D2516] dark:text-white tracking-tight tabular-nums">
                        {aiReport.adherenceRate}%
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border shadow-2xs ${
                          aiReport.adherenceRate >= 75
                            ? 'bg-[#EEF4E8] text-[#2F4418] border-[#BCD49B] dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800'
                            : aiReport.adherenceRate >= 45
                            ? 'bg-[#FEF9E7] text-[#92400E] border-[#FDE68A] dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                            : 'bg-[#FEF2F2] text-[#B91C1C] border-[#FCA5A5] dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                        }`}
                      >
                        {aiReport.adherenceRate >= 75
                          ? 'Consistent Momentum'
                          : aiReport.adherenceRate >= 45
                          ? 'Developing Baseline'
                          : 'Bottleneck Detected'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 max-w-xl md:border-l md:border-[#E8E2D5] dark:md:border-slate-800 md:pl-6">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#8C8271] dark:text-slate-400 block mb-1">
                    Executive Diagnosis
                  </span>
                  <p className="text-sm sm:text-[15px] font-semibold text-[#1D2516] dark:text-slate-100 leading-relaxed">
                    {aiReport.executiveSummary}
                  </p>
                </div>
              </div>

              {/* 2. Visual Horizontal Bar Chart of Every Habit (Highlighted & Bold Stats) */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0D1814] border border-[#E8E2D5] dark:border-[#223326] shadow-xs space-y-4 transition-colors">
                <div className="flex items-center justify-between pb-3 border-b border-[#ECE7DC] dark:border-[#223326]">
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faChartBar} className="text-[#738541] dark:text-[#9EB868] text-sm" />
                    <h3 className="font-serif font-bold text-base sm:text-lg text-[#1D2516] dark:text-[#F5F2EB]">
                      Habit Adherence Breakdown
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-[#6F6759] dark:text-[#8FA387]">
                    {viewPeriod === 'weekly' ? 'Last 7 Days' : 'Last 30 Days'} Performance
                  </span>
                </div>

                <div className="space-y-3.5">
                  {habits.map((h) => {
                    const totalDays = viewPeriod === 'weekly' ? 7 : 30
                    const now = new Date()
                    const cutoffDate = new Date(now.getTime() - (totalDays - 1) * 86400000)
                    const cutoffStr = format(cutoffDate, 'yyyy-MM-dd')
                    const todayStr = format(now, 'yyyy-MM-dd')

                    const habitLogs = allLogs.filter(
                      (l) => l.habit_id === h.id && l.log_date >= cutoffStr && l.log_date <= todayStr
                    )
                    const target = h.target_value || 1
                    const completedCount = habitLogs.filter((l) => {
                      const val = l.actual_value !== undefined ? l.actual_value : l.completion_status ? target : 0
                      return val >= target
                    }).length
                    const rate = Math.min(Math.round((completedCount / totalDays) * 100), 100)
                    const isOptimal = rate >= 75
                    const isDeveloping = rate >= 40 && rate < 75
                    const icon = getHabitFAIcon(h.name, h.category)

                    return (
                      <div key={h.id} className="p-3.5 sm:p-4 rounded-2xl bg-[#FAF8F3] dark:bg-[#15231C] border border-[#E8E2D5] dark:border-[#223326] space-y-2.5 transition-colors">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-white dark:bg-[#1D2D23] border border-[#E8E2D5] dark:border-[#2E4334] flex items-center justify-center text-[#4A6225] dark:text-[#A8D968] text-sm shadow-2xs flex-shrink-0">
                              <FontAwesomeIcon icon={icon} />
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-sm sm:text-base text-[#1D2516] dark:text-[#F5F2EB] truncate block">
                                {h.name}
                              </span>
                              <span className="text-xs text-[#6F6759] dark:text-[#8FA387] font-medium">
                                Target: {h.target_value} {h.unit} · {completedCount} of {totalDays} days logged
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span
                              className={`text-xs font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                                isOptimal
                                  ? 'bg-[#EEF4E8] text-[#2F4418] border-[#BCD49B] dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800'
                                  : isDeveloping
                                  ? 'bg-[#FEF9E7] text-[#92400E] border-[#FDE68A] dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                  : 'bg-[#FEF2F2] text-[#B91C1C] border-[#FCA5A5] dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                              }`}
                            >
                              {isOptimal ? 'Optimal' : isDeveloping ? 'Steady' : 'Lagging'}
                            </span>
                            <span className="font-serif font-bold text-base sm:text-lg text-[#1D2516] dark:text-white tabular-nums min-w-[42px] text-right">
                              {rate}%
                            </span>
                          </div>
                        </div>

                        {/* Bold Horizontal Progress Bar */}
                        <div className="w-full h-3 bg-[#EFE9DC] dark:bg-slate-800 rounded-full overflow-hidden p-0.5 shadow-inner">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(rate, 2)}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            className={`h-full rounded-full ${
                              isOptimal ? 'bg-[#4A6225] dark:bg-emerald-500' : isDeveloping ? 'bg-[#D97706] dark:bg-amber-500' : 'bg-[#DC2626]'
                            }`}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 3. 2-Column: Identified Shortcomings vs Action Steps (Bold, High-Contrast Bullet Points) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. Shortcomings in Bold Points */}
                <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0D1814] border border-[#E8E2D5] dark:border-[#223326] shadow-xs space-y-4 transition-colors">
                  <div className="flex items-center gap-2 pb-3 border-b border-[#ECE7DC] dark:border-[#223326]">
                    <div className="w-7 h-7 rounded-lg bg-[#FEF2F2] dark:bg-rose-950/60 text-[#DC2626] dark:text-rose-400 flex items-center justify-center text-xs">
                      <FontAwesomeIcon icon={faTriangleExclamation} />
                    </div>
                    <h4 className="font-serif font-bold text-base sm:text-lg text-[#1D2516] dark:text-[#F5F2EB]">
                      Identified Shortcomings & Lags
                    </h4>
                  </div>

                  <div className="space-y-3">
                    {aiReport.shortcomings.slice(0, 3).map((sc, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-[#FDFBF9] dark:bg-[#181318] border border-[#F3C7BE] dark:border-rose-950/60 border-l-4 border-l-[#DC2626] dark:border-l-rose-500 space-y-2 shadow-2xs"
                      >
                        <div className="text-sm sm:text-base font-bold text-[#1D2516] dark:text-[#F5F2EB]">
                          • <span className="text-[#DC2626] dark:text-rose-400 font-bold">{sc.habitName}</span>: {sc.issue}
                        </div>
                        <div className="pl-4 space-y-1.5 text-xs sm:text-sm text-[#38422E] dark:text-[#CBD8BF]">
                          <div>
                            ↳ <strong className="font-bold text-[#1D2516] dark:text-[#F5F2EB]">Missed Sessions:</strong>{' '}
                            <span className="font-semibold text-[#DC2626] dark:text-rose-400">{sc.missedCountOrTarget}</span>
                          </div>
                          <div>
                            ↳ <strong className="font-bold text-[#1D2516] dark:text-[#F5F2EB]">Root Bottleneck:</strong>{' '}
                            <span className="font-medium text-[#2E3725] dark:text-[#CBD8BF]">{sc.rootCauseAnalysis}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Action Steps & How to Improve in Bold Points */}
                <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0D1814] border border-[#E8E2D5] dark:border-[#223326] shadow-xs space-y-4 transition-colors">
                  <div className="flex items-center gap-2 pb-3 border-b border-[#ECE7DC] dark:border-[#223326]">
                    <div className="w-7 h-7 rounded-lg bg-[#EEF4E8] dark:bg-[#1D2D23] text-[#4A6225] dark:text-[#A8D968] flex items-center justify-center text-xs">
                      <FontAwesomeIcon icon={faCheckCircle} />
                    </div>
                    <h4 className="font-serif font-bold text-base sm:text-lg text-[#1D2516] dark:text-[#F5F2EB]">
                      Action Steps & How to Improve
                    </h4>
                  </div>

                  <div className="space-y-3">
                    {aiReport.howToImprove.slice(0, 3).map((plan, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-[#FBFCF8] dark:bg-[#0E1A16] border border-[#D5E3C4] dark:border-[#223326] border-l-4 border-l-[#4A6225] dark:border-l-[#4E6826] space-y-2 shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-sm sm:text-base font-bold text-[#1D2516] dark:text-[#F5F2EB]">
                            • {plan.title}
                          </span>
                          <span className="text-[11px] font-bold text-[#4A6225] dark:text-[#A8D968] bg-[#EEF4E8] dark:bg-[#1D2D23] px-2.5 py-0.5 rounded-full border border-[#D5E3C4] dark:border-[#2E4334]">
                            {plan.timeframe}
                          </span>
                        </div>
                        <div className="pl-4 space-y-1.5 text-xs sm:text-sm text-[#38422E] dark:text-[#CBD8BF]">
                          {plan.stepByStep.slice(0, 2).map((step, sIdx) => (
                            <div key={sIdx}>
                              ↳ <strong className="font-bold text-[#1D2516] dark:text-[#F5F2EB]">Step {sIdx + 1}:</strong> {step}
                            </div>
                          ))}
                          {plan.habitStackTrigger && (
                            <div className="pt-1">
                              <span className="inline-block px-2.5 py-1 rounded-lg bg-[#FAF7EF] dark:bg-[#15231C] border border-[#DFD8C7] dark:border-[#223326] text-xs font-semibold text-[#2C3E14] dark:text-[#A8D968]">
                                ⚡ <strong className="font-bold text-[#1D2516] dark:text-[#F5F2EB]">Trigger:</strong> {plan.habitStackTrigger}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. Curated High-Utility Resources */}
              <div className="p-5 sm:p-6 rounded-3xl bg-[#FAF8F3] dark:bg-[#15231C] border border-[#E8E2D5] dark:border-[#223326] shadow-xs space-y-3.5 transition-colors">
                <div className="flex items-center justify-between pb-2 border-b border-[#E8E2D5] dark:border-[#223326]">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#1D2516] dark:text-[#F5F2EB]">
                    <FontAwesomeIcon icon={faLink} className="text-[#738541] dark:text-[#9EB868]" />
                    <span>Curated Resources for Target Shortcomings</span>
                  </div>
                  <span className="text-xs font-semibold text-[#6F6759] dark:text-[#8FA387]">Scientific & Behavioral Guides</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {aiReport.recommendedResources.slice(0, 2).map((res, idx) => (
                    <a
                      key={idx}
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3.5 rounded-2xl bg-white dark:bg-[#0D1814] hover:bg-[#EEF4E8] dark:hover:bg-[#15231C] border border-[#DFD8C7] dark:border-[#223326] hover:border-[#CCD8B8] dark:hover:border-[#38592A] flex items-center justify-between gap-3 transition-all cursor-pointer group shadow-2xs"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-bold text-[#1D2516] dark:text-[#F5F2EB] group-hover:text-[#35451D] dark:group-hover:text-[#A8D968] block truncate">
                          {res.name}
                        </span>
                        <p className="text-xs text-[#556244] dark:text-[#8FA387] font-medium line-clamp-1 mt-0.5">{res.description}</p>
                      </div>
                      <div className="w-7 h-7 rounded-xl bg-[#FAF8F3] dark:bg-[#1D2D23] group-hover:bg-white dark:group-hover:bg-[#15231C] flex items-center justify-center text-xs text-[#738541] dark:text-[#9EB868] flex-shrink-0 border border-[#E8E2D5] dark:border-[#2E4334]">
                        <FontAwesomeIcon
                          icon={faArrowUpRightFromSquare}
                          className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                        />
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              {/* 5. Motivational Focus Callout */}
              <div className="p-4 rounded-2xl bg-[#EEF4E8] dark:bg-emerald-950/60 border border-[#C5D8AF] dark:border-emerald-800/60 flex items-center gap-3 text-sm text-[#2C3E14] dark:text-emerald-200 font-semibold shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-white/80 dark:bg-emerald-900/60 flex items-center justify-center text-[#556E2B] dark:text-emerald-300 flex-shrink-0">
                  <FontAwesomeIcon icon={faCircleCheck} className="text-sm" />
                </div>
                <span>{aiReport.motivationalNote}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
