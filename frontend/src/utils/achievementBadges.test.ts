import { describe, it, expect } from 'vitest'
import { calculateUserBadges } from './achievementBadges'
import type { Habit, HabitLog } from '../types'

describe('Achievement Badges Dynamic Calculation Suite', () => {
  const mockHabits: Habit[] = [
    {
      id: 'h1',
      user_id: 'u1',
      name: 'Sleep 8 Hours',
      category: 'sleep',
      frequency: 'daily',
      target_value: 8,
      unit: 'hours',
      is_active: true,
      created_at: '2026-11-01T00:00:00Z',
      updated_at: '2026-11-01T00:00:00Z',
    },
    {
      id: 'h2',
      user_id: 'u1',
      name: 'Hydration 3000ml',
      category: 'health',
      frequency: 'daily',
      target_value: 3000,
      unit: 'ml',
      is_active: true,
      created_at: '2026-11-01T00:00:00Z',
      updated_at: '2026-11-01T00:00:00Z',
    },
    {
      id: 'h3',
      user_id: 'u1',
      name: 'Gym Workout',
      category: 'fitness',
      frequency: 'daily',
      target_value: 45,
      unit: 'mins',
      is_active: true,
      created_at: '2026-11-01T00:00:00Z',
      updated_at: '2026-11-01T00:00:00Z',
    },
  ]

  it('returns locked starter badge when user has 0 logs', () => {
    const result = calculateUserBadges(mockHabits, [], 0)
    expect(result.unlockedCount).toBe(0)
    expect(result.totalCount).toBeGreaterThan(0)
    const earlyBadge = result.badges.find(b => b.id === 'badge-early-sprout')
    expect(earlyBadge?.isUnlocked).toBe(false)
  })

  it('unlocks early sprout badge upon first completed habit log', () => {
    const mockLogs: HabitLog[] = [
      {
        id: 'l1',
        habit_id: 'h1',
        user_id: 'u1',
        log_date: '2026-11-19',
        value: 8,
        completion_status: true,
        created_at: '2026-11-19T08:00:00Z',
      },
    ]

    const result = calculateUserBadges(mockHabits, mockLogs, 1)
    expect(result.unlockedCount).toBeGreaterThanOrEqual(1)
    const earlyBadge = result.badges.find(b => b.id === 'badge-early-sprout')
    expect(earlyBadge?.isUnlocked).toBe(true)
    expect(earlyBadge?.progress).toBe(1)
  })

  it('upgrades streak shark badge tier based on streak length', () => {
    // 3-day streak => silver
    const silverResult = calculateUserBadges(mockHabits, [], 3)
    const silverStreak = silverResult.badges.find(b => b.id === 'badge-streak-shark')
    expect(silverStreak?.tier).toBe('silver')

    // 7-day streak => gold
    const goldResult = calculateUserBadges(mockHabits, [], 7)
    const goldStreak = goldResult.badges.find(b => b.id === 'badge-streak-shark')
    expect(goldStreak?.tier).toBe('gold')
  })

  it('unlocks category-specific badges when category logs reach thresholds', () => {
    const sleepLogs: HabitLog[] = Array.from({ length: 5 }, (_, i) => ({
      id: `l-sleep-${i}`,
      habit_id: 'h1',
      user_id: 'u1',
      log_date: `2026-11-${10 + i}`,
      value: 8,
      completion_status: true,
      created_at: '2026-11-10T08:00:00Z',
    }))

    const result = calculateUserBadges(mockHabits, sleepLogs, 5)
    const slumberBadge = result.badges.find(b => b.category === 'sleep')
    expect(slumberBadge).toBeDefined()
    expect(slumberBadge?.progress).toBe(5)
  })

  it('P1 - FIX 5: derives badge unlock dates dynamically from actual habit logs instead of hardcoded dates', () => {
    // User with first active day on Nov 18 and streak across 18, 19, 20 Nov
    const userLogs: HabitLog[] = [
      { id: 'l1', habit_id: 'h1', user_id: 'u1', log_date: '2026-11-18', value: 8, completion_status: true },
      { id: 'l2', habit_id: 'h1', user_id: 'u1', log_date: '2026-11-19', value: 8, completion_status: true },
      { id: 'l3', habit_id: 'h1', user_id: 'u1', log_date: '2026-11-20', value: 8, completion_status: true },
    ]

    const result = calculateUserBadges(mockHabits, userLogs, 3)

    // Quickdraw Sprout derives from first log (Nov 18, 2026), NOT Nov 7
    const sproutBadge = result.badges.find(b => b.id === 'badge-early-sprout')
    expect(sproutBadge?.isUnlocked).toBe(true)
    expect(sproutBadge?.unlockedDate).toBe('Nov 18, 2026')

    // Streak Shark derives from 3rd day of streak (Nov 20, 2026), NOT Nov 12
    const streakBadge = result.badges.find(b => b.id === 'badge-streak-shark')
    expect(streakBadge?.isUnlocked).toBe(true)
    expect(streakBadge?.unlockedDate).toBe('Nov 20, 2026')

    // Badges requiring 5+ logs remain locked without fake unlock dates
    const brainBadge = result.badges.find(b => b.id === 'badge-galaxy-brain')
    expect(brainBadge?.isUnlocked).toBe(false)
    expect(brainBadge?.unlockedDate).toBeUndefined()
  })
})
