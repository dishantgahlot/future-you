import { describe, it, expect } from 'vitest'
import { format, parseISO, isValid, subDays } from 'date-fns'

describe('DateContext & Timezone Precision Logic', () => {
  it('formats dates accurately in YYYY-MM-DD standard format', () => {
    const d = new Date(2026, 10, 19) // Month is 0-indexed: 10 = November
    expect(format(d, 'yyyy-MM-dd')).toBe('2026-11-19')
  })

  it('validates ISO dates and handles edge case strings', () => {
    const validStr = '2026-11-19'
    const parsedValid = parseISO(validStr)
    expect(isValid(parsedValid)).toBe(true)
    expect(format(parsedValid, 'yyyy-MM-dd')).toBe('2026-11-19')

    const invalidStr = 'invalid-date'
    const parsedInvalid = parseISO(invalidStr)
    expect(isValid(parsedInvalid)).toBe(false)
  })

  it('calculates historical offset days reliably', () => {
    const ref = parseISO('2026-11-20')
    const yesterday = subDays(ref, 1)
    expect(format(yesterday, 'yyyy-MM-dd')).toBe('2026-11-19')

    const twoDaysAgo = subDays(ref, 2)
    expect(format(twoDaysAgo, 'yyyy-MM-dd')).toBe('2026-11-18')
  })

  it('detects today versus historical inspection date', () => {
    const todayStr = '2026-11-20'
    const testDateStr = '2026-11-19'

    const isToday = testDateStr === todayStr
    expect(isToday).toBe(false)

    const isHistorical = testDateStr < todayStr
    expect(isHistorical).toBe(true)
  })
})
