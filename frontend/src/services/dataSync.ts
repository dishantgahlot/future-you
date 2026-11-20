import { supabase } from './supabase'
import type { Habit, HabitLog } from '../types'
import {
  getLocalHabits,
  saveLocalHabits,
  getAllLocalLogs,
  saveAllLocalLogs,
  getActiveUserId,
  recordLoginDate,
} from '../utils/habitStorage'
import { JOURNAL_STORAGE_KEY, type JournalEntry } from '../utils/journalStorage'

// Prevent overlapping concurrent sync runs - reuse in-flight sync promise
let activeSyncPromise: Promise<{ success: boolean; habits: Habit[]; logs: HabitLog[] }> | null = null

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isUuid(str?: string | null): boolean {
  return typeof str === 'string' && UUID_REGEX.test(str)
}

export function getUserJournalKey(userId?: string): string {
  const uid = userId || getActiveUserId()
  return uid ? `${JOURNAL_STORAGE_KEY}_${uid}` : JOURNAL_STORAGE_KEY
}

export function getLocalJournalEntries(userId?: string): JournalEntry[] {
  try {
    const key = getUserJournalKey(userId)
    const specific = localStorage.getItem(key)
    if (specific) {
      const parsed = JSON.parse(specific)
      if (Array.isArray(parsed)) return parsed
    }
    const legacy = localStorage.getItem(JOURNAL_STORAGE_KEY)
    if (legacy) {
      const parsed = JSON.parse(legacy)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {}
  return []
}

export function saveLocalJournalEntries(entries: JournalEntry[], userId?: string): void {
  try {
    const key = getUserJournalKey(userId)
    localStorage.setItem(key, JSON.stringify(entries))
    window.dispatchEvent(new CustomEvent('future-you-storage-updated'))
  } catch (e) {
    console.error('Error saving local journal entries:', e)
  }
}

/**
 * Synchronizes user data (habits, logs, journal entries, and profile preferences)
 * between the remote Supabase database and local storage.
 * Performs bidirectional reconciliation so data created on any browser is preserved.
 */
export async function syncUserData(
  targetUserId?: string
): Promise<{ success: boolean; habits: Habit[]; logs: HabitLog[] }> {
  if (activeSyncPromise) {
    return activeSyncPromise
  }

  activeSyncPromise = (async () => {
    try {
      return await executeSyncUserData(targetUserId)
    } finally {
      activeSyncPromise = null
    }
  })()

  return activeSyncPromise
}

async function executeSyncUserData(
  targetUserId?: string
): Promise<{ success: boolean; habits: Habit[]; logs: HabitLog[] }> {
  try {
    let uid = targetUserId?.trim()

    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.id) {
        uid = user.id
        localStorage.setItem('future_you_active_user_id', user.id)
      } else {
        uid = getActiveUserId()
      }
    }

    if (!uid || uid === 'guest-user' || uid === 'demo-user-1') {
      return { success: false, habits: getLocalHabits(uid), logs: getAllLocalLogs(uid) }
    }

    // 1. Fetch remote habits, logs, and profile in parallel
    const [habitsRes, logsRes, profileRes] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('habit_logs').select('*').eq('user_id', uid).order('log_date', { ascending: false }),
      supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
    ])

    if (habitsRes.error) {
      console.warn('Supabase habits fetch note:', habitsRes.error.message)
    }
    if (logsRes.error) {
      console.warn('Supabase habit_logs fetch note:', logsRes.error.message)
    }

    const remoteHabitsRaw = habitsRes.data || []
    const remoteLogsRaw = logsRes.data || []
    const profile = profileRes.data || null

    // 2. Process and normalize remote habits
    const remoteHabits: Habit[] = remoteHabitsRaw.map((rh: any) => {
      const createdDate = String(rh.created_at || '').slice(0, 10)
      const targetDate = rh.target_date || createdDate || new Date().toISOString().slice(0, 10)
      return {
        id: rh.id,
        user_id: rh.user_id,
        name: rh.name,
        description: rh.description || null,
        category: rh.category,
        frequency: rh.frequency || 'daily',
        target_value: Number(rh.target_value || 1),
        unit: rh.unit || 'times',
        color: rh.color || '#738541',
        color_theme: rh.color_theme || 'cream',
        icon: rh.icon || 'leaf',
        is_active: rh.is_active !== undefined ? Boolean(rh.is_active) : true,
        target_date: targetDate,
        created_at: rh.created_at || new Date().toISOString(),
        updated_at: rh.updated_at || rh.created_at || new Date().toISOString(),
      }
    })

    // 3. Reconcile with local habits
    const localHabits = getLocalHabits(uid)
    const remoteHabitIds = new Set(remoteHabits.map((h) => h.id))

    // Local-only habits: push to remote Supabase database so they aren't lost
    const localOnlyHabits = localHabits.filter(
      (lh) =>
        !remoteHabitIds.has(lh.id) &&
        !remoteHabits.some((rh) => rh.name.trim().toLowerCase() === lh.name.trim().toLowerCase() && rh.target_date === lh.target_date)
    )

    if (localOnlyHabits.length > 0) {
      for (const loh of localOnlyHabits) {
        try {
          const habitPayload: any = {
            user_id: uid,
            name: loh.name,
            description: loh.description || null,
            category: loh.category,
            frequency: loh.frequency || 'daily',
            target_value: loh.target_value,
            unit: loh.unit,
            color: loh.color,
            color_theme: loh.color_theme || 'cream',
            icon: loh.icon,
            is_active: loh.is_active,
            target_date: loh.target_date || loh.created_at?.slice(0, 10),
            created_at: loh.created_at,
            updated_at: loh.updated_at,
          }
          if (isUuid(loh.id)) {
            habitPayload.id = loh.id
          }
          await supabase.from('habits').upsert(habitPayload, { onConflict: 'id' })
        } catch (e) {
          console.warn('Could not sync local-only habit to remote:', loh.name, e)
        }
      }
    }

    // Merge: Remote habits take precedence, plus any local-only
    const mergedHabits: Habit[] = [
      ...remoteHabits,
      ...localOnlyHabits.filter((lh) => !remoteHabits.some((rh) => rh.id === lh.id || (rh.name.trim().toLowerCase() === lh.name.trim().toLowerCase() && rh.target_date === lh.target_date))),
    ]

    // If remote had an error and local habits exist, keep local habits
    const finalHabits = habitsRes.error && remoteHabits.length === 0 && localHabits.length > 0 ? localHabits : mergedHabits
    saveLocalHabits(finalHabits, uid)

    // 4. Process and normalize remote logs
    const remoteLogs: HabitLog[] = remoteLogsRaw.map((rl: any) => ({
      id: rl.id,
      habit_id: rl.habit_id,
      user_id: rl.user_id,
      log_date: String(rl.log_date || rl.date || '').slice(0, 10),
      actual_value: Number(rl.actual_value !== undefined ? rl.actual_value : (rl.value ?? 0)),
      target_value: Number(rl.target_value || 1),
      completion_status: Boolean(rl.completion_status),
      notes: rl.notes || null,
      created_at: rl.created_at || new Date().toISOString(),
      updated_at: rl.updated_at || rl.created_at || new Date().toISOString(),
    }))

    // 5. Reconcile with local logs
    const localLogs = getAllLocalLogs(uid)
    const remoteLogKeys = new Set(remoteLogs.map((l) => `${l.habit_id}_${l.log_date}`))

    // Local-only logs with actual progress: push to remote Supabase database
    const localOnlyLogs = localLogs.filter(
      (ll) => !remoteLogKeys.has(`${ll.habit_id}_${ll.log_date}`) && (ll.actual_value > 0 || ll.completion_status)
    )
    if (localOnlyLogs.length > 0) {
      for (const lol of localOnlyLogs) {
        try {
          const logPayload: any = {
            habit_id: lol.habit_id,
            user_id: uid,
            log_date: lol.log_date,
            actual_value: lol.actual_value,
            value: lol.actual_value,
            target_value: lol.target_value,
            completion_status: lol.completion_status,
            notes: lol.notes || null,
            updated_at: lol.updated_at,
          }
          if (isUuid(lol.id)) {
            logPayload.id = lol.id
          }
          await supabase.from('habit_logs').upsert(logPayload, { onConflict: 'habit_id,log_date' })
        } catch (e) {
          console.warn('Could not sync local-only log to remote:', lol.habit_id, e)
        }
      }
    }

    const mergedLogsMap = new Map<string, HabitLog>()
    for (const rl of remoteLogs) {
      mergedLogsMap.set(`${rl.habit_id}_${rl.log_date}`, rl)
    }
    for (const ll of localLogs) {
      const key = `${ll.habit_id}_${ll.log_date}`
      const existing = mergedLogsMap.get(key)
      if (!existing) {
        mergedLogsMap.set(key, ll)
      } else if (ll.updated_at && existing.updated_at && new Date(ll.updated_at) > new Date(existing.updated_at)) {
        mergedLogsMap.set(key, ll)
      }
    }
    const mergedLogs = Array.from(mergedLogsMap.values())
    const finalLogs = logsRes.error && remoteLogs.length === 0 && localLogs.length > 0 ? localLogs : mergedLogs

    saveAllLocalLogs(finalLogs, uid)

    // Record login/activity dates in local history
    for (const h of finalHabits) {
      if (h.target_date) recordLoginDate(h.target_date, uid)
    }
    for (const l of finalLogs) {
      if (l.log_date && (l.actual_value > 0 || l.completion_status)) {
        recordLoginDate(l.log_date, uid)
      }
    }

    // 6. Process journal entries from profile preferences
    if (profile?.preferences?.journal_entries && Array.isArray(profile.preferences.journal_entries)) {
      const remoteJournals: JournalEntry[] = profile.preferences.journal_entries
      const localJournals = getLocalJournalEntries(uid)

      const journalMap = new Map<string, JournalEntry>()
      remoteJournals.forEach((rj) => journalMap.set(rj.id, rj))
      localJournals.forEach((lj) => {
        if (!journalMap.has(lj.id)) {
          journalMap.set(lj.id, lj)
        }
      })
      const mergedJournals = Array.from(journalMap.values())
      saveLocalJournalEntries(mergedJournals, uid)

      // If local had extra entries, sync back to profile
      if (mergedJournals.length > remoteJournals.length) {
        syncJournalToRemote(uid, mergedJournals).catch(() => {})
      }
    } else {
      // If remote has no journals but local does, push local to remote
      const localJournals = getLocalJournalEntries(uid)
      if (localJournals.length > 0) {
        syncJournalToRemote(uid, localJournals).catch(() => {})
      }
    }

    // 7. Process profile details (avatar, avatar_style, avatar_seed, login_history)
    if (profile) {
      if (profile.avatar_url) {
        localStorage.setItem('future_you_avatar_url', profile.avatar_url)
      }
      const prefs = profile.preferences || {}
      if (prefs.avatar_style) {
        localStorage.setItem('future_you_avatar_style', prefs.avatar_style)
      }
      if (prefs.avatar_seed) {
        localStorage.setItem('future_you_avatar_seed', prefs.avatar_seed)
      }
      if (Array.isArray(prefs.login_history) && prefs.login_history.length > 0) {
        localStorage.setItem('future_you_login_history', JSON.stringify(prefs.login_history))
      }
      if (profile.full_name) {
        const savedProfile = { fullName: profile.full_name, email: profile.email }
        localStorage.setItem('future_you_user_profile', JSON.stringify(savedProfile))
      }
    }

    window.dispatchEvent(new CustomEvent('future-you-storage-updated'))
    return { success: true, habits: mergedHabits, logs: mergedLogs }
  } catch (err) {
    console.error('Data sync failed:', err)
    const uid = targetUserId || getActiveUserId()
    return { success: false, habits: getLocalHabits(uid), logs: getAllLocalLogs(uid) }
  }
}

