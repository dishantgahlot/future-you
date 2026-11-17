import {
  faAward,
  faFire,
  faBrain,
  faDumbbell,
  faMoon,
  faDroplet,
  faStar,
  faTrophy,
} from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import type { Habit, HabitLog } from '../types'

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'amethyst'

export interface AchievementBadge {
  id: string
  title: string
  desc: string
  category: 'starter' | 'streak' | 'focus' | 'fitness' | 'sleep' | 'hydration' | 'mastery' | 'milestone'
  tier: BadgeTier
  tierLabel: string
  multiplier?: string
  icon: IconDefinition
  isUnlocked: boolean
  progress: number
  maxProgress: number
  unlockedDate?: string
  colors: {
    outerRing: string
    innerHighlight: string
    bgGradient: [string, string]
    accent: string
    text: string
  }
}

const TIER_COLORS: Record<BadgeTier, AchievementBadge['colors']> = {
  bronze: {
    outerRing: '#D97706',
    innerHighlight: '#FDE68A',
    bgGradient: ['#FFFBEB', '#FEF3C7'],
    accent: '#B45309',
    text: '#92400E',
  },
  silver: {
    outerRing: '#94A3B8',
    innerHighlight: '#F1F5F9',
    bgGradient: ['#F8FAFC', '#E2E8F0'],
    accent: '#475569',
    text: '#334155',
  },
  gold: {
    outerRing: '#F59E0B',
    innerHighlight: '#FEF3C7',
    bgGradient: ['#FFFBEB', '#FDE68A'],
    accent: '#D97706',
    text: '#B45309',
  },
  amethyst: {
    outerRing: '#8B5CF6',
    innerHighlight: '#EDE9FE',
    bgGradient: ['#FAF5FF', '#DDD6FE'],
    accent: '#7C3AED',
    text: '#6D28D9',
  },
}

/**
 * Calculates user achievements dynamically from habits and logs
 */
