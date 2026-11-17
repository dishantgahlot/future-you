/**
 * Unit Tests for Profile Builder
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  aggregateDailyMetrics,
  buildCategoryBreakdown,
  countCategoriesAndSocial,
  buildUserBehavioralProfile,
  getDefaultDateRange,
  filterHabitsByDateRange,
  getHabitsWithSufficientData,
} from './profileBuilder.js'

import type { HabitWithLogs, HabitLog, UserProfile } from './types.js'

// ============================================================================
// Test Data Helpers
// ============================================================================

const createMockHabit = (overrides: Partial<HabitWithLogs> = {}): HabitWithLogs => ({
  id: 'habit-1',
  name: 'Morning Exercise',
  category: 'exercise',
  frequency: 'daily',
  targetValue: 30,
  unit: 'minutes',
  color: '#3B82F6',
  icon: 'dumbbell',
  logs: [],
  ...overrides,
})

const createMockLog = (overrides: Partial<HabitLog> = {}): HabitLog => ({
  id: 'log-1',
  habitId: 'habit-1',
  logDate: '2024-01-15',
  actualValue: 30,
  createdAt: '2024-01-15T08:00:00Z',
  ...overrides,
})

const createMockProfile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  id: 'user-1',
  sleepGoal: 8,
  studyGoal: 2,
  screenTimeGoal: 3,
  exerciseGoal: 30,
  monthlyBudget: 1000,
  completionGoal: 80,
  ...overrides,
})

// ============================================================================
// aggregateDailyMetrics Tests
// ============================================================================

describe('aggregateDailyMetrics', () => {
  it('should aggregate metrics from habit logs across date range', () => {
    const habits: HabitWithLogs[] = [
      {
        ...createMockHabit({ id: 'h1', category: 'sleep', targetValue: 8 }),
        logs: [
          createMockLog({ habitId: 'h1', logDate: '2024-01-15', actualValue: 7.5 }),
          createMockLog({ habitId: 'h1', logDate: '2024-01-16', actualValue: 8 }),
        ],
      },
      {
        ...createMockHabit({ id: 'h2', category: 'exercise', targetValue: 30 }),
        logs: [
          createMockLog({ habitId: 'h2', logDate: '2024-01-15', actualValue: 30 }),
          createMockLog({ habitId: 'h2', logDate: '2024-01-16', actualValue: 45 }),
        ],
      },
      {
        ...createMockHabit({ id: 'h3', category: 'study', targetValue: 2 }),
        logs: [
          createMockLog({ habitId: 'h3', logDate: '2024-01-15', actualValue: 1.5 }),
        ],
      },
    ]

    const dateRange = { start: '2024-01-15', end: '2024-01-16' }
    const metrics = aggregateDailyMetrics(habits, dateRange)

    expect(metrics.length).toBe(2)

    // Check 2024-01-15
    const day15 = metrics.find(m => m.date === '2024-01-15')!
    expect(day15.sleepHours).toBe(7.5)
    expect(day15.exerciseMinutes).toBe(30)
    expect(day15.studyHours).toBe(1.5)

    // Check 2024-01-16
    const day16 = metrics.find(m => m.date === '2024-01-16')!
    expect(day16.sleepHours).toBe(8)
    expect(day16.exerciseMinutes).toBe(45)
    expect(day16.studyHours).toBe(0) // No log for study
  })

  it('should initialize all dates in range with zeros', () => {
    const habits: HabitWithLogs[] = [
      {
        ...createMockHabit({ id: 'h1', category: 'sleep' }),
        logs: [createMockLog({ habitId: 'h1', logDate: '2024-01-15', actualValue: 8 })],
      },
    ]

    const dateRange = { start: '2024-01-14', end: '2024-01-16' }
    const metrics = aggregateDailyMetrics(habits, dateRange)

    expect(metrics.length).toBe(3)
    expect(metrics[0].date).toBe('2024-01-14')
    expect(metrics[1].date).toBe('2024-01-15')
    expect(metrics[2].date).toBe('2024-01-16')

    // Days without logs should have zeros
    expect(metrics[0].sleepHours).toBe(0)
    expect(metrics[2].sleepHours).toBe(0)
  })

  it('should calculate habit completion rate', () => {
    const habits: HabitWithLogs[] = [
      {
        ...createMockHabit({ id: 'h1', category: 'exercise', targetValue: 30 }),
        logs: [
          createMockLog({ habitId: 'h1', logDate: '2024-01-15', actualValue: 30 }), // 100%
          createMockLog({ habitId: 'h1', logDate: '2024-01-16', actualValue: 15 }), // 50%
        ],
      },
      {
        ...createMockHabit({ id: 'h2', category: 'study', targetValue: 2 }),
        logs: [
          createMockLog({ habitId: 'h2', logDate: '2024-01-15', actualValue: 2 }), // 100%
        ],
      },
    ]

    const dateRange = { start: '2024-01-15', end: '2024-01-16' }
    const metrics = aggregateDailyMetrics(habits, dateRange)

    // 2024-01-15: 2/2 habits completed = 100%
    const day15 = metrics.find(m => m.date === '2024-01-15')!
    expect(day15.habitCompletionRate).toBe(100)

    // 2024-01-16: 0/1 habits completed = 0% (only exercise has log, and it's 50%)
    const day16 = metrics.find(m => m.date === '2024-01-16')!
    expect(day16.habitCompletionRate).toBe(0)
  })

  it('should calculate consistency score based on categories with data', () => {
    const habits: HabitWithLogs[] = [
      {
        ...createMockHabit({ id: 'h1', category: 'sleep' }),
        logs: [createMockLog({ habitId: 'h1', logDate: '2024-01-15', actualValue: 8 })],
      },
      {
        ...createMockHabit({ id: 'h2', category: 'exercise' }),
        logs: [createMockLog({ habitId: 'h2', logDate: '2024-01-15', actualValue: 30 })],
      },
    ]

    const dateRange = { start: '2024-01-15', end: '2024-01-15' }
    const metrics = aggregateDailyMetrics(habits, dateRange)

    const day15 = metrics[0]
    // 2 out of 5 raw metric categories have data = 40%
    // (habitCompletionRate is derived, not a raw input category)
    expect(day15.consistencyScore).toBeCloseTo(40, 0)
  })
})

// ============================================================================
// buildCategoryBreakdown Tests
// ============================================================================

describe('buildCategoryBreakdown', () => {
  it('should aggregate metrics by category', () => {
    const habits: HabitWithLogs[] = [
      {
        ...createMockHabit({ id: 'h1', category: 'exercise', targetValue: 30 }),
        logs: [
          createMockLog({ habitId: 'h1', actualValue: 30 }),
          createMockLog({ habitId: 'h1', actualValue: 25 }),
          createMockLog({ habitId: 'h1', actualValue: 35 }),
        ],
      },
      {
        ...createMockHabit({ id: 'h2', category: 'exercise', targetValue: 20 }),
        logs: [
          createMockLog({ habitId: 'h2', actualValue: 20 }),
        ],
      },
      {
        ...createMockHabit({ id: 'h3', category: 'sleep', targetValue: 8 }),
        logs: [
          createMockLog({ habitId: 'h3', actualValue: 7.5 }),
          createMockLog({ habitId: 'h3', actualValue: 8 }),
        ],
      },
    ]

    const breakdown = buildCategoryBreakdown(habits)

    expect(breakdown.exercise).toBeDefined()
    expect(breakdown.exercise.habitCount).toBe(2)
    expect(breakdown.exercise.completionRate).toBeGreaterThan(0)
    expect(breakdown.sleep.habitCount).toBe(1)
  })

  it('should average completion rates across habits in same category', () => {
    const habits: HabitWithLogs[] = [
      {
        ...createMockHabit({ id: 'h1', category: 'exercise', targetValue: 30 }),
        logs: [
          createMockLog({ actualValue: 30 }), // 100%
          createMockLog({ actualValue: 30 }), // 100%
        ],
      },
      {
        ...createMockHabit({ id: 'h2', category: 'exercise', targetValue: 30 }),
        logs: [
          createMockLog({ actualValue: 15 }), // 50%
          createMockLog({ actualValue: 15 }), // 50%
        ],
      },
    ]

    const breakdown = buildCategoryBreakdown(habits)

    // Average of 100% and 50% = 75%
    expect(breakdown.exercise.completionRate).toBe(75)
  })
})

// ============================================================================
// countCategoriesAndSocial Tests
// ============================================================================

describe('countCategoriesAndSocial', () => {
  it('should count unique categories', () => {
    const habits: HabitWithLogs[] = [
      createMockHabit({ id: 'h1', category: 'exercise' }),
      createMockHabit({ id: 'h2', category: 'exercise' }), // duplicate
      createMockHabit({ id: 'h3', category: 'sleep' }),
      createMockHabit({ id: 'h4', category: 'study' }),
    ]

    const result = countCategoriesAndSocial(habits)

    expect(result.categoryCount).toBe(3)
  })

  it('should count social habits', () => {
    const habits: HabitWithLogs[] = [
      createMockHabit({ id: 'h1', category: 'exercise' }),
      createMockHabit({ id: 'h2', category: 'social' }),
      createMockHabit({ id: 'h3', category: 'relationship' }),
      createMockHabit({ id: 'h4', category: 'family_time' }),
      createMockHabit({ id: 'h5', category: 'friends' }),
    ]

    const result = countCategoriesAndSocial(habits)

    expect(result.socialHabitsCount).toBe(4)
  })
})

// ============================================================================
// buildUserBehavioralProfile Tests
// ============================================================================

describe('buildUserBehavioralProfile', () => {
  it('should build complete profile from habits', () => {
    const habits: HabitWithLogs[] = [
      {
        ...createMockHabit({ id: 'h1', category: 'sleep', targetValue: 8 }),
        logs: [
          createMockLog({ habitId: 'h1', logDate: '2024-01-15', actualValue: 7.5 }),
          createMockLog({ habitId: 'h1', logDate: '2024-01-16', actualValue: 8 }),
        ],
      },
      {
        ...createMockHabit({ id: 'h2', category: 'exercise', targetValue: 30 }),
        logs: [
          createMockLog({ habitId: 'h2', logDate: '2024-01-15', actualValue: 30 }),
          createMockLog({ habitId: 'h2', logDate: '2024-01-16', actualValue: 30 }),
        ],
      },
      {
        ...createMockHabit({ id: 'h3', category: 'study', targetValue: 2 }),
        logs: [
          createMockLog({ habitId: 'h3', logDate: '2024-01-15', actualValue: 1.5 }),
          createMockLog({ habitId: 'h3', logDate: '2024-01-16', actualValue: 2 }),
        ],
      },
    ]

    const userProfile = createMockProfile()
    const dateRange = { start: '2024-01-15', end: '2024-01-16' }

    const result = buildUserBehavioralProfile({
      userId: 'user-1',
      habits,
      userProfile,
      dateRange,
    })

    expect(result.profile.userId).toBe('user-1')
    expect(result.profile.daysOfData).toBe(2)
    expect(result.profile.averages.sleepHours).toBeGreaterThan(0)
    expect(result.profile.averages.exerciseMinutes).toBeGreaterThan(0)
    expect(result.profile.averages.studyHours).toBeGreaterThan(0)
    expect(result.profile.categoryBreakdown).toBeDefined()
    expect(result.goals.targetSleepHours).toBe(8)
    expect(result.goals.targetExerciseMinutes).toBe(30)
  })

  it('should assess data quality correctly', () => {
    // Only 2 days of data
    const habits: HabitWithLogs[] = [
      {
        ...createMockHabit({ id: 'h1', category: 'sleep' }),
        logs: [createMockLog({ habitId: 'h1', logDate: '2024-01-15', actualValue: 8 })],
      },
    ]

    const result = buildUserBehavioralProfile({
      userId: 'user-1',
      habits,
      dateRange: { start: '2024-01-15', end: '2024-01-16' },
      minimumDaysForPersonalized: 14,
    })

    expect(result.dataQuality.hasSufficientData).toBe(false)
    expect(result.dataQuality.isIllustrative).toBe(true)
    expect(result.dataQuality.daysOfHistory).toBe(2)
  })

  it('should use default date range when not provided', () => {
    const habits: HabitWithLogs[] = [
      {
        ...createMockHabit({ id: 'h1', category: 'sleep' }),
        logs: [createMockLog({ habitId: 'h1', logDate: '2024-01-15', actualValue: 8 })],
      },
    ]

    const result = buildUserBehavioralProfile({
      userId: 'user-1',
      habits,
      dateRange: getDefaultDateRange(),
    })

    // Should have a valid date range
    expect(result.profile.period.start).toBeDefined()
    expect(result.profile.period.end).toBeDefined()
  })
})

// ============================================================================
// filterHabitsByDateRange Tests
// ============================================================================

describe('filterHabitsByDateRange', () => {
  it('should filter logs to date range', () => {
    const habits: HabitWithLogs[] = [
      {
        ...createMockHabit({ id: 'h1' }),
        logs: [
          createMockLog({ logDate: '2024-01-10' }),
          createMockLog({ logDate: '2024-01-15' }),
          createMockLog({ logDate: '2024-01-20' }),
        ],
      },
    ]

    const filtered = filterHabitsByDateRange(habits, '2024-01-14', '2024-01-18')

    expect(filtered[0].logs.length).toBe(1)
    expect(filtered[0].logs[0].logDate).toBe('2024-01-15')
  })

  it('should remove habits with no logs in range', () => {
    const habits: HabitWithLogs[] = [
      {
        ...createMockHabit({ id: 'h1' }),
        logs: [createMockLog({ logDate: '2024-01-10' })],
      },
      {
        ...createMockHabit({ id: 'h2' }),
        logs: [createMockLog({ logDate: '2024-01-15' })],
      },
    ]

    const filtered = filterHabitsByDateRange(habits, '2024-01-14', '2024-01-18')

    expect(filtered.length).toBe(1)
    expect(filtered[0].id).toBe('h2')
  })
})

// ============================================================================
// getHabitsWithSufficientData Tests
// ============================================================================

describe('getHabitsWithSufficientData', () => {
  it('should filter habits with minimum logs', () => {
    const habits: HabitWithLogs[] = [
      {
        ...createMockHabit({ id: 'h1' }),
        logs: [createMockLog(), createMockLog(), createMockLog()], // 3 logs
      },
      {
        ...createMockHabit({ id: 'h2' }),
        logs: [createMockLog(), createMockLog(), createMockLog(), createMockLog(), createMockLog(), createMockLog(), createMockLog()], // 7 logs
      },
      {
        ...createMockHabit({ id: 'h3' }),
        logs: Array(10).fill(null).map(() => createMockLog()), // 10 logs
      },
    ]

    const filtered = getHabitsWithSufficientData(habits, 7)

    expect(filtered.length).toBe(2)
    expect(filtered.map(h => h.id)).toEqual(['h2', 'h3'])
  })
})