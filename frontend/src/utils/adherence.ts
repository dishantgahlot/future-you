import { format, addDays, getDaysInMonth, parseISO } from 'date-fns'
import type { Habit, HabitLog } from '../types'
import {
  getHabitsForDate,
  findLogForHabitAndDate,
  getDayTarget,
} from './habitStorage'

export interface DayAdherenceResult {
  dateStr: string
  dayDate: Date
  dayName: string
  isFuture: boolean
  hasHabits: boolean
  totalHabits: number
  completedCount: number
  inProgressCount: number
  pendingCount: number
  progressSum: number
  adherencePercent: number | null // null if future date or 0 habits configured
}

export interface WeekAdherenceResult {
  points: Array<{
    day: string
    fullDate: Date
    dateStr: string
    value: number | null // null if future or no habits
    displayValue: number // 0 for rendering fallback if needed
    completed: number
    total: number
    isFuture: boolean
    hasHabits: boolean
  }>
  weeklyAvg: number
  activeElapsedDays: number
}

export interface MonthWeekSlice {
  label: string
  startDay: number
  endDay: number
  color: string
  value: number | null // null if future
  displayValue: number
  completed: number
  totalExpected: number
  elapsedDays: number
  isFuture: boolean
  dateRange: string
}

export interface MonthAdherenceResult {
  weeks: MonthWeekSlice[]
  monthlyAvg: number
}

/**
 * Calculates monthly attendance percentage based on elapsed days in the month up to today.
 * Excludes future dates from the denominator so future days do not penalize attendance.
 */
export function calculateMonthlyAttendance(
  viewedDate: Date,
  loggedDates: string[] = [],
  todayStr?: string
): { percent: number; loggedCount: number; elapsedDays: number; totalDaysInMonth: number; monthLabel: string } {
  const tStr = todayStr || getTodayStr()
  const daysInMonth = getDaysInMonth(viewedDate)
  const monthPrefix = format(viewedDate, 'yyyy-MM')
  const monthLabel = format(viewedDate, 'MMM')

  const todayMonthPrefix = tStr.slice(0, 7)
  let elapsedDays = daysInMonth
  if (monthPrefix > todayMonthPrefix) {
    elapsedDays = 0 // Future month
  } else if (monthPrefix === todayMonthPrefix) {
    const todayDay = parseInt(tStr.slice(8, 10), 10)
    elapsedDays = Math.max(1, Math.min(todayDay, daysInMonth))
  }

  const thisMonthDates = loggedDates.filter((d) => d.startsWith(monthPrefix) && d <= tStr)
  const loggedCount = thisMonthDates.length
  const percent = elapsedDays > 0 ? Math.round((loggedCount / elapsedDays) * 100) : 0

  return {
    percent,
    loggedCount,
    elapsedDays,
    totalDaysInMonth: daysInMonth,
    monthLabel,
  }
}

/**
 * Returns today's date formatted as YYYY-MM-DD.
 */
export function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Accurately determines if a date is strictly after today.
 */
export function isFutureDate(date: Date | string, todayStr?: string): boolean {
  const tStr = todayStr || getTodayStr()
  const dStr = typeof date === 'string' ? date.slice(0, 10) : format(date, 'yyyy-MM-dd')
  return dStr > tStr
}

/**
 * Calculates adherence for a single date (YYYY-MM-DD).
 * Excludes future dates (returns adherencePercent: null, isFuture: true).
 * Excludes days with 0 habits (returns adherencePercent: null, hasHabits: false).
 */
export function calculateDayAdherence(
  dateStr: string,
  allHabits: Habit[],
  allLogs: HabitLog[],
  todayStr?: string
): DayAdherenceResult {
  const cleanDateStr = dateStr.slice(0, 10)
  const isFuture = isFutureDate(cleanDateStr, todayStr)
  let dayDate: Date
  try {
    dayDate = parseISO(cleanDateStr)
  } catch {
    dayDate = new Date()
  }
  const dayName = format(dayDate, 'EEE')

  if (isFuture) {
    return {
      dateStr: cleanDateStr,
      dayDate,
      dayName,
      isFuture: true,
      hasHabits: false,
      totalHabits: 0,
      completedCount: 0,
      inProgressCount: 0,
      pendingCount: 0,
      progressSum: 0,
      adherencePercent: null,
    }
  }

  const dayHabits = getHabitsForDate(allHabits, cleanDateStr, allLogs)

  if (dayHabits.length === 0) {
    return {
      dateStr: cleanDateStr,
      dayDate,
      dayName,
      isFuture: false,
      hasHabits: false,
      totalHabits: 0,
      completedCount: 0,
      inProgressCount: 0,
      pendingCount: 0,
      progressSum: 0,
      adherencePercent: null,
    }
  }

  let progressSum = 0
  let completed = 0
  let inProgress = 0
  let pending = 0

  dayHabits.forEach((h) => {
    const log = findLogForHabitAndDate(allLogs, h.id, cleanDateStr)
    const target = getDayTarget(h.id, cleanDateStr, h.target_value || 1)
    const actual = log?.actual_value !== undefined ? log.actual_value : log?.completion_status ? target : 0
    const ratio = target > 0 ? Math.min(actual / target, 1) : 0
    progressSum += ratio

    if (actual >= target && target > 0) {
      completed++
    } else if (actual > 0) {
      inProgress++
    } else {
      pending++
    }
  })

  const adherencePercent = Math.round((progressSum / dayHabits.length) * 100)

  return {
    dateStr: cleanDateStr,
    dayDate,
    dayName,
    isFuture: false,
    hasHabits: true,
    totalHabits: dayHabits.length,
    completedCount: completed,
    inProgressCount: inProgress,
    pendingCount: pending,
    progressSum,
    adherencePercent,
  }
}

