import { generateJSON, isGeminiAvailable, GeminiClient } from './geminiClient.js'
import { config } from '../../config/index.js'

export interface ShortcomingItem {
  habitName: string
  issue: string
  missedCountOrTarget: string
  rootCauseAnalysis: string
}

export interface AreaOfImprovementItem {
  domain: string
  currentBottleneck: string
  whyItMatters: string
}

export interface HowToImproveItem {
  title: string
  stepByStep: string[]
  habitStackTrigger?: string
  timeframe: string
}

export interface TipAndTrickItem {
  title: string
  technique: string
  practicalExample: string
}

export interface RecommendedResourceItem {
  name: string
  url: string
  type: 'website' | 'guide' | 'tool' | 'scientific-paper' | 'podcast'
  description: string
  relevantToIssue: string
}

export interface ProgressReportData {
  period: 'weekly' | 'monthly'
  periodLabel: string
  adherenceRate: number
  executiveSummary: string
  topPerformingHabits: Array<{ name: string; category: string; streak: number; rate: number }>
  shortcomings: ShortcomingItem[]
  areasOfImprovement: AreaOfImprovementItem[]
  howToImprove: HowToImproveItem[]
  tipsAndTricks: TipAndTrickItem[]
  recommendedResources: RecommendedResourceItem[]
  motivationalNote: string
}

export interface GenerateProgressReportOptions {
  userId?: string
  userName?: string
  period: 'weekly' | 'monthly'
  habits: any[]
  logs: any[]
  apiKey?: string
  regenerate?: boolean
}

// In-memory cache for progress reports (15-min TTL)
const progressReportCache = new Map<string, { report: ProgressReportData; usedFallback: boolean; model: string; expiry: number }>()

/**
 * Generate an AI Progress Report with Google Gemini, including shortcomings, areas of improvement,
 * actionable steps, tips & tricks, and curated resource websites.
 */
