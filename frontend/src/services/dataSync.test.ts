import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  syncUserData,
  getLocalJournalEntries,
  saveLocalJournalEntries,
  getUserJournalKey,
} from './dataSync'
import { getLocalHabits, getAllLocalLogs } from '../utils/habitStorage'
import type { Habit } from '../types'

// Setup in-memory mock for localStorage
const store: Record<string, string> = {}
const mockLocalStorage = {
  getItem: (k: string) => store[k] || null,
  setItem: (k: string, v: string) => {
    store[k] = v
  },
  removeItem: (k: string) => {
    delete store[k]
  },
  clear: () => {
    Object.keys(store).forEach((k) => delete store[k])
  },
  key: (i: number) => Object.keys(store)[i] || null,
  get length() {
    return Object.keys(store).length
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

// Mock Supabase client
vi.mock('./supabase', () => {
  const mockHabits = [
    {
      id: 'remote-h-1',
      user_id: 'user-cross-browser',
      name: 'Hydration',
      description: 'Drink water',
      category: 'health',
      frequency: 'daily',
      target_value: 8,
      unit: 'glasses',
      color: '#738541',
      color_theme: 'sage',
      icon: 'droplet',
      is_active: true,
      target_date: '2026-11-20',
      created_at: '2026-11-20T10:00:00.000Z',
      updated_at: '2026-11-20T10:00:00.000Z',
    },
  ]

  const mockLogs = [
    {
      id: 'remote-log-1',
      habit_id: 'remote-h-1',
      user_id: 'user-cross-browser',
      log_date: '2026-11-20',
      actual_value: 8,
      target_value: 8,
      completion_status: true,
      notes: 'Done',
      created_at: '2026-11-20T12:00:00.000Z',
      updated_at: '2026-11-20T12:00:00.000Z',
    },
  ]

  const mockProfile = {
    id: 'user-cross-browser',
    email: 'test@futureyou.ai',
    full_name: 'Cross Browser User',
    avatar_url: 'https://example.com/avatar.svg',
    preferences: {
      avatar_style: 'adventurer',
      avatar_seed: 'Forest',
      journal_entries: [
        {
          id: 'remote-journal-1',
          date: 'Fri, 20 Nov 2026',
          dateStr: '2026-11-20',
          title: 'Remote Reflection',
          content: 'Synchronized reflection from another device.',
        },
      ],
      login_history: [
        {
          id: 'lh-1',
          date: 'Fri, 20 Nov 2026, 10:00 AM',
          timestamp: 1763632800000,
          device: 'Web Desktop (Chrome)',
          method: 'Supabase Authentication',
          status: 'Active',
        },
      ],
    },
  }

  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-cross-browser', email: 'test@futureyou.ai' } },
        }),
      },
      from: vi.fn((table: string) => ({
        select: vi.fn(() => ({
          eq: vi.fn((col: string, val: string) => ({
            order: vi.fn().mockResolvedValue({
              data: table === 'habits' ? mockHabits : table === 'habit_logs' ? mockLogs : [],
              error: null,
            }),
            maybeSingle: vi.fn().mockResolvedValue({
              data: table === 'profiles' ? mockProfile : null,
              error: null,
            }),
            single: vi.fn().mockResolvedValue({
              data: table === 'profiles' ? mockProfile : null,
              error: null,
            }),
          })),
        })),
        upsert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      })),
    },
  }
})

describe('Cross-Browser Data Sync Service', () => {
  beforeEach(() => {
    mockLocalStorage.clear()
  })

  it('populates fresh browser localStorage with habits, logs, and journals from Supabase', async () => {
    const testUserId = 'user-cross-browser'

    // Verify localStorage starts completely empty on a new browser
    expect(getLocalHabits(testUserId)).toEqual([])
    expect(getAllLocalLogs(testUserId)).toEqual([])
    expect(getLocalJournalEntries(testUserId)).toEqual([])

    // Run sync
    const res = await syncUserData(testUserId)
    expect(res.success).toBe(true)
    expect(res.habits.length).toBe(1)
    expect(res.habits[0].name).toBe('Hydration')
    expect(res.logs.length).toBe(1)
    expect(res.logs[0].actual_value).toBe(8)

    // Local storage is now populated
    const localHabits = getLocalHabits(testUserId)
    expect(localHabits.length).toBe(1)
    expect(localHabits[0].id).toBe('remote-h-1')

    const localLogs = getAllLocalLogs(testUserId)
    expect(localLogs.length).toBe(1)
    expect(localLogs[0].completion_status).toBe(true)

    // Journal entries are also restored
    const localJournals = getLocalJournalEntries(testUserId)
    expect(localJournals.length).toBe(1)
    expect(localJournals[0].title).toBe('Remote Reflection')

    // Profile preferences restored to localStorage
    expect(mockLocalStorage.getItem('future_you_avatar_url')).toBe('https://example.com/avatar.svg')
    expect(mockLocalStorage.getItem('future_you_avatar_style')).toBe('adventurer')
  })

  it('manages user-partitioned journal storage keys accurately', () => {
    expect(getUserJournalKey('user-123')).toBe('future_you_journal_entries_user-123')
    saveLocalJournalEntries(
      [
        {
          id: 'j-1',
          date: 'Fri, 20 Nov 2026',
          dateStr: '2026-11-20',
          title: 'Daily Reflection',
          content: 'Good progress today.',
        },
      ],
      'user-123'
    )
    const loaded = getLocalJournalEntries('user-123')
    expect(loaded.length).toBe(1)
    expect(loaded[0].title).toBe('Daily Reflection')
  })
})
