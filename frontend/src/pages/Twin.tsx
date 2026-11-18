import { useState, useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faMoon,
  faBookOpen,
  faMobileScreen,
  faWandMagicSparkles,
  faRotateRight,
  faCopy,
  faCheck,
  faCompass,
  faCalendarDays,
  faStar,
  faTriangleExclamation,
  faSeedling,
  faScaleBalanced,
  faBullseye,
} from '@fortawesome/free-solid-svg-icons'
import { useUserProfile } from '../contexts/UserProfileContext'
import { getLocalHabits, getAllLocalLogs } from '../utils/habitStorage'
import { aiApi } from '../services/api'

export function Twin() {
  const { fullName } = useUserProfile()
  const [horizon, setHorizon] = useState<'6_months' | '5_years'>('6_months')

  // Future Letter State
  const [letterType, setLetterType] = useState<'six_month' | 'five_year' | 'current_path'>('six_month')
  const [letterTone, setLetterTone] = useState<'encouraging' | 'visionary' | 'realistic'>('encouraging')
  const [letterContent, setLetterContent] = useState<string | null>(null)
  const [keyThemes, setKeyThemes] = useState<string[]>([])
  const [actionItems, setActionItems] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [letterError, setLetterError] = useState<string | null>(null)

  const habits = useMemo(() => getLocalHabits(), [])
  const allLogs = useMemo(() => getAllLocalLogs(), [])

  const is5Year = horizon === '5_years'
  const displayName = fullName || 'Friend'

  // Projected trajectory data
  const trajectoryPoints = is5Year
    ? [
        { label: 'Now', baseline: 52, projected: 52 },
        { label: 'Year 1', baseline: 54, projected: 68 },
        { label: 'Year 2', baseline: 55, projected: 78 },
        { label: 'Year 3', baseline: 53, projected: 85 },
        { label: 'Year 4', baseline: 51, projected: 90 },
        { label: 'Year 5', baseline: 50, projected: 95 },
      ]
    : [
        { label: 'Month 1', baseline: 52, projected: 58 },
        { label: 'Month 2', baseline: 53, projected: 66 },
        { label: 'Month 3', baseline: 54, projected: 74 },
        { label: 'Month 4', baseline: 52, projected: 82 },
        { label: 'Month 5', baseline: 53, projected: 88 },
        { label: 'Month 6', baseline: 54, projected: 92 },
      ]

  const pillars = [
    {
      title: 'Physical Vitality',
      subtitle: 'Rest, Sleep & Morning Energy',
      currentScore: 68,
      projectedScore: is5Year ? 94 : 86,
      icon: faMoon,
      outcome: is5Year
        ? 'Deep, uninterrupted sleep with high daytime energy and balanced hormones.'
        : 'Consistent 8h sleep routine eliminating morning grogginess.',
    },
    {
      title: 'Cognitive Stamina',
      subtitle: 'Deep Work & Focused Study',
      currentScore: 60,
      projectedScore: is5Year ? 92 : 84,
      icon: faBookOpen,
      outcome: is5Year
        ? 'Mastery over complex tasks with 4 hours of effortless daily flow state.'
        : 'Daily 2-hour uninterrupted study sessions becoming second nature.',
    },
    {
      title: 'Digital Balance',
      subtitle: 'Intentional Screen & Phone Habits',
      currentScore: 55,
      projectedScore: is5Year ? 90 : 80,
      icon: faMobileScreen,
      outcome: is5Year
        ? 'Recreational screen time kept below 1.5h, freeing hours for creative pursuits.'
        : 'Calm morning and evening boundaries shielding your mental clarity.',
    },
  ]

  // SVG Geometry
  const svgWidth = 640
  const svgHeight = 200
  const padLeft = 40
  const padRight = 24
  const padTop = 18
  const padBottom = 30
  const graphWidth = svgWidth - padLeft - padRight
  const graphHeight = svgHeight - padTop - padBottom

  const coords = trajectoryPoints.map((p, i) => {
    const x = padLeft + (i / (trajectoryPoints.length - 1)) * graphWidth
    const yProj = padTop + graphHeight - (p.projected / 100) * graphHeight
    const yBase = padTop + graphHeight - (p.baseline / 100) * graphHeight
    return { ...p, x, yProj, yBase }
  })

  let pathProj = `M ${coords[0].x} ${coords[0].yProj}`
  let pathBase = `M ${coords[0].x} ${coords[0].yBase}`
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i]
    const p1 = coords[i + 1]
    const mx = (p0.x + p1.x) / 2
    pathProj += ` C ${mx} ${p0.yProj}, ${mx} ${p1.yProj}, ${p1.x} ${p1.yProj}`
    pathBase += ` C ${mx} ${p0.yBase}, ${mx} ${p1.yBase}, ${p1.x} ${p1.yBase}`
  }

  // Handle Future Letter Generation with Gemini
  const handleGenerateLetter = async () => {
    setIsGenerating(true)
    setLetterError(null)

    try {
      const res = await aiApi.generateFutureLetter(letterType, true, {
        habits,
        logs: allLogs,
        userName: displayName,
        tone: letterTone,
      })

      if (res.data?.letter) {
        const letter = res.data.letter as any
        setLetterContent(letter.content)
        setKeyThemes(letter.key_themes || ['#Consistency', '#Focus', '#IdentityShift'])
        setActionItems(letter.action_items || ['Protect your 8h sleep routine', 'Maintain 2h daily deep focus'])
      } else if (res.error) {
        setLetterError(res.error)
      }
    } catch (err: any) {
      setLetterError(err?.message || 'Could not generate future letter.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = () => {
    if (!letterContent) return
    navigator.clipboard.writeText(letterContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. Header Card with Segmented Trajectory Horizon Toggle */}
      <div className="bg-white/95 dark:bg-[#0D1814] rounded-3xl border border-[#E8E2D5] dark:border-[#223326] p-5 sm:p-6 shadow-[0_2px_12px_rgba(29,37,22,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#EAEFE2] dark:bg-[#1D2D23] text-[#4E6228] dark:text-[#B6CDB0] text-xs font-semibold uppercase tracking-wider mb-2">
            <FontAwesomeIcon icon={faCompass} className="w-3 h-3 text-[#738541] dark:text-[#9EB868]" />
            <span>Identity Architecture & Digital Twin</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1D2516] dark:text-[#F5F2EB] tracking-tight">
            Future Me · Compound Growth
          </h1>
          <p className="text-xs sm:text-sm text-[#4E5642] dark:text-[#9BAF90] mt-1">
            Visualizing the compounded 6-month and 5-year version of yourself based on daily routines.
          </p>
        </div>

        {/* Elevated Segmented Horizon Selector */}
        <div className="inline-flex p-1 sm:p-1.5 rounded-2xl bg-[#FAF8F3] dark:bg-[#15231C] border border-[#E8E2D5] dark:border-[#223326] shadow-2xs self-start sm:self-center gap-1 sm:gap-1.5 max-w-full">
          <button
            type="button"
            onClick={() => setHorizon('6_months')}
            className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 sm:gap-2 ${
              !is5Year
                ? 'bg-[#738541] text-white shadow-xs'
                : 'text-[#6F6759] dark:text-[#9BAF90] hover:text-[#1D2516] dark:hover:text-[#F5F2EB] hover:bg-[#F2ECE0] dark:hover:bg-[#1E3027]'
            }`}
          >
            <FontAwesomeIcon icon={faCalendarDays} className="text-xs" />
            <span className="hidden xs:inline">6-Month Trajectory</span>
            <span className="xs:hidden">6 Months</span>
          </button>
          <button
            type="button"
            onClick={() => setHorizon('5_years')}
            className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 sm:gap-2 ${
              is5Year
                ? 'bg-[#738541] text-white shadow-xs'
                : 'text-[#6F6759] dark:text-[#9BAF90] hover:text-[#1D2516] dark:hover:text-[#F5F2EB] hover:bg-[#F2ECE0] dark:hover:bg-[#1E3027]'
            }`}
          >
            <FontAwesomeIcon icon={faStar} className="text-xs" />
            <span className="hidden xs:inline">5-Year Horizon</span>
            <span className="xs:hidden">5 Years</span>
          </button>
        </div>
      </div>

      {/* 2. Compound Growth Chart */}
      <div className="bg-white dark:bg-[#0D1814] border border-[#E8E2D5] dark:border-[#223326] rounded-3xl p-4 sm:p-6 shadow-xs space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[#ECE7DC] dark:border-[#223326]">
          <div>
            <h3 className="font-serif font-bold text-base sm:text-lg text-[#1D2516] dark:text-[#F5F2EB]">
              {is5Year ? '5-Year Compound Mastery Curve' : '6-Month Habit Trajectory'}
            </h3>
            <p className="text-xs text-[#6F6759] dark:text-[#9BAF90] font-medium mt-0.5">
              Comparison between your baseline status quo and your habit-powered potential.
            </p>
          </div>
          <span className="self-start sm:self-auto text-xs font-bold text-[#415525] dark:text-[#B6CDB0] bg-[#EEF4E8] dark:bg-[#1D2D23] px-2.5 py-1 rounded-lg">
            {is5Year ? '+43 pts projected shift' : '+38 pts projected shift'}
          </span>
        </div>

        <div className="w-full h-48 sm:h-56 relative">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
            {/* Baseline Status Quo Curve */}
            <path
              d={pathBase}
              fill="none"
              stroke="#8C8271"
              strokeWidth="2"
              strokeDasharray="4 4"
              className="opacity-45 dark:opacity-60"
            />

            {/* Projected Curve */}
            <path
              d={pathProj}
              fill="none"
              stroke="#738541"
              strokeWidth="2.8"
              strokeLinecap="round"
            />

            {/* Markers */}
            {coords.map((p, idx) => (
              <g key={idx}>
                <circle cx={p.x} cy={p.yProj} r="4.5" fill="#FFFFFF" stroke="#738541" strokeWidth="2.4" className="dark:fill-[#0D1814]" />
                <text
                  x={p.x}
                  y={padTop + graphHeight + 18}
                  textAnchor="middle"
                  fill="currentColor"
                  fontSize="11"
                  fontWeight="bold"
                  className="text-[#1D2516] dark:text-[#F5F2EB]"
                >
                  {p.label}
                </text>
              </g>
            ))}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-4 text-xs font-bold text-[#6F6759] dark:text-[#9BAF90] pt-1">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#B8B0A2] dark:bg-[#52634D] rounded-full" />
            <span>Baseline Status Quo</span>
          </span>
          <span className="flex items-center gap-1.5 text-[#1D2516] dark:text-[#F5F2EB]">
            <span className="w-3 h-0.5 bg-[#738541] rounded-full" />
            <span>Habit-Powered Future</span>
          </span>
        </div>
      </div>

      {/* 3. Three Core Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {pillars.map((pil) => (
          <div
            key={pil.title}
            className="bg-white dark:bg-[#0D1814] border border-[#E8E2D5] dark:border-[#223326] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between min-h-[170px] relative group transition-colors"
          >
            <div>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-serif font-bold text-base text-[#1D2516] dark:text-[#F5F2EB]">
                    {pil.title}
                  </h4>
                  <p className="text-[11px] text-[#6F6759] dark:text-[#9BAF90] font-medium mt-0.5">
                    {pil.subtitle}
                  </p>
                </div>

                <div className="text-xl sm:text-2xl text-[#8C8271]/80 dark:text-[#6F7F69] group-hover:text-[#52633E] dark:group-hover:text-[#9EB868] transition-colors">
                  <FontAwesomeIcon icon={pil.icon} />
                </div>
              </div>

              {/* Progress Level */}
              <div className="space-y-1 my-2">
                <div className="flex items-center justify-between text-xs font-bold tabular-nums">
                  <span className="text-[#6F6759] dark:text-[#9BAF90]">Now: {pil.currentScore}%</span>
                  <span className="text-[#415525] dark:text-[#B6CDB0]">Projected: {pil.projectedScore}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#E8E2D4] dark:bg-[#1E3027] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#738541]"
                    style={{ width: `${pil.projectedScore}%` }}
                  />
                </div>
              </div>

              <p className="text-xs text-[#52633E] dark:text-[#9BAF90] font-medium leading-relaxed mt-2.5">
                {pil.outcome}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 4. AI-POWERED FUTURE LETTER GENERATION SECTION */}
      <div className="bg-[#FAF7F0] dark:bg-[#0D1814] border-2 border-[#738541]/30 dark:border-[#738541]/40 rounded-3xl p-5 sm:p-7 shadow-xs space-y-6 relative overflow-hidden transition-colors">
        {/* Leaf Accent */}
        <div className="absolute -top-3 -right-3 w-32 pointer-events-none opacity-50 dark:opacity-20 select-none hidden sm:block">
          <img src="/botanical/leaf-2.png" alt="" className="w-full h-auto object-contain transform rotate-45" />
        </div>

        {/* Section Header */}
        <div className="relative z-10 space-y-1">
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#1D2516] dark:text-[#F5F2EB] tracking-tight">
            Letter from Future {displayName}
          </h2>
          <p className="text-xs sm:text-sm text-[#556244] dark:text-[#9BAF90] font-medium max-w-2xl leading-relaxed">
            An authentic letter written from your future self, synthesizing your real habits, logged streaks, and growth milestones.
          </p>
        </div>

        {/* IMPROVED TRAJECTORY & HORIZON SELECTION UI */}
        <div className="relative z-10 space-y-4 pt-1">
          {/* A. 3-Card Horizon Perspective Selector */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#738541] dark:text-[#9EB868] block">
              Choose Horizon Perspective:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  type: 'six_month',
                  icon: faCalendarDays,
                  label: '6 Months Ahead',
                  tag: 'Near-Future',
                  desc: 'Focuses on compounding daily habit momentum and building unshakeable consistency.',
                },
                {
                  type: 'five_year',
                  icon: faStar,
                  label: '5 Years Ahead',
                  tag: 'Long-Range',
                  desc: 'A visionary letter exploring your transformed lifestyle, career mastery, and identity.',
                },
                {
                  type: 'current_path',
                  icon: faTriangleExclamation,
                  label: 'Current Path',
                  tag: 'Reality Check',
                  desc: 'An honest, empathetic wake-up call forecasting what happens if routines stagnate.',
                },
              ].map((card) => {
                const isSel = letterType === card.type
                return (
                  <button
                    key={card.type}
                    type="button"
                    onClick={() => setLetterType(card.type as any)}
                    className={`p-3.5 rounded-2xl text-left transition-all border cursor-pointer flex flex-col justify-between ${
                      isSel
                        ? 'bg-[#EEF4E8] dark:bg-[#1C2C22] border-[#738541] dark:border-[#738541] shadow-xs ring-2 ring-[#738541]/25'
                        : 'bg-white dark:bg-[#15231C] hover:bg-[#FAF8F3] dark:hover:bg-[#1D2F25] border-[#E8E2D5] dark:border-[#223326] hover:border-[#CCD8B8]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${
                            isSel
                              ? 'bg-[#738541] text-white shadow-2xs'
                              : 'bg-[#FAF8F3] dark:bg-[#1E2E25] text-[#738541] dark:text-[#9EB868] border border-[#E3DDCF] dark:border-[#223326]'
                          }`}
                        >
                          <FontAwesomeIcon icon={card.icon} />
                        </div>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            isSel
                              ? 'bg-[#738541] text-white'
                              : 'bg-[#FAF8F3] dark:bg-[#1E2E25] text-[#738541] dark:text-[#9EB868] border border-[#E3DDCF] dark:border-[#223326]'
                          }`}
                        >
                          {card.tag}
                        </span>
                      </div>
                      <h4
                        className={`font-serif font-bold text-sm ${
                          isSel ? 'text-[#3D5220] dark:text-[#D1E6C5]' : 'text-[#1D2516] dark:text-[#F5F2EB]'
                        }`}
                      >
                        {card.label}
                      </h4>
                    </div>
                    <p className="text-[11px] text-[#6F6759] dark:text-[#9BAF90] font-medium leading-relaxed mt-1.5">
                      {card.desc}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* B. Tone Pills & Action Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#738541] dark:text-[#9EB868] mr-1">
                Tone:
              </span>
              {[
                { id: 'encouraging', label: 'Encouraging & Warm', icon: faSeedling },
                { id: 'visionary', label: 'Visionary & Bold', icon: faWandMagicSparkles },
                { id: 'realistic', label: 'Grounded & Realistic', icon: faScaleBalanced },
              ].map((tone) => {
                const isSel = letterTone === tone.id
                return (
                  <button
                    key={tone.id}
                    type="button"
                    onClick={() => setLetterTone(tone.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSel
                        ? 'bg-[#738541] text-white shadow-2xs font-bold'
                        : 'bg-white dark:bg-[#15231C] hover:bg-[#FAF8F3] dark:hover:bg-[#1D2F25] text-[#6F6759] dark:text-[#9BAF90] border border-[#E8E2D5] dark:border-[#223326]'
                    }`}
                  >
                    <FontAwesomeIcon icon={tone.icon} className="text-xs" />
                    <span>{tone.label}</span>
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              onClick={handleGenerateLetter}
              disabled={isGenerating}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold text-white shadow-md transition-all cursor-pointer self-start sm:self-auto ${
                isGenerating
                  ? 'bg-[#738541]/70 cursor-not-allowed'
                  : 'bg-[#738541] hover:bg-[#5E6D34] active:scale-98'
              }`}
            >
              <FontAwesomeIcon
                icon={isGenerating ? faRotateRight : faWandMagicSparkles}
                className={isGenerating ? 'animate-spin' : ''}
              />
              <span>
                {isGenerating
                  ? 'Writing Future Letter...'
                  : letterContent
                  ? 'Regenerate Letter'
                  : 'Generate Future Letter'}
              </span>
            </button>
          </div>
        </div>

        {letterError && (
          <div className="p-3 rounded-xl bg-[#FDF2F0] dark:bg-[#2C1816] border border-[#F5C2B8] dark:border-[#5C2A24] text-xs font-semibold text-[#B44C3A] dark:text-[#F08C7D]">
            {letterError}
          </div>
        )}

        {/* Letter Paper Display */}
        <div className="bg-white/95 dark:bg-[#121E18] rounded-2xl p-5 sm:p-7 border border-[#E8E2D5] dark:border-[#223326] shadow-xs relative z-10 space-y-4 transition-colors">
          <div className="flex items-center justify-between border-b border-[#ECE7DC] dark:border-[#223326] pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#738541] animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#738541] dark:text-[#9EB868]">
                {letterType === 'six_month'
                  ? 'From: 6 Months Ahead'
                  : letterType === 'five_year'
                  ? 'From: 5 Years Ahead'
                  : 'From: Current Path Warning'}
              </span>
            </div>

            {letterContent && (
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#4E5642] dark:text-[#9BAF90] hover:bg-[#FAF8F3] dark:hover:bg-[#1D2F25] border border-[#E8E2D5] dark:border-[#223326] transition-colors cursor-pointer"
              >
                <FontAwesomeIcon icon={copied ? faCheck : faCopy} className={copied ? 'text-[#556E2B] dark:text-[#9EB868]' : ''} />
                <span>{copied ? 'Copied' : 'Copy Letter'}</span>
              </button>
            )}
          </div>

          <div className="font-serif text-sm sm:text-base text-[#1D2516] dark:text-[#F0EBE1] leading-relaxed italic whitespace-pre-wrap">
            {letterContent ||
              `"Dear ${displayName},\n\nThe daily choices you make right now are not disappearing into the void. The consistency you bring to your morning hydration, sleep, and focus is building the unshakeable foundation we stand on today.\n\nEvery time you choose intentionality over distraction, you make my life here easier, calmer, and more grounded. Stay unhurried and keep showing up."`}
          </div>

          {/* Key Themes & Action Items */}
          {keyThemes.length > 0 && (
            <div className="pt-3 border-t border-[#ECE7DC] dark:border-[#223326] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-[#6F6759] dark:text-[#9BAF90]">Themes:</span>
                {keyThemes.map((theme, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full bg-[#FAF8F3] dark:bg-[#1B2921] border border-[#E8E2D5] dark:border-[#223326] text-[11px] font-semibold text-[#4E5642] dark:text-[#C5D8B8]">
                    {theme}
                  </span>
                ))}
              </div>

              {actionItems.length > 0 && (
                <div className="text-[11px] font-semibold text-[#738541] dark:text-[#9EB868] flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faBullseye} className="text-[#556933] dark:text-[#9EB868] text-xs" />
                  <span>Future Advice: {actionItems[0]}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
