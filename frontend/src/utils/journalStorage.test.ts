import { describe, it, expect } from 'vitest'
import {
  normalizeDateToDateStr,
  filterEntriesForDate,
  getDatesWithEntries,
  createJournalEntry,
  DEFAULT_JOURNAL_ENTRIES,
  type JournalEntry,
} from './journalStorage'

describe('Journal Storage & Multi-Day Isolation Suite', () => {
  const mockEntries: JournalEntry[] = [
    {
      id: 'j-19',
      date: 'Thu, 19 Nov 2026',
      dateStr: '2026-11-19',
      title: 'Deep Focus & 5 Completed Habits',
      content: 'Reflected on achieving 85% habit progress on the 19th.',
    },
    {
      id: 'j-18',
      date: 'Wed, 18 Nov 2026',
      dateStr: '2026-11-18',
      title: 'Midweek Resilience',
      content: 'Kept screen time under control during late afternoon slump.',
    },
    {
      id: 'j-legacy',
      date: 'Mon, 16 Nov 2026',
      dateStr: '', // Legacy entry without dateStr
      title: 'Legacy Reflection',
      content: 'Tested backwards compatibility for entries lacking dateStr.',
    },
  ]

  describe('normalizeDateToDateStr', () => {
    it('returns ISO YYYY-MM-DD directly if provided', () => {
      expect(normalizeDateToDateStr('2026-11-19')).toBe('2026-11-19')
    })

    it('extracts date from ISO timestamp with time component', () => {
      expect(normalizeDateToDateStr('2026-11-19T14:30:00.000Z')).toBe('2026-11-19')
    })

    it('normalizes human readable date format like "Mon, 16 Nov 2026"', () => {
      expect(normalizeDateToDateStr('Mon, 16 Nov 2026')).toBe('2026-11-16')
    })
  })

  describe('filterEntriesForDate (Date Isolation)', () => {
    it('returns entries strictly belonging to the requested date (Day 19)', () => {
      const results19 = filterEntriesForDate(mockEntries, '2026-11-19')
      expect(results19).toHaveLength(1)
      expect(results19[0].id).toBe('j-19')
      expect(results19[0].title).toContain('5 Completed Habits')
    })

    it('returns empty array (null/fresh) for a new day with no recorded entries (Day 20)', () => {
      const results20 = filterEntriesForDate(mockEntries, '2026-11-20')
      expect(results20).toHaveLength(0) // Fresh slate for the new day
    })

    it('returns empty array for tomorrow (Day 21) ensuring zero carryover', () => {
      const results21 = filterEntriesForDate(mockEntries, '2026-11-21')
      expect(results21).toHaveLength(0)
    })

    it('recovers legacy entries lacking dateStr by normalizing their date string', () => {
      const results16 = filterEntriesForDate(mockEntries, '2026-11-16')
      expect(results16).toHaveLength(1)
      expect(results16[0].id).toBe('j-legacy')
    })
  })

  describe('getDatesWithEntries', () => {
    it('returns unique list of dates with recorded reflections', () => {
      const dates = getDatesWithEntries(mockEntries)
      expect(dates).toContain('2026-11-19')
      expect(dates).toContain('2026-11-18')
      expect(dates).toContain('2026-11-16')
      expect(dates).not.toContain('2026-11-20') // Today has no entry yet
    })
  })

  describe('createJournalEntry', () => {
    it('creates new journal entry stamped with the exact target date and dateStr', () => {
      const targetDate = new Date(2026, 10, 20) // Nov 20, 2026
      const entry = createJournalEntry('Fresh Morning Thoughts', 'Feeling recharged.', targetDate, '2026-11-20')

      expect(entry.dateStr).toBe('2026-11-20')
      expect(entry.date).toContain('2026')
      expect(entry.title).toBe('Fresh Morning Thoughts')
      expect(entry.content).toBe('Feeling recharged.')
    })
  })

  describe('DEFAULT_JOURNAL_ENTRIES', () => {
    it('provides historical default entries with proper dates', () => {
      expect(DEFAULT_JOURNAL_ENTRIES.length).toBeGreaterThan(0)
      DEFAULT_JOURNAL_ENTRIES.forEach((entry) => {
        expect(entry.dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      })
    })
  })
})
