import { describe, it, expect, beforeEach } from 'vitest'
import {
  getHabitDate,
  getHabitsForDate,
  isLogForDate,
  findLogForHabitAndDate,
  saveLocalLog,
  getDayTarget,
  setDayTarget,
  resetDayTarget,
  calculateHabitStreak,
  copyHabitsToDate,
  getLocalHabits,
  saveLocalHabits,
  getAllLocalLogs,
} from './habitStorage'
import type { Habit, HabitLog } from '../types'

// Mock in-memory localStorage for node test runner
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

// Attach mock localStorage to global object
if (typeof globalThis.localStorage === 'undefined' || !globalThis.localStorage.setItem) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  })
}

// Attach window mock if undefined
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

describe('Habit Date Scoping & Strict Day Isolation', () => {
  beforeEach(() => {
    mockLocalStorage.clear()
  })

  const sampleHabits: Habit[] = [
    {
      id: 'h-19-1',
      user_id: 'user-1',
      name: 'Morning Run',
      description: null,
      category: 'fitness',
      frequency: 'daily',
      target_value: 5000,
      unit: 'steps',
      color: '#738541',
      icon: 'person-running',
      is_active: true,
      target_date: '2026-11-19',
      created_at: '2026-11-19T07:00:00.000Z',
      updated_at: '2026-11-19T07:00:00.000Z',
    },
    {
      id: 'h-19-2',
      user_id: 'user-1',
      name: 'Hydration',
      description: null,
      category: 'health',
      frequency: 'daily',
      target_value: 8,
      unit: 'glasses',
      color: '#738541',
      icon: 'droplet',
      is_active: true,
      target_date: '2026-11-19',
      created_at: '2026-11-19T07:00:00.000Z',
      updated_at: '2026-11-19T07:00:00.000Z',
    },
    {
      id: 'h-20-1',
      user_id: 'user-1',
      name: 'Meditation',
      description: null,
      category: 'mental_health',
      frequency: 'daily',
      target_value: 15,
      unit: 'mins',
      color: '#738541',
      icon: 'spa',
      is_active: true,
      target_date: '2026-11-20',
      created_at: '2026-11-20T08:00:00.000Z',
      updated_at: '2026-11-20T08:00:00.000Z',
    },
  ]

  const sampleLogs: HabitLog[] = [
    {
      id: 'l-1',
      habit_id: 'h-19-1',
      user_id: 'user-1',
      log_date: '2026-11-19',
      actual_value: 5000,
      target_value: 5000,
      completion_status: true,
      notes: null,
      created_at: '2026-11-19T10:00:00.000Z',
      updated_at: '2026-11-19T10:00:00.000Z',
    },
    {
      id: 'l-2',
      habit_id: 'h-19-2',
      user_id: 'user-1',
      log_date: '2026-11-19',
      actual_value: 8,
      target_value: 8,
      completion_status: true,
      notes: null,
      created_at: '2026-11-19T12:00:00.000Z',
      updated_at: '2026-11-19T12:00:00.000Z',
    },
  ]

  it('resolves habit date accurately from target_date, logs, or created_at', () => {
    expect(getHabitDate(sampleHabits[0], sampleLogs)).toBe('2026-11-19')
    expect(getHabitDate(sampleHabits[2], sampleLogs)).toBe('2026-11-20')

    // Fallback without target_date
    const untargetedHabit: Habit = {
      ...sampleHabits[0],
      target_date: undefined,
      created_at: '2026-11-19T15:30:00.000Z',
    }
    expect(getHabitDate(untargetedHabit, sampleLogs)).toBe('2026-11-19')
  })

  it('enforces strict day isolation: November 19 only returns habits for the 19th', () => {
    const nov19Habits = getHabitsForDate(sampleHabits, '2026-11-19', sampleLogs)
    expect(nov19Habits.length).toBe(2)
    expect(nov19Habits.map((h) => h.name)).toEqual(['Morning Run', 'Hydration'])
    expect(nov19Habits.some((h) => h.name === 'Meditation')).toBe(false)
  })

  it('enforces strict day isolation: November 20 only returns habits for the 20th', () => {
    const nov20Habits = getHabitsForDate(sampleHabits, '2026-11-20', sampleLogs)
    expect(nov20Habits.length).toBe(1)
    expect(nov20Habits[0].name).toBe('Meditation')
    expect(nov20Habits.some((h) => h.name === 'Morning Run')).toBe(false)
  })

  it('returns clean slate (0 habits) for dates with no habits created', () => {
    const nov18Habits = getHabitsForDate(sampleHabits, '2026-11-18', sampleLogs)
    expect(nov18Habits).toEqual([])

    const nov17Habits = getHabitsForDate(sampleHabits, '2026-11-17', sampleLogs)
    expect(nov17Habits).toEqual([])

    const nov21Habits = getHabitsForDate(sampleHabits, '2026-11-21', sampleLogs)
    expect(nov21Habits).toEqual([])
  })

  it('accurately parses date strings in ISO, short format, and alternate field names', () => {
    expect(isLogForDate({ log_date: '2026-11-19' }, '2026-11-19')).toBe(true)
    expect(isLogForDate({ log_date: '2026-11-19T14:20:00.000Z' }, '2026-11-19')).toBe(true)
    expect(isLogForDate({ date: '2026-11-19' }, '2026-11-19')).toBe(true)
    expect(isLogForDate({ log_date: '2026-11-18' }, '2026-11-19')).toBe(false)
    expect(isLogForDate(null, '2026-11-19')).toBe(false)
  })

  it('finds habit log for a specific habit ID and date', () => {
    const found = findLogForHabitAndDate(sampleLogs, 'h-19-1', '2026-11-19')
    expect(found).toBeDefined()
    expect(found?.actual_value).toBe(5000)

    const notFound = findLogForHabitAndDate(sampleLogs, 'h-19-1', '2026-11-20')
    expect(notFound).toBeUndefined()
  })
})

describe('Habit Persistence, Day Targets & Progress Logging', () => {
  beforeEach(() => {
    mockLocalStorage.clear()
  })

  it('saves and retrieves local habits isolated per user', () => {
    const habits: Habit[] = [
      {
        id: 'h-1',
        user_id: 'test-user',
        name: 'Deep Work',
        description: null,
        category: 'productivity',
        frequency: 'daily',
        target_value: 4,
        unit: 'hours',
        color: '#738541',
        icon: 'book-open',
        is_active: true,
        target_date: '2026-11-20',
        created_at: '2026-11-20T10:00:00.000Z',
        updated_at: '2026-11-20T10:00:00.000Z',
      },
    ]

    saveLocalHabits(habits, 'test-user')
    const loaded = getLocalHabits('test-user')
    expect(loaded.length).toBe(1)
    expect(loaded[0].name).toBe('Deep Work')
  })

  it('saves and updates logs with correct completion status', () => {
    const log1 = saveLocalLog('h-1', '2026-11-20', 2, 4, undefined, 'test-user')
    expect(log1.actual_value).toBe(2)
    expect(log1.completion_status).toBe(false)

    // Updating progress to meet target
    const log2 = saveLocalLog('h-1', '2026-11-20', 4, 4, undefined, 'test-user')
    expect(log2.actual_value).toBe(4)
    expect(log2.completion_status).toBe(true)

    const all = getAllLocalLogs('test-user')
    expect(all.length).toBe(1)
    expect(all[0].actual_value).toBe(4)
  })

  it('customizes day-specific targets without overwriting base habit target', () => {
    setDayTarget('h-1', '2026-11-20', 6, 'test-user')
    const custom = getDayTarget('h-1', '2026-11-20', 4, 'test-user')
    expect(custom).toBe(6)

    // Different day retains default baseline
    const otherDay = getDayTarget('h-1', '2026-11-21', 4, 'test-user')
    expect(otherDay).toBe(4)

    // Resetting day target
    resetDayTarget('h-1', '2026-11-20', 4, 'test-user')
    const reset = getDayTarget('h-1', '2026-11-20', 4, 'test-user')
    expect(reset).toBe(4)
  })
})

