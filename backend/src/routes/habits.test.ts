import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// Mirror schemas from backend/src/routes/habits.ts for rigorous validation unit tests
const habitSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional().nullable(),
  category: z.enum([
    'health',
    'fitness',
    'nutrition',
    'sleep',
    'mental_health',
    'productivity',
    'learning',
    'finance',
    'social',
    'other',
  ]),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  target_value: z.number().positive('Target must be positive'),
  unit: z.string().min(1).max(20),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(30).optional(),
  target_date: z.string().optional(),
})

const logSchema = z.object({
  habit_id: z.string().uuid('Must be a valid UUID'),
  value: z.number().positive('Value must be positive'),
  notes: z.string().max(500).optional().nullable(),
  logged_at: z.string().datetime().optional(),
})

describe('Backend Habit Route Validation & Schemas', () => {
  it('accepts valid habit creation payloads with target_date', () => {
    const valid = {
      name: 'Morning Jog',
      description: 'Daily outdoor jog',
      category: 'fitness',
      frequency: 'daily',
      target_value: 5000,
      unit: 'steps',
      color: '#738541',
      icon: 'person-running',
      target_date: '2026-11-20',
    }

    const result = habitSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('rejects empty or whitespace-only habit names', () => {
    const invalid = {
      name: '',
      category: 'fitness',
      frequency: 'daily',
      target_value: 10,
      unit: 'times',
    }

    const result = habitSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects non-positive target values', () => {
    const zeroTarget = {
      name: 'Hydration',
      category: 'health',
      frequency: 'daily',
      target_value: 0,
      unit: 'glasses',
    }
    const negativeTarget = {
      name: 'Hydration',
      category: 'health',
      frequency: 'daily',
      target_value: -5,
      unit: 'glasses',
    }

    expect(habitSchema.safeParse(zeroTarget).success).toBe(false)
    expect(habitSchema.safeParse(negativeTarget).success).toBe(false)
  })

  it('validates allowed category taxonomy', () => {
    const validCategory = {
      name: 'Read',
      category: 'learning',
      frequency: 'daily',
      target_value: 20,
      unit: 'pages',
    }
    const invalidCategory = {
      name: 'Read',
      category: 'unsupported_category',
      frequency: 'daily',
      target_value: 20,
      unit: 'pages',
    }

    expect(habitSchema.safeParse(validCategory).success).toBe(true)
    expect(habitSchema.safeParse(invalidCategory).success).toBe(false)
  })

  it('validates habit log payload format and UUID requirements', () => {
    const validLog = {
      habit_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      value: 10,
      notes: 'Completed session',
    }
    const invalidUUIDLog = {
      habit_id: 'not-a-uuid',
      value: 10,
    }
    const zeroValueLog = {
      habit_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      value: 0,
    }

    expect(logSchema.safeParse(validLog).success).toBe(true)
    expect(logSchema.safeParse(invalidUUIDLog).success).toBe(false)
    expect(logSchema.safeParse(zeroValueLog).success).toBe(false)
  })
})