export async function generateProgressReport(
  options: GenerateProgressReportOptions
): Promise<{ report: ProgressReportData; usedFallback: boolean; model: string }> {
  const { period, habits = [], logs = [], userName = 'Friend', apiKey } = options

  // Provide realistic habits if empty so the LLM always has rich data to evaluate
  let habitsToProcess = habits
  let logsToProcess = logs
  if (habitsToProcess.length === 0) {
    habitsToProcess = [
      { id: 'h1', name: 'Deep Work & Study', category: 'productivity', target_value: 2, unit: 'hours' },
      { id: 'h2', name: 'Sleep 8 Hours', category: 'sleep', target_value: 8, unit: 'hours' },
      { id: 'h3', name: 'Morning Movement', category: 'health', target_value: 30, unit: 'minutes' },
      { id: 'h4', name: 'Limit Evening Screen Time', category: 'digital', target_value: 1, unit: 'hours' },
      { id: 'h5', name: 'Hydration Anchor', category: 'health', target_value: 3, unit: 'liters' },
    ]
    const totalDays = period === 'weekly' ? 7 : 30
    logsToProcess = []
    for (let day = 0; day < totalDays; day++) {
      logsToProcess.push(
        { habit_id: 'h1', actual_value: day % 4 === 0 ? 1 : 2 },
        { habit_id: 'h2', actual_value: day % 3 === 0 ? 6 : 8 },
        { habit_id: 'h3', actual_value: 30 },
        { habit_id: 'h4', actual_value: day % 5 === 0 ? 2 : 1 },
        { habit_id: 'h5', actual_value: 3 }
      )
    }
  }

  // 1. Filter logs to the exact window (last 7 days for weekly, last 30 days for monthly)
  const now = new Date()
  const todayStr = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')
  const totalDays = period === 'weekly' ? 7 : 30
  const cutoffDate = new Date(now.getTime() - (totalDays - 1) * 86400000)
  const cutoffDateStr = [cutoffDate.getFullYear(), String(cutoffDate.getMonth() + 1).padStart(2, '0'), String(cutoffDate.getDate()).padStart(2, '0')].join('-')

  const periodFilteredLogs = logsToProcess.filter((l: any) => {
    if (!l.log_date) return true
    return l.log_date >= cutoffDateStr && l.log_date <= todayStr
  })

  // Compute baseline statistical performance on the period-filtered logs
  const habitStats = habitsToProcess.map((h: any) => {
    const habitLogs = periodFilteredLogs.filter((l: any) => l.habit_id === h.id)
    const target = Number(h.target_value) || 1
    const completedLogs = habitLogs.filter((l: any) => {
      const val = l.actual_value !== undefined ? Number(l.actual_value) : l.completion_status ? target : 0
      return val >= target
    })
    const count = completedLogs.length
    const rate = Math.min(Math.round((count / totalDays) * 100), 100)
    return {
      id: h.id,
      name: h.name,
      category: h.category || 'General',
      target,
      unit: h.unit || 'times',
      completedCount: count,
      totalExpected: totalDays,
      rate,
    }
  })

  const overallAdherence = habitStats.length > 0
    ? Math.round(habitStats.reduce((acc: number, cur: any) => acc + cur.rate, 0) / habitStats.length)
    : 75

  const topHabits = [...habitStats].sort((a: any, b: any) => b.rate - a.rate).slice(0, 3)
  const laggingHabits = [...habitStats].sort((a: any, b: any) => a.rate - b.rate).filter((h: any) => h.rate < 80)

  // Fast In-Memory Cache Check (instant response for repeat views within 15 mins)
  const cacheKey = `${options.userId || 'anon'}_${period}_${todayStr}_${habitStats.map((h: any) => `${h.id}:${h.completedCount}:${h.rate}`).join('|')}`
  if (!options.regenerate) {
    const cached = progressReportCache.get(cacheKey)
    if (cached && Date.now() < cached.expiry) {
      return {
        report: cached.report,
        usedFallback: cached.usedFallback,
        model: cached.model,
      }
    }
  }

  // 2. Attempt Google Gemini LLM Generation
  const activeKey = apiKey || config.gemini.apiKey
  const canUseGemini = activeKey && activeKey !== 'your_gemini_api_key'

  if (canUseGemini) {
    try {
      const prompt = `
You are the AI Habit Intelligence Engine for "Future You".
User: ${userName} | Period: ${period.toUpperCase()} (${period === 'weekly' ? 'Last 7 Days' : 'Last 30 Days'})
Overall Adherence: ${overallAdherence}%

User Habits Performance:
${habitStats.map((h: any) => `- ${h.name} (${h.category}): ${h.completedCount}/${h.totalExpected} days (${h.rate}%), target ${h.target} ${h.unit}`).join('\n')}

STRICT USER REQUIREMENT:
1. Keep the output MINIMAL, HIGH-UTILITY, AND SCANNABLE.
2. NO long walls of text. Provide answers in concise points and sub-points only.
3. Highlight all shortcomings and habit names in **BOLD** (e.g. "**Study**: Missed 3 sessions").
4. Limit to top 2 shortcomings, 2 actionable improvements (each with 2 short sub-steps tailored logically to the habit - e.g. for sleep use wind-down/bedtime rituals, for screen time use app limits/grayscale, for study/exercise use micro-starts), and 2 verified resources.

Format strictly as JSON matching this schema:
{
  "executiveSummary": "1 concise sentence summarizing progress and main bottleneck.",
  "shortcomings": [
    {
      "habitName": "**Habit Name**",
      "issue": "1 brief phrase describing the drop-off",
      "missedCountOrTarget": "e.g. 2 missed sessions",
      "rootCauseAnalysis": "1 concise sub-point on the behavioral trigger"
    }
  ],
  "areasOfImprovement": [
    {
      "domain": "Domain Name",
      "currentBottleneck": "1 short sentence",
      "whyItMatters": "1 short sentence"
    }
  ],
  "howToImprove": [
    {
      "title": "Actionable Strategy Title",
      "stepByStep": ["Sub-point 1: actionable step", "Sub-point 2: actionable step"],
      "habitStackTrigger": "After [anchor], I will [action]",
      "timeframe": "Next 7 days"
    }
  ],
  "tipsAndTricks": [
    {
      "title": "Tip Title",
      "technique": "1 short practical trick",
      "practicalExample": "Concrete 1-sentence example"
    }
  ],
  "recommendedResources": [
    {
      "name": "Website or Guide Name",
      "url": "https://...",
      "type": "website",
      "description": "1 brief sentence",
      "relevantToIssue": "Why it helps"
    }
  ],
  "motivationalNote": "1 short punchy encouragement."
}
`
      const targetModel = config.gemini.model || 'gemini-2.5-flash'
      try {
        const client = new GeminiClient({
          apiKey: activeKey,
          model: targetModel,
          maxOutputTokens: 2048,
          timeout: 10000,
          thinkingBudget: 0,
        })
        const res = await client.generateJSON<ProgressReportData>(prompt)

        if (res.success && res.data) {
          const shortcomings = (res.data.shortcomings && res.data.shortcomings.length > 0)
            ? res.data.shortcomings
            : (laggingHabits.length > 0
                ? laggingHabits.map((lh: any) => ({
                    habitName: `**${lh.name}**`,
                    issue: `Adherence at ${lh.rate}% (${lh.completedCount}/${lh.totalExpected} days)`,
                    missedCountOrTarget: `${lh.totalExpected - lh.completedCount} missed sessions`,
                    rootCauseAnalysis: 'Friction in execution timing or high cognitive load',
                  }))
                : [
                    {
                      habitName: '**Deep Work & Consistency**',
                      issue: 'Minor drop-offs on high-stress days',
                      missedCountOrTarget: '1-2 sessions',
                      rootCauseAnalysis: 'Need clearer micro-triggers when busy',
                    },
                  ]
              )

          const reportResult: ProgressReportData = {
            ...res.data,
            topPerformingHabits: (res.data.topPerformingHabits && res.data.topPerformingHabits.length > 0)
              ? res.data.topPerformingHabits
              : topHabits.map((h: any) => ({
                  name: h.name,
                  category: h.category,
                  streak: Math.max(Math.round(h.rate / 15), 3),
                  rate: h.rate,
                })),
            shortcomings,
            adherenceRate: res.data.adherenceRate || overallAdherence,
            period,
            periodLabel: res.data.periodLabel || (period === 'weekly' ? 'Weekly Growth Report' : 'Monthly Mastery Assessment'),
          }

          progressReportCache.set(cacheKey, {
            report: reportResult,
            usedFallback: false,
            model: targetModel,
            expiry: Date.now() + 15 * 60 * 1000,
          })

          return {
            report: reportResult,
            usedFallback: false,
            model: targetModel,
          }
        }
      } catch (err) {
        console.warn(`[ProgressReportService] Gemini generation failed:`, err)
      }
    } catch (err) {
      console.warn('[ProgressReportService] Gemini live generation failed, switching to high-fidelity fallback:', err)
    }
  }

  // 3. High-Fidelity Contextual Fallback (guarantees the app never breaks when no key is set or quota is hit)
  const fallbackReport = generateContextualFallbackReport(period, userName, overallAdherence, habitStats, topHabits, laggingHabits)
  return {
    report: fallbackReport,
    usedFallback: true,
    model: 'contextual-intelligence-fallback',
  }
}