/**
 * Pushes updated journal entries to Supabase profile preferences.
 */
export async function syncJournalToRemote(userId: string, entries: JournalEntry[]): Promise<void> {
  if (!userId || userId === 'guest-user' || userId === 'demo-user-1') return

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', userId)
      .maybeSingle()

    const prefs = profile?.preferences || {}
    await supabase
      .from('profiles')
      .update({
        preferences: {
          ...prefs,
          journal_entries: entries,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
  } catch (err) {
    console.warn('Failed to sync journal to Supabase profile preferences:', err)
  }
}

/**
 * Pushes updated avatar configuration to Supabase profile.
 */
export async function syncAvatarToRemote(
  userId: string,
  url: string,
  style?: string,
  seed?: string
): Promise<void> {
  if (!userId || userId === 'guest-user' || userId === 'demo-user-1') return

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', userId)
      .maybeSingle()

    const prefs = profile?.preferences || {}
    if (style) prefs.avatar_style = style
    if (seed) prefs.avatar_seed = seed

    await supabase
      .from('profiles')
      .update({
        avatar_url: url,
        preferences: prefs,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
  } catch (err) {
    console.warn('Failed to sync avatar to Supabase profile:', err)
  }
}

/**
 * Pushes updated login history to Supabase profile preferences.
 */
export async function syncLoginHistoryToRemote(userId: string, history: any[]): Promise<void> {
  if (!userId || userId === 'guest-user' || userId === 'demo-user-1') return

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', userId)
      .maybeSingle()

    const prefs = profile?.preferences || {}
    await supabase
      .from('profiles')
      .update({
        preferences: {
          ...prefs,
          login_history: history,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
  } catch (err) {
    console.warn('Failed to sync login history to Supabase profile:', err)
  }
}
