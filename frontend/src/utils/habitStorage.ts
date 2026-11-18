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

export function getLoginDatesStorageKey(userId?: string): string {
  const uid = userId || getActiveUserId()
  return `future-you-login-dates-v3_${uid}`
}

/**
 * Records a day that the user logged in / accessed the application.
 */
export function recordLoginDate(dateStr?: string, userId?: string): void {
  try {
    const uid = userId || getActiveUserId()
    const today = dateStr || new Date().toISOString().slice(0, 10)
    const key = getLoginDatesStorageKey(uid)
    const raw = localStorage.getItem(key)
    const dates: string[] = raw ? JSON.parse(raw) : []
    if (!dates.includes(today)) {
      dates.push(today)
      localStorage.setItem(key, JSON.stringify(dates))
      window.dispatchEvent(new CustomEvent('future-you-storage-updated'))
    }
  } catch {}
}

/**
 * Returns all distinct dates the user has logged in or tracked habits.
 */
export function getLoggedInDates(userId?: string): string[] {
  try {
    const uid = userId || getActiveUserId()
    const key = getLoginDatesStorageKey(uid)
    const raw = localStorage.getItem(key)
    const stored: string[] = raw ? JSON.parse(raw) : []

    // Also automatically include dates from logs where actual_value > 0 or completion_status is true
    const logs = getAllLocalLogs(uid)
    const logDates = logs
      .filter((l) => (l.actual_value !== undefined && l.actual_value > 0) || l.completion_status)
      .map((l) => l.log_date)

    return Array.from(new Set([...stored, ...logDates])).sort()
  } catch {
    return []
  }
}

// Automatically record today's login session on app load
try {
  if (typeof window !== 'undefined') {
    recordLoginDate()
  }
} catch {}

/**
 * Returns an empty habits array by default.
 * Users must manually add and configure their own habits.
 */
export function createDefaultHabitsForUser(_userId: string): Habit[] {
  return []
}

export const DEFAULT_HABITS: Habit[] = []

export function getLocalHabits(userId?: string): Habit[] {
  try {
    const key = getHabitsStorageKey(userId)
    const raw = localStorage.getItem(key)
    if (raw === null) {
      localStorage.setItem(key, JSON.stringify([]))
      return []
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    // Ensure no default starter habits remain; user adds all habits manually
    const customOnly = parsed.filter(
      (h) =>
        !h.id.startsWith('habit-sleep-') &&
        !h.id.startsWith('habit-study-') &&
        !h.id.startsWith('habit-exercise-') &&
        !h.id.startsWith('habit-hydration-') &&
        !h.id.startsWith('habit-screentime-')
    )
    if (customOnly.length !== parsed.length) {
      localStorage.setItem(key, JSON.stringify(customOnly))
    }
    return customOnly
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
      target_value: targetValue > 0 ? targetValue : all[existingIndex].target_value,
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
      target_value: targetValue,
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

export function getDayTargetsStorageKey(userId?: string): string {
  const uid = userId || getActiveUserId()
  return `future-you-day-targets-v3_${uid}`
}

export function getDayTarget(
  habitId: string,
  dateStr: string,
  defaultTarget: number,
  userId?: string
): number {
  try {
    const uid = userId || getActiveUserId()
    // 1. Check existing local log
    const logs = getAllLocalLogs(uid)
    const log = logs.find((l) => l.habit_id === habitId && l.log_date === dateStr)
    if (log && typeof log.target_value === 'number' && log.target_value > 0) {
      return log.target_value
    }

    // 2. Check dedicated day targets map
    const key = getDayTargetsStorageKey(uid)
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed: Record<string, number> = JSON.parse(raw)
      const specific = parsed[`${habitId}_${dateStr}`]
      if (typeof specific === 'number' && specific > 0) {
        return specific
      }
    }
  } catch {}
  return defaultTarget > 0 ? defaultTarget : 1
}

export function setDayTarget(
  habitId: string,
  dateStr: string,
  targetValue: number,
  userId?: string
): void {
  try {
    const uid = userId || getActiveUserId()
    const target = Math.max(1, Math.round(targetValue * 10) / 10)

    // Save in dedicated day-targets map
    const key = getDayTargetsStorageKey(uid)
    let map: Record<string, number> = {}
    try {
      const raw = localStorage.getItem(key)
      if (raw) map = JSON.parse(raw)
    } catch {}
    map[`${habitId}_${dateStr}`] = target
    localStorage.setItem(key, JSON.stringify(map))

    // Sync with existing log or initialize log for today
    const all = getAllLocalLogs(uid)
    const existingIndex = all.findIndex((l) => l.habit_id === habitId && l.log_date === dateStr)
    if (existingIndex >= 0) {
      const existing = all[existingIndex]
      const isCompleted = existing.actual_value >= target
      all[existingIndex] = {
        ...existing,
        target_value: target,
        completion_status: isCompleted,
        updated_at: new Date().toISOString(),
      }
    } else {
      all.push({
        id: crypto.randomUUID(),
        habit_id: habitId,
        user_id: uid,
        log_date: dateStr,
        actual_value: 0,
        target_value: target,
        completion_status: false,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }
    const logsKey = getLogsStorageKey(uid)
    localStorage.setItem(logsKey, JSON.stringify(all))

    window.dispatchEvent(new CustomEvent('future-you-storage-updated'))
  } catch (e) {
    console.error('Error saving day target:', e)
  }
}

export function resetDayTarget(
  habitId: string,
  dateStr: string,
  defaultTarget: number,
  userId?: string
): void {
  try {
    const uid = userId || getActiveUserId()
    const key = getDayTargetsStorageKey(uid)
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const map: Record<string, number> = JSON.parse(raw)
        delete map[`${habitId}_${dateStr}`]
        localStorage.setItem(key, JSON.stringify(map))
      }
    } catch {}

    const all = getAllLocalLogs(uid)
    const existingIndex = all.findIndex((l) => l.habit_id === habitId && l.log_date === dateStr)
    if (existingIndex >= 0) {
      const existing = all[existingIndex]
      const fallback = defaultTarget > 0 ? defaultTarget : 1
      const isCompleted = existing.actual_value >= fallback
      all[existingIndex] = {
        ...existing,
        target_value: fallback,
        completion_status: isCompleted,
        updated_at: new Date().toISOString(),
      }
      const logsKey = getLogsStorageKey(uid)
      localStorage.setItem(logsKey, JSON.stringify(all))
    }

    window.dispatchEvent(new CustomEvent('future-you-storage-updated'))
  } catch (e) {
    console.error('Error resetting day target:', e)
  }
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
