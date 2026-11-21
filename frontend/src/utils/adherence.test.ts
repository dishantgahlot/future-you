import { describe, it, expect, beforeEach } from 'vitest'
import {
  isFutureDate,
  calculateDayAdherence,
  calculateWeekAdherence,
  calculateMonthAdherence,
  calculateMonthlyAttendance,
} from './adherence'
import type { Habit, HabitLog } from '../types'
import { saveLocalHabits, saveLocalLog } from './habitStorage'

// Mock in-memory localStorage for vitest
const storageMap: Record<string, string> = {}
const mockLocalStorage = {
  getItem: (key: string) => storageMap[key] || null,
  setItem: (key: string, val: string) => {
    storageMap[key] = val
  },
  removeItem: (key: string) => {
    delete storageMap[key]
  },
  clear: () => {
    Object.keys(storageMap).forEach((k) => delete storageMap[k])
  },
  key: (i: number) => Object.keys(storageMap)[i] || null,
  get length() {
    return Object.keys(storageMap).length
  },
}

if (typeof globalThis.localStorage === 'undefined' || !globalThis.localStorage.setItem) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  })
}

if (typeof globalThis.window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: {
      dispatchEvent: () => true,
      addEventListener: () => {},
      removeEventListener: () => {},
    },
    writable: true,
  })
}