export function calculateUserBadges(
  habits: Habit[],
  logs: HabitLog[],
  currentStreak: number
): {
  badges: AchievementBadge[]
  unlockedCount: number
  totalCount: number
  latestBadge?: AchievementBadge
} {
  const completedLogs = logs.filter((l) => l.completion_status)
  const totalCompleted = completedLogs.length

  // Categorized log counts
  const sleepLogs = completedLogs.filter((l) => {
    const h = habits.find((hb) => hb.id === l.habit_id)
    return h?.category === 'sleep' || h?.name.toLowerCase().includes('sleep')
  }).length

  const fitnessLogs = completedLogs.filter((l) => {
    const h = habits.find((hb) => hb.id === l.habit_id)
    return h?.category === 'fitness' || h?.name.toLowerCase().includes('exercise') || h?.name.toLowerCase().includes('workout')
  }).length

  const learningLogs = completedLogs.filter((l) => {
    const h = habits.find((hb) => hb.id === l.habit_id)
    return h?.category === 'learning' || h?.category === 'productivity' || h?.name.toLowerCase().includes('study')
  }).length

  const hydrationLogs = completedLogs.filter((l) => {
    const h = habits.find((hb) => hb.id === l.habit_id)
    return h?.category === 'health' || h?.name.toLowerCase().includes('hydrat') || h?.name.toLowerCase().includes('water')
  }).length

  // Check if any date has 100% completion across active habits
  const activeHabitIds = new Set(habits.filter((h) => h.is_active).map((h) => h.id))
  const logsByDate = new Map<string, Set<string>>()
  completedLogs.forEach((l) => {
    if (activeHabitIds.has(l.habit_id)) {
      if (!logsByDate.has(l.log_date)) logsByDate.set(l.log_date, new Set())
      logsByDate.get(l.log_date)!.add(l.habit_id)
    }
  })

  let perfectDaysCount = 0
  if (activeHabitIds.size > 0) {
    logsByDate.forEach((completedIds) => {
      if (completedIds.size >= activeHabitIds.size) {
        perfectDaysCount++
      }
    })
  }

  const badges: AchievementBadge[] = [
    // 1. Quickdraw / Early Sprout
    {
      id: 'badge-early-sprout',
      title: 'Quickdraw Sprout',
      desc: 'Logged your very first daily habit check-in.',
      category: 'starter',
      tier: 'bronze',
      tierLabel: 'Bronze',
      multiplier: 'x1',
      icon: faAward,
      isUnlocked: totalCompleted >= 1,
      progress: Math.min(totalCompleted, 1),
      maxProgress: 1,
      unlockedDate: 'Nov 7, 2026',
      colors: TIER_COLORS.bronze,
    },
    // 2. Streak Shark (Consistency Streak)
    {
      id: 'badge-streak-shark',
      title: 'Streak Shark',
      desc: 'Achieved an unbroken 3-day consistency streak across habits.',
      category: 'streak',
      tier: currentStreak >= 7 ? 'gold' : currentStreak >= 3 ? 'silver' : 'bronze',
      tierLabel: currentStreak >= 7 ? 'Gold' : currentStreak >= 3 ? 'Silver' : 'Bronze',
      multiplier: currentStreak >= 7 ? 'x3' : 'x2',
      icon: faFire,
      isUnlocked: currentStreak >= 3,
      progress: Math.min(currentStreak, 7),
      maxProgress: 7,
      unlockedDate: currentStreak >= 3 ? 'Nov 12, 2026' : undefined,
      colors: currentStreak >= 7 ? TIER_COLORS.gold : TIER_COLORS.silver,
    },
    // 3. Galaxy Brain (Focus & Study)
    {
      id: 'badge-galaxy-brain',
      title: 'Galaxy Brain',
      desc: 'Logged 5 deep-focus reading or study sessions.',
      category: 'focus',
      tier: 'amethyst',
      tierLabel: 'Amethyst',
      multiplier: 'x2',
      icon: faBrain,
      isUnlocked: learningLogs >= 5,
      progress: Math.min(learningLogs, 5),
      maxProgress: 5,
      unlockedDate: learningLogs >= 5 ? 'Nov 14, 2026' : undefined,
      colors: TIER_COLORS.amethyst,
    },
    // 4. Arctic Iron (Fitness Discipline)
    {
      id: 'badge-iron-will',
      title: 'Arctic Iron',
      desc: 'Completed 5 physical fitness or workout routines.',
      category: 'fitness',
      tier: 'silver',
      tierLabel: 'Silver',
      multiplier: 'x2',
      icon: faDumbbell,
      isUnlocked: fitnessLogs >= 5,
      progress: Math.min(fitnessLogs, 5),
      maxProgress: 5,
      unlockedDate: fitnessLogs >= 5 ? 'Nov 14, 2026' : undefined,
      colors: TIER_COLORS.silver,
    },
    // 5. Night Owl Tamer (Restorative Sleep)
    {
      id: 'badge-night-owl',
      title: 'Night Owl Tamer',
      desc: 'Logged restorative 7.5+ hour sleep cycles 5 times.',
      category: 'sleep',
      tier: 'amethyst',
      tierLabel: 'Amethyst',
      icon: faMoon,
      isUnlocked: sleepLogs >= 5,
      progress: Math.min(sleepLogs, 5),
      maxProgress: 5,
      unlockedDate: sleepLogs >= 5 ? 'Nov 15, 2026' : undefined,
      colors: TIER_COLORS.amethyst,
    },
    // 6. Aqua Vitality (Hydration)
    {
      id: 'badge-aqua-vitality',
      title: 'Aqua Vitality',
      desc: 'Reached your daily hydration target 5 times.',
      category: 'hydration',
      tier: 'bronze',
      tierLabel: 'Bronze',
      icon: faDroplet,
      isUnlocked: hydrationLogs >= 5,
      progress: Math.min(hydrationLogs, 5),
      maxProgress: 5,
      unlockedDate: hydrationLogs >= 5 ? 'Nov 15, 2026' : undefined,
      colors: TIER_COLORS.bronze,
    },
    // 7. Starstruck Perfectionist (All Habits Complete)
    {
      id: 'badge-starstruck',
      title: 'Starstruck',
      desc: 'Achieved 100% completion across all habits in a single day.',
      category: 'mastery',
      tier: 'gold',
      tierLabel: 'Gold',
      multiplier: 'x1',
      icon: faStar,
      isUnlocked: perfectDaysCount >= 1,
      progress: Math.min(perfectDaysCount, 3),
      maxProgress: 3,
      unlockedDate: perfectDaysCount >= 1 ? 'Nov 16, 2026' : undefined,
      colors: TIER_COLORS.gold,
    },
    // 8. Century Club (100 Logs)
    {
      id: 'badge-century-club',
      title: 'Century Club',
      desc: 'Record 100 total habit completions on Future You.',
      category: 'milestone',
      tier: 'gold',
      tierLabel: 'Gold',
      icon: faTrophy,
      isUnlocked: totalCompleted >= 100,
      progress: Math.min(totalCompleted, 100),
      maxProgress: 100,
      unlockedDate: totalCompleted >= 100 ? 'Nov 16, 2026' : undefined,
      colors: TIER_COLORS.gold,
    },
  ]

  const unlockedCount = badges.filter((b) => b.isUnlocked).length
  const latestBadge = [...badges].reverse().find((b) => b.isUnlocked) || badges[0]

  return {
    badges,
    unlockedCount,
    totalCount: badges.length,
    latestBadge,
  }
}