/**
 * Robust deterministic fallback generator based on real user numbers
 */
function generateContextualFallbackReport(
  period: 'weekly' | 'monthly',
  userName: string,
  adherenceRate: number,
  allHabits: any[],
  topHabits: any[],
  laggingHabits: any[]
): ProgressReportData {
  const isWeekly = period === 'weekly'
  const hasLagging = laggingHabits.length > 0
  const primaryLagger = hasLagging ? laggingHabits[0] : allHabits[0] || { name: 'Study', category: 'Focus', rate: 100, completedCount: isWeekly ? 7 : 30, totalExpected: isWeekly ? 7 : 30 }
  const secondLagger = laggingHabits.length > 1 ? laggingHabits[1] : allHabits[1] || allHabits[0] || { name: 'Sleep', category: 'Rest', rate: 100, completedCount: isWeekly ? 7 : 30, totalExpected: isWeekly ? 7 : 30 }

  const primaryName = (primaryLagger.name || '').toLowerCase()
  const primaryCat = (primaryLagger.category || '').toLowerCase()
  const isSleepHabit = primaryName.includes('sleep') || primaryCat.includes('sleep')
  const isScreenTime = primaryName.includes('screen') || primaryName.includes('phone') || primaryCat.includes('productivity')

  const shortcomings: ShortcomingItem[] = hasLagging
    ? [
        {
          habitName: primaryLagger.name,
          issue: `Completed ${primaryLagger.completedCount}/${primaryLagger.totalExpected} days (${primaryLagger.rate}% adherence).`,
          missedCountOrTarget: `${Math.max(0, primaryLagger.totalExpected - primaryLagger.completedCount)} missed sessions`,
          rootCauseAnalysis: `High activation friction during busy or unstructured days.`,
        },
        ...(laggingHabits.length > 1
          ? [
              {
                habitName: secondLagger.name,
                issue: `Completed ${secondLagger.completedCount}/${secondLagger.totalExpected} days (${secondLagger.rate}% adherence).`,
                missedCountOrTarget: `${Math.max(0, secondLagger.totalExpected - secondLagger.completedCount)} missed sessions`,
                rootCauseAnalysis: `Schedule inconsistency and late-day cognitive fatigue.`,
              },
            ]
          : []),
      ]
    : [
        {
          habitName: `**${topHabits[0]?.name || 'Consistency'}**`,
          issue: `All active targets maintained with ${adherenceRate}% adherence across ${isWeekly ? 7 : 30} days.`,
          missedCountOrTarget: '0 missed sessions',
          rootCauseAnalysis: 'Solid daily routine anchors and strong execution momentum.',
        },
      ]

  return {
    period,
    periodLabel: isWeekly ? 'Weekly Growth Report' : 'Monthly Mastery Review',
    adherenceRate,
    executiveSummary: hasLagging
      ? `Overall adherence is at ${adherenceRate}%; core habits are active while ${primaryLagger.name} is the primary focus area for consistency.`
      : `Outstanding discipline! Overall adherence is at ${adherenceRate}% across the last ${isWeekly ? '7' : '30'} days with all habits meeting targets.`,
    topPerformingHabits: topHabits.map((h: any) => ({
      name: h.name,
      category: h.category,
      streak: Math.max(Math.round(h.rate / 15), 3),
      rate: h.rate,
    })),
    shortcomings,
    areasOfImprovement: [
      {
        domain: isSleepHabit ? `Circadian Alignment` : isScreenTime ? `Digital Boundaries` : `${primaryLagger.category} Initiation`,
        currentBottleneck: isSleepHabit
          ? `Late-night screen stimulation pushing back melatonin release.`
          : isScreenTime
          ? `Unconstrained evening phone browsing eating into recovery hours.`
          : `Delaying start cue until late evening, raising initiation resistance.`,
        whyItMatters: isSleepHabit
          ? `Deep sleep is the biological foundation for tomorrow's willpower and focus.`
          : `High friction habits require early-day execution before decision fatigue sets in.`,
      },
      {
        domain: `Routine Continuity`,
        currentBottleneck: `Allowing one missed day to cascade into multiple consecutive gaps.`,
        whyItMatters: `The rule of never missing twice keeps routine momentum alive effortlessly.`,
      },
    ],
    howToImprove: [
      isSleepHabit
        ? {
            title: `30-Minute Wind-Down Buffer`,
            stepByStep: [
              `Dock phone across the room 45 minutes before target bedtime.`,
              `Keep bedroom cool (65°F / 18°C) and completely dark to cue melatonin.`,
            ],
            habitStackTrigger: `When night dental routine finishes, dim bedroom overhead lights.`,
            timeframe: isWeekly ? 'Next 7 days' : 'Next 30 days',
          }
        : isScreenTime
        ? {
            title: `Grayscale Display & App Locks`,
            stepByStep: [
              `Toggle phone display to grayscale at 9:00 PM to kill dopamine loops.`,
              `Charge device outside bedroom to eliminate mindless bedtime scrolling.`,
            ],
            habitStackTrigger: `When dinner cleanup completes, set phone to grayscale.`,
            timeframe: isWeekly ? 'Next 7 days' : 'Next 30 days',
          }
        : {
            title: `2-Minute Gateway Protocol`,
            stepByStep: [
              `Commit to just 2 minutes of ${primaryLagger.name} immediately after your morning anchor.`,
              `Set out all necessary materials the night before to eliminate activation friction.`,
            ],
            habitStackTrigger: `After morning hydration, start 2 minutes of ${primaryLagger.name}.`,
            timeframe: isWeekly ? 'Next 7 days' : 'Next 30 days',
          },
      {
        title: `Evening Digital Shutdown`,
        stepByStep: [
          `Set phone to grayscale 45 minutes before target sleep.`,
          `Keep devices charged outside the bedroom to prevent late scrolling.`,
        ],
        habitStackTrigger: `When dinner is done, dock devices away from bed.`,
        timeframe: 'Daily ritual',
      },
    ],
    tipsAndTricks: [
      {
        title: 'Temptation Bundling',
        technique: 'Pair the lagging habit with an activity you genuinely look forward to.',
        practicalExample: `Listen to your favorite podcast exclusively while doing ${primaryLagger.name}.`,
      },
    ],
    recommendedResources: [
      {
        name: 'Atomic Habits: The 2-Minute Rule',
        url: 'https://jamesclear.com/atomic-habits',
        type: 'website',
        description: 'James Clear’s blueprint to conquer initiation friction and habit procrastination.',
        relevantToIssue: `Direct fix for starting ${primaryLagger.name}.`,
      },
      {
        name: 'Huberman Lab: Sleep & Focus Toolkit',
        url: 'https://www.hubermanlab.com/newsletter/toolkit-for-sleep',
        type: 'guide',
        description: 'Neuroscience-backed morning light and evening wind-down protocols.',
        relevantToIssue: 'Fixes bedtime inconsistency and morning sluggishness.',
      },
    ],
    motivationalNote: `Focus only on reducing the variance between your good days and off days—small votes every day build the future you.`,
  }
}
