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
  color_theme?: string
  icon: string
  is_active: boolean
  target_date?: string
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
  log_date: string
  actual_value: number
  value?: number
  target_value?: number
  progress_percentage?: number
  completion_status: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface HabitProgressItem {
  id: string
  name: string
  category: string
  frequency: string
  targetValue: number
  unit: string
  color?: string
  icon?: string
  latestDate?: string
  latestActualValue: number
  latestProgressPercentage: number
  averageProgressPercentage: number
  completionRate: number
  totalLogs: number
  currentStreak: number
  longestStreak: number
  trend: 'improving' | 'declining' | 'stable'
  progressTier: 'full' | 'high_partial' | 'moderate_partial' | 'started' | 'unstarted'
}

export interface UserHabitProgressSummary {
  userId: string
  overallProgressPercentage: number
  fullCompletionRate: number
  habits: HabitProgressItem[]
  distribution: {
    fullCount: number
    highPartialCount: number
    moderateCount: number
    startedCount: number
    unstartedCount: number
  }
  recentLogs: Array<{
    habitId: string
    habitName: string
    date: string
    actualValue: number
    targetValue: number
    progressPercentage: number
  }>
  generatedAt: string
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

export interface Scenario {
  id: string
  user_id: string
  name: string
  scenario_type: ScenarioType
  assumptions: Record<string, unknown>
  projected_results: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type ScenarioType =
  | 'career'
  | 'financial'
  | 'health'
  | 'lifestyle'
  | 'custom'

export interface FutureLetter {
  id: string
  user_id: string
  letter_type: 'six_month' | 'five_year' | 'current_path'
  content: string
  prompt_context?: Record<string, unknown>
  key_themes?: string[]
  action_items?: string[]
  generated_at: string
  cached?: boolean
  usedFallback?: boolean
}

export interface WeeklyInsight {
  id: string
  user_id: string
  week_start: string
  insight: string
  summary: string
  highlights: string[]
  lowlights: string[]
  recommendations: string[]
  prompt_context?: Record<string, unknown>
  generated_at: string
  cached?: boolean
  usedFallback?: boolean
}

export interface CoachSession {
  id: string
  user_id: string
  question: string
  answer: string
  context_type: string
  context_data?: Record<string, unknown>
  generated_at: string
  follow_up_questions?: string[]
  suggested_actions?: string[]
  usedFallback?: boolean
}

export interface HabitRecommendation {
  name: string
  category: string
  frequency: 'daily' | 'weekly' | 'monthly'
  targetValue: number
  unit: string
  why: string
  difficulty: 'easy' | 'moderate' | 'hard'
  expectedImpact: 'high' | 'medium' | 'low'
  firstMicroStep: string
}

export interface PredictionExplanation {
  currentPathSummary: string
  improvedPathSummary: string
  leveragePoints: Array<{ habit: string; impact: string; why: string }>
  feasibilityExplanation: string
  breakEvenExplanation: string
  uncertaintyExplanation: string
  closing: string
}

export interface CoachResponse {
  answer: string
  followUpQuestions?: string[]
  suggestedActions?: string[]
  sessionId: string
  usedFallback: boolean
}

export interface FutureLetterResponse {
  letter: FutureLetter
  cached: boolean
  usedFallback: boolean
}

export interface WeeklyInsightResponse {
  insight: WeeklyInsight
  cached: boolean
  usedFallback: boolean
}

export interface HabitRecommendationsResponse {
  recommendations: HabitRecommendation[]
  usedFallback: boolean
}

export interface PredictionExplanationResponse {
  explanation: PredictionExplanation
  usedFallback: boolean
}

export interface UserProfile {
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
  onboarding_completed: boolean
  focus_categories: string[]
  timezone: string
  units: 'metric' | 'imperial'
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

export interface ChartDataPoint {
  date: string
  value: number
  label?: string
}

export interface WeeklyDataPoint {
  day: string
  date: string
  completion: number
  target: number
  is_today: boolean
}

export interface HeatmapDataPoint {
  habit_id: string
  habit_name: string
  habit_color: string
  date: string
  value: number
  completed: boolean
}

export interface ApiResponse<T> {
  data: T | null
  error: string | null
  meta?: Record<string, unknown>
}

// Analytics types
export interface DailyCompletion {
  date: string
  day: string
  completed: number
  total: number
  completionRate: number
}

export interface PeriodComparison {
  current: number
  previous: number
  change: number
  changePercent: number
}

export interface WeeklyAnalytics {
  period: { start: string; end: string }
  dailyCompletion: DailyCompletion[]
  totalHabits: number
  averageCompletion: number
  previousPeriodComparison: PeriodComparison
}

export interface WeeklyAverage {
  week: number
  startDate: string
  endDate: string
  averageCompletion: number
  totalLogs: number
}

export interface MonthlyAnalytics {
  period: { year: number; month: number; start: string; end: string }
  weeklyAverages: WeeklyAverage[]
  totalHabits: number
  averageCompletion: number
  previousPeriodComparison: PeriodComparison
}

export interface HabitCompletion {
  habitId: string
  habitName: string
  category: string
  color: string
  icon: string
  targetValue: number
  unit: string
  totalLogs: number
  completedLogs: number
  completionRate: number
  averageValue: number
}

export interface HabitConsistency {
  habitId: string
  habitName: string
  category: string
  color: string
  icon: string
  totalDays: number
  loggedDays: number
  consistencyRate: number
  longestStreak: number
  currentStreak: number
}

export interface HabitStreak {
  habitId: string
  habitName: string
  category: string
  color: string
  icon: string
  currentStreak: number
  longestStreak: number
}

export interface StreaksAnalytics {
  currentStreak: number
  longestStreak: number
  habitStreaks: HabitStreak[]
  overall: {
    currentStreak: number
    longestStreak: number
  }
}

export interface LifeImpactDimension {
  name: string
  key: string
  score: number
  weight: number
  description: string
  relevantCategories: string[]
  habitsCount: number
  completionRate: number
  consistencyRate: number
}

export interface LifeImpactScore {
  overall: number
  dimensions: LifeImpactDimension[]
  disclaimer: string
}

export interface HabitRipple {
  id: string
  sourceHabit: string
  sourceCategory: string
  targetHabit: string
  targetCategory: string
  correlation: number
  type: 'observed' | 'hypothetical'
  description: string
  direction: 'positive' | 'negative'
}

export interface AverageDailyProgress {
  date: string
  averageProgress: number
  totalHabits: number
  completedHabits: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// Habit form types
export interface HabitFormData {
  name: string
  description: string
  category: HabitCategory
  frequency: Frequency
  target_value: number
  unit: string
  color: string
  color_theme?: string
  icon: string
}

// Category options for UI
export const HABIT_CATEGORIES: { value: HabitCategory; label: string; icon: string; color: string }[] = [
  { value: 'health', label: 'Health', icon: 'heart-pulse', color: 'text-red-500' },
  { value: 'fitness', label: 'Fitness', icon: 'dumbbell', color: 'text-green-500' },
  { value: 'nutrition', label: 'Nutrition', icon: 'apple-whole', color: 'text-amber-500' },
  { value: 'sleep', label: 'Sleep', icon: 'moon', color: 'text-indigo-500' },
  { value: 'mental_health', label: 'Mental Health', icon: 'spa', color: 'text-purple-500' },
  { value: 'productivity', label: 'Productivity', icon: 'mobile-screen', color: 'text-blue-500' },
  { value: 'learning', label: 'Learning', icon: 'book-open', color: 'text-cyan-500' },
  { value: 'finance', label: 'Finance', icon: 'coins', color: 'text-emerald-500' },
  { value: 'social', label: 'Social', icon: 'users', color: 'text-pink-500' },
  { value: 'other', label: 'Other', icon: 'seedling', color: 'text-gray-500' },
]

export const FREQUENCIES: { value: Frequency; label: string; description: string }[] = [
  { value: 'daily', label: 'Daily', description: 'Every day' },
  { value: 'weekly', label: 'Weekly', description: 'Once per week' },
  { value: 'monthly', label: 'Monthly', description: 'Once per month' },
]

export const HABIT_COLORS = [
  '#10b981', // emerald
  '#0ea5e9', // sky
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#14b8a6', // teal
  '#f97316', // orange
  '#6366f1', // indigo
  '#e11d48', // rose
  '#06b6d4', // cyan
]

export const HABIT_ICONS = [
  'droplet', 'dumbbell', 'book-open', 'spa', 'moon', 'list-check', 'apple-whole', 'fire', 'seedling', 'mug-saucer',
  'capsules', 'person-walking', 'pen-to-square', 'palette', 'music', 'coins', 'users', 'house', 'leaf', 'star'
]

// Default units per category
export const CATEGORY_DEFAULT_UNITS: Record<HabitCategory, string> = {
  health: 'times',
  fitness: 'minutes',
  nutrition: 'servings',
  sleep: 'hours',
  mental_health: 'minutes',
  productivity: 'tasks',
  learning: 'pages',
  finance: 'dollars',
  social: 'times',
  other: 'times',
}