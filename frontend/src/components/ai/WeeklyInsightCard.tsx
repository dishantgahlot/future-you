import { motion } from 'framer-motion'
import { TrendingUp, Target, Lightbulb, AlertTriangle, Sparkles, Calendar, Copy } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import { useState } from 'react'
import type { WeeklyInsight } from '../../types'
import './WeeklyInsightCard.css'

interface WeeklyInsightCardProps {
  insight: WeeklyInsight | null
  onGenerate?: () => void
  onRefresh?: () => void
  loading?: boolean
  compact?: boolean
  className?: string
}

export function WeeklyInsightCard({
  insight,
  onGenerate,
  onRefresh,
  loading = false,
  compact = false,
  className = '',
}: WeeklyInsightCardProps) {
  const [copied, setCopied] = useState(false)

  if (!insight) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`weekly-insight-card empty ${className}`}
      >
        <div className="weekly-insight-empty">
          <Lightbulb className="w-12 h-12" aria-hidden="true" />
          <h3>No Weekly Insight Yet</h3>
          <p>Generate your first AI-powered weekly analysis</p>
          {onGenerate && !loading && (
            <button className="weekly-insight-generate-btn" onClick={onGenerate}>
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              Generate Insight
            </button>
          )}
          {loading && (
            <div className="weekly-insight-loading">
              <div className="weekly-insight-spinner" />
              <span>Generating...</span>
            </div>
          )}
        </div>
      </motion.div>
    )
  }

  const handleCopy = async () => {
    const text = `${insight.summary}\n\n${insight.highlights.map(h => `✓ ${h}`).join('\n')}\n\n${insight.lowlights.map(l => `⚠ ${l}`).join('\n')}\n\nRecommendations:\n${insight.recommendations.map(r => `→ ${r}`).join('\n')}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const weekStartDate = new Date(insight.week_start)
  const weekEndDate = new Date(weekStartDate)
  weekEndDate.setDate(weekEndDate.getDate() + 6)

  const formatWeekRange = () => {
    return `${weekStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`weekly-insight-card ${compact ? 'compact' : ''} ${insight.usedFallback ? 'fallback' : ''} ${className}`}
    >
      {/* Header */}
      <header className="weekly-insight-header">
        <div className="weekly-insight-title-section">
          <div className="weekly-insight-icon">
            <Sparkles className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h3 className="weekly-insight-title">Weekly Insight</h3>
            <p className="weekly-insight-week">
              <Calendar className="w-3 h-3" aria-hidden="true" />
              {formatWeekRange()}
            </p>
          </div>
        </div>
        <div className="weekly-insight-header-actions">
          {!compact && (
            <>
              <button
                className="weekly-insight-action-btn"
                onClick={handleCopy}
                aria-label={copied ? 'Copied!' : 'Copy insight'}
                title={copied ? 'Copied!' : 'Copy insight'}
              >
                {copied ? (
                  <FontAwesomeIcon icon={faCheck} className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
              {onRefresh && (
                <button
                  className="weekly-insight-action-btn"
                  onClick={onRefresh}
                  aria-label="Refresh insight"
                  title="Generate new insight"
                  disabled={loading}
                >
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </>
          )}
        </div>
      </header>

      {/* Summary */}
      <div className="weekly-insight-summary">
        <p>{insight.summary}</p>
      </div>

      {!compact && (
        <>
          {/* Highlights */}
          {insight.highlights && insight.highlights.length > 0 && (
            <section className="weekly-insight-section highlights">
              <h4 className="weekly-insight-section-title">
                <TrendingUp className="w-4 h-4" aria-hidden="true" />
                Highlights
              </h4>
              <ul className="weekly-insight-list">
                {insight.highlights.map((highlight, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="weekly-insight-item positive"
                  >
                    <span className="weekly-insight-bullet" aria-hidden="true">
                      <FontAwesomeIcon icon={faCheck} className="w-3 h-3 text-emerald-500" />
                    </span>
                    <span>{highlight}</span>
                  </motion.li>
                ))}
              </ul>
            </section>
          )}

          {/* Lowlights */}
          {insight.lowlights && insight.lowlights.length > 0 && (
            <section className="weekly-insight-section lowlights">
              <h4 className="weekly-insight-section-title">
                <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                Areas to Improve
              </h4>
              <ul className="weekly-insight-list">
                {insight.lowlights.map((lowlight, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="weekly-insight-item negative"
                  >
                    <span className="weekly-insight-bullet" aria-hidden="true">
                      <FontAwesomeIcon icon={faTriangleExclamation} className="w-3 h-3 text-amber-500" />
                    </span>
                    <span>{lowlight}</span>
                  </motion.li>
                ))}
              </ul>
            </section>
          )}

          {/* Recommendations */}
          {insight.recommendations && insight.recommendations.length > 0 && (
            <section className="weekly-insight-section recommendations">
              <h4 className="weekly-insight-section-title">
                <Target className="w-4 h-4" aria-hidden="true" />
                Recommendations
              </h4>
              <ul className="weekly-insight-list">
                {insight.recommendations.map((rec, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="weekly-insight-item recommendation"
                  >
                    <span className="weekly-insight-bullet" aria-hidden="true">→</span>
                    <span>{rec}</span>
                  </motion.li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {/* Full Insight Text (for compact mode, show as expandable) */}
      {compact && insight.insight && (
        <details className="weekly-insight-full">
          <summary>View full insight</summary>
          <div className="weekly-insight-full-content">
            {insight.insight.split('\n').map((paragraph, i) => (
              <p key={i}>{paragraph || <br />}</p>
            ))}
          </div>
        </details>
      )}

      {/* Footer Actions */}
      {!compact && onGenerate && (
        <footer className="weekly-insight-footer">
          <button className="weekly-insight-regenerate" onClick={onGenerate} disabled={loading}>
            {loading ? (
              <>
                <div className="weekly-insight-spinner-sm" />
                Regenerating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                Regenerate Insight
              </>
            )}
          </button>
        </footer>
      )}
    </motion.article>
  )
}

// Compact list version for dashboard
export function WeeklyInsightList({ insights, onGenerate, loading }: {
  insights: WeeklyInsight[]
  onGenerate?: () => void
  loading?: boolean
}) {
  if (insights.length === 0) {
    return (
      <WeeklyInsightCard
        insight={null}
        onGenerate={onGenerate}
        loading={loading}
        compact={true}
      />
    )
  }

  return (
    <div className="weekly-insight-list">
      {insights.slice(0, 3).map(insight => (
        <WeeklyInsightCard
          key={insight.id}
          insight={insight}
          compact={true}
        />
      ))}
      {insights.length > 3 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="weekly-insight-see-more"
        >
          <p>+{insights.length - 3} more insights</p>
        </motion.div>
      )}
    </div>
  )
}

export default WeeklyInsightCard