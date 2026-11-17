import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Sparkles, MessageSquare, Zap, Loader2 } from 'lucide-react'
import { useAICoach } from '../../hooks/useAI'
import './AICoachModal.css'

export function AICoachModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const {
    messages,
    loading,
    error,
    askQuestion,
  } = useAICoach()

  const [input, setInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const suggestedQuestions = [
    "What should I focus on this week?",
    "How can I improve my sleep?",
    "Why is my consistency decreasing?",
    "How can I reduce my screen time?",
    "What happens if I improve my habits?",
    "Which habit should I prioritize?",
    "Help me build a morning routine",
    "How do I stay motivated?",
  ]

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const question = input.trim()
    setInput('')
    setShowSuggestions(false)
    await askQuestion(question)
  }

  const handleSuggestionClick = (question: string) => {
    setInput(question)
    setShowSuggestions(false)
    // Auto-submit
    setTimeout(() => {
      handleSubmit(new Event('submit') as unknown as React.FormEvent)
    }, 0)
  }

  const displayError = localError || error

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="ai-coach-modal-overlay"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="AI Coach"
      >
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          className="ai-coach-modal"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="ai-coach-header">
            <div className="ai-coach-title">
              <div className="ai-coach-avatar">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3>AI Coach</h3>
                <p className="ai-coach-subtitle">Your personal habit companion</p>
              </div>
            </div>
            <button
              className="ai-coach-close"
              onClick={onClose}
              aria-label="Close AI Coach"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="ai-coach-messages">
            <AnimatePresence mode="popLayout">
              {messages.length === 0 && (
                <motion.div
                  key="welcome"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="ai-coach-welcome"
                >
                  <div className="ai-coach-welcome-avatar">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4>Hi! I'm your AI Coach</h4>
                  <p>Ask me anything about your habits, predictions, or goals.</p>
                  <div className="ai-coach-suggestions">
                    {suggestedQuestions.slice(0, 4).map((q, idx) => (
                      <button
                        key={q}
                        className="ai-coach-suggestion-chip"
                        onClick={() => handleSuggestionClick(q)}
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
              {messages.map((message, index) => (
                <motion.div
                  key={`${message.role}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`ai-coach-message ${message.role}`}
                >
                  <div className="ai-coach-message-avatar">
                    {message.role === 'assistant' ? (
                      <Sparkles className="w-5 h-5" />
                    ) : (
                      <MessageSquare className="w-5 h-5" />
                    )}
                  </div>
                  <div className="ai-coach-message-content">
                    <div className="ai-coach-message-text">
                      {message.content}
                    </div>
                    {message.followUpQuestions && message.followUpQuestions.length > 0 && (
                      <div className="ai-coach-followups">
                        <span className="ai-coach-followups-label">Follow up:</span>
                        <div className="ai-coach-followup-chips">
                          {message.followUpQuestions.slice(0, 3).map((q, _idx) => (
                            <button
                              key={q}
                              className="ai-coach-followup-chip"
                              onClick={() => handleSuggestionClick(q)}
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {message.suggestedActions && message.suggestedActions.length > 0 && (
                      <div className="ai-coach-actions">
                        <span className="ai-coach-actions-label">Try this:</span>
                        <div className="ai-coach-action-chips">
                          {message.suggestedActions.slice(0, 3).map((a, _idx) => (
                            <button
                              key={a}
                              className="ai-coach-action-chip"
                              onClick={() => handleSuggestionClick(a)}
                            >
                              <Zap className="w-3 h-3" />
                              {a}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              {loading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="ai-coach-loading"
                >
                  <div className="ai-coach-message-avatar">
                    <Sparkles className="w-5 h-5 animate-spin" />
                  </div>
                  <div className="ai-coach-loading-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          {/* Error */}
          {displayError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="ai-coach-error"
            >
              <p>{displayError}</p>
              <button onClick={() => setLocalError('')}>Dismiss</button>
            </motion.div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="ai-coach-input-form">
            {showSuggestions && messages.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="ai-coach-suggestions-bar"
              >
                <span>Suggestions:</span>
                <div className="ai-coach-suggestion-chips">
                  {suggestedQuestions.slice(4, 8).map((q, idx) => (
                    <button
                      key={q}
                      type="button"
                      className="ai-coach-suggestion-chip"
                      onClick={() => handleSuggestionClick(q)}
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
            <div className="ai-coach-input-wrapper">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Ask me anything..."
                rows={1}
                className="ai-coach-input"
                disabled={loading}
                aria-label="Ask AI Coach a question"
              />
              <button
                type="submit"
                className="ai-coach-send"
                disabled={!input.trim() || loading}
                aria-label="Send message"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default AICoachModal