/**
 * Calculates 7-day weekly adherence for a week starting on weekStart (Monday).
 * Used consistently across Dashboard WeeklyInsightsCard, InsightsPage, and InsightsModal.
 */
export function calculateWeekAdherence(
  weekStart: Date,
  allHabits: Habit[],
  allLogs: HabitLog[],
  todayStr?: string
): WeekAdherenceResult {
  const tStr = todayStr || getTodayStr()

  const points = Array.from({ length: 7 }, (_, i) => {
    const dayDate = addDays(weekStart, i)
    const dayStr = format(dayDate, 'yyyy-MM-dd')
    const dayRes = calculateDayAdherence(dayStr, allHabits, allLogs, tStr)

    return {
      day: dayRes.dayName,
      fullDate: dayDate,
      dateStr: dayStr,
      value: dayRes.adherencePercent,
      displayValue: dayRes.adherencePercent ?? 0,
      completed: dayRes.completedCount,
      total: dayRes.totalHabits,
      isFuture: dayRes.isFuture,
      hasHabits: dayRes.hasHabits,
    }
  })

  // Average weekly completion rate: ONLY average elapsed days that had habits!
  const validElapsedDays = points.filter(
    (p) => !p.isFuture && p.hasHabits && p.value !== null
  )

  const weeklyAvg =
    validElapsedDays.length > 0
      ? Math.round(
          validElapsedDays.reduce((sum, p) => sum + (p.value || 0), 0) /
            validElapsedDays.length
        )
      : 0

  return {
    points,
    weeklyAvg,
    activeElapsedDays: validElapsedDays.length,
  }
}

/**
 * Calculates 4-week monthly adherence for a given month.
 * Used consistently across Dashboard MonthlyInsightsCard, InsightsPage, and InsightsModal.
 */
export function calculateMonthAdherence(
  viewedMonthDate: Date,
  allHabits: Habit[],
  allLogs: HabitLog[],
  todayStr?: string
): MonthAdherenceResult {
  const tStr = todayStr || getTodayStr()
  const daysInMonth = getDaysInMonth(viewedMonthDate)
  const yearMonthPrefix = format(viewedMonthDate, 'yyyy-MM')
  const now = new Date()
  const currentMonthPrefix = format(now, 'yyyy-MM')
  const isCurrentMonth = yearMonthPrefix === currentMonthPrefix
  const isFutureMonth = yearMonthPrefix > currentMonthPrefix
  const currentDayNum = now.getDate()

  const weekSlices = [
    { label: 'W1', startDay: 1, endDay: 7, color: '#8CA25A' },
    { label: 'W2', startDay: 8, endDay: 14, color: '#8CA25A' },
    { label: 'W3', startDay: 15, endDay: 21, color: '#8CA25A' },
    { label: 'W4', startDay: 22, endDay: daysInMonth, color: '#8CA25A' },
  ]

  const weeks: MonthWeekSlice[] = weekSlices.map((w) => {
    let isFuture = false
    let elapsedDaysInSlice = w.endDay - w.startDay + 1

    if (isCurrentMonth) {
      if (currentDayNum < w.startDay) {
        isFuture = true
        elapsedDaysInSlice = 0
      } else if (currentDayNum <= w.endDay) {
        elapsedDaysInSlice = currentDayNum - w.startDay + 1
      }
    } else if (isFutureMonth) {
      isFuture = true
      elapsedDaysInSlice = 0
    }

    if (isFuture || elapsedDaysInSlice === 0) {
      return {
        ...w,
        value: null,
        displayValue: 0,
        completed: 0,
        totalExpected: 0,
        elapsedDays: 0,
        isFuture: true,
        dateRange: `${format(viewedMonthDate, 'MMM')} ${w.startDay}–${w.endDay}`,
      }
    }

    // Evaluate elapsed days in slice
    const maxDay = Math.min(w.endDay, isCurrentMonth ? currentDayNum : w.endDay)
    let totalCompleted = 0
    let totalExpectedTasks = 0
    const dayAdherences: number[] = []

    for (let d = w.startDay; d <= maxDay; d++) {
      const dateStr = `${yearMonthPrefix}-${String(d).padStart(2, '0')}`
      const dayRes = calculateDayAdherence(dateStr, allHabits, allLogs, tStr)
      if (!dayRes.isFuture && dayRes.hasHabits && dayRes.adherencePercent !== null) {
        dayAdherences.push(dayRes.adherencePercent)
        totalCompleted += dayRes.completedCount
        totalExpectedTasks += dayRes.totalHabits
      }
    }

    const weekValue =
      dayAdherences.length > 0
        ? Math.round(dayAdherences.reduce((a, b) => a + b, 0) / dayAdherences.length)
        : null

    return {
      ...w,
      value: weekValue,
      displayValue: weekValue ?? 0,
      completed: totalCompleted,
      totalExpected: totalExpectedTasks,
      elapsedDays: elapsedDaysInSlice,
      isFuture: false,
      dateRange: `${format(viewedMonthDate, 'MMM')} ${w.startDay}–${w.endDay}`,
    }
  })

  // Monthly average rate: only average weeks with valid elapsed data
  const validWeeks = weeks.filter((w) => !w.isFuture && w.value !== null)
  const monthlyAvg =
    validWeeks.length > 0
      ? Math.round(validWeeks.reduce((acc, w) => acc + (w.value || 0), 0) / validWeeks.length)
      : 0

  return {
    weeks,
    monthlyAvg,
  }
}
