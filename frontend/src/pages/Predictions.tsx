import { useState, useEffect } from 'react'
import {
  TrendingUp,
  Target,
  Brain,
  Clock,
  Zap,
  ArrowUpRight,
  Flame,
  CheckCircle2,
  Trophy,
  AlertCircle,
  Info,
  RotateCcw,
} from 'lucide-react'
import { motion } from 'framer-motion'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { usePredictions } from '../hooks/usePredictions'
import { useAuth } from '../contexts/AuthContext'

// Type definitions for the prediction engine output
interface ProjectionResult {
  horizon: '6_months' | '5_years'
  health: {
    overallHealthIndex: number
    sleepScore: number
    exerciseScore: number
    projectedSleepHours: number
    projectedExerciseMinutes: number
    cardiovascularRisk: 'low' | 'moderate' | 'high'
    energyLevel: 'low' | 'moderate' | 'high'
  }
  academic: {
    consistencyScore: number
    projectedStudyHours: number
    skillAcquisitionRate: number
    knowledgeRetention: number
    projectedCredentials: number
  }
  digitalWellbeing: {
    focusCapacity: number
    screenTimeScore: number
    projectedScreenTimeHours: number
    digitalFatigueRisk: 'low' | 'moderate' | 'high'
    attentionSpan: 'short' | 'moderate' | 'long'
  }
  financial: {
    emergencyFundMonths: number
    projectedMonthlySpending: number
    projectedSavings: number
    projectedNetWorth: number
    financialStressLevel: 'low' | 'moderate' | 'high'
    investmentGrowth: number
  }
  personalDevelopment: {
    lifeSatisfactionIndex: number
    habitDiversityScore: number
    socialConnectionScore: number
    projectedActiveHabits: number
    resilienceScore: number
  }
  uncertainty: {
    confidenceLevel: number
    lowEstimate: number
    highEstimate: number
    note: string
  }
}

interface Scenario {
  type: 'current_path' | 'improved_path'
  label: string
  description: string
  projections: {
    '6_months': ProjectionResult
    '5_years': ProjectionResult
  }
  assumptions: any
  dataQuality: any
}

interface ComparativeAnalysis {
  healthImprovement: number
  academicImprovement: number
  digitalWellbeingImprovement: number
  financialImprovement: number
  personalDevelopmentImprovement: number
  overallImprovement: number
  timeToBreakEven: string
  keyLeveragePoints: string[]
  tradeoffs: string[]
}

interface PredictionResponse {
  currentPath: Scenario
  improvedPath: Scenario
  comparativeAnalysis: ComparativeAnalysis
  meta: {
    engineVersion: string
    generatedAt: string
    scenarioCount: number
    dataQuality?: DataQuality
  }
}

interface DataQuality {
  hasSufficientData: boolean
  daysOfHistory: number
  minimumDaysRequired: number
  isIllustrative: boolean
  missingCategories: string[]
  confidenceImpact: number
}

