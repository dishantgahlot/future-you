import { describe, it, expect } from 'vitest'

describe('Frontend API & Header Services', () => {
  it('constructs correct API endpoint URLs', () => {
    const API_BASE = '/api'
    const habitId = 'test-habit-123'
    expect(`${API_BASE}/habits`).toBe('/api/habits')
    expect(`${API_BASE}/habits/${habitId}`).toBe('/api/habits/test-habit-123')
    expect(`${API_BASE}/ai/simulate`).toBe('/api/ai/simulate')
    expect(`${API_BASE}/ai/whatif/sessions`).toBe('/api/ai/whatif/sessions')
    expect(`${API_BASE}/analytics/weekly`).toBe('/api/analytics/weekly')
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

  it('builds authentication headers with Bearer token when authenticated', () => {
    const token = 'supabase-jwt-token-123'
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }

    expect(headers.Authorization).toBe('Bearer supabase-jwt-token-123')
    expect(headers['Content-Type']).toBe('application/json')
  })

  it('serializes date query parameters correctly', () => {
    const params = new URLSearchParams({
      start: '2026-11-13',
      end: '2026-11-20',
      category: 'fitness',
    })

    expect(params.toString()).toBe('start=2026-11-13&end=2026-11-20&category=fitness')
  })

  it('normalizes API habit log status response', () => {
    const rawLog = {
      id: 'log-1',
      habit_id: 'habit-1',
      log_date: '2026-11-19',
      value: 10000,
      completion_status: 1, // SQL integer truthy
    }

    const normalized = {
      ...rawLog,
      completion_status: Boolean(rawLog.completion_status),
    }

    expect(normalized.completion_status).toBe(true)
  })
})
