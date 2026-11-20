import { describe, it, expect } from 'vitest'

describe('Habit Progress Analytics & 70% Rule Tiers', () => {
  it('classifies progress percentages into correct behavioral tiers', () => {
    const getProgressTier = (pct: number) => {
      if (pct >= 100) return 'full'
      if (pct >= 70) return 'high_partial'
      if (pct >= 40) return 'moderate_partial'
      if (pct > 0) return 'started'
      return 'unstarted'
    }

    expect(getProgressTier(100)).toBe('full')
    expect(getProgressTier(120)).toBe('full')
    expect(getProgressTier(85)).toBe('high_partial')
    expect(getProgressTier(70)).toBe('high_partial')
    expect(getProgressTier(50)).toBe('moderate_partial')
    expect(getProgressTier(25)).toBe('started')
    expect(getProgressTier(0)).toBe('unstarted')
  })

  it('evaluates overall progress percentage across multi-habit portfolio', () => {
    const habits = [
      { name: 'Run', pct: 100 },
      { name: 'Read', pct: 100 },
      { name: 'Meditate', pct: 70 },
      { name: 'Hydrate', pct: 70 },
    ]

    const sum = habits.reduce((acc, h) => acc + h.pct, 0)
    const avg = Math.round((sum / habits.length) * 10) / 10
    expect(avg).toBe(85)
  })

  it('determines performance trends based on rolling averages', () => {
    const computeTrend = (recentAvg: number, historicalAvg: number): 'improving' | 'declining' | 'stable' => {
      const diff = recentAvg - historicalAvg
      if (diff > 5) return 'improving'
      if (diff < -5) return 'declining'
      return 'stable'
    }

    expect(computeTrend(85, 70)).toBe('improving')
    expect(computeTrend(60, 80)).toBe('declining')
    expect(computeTrend(75, 73)).toBe('stable')
  })
})
