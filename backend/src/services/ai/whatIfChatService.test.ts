import { describe, it, expect } from 'vitest'
import { simulateWhatIfScenario, extractDateFromQuery } from './whatIfChatService.js'

describe('whatIfChatService - Precision NLP Date Extraction', () => {
  it('should accurately extract dates from natural language phrasing', () => {
    expect(extractDateFromQuery('give me the data of 19th November', 2026)).toBe('2026-11-19')
    expect(extractDateFromQuery('what about 19th of November?', 2026)).toBe('2026-11-19')
    expect(extractDateFromQuery('data of 19 Nov', 2026)).toBe('2026-11-19')
    expect(extractDateFromQuery('show me November 19 progress', 2026)).toBe('2026-11-19')
    expect(extractDateFromQuery('what happened on 2026-11-19?', 2026)).toBe('2026-11-19')
    expect(extractDateFromQuery('how was my routine on 15th October?', 2026)).toBe('2026-10-15')
  })
})

describe('whatIfChatService - Specific Date Data & What-If Chat', () => {
  const sixHabits = [
    { id: 'h1', name: 'Hhh', target_value: 10000, unit: 'steps', is_active: true },
    { id: 'h2', name: 'vff', target_value: 10000, unit: 'steps', is_active: true },
    { id: 'h3', name: 'gbg', target_value: 10000, unit: 'steps', is_active: true },
    { id: 'h4', name: 'sleep', target_value: 8, unit: 'h', is_active: true },
    { id: 'h5', name: 'stepa', target_value: 10000, unit: 'steps', is_active: true },
    { id: 'h6', name: 'Steps', target_value: 30, unit: 'mins', is_active: true },
  ]

  const date19Str = '2026-11-19'

  // 5 out of 6 completed, 1 at 10% progress (e.g. 1000 / 10000 steps), yielding ~85% day completion
  const nov19Logs = [
    { habit_id: 'h1', log_date: '2026-11-19T00:00:00.000Z', actual_value: 10000, completion_status: true },
    { habit_id: 'h2', log_date: '2026-11-19', actual_value: 10000, completion_status: true },
    { habit_id: 'h3', log_date: '2026-11-19', actual_value: 10000, completion_status: true },
    { habit_id: 'h4', log_date: '2026-11-19T10:30:00.000Z', actual_value: 8, completion_status: true },
    { habit_id: 'h5', log_date: '2026-11-19', actual_value: 10000, completion_status: true },
    { habit_id: 'h6', log_date: '2026-11-19', actual_value: 3, progress_percentage: 10, completion_status: false },
  ]

  it('should return 85% overall progress and 5 of 6 completed when asked about 19th November', async () => {
    const res = await simulateWhatIfScenario({
      message: 'give me the data of 19th November, which has 85% overall progress and 5 out of 6 habits completed',
      habits: sixHabits,
      logs: nov19Logs,
      userName: 'Dishu',
      apiKey: 'your_gemini_api_key', // fallback path
    })

    expect(res).toBeDefined()
    expect(res.reply).toContain('2026-11-19')
    expect(res.reply).toContain('**85%**')
    expect(res.reply).toContain('**5** completed')
    expect(res.reply).not.toContain('**0%**')
    expect(res.reply).toContain('Hhh')
    expect(res.reply).toContain('sleep')
  }, 10000)

  it('should match ISO timestamp logs like 2026-11-19T00:00:00.000Z correctly', async () => {
    const res = await simulateWhatIfScenario({
      message: 'what is my habit progress on 19 Nov?',
      habits: sixHabits,
      logs: nov19Logs,
      userName: 'Dishu',
      apiKey: 'your_gemini_api_key',
    })

    expect(res.reply).toContain('2026-11-19')
    expect(res.reply).toContain('85%')
    expect(res.reply).toContain('5')
  }, 10000)
})