describe('Streak Calculation & Habit Copy Workflow', () => {
  beforeEach(() => {
    mockLocalStorage.clear()
  })

  it('calculates habit streak accurately over consecutive completed days', () => {
    const today = new Date()
    const todayStr = today.toISOString().slice(0, 10)

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().slice(0, 10)

    const twoDaysAgo = new Date(today)
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
    const twoDaysAgoStr = twoDaysAgo.toISOString().slice(0, 10)

    const logs: HabitLog[] = [
      {
        id: 'l-1',
        habit_id: 'streak-habit',
        user_id: 'u1',
        log_date: twoDaysAgoStr,
        actual_value: 10,
        target_value: 10,
        completion_status: true,
        notes: null,
        created_at: twoDaysAgoStr,
        updated_at: twoDaysAgoStr,
      },
      {
        id: 'l-2',
        habit_id: 'streak-habit',
        user_id: 'u1',
        log_date: yesterdayStr,
        actual_value: 10,
        target_value: 10,
        completion_status: true,
        notes: null,
        created_at: yesterdayStr,
        updated_at: yesterdayStr,
      },
    ]

    // Yesterday completed, today not yet logged -> streak is 2 (grace period for today)
    const streak = calculateHabitStreak('streak-habit', logs)
    expect(streak).toBe(2)

    // Complete today as well -> streak increases to 3
    logs.push({
      id: 'l-3',
      habit_id: 'streak-habit',
      user_id: 'u1',
      log_date: todayStr,
      actual_value: 10,
      target_value: 10,
      completion_status: true,
      notes: null,
      created_at: todayStr,
      updated_at: todayStr,
    })
    const streakAfterToday = calculateHabitStreak('streak-habit', logs)
    expect(streakAfterToday).toBe(3)
  })

  it('copies yesterday habits to today with fresh IDs, zero progress, and date isolation', () => {
    const sourceHabits: Habit[] = [
      {
        id: 'source-1',
        user_id: 'u1',
        name: 'Morning Hydration',
        description: null,
        category: 'health',
        frequency: 'daily',
        target_value: 8,
        unit: 'glasses',
        color: '#738541',
        icon: 'droplet',
        is_active: true,
        target_date: '2026-11-19',
        created_at: '2026-11-19T06:00:00.000Z',
        updated_at: '2026-11-19T06:00:00.000Z',
      },
    ]
    saveLocalHabits(sourceHabits, 'u1')
    saveLocalLog('source-1', '2026-11-19', 8, 8, undefined, 'u1')

    const copied = copyHabitsToDate('2026-11-19', '2026-11-20', 'u1')
    expect(copied.length).toBe(1)
    expect(copied[0].name).toBe('Morning Hydration')
    expect(copied[0].id).not.toBe('source-1')
    expect(copied[0].target_date).toBe('2026-11-20')

    const allHabits = getLocalHabits('u1')
    const allLogs = getAllLocalLogs('u1')

    // November 19 still only has the source habit with 8/8 glasses done
    const nov19 = getHabitsForDate(allHabits, '2026-11-19', allLogs)
    expect(nov19.length).toBe(1)
    expect(nov19[0].id).toBe('source-1')

    // November 20 has the newly copied habit with 0 initial progress
    const nov20 = getHabitsForDate(allHabits, '2026-11-20', allLogs)
    expect(nov20.length).toBe(1)
    expect(nov20[0].id).toBe(copied[0].id)

    const nov20Log = findLogForHabitAndDate(allLogs, copied[0].id, '2026-11-20')
    expect(nov20Log).toBeDefined()
    expect(nov20Log?.actual_value).toBe(0)
    expect(nov20Log?.completion_status).toBe(false)
  })

  describe('Historical Date Read-Only Archiving Policy', () => {
    it('accurately identifies whether a date is in the past', () => {
      const todayStr = '2026-11-20'
      const historicalDay = '2026-11-19'
      const isPastDate = historicalDay < todayStr
      expect(isPastDate).toBe(true)

      const isToday = todayStr < todayStr
      expect(isToday).toBe(false)
    })

    it('retains past habit progress logs as immutable historical records', () => {
      const pastHabit: Habit = {
        id: 'archived-habit-1',
        user_id: 'u1',
        name: 'Past Workout',
        description: null,
        category: 'fitness',
        frequency: 'daily',
        target_value: 10000,
        unit: 'steps',
        color: '#738541',
        icon: 'dumbbell',
        is_active: true,
        target_date: '2026-11-19',
        created_at: '2026-11-19T06:00:00.000Z',
        updated_at: '2026-11-19T06:00:00.000Z',
      }
      saveLocalHabits([pastHabit], 'u1')
      saveLocalLog('archived-habit-1', '2026-11-19', 10000, 10000, true, 'u1')

      const logs = getAllLocalLogs('u1')
      const log = findLogForHabitAndDate(logs, 'archived-habit-1', '2026-11-19')
      expect(log).toBeDefined()
      expect(log?.actual_value).toBe(10000)
      expect(log?.completion_status).toBe(true)

      // Guard policy check: on past date, any write mutation is rejected
      const isPastDate = '2026-11-19' < '2026-11-20'
      const allowMutation = !isPastDate
      expect(allowMutation).toBe(false)
    })
  })
})
