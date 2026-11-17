import { useState } from 'react'
import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faEnvelope,
  faWandMagicSparkles,
  faRotateRight,
  faChevronDown,
  faChevronUp,
  faCalendarDays,
  faStar,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { useFutureLetters } from '../hooks/useAI'
import { FutureLetterDisplay, FutureLetterList } from '../components/ai/FutureLetterDisplay'
import './FutureLetters.css'

const letterTypes: Array<{
  type: 'six_month' | 'five_year' | 'current_path'
  label: string
  icon: IconDefinition
  description: string
}> = [
  {
    type: 'six_month',
    label: '6-Month Future Self',
    icon: faCalendarDays,
    description: 'An encouraging letter from you 6 months from now, reflecting on your progress',
  },
  {
    type: 'five_year',
    label: '5-Year Future Self',
    icon: faStar,
    description: 'A visionary letter from you 5 years from now, sharing wisdom and perspective',
  },
  {
    type: 'current_path',
    label: 'Current Path Continuation',
    icon: faTriangleExclamation,
    description: 'A wake-up call showing what happens if your habits stay the same',
  },
]

export function FutureLetters() {
  const { letters, loading, error, fetchLetters, generateLetter, deleteLetter } = useFutureLetters()
  const [generating, setGenerating] = useState<string | null>(null)
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({})

  const handleGenerate = async (letterType: 'six_month' | 'five_year' | 'current_path') => {
    setGenerating(letterType)
    await generateLetter(letterType, false)
    setGenerating(null)
  }

  const handleRegenerate = async (letterType: 'six_month' | 'five_year' | 'current_path') => {
    setGenerating(letterType)
    await generateLetter(letterType, true)
    setGenerating(null)
  }

  const handleDelete = async (id: string) => {
    await deleteLetter(id)
  }

  const toggleExpanded = (type: string) => {
    setExpandedTypes((prev) => ({ ...prev, [type]: !prev[type] }))
  }

  return (
    <div className="future-letters-page">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="future-letters-header"
      >
        <div className="future-letters-header-content">
          <div className="future-letters-header-icon">
            <FontAwesomeIcon icon={faEnvelope} className="w-8 h-8 text-[#556933]" aria-hidden="true" />
          </div>
          <div>
            <h1 className="future-letters-page-title">Future Letters</h1>
            <p className="future-letters-page-subtitle">
              Letters from your future self — encouragement, vision, and reality checks
            </p>
          </div>
        </div>
        <button
          className="future-letters-refresh-btn"
          onClick={() => fetchLetters()}
          disabled={loading}
          aria-label="Refresh letters"
        >
          <FontAwesomeIcon
            icon={faRotateRight}
            className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
          />
        </button>
      </motion.div>

      {/* Generate New Letter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="future-letters-generate"
      >
        <h2 className="future-letters-section-title">Generate New Letter</h2>
        <p className="future-letters-section-desc">
          Choose a letter type to receive a personalized message from your future self
        </p>
        <div className="future-letters-types-grid">
          {letterTypes.map((letterType, index) => (
            <motion.div
              key={letterType.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + index * 0.08 }}
              className={`future-letters-type-card ${
                letters.some((l) => l.letter_type === letterType.type) ? 'has-letter' : ''
              }`}
            >
              <div className="future-letters-type-header">
                <span className="future-letters-type-icon" aria-hidden="true">
                  <FontAwesomeIcon icon={letterType.icon} />
                </span>
                <div className="future-letters-type-info">
                  <h3 className="future-letters-type-title">{letterType.label}</h3>
                  <p className="future-letters-type-desc">{letterType.description}</p>
                </div>
              </div>
              <div className="future-letters-type-actions">
                {letters.some((l) => l.letter_type === letterType.type) ? (
                  <>
                    <button
                      className="future-letters-btn future-letters-btn-secondary"
                      onClick={() => handleRegenerate(letterType.type)}
                      disabled={generating === letterType.type}
                      aria-label={`Regenerate ${letterType.label}`}
                    >
                      <FontAwesomeIcon
                        icon={faRotateRight}
                        className={`w-3.5 h-3.5 ${generating === letterType.type ? 'animate-spin' : ''}`}
                      />
                      <span>Regenerate</span>
                    </button>
                    <button
                      className="future-letters-btn future-letters-btn-primary"
                      onClick={() => toggleExpanded(letterType.type)}
                      aria-label={`View ${letterType.label}`}
                      aria-expanded={expandedTypes[letterType.type]}
                    >
                      <FontAwesomeIcon
                        icon={expandedTypes[letterType.type] ? faChevronUp : faChevronDown}
                        className="w-3.5 h-3.5"
                      />
                      <span>View</span>
                    </button>
                  </>
                ) : (
                  <button
                    className="future-letters-btn future-letters-btn-primary wide"
                    onClick={() => handleGenerate(letterType.type)}
                    disabled={generating === letterType.type}
                    aria-label={`Generate ${letterType.label}`}
                  >
                    {generating === letterType.type ? (
                      <>
                        <FontAwesomeIcon icon={faRotateRight} className="w-3.5 h-3.5 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faWandMagicSparkles} className="w-3.5 h-3.5" />
                        <span>Generate</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              {expandedTypes[letterType.type] &&
                letters.some((l) => l.letter_type === letterType.type) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="future-letters-letter-preview"
                  >
                    {letters
                      .filter((l) => l.letter_type === letterType.type)
                      .map((letter) => (
                        <FutureLetterDisplay
                          key={letter.id}
                          letter={letter}
                          onRegenerate={handleRegenerate}
                          onDelete={handleDelete}
                          showActions={true}
                        />
                      ))}
                  </motion.div>
                )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Saved Letters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="future-letters-saved"
      >
        <div className="future-letters-saved-header">
          <h2 className="future-letters-section-title">Your Letters</h2>
          {letters.length > 0 && (
            <span className="future-letters-count">
              {letters.length} letter{letters.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {letters.length === 0 ? (
          <div className="future-letters-empty">
            <FontAwesomeIcon icon={faEnvelope} className="w-12 h-12 text-[#8C8271]" aria-hidden="true" />
            <h3>No letters yet</h3>
            <p>Generate your first letter from your future self above!</p>
          </div>
        ) : (
          <FutureLetterList
            letters={letters}
            onRegenerate={handleRegenerate}
            onDelete={handleDelete}
            emptyMessage="No letters saved yet"
          />
        )}
      </motion.div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="future-letters-error"
        >
          <p>{error}</p>
          <button onClick={() => fetchLetters()}>Retry</button>
        </motion.div>
      )}
    </div>
  )
}

export default FutureLetters
