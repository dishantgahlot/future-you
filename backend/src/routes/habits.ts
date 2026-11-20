import { Router } from 'express'
import { z } from 'zod'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { config } from '../config/index.js'
import { asyncHandler, AppError } from '../middleware/errorHandler.js'
import { validate } from '../middleware/validation.js'
import { AuthenticatedRequest } from '../middleware/auth.js'
import { getUserHabitProgress, invalidateProgressCache } from '../services/ai/habitProgressService.js'

const router = Router()

// Fast in-memory cache for habit target values
const habitTargetCache = new Map<string, number>()

async function getHabitTarget(habitId: string): Promise<number> {
  const cached = habitTargetCache.get(habitId)
  if (cached !== undefined) return cached

  try {
    const { data } = await getSupabase()
      .from('habits')
      .select('target_value')
      .eq('id', habitId)
      .single()

    const target = data?.target_value ? Number(data.target_value) : 1
    habitTargetCache.set(habitId, target)
    return target
  } catch {
    return 1
  }
}

let _supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = config.supabase.url || 'https://dhgxiowaeldrtkwfasgl.supabase.co'
    const key = config.supabase.serviceRoleKey || config.supabase.anonKey || 'placeholder'
    _supabase = createClient(url, key)
  }
  return _supabase
}

const habitSchema = z.object({
  body: z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional().nullable(),
    category: z.enum(['health', 'fitness', 'nutrition', 'sleep', 'mental_health', 'productivity', 'learning', 'finance', 'social', 'other']),
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    target_value: z.number().positive(),
    unit: z.string().min(1).max(20),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    color_theme: z.string().optional(),
    icon: z.string().max(50).optional(),
    target_date: z.string().optional(),
  }),
})

const habitUpdateSchema = habitSchema.shape.body.partial()

const logSchema = z.object({
  body: z.object({
    habit_id: z.string().uuid(),
    value: z.number().positive(),
    notes: z.string().max(500).optional().nullable(),
    logged_at: z.string().datetime().optional(),
  }),
})

const logUpdateSchema = logSchema.shape.body.partial()

router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { category, is_active, page = '1', limit = '20' } = req.query

  let query = getSupabase()
    .from('habits')
    .select('*', { count: 'exact' })
    .eq('user_id', req.user!.id)
    .order('created_at', { ascending: false })

  if (category) query = query.eq('category', category)
  if (is_active !== undefined) query = query.eq('is_active', is_active === 'true')

  const pageNum = parseInt(page as string, 10)
  const limitNum = parseInt(limit as string, 10)
  const from = (pageNum - 1) * limitNum
  const to = from + limitNum - 1

  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) {
    console.warn('Habits query warning:', error.message)
    return res.json({
      data: [],
      total: 0,
      page: pageNum,
      page_size: limitNum,
      total_pages: 0,
    })
  }

  res.json({
    data: data || [],
    total: count || 0,
    page: pageNum,
    page_size: limitNum,
    total_pages: Math.ceil((count || 0) / limitNum),
  })
}))

router.get('/stats', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { data: habits, error } = await getSupabase()
    .from('habits')
    .select('*')
    .eq('user_id', req.user!.id)
    .eq('is_active', true)

  if (error) {
    console.warn('Habits query warning:', error.message)
    return res.json({
      data: {
        totalHabits: 0,
        activeHabits: 0,
        completionRate: 0,
        totalLogs: 0,
      },
    })
  }

  const habitIds = habits?.map(h => h.id) || []

  let completionRate = 0
  let totalLogs = 0

  if (habitIds.length > 0) {
    const { data: logs, error: logsError } = await getSupabase()
      .from('habit_logs')
      .select('habit_id, value')
      .in('habit_id', habitIds)
      .gte('logged_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    if (!logsError && logs) {
      totalLogs = logs.length
      const completed = logs.filter(l => l.value >= 1).length
      completionRate = totalLogs > 0 ? Math.round((completed / totalLogs) * 100) : 0
    }
  }

  const categoryBreakdown = habits?.reduce((acc, habit) => {
    if (!acc[habit.category]) {
      acc[habit.category] = { category: habit.category, count: 0, completion_rate: 0 }
    }
    acc[habit.category].count++
    return acc
  }, {} as Record<string, { category: string; count: number; completion_rate: number }>) || {}

  res.json({
    total_habits: habits?.length || 0,
    active_habits: habits?.filter(h => h.is_active).length || 0,
    completion_rate: completionRate,
    current_streak: 0,
    longest_streak: 0,
    total_logs: totalLogs,
    category_breakdown: Object.values(categoryBreakdown),
  })
}))

router.get('/logs/today', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const dateStr = (req.query.date as string) || new Date().toISOString().split('T')[0]
  const { data, error } = await getSupabase()
    .from('habit_logs')
    .select('*')
    .eq('user_id', req.user!.id)
    .eq('log_date', dateStr)

  if (error) {
    console.warn('Habits query warning:', error.message)
    return res.json({ data: [] })
  }
  res.json({ data: data || [] })
}))

router.get('/progress-summary', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const summary = await getUserHabitProgress(req.user!.id)
  res.json({ data: summary })
}))

router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { data, error } = await getSupabase()
    .from('habits')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user!.id)
    .single()

  if (error || !data) {
    throw new AppError(404, 'Habit not found')
  }

  res.json({ data })
}))