const indicatorCategories = [
  {
    key: 'health',
    label: 'Health',
    icon: Flame,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    metrics: [
      { key: 'overallHealthIndex', label: 'Overall Health', unit: '/100' },
      { key: 'sleepScore', label: 'Sleep Quality', unit: '/100' },
      { key: 'exerciseScore', label: 'Exercise Score', unit: '/100' },
      { key: 'projectedSleepHours', label: 'Sleep Hours', unit: 'h' },
      { key: 'projectedExerciseMinutes', label: 'Exercise', unit: 'min' },
    ]
  },
  {
    key: 'academic',
    label: 'Academic',
    icon: Target,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    metrics: [
      { key: 'consistencyScore', label: 'Consistency', unit: '/100' },
      { key: 'projectedStudyHours', label: 'Study Hours', unit: 'h/day' },
      { key: 'knowledgeRetention', label: 'Retention', unit: '/100' },
      { key: 'projectedCredentials', label: 'Credentials', unit: '' },
    ]
  },
  {
    key: 'digitalWellbeing',
    label: 'Digital Wellbeing',
    icon: Brain,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    metrics: [
      { key: 'focusCapacity', label: 'Focus Capacity', unit: '/100' },
      { key: 'screenTimeScore', label: 'Screen Time Score', unit: '/100' },
      { key: 'projectedScreenTimeHours', label: 'Screen Time', unit: 'h/day' },
    ]
  },
  {
    key: 'financial',
    label: 'Financial',
    icon: Trophy,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    metrics: [
      { key: 'emergencyFundMonths', label: 'Emergency Fund', unit: ' months' },
      { key: 'projectedMonthlySpending', label: 'Monthly Spending', unit: '$' },
      { key: 'projectedSavings', label: 'Projected Savings', unit: '$' },
      { key: 'investmentGrowth', label: 'Investment Growth', unit: '$' },
    ]
  },
  {
    key: 'personalDevelopment',
    label: 'Personal Growth',
    icon: ArrowUpRight,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    metrics: [
      { key: 'lifeSatisfactionIndex', label: 'Life Satisfaction', unit: '/100' },
      { key: 'habitDiversityScore', label: 'Habit Diversity', unit: '/100' },
      { key: 'resilienceScore', label: 'Resilience', unit: '/100' },
      { key: 'projectedActiveHabits', label: 'Active Habits', unit: '' },
    ]
  },
]

const horizonLabels = {
  '6_months': '6 Months',
  '5_years': '5 Years',
}