describe('P0 - FIX 2: Shared Adherence Calculation & Future Date Exclusion', () => {
  beforeEach(() => {
    mockLocalStorage.clear()
  })

  // Seed data matching the prompt:
  // User with habits on 18, 19, 20 Nov (3 habits each, ~56% adherence)
  const habits: Habit[] = [
    // Nov 18
    { id: 'h-18-1', user_id: 'u1', name: 'Habit 1', category: 'health', frequency: 'daily', target_value: 1, unit: 'times', color: '#738541', icon: 'leaf', is_active: true, target_date: '2026-11-18' },
    { id: 'h-18-2', user_id: 'u1', name: 'Habit 2', category: 'health', frequency: 'daily', target_value: 1, unit: 'times', color: '#738541', icon: 'leaf', is_active: true, target_date: '2026-11-18' },
    { id: 'h-18-3', user_id: 'u1', name: 'Habit 3', category: 'health', frequency: 'daily', target_value: 1, unit: 'times', color: '#738541', icon: 'leaf', is_active: true, target_date: '2026-11-18' },
    // Nov 19
    { id: 'h-19-1', user_id: 'u1', name: 'Habit 1', category: 'health', frequency: 'daily', target_value: 1, unit: 'times', color: '#738541', icon: 'leaf', is_active: true, target_date: '2026-11-19' },
    { id: 'h-19-2', user_id: 'u1', name: 'Habit 2', category: 'health', frequency: 'daily', target_value: 1, unit: 'times', color: '#738541', icon: 'leaf', is_active: true, target_date: '2026-11-19' },
    { id: 'h-19-3', user_id: 'u1', name: 'Habit 3', category: 'health', frequency: 'daily', target_value: 1, unit: 'times', color: '#738541', icon: 'leaf', is_active: true, target_date: '2026-11-19' },
    // Nov 20
    { id: 'h-20-1', user_id: 'u1', name: 'Habit 1', category: 'health', frequency: 'daily', target_value: 1, unit: 'times', color: '#738541', icon: 'leaf', is_active: true, target_date: '2026-11-20' },
    { id: 'h-20-2', user_id: 'u1', name: 'Habit 2', category: 'health', frequency: 'daily', target_value: 1, unit: 'times', color: '#738541', icon: 'leaf', is_active: true, target_date: '2026-11-20' },
    { id: 'h-20-3', user_id: 'u1', name: 'Habit 3', category: 'health', frequency: 'daily', target_value: 1, unit: 'times', color: '#738541', icon: 'leaf', is_active: true, target_date: '2026-11-20' },
  ]

  // Logs on 18, 19, 20 Nov yielding 56% (5 completions out of 9, or roughly 56%)
  // Nov 18: 2 completed out of 3 = 67%
  // Nov 19: 1 completed out of 3, 1 partial (0.68) = 56%
  // Nov 20: 1 completed out of 3, 1 partial (0.35) = 45% -> average across days = 56%
  const logs: HabitLog[] = [
    // Nov 18: 56%
    { id: 'l-18-1', habit_id: 'h-18-1', user_id: 'u1', log_date: '2026-11-18', actual_value: 1, target_value: 1, completion_status: true },
    { id: 'l-18-2', habit_id: 'h-18-2', user_id: 'u1', log_date: '2026-11-18', actual_value: 0.68, target_value: 1, completion_status: false },
    { id: 'l-18-3', habit_id: 'h-18-3', user_id: 'u1', log_date: '2026-11-18', actual_value: 0, target_value: 1, completion_status: false },
    // Nov 19: 56%
    { id: 'l-19-1', habit_id: 'h-19-1', user_id: 'u1', log_date: '2026-11-19', actual_value: 1, target_value: 1, completion_status: true },
    { id: 'l-19-2', habit_id: 'h-19-2', user_id: 'u1', log_date: '2026-11-19', actual_value: 0.68, target_value: 1, completion_status: false },
    { id: 'l-19-3', habit_id: 'h-19-3', user_id: 'u1', log_date: '2026-11-19', actual_value: 0, target_value: 1, completion_status: false },
    // Nov 20: 56%
    { id: 'l-20-1', habit_id: 'h-20-1', user_id: 'u1', log_date: '2026-11-20', actual_value: 1, target_value: 1, completion_status: true },
    { id: 'l-20-2', habit_id: 'h-20-2', user_id: 'u1', log_date: '2026-11-20', actual_value: 0.68, target_value: 1, completion_status: false },
    { id: 'l-20-3', habit_id: 'h-20-3', user_id: 'u1', log_date: '2026-11-20', actual_value: 0, target_value: 1, completion_status: false },
  ]

  const fixedToday = '2026-11-21' // Saturday Nov 21, 2026

  it('accurately identifies future dates relative to today', () => {
    expect(isFutureDate('2026-11-22', fixedToday)).toBe(true)
    expect(isFutureDate('2026-11-30', fixedToday)).toBe(true)
    expect(isFutureDate('2026-11-21', fixedToday)).toBe(false)
    expect(isFutureDate('2026-11-20', fixedToday)).toBe(false)
  })

  it('calculateDayAdherence excludes future dates and returns null adherence', () => {
    const res = calculateDayAdherence('2026-11-22', habits, logs, fixedToday)
    expect(res.isFuture).toBe(true)
    expect(res.adherencePercent).toBeNull()
  })

  it('calculateDayAdherence excludes dates before habits existed (returns null, not 0% failure)', () => {
    const res = calculateDayAdherence('2026-11-16', habits, logs, fixedToday)
    expect(res.isFuture).toBe(false)
    expect(res.hasHabits).toBe(false)
    expect(res.adherencePercent).toBeNull()
  })

  it('calculateDayAdherence calculates accurate percentage for active days', () => {
    const res = calculateDayAdherence('2026-11-19', habits, logs, fixedToday)
    expect(res.isFuture).toBe(false)
    expect(res.hasHabits).toBe(true)
    expect(res.totalHabits).toBe(3)
    expect(res.adherencePercent).toBe(56)
  })

  it('weekly average only averages elapsed days with habits and equals 56%', () => {
    // Week starting Mon Nov 16, 2026 to Sun Nov 22, 2026
    const weekStart = new Date(2026, 10, 16) // Nov 16
    const weekRes = calculateWeekAdherence(weekStart, habits, logs, fixedToday)

    // Sun Nov 22 is marked future
    const sun = weekRes.points.find((p) => p.day === 'Sun')
    expect(sun?.isFuture).toBe(true)
    expect(sun?.value).toBeNull()

    // Mon 16 and Tue 17 have no habits (not active)
    const mon = weekRes.points.find((p) => p.day === 'Mon')
    expect(mon?.hasHabits).toBe(false)
    expect(mon?.value).toBeNull()

    // Active elapsed days are 18, 19, 20 Nov (each 56%)
    expect(weekRes.activeElapsedDays).toBe(3)
    expect(weekRes.weeklyAvg).toBe(56)
  })

  it('monthly Week 3 matches weekly average and Week 4 is excluded from failures', () => {
    const monthDate = new Date(2026, 10, 1) // Nov 2026
    const monthRes = calculateMonthAdherence(monthDate, habits, logs, fixedToday)

    // W4 (Nov 22-30) is completely in the future
    const w4 = monthRes.weeks.find((w) => w.label === 'W4')
    expect(w4?.isFuture).toBe(true)
    expect(w4?.value).toBeNull()

    // W3 (Nov 15-21) has active elapsed days 18, 19, 20 (56%)
    const w3 = monthRes.weeks.find((w) => w.label === 'W3')
    expect(w3?.isFuture).toBe(false)
    expect(w3?.value).toBe(56)

    // Monthly average matches W3 and does not count W4 as 0% failure
    expect(monthRes.monthlyAvg).toBe(56)
  })

  it('calculateMonthlyAttendance calculates attendance relative only to elapsed days', () => {
    const monthDate = new Date(2026, 10, 1) // Nov 2026
    const loggedDates = ['2026-11-18', '2026-11-19', '2026-11-20']

    // On Nov 21, 21 days have elapsed (not 30). 3 active days / 21 elapsed days = 14%
    const res = calculateMonthlyAttendance(monthDate, loggedDates, fixedToday)
    expect(res.elapsedDays).toBe(21)
    expect(res.loggedCount).toBe(3)
    expect(res.percent).toBe(14)
    expect(res.totalDaysInMonth).toBe(30)
  })
})
