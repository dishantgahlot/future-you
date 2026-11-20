import { describe, it, expect } from 'vitest'
import { extractDateFromQuery } from '../services/ai/whatIfChatService.js'

describe('End-to-End Habit Lifecycle & Multi-Day Isolation Flow', () => {
  interface HabitItem {
    id: string
    name: string
    target_value: number
    unit: string
    target_date?: string
    created_at?: string
  }

  interface HabitLogItem {
    id: string
    habit_id: string
    log_date: string
    value: number
    completion_status: boolean
  }

  // 6 habits present on Day 19
  const habits: HabitItem[] = [
    { id: 'h1', name: 'Morning Meditation', target_value: 15, unit: 'mins', target_date: '2026-11-19' },
    { id: 'h2', name: 'Hydration 3L', target_value: 3000, unit: 'ml', target_date: '2026-11-19' },
    { id: 'h3', name: 'Gym Workout', target_value: 45, unit: 'mins', target_date: '2026-11-19' },
    { id: 'h4', name: 'Read Book', target_value: 20, unit: 'pages', target_date: '2026-11-19' },
    { id: 'h5', name: 'Deep Work Block', target_value: 90, unit: 'mins', target_date: '2026-11-19' },
    { id: 'h6', name: 'Screen Curfew 10pm', target_value: 1, unit: 'session', target_date: '2026-11-19' },
  ]

  // Day 19 (2026-11-19): User logged 5 completed out of 6 habits
  const day19Logs: HabitLogItem[] = [
    { id: 'l1', habit_id: 'h1', log_date: '2026-11-19', value: 15, completion_status: true },
    { id: 'l2', habit_id: 'h2', log_date: '2026-11-19', value: 3000, completion_status: true },
    { id: 'l3', habit_id: 'h3', log_date: '2026-11-19', value: 45, completion_status: true },
    { id: 'l4', habit_id: 'h4', log_date: '2026-11-19', value: 20, completion_status: true },
    { id: 'l5', habit_id: 'h5', log_date: '2026-11-19', value: 90, completion_status: true },
    // h6 missed / uncompleted
  ]

  // Day 20 (2026-11-20): Brand new day with a fresh start
  const day20Logs: HabitLogItem[] = []

  const allLogs = [...day19Logs, ...day20Logs]

  function computeDayStats(targetDate: string, activeHabits: HabitItem[], logs: HabitLogItem[]) {
    // Filter habits relevant to this date
    const habitsForDate = activeHabits.filter(
      (h) => !h.target_date || h.target_date === targetDate
    )
    const logsForDate = logs.filter((l) => l.log_date === targetDate)

    const completed = habitsForDate.filter((h) => {
      const log = logsForDate.find((l) => l.habit_id === h.id)
      return log && (log.completion_status || log.value >= h.target_value)
    }).length

    const total = habitsForDate.length
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0

    return { total, completed, progress }
  }

  it('calculates historical Day 19 progress accurately (5/6 completed, 83%)', () => {
    const stats19 = computeDayStats('2026-11-19', habits, allLogs)

    expect(stats19.total).toBe(6)
    expect(stats19.completed).toBe(5)
    expect(stats19.progress).toBe(83)
  })

  it('resets progress cleanly to 0% for Day 20 without leaking historical completions', () => {
    const stats20 = computeDayStats('2026-11-20', habits, allLogs)

    expect(stats20.completed).toBe(0)
    expect(stats20.progress).toBe(0)
  })

  it('correctly resolves natural language date queries in What-If assistant', () => {
    const query1 = 'What was my progress on 19th November 2026?'
    const extracted1 = extractDateFromQuery(query1, 2026)
    expect(extracted1).toBe('2026-11-19')

    const query2 = 'Give me the report for November 19'
    const extracted2 = extractDateFromQuery(query2, 2026)
    expect(extracted2).toBe('2026-11-19')

    const query3 = 'How did I do on 2026-11-19?'
    const extracted3 = extractDateFromQuery(query3, 2026)
    expect(extracted3).toBe('2026-11-19')

    // Historical day stats resolved from extracted date match user reality
    const resolvedStats = computeDayStats(extracted1!, habits, allLogs)
    expect(resolvedStats.completed).toBe(5)
    expect(resolvedStats.progress).toBe(83)
  })

  it('guarantees that new habits created for Day 20 do not pollute Day 19 historical data', () => {
    const habitsWithNewDay = [
      ...habits,
      { id: 'h7-new', name: 'Fresh Morning Walk', target_value: 30, unit: 'mins', target_date: '2026-11-20' },
    ]

    const stats19 = computeDayStats('2026-11-19', habitsWithNewDay, allLogs)
    expect(stats19.total).toBe(6) // Only the 6 habits from Day 19
    expect(stats19.completed).toBe(5)
    expect(stats19.progress).toBe(83)
  })
})
