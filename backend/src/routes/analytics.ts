import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler, AppError } from '../middleware/errorHandler.js'
import { AuthenticatedRequest } from '../middleware/auth.js'
import {
  calculateWeeklyAnalytics,
  calculateMonthlyAnalytics,
  calculateHabitCompletion,
  calculateHabitConsistency,
  calculateStreaksAnalytics,
  calculateLifeImpactScore,
  calculateHabitRipples,
  calculateAverageDailyProgress,
} from '../services/analytics.js'

const router = Router()

// Validation schemas
const weeklyQuerySchema = z.object({
  query: z.object({
    start: z.string().date().optional(),
    end: z.string().date().optional(),
  }),
})

const monthlyQuerySchema = z.object({
  query: z.object({
    year: z.coerce.number().int().min(2020).max(2100).optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
  }),
})

const periodQuerySchema = z.object({
  query: z.object({
    start: z.string().date().optional(),
    end: z.string().date().optional(),
  }),
})

function getDefaultWeekRange() {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - 6)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

function getDefaultMonthRange() {
  const now = new Date()
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  }
}

// GET /api/analytics/weekly
router.get('/weekly', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { start, end } = weeklyQuerySchema.parse(req).query
  const { start: defaultStart, end: defaultEnd } = getDefaultWeekRange()

  const startDate = start || defaultStart
  const endDate = end || defaultEnd

  const analytics = await calculateWeeklyAnalytics(req.user!.id, startDate, endDate)
  res.json({ data: analytics })
}))

// GET /api/analytics/monthly
router.get('/monthly', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { year, month } = monthlyQuerySchema.parse(req).query
  const { year: defaultYear, month: defaultMonth } = getDefaultMonthRange()

  const targetYear = year || defaultYear
  const targetMonth = month || defaultMonth

  const analytics = await calculateMonthlyAnalytics(req.user!.id, targetYear, targetMonth)
  res.json({ data: analytics })
}))

// GET /api/analytics/completion
router.get('/completion', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { start, end } = periodQuerySchema.parse(req).query
  const { start: defaultStart, end: defaultEnd } = getDefaultWeekRange()

  const startDate = start || defaultStart
  const endDate = end || defaultEnd

  const completion = await calculateHabitCompletion(req.user!.id, startDate, endDate)
  res.json({ data: completion })
}))

// GET /api/analytics/consistency
router.get('/consistency', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { start, end } = periodQuerySchema.parse(req).query
  const { start: defaultStart, end: defaultEnd } = getDefaultWeekRange()

  const startDate = start || defaultStart
  const endDate = end || defaultEnd

  const consistency = await calculateHabitConsistency(req.user!.id, startDate, endDate)
  res.json({ data: consistency })
}))

// GET /api/analytics/streaks
router.get('/streaks', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { start, end } = periodQuerySchema.parse(req).query
  const { start: defaultStart, end: defaultEnd } = getDefaultWeekRange()

  const startDate = start || defaultStart
  const endDate = end || defaultEnd

  const streaks = await calculateStreaksAnalytics(req.user!.id, startDate, endDate)
  res.json({ data: streaks })
}))

// GET /api/analytics/life-impact
router.get('/life-impact', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { start, end } = periodQuerySchema.parse(req).query
  const { start: defaultStart, end: defaultEnd } = getDefaultWeekRange()

  const startDate = start || defaultStart
  const endDate = end || defaultEnd

  const lifeImpact = await calculateLifeImpactScore(req.user!.id, startDate, endDate)
  res.json({ data: lifeImpact })
}))

// GET /api/analytics/ripples
router.get('/ripples', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { start, end } = periodQuerySchema.parse(req).query
  const { start: defaultStart, end: defaultEnd } = getDefaultWeekRange()

  const startDate = start || defaultStart
  const endDate = end || defaultEnd

  const ripples = await calculateHabitRipples(req.user!.id, startDate, endDate)
  res.json({ data: ripples })
}))

// GET /api/analytics/daily-progress
router.get('/daily-progress', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { start, end } = periodQuerySchema.parse(req).query
  const { start: defaultStart, end: defaultEnd } = getDefaultWeekRange()

  const startDate = start || defaultStart
  const endDate = end || defaultEnd

  const progress = await calculateAverageDailyProgress(req.user!.id, startDate, endDate)
  res.json({ data: progress })
}))

export { router as analyticsRoutes }