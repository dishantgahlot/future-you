import { describe, it, expect, beforeEach } from 'vitest'
import { format } from 'date-fns'
import {
  computeTodayHabitStats,
  createCadenceNotification,
} from './NotificationContext'
import {
  saveLocalHabits,
  saveLocalLog,
  saveAllLocalLogs,
} from '../utils/habitStorage'
import type { Habit } from '../types'

// Mock in-memory localStorage for test environment
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
}

if (typeof globalThis.localStorage === 'undefined' || !globalThis.localStorage.setItem) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  })
}

describe('NotificationContext - Current Day Scoped Stats', () => {
  const testUserId = 'test-notification-user'
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  beforeEach(() => {
    mockLocalStorage.clear()
  })

  it('strictly counts tasks for the current day only, excluding past historical habits', () => {
    // 9 past habits from previous days (Nov 18, 19, 20)
    const pastHabits: Habit[] = [
      { id: 'h-18-1', name: 'past habit 1', created_at: '2026-11-18T10:00:00.000Z', is_active: true, target_value: 1 } as Habit,
      { id: 'h-18-2', name: 'past habit 2', created_at: '2026-11-18T10:00:00.000Z', is_active: true, target_value: 1 } as Habit,
      { id: 'h-19-1', name: 'water', created_at: '2026-11-19T10:00:00.000Z', is_active: true, target_value: 8 } as Habit,
      { id: 'h-19-2', name: 'mediatation', created_at: '2026-11-19T10:00:00.000Z', is_active: true, target_value: 15 } as Habit,
      { id: 'h-20-1', name: 'water', created_at: '2026-11-20T10:00:00.000Z', is_active: true, target_value: 8 } as Habit,
      { id: 'h-20-2', name: 'study', created_at: '2026-11-20T10:00:00.000Z', is_active: true, target_value: 4 } as Habit,
      { id: 'h-20-3', name: 'sleep', created_at: '2026-11-20T10:00:00.000Z', is_active: true, target_value: 8 } as Habit,
      { id: 'h-20-4', name: 'Hhh', created_at: '2026-11-20T10:00:00.000Z', is_active: true, target_value: 1 } as Habit,
      { id: 'h-20-5', name: 'vff', created_at: '2026-11-20T10:00:00.000Z', is_active: true, target_value: 1 } as Habit,
    ]

    // 3 habits specifically created for TODAY
    const todayHabits: Habit[] = [
      { id: 'today-1', name: 'study', created_at: `${todayStr}T08:00:00.000Z`, is_active: true, target_value: 4, unit: 'h' } as Habit,
      { id: 'today-2', name: 'mediatation', created_at: `${todayStr}T08:00:00.000Z`, is_active: true, target_value: 15, unit: 'mins' } as Habit,
      { id: 'today-3', name: 'water', created_at: `${todayStr}T08:00:00.000Z`, is_active: true, target_value: 8, unit: 'glasses' } as Habit,
    ]

    // Total 12 habits in database across history
    saveLocalHabits([...pastHabits, ...todayHabits], testUserId)

    // Complete 2 out of the 3 habits for today:
    // study: 4/4 completed
    saveLocalLog('today-1', todayStr, 4, 4, true, testUserId)
    // water: 8/8 completed
    saveLocalLog('today-3', todayStr, 8, 8, true, testUserId)
    // mediatation: 0/15 pending
    saveLocalLog('today-2', todayStr, 0, 15, false, testUserId)

    const stats = computeTodayHabitStats(testUserId)

    // Must NOT be 12! Must strictly be 3 tasks for today
    expect(stats.totalCount).toBe(3)
    expect(stats.completedCount).toBe(2)
    expect(stats.pendingCount).toBe(1)
    expect(stats.percent).toBe(67)
    expect(stats.growthRate).toBe(67)
    expect(stats.pendingHabits).toEqual(['mediatation'])
    expect(stats.completedHabits).toEqual(['study', 'water'])
  })

  it('generates cadence notifications with accurate today-only progress report and growth rate', () => {
    const todayHabits: Habit[] = [
      { id: 't-1', name: 'study', created_at: `${todayStr}T09:00:00.000Z`, is_active: true, target_value: 4 } as Habit,
      { id: 't-2', name: 'mediatation', created_at: `${todayStr}T09:00:00.000Z`, is_active: true, target_value: 15 } as Habit,
      { id: 't-3', name: 'water', created_at: `${todayStr}T09:00:00.000Z`, is_active: true, target_value: 8 } as Habit,
    ]
    saveLocalHabits(todayHabits, testUserId)

    // 2 of 3 completed
    saveLocalLog('t-1', todayStr, 4, 4, true, testUserId)
    saveLocalLog('t-3', todayStr, 8, 8, true, testUserId)

    const stats = computeTodayHabitStats(testUserId)
    const notif = createCadenceNotification('1h', stats)

    expect(notif.title).toContain('2 of 3 Completed (67% Growth Rate)')
    expect(notif.message).toContain('Today\'s progress: 2 of 3 habits completed (67% growth rate)')
    expect(notif.message).toContain('1 habit remaining today: mediatation')
    expect(notif.stats.completedCount).toBe(2)
    expect(notif.stats.totalCount).toBe(3)
  })

  it('returns 0 habits and 0% growth rate on a fresh day before adding habits', () => {
    // Only past habits exist, no habits for today
    const pastHabits: Habit[] = [
      { id: 'old-1', name: 'past habit', created_at: '2026-11-20T10:00:00.000Z', is_active: true, target_value: 1 } as Habit,
    ]
    saveLocalHabits(pastHabits, testUserId)

    const stats = computeTodayHabitStats(testUserId)

    expect(stats.totalCount).toBe(0)
    expect(stats.completedCount).toBe(0)
    expect(stats.pendingCount).toBe(0)
    expect(stats.percent).toBe(0)
    expect(stats.growthRate).toBe(0)
  })
})
