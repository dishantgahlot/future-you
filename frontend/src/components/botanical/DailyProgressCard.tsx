import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClock } from '@fortawesome/free-solid-svg-icons'
import { motion } from 'framer-motion'

interface DailyProgressCardProps {
  completed?: number
  inProgress?: number
  pending?: number
  total?: number
  overallPercent?: number
}

export function DailyProgressCard({
  completed = 0,
  inProgress = 0,
  pending: propPending,
  total = 6,
  overallPercent,
}: DailyProgressCardProps) {
  const safeTotal = total > 0 ? total : 6
  const percent =
    overallPercent !== undefined
      ? Math.min(Math.max(overallPercent, 0), 100)
      : Math.min(Math.round((completed / safeTotal) * 100), 100)

  const pending =
    propPending !== undefined
      ? propPending
      : Math.max(safeTotal - completed - inProgress, 0)

  // SVG circular gauge math
  const size = 96
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percent / 100) * circumference

  return (
    <div className="bg-white dark:bg-[#0D1814] border border-botanical-border dark:border-[#223326] rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col justify-between relative overflow-hidden transition-colors">
      {/* Mountain & Pine Trees Line Art Watermark in Bottom-Right */}
      <div className="absolute right-2 bottom-1 w-36 h-20 pointer-events-none select-none text-[#738541]/20 dark:text-[#A8D968]/10">
        <svg viewBox="0 0 160 80" fill="none" stroke="currentColor" strokeWidth="1.2" className="w-full h-full">
          {/* Distant mountain ridge */}
          <path d="M10 70 L50 35 L80 55 L120 20 L155 70" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M45 40 L60 50 L95 28 L130 58" strokeLinecap="round" strokeLinejoin="round" />
          {/* Pine trees on the right ridge */}
          <path d="M135 70 L135 48 M130 65 L135 60 L140 65 M131 58 L135 53 L139 58 M132 52 L135 47 L138 52" strokeLinecap="round" />
          <path d="M145 70 L145 42 M140 60 L145 54 L150 60 M141 52 L145 46 L149 52 M142 46 L145 41 L148 46" strokeLinecap="round" />
          <path d="M125 70 L125 54 M121 66 L125 62 L129 66 M122 61 L125 57 L128 61" strokeLinecap="round" />
          {/* Flying birds in sky */}
          <path d="M85 22 Q90 18 95 22 Q100 18 105 22" strokeLinecap="round" strokeWidth="0.9" />
          <path d="M100 14 Q103 11 106 14 Q109 11 112 14" strokeLinecap="round" strokeWidth="0.8" />
        </svg>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#E8E3D7] dark:border-[#223326] relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#EEF4E8] dark:bg-[#1D2D23] flex items-center justify-center text-[#738541] dark:text-[#9EB868] shadow-2xs">
            <FontAwesomeIcon icon={faClock} className="w-4 h-4 text-[#738541] dark:text-[#9EB868]" />
          </div>
          <div>
            <h3 className="text-xl font-serif font-bold text-[#1D2516] dark:text-[#F5F2EB] leading-none">
              Daily Progress
            </h3>
            <p className="text-xs text-[#52633E] dark:text-[#8FA387] font-semibold mt-0.5">
              Live status for today
            </p>
          </div>
        </div>
      </div>

      {/* Body: Circular Ring on Left + Legend on Right */}
      <div className="flex items-center justify-between gap-5 py-3 relative z-10">
        {/* Radial Gauge with Centered Percent */}
        <div className="relative w-24 h-24 sm:w-26 sm:h-26 flex items-center justify-center flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
            {/* Background Track */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#E8EEDD"
              className="dark:stroke-[#1D2D23]"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Progress Arc */}
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#738541"
              className="dark:stroke-[#22C55E]"
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </svg>

          {/* Centered Values with Strong Legibility */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-serif font-bold text-[#1D2516] dark:text-[#F5F2EB] leading-none tabular-nums">
              {percent}%
            </span>
            <span className="text-xs font-bold text-[#52633E] dark:text-[#8FA387] mt-1 tabular-nums">
              {completed} of {safeTotal} done
            </span>
          </div>
        </div>

        {/* Legend List with Detailed High Contrast Breakdown */}
        <div className="flex flex-col gap-2 flex-1 pl-1">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-[#738541] dark:bg-[#22C55E] flex-shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-[#1D2516] dark:text-[#F5F2EB] tabular-nums">
              {completed} completed
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-[#E5B54F] dark:bg-amber-400 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-[#1D2516] dark:text-[#F5F2EB] tabular-nums">
              {inProgress} in progress
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-[#CBD5E1] dark:bg-[#2E4334] flex-shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-[#6D7B58] dark:text-[#8FA387] tabular-nums">
              {pending} pending
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
