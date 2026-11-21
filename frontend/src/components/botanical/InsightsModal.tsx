import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faXmark,
  faArrowTrendUp,
  faChartSimple,
  faWandMagicSparkles,
  faSeedling,
  faCompass,
  faCopy,
  faCheck,
  faRotateRight,
  faCalendarDays,
  faCircleCheck,
  faArrowUpRightFromSquare,
  faFire,
  faMoon,
  faBookOpen,
  faDumbbell,
  faPersonWalking,
  faDroplet,
  faMobileScreen,
  faSpa,
  faAppleWhole,
} from '@fortawesome/free-solid-svg-icons'
import { format, startOfWeek, isSameDay } from 'date-fns'
import type { Habit, HabitLog } from '../../types'
import { aiApi } from '../../services/api'
import { calculateWeekAdherence, calculateMonthAdherence } from '../../utils/adherence'

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

interface InsightsModalProps {
  isOpen: boolean
  onClose: () => void
  initialTab?: 'analytics' | 'report'
  selectedType?: 'weekly' | 'monthly'
  allLogs: HabitLog[]
  habits: Habit[]
  selectedDate: Date
  userName?: string
}

export function InsightsModal({
  isOpen,
  onClose,
  initialTab = 'analytics',
  selectedType = 'weekly',
  allLogs = [],
  habits = [],
  selectedDate,
  userName = 'Friend',
}: InsightsModalProps) {
  const [activeTab, setActiveTab] = useState<'analytics' | 'report'>(initialTab)
  const [viewType, setViewType] = useState<'weekly' | 'monthly'>(selectedType)
  const [copied, setCopied] = useState(false)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [aiCustomQuestion, setAiCustomQuestion] = useState('')
  const [aiCustomAnswer, setAiCustomAnswer] = useState<{ question: string; answer: string } | null>(null)
  const [isAskingQuestion, setIsAskingQuestion] = useState(false)

  const handleAskQuestion = async () => {
    if (!aiCustomQuestion.trim() || isAskingQuestion) return
    const q = aiCustomQuestion.trim()
    setIsAskingQuestion(true)
    try {
      const res = await aiApi.askCoach(q, 'habit', {
        habits: detailedHabitProgress,
        todayOverallRate,
        weeklyAvg,
        monthlyAvg,
        period: viewType,
        userName,
      })
      if (res.data?.answer) {
        setAiCustomAnswer({ question: q, answer: res.data.answer })
        setAiCustomQuestion('')
      } else {
        await handleGenerateAIReport()
      }
    } catch {
      await handleGenerateAIReport()
    } finally {
      setIsAskingQuestion(false)
    }
  }

  // Sync tab and viewType when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab)
      setViewType(selectedType)
    }
  }, [isOpen, initialTab, selectedType])

  // Lock background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // --- Compute Weekly Data using shared adherence engine ---
  const weekStart = useMemo(() => {
    return startOfWeek(selectedDate, { weekStartsOn: 1 })
  }, [selectedDate])

  const weekData = useMemo(() => {
    return calculateWeekAdherence(weekStart, habits, allLogs)
  }, [weekStart, habits, allLogs])

  const weeklyPoints = weekData.points
  const weeklyAvg = weekData.weeklyAvg

  // --- Compute Monthly Data (4 Weeks) using shared adherence engine ---
  const monthData = useMemo(() => {
    return calculateMonthAdherence(selectedDate, habits, allLogs)
  }, [selectedDate, habits, allLogs])

  const monthlyWeeks = monthData.weeks
  const monthlyAvg = monthData.monthlyAvg

  // Top Habit / Performance Stats
  const topHabit = habits[0]?.name || 'Daily Habits'
  const bestDay = useMemo(() => {
    return [...weeklyPoints].filter(p => !p.isFuture && p.value !== null).sort((a, b) => (b.value ?? 0) - (a.value ?? 0))[0]
  }, [weeklyPoints])

  // Personalized breakdown of every habit for today / selected date
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd')
  const detailedHabitProgress = useMemo(() => {
    return habits.map((h) => {
      const log = allLogs.find((l) => l.habit_id === h.id && l.log_date === selectedDateStr)
      const target = log?.target_value || h.target_value || 1
      const actual =
        log?.actual_value !== undefined ? log.actual_value : log?.completion_status ? target : 0
      const percent = Math.min(Math.round((actual / target) * 100), 100)
      const isCompleted = actual >= target && target > 0
      const isInProgress = actual > 0 && actual < target
      const unit = h.unit === 'm' ? 'mins' : h.unit
      return {
        id: h.id,
        name: h.name,
        actual,
        target,
        unit,
        percent,
        isCompleted,
        isInProgress,
        isPending: actual === 0,
      }
    })
  }, [habits, allLogs, selectedDateStr])

  const completedHabits = detailedHabitProgress.filter((p) => p.isCompleted)
  const inProgressHabits = detailedHabitProgress.filter((p) => p.isInProgress)
  const pendingHabits = detailedHabitProgress.filter((p) => p.isPending)
  const todayOverallRate =
    detailedHabitProgress.length > 0
      ? Math.round(
          detailedHabitProgress.reduce((sum, p) => sum + p.percent, 0) /
            detailedHabitProgress.length
        )
      : 0

  // Real AI Progress Report Generation
  const [aiReportData, setAiReportData] = useState<any>(null)
  const [aiReportError, setAiReportError] = useState<string | null>(null)

  const handleGenerateAIReport = async () => {
    setIsGeneratingAI(true)
    setAiReportError(null)
    try {
      const res = await aiApi.generateProgressReport({
        period: viewType,
        habits,
        logs: allLogs,
        userName,
      })
      if (res.data) {
        setAiReportData(res.data)
      } else if (res.error) {
        setAiReportError(res.error)
      }
    } catch (err: any) {
      setAiReportError(err?.message || 'Failed to generate AI Progress Report.')
    } finally {
      setIsGeneratingAI(false)
    }
  }

  // Clear report data when switching period to avoid showing stale data
  useEffect(() => {
    setAiReportData(null)
  }, [viewType])

  // Automatically trigger real report generation when switching to the report tab if not yet loaded
  useEffect(() => {
    if (isOpen && activeTab === 'report' && !aiReportData && !isGeneratingAI) {
      handleGenerateAIReport()
    }
  }, [isOpen, activeTab, viewType])

  const handleCopyReport = () => {
    const habitDetails = detailedHabitProgress
      .map(
        (h) =>
          `- ${h.name}: ${h.actual}/${h.target} ${h.unit} (${h.percent}%) [${
            h.isCompleted ? 'Completed' : h.isInProgress ? 'In Progress' : 'Pending'
          }]`
      )
      .join('\n')

    const reportText = `Future You - Personalized Progress Report for ${userName}
Date: ${format(selectedDate, 'MMMM d, yyyy')}
Overall Day Execution: ${todayOverallRate}%
7-Day Trajectory Average: ${weeklyAvg}%
Monthly Average: ${monthlyAvg}%
Completed Habits (${completedHabits.length}): ${
      completedHabits.map((c) => c.name).join(', ') || 'None yet'
    }
In Progress (${inProgressHabits.length}): ${
      inProgressHabits.map((p) => `${p.name} (${p.percent}%)`).join(', ') || 'None'
    }
Pending (${pendingHabits.length}): ${
      pendingHabits.map((p) => p.name).join(', ') || 'None'
    }

Habit-by-Habit Custom Progress:
${habitDetails}
`

    navigator.clipboard.writeText(reportText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // SVG Chart Geometry for Large Modal View
  const svgWidth = 720
  const svgHeight = 240
  const padLeft = 48
  const padRight = 32
  const padTop = 24
  const padBottom = 36
  const graphWidth = svgWidth - padLeft - padRight
  const graphHeight = svgHeight - padTop - padBottom

  const coords = weeklyPoints.map((p, i) => {
    const x = padLeft + (i / (weeklyPoints.length - 1)) * graphWidth
    const y = padTop + graphHeight - ((p.value ?? 0) / 100) * graphHeight
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

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-[#1D2516]/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="bg-[#FAF7F0] dark:bg-[#0D1814] border border-[#D5E3C4] dark:border-[#223326] rounded-2xl sm:rounded-3xl p-3.5 sm:p-7 max-w-4xl w-full shadow-2xl relative my-auto max-h-[90dvh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
          {/* Top Bar: Title, Tabs & Close */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 sm:pb-4 border-b border-[#E5DFD1] dark:border-[#223326] gap-2.5 sm:gap-3 flex-shrink-0">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#EEF4E8] dark:bg-[#1D2D23] flex items-center justify-center text-[#738541] dark:text-[#A8D968] shadow-2xs flex-shrink-0">
                {activeTab === 'analytics' ? (
                  <FontAwesomeIcon icon={faArrowTrendUp} className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#738541] dark:text-[#A8D968]" />
                ) : (
                  <FontAwesomeIcon icon={faSeedling} className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#738541] dark:text-[#A8D968]" />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-2xl font-serif font-bold text-[#1D2516] dark:text-[#F5F2EB] leading-tight truncate">
                  Performance & Progress
                </h2>
                <p className="text-[11px] sm:text-xs text-[#52633E] dark:text-[#8FA387] font-semibold truncate">
                  Detailed analytics and AI-powered progress overview
                </p>
              </div>
            </div>

            {/* Segmented Options: 1. Graph & Analytics | 2. Progress Report + Close */}
            <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
              <div className="flex items-center bg-[#ECE6D8] dark:bg-[#132219] p-1 rounded-xl border border-[#DFD8C7] dark:border-[#223326] flex-1 sm:flex-initial">
                <button
                  type="button"
                  onClick={() => setActiveTab('analytics')}
                  className={`px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 flex-1 sm:flex-initial ${
                    activeTab === 'analytics'
                      ? 'bg-white dark:bg-[#203625] text-[#1D2516] dark:text-[#F5F2EB] shadow-xs'
                      : 'text-[#635B4E] dark:text-[#8FA387] hover:text-[#1D2516] dark:hover:text-[#F5F2EB]'
                  }`}
                >
                  <FontAwesomeIcon icon={faChartSimple} className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#738541] dark:text-[#A8D968]" />
                  <span>Graph</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('report')}
                  className={`px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 flex-1 sm:flex-initial ${
                    activeTab === 'report'
                      ? 'bg-white dark:bg-[#203625] text-[#1D2516] dark:text-[#F5F2EB] shadow-xs'
                      : 'text-[#635B4E] dark:text-[#8FA387] hover:text-[#1D2516] dark:hover:text-[#F5F2EB]'
                  }`}
                >
                  <FontAwesomeIcon icon={faWandMagicSparkles} className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#738541] dark:text-[#A8D968]" />
                  <span>Report</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-[#EEF4E8] dark:bg-[#1C2C1D] text-[#415525] dark:text-[#A8D968] border border-[#D5E3C4] dark:border-[#2E4731]">
                    AI
                  </span>
                </button>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-white dark:bg-[#132219] hover:bg-[#EAE5D8] dark:hover:bg-[#1E3326] text-[#52633E] dark:text-[#8FA387] hover:text-[#1D2516] dark:hover:text-[#F5F2EB] border border-[#D5E3C4] dark:border-[#223326] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                aria-label="Close modal"
              >
                <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Modal Body: Scrollable */}
          <div className="flex-1 overflow-y-auto pt-3 sm:pt-4 space-y-4 sm:space-y-5 custom-scrollbar pr-1">
            {activeTab === 'analytics' ? (
              /* ================= TAB 1: GRAPH & DETAILED ANALYTICS ================= */
              <div className="space-y-4">
                {/* View Switcher: Weekly vs Monthly */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setViewType('weekly')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                        viewType === 'weekly'
                          ? 'bg-[#738541] dark:bg-[#4E6826] text-white shadow-xs'
                          : 'bg-white dark:bg-[#132219] text-[#52633E] dark:text-[#8FA387] border border-[#E3DDCF] dark:border-[#223326] hover:bg-[#EEF4E8] dark:hover:bg-[#1E3326]'
                      }`}
                    >
                      Weekly Curve ({weeklyAvg}% avg)
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewType('monthly')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                        viewType === 'monthly'
                          ? 'bg-[#738541] dark:bg-[#4E6826] text-white shadow-xs'
                          : 'bg-white dark:bg-[#132219] text-[#52633E] dark:text-[#8FA387] border border-[#E3DDCF] dark:border-[#223326] hover:bg-[#EEF4E8] dark:hover:bg-[#1E3326]'
                      }`}
                    >
                      Monthly Breakdown ({monthlyAvg}% avg)
                    </button>
                  </div>

                  <span className="text-xs text-[#52633E] dark:text-[#8FA387] font-semibold flex items-center gap-1">
                    <FontAwesomeIcon icon={faCalendarDays} className="w-3.5 h-3.5" />
                    {format(selectedDate, 'MMMM yyyy')}
                  </span>
                </div>

                {/* Big Full-Width Chart Canvas */}
                <div className="bg-white dark:bg-[#0D1814] border border-[#E3DDCF] dark:border-[#223326] rounded-2xl p-4 sm:p-5 shadow-xs transition-colors">
                  {viewType === 'weekly' ? (
                    <div>
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#F0EBE0] dark:border-[#223326]">
                        <span className="text-xs font-bold text-[#1D2516] dark:text-[#F5F2EB]">
                          7-Day Habit Completion Trajectory
                        </span>
                        <span className="text-xs font-bold text-[#738541] dark:text-[#A8D968]">
                          Week of {format(weekStart, 'MMM d, yyyy')}
                        </span>
                      </div>

                      {/* Wide SVG Line Chart */}
                      <div className="w-full h-56 sm:h-64 relative">
                        <svg
                          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                          className="w-full h-full overflow-visible"
                        >
                          <defs>
                            <linearGradient id="modalLeafGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#738541" stopOpacity="0.32" />
                              <stop offset="100%" stopColor="#738541" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Grid lines */}
                          {[100, 75, 50, 25, 0].map((val) => {
                            const y = padTop + graphHeight - (val / 100) * graphHeight
                            return (
                              <g key={val}>
                                <text
                                  x={padLeft - 12}
                                  y={y + 4}
                                  textAnchor="end"
                                  className="text-[11px] fill-[#767C6B] dark:fill-slate-400 font-bold"
                                >
                                  {val}%
                                </text>
                                <line
                                  x1={padLeft}
                                  y1={y}
                                  x2={svgWidth - padRight}
                                  y2={y}
                                  stroke="#E8E3D7"
                                  className="dark:stroke-[#1F293D]"
                                  strokeWidth="1.2"
                                  strokeDasharray="4 4"
                                />
                              </g>
                            )
                          })}

                          {/* Area & Path */}
                          <path d={areaD} fill="url(#modalLeafGrad)" />
                          <path
                            d={pathD}
                            fill="none"
                            stroke="#738541"
                            className="dark:stroke-emerald-400"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {/* Points */}
                          {coords.map((pt) => {
                            const isSelected = isSameDay(pt.fullDate, selectedDate)
                            return (
                              <g key={pt.day}>
                                <circle
                                  cx={pt.x}
                                  cy={pt.y}
                                  r={isSelected ? 7 : 5}
                                  fill={isSelected ? '#2C3E14' : '#738541'}
                                  stroke="#FFFFFF"
                                  strokeWidth="2.5"
                                />
                                <text
                                  x={pt.x}
                                  y={pt.y - 12}
                                  textAnchor="middle"
                                  className="text-[11px] font-bold fill-[#1D2516] dark:fill-white"
                                >
                                  {pt.value}%
                                </text>
                                <text
                                  x={pt.x}
                                  y={svgHeight - 10}
                                  textAnchor="middle"
                                  className={`text-[12px] font-bold ${
                                    isSelected ? 'fill-[#2C3E14] dark:fill-emerald-400' : 'fill-[#767C6B] dark:fill-slate-400'
                                  }`}
                                >
                                  {pt.day}
                                </text>
                              </g>
                            )
                          })}
                        </svg>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#F0EBE0] dark:border-slate-800">
                        <span className="text-xs font-bold text-[#1D2516] dark:text-white">
                          Monthly 4-Week Progress Breakdown
                        </span>
                        <span className="text-xs font-bold text-[#738541] dark:text-emerald-400">
                          {format(selectedDate, 'MMMM yyyy')}
                        </span>
                      </div>

                      {/* Wide Monthly Bar Chart */}
                      <div className="w-full h-56 sm:h-64 flex">
                        <div className="w-10 h-48 flex flex-col justify-between text-right pr-2 text-xs text-[#767C6B] dark:text-slate-400 font-bold pt-1">
                          {[100, 75, 50, 25, 0].map((tick) => (
                            <span key={tick}>{tick}%</span>
                          ))}
                        </div>

                        <div className="flex-1 h-48 relative flex items-end justify-around px-6">
                          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pt-1">
                            {[100, 75, 50, 25, 0].map((tick) => (
                              <div
                                key={tick}
                                className="w-full border-b border-dashed border-[#E8E3D7] dark:border-[#1F293D]"
                              />
                            ))}
                          </div>

                          {monthlyWeeks.map((bar) => (
                            <div key={bar.label} className="flex flex-col items-center z-10 w-16 sm:w-20">
                              <span className={`text-xs font-bold mb-1.5 ${bar.isFuture ? 'text-[#9BAF90] dark:text-slate-500 italic' : 'text-[#2C3E14] dark:text-emerald-400'}`}>
                                {bar.isFuture ? '—' : bar.value === null ? '0%' : `${bar.value}%`}
                              </span>
                              <div className="w-full h-38 flex items-end justify-center">
                                <div
                                  className={`w-full rounded-t-xl shadow-xs transition-all ${
                                    bar.isFuture
                                      ? 'bg-[#E5DFD1] dark:bg-[#1A261E] border border-dashed border-[#CCD8B8] dark:border-[#2E4334] opacity-50'
                                      : bar.value === null
                                      ? 'bg-[#EAE4D7] dark:bg-[#1E2E24] opacity-40'
                                      : 'bg-[#738541] dark:bg-emerald-500 hover:brightness-95'
                                  }`}
                                  style={{ height: `${bar.isFuture || bar.value === null ? 4 : Math.max(bar.value, 6)}%` }}
                                />
                              </div>
                              <span className={`text-xs font-bold mt-2 ${bar.isFuture ? 'text-[#9BAF90] dark:text-slate-500 italic' : 'text-[#1D2516] dark:text-white'}`}>
                                {bar.label}
                              </span>
                              <span className="text-[10px] text-[#767C6B] dark:text-slate-400 font-semibold">
                                {bar.dateRange}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3 Metric Insight Pills */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white dark:bg-[#0D1814] border border-[#E3DDCF] dark:border-[#223326] rounded-2xl p-3.5 transition-colors">
                    <span className="text-[11px] font-bold text-[#52633E] dark:text-[#9EB868] uppercase tracking-wider block">
                      Consistency Score
                    </span>
                    <span className="text-2xl font-serif font-bold text-[#1D2516] dark:text-[#F5F2EB] mt-0.5 block">
                      {weeklyAvg >= 75 ? 'Optimal' : weeklyAvg >= 50 ? 'Steady' : 'Building'}
                    </span>
                    <span className="text-xs text-[#767C6B] dark:text-[#8FA387] font-semibold">
                      Based on current 7-day adherence
                    </span>
                  </div>

                  <div className="bg-white dark:bg-[#0D1814] border border-[#E3DDCF] dark:border-[#223326] rounded-2xl p-3.5 transition-colors">
                    <span className="text-[11px] font-bold text-[#52633E] dark:text-[#9EB868] uppercase tracking-wider block">
                      Peak Performance Day
                    </span>
                    <span className="text-2xl font-serif font-bold text-[#1D2516] dark:text-[#F5F2EB] mt-0.5 block">
                      {bestDay?.day || 'Mon'} · {bestDay?.value || 0}%
                    </span>
                    <span className="text-xs text-[#767C6B] dark:text-[#8FA387] font-semibold">
                      Highest completed habits ratio
                    </span>
                  </div>

                  <div className="bg-white dark:bg-[#0D1814] border border-[#E3DDCF] dark:border-[#223326] rounded-2xl p-3.5 transition-colors">
                    <span className="text-[11px] font-bold text-[#52633E] dark:text-[#9EB868] uppercase tracking-wider block">
                      Tracked Habits
                    </span>
                    <span className="text-2xl font-serif font-bold text-[#1D2516] dark:text-[#F5F2EB] mt-0.5 block">
                      {habits.length} Active
                    </span>
                    <span className="text-xs text-[#767C6B] dark:text-[#8FA387] font-semibold">
                      Primary focus: {topHabit}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* ================= TAB 2: AI PROGRESS REPORT ================= */
              <div className="space-y-4">
                {/* AI Banner / Status */}
                <div className="bg-gradient-to-r from-[#EEF4E8] to-[#FAF7F0] dark:from-[#111C16] dark:to-[#16241D] border border-[#D5E3C4] dark:border-[#223528] rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#738541] dark:bg-[#4E6826] text-white flex items-center justify-center shadow-xs shrink-0">
                      <FontAwesomeIcon icon={faWandMagicSparkles} className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-serif font-bold text-[#1D2516] dark:text-[#F5F2EB]">
                        Automated AI Progress Report
                      </h4>
                      <p className="text-xs text-[#52633E] dark:text-[#A8D968] font-semibold">
                        Personalized habit breakdown and momentum trajectory
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={handleCopyReport}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white dark:bg-[#16241D] border border-[#D5E3C4] dark:border-[#223528] text-[#1D2516] dark:text-[#F5F2EB] hover:bg-[#F2ECE0] dark:hover:bg-[#1C2F25] transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <FontAwesomeIcon icon={faCheck} className="w-3.5 h-3.5 text-[#738541] dark:text-[#A8D968]" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <FontAwesomeIcon icon={faCopy} className="w-3.5 h-3.5 text-[#52633E] dark:text-[#A8BCA0]" />
                          <span>Copy Report</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleGenerateAIReport}
                      disabled={isGeneratingAI}
                      className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-[#738541] hover:bg-[#5E6F34] dark:bg-[#4E6826] dark:hover:bg-[#41581F] text-white transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-75 cursor-pointer"
                    >
                      <FontAwesomeIcon icon={faRotateRight} className={`w-3.5 h-3.5 ${isGeneratingAI ? 'animate-spin' : ''}`} />
                      <span>{isGeneratingAI ? 'Analyzing...' : 'Refresh AI'}</span>
                    </button>
                  </div>
                </div>

                {/* AI Error Notification if any */}
                {aiReportError && (
                  <div className="p-3 rounded-xl bg-[#FDF2F0] border border-[#F5C2B8] text-xs font-semibold text-[#B44C3A]">
                    {aiReportError}
                  </div>
                )}

                {/* AI Report Card Content */}
                <div className="bg-white dark:bg-[#0E1714] border border-[#E3DDCF] dark:border-[#1E2E27] rounded-2xl p-5 shadow-xs space-y-4">
                  {/* Executive Summary */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h5 className="text-xs font-bold text-[#52633E] dark:text-[#A8D968] uppercase tracking-wider flex items-center gap-1.5">
                        <FontAwesomeIcon icon={faFire} className="w-3.5 h-3.5 text-[#738541] dark:text-[#A8D968]" />
                        <span>{aiReportData ? `${viewType === 'weekly' ? 'Weekly' : 'Monthly'} AI Diagnosis` : 'Live Progress Analysis'}</span>
                      </h5>
                      {aiReportData && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#EEF4E8] dark:bg-[#1C2C1D] text-[#415525] dark:text-[#A8D968] border border-[#D5E3C4] dark:border-[#2E4731]">
                          {aiReportData.adherenceRate}% Adherence
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#1D2516] dark:text-[#CBD8BF] font-medium leading-relaxed">
                      {aiReportData?.executiveSummary ? (
                        aiReportData.executiveSummary
                      ) : (
                        <>
                          {userName} has achieved an overall completion score of{' '}
                          <strong className="text-[#2C3E14] dark:text-[#F5F2EB] font-bold">{todayOverallRate}%</strong> across{' '}
                          {habits.length} active habits today ({format(selectedDate, 'MMM d, yyyy')}).
                          {completedHabits.length > 0 && (
                            <span>
                              {' '}You have fully achieved <strong>{completedHabits.length} habit(s)</strong> (
                              {completedHabits.map((c) => c.name).join(', ')}).
                            </span>
                          )}
                          {inProgressHabits.length > 0 && (
                            <span>
                              {' '}<strong>{inProgressHabits.length} habit(s)</strong> are in active progress (
                              {inProgressHabits
                                .map((p) => `${p.name}: ${p.actual}/${p.target} ${p.unit} [${p.percent}%]`)
                                .join(', ')}
                              ).
                            </span>
                          )}
                          {pendingHabits.length > 0 && (
                            <span>
                              {' '}Pending to start: {pendingHabits.map((p) => p.name).join(', ')}.
                            </span>
                          )}
                        </>
                      )}
                    </p>
                  </div>

                  {/* AI Shortcomings & Bottlenecks (when available) */}
                  {aiReportData?.shortcomings && aiReportData.shortcomings.length > 0 && (
                    <div className="pt-3 border-t border-[#F0EBE0] dark:border-[#1E2E27] space-y-2.5">
                      <h6 className="text-xs font-bold text-[#B44C3A] dark:text-[#F87171] uppercase tracking-wider flex items-center gap-1.5">
                        <span>Identified Shortcomings & Focus Areas</span>
                      </h6>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {aiReportData.shortcomings.map((sc: any, idx: number) => (
                          <div key={idx} className="p-3 rounded-xl bg-[#FAF8F3] dark:bg-[#121D17] border border-[#E8E2D5] dark:border-[#203024] space-y-1">
                            <span className="font-bold text-xs text-[#1D2516] dark:text-[#F5F2EB] block">
                              {sc.habitName.replace(/\*\*/g, '')}
                            </span>
                            <p className="text-[11px] text-[#52633E] dark:text-[#CBD8BF] font-medium leading-tight">
                              {sc.issue} ({sc.missedCountOrTarget})
                            </p>
                            <p className="text-[10px] text-[#767C6B] dark:text-[#8FA387] italic">
                              Trigger: {sc.rootCauseAnalysis}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Habit-by-Habit Custom Progress Breakdown (Prominent Visual Bars & Bold Numbers) */}
                  <div className="pt-3 border-t border-[#F0EBE0] dark:border-[#1E2E27] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-serif font-bold text-[#1D2516] dark:text-[#F5F2EB]">
                        Daily Habit Adherence Breakdown
                      </span>
                      <span className="text-xs text-[#6F6759] dark:text-[#A8BCA0] font-medium">
                        {completedHabits.length} of {habits.length} completed today
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {detailedHabitProgress.map((hp) => {
                        const icon = getHabitFAIcon(hp.name)
                        return (
                          <div
                            key={hp.id}
                            className="p-3.5 rounded-2xl border border-[#E8E2D5] dark:border-[#203024] bg-[#FAF8F3] dark:bg-[#121D17] space-y-2 shadow-2xs"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-xl bg-white dark:bg-[#1A2821] border border-[#E8E2D5] dark:border-[#223528] flex items-center justify-center text-[#4A6225] dark:text-[#A8D968] text-xs flex-shrink-0">
                                  <FontAwesomeIcon icon={icon} />
                                </div>
                                <span className="font-bold text-sm text-[#1D2516] dark:text-[#F5F2EB] truncate">
                                  {hp.name}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span
                                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                                    hp.isCompleted
                                      ? 'bg-[#EEF4E8] dark:bg-[#253A1D] text-[#2F4418] dark:text-[#A8D968] border-[#BCD49B] dark:border-[#385926]'
                                      : hp.isInProgress
                                      ? 'bg-[#FEF9E7] dark:bg-[#382D16] text-[#92400E] dark:text-[#FBBF24] border-[#FDE68A] dark:border-[#57431E]'
                                      : 'bg-[#FEF2F2] dark:bg-[#3A1818] text-[#B91C1C] dark:text-[#F87171] border-[#FCA5A5] dark:border-[#5C2424]'
                                  }`}
                                >
                                  {hp.isCompleted ? 'Completed' : hp.isInProgress ? `${hp.percent}%` : 'Pending'}
                                </span>
                                <span className="font-serif font-bold text-sm text-[#1D2516] dark:text-[#F5F2EB] tabular-nums">
                                  {hp.actual}/{hp.target} {hp.unit}
                                </span>
                              </div>
                            </div>

                            {/* Prominent Visual Progress Bar */}
                            <div className="w-full h-2.5 rounded-full bg-[#E8E2D4] dark:bg-[#0A120E] overflow-hidden p-0.5">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  hp.isCompleted ? 'bg-[#4A6225] dark:bg-[#688A3A]' : hp.isInProgress ? 'bg-[#D97706] dark:bg-[#D97706]' : 'bg-[#DC2626] dark:bg-[#DC2626]'
                                }`}
                                style={{ width: `${Math.max(hp.percent, hp.actual > 0 ? 5 : 0)}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* 2 Key Takeaways */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    <div className="p-3.5 rounded-xl bg-[#F8F6F0] dark:bg-[#121D17] border border-[#EBE4D5] dark:border-[#1E2E27]">
                      <span className="text-xs font-bold text-[#2C3E14] dark:text-[#A8D968] flex items-center gap-1.5 mb-1">
                        <FontAwesomeIcon icon={faCircleCheck} className="w-3.5 h-3.5 text-[#738541] dark:text-[#A8D968]" />
                        Key Strength
                      </span>
                      <p className="text-xs text-[#52633E] dark:text-[#CBD8BF] font-medium leading-normal">
                        {completedHabits.length > 0
                          ? `High adherence in ${completedHabits[0].name} demonstrates steady execution habits.`
                          : inProgressHabits.length > 0
                          ? `Strong initial momentum in ${inProgressHabits[0].name} at ${inProgressHabits[0].percent}%.`
                          : 'Consistent routine baseline established across your tracked intentions.'}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#F8F6F0] dark:bg-[#121D17] border border-[#EBE4D5] dark:border-[#1E2E27]">
                      <span className="text-xs font-bold text-[#2C3E14] dark:text-[#A8D968] flex items-center gap-1.5 mb-1">
                        <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="w-3 h-3 text-[#738541] dark:text-[#A8D968]" />
                        Recommended Next Step
                      </span>
                      <p className="text-xs text-[#52633E] dark:text-[#CBD8BF] font-medium leading-normal">
                        {inProgressHabits.length > 0
                          ? `Focus on ${inProgressHabits[0].name}: you are only ${Math.max(
                              0,
                              Math.round((inProgressHabits[0].target - inProgressHabits[0].actual) * 10) / 10
                            )} ${inProgressHabits[0].unit} away from 100% completion.`
                          : pendingHabits.length > 0
                          ? `Kickstart ${pendingHabits[0].name} with a quick 5-minute session to build daily momentum.`
                          : 'All targets reached! Take time for mindful reflection and celebratory rest.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* AI Follow-up Answer Display */}
                {aiCustomAnswer && (
                  <div className="p-3.5 rounded-2xl bg-[#F0F6E8] dark:bg-[#142318] border border-[#CCDDB5] dark:border-[#2E4334] text-xs space-y-1.5 animate-fade-in relative">
                    <div className="flex items-center justify-between text-[#3C5120] dark:text-[#A8D968] font-bold">
                      <span className="flex items-center gap-1.5">
                        <FontAwesomeIcon icon={faWandMagicSparkles} className="text-xs" />
                        Advice: {aiCustomAnswer.question}
                      </span>
                      <button
                        type="button"
                        onClick={() => setAiCustomAnswer(null)}
                        className="text-[#6F7D5D] hover:text-[#1D2516] dark:hover:text-white cursor-pointer p-0.5"
                        title="Dismiss advice"
                      >
                        <FontAwesomeIcon icon={faXmark} className="text-xs" />
                      </button>
                    </div>
                    <p className="text-[#2C381E] dark:text-[#E2EBD6] font-medium leading-relaxed whitespace-pre-line">
                      {aiCustomAnswer.answer}
                    </p>
                  </div>
                )}

                {/* Ask AI Follow-up Input with Visible Blinking Caret & Click-to-Focus */}
                <label
                  htmlFor="ask-ai-followup-input"
                  className="bg-white dark:bg-[#0E1714] border border-[#E3DDCF] dark:border-[#1E2E27] focus-within:border-[#738541] dark:focus-within:border-[#22C55E] focus-within:ring-2 focus-within:ring-[#738541]/25 dark:focus-within:ring-[#22C55E]/25 rounded-2xl p-2.5 sm:p-3 flex items-center gap-2.5 cursor-text transition-all shadow-xs"
                >
                  <FontAwesomeIcon icon={faCompass} className="w-4 h-4 text-[#738541] dark:text-[#A8D968] shrink-0 ml-1" />
                  <input
                    id="ask-ai-followup-input"
                    type="text"
                    value={aiCustomQuestion}
                    onChange={(e) => setAiCustomQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && aiCustomQuestion.trim() && !isAskingQuestion) {
                        e.preventDefault()
                        handleAskQuestion()
                      }
                    }}
                    placeholder="Ask AI: e.g. How do I maintain my streak during travel?"
                    className="flex-1 bg-transparent border-none text-xs sm:text-sm text-[#1D2516] dark:text-[#F5F2EB] placeholder-[#8A847A] dark:placeholder-[#6E8268] focus:outline-none focus:ring-0 caret-[#738541] dark:caret-[#22C55E] cursor-text min-w-0"
                  />
                  <button
                    type="button"
                    disabled={isAskingQuestion || !aiCustomQuestion.trim()}
                    onClick={handleAskQuestion}
                    className="px-3.5 py-1.5 bg-[#738541] dark:bg-[#4E6826] hover:bg-[#5E6F34] dark:hover:bg-[#41581F] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 shadow-2xs"
                  >
                    {isAskingQuestion ? 'Thinking...' : 'Ask'}
                  </button>
                </label>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>,
  document.body
)
}
