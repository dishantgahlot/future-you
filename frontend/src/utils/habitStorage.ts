import type { Habit, HabitLog } from '../types'

const HABITS_STORAGE_KEY = 'future-you-habits-botanical-v2'
const LOGS_STORAGE_KEY = 'future-you-habit-logs-botanical-v2'

export const BOTANICAL_PALETTE = {
  leaf1: '#738541', // Deep foliage
  leaf2: '#869956', // Vibrant leaf
  leaf3: '#939C67', // Olive sage
  leaf4: '#8DA55D', // Greenery
  leaf5: '#9CA46F', // Foliage
  leaf6: '#A6AC76', // Soft sage
  leaf7: '#BBC094', // Light sage
  pillBg: '#DFE7CF',
  pillText: '#43522C',
  darkText: '#232819',
  mutedText: '#767C6B',
  creamBg: '#F6F3EB',
  cardBg: '#FFFFFF',
  border: '#E8E3D7',
}

export const DEFAULT_HABITS: Habit[] = [
  {
    id: 'habit-sleep-1',
    user_id: 'dishant-user',
    name: 'Sleep',
    description: '7 - 8 hours of restorative sleep',
    category: 'sleep',
    frequency: 'daily',
    target_value: 8,
    unit: 'h',
    color: '#7E6BA5',
    color_theme: 'cream',
    icon: 'moon',
    is_active: true,
    created_at: new Date(Date.now() - 28 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'habit-study',
    user_id: 'dishant-user',
    name: 'Study',
    description: 'Deep focus reading and learning',
    category: 'learning',
    frequency: 'daily',
    target_value: 2,
    unit: 'h',
    color: '#C87850',
    color_theme: 'kraft',
    icon: 'book',
    is_active: true,
    created_at: new Date(Date.now() - 28 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'habit-exercise-1',
    user_id: 'dishant-user',
    name: 'Exercise',
    description: 'Daily workout or physical exercise',
    category: 'fitness',
    frequency: 'daily',
    target_value: 30,
    unit: 'm',
    color: '#6B8E4E',
    color_theme: 'sage',
    icon: 'dumbbell',
    is_active: true,
    created_at: new Date(Date.now() - 28 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'habit-screentime',
    user_id: 'dishant-user',
    name: 'Screen Time',
    description: 'Under 3 hours total recreational screen time',
    category: 'productivity',
    frequency: 'daily',
    target_value: 3,
    unit: 'h',
    color: '#C88E3E',
    color_theme: 'chamomile',
    icon: 'mobile',
    is_active: true,
    created_at: new Date(Date.now() - 28 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'habit-hydration',
    user_id: 'dishant-user',
    name: 'Morning Hydration',
    description: 'Drink 2000 ml clean water throughout the day',
    category: 'health',
    frequency: 'daily',
    target_value: 2000,
    unit: 'ml',
    color: '#4A90E2',
    color_theme: 'sage',
    icon: 'droplet',
    is_active: true,
    created_at: new Date(Date.now() - 28 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'habit-sleep-2',
    user_id: 'dishant-user',
    name: 'Sleep',
    description: 'Evening restorative rest cycle',
    category: 'sleep',
    frequency: 'daily',
    target_value: 8,
    unit: 'h',
    color: '#7E6BA5',
    color_theme: 'lavender',
    icon: 'moon',
    is_active: true,
    created_at: new Date(Date.now() - 28 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'habit-exercise-2',
    user_id: 'dishant-user',
    name: 'Exercise',
    description: 'Daily movement and recovery session',
    category: 'fitness',
    frequency: 'daily',
    target_value: 30,
    unit: 'm',
    color: '#6B8E4E',
    color_theme: 'peach',
    icon: 'dumbbell',
    is_active: true,
    created_at: new Date(Date.now() - 28 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export function getLocalHabits(): Habit[] {
  try {
    const raw = localStorage.getItem(HABITS_STORAGE_KEY)
    if (raw === null) {
      localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(DEFAULT_HABITS))
      return DEFAULT_HABITS
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
  } catch {
    return []
  }
}

export function saveLocalHabits(habits: Habit[]): void {
  try {
    localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(habits))
    window.dispatchEvent(new CustomEvent('future-you-storage-updated'))
  } catch (e) {
    console.error('Error saving habits to localStorage:', e)
  }
}

export function deleteLocalHabit(habitId: string): void {
  try {
    const habits = getLocalHabits().filter((h) => h.id !== habitId)
    saveLocalHabits(habits)

    const logs = getAllLocalLogs().filter((l) => l.habit_id !== habitId)
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs))
    window.dispatchEvent(new CustomEvent('future-you-storage-updated'))
  } catch (e) {
    console.error('Error deleting local habit:', e)
  }
}

export function saveAllLocalLogs(logs: HabitLog[]): void {
  try {
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs))
  } catch (e) {
    console.error('Error saving all habit logs:', e)
  }
}

export function getAllLocalLogs(): HabitLog[] {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const raw = localStorage.getItem(LOGS_STORAGE_KEY)

    if (!raw) {
      // Generate past historical logs (days 1 to 28 ago) so charts & insights have history
      // TODAY (day 0) is strictly 0 / empty initially as requested
      const historicalLogs: HabitLog[] = []
      
      DEFAULT_HABITS.forEach((h) => {
        // Populate past 28 days with realistic baseline data
        for (let i = 1; i <= 28; i++) {
          const pastDate = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
          // 70% completion rate for history
          const isDone = ((i + h.name.length) % 3) !== 0
          const target = h.target_value || 1
          const actual = isDone ? target : Math.round(target * 0.4 * 10) / 10

          historicalLogs.push({
            id: `hist-${h.id}-${i}`,
            habit_id: h.id,
            user_id: 'dishant-user',
            log_date: pastDate,
            actual_value: actual,
            completion_status: isDone,
            notes: null,
            created_at: new Date(Date.now() - i * 86400000).toISOString(),
            updated_at: new Date(Date.now() - i * 86400000).toISOString(),
          })
        }
      })

      localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(historicalLogs))
      return historicalLogs
    }

    const parsed: HabitLog[] = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    // Ensure any legacy mock logs for today (which had id starting with 'log-') are purged
    // so today starts strictly at 0 unless the user specifically performed a live submission
    const cleaned = parsed.filter(
      (l) => !(l.id.startsWith('log-') && l.log_date === today)
    )

    if (cleaned.length !== parsed.length) {
      localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(cleaned))
    }

    return cleaned
  } catch {
    return []
  }
}

export function saveLocalLog(
  habitId: string,
  dateStr: string,
  actualValue: number,
  targetValue: number,
  notes?: string
): HabitLog {
  const all = getAllLocalLogs()
  const isCompleted = targetValue > 0 ? actualValue >= targetValue : actualValue > 0

  const existingIndex = all.findIndex(
    (l) => l.habit_id === habitId && l.log_date === dateStr
  )

  let updatedLog: HabitLog
  if (existingIndex >= 0) {
    updatedLog = {
      ...all[existingIndex],
      actual_value: actualValue,
      completion_status: isCompleted,
      notes: notes !== undefined ? notes : all[existingIndex].notes,
      updated_at: new Date().toISOString(),
    }
    all[existingIndex] = updatedLog
  } else {
    updatedLog = {
      id: crypto.randomUUID(),
      habit_id: habitId,
      user_id: 'dishant-user',
      log_date: dateStr,
      actual_value: actualValue,
      completion_status: isCompleted,
      notes: notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    all.push(updatedLog)
  }

  try {
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(all))
    window.dispatchEvent(new CustomEvent('future-you-storage-updated'))
  } catch (e) {
    console.error('Error saving habit log:', e)
  }

  return updatedLog
}

export function calculateHabitStreak(habitId: string, allLogs: HabitLog[]): number {
  const completedDates = new Set(
    allLogs
      .filter((l) => l.habit_id === habitId && l.completion_status)
      .map((l) => l.log_date)
  )

  const today = new Date()
  let streak = 0

  const todayStr = today.toISOString().slice(0, 10)
  let checkDate = new Date(today)
  if (!completedDates.has(todayStr)) {
    // If not completed today yet, check from yesterday so user doesn't lose active streak mid-day
    checkDate.setDate(checkDate.getDate() - 1)
  }

  while (true) {
    const dateStr = checkDate.toISOString().slice(0, 10)
    if (completedDates.has(dateStr)) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }

  return streak
}
