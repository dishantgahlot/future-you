import { describe, it, expect } from 'vitest'
import {
  extractJSONFromResponse,
  sanitizeString,
  sanitizeLetterContent,
  sanitizeResponse,
  FutureLetterResponseSchema,
  WeeklyInsightResponseSchema,
  HabitRecommendationResponseSchema,
  PredictionExplanationResponseSchema,
  CoachResponseSchema,
  parseAndValidateJSON,
  DEFAULT_FUTURE_LETTER,
  DEFAULT_WEEKLY_INSIGHT,
  DEFAULT_HABIT_RECOMMENDATIONS,
  DEFAULT_PREDICTION_EXPLANATION,
} from './responseValidator.js'

describe('AI Response Validator & Sanitization Suite', () => {
  describe('extractJSONFromResponse', () => {
    it('extracts raw JSON string directly', () => {
      const raw = '{"message": "success", "count": 10}'
      expect(extractJSONFromResponse(raw)).toBe(raw)
    })

    it('extracts JSON from markdown code blocks with json label', () => {
      const wrapped = 'Here is the response:\n```json\n{"content": "hello future you"}\n```\nHope this helps!'
      expect(extractJSONFromResponse(wrapped)).toBe('{"content": "hello future you"}')
    })

    it('extracts JSON from markdown code blocks without json label', () => {
      const wrapped = '```\n{"key": "value"}\n```'
      expect(extractJSONFromResponse(wrapped)).toBe('{"key": "value"}')
    })

    it('extracts JSON embedded inside descriptive text without code blocks', () => {
      const embedded = 'The output data is {"status": "ok", "score": 95} as computed.'
      expect(extractJSONFromResponse(embedded)).toBe('{"status": "ok", "score": 95}')
    })
  })

  describe('Sanitization functions (Security & XSS Prevention)', () => {
    it('escapes dangerous HTML characters in sanitizeString', () => {
      const dangerous = '<script>alert("xss")</script>'
      const sanitized = sanitizeString(dangerous)
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).not.toContain('</script>')
      expect(sanitized).toContain('&lt;')
      expect(sanitized).toContain('&gt;')
    })

    it('strips malicious script, iframe, and javascript: tags from letter content', () => {
      const attack = 'Hello <script>malicious()</script><iframe src="evil.com"></iframe><div onclick="hack()">Click</div>'
      const clean = sanitizeLetterContent(attack)
      expect(clean).not.toContain('<script>')
      expect(clean).not.toContain('<iframe')
      expect(clean).not.toContain('onclick=')
    })

    it('recursively sanitizes nested response objects and arrays', () => {
      const nested = {
        title: '<b>Title</b>',
        items: ['<script>item1</script>', 'item2'],
        metadata: {
          author: '"hacker"',
        },
      }
      const cleaned = sanitizeResponse(nested)
      expect(cleaned.title).not.toContain('<b>')
      expect(cleaned.items[0]).not.toContain('<script>')
      expect(cleaned.items[1]).toBe('item2')
      expect(cleaned.metadata.author).toContain('&quot;')
    })
  })

  describe('FutureLetterResponseSchema Validation', () => {
    it('validates a standard future letter response', () => {
      const payload = {
        content: 'Dear future self, your persistent efforts today are paying dividends in six months.',
        letterType: 'six_month',
        keyThemes: ['Consistency', 'Focus'],
        actionItems: ['Read 20 mins', 'Sleep 8 hours'],
      }
      const parsed = FutureLetterResponseSchema.safeParse(payload)
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.letterType).toBe('six_month')
        expect(parsed.data.keyThemes).toEqual(['Consistency', 'Focus'])
      }
    })

    it('normalizes legacy field aliases (letter, letter_type, key_themes)', () => {
      const payload = {
        letter: 'You have come a long way over the past five years through disciplined daily action.',
        letter_type: 'five_year',
        key_themes: ['Growth', 'Resilience'],
        action_items: ['Keep journaling'],
      }
      const parsed = FutureLetterResponseSchema.safeParse(payload)
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.content).toContain('five years')
        expect(parsed.data.letterType).toBe('five_year')
      }
    })

    it('rejects letters with content length less than 20 characters', () => {
      const payload = { content: 'Too short' }
      const parsed = FutureLetterResponseSchema.safeParse(payload)
      expect(parsed.success).toBe(false)
    })
  })

  describe('WeeklyInsightResponseSchema Validation', () => {
    it('validates weekly insight and normalizes string recommendations into structured objects', () => {
      const payload = {
        summary: 'Your overall habit consistency reached 88% this week, demonstrating strong focus.',
        highlights: ['5/6 habits completed consistently'],
        concerns: ['Hydration dipped on Wednesday'],
        recommendations: [
          'Drink 500ml water right after waking up',
          { action: 'Prepare running shoes the night before', reason: 'Reduces friction', priority: 'high' },
        ],
        motivation: 'Small wins lead to massive transformations.',
      }

      const parsed = WeeklyInsightResponseSchema.safeParse(payload)
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.recommendations).toHaveLength(2)
        expect(parsed.data.recommendations[0].action).toBe('Drink 500ml water right after waking up')
        expect(parsed.data.recommendations[1].priority).toBe('high')
      }
    })

    it('rejects insight if summary is too short', () => {
      const payload = { summary: 'Short' }
      const parsed = WeeklyInsightResponseSchema.safeParse(payload)
      expect(parsed.success).toBe(false)
    })
  })

  describe('HabitRecommendationResponseSchema Validation', () => {
    it('validates habit recommendations with all required dimensions', () => {
      const payload = {
        recommendations: [
          {
            name: 'Mindful Breathing',
            category: 'mental_health',
            frequency: 'daily',
            targetValue: 10,
            unit: 'mins',
            why: 'Reduces cognitive load and stabilizes evening cortisol levels.',
            difficulty: 'easy',
            expectedImpact: 'high',
            firstMicroStep: 'Take 3 deep breaths before opening laptop',
          },
        ],
      }
      const parsed = HabitRecommendationResponseSchema.safeParse(payload)
      expect(parsed.success).toBe(true)
    })

    it('rejects recommendation with negative or non-positive targetValue', () => {
      const payload = {
        recommendations: [
          {
            name: 'Faulty Habit',
            category: 'health',
            frequency: 'daily',
            targetValue: -5,
            unit: 'hours',
            why: 'Invalid target value test case for validation schema.',
            difficulty: 'easy',
            expectedImpact: 'low',
            firstMicroStep: 'Step 1',
          },
        ],
      }
      const parsed = HabitRecommendationResponseSchema.safeParse(payload)
      expect(parsed.success).toBe(false)
    })
  })

  describe('parseAndValidateJSON Helper', () => {
    it('parses and validates JSON wrapped in markdown correctly', () => {
      const rawAIResponse = '```json\n{"answer": "Your consistency will build long-term momentum.", "suggestedActions": ["Keep tracking"]}\n```'
      const result = parseAndValidateJSON(rawAIResponse, CoachResponseSchema, 'Coach')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.answer).toContain('long-term momentum')
        expect(result.data.suggestedActions).toEqual(['Keep tracking'])
      }
    })

    it('returns structured error when response contains malformed JSON', () => {
      const malformed = 'Not valid json: {foo: bar}'
      const result = parseAndValidateJSON(malformed, CoachResponseSchema, 'Coach')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0)
        expect(result.errors[0]).toContain('JSON parse error')
      }
    })
  })

  describe('Default Fallback Sanity Checks', () => {
    it('validates default future letter structure', () => {
      expect(DEFAULT_FUTURE_LETTER.content.length).toBeGreaterThanOrEqual(20)
      expect(DEFAULT_FUTURE_LETTER.letterType).toBe('six_month')
      expect(DEFAULT_FUTURE_LETTER.keyThemes.length).toBeGreaterThan(0)
    })

    it('validates default weekly insight structure', () => {
      expect(DEFAULT_WEEKLY_INSIGHT.summary.length).toBeGreaterThanOrEqual(15)
      expect(DEFAULT_WEEKLY_INSIGHT.recommendations.length).toBeGreaterThan(0)
      expect(DEFAULT_WEEKLY_INSIGHT.highlights.length).toBeGreaterThan(0)
    })

    it('validates default habit recommendations', () => {
      expect(DEFAULT_HABIT_RECOMMENDATIONS.recommendations.length).toBeGreaterThan(0)
      DEFAULT_HABIT_RECOMMENDATIONS.recommendations.forEach(rec => {
        expect(rec.targetValue).toBeGreaterThan(0)
        expect(rec.firstMicroStep.length).toBeGreaterThanOrEqual(5)
      })
    })

    it('validates default prediction explanation structure', () => {
      expect(DEFAULT_PREDICTION_EXPLANATION.currentPathSummary.length).toBeGreaterThanOrEqual(50)
      expect(DEFAULT_PREDICTION_EXPLANATION.improvedPathSummary.length).toBeGreaterThanOrEqual(50)
      expect(DEFAULT_PREDICTION_EXPLANATION.leveragePoints.length).toBeGreaterThan(0)
    })
  })
})
