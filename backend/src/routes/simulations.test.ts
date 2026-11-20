import { describe, it, expect } from 'vitest'
import { z } from 'zod'

const runSimulationSchema = z.object({
  baseProfile: z.any().optional(),
  changes: z.array(z.object({
    metric: z.enum([
      'sleepHours',
      'studyHours',
      'screenTimeHours',
      'exerciseMinutes',
      'spending',
      'habitCompletionRate',
      'consistencyScore',
    ]),
    currentValue: z.number(),
    simulatedValue: z.number(),
    timelineMonths: z.number().int().positive().optional(),
    difficulty: z.enum(['easy', 'moderate', 'hard']).optional(),
  })).min(1),
  assumptions: z.object({}).optional(),
  horizon: z.enum(['6_months', '5_years', 'both']).default('both'),
})

const saveSimulationSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  changes: z.array(z.object({
    metric: z.string(),
    currentValue: z.number(),
    simulatedValue: z.number(),
    timelineMonths: z.number().int().positive().optional(),
  })).min(1),
  results: z.any(),
})

describe('Simulation Route Validation Suite', () => {
  describe('Run Simulation Schema', () => {
    it('accepts valid single change simulation request', () => {
      const valid = {
        changes: [
          {
            metric: 'sleepHours',
            currentValue: 6.5,
            simulatedValue: 8.0,
            timelineMonths: 6,
            difficulty: 'moderate',
          },
        ],
        horizon: '6_months',
      }
      const result = runSimulationSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('accepts multi-metric changes simulation request', () => {
      const valid = {
        changes: [
          { metric: 'exerciseMinutes', currentValue: 15, simulatedValue: 45 },
          { metric: 'screenTimeHours', currentValue: 5, simulatedValue: 2 },
        ],
        horizon: 'both',
      }
      const result = runSimulationSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('rejects empty changes array', () => {
      const invalid = {
        changes: [],
        horizon: '6_months',
      }
      const result = runSimulationSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('rejects unrecognized metric names', () => {
      const invalid = {
        changes: [
          {
            metric: 'invalidMetricName',
            currentValue: 1,
            simulatedValue: 2,
          },
        ],
      }
      const result = runSimulationSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })
  })

  describe('Save Simulation Schema', () => {
    it('accepts valid simulation save payload', () => {
      const valid = {
        name: 'Optimal Health 2027 Scenario',
        description: 'Simulating 8h sleep and 45m daily exercise',
        changes: [
          { metric: 'sleepHours', currentValue: 6.5, simulatedValue: 8.0, timelineMonths: 6 },
        ],
        results: { projectedScore: 89, confidence: 0.9 },
      }
      const result = saveSimulationSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('rejects simulation save without a name', () => {
      const invalid = {
        name: '',
        changes: [{ metric: 'sleepHours', currentValue: 6.5, simulatedValue: 8.0 }],
        results: {},
      }
      const result = saveSimulationSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })
  })
})
