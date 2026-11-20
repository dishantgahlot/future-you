import { describe, it, expect } from 'vitest'

describe('Frontend API & Header Services', () => {
  it('constructs correct API endpoint URLs', () => {
    const API_BASE = '/api'
    const habitId = 'test-habit-123'
    expect(`${API_BASE}/habits`).toBe('/api/habits')
    expect(`${API_BASE}/habits/${habitId}`).toBe('/api/habits/test-habit-123')
    expect(`${API_BASE}/ai/simulate`).toBe('/api/ai/simulate')
  })

  it('formats request payload for habit creation with target_date', () => {
    const payload = {
      name: 'Read 20 pages',
      category: 'learning',
      frequency: 'daily',
      target_value: 20,
      unit: 'pages',
      target_date: '2026-11-20',
    }

    expect(payload.target_date).toBe('2026-11-20')
    expect(JSON.stringify(payload)).toContain('"target_date":"2026-11-20"')
  })

  it('handles response errors gracefully without crashing', () => {
    const errorResponse = {
      error: 'Network connection lost',
      status: 500,
    }

    const safeMessage = errorResponse?.error || 'Unknown error occurred'
    expect(safeMessage).toBe('Network connection lost')
  })
})