export function Predictions() {
  const { user } = useAuth()
  const {
    prediction,
    loading,
    error,
    generatePrediction,
    fetchCurrentPrediction,
    runPredefinedScenario,
    fetchPredefinedScenarios,
    predefinedScenarios,
    scenariosLoading,
    whatIfResult,
    whatIfLoading,
    clearWhatIf,
    clearError,
  } = usePredictions()

  const [selectedHorizon, setSelectedHorizon] = useState<'6_months' | '5_years'>('6_months')
  const [selectedScenario, setSelectedScenario] = useState<'currentPath' | 'improvedPath'>('improvedPath')
  const [showWhatIf, setShowWhatIf] = useState(false)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [generateOptions, setGenerateOptions] = useState({
    enableIllustrativeMode: true,
    minimumDaysForPersonalized: 14,
  })

  // Fetch predefined scenarios on mount
  useEffect(() => {
    if (user) {
      fetchPredefinedScenarios()
    }
  }, [user, fetchPredefinedScenarios])

  // Parse prediction data
  const predictionData = prediction as PredictionResponse | null
  const currentPath = predictionData?.currentPath ?? null
  const improvedPath = predictionData?.improvedPath ?? null
  const comparative = predictionData?.comparativeAnalysis ?? null
  const meta = predictionData?.meta
  const dataQuality = predictionData?.meta?.dataQuality as DataQuality | null

  const selectedProjection = selectedScenario === 'currentPath'
    ? currentPath?.projections[selectedHorizon] ?? null
    : improvedPath?.projections[selectedHorizon] ?? null

  const otherProjection = selectedScenario === 'currentPath'
    ? improvedPath?.projections[selectedHorizon] ?? null
    : currentPath?.projections[selectedHorizon] ?? null

  // Generate chart data for trends over time
  const chartData = [
    { period: 'Current', current: getCurrentMetrics(), improved: getImprovedMetrics() },
    { period: '6 Months', current: currentPath?.projections['6_months'], improved: improvedPath?.projections['6_months'] },
    { period: '5 Years', current: currentPath?.projections['5_years'], improved: improvedPath?.projections['5_years'] },
  ].filter(d => d.current && d.improved).map(d => ({
    period: d.period,
    currentHealth: d.current!.health.overallHealthIndex,
    improvedHealth: d.improved!.health.overallHealthIndex,
    currentAcademic: d.current!.academic.knowledgeRetention,
    improvedAcademic: d.improved!.academic.knowledgeRetention,
    currentDigital: d.current!.digitalWellbeing.focusCapacity,
    improvedDigital: d.improved!.digitalWellbeing.focusCapacity,
    currentFinancial: d.current!.financial.emergencyFundMonths * 10, // Scale for visibility
    improvedFinancial: d.improved!.financial.emergencyFundMonths * 10,
    currentPersonal: d.current!.personalDevelopment.lifeSatisfactionIndex,
    improvedPersonal: d.improved!.personalDevelopment.lifeSatisfactionIndex,
  }))

  function getCurrentMetrics() {
    if (!currentPath) return null
    // Approximate current from 6-month current path (regressed slightly)
    return currentPath.projections['6_months']
  }

  function getImprovedMetrics() {
    if (!improvedPath) return null
    return improvedPath.projections['6_months']
  }

  function getMetricValue(projection: ProjectionResult | null, categoryKey: string, metricKey: string): number {
    if (!projection) return 0
    const category = projection[categoryKey as keyof ProjectionResult] as any
    return category?.[metricKey] ?? 0
  }

  function getMetricChange(current: number, improved: number): { value: number; isPositive: boolean } {
    const diff = improved - current
    return { value: Math.abs(diff), isPositive: diff >= 0 }
  }

  function formatMetricValue(value: number, metricKey: string): string {
    if (metricKey.includes('Hours') || metricKey.includes('hours')) return `${value.toFixed(1)}h`
    if (metricKey.includes('Minutes') || metricKey.includes('minutes')) return `${Math.round(value)}min`
    if (metricKey.includes('Spending') || metricKey.includes('Savings') || metricKey.includes('Growth') || metricKey.includes('NetWorth')) return `$${Math.round(value).toLocaleString()}`
    if (metricKey.includes('Months')) return `${value.toFixed(1)}mo`
    if (metricKey.includes('Rate') || metricKey.includes('Score') || metricKey.includes('Index') || metricKey.includes('Capacity') || metricKey.includes('Retention') || metricKey.includes('Diversity') || metricKey.includes('Resilience') || metricKey.includes('Satisfaction')) return `${Math.round(value)}`
    if (metricKey.includes('Credentials') || metricKey.includes('Habits')) return `${Math.round(value)}`
    return `${Math.round(value)}`
  }

  if (loading && !prediction) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Future You Predictions</h1>
            <p className="text-muted-foreground mt-1">Generating your personalized future scenarios...</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Analyzing your habits and computing projections...</p>
        </div>
      </div>
    )
  }

  if (!prediction && !loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Future You Predictions</h1>
            <p className="text-muted-foreground mt-1">Your future self, predicted by the Future You Engine</p>
          </div>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Generate Prediction
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-8 text-center"
        >
          <Brain className="h-16 w-16 text-primary-500/50 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No Predictions Yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Create some habits and log your daily progress. Once you have at least 14 days of data,
            we'll generate personalized 6-month and 5-year projections for your health, academics,
            digital wellbeing, finances, and personal growth.
          </p>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-6 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors flex items-center gap-2 mx-auto"
          >
            <RotateCcw className="h-4 w-4" />
            Generate My First Prediction
          </button>
        </motion.div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Future You Predictions</h1>
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/20 rounded-xl p-6"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-500 mb-1">Error Loading Prediction</h3>
              <p className="text-sm text-muted-foreground mb-3">{error}</p>
              <div className="flex gap-2">
                <button
                  onClick={clearError}
                  className="px-3 py-1 text-sm bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                >
                  Dismiss
                </button>
                <button
                  onClick={fetchCurrentPrediction}
                  className="px-3 py-1 text-sm bg-primary-500/10 text-primary-500 rounded-lg hover:bg-primary-500/20 transition-colors"
                >
                  Retry
                </button>
                <button
                  onClick={() => setShowGenerateModal(true)}
                  className="px-3 py-1 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  Generate New
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Future You Predictions</h1>
          <p className="text-muted-foreground mt-1">
            {dataQuality?.isIllustrative
              ? 'Illustrative simulation — add more habit data for personalized predictions'
              : `Personalized projection based on ${dataQuality?.daysOfHistory || 0} days of habit data`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary-500" />
          <span className="px-3 py-1 bg-primary-500/10 text-primary-500 rounded-full text-sm font-medium">
            Future You Engine v{meta?.engineVersion || '1.0.0'}
          </span>
        </div>
      </div>

      {/* Data Quality Banner */}
      {dataQuality?.isIllustrative && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4"
        >
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-yellow-500 mb-1">Illustrative Simulation</h4>
              <p className="text-sm text-muted-foreground">
                You have {dataQuality.daysOfHistory} days of data (minimum {dataQuality.minimumDaysRequired} for personalized predictions).
                This projection uses population averages and clearly labeled assumptions.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Horizon & Scenario Selectors */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-2">
          {(['6_months', '5_years'] as const).map((h) => (
            <button
              key={h}
              onClick={() => setSelectedHorizon(h)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedHorizon === h
                  ? 'bg-primary-500 text-white'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              {horizonLabels[h]}
            </button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          {(['currentPath', 'improvedPath'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSelectedScenario(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
                selectedScenario === s
                  ? 'bg-primary-500 text-white'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              {s === 'currentPath' ? (
                <>
                  <Clock className="h-4 w-4" />
                  Current Path
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4" />
                  Improved Path
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* What-If Panel */}
      {showWhatIf && whatIfResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-primary-500/5 border border-primary-500/20 rounded-xl p-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">What-If Simulation: {whatIfResult.scenario.name}</h3>
              <p className="text-sm text-muted-foreground">{whatIfResult.scenario.description}</p>
            </div>
            <button
              onClick={clearWhatIf}
              className="p-2 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Feasibility</p>
              <p className="text-2xl font-bold text-foreground">{whatIfResult.feasibilityScore}%</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Overall Improvement</p>
              <p className="text-2xl font-bold text-green-500">+{whatIfResult.comparativeToBaseline.overallImprovement}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Break-even</p>
              <p className="text-2xl font-bold text-foreground">{whatIfResult.comparativeToBaseline.timeToBreakEven}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Recommendation</p>
              <p className="text-sm text-foreground">{whatIfResult.formatted.recommendation}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {whatIfResult.formatted.keyImprovements.map((imp: string, i: number) => (
              <span key={i} className="px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-sm">
                {imp}
              </span>
            ))}
            {whatIfResult.formatted.tradeoffs.map((trade: string, i: number) => (
              <span key={i} className="px-3 py-1 bg-orange-500/10 text-orange-500 rounded-full text-sm">
                {trade}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Main Projection Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            {selectedScenario === 'currentPath' ? 'Current Path' : 'Improved Path'} — {horizonLabels[selectedHorizon]}
          </h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-sky-500" />
              Current Path
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-purple-500" />
              Improved Path
            </span>
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="period"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    currentHealth: 'Current Health',
                    improvedHealth: 'Improved Health',
                    currentAcademic: 'Current Academic',
                    improvedAcademic: 'Improved Academic',
                    currentDigital: 'Current Digital',
                    improvedDigital: 'Improved Digital',
                    currentFinancial: 'Current Financial (×10)',
                    improvedFinancial: 'Improved Financial (×10)',
                    currentPersonal: 'Current Personal',
                    improvedPersonal: 'Improved Personal',
                  }
                  return [Math.round(value), labels[name] || name]
                }}
              />
              <Line
                type="monotone"
                dataKey="currentHealth"
                stroke="#0ea5e9"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#0ea5e9', strokeWidth: 2 }}
                name="currentHealth"
              />
              <Line
                type="monotone"
                dataKey="improvedHealth"
                stroke="#0ea5e9"
                strokeWidth={2}
                dot={{ fill: '#0ea5e9', strokeWidth: 2 }}
                name="improvedHealth"
              />
              <Line
                type="monotone"
                dataKey="currentAcademic"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                name="currentAcademic"
              />
              <Line
                type="monotone"
                dataKey="improvedAcademic"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                name="improvedAcademic"
              />
              <Line
                type="monotone"
                dataKey="currentDigital"
                stroke="#a855f7"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#a855f7', strokeWidth: 2 }}
                name="currentDigital"
              />
              <Line
                type="monotone"
                dataKey="improvedDigital"
                stroke="#a855f7"
                strokeWidth={2}
                dot={{ fill: '#a855f7', strokeWidth: 2 }}
                name="improvedDigital"
              />
              <Line
                type="monotone"
                dataKey="currentFinancial"
                stroke="#22c55e"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#22c55e', strokeWidth: 2 }}
                name="currentFinancial"
              />
              <Line
                type="monotone"
                dataKey="improvedFinancial"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ fill: '#22c55e', strokeWidth: 2 }}
                name="improvedFinancial"
              />
              <Line
                type="monotone"
                dataKey="currentPersonal"
                stroke="#f97316"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#f97316', strokeWidth: 2 }}
                name="currentPersonal"
              />
              <Line
                type="monotone"
                dataKey="improvedPersonal"
                stroke="#f97316"
                strokeWidth={2}
                dot={{ fill: '#f97316', strokeWidth: 2 }}
                name="improvedPersonal"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Indicator Categories Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-5 gap-4">
        {indicatorCategories.map((category) => (
          <motion.div
            key={category.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * indicatorCategories.indexOf(category) }}
            className="bg-card border border-border rounded-xl p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className={`p-2 rounded-lg ${category.bg} ${category.color}`}>
                <category.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-foreground">{category.label}</h3>
            </div>

            <div className="space-y-3">
              {category.metrics.map((metric) => {
                const currentValue = getMetricValue(
                  selectedScenario === 'currentPath' ? currentPath?.projections[selectedHorizon] ?? null : improvedPath?.projections[selectedHorizon] ?? null,
                  category.key,
                  metric.key
                )
                const otherValue = getMetricValue(
                  selectedScenario === 'currentPath' ? improvedPath?.projections[selectedHorizon] ?? null : currentPath?.projections[selectedHorizon] ?? null,
                  category.key,
                  metric.key
                )
                const change = getMetricChange(currentValue, otherValue)

                return (
                  <div key={metric.key} className="p-3 bg-accent/50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">{metric.label}</span>
                      <span className="text-lg font-bold text-foreground">
                        {formatMetricValue(currentValue, metric.key)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden max-w-[60%]">
                        <div
                          className="h-full bg-primary-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, currentValue))}%` }}
                        />
                      </div>
                      {selectedScenario === 'improvedPath' && otherProjection && (
                        <span className={`text-xs font-medium ml-2 ${change.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                          {change.isPositive ? '+' : ''}{formatMetricValue(change.value, metric.key)} vs current
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Uncertainty indicator */}
            {selectedProjection && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Confidence</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full"
                        style={{ width: `${selectedProjection.uncertainty.confidenceLevel}%` }}
                      />
                    </div>
                    <span className="font-medium text-foreground">
                      {selectedProjection.uncertainty.confidenceLevel}%
                    </span>
                  </div>
                </div>
                {selectedProjection.uncertainty.note && (
                  <p className="text-xs text-muted-foreground mt-1">{selectedProjection.uncertainty.note}</p>
                )}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Comparative Analysis */}
      {comparative && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">Current vs Improved Path Comparison</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
            {[
              { key: 'healthImprovement', label: 'Health', icon: Flame, color: 'text-red-500' },
              { key: 'academicImprovement', label: 'Academic', icon: Target, color: 'text-blue-500' },
              { key: 'digitalWellbeingImprovement', label: 'Digital', icon: Brain, color: 'text-purple-500' },
              { key: 'financialImprovement', label: 'Financial', icon: Trophy, color: 'text-green-500' },
              { key: 'personalDevelopmentImprovement', label: 'Personal', icon: ArrowUpRight, color: 'text-orange-500' },
            ].map((cat) => (
              <div key={cat.key} className="p-4 bg-accent/50 rounded-lg text-center">
                <cat.icon className={`h-6 w-6 mx-auto mb-2 ${cat.color}`} />
                <p className="text-sm text-muted-foreground">{cat.label}</p>
                <p className="text-2xl font-bold text-green-500">+{comparative[cat.key as keyof ComparativeAnalysis]}</p>
              </div>
            ))}
            <div className="p-4 bg-primary-500/10 border border-primary-500/20 rounded-lg text-center">
              <Zap className="h-6 w-6 mx-auto mb-2 text-primary-500" />
              <p className="text-sm text-muted-foreground">Overall</p>
              <p className="text-2xl font-bold text-primary-500">+{comparative.overallImprovement}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-foreground mb-3">Key Leverage Points</h3>
              <ul className="space-y-2">
                {comparative.keyLeveragePoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-3">Trade-offs & Considerations</h3>
              <ul className="space-y-2">
                {comparative.tradeoffs.length > 0 ? (
                  comparative.tradeoffs.map((trade, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                      {trade}
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-muted-foreground">No significant trade-offs identified</li>
                )}
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-primary-500/5 border border-primary-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-5 w-5 text-primary-500" />
              <span className="font-medium text-primary-500">Estimated Break-even:</span>
              <span className="font-bold text-foreground ml-1">{comparative.timeToBreakEven}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              This is when the cumulative benefits of the improved path outweigh the effort required to change habits.
            </p>
          </div>
        </motion.div>
      )}

      {/* What-If Scenarios */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">What-If Scenarios</h2>
          <button
            onClick={() => setShowWhatIf(true)}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors flex items-center gap-2"
          >
            <Zap className="h-4 w-4" />
            Run Simulation
          </button>
        </div>

        {scenariosLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading scenarios...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {predefinedScenarios.map((scenario: any) => (
              <motion.button
                key={scenario.id}
                onClick={() => runPredefinedScenario(scenario.id)}
                disabled={whatIfLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="p-4 bg-accent/50 border border-border rounded-xl text-left hover:border-primary-500/50 transition-all text-start"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-foreground">{scenario.name}</h3>
                    <p className="text-sm text-muted-foreground">{scenario.description}</p>
                  </div>
                  <Zap className="h-5 w-5 text-primary-500" />
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {scenario.changes.slice(0, 3).map((change: any, i: number) => (
                    <span key={i} className="px-2 py-0.5 bg-primary-500/10 text-primary-500 rounded text-xs">
                      {change.metric}: {change.targetValue}
                    </span>
                  ))}
                  {scenario.changes.length > 3 && (
                    <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs">
                      +{scenario.changes.length - 3} more
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {scenario.feasibilityScore !== undefined
                      ? `Feasibility: ${scenario.feasibilityScore}%`
                      : 'Click to analyze'}
                  </span>
                  {scenario.projectedImprovement !== undefined && (
                    <span className="font-medium text-green-500">+{scenario.projectedImprovement} improvement</span>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </motion.div>

      {/* Generate Prediction Modal */}
      {showGenerateModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setShowGenerateModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-card border border-border rounded-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-foreground mb-4">Generate New Prediction</h3>
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={generateOptions.enableIllustrativeMode}
                  onChange={(e) => setGenerateOptions({ ...generateOptions, enableIllustrativeMode: e.target.checked })}
                  className="w-4 h-4 rounded border-border text-primary-500 focus:ring-primary-500"
                />
                <div>
                  <p className="font-medium text-foreground">Enable Illustrative Mode</p>
                  <p className="text-sm text-muted-foreground">
                    Show projections even with insufficient data (clearly labeled as illustrative)
                  </p>
                </div>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={generateOptions.minimumDaysForPersonalized === 14}
                  onChange={(e) => setGenerateOptions({ ...generateOptions, minimumDaysForPersonalized: e.target.checked ? 14 : 7 })}
                  className="w-4 h-4 rounded border-border text-primary-500 focus:ring-primary-500"
                />
                <div>
                  <p className="font-medium text-foreground">Standard Personalization Threshold (14 days)</p>
                  <p className="text-sm text-muted-foreground">
                    Require 14 days of habit data for personalized predictions (7 days for quick mode)
                  </p>
                </div>
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await generatePrediction(generateOptions)
                  setShowGenerateModal(false)
                }}
                disabled={loading}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate Prediction'}
              </button>
            </div>
          </motion.div>
          </motion.div>
        )}
      </div>
  )
}