router.post('/', validate(habitSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const insertData: any = {
    ...req.body,
    user_id: req.user!.id,
    color: req.body.color || '#0ea5e9',
    icon: req.body.icon || '📦',
    is_active: true,
  }
  if (req.body.id) insertData.id = req.body.id
  if (req.body.target_date) insertData.target_date = req.body.target_date
  if (req.body.color_theme) insertData.color_theme = req.body.color_theme

  const { data, error } = await getSupabase()
    .from('habits')
    .insert(insertData)
    .select()
    .single()

  if (error) throw new AppError(400, error.message)

  res.status(201).json({ data })
}))

router.patch('/:id', validate(habitUpdateSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { data, error } = await getSupabase()
    .from('habits')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('user_id', req.user!.id)
    .select()
    .single()

  if (error || !data) {
    throw new AppError(404, 'Habit not found')
  }

  res.json({ data })
}))

router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  // First delete all associated logs to avoid foreign key violations
  await getSupabase()
    .from('habit_logs')
    .delete()
    .eq('habit_id', req.params.id)

  const { error } = await getSupabase()
    .from('habits')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user!.id)

  if (error) throw new AppError(400, error.message)

  res.json({ message: 'Habit deleted successfully' })
}))

router.get('/:id/logs', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { start_date, end_date, page = '1', limit = '50' } = req.query

  let query = getSupabase()
    .from('habit_logs')
    .select('*', { count: 'exact' })
    .eq('habit_id', req.params.id)
    .eq('user_id', req.user!.id)
    .order('logged_at', { ascending: false })

  if (start_date) query = query.gte('logged_at', start_date as string)
  if (end_date) query = query.lte('logged_at', end_date as string)

  const pageNum = parseInt(page as string, 10)
  const limitNum = parseInt(limit as string, 10)
  const from = (pageNum - 1) * limitNum
  const to = from + limitNum - 1

  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) {
    console.warn('Habits query warning:', error.message)
    return res.json({
      data: [],
      total: 0,
      page: pageNum,
      page_size: limitNum,
      total_pages: 0,
    })
  }

  res.json({
    data: data || [],
    total: count || 0,
    page: pageNum,
    page_size: limitNum,
    total_pages: Math.ceil((count || 0) / limitNum),
  })
}))

router.post('/:id/logs', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const habitId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
  const { date, log_date, value, actual_value, target_value, notes } = req.body

  const dateValue = date || log_date || new Date().toISOString().split('T')[0]
  const numericValue = typeof actual_value === 'number' ? actual_value : typeof value === 'number' ? value : 1

  const baseTarget = await getHabitTarget(habitId)
  const target = typeof target_value === 'number' && target_value > 0 ? target_value : baseTarget
  const progressPercentage = target > 0 ? Math.round((numericValue / target) * 100 * 10) / 10 : 0
  const isComplete = numericValue >= target

  const { data, error } = await getSupabase()
    .from('habit_logs')
    .upsert({
      habit_id: habitId,
      user_id: req.user!.id,
      log_date: dateValue,
      actual_value: numericValue,
      value: numericValue,
      target_value: target,
      progress_percentage: progressPercentage,
      completion_status: isComplete,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'habit_id,log_date' })
    .select()
    .single()

  if (error) throw new AppError(400, error.message)
  invalidateProgressCache(req.user!.id)
  res.status(201).json({ data })
}))

router.post('/logs', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { habit_id, date, log_date, logged_at, value, actual_value, target_value, notes } = req.body
  const dateValue = date || log_date || (logged_at ? logged_at.split('T')[0] : new Date().toISOString().split('T')[0])
  const numericValue = typeof actual_value === 'number' ? actual_value : typeof value === 'number' ? value : 1

  const baseTarget = await getHabitTarget(habit_id)
  const target = typeof target_value === 'number' && target_value > 0 ? target_value : baseTarget
  const progressPercentage = target > 0 ? Math.round((numericValue / target) * 100 * 10) / 10 : 0
  const isComplete = numericValue >= target

  const { data, error } = await getSupabase()
    .from('habit_logs')
    .upsert({
      habit_id,
      user_id: req.user!.id,
      log_date: dateValue,
      logged_at: logged_at || new Date().toISOString(),
      actual_value: numericValue,
      value: numericValue,
      target_value: target,
      progress_percentage: progressPercentage,
      completion_status: isComplete,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'habit_id,log_date' })
    .select()
    .single()

  if (error) throw new AppError(400, error.message)
  invalidateProgressCache(req.user!.id)
  res.status(201).json({ data })
}))

router.patch('/logs/:id', validate(logUpdateSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const updates: any = { ...req.body, updated_at: new Date().toISOString() }

  if (updates.value !== undefined || updates.actual_value !== undefined) {
    const val = typeof updates.actual_value === 'number' ? updates.actual_value : updates.value
    const { data: existingLog } = await getSupabase()
      .from('habit_logs')
      .select('habit_id')
      .eq('id', req.params.id)
      .single()

    if (existingLog?.habit_id) {
      const target = await getHabitTarget(existingLog.habit_id)
      updates.progress_percentage = target > 0 ? Math.round((val / target) * 100 * 10) / 10 : 0
      updates.completion_status = val >= target
      updates.actual_value = val
      updates.value = val
    }
  }

  const { data, error } = await getSupabase()
    .from('habit_logs')
    .update(updates)
    .eq('id', req.params.id)
    .eq('user_id', req.user!.id)
    .select()
    .single()

  if (error || !data) {
    throw new AppError(404, 'Log not found')
  }

  invalidateProgressCache(req.user!.id)
  res.json({ data })
}))

router.delete('/logs/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { error } = await getSupabase()
    .from('habit_logs')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user!.id)

  if (error) throw new AppError(400, error.message)
  invalidateProgressCache(req.user!.id)
  res.json({ message: 'Log deleted successfully' })
}))

export { router as habitRoutes }