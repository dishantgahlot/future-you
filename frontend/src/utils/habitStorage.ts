import type { Habit, HabitLog } from '../types'

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

// Automatically wipe obsolete shared mock storage keys from prior builds
try {
  localStorage.removeItem('future-you-habits-botanical-v2')
  localStorage.removeItem('future-you-habit-logs-botanical-v2')
  localStorage.removeItem('future-you-habits')
  localStorage.removeItem('future-you-habit-logs')
} catch {}

/**
 * Returns the currently active user ID synchronously for localStorage partitioning.
 * Supports active Supabase sessions, demo users, or guest mode.
 */
export function getActiveUserId(): string {
  try {
    const explicitId = localStorage.getItem('future_you_active_user_id')
    if (explicitId && explicitId.trim().length > 0) return explicitId.trim()

    // Detect Supabase auth token
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const raw = localStorage.getItem(key)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed?.user?.id) return parsed.user.id
        }
      }
    }

    const demo = localStorage.getItem('future_you_demo_user')
    if (demo) {
      const parsed = JSON.parse(demo)
      if (parsed?.id) return parsed.id
    }
  } catch {}
  return 'guest-user'
}

/**
 * User-isolated storage keys
 */
export function getHabitsStorageKey(userId?: string): string {
  const uid = userId || getActiveUserId()
  return `future-you-habits-v3_${uid}`
}

export function getLogsStorageKey(userId?: string): string {
  const uid = userId || getActiveUserId()
  return `future-you-habit-logs-v3_${uid}`
}

/**
 * Generates personalized starter habits for a new user account.
 * Crucially: zero logs are associated with this until the user explicitly tracks them!
 */
export function createDefaultHabitsForUser(userId: string): Habit[] {
  const now = new Date().toISOString()
  return [
    {
      id: `habit-sleep-${userId.slice(0, 8)}`,
      user_id: userId,
      name: 'Sleep',
      description: '7 - 8 hours of restorative sleep',
      category: 'sleep',
      frequency: 'daily',
      target_value: 8,
      unit: 'h',
      color: '#7E6BA5',
      color_theme: 'lavender',
      icon: 'moon',
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: `habit-study-${userId.slice(0, 8)}`,
      user_id: userId,
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
      created_at: now,
      updated_at: now,
    },
    {
      id: `habit-exercise-${userId.slice(0, 8)}`,
      user_id: userId,
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
      created_at: now,
      updated_at: now,
    },
    {
      id: `habit-hydration-${userId.slice(0, 8)}`,
      user_id: userId,
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
      created_at: now,
      updated_at: now,
    },
    {
      id: `habit-screentime-${userId.slice(0, 8)}`,
      user_id: userId,
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
      created_at: now,
      updated_at: now,
    },
  ]
}

export const DEFAULT_HABITS: Habit[] = createDefaultHabitsForUser('guest-user')

export function getLocalHabits(userId?: string): Habit[] {
  try {
    const key = getHabitsStorageKey(userId)
    const raw = localStorage.getItem(key)
    if (raw === null) {
      const uid = userId || getActiveUserId()
      const starter = createDefaultHabitsForUser(uid)
      localStorage.setItem(key, JSON.stringify(starter))
      return starter
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

export function saveLocalHabits(habits: Habit[], userId?: string): void {
  try {
    const key = getHabitsStorageKey(userId)
    localStorage.setItem(key, JSON.stringify(habits))
    window.dispatchEvent(new CustomEvent('future-you-storage-updated'))
  } catch (e) {
    console.error('Error saving habits to localStorage:', e)
  }
}

export function deleteLocalHabit(habitId: string, userId?: string): void {
  try {
    const habits = getLocalHabits(userId).filter((h) => h.id !== habitId)
    saveLocalHabits(habits, userId)

    const logsKey = getLogsStorageKey(userId)
    const logs = getAllLocalLogs(userId).filter((l) => l.habit_id !== habitId)
    localStorage.setItem(logsKey, JSON.stringify(logs))
    window.dispatchEvent(new CustomEvent('future-you-storage-updated'))
  } catch (e) {
    console.error('Error deleting local habit:', e)
  }
}

export function saveAllLocalLogs(logs: HabitLog[], userId?: string): void {
  try {
    const key = getLogsStorageKey(userId)
    localStorage.setItem(key, JSON.stringify(logs))
    window.dispatchEvent(new CustomEvent('future-you-storage-updated'))
  } catch (e) {
    console.error('Error saving all habit logs:', e)
  }
}

/**
 * Returns logs for the active user.
 * For any new account, this strictly returns an empty array ([]) so the user starts with 0 active days.
 * No synthetic or mock historical logs are ever generated.
 */
export function getAllLocalLogs(userId?: string): HabitLog[] {
  try {
    const key = getLogsStorageKey(userId)
    const raw = localStorage.getItem(key)

    if (!raw) {
      return []
    }

    const parsed: HabitLog[] = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

export function saveLocalLog(
  habitId: string,
  dateStr: string,
  actualValue: number,
  targetValue: number,
  notes?: string,
  userId?: string
): HabitLog {
  const uid = userId || getActiveUserId()
  const all = getAllLocalLogs(uid)
  const isCompleted = targetValue > 0 ? actualValue >= targetValue : actualValue > 0

  const existingIndex = all.findIndex(
    (l) => l.habit_id === habitId && l.log_date === dateStr
  )

  let updatedLog: HabitLog
  if (existingIndex >= 0) {
    updatedLog = {
      ...all[existingIndex],
      user_id: uid,
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
      user_id: uid,
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
    const key = getLogsStorageKey(uid)
    localStorage.setItem(key, JSON.stringify(all))
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
