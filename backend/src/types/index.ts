export interface Habit {
  id: string
  user_id: string
  name: string
  description: string | null
  category: HabitCategory
  frequency: Frequency
  target_value: number
  unit: string
  color: string
  icon: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type HabitCategory =
  | 'health'
  | 'fitness'
  | 'nutrition'
  | 'sleep'
  | 'mental_health'
  | 'productivity'
  | 'learning'
  | 'finance'
  | 'social'
  | 'other'

export type Frequency = 'daily' | 'weekly' | 'monthly'

export interface HabitLog {
  id: string
  habit_id: string
  user_id: string
  value: number
  notes: string | null
  logged_at: string
  created_at: string
}

export interface Prediction {
  id: string
  user_id: string
  habit_id: string | null
  prediction_type: PredictionType
  timeframe: Timeframe
  predicted_value: number
  confidence: number
  factors: PredictionFactor[]
  created_at: string
}

export type PredictionType =
  | 'habit_streak'
  | 'habit_completion'
  | 'category_trend'
  | 'overall_score'
  | 'milestone'

export type Timeframe = 'week' | 'month' | 'quarter' | 'year'

export interface PredictionFactor {
  name: string
  impact: number
  description: string
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  date_of_birth: string | null
  timezone: string
  preferences: UserPreferences
  created_at: string
  updated_at: string
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  notifications: boolean
  weekly_report: boolean
  predictions: boolean
}

export interface ApiResponse<T> {
  data: T | null
  error: string | null
  meta?: Record<string, unknown>
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface DashboardStats {
  total_habits: number
  active_habits: number
  completion_rate: number
  current_streak: number
  longest_streak: number
  total_logs: number
  category_breakdown: CategoryStat[]
}

export interface CategoryStat {
  category: HabitCategory
  count: number
  completion_rate: number
}