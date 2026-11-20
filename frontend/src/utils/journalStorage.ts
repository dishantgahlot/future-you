import { format, parseISO, isValid } from 'date-fns'

export interface JournalEntry {
  id: string
  date: string // e.g. "Mon, 16 Nov 2026"
  dateStr: string // Standard ISO date e.g. "2026-11-16"
  title: string
  content: string
  updatedAt?: string
}

export const JOURNAL_STORAGE_KEY = 'future_you_journal_entries'

export const DEFAULT_JOURNAL_ENTRIES: JournalEntry[] = [
  {
    id: 'entry-1',
    date: 'Mon, 16 Nov 2026',
    dateStr: '2026-11-16',
    title: 'Morning Clarity & Fresh Focus',
    content:
      'Woke up early after a consistent 8-hour sleep. Completed the morning run with high energy. Kept notifications silenced for the first two hours of deep work, which noticeably improved concentration.',
  },
  {
    id: 'entry-2',
    date: 'Sun, 15 Nov 2026',
    dateStr: '2026-11-15',
    title: 'Digital Fasting Reflection',
    content:
      'Kept screen time under 2 hours today. Spent the evening reading instead of scrolling. Feeling grounded and ready for the week ahead.',
  },
]

/**
 * Normalizes any date format (human string or ISO) into standard YYYY-MM-DD
 */
export function normalizeDateToDateStr(dateInput: string): string {
  if (!dateInput) return format(new Date(), 'yyyy-MM-dd')

  const trimmed = dateInput.trim()

  // 1. If already 'YYYY-MM-DD'
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }

  // 2. If ISO string like '2026-11-19T...'
  if (trimmed.includes('T')) {
    const part = trimmed.split('T')[0]
    if (/^\d{4}-\d{2}-\d{2}$/.test(part)) return part
  }

  // 3. Try parseISO
  const isoParsed = parseISO(trimmed)
  if (isValid(isoParsed)) {
    return format(isoParsed, 'yyyy-MM-dd')
  }

  // 4. Try native Date parse (e.g. "Mon, 16 Nov 2026")
  const parsed = new Date(trimmed)
  if (!isNaN(parsed.getTime())) {
    return format(parsed, 'yyyy-MM-dd')
  }

  return format(new Date(), 'yyyy-MM-dd')
}

/**
 * Filters entries strictly for the selected date string (YYYY-MM-DD).
 * For a brand new day or any day with no logs, returns [] (null/fresh).
 */
export function filterEntriesForDate(
  entries: JournalEntry[],
  targetDateStr: string
): JournalEntry[] {
  return entries.filter((e) => {
    const entryDateStr = e.dateStr || normalizeDateToDateStr(e.date)
    return entryDateStr === targetDateStr
  })
}

/**
 * Returns a sorted unique list of all dates (YYYY-MM-DD) that have recorded reflections.
 */
export function getDatesWithEntries(entries: JournalEntry[]): string[] {
  const dates = new Set<string>()
  entries.forEach((e) => {
    const dStr = e.dateStr || normalizeDateToDateStr(e.date)
    dates.add(dStr)
  })
  return Array.from(dates).sort().reverse()
}

/**
 * Creates a new journal entry stamped with the specific date context.
 */
export function createJournalEntry(
  title: string,
  content: string,
  targetDate: Date,
  targetDateStr: string
): JournalEntry {
  return {
    id: `entry-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    date: format(targetDate, 'EEE, d MMM yyyy'),
    dateStr: targetDateStr,
    title: title.trim(),
    content: content.trim(),
  }
}
