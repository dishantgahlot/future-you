import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCalendarDays,
  faStar,
  faTriangleExclamation,
  faClock,
  faWandMagicSparkles,
  faCopy,
  faDownload,
  faShareNodes,
  faCheck,
  faTrashCan,
  faEnvelope,
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { useState } from 'react'
import type { FutureLetter } from '../../types'
import './FutureLetterDisplay.css'

interface FutureLetterDisplayProps {
  letter: FutureLetter
  onRegenerate?: (letterType: 'six_month' | 'five_year' | 'current_path') => void
  onDelete?: (id: string) => void
  showActions?: boolean
  className?: string
}

const letterTypeLabels: Record<string, { label: string; icon: IconDefinition; description: string }> = {
  six_month: {
    label: '6-Month Future Self',
    icon: faCalendarDays,
    description: 'A letter from you 6 months from now',
  },
  five_year: {
    label: '5-Year Future Self',
    icon: faStar,
    description: 'A visionary letter from you 5 years from now',
  },
  current_path: {
    label: 'Current Path Continuation',
    icon: faTriangleExclamation,
    description: 'What happens if nothing changes',
  },
}

const letterTypeColors: Record<string, string> = {
  six_month: 'letter-six-month',
  five_year: 'letter-five-year',
  current_path: 'letter-current-path',
}

export function FutureLetterDisplay({
  letter,
  onRegenerate,
  onDelete,
  showActions = true,
  className = '',
}: FutureLetterDisplayProps) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const typeInfo = letterTypeLabels[letter.letter_type] || letterTypeLabels.six_month
  const typeColorClass = letterTypeColors[letter.letter_type] || 'letter-six-month'

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(letter.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([letter.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `future-letter-${letter.letter_type}-${new Date(letter.generated_at).toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: typeInfo.label,
          text: letter.content,
        })
      } catch (err) {
        console.error('Share failed:', err)
      }
    } else {
      handleCopy()
    }
  }

  const handleRegenerate = () => {
    onRegenerate?.(letter.letter_type as 'six_month' | 'five_year' | 'current_path')
  }

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this letter?')) {
      onDelete?.(letter.id)
    }
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`future-letter-card ${typeColorClass} ${className}`}
    >
      {/* Header */}
      <header className="future-letter-header">
        <div className="future-letter-type">
          <span className="future-letter-icon" aria-hidden="true">
            <FontAwesomeIcon icon={typeInfo.icon} />
          </span>
          <div className="future-letter-type-info">
            <h3 className="future-letter-title">{typeInfo.label}</h3>
            <p className="future-letter-description">{typeInfo.description}</p>
          </div>
        </div>
        <div className="future-letter-meta">
          <time className="future-letter-date" dateTime={letter.generated_at}>
            <FontAwesomeIcon icon={faClock} className="w-3.5 h-3.5" aria-hidden="true" />
            <span>
              {new Date(letter.generated_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </time>
        </div>
      </header>

      {/* Content */}
      <div className="future-letter-content">
        <div
          className={`future-letter-text ${!expanded ? 'truncated' : ''}`}
          style={{ whiteSpace: 'pre-wrap' }}
        >
          {letter.content}
        </div>
        {letter.content.length > 500 && (
          <button
            className="future-letter-expand-btn"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Show Less' : 'Read Full Letter'}
          </button>
        )}
      </div>

      {/* Key Themes & Action Items */}
      {((letter.key_themes && letter.key_themes.length > 0) ||
        (letter.action_items && letter.action_items.length > 0)) && (
        <div className="future-letter-insights">
          {letter.key_themes && letter.key_themes.length > 0 && (
            <div className="future-letter-themes">
              <h4>Key Themes</h4>
              <div className="future-letter-theme-tags">
                {letter.key_themes.map((theme, i) => (
                  <span key={i} className="future-letter-tag">
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          )}
          {letter.action_items && letter.action_items.length > 0 && (
            <div className="future-letter-actions-list">
              <h4>Action Items for Today</h4>
              <ul>
                {letter.action_items.map((action, i) => (
                  <li key={i}>
                    <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3 text-[#738541]" />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {showActions && (
        <footer className="future-letter-actions">
          <button
            className="future-letter-action"
            onClick={handleCopy}
            aria-label={copied ? 'Copied!' : 'Copy letter'}
            title={copied ? 'Copied!' : 'Copy letter'}
          >
            {copied ? (
              <>
                <FontAwesomeIcon icon={faCheck} className="w-3.5 h-3.5" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faCopy} className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Copy</span>
              </>
            )}
          </button>
          <button
            className="future-letter-action"
            onClick={handleDownload}
            aria-label="Download letter"
            title="Download letter"
          >
            <FontAwesomeIcon icon={faDownload} className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Download</span>
          </button>
          <button
            className="future-letter-action"
            onClick={handleShare}
            aria-label="Share letter"
            title="Share letter"
          >
            <FontAwesomeIcon icon={faShareNodes} className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Share</span>
          </button>
          {onRegenerate && (
            <button
              className="future-letter-action regenerate"
              onClick={handleRegenerate}
              aria-label="Regenerate letter"
              title="Regenerate with AI"
            >
              <FontAwesomeIcon icon={faWandMagicSparkles} className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Regenerate</span>
            </button>
          )}
          {onDelete && (
            <button
              className="future-letter-action danger"
              onClick={handleDelete}
              aria-label="Delete letter"
              title="Delete letter"
            >
              <FontAwesomeIcon icon={faTrashCan} className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
        </footer>
      )}
    </motion.article>
  )
}

// Export a list version for multiple letters
export function FutureLetterList({ letters, onRegenerate, onDelete, emptyMessage }: {
  letters: FutureLetter[]
  onRegenerate?: (letterType: 'six_month' | 'five_year' | 'current_path') => void
  onDelete?: (id: string) => void
  emptyMessage?: string
}) {
  if (letters.length === 0) {
    return (
      <div className="future-letter-empty">
        <FontAwesomeIcon icon={faEnvelope} className="w-12 h-12 text-[#8C8271]" aria-hidden="true" />
        <p>{emptyMessage || 'No letters generated yet. Generate your first letter above!'}</p>
      </div>
    )
  }

  return (
    <div className="future-letter-list">
      {letters.map((letter) => (
        <FutureLetterDisplay
          key={letter.id}
          letter={letter}
          onRegenerate={onRegenerate}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
