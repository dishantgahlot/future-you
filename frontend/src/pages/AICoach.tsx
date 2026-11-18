import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faLayerGroup,
  faMoon,
  faBookOpen,
  faMobileScreen,
  faWandMagicSparkles,
  faArrowUp,
  faPlus,
  faCopy,
  faCheck,
  faComment,
  faArrowTrendUp,
  faAnglesLeft,
  faAnglesRight,
  faRotateLeft,
  faCompass,
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { Link } from 'react-router-dom'
import { useUserProfile } from '../contexts/UserProfileContext'
import { useAICoach } from '../hooks/useAI'

interface StarterPrompt {
  icon: IconDefinition
  title: string
  subtitle: string
  prompt: string
  category: 'sleep' | 'study' | 'screen_time' | 'prediction'
}

const STARTER_PROMPTS: StarterPrompt[] = [
  {
    icon: faMoon,
    title: 'Deep Sleep Recovery',
    subtitle: 'Overcome late-night fatigue and morning grogginess',
    prompt: 'How can I establish a consistent 8-hour sleep routine and eliminate bedtime screen distractions?',
    category: 'sleep',
  },
  {
    icon: faBookOpen,
    title: 'Study Momentum',
    subtitle: 'Build sustainable focus without mental exhaustion',
    prompt: 'Give me a micro-habit strategy to lock in 2 hours of deep, distraction-free study every single day.',
    category: 'study',
  },
  {
    icon: faMobileScreen,
    title: 'Dopamine & Screen Time',
    subtitle: 'Reduce digital clutter and compulsive phone checking',
    prompt: 'What practical friction rules can I use to cut my phone screen time to under 3 hours daily?',
    category: 'screen_time',
  },
  {
    icon: faArrowTrendUp,
    title: '5-Year Habit Trajectory',
    subtitle: 'Simulate how compounding daily habits shape you',
    prompt: 'Simulate my trajectory: what will my health, energy, and career look like in 5 years on my improved habit path?',
    category: 'prediction',
  },
]

const CATEGORY_CHIPS = [
  { id: 'general', label: 'All Topics', icon: faLayerGroup },
  { id: 'sleep', label: 'Sleep', icon: faMoon },
  { id: 'study', label: 'Study', icon: faBookOpen },
  { id: 'screen_time', label: 'Screen Time', icon: faMobileScreen },
  { id: 'prediction', label: 'Predictions', icon: faWandMagicSparkles },
]

export function AICoach() {
  const { avatarUrl, fullName } = useUserProfile()
  const { messages, history, loading, askQuestion, clearMessages } = useAICoach()

  const [inputMessage, setInputMessage] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('general')
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Auto-resize textarea height
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`
    }
  }

  const handleSend = async (textOverride?: string, customCategory?: string) => {
    const textToSend = (textOverride || inputMessage).trim()
    if (!textToSend || loading) return

    setInputMessage('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    const cat = customCategory || (selectedCategory !== 'general' ? selectedCategory : undefined)
    await askQuestion(textToSend, cat)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleCopy = (content: string, index: number) => {
    navigator.clipboard.writeText(content)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  // Format message content with clean botanical typography and markdown-like parsing
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n')
    return (
      <div className="space-y-3 leading-relaxed text-sm sm:text-base text-leaf-darkText font-normal">
        {lines.map((line, idx) => {
          const trimmed = line.trim()
          if (!trimmed) {
            return <div key={idx} className="h-1.5" />
          }

          // Headers
          if (trimmed.startsWith('### ')) {
            return (
              <h4 key={idx} className="font-serif font-bold text-base text-leaf-darkText pt-2">
                {trimmed.replace('### ', '')}
              </h4>
            )
          }
          if (trimmed.startsWith('## ')) {
            return (
              <h3 key={idx} className="font-serif font-bold text-lg text-leaf-darkText pt-3 border-b border-botanical-border/60 pb-1">
                {trimmed.replace('## ', '')}
              </h3>
            )
          }

          // Bullet points
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const bulletText = trimmed.substring(2)
            return (
              <div key={idx} className="flex items-start gap-2.5 pl-1">
                <span className="w-1.5 h-1.5 rounded-full bg-leaf-1 mt-2 flex-shrink-0" />
                <span dangerouslySetInnerHTML={{ __html: formatBoldAndItalic(bulletText) }} />
              </div>
            )
          }

          // Numbered lists (1. , 2. )
          const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/)
          if (numMatch) {
            return (
              <div key={idx} className="flex items-start gap-2.5 pl-1">
                <span className="font-bold text-leaf-1 text-xs sm:text-sm mt-0.5 flex-shrink-0 min-w-[18px]">
                  {numMatch[1]}.
                </span>
                <span dangerouslySetInnerHTML={{ __html: formatBoldAndItalic(numMatch[2]) }} />
              </div>
            )
          }

          // Standard paragraph
          return (
            <p key={idx} dangerouslySetInnerHTML={{ __html: formatBoldAndItalic(trimmed) }} />
          )
        })}
      </div>
    )
  }

  const formatBoldAndItalic = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-leaf-darkText">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-botanical-mutedText">$1</em>')
      .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-botanical-cream rounded-md font-mono text-xs text-leaf-1 border border-botanical-border">$1</code>')
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] bg-botanical-cream rounded-3xl border border-botanical-border shadow-xs overflow-hidden relative">
      {/* Mobile Backdrop for Chat History Drawer */}
      {isSidebarOpen && (
        <div
          className="md:hidden absolute inset-0 bg-black/45 backdrop-blur-xs z-25 transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ==================================================================== */}
      {/* 1. CHATGPT-STYLE SIDEBAR (History & Sessions) */}
      {/* ==================================================================== */}
      <aside
        className={`absolute md:relative z-30 h-full bg-white border-r border-botanical-border flex flex-col justify-between transition-all duration-300 ${
          isSidebarOpen ? 'w-64 sm:w-72 translate-x-0 shadow-xl md:shadow-none' : 'w-0 -translate-x-full md:translate-x-0 md:w-0'
        } overflow-hidden`}
      >
        <div className="p-4 flex flex-col h-full justify-between">
          <div>
            {/* New Chat Button */}
            <button
              onClick={() => clearMessages()}
              className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-leaf-pill text-leaf-pillText hover:bg-leaf-1 hover:text-white rounded-2xl font-medium text-sm transition-all duration-200 shadow-xs group cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <FontAwesomeIcon icon={faPlus} className="w-4 h-4 transition-transform group-hover:rotate-90 duration-200" />
                New Chat
              </span>
              <span className="text-xs px-2 py-0.5 bg-white/70 text-leaf-darkText rounded-full font-semibold">
                ⌘N
              </span>
            </button>

            {/* Conversation History Section */}
            <div className="mt-6">
              <div className="flex items-center justify-between text-xs font-semibold text-botanical-mutedText uppercase tracking-wider px-2 mb-2">
                <span>Recent Chats</span>
                <span className="text-[10px] bg-botanical-cream px-2 py-0.5 rounded-full border border-botanical-border">
                  {history.length}
                </span>
              </div>

              <div className="space-y-1 max-h-[calc(100vh-22rem)] overflow-y-auto pr-1">
                {history.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs text-botanical-mutedText">
                    <FontAwesomeIcon icon={faComment} className="w-6 h-6 mx-auto mb-2 text-leaf-6 opacity-60" />
                    <p>No past chat history</p>
                    <p className="text-[11px] text-leaf-6 mt-0.5">Your sessions save automatically</p>
                  </div>
                ) : (
                  history.slice(0, 15).map((session, idx) => (
                    <button
                      key={session.id || idx}
                      onClick={() => handleSend(session.question)}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-botanical-cream text-xs text-leaf-darkText font-medium transition-colors flex items-center gap-2.5 group cursor-pointer"
                    >
                      <FontAwesomeIcon icon={faComment} className="w-3.5 h-3.5 text-leaf-6 flex-shrink-0 group-hover:text-leaf-1 transition-colors" />
                      <span className="truncate flex-1">{session.question}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* User profile footer link */}
          <div className="pt-4 border-t border-botanical-border">
            <Link
              to="/profile"
              className="flex items-center gap-3 p-2 rounded-2xl hover:bg-botanical-cream transition-colors group"
              title="Open Profile & Avatar Studio"
            >
              <div className="w-9 h-9 rounded-full overflow-hidden border border-leaf-1 bg-leaf-pill flex-shrink-0">
                <img
                  src={avatarUrl}
                  alt={fullName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-leaf-darkText truncate group-hover:text-leaf-1 transition-colors">
                  {fullName}
                </p>
                <p className="text-[10px] text-botanical-mutedText truncate">
                  Botanical Profile
                </p>
              </div>
            </Link>
          </div>
        </div>
      </aside>

      {/* ==================================================================== */}
      {/* 2. MAIN CHAT AREA */}
      {/* ==================================================================== */}
      <main className="flex-1 flex flex-col h-full bg-botanical-cream/40 overflow-hidden relative">
        {/* Top Header Bar */}
        <header className="h-14 border-b border-botanical-border bg-white/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-xl text-botanical-mutedText hover:text-leaf-darkText hover:bg-botanical-cream transition-colors cursor-pointer"
              title={isSidebarOpen ? 'Close sidebar' : 'Open history sidebar'}
              aria-label="Toggle chat history"
            >
              <FontAwesomeIcon icon={isSidebarOpen ? faAnglesLeft : faAnglesRight} className="w-4 h-4" />
            </button>

            {/* Persona Badge */}
            <div className="flex items-center gap-2 bg-leaf-pill/70 px-3 py-1 rounded-full border border-leaf-1/20">
              <FontAwesomeIcon icon={faWandMagicSparkles} className="w-3.5 h-3.5 text-leaf-1" />
              <span className="text-xs font-bold text-leaf-pillText font-serif">
                Future You Coach
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={() => clearMessages()}
                className="flex items-center gap-1.5 text-xs text-botanical-mutedText hover:text-rose-600 px-3 py-1.5 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                title="Clear current conversation"
              >
                <FontAwesomeIcon icon={faRotateLeft} className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear Chat</span>
              </button>
            )}
          </div>
        </header>

        {/* Message Thread Scroll Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
          {/* ================================================================ */}
          {/* EMPTY STATE / CHATGPT WELCOME SCREEN */}
          {/* ================================================================ */}
          {messages.length === 0 ? (
            <div className="max-w-2xl mx-auto h-full flex flex-col justify-center items-center py-8 text-center space-y-8 animate-fade-in">
              {/* Botanical Center Icon */}
              <div className="space-y-3">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-white border border-botanical-border shadow-sm flex items-center justify-center mx-auto relative group">
                  <div className="absolute inset-0 bg-leaf-pill/40 rounded-3xl transform rotate-6 transition-transform group-hover:rotate-12 duration-300" />
                  <FontAwesomeIcon icon={faCompass} className="w-8 h-8 sm:w-10 sm:h-10 text-leaf-1 relative z-10" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-leaf-darkText tracking-tight">
                  Good day, {fullName}
                </h2>
                <p className="text-xs sm:text-sm text-botanical-mutedText max-w-md mx-auto">
                  Your personal predictive companion. Ask questions about your routines, energy dips, study consistency, or projected 5-year growth.
                </p>
              </div>

              {/* 4 Clickable ChatGPT-Style Prompt Starter Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full text-left">
                {STARTER_PROMPTS.map((starter) => {
                  return (
                    <button
                      key={starter.title}
                      onClick={() => handleSend(starter.prompt, starter.category)}
                      className="p-4 bg-white hover:bg-botanical-surface border border-botanical-border hover:border-leaf-1 rounded-2xl shadow-xs transition-all duration-200 group flex flex-col justify-between text-left cursor-pointer"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="p-1.5 rounded-lg bg-leaf-pill text-leaf-1 group-hover:scale-110 transition-transform">
                            <FontAwesomeIcon icon={starter.icon} className="w-4 h-4" />
                          </span>
                          <span className="text-xs font-serif font-bold text-leaf-darkText">
                            {starter.title}
                          </span>
                        </div>
                        <p className="text-xs text-botanical-mutedText leading-relaxed">
                          {starter.subtitle}
                        </p>
                      </div>
                      <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-leaf-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>Ask this</span>
                        <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3" />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            /* ============================================================== */
            /* ACTIVE CONVERSATION STREAM */
            /* ============================================================== */
            <div className="max-w-3xl mx-auto space-y-6 pb-28">
              {messages.map((message, index) => {
                const isUser = message.role === 'user'

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex items-start gap-3 sm:gap-4 ${
                      isUser ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {/* Assistant Avatar */}
                    {!isUser && (
                      <div className="w-8 h-8 rounded-full bg-leaf-1 text-white flex items-center justify-center flex-shrink-0 shadow-xs mt-1">
                        <FontAwesomeIcon icon={faWandMagicSparkles} className="w-3.5 h-3.5" />
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div
                      className={`relative group max-w-[88%] sm:max-w-[80%] rounded-3xl p-4 sm:p-5 ${
                        isUser
                          ? 'bg-leaf-pill/90 text-leaf-darkText border border-leaf-pillText/15 rounded-tr-xs shadow-xs'
                          : 'bg-white text-leaf-darkText border border-botanical-border rounded-tl-xs shadow-xs'
                      }`}
                    >
                      {/* Message Meta Info */}
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <span className="text-[11px] font-bold text-botanical-mutedText">
                          {isUser ? fullName : 'Future You Coach'}
                        </span>

                        {!isUser && (
                          <button
                            onClick={() => handleCopy(message.content, index)}
                            className="p-1 rounded-lg text-botanical-mutedText hover:text-leaf-darkText hover:bg-black/5 transition-colors opacity-70 group-hover:opacity-100 cursor-pointer"
                            title="Copy response"
                          >
                            {copiedIndex === index ? (
                              <FontAwesomeIcon icon={faCheck} className="w-3.5 h-3.5 text-leaf-1" />
                            ) : (
                              <FontAwesomeIcon icon={faCopy} className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>

                      {/* Message Body */}
                      {isUser ? (
                        <p className="text-sm sm:text-base leading-relaxed font-normal whitespace-pre-wrap">
                          {message.content}
                        </p>
                      ) : (
                        renderFormattedContent(message.content)
                      )}

                      {/* Assistant Follow-up suggestions */}
                      {!isUser && message.followUpQuestions && message.followUpQuestions.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-botanical-border/60 space-y-1.5">
                          <p className="text-[11px] font-semibold text-botanical-mutedText uppercase tracking-wider">
                            Suggested Follow-Ups:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {message.followUpQuestions.map((q, qIdx) => (
                              <button
                                key={qIdx}
                                onClick={() => handleSend(q)}
                                className="text-xs px-3 py-1.5 bg-botanical-cream hover:bg-leaf-pill text-leaf-darkText hover:text-leaf-pillText border border-botanical-border rounded-xl transition-colors text-left cursor-pointer"
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* User Avatar */}
                    {isUser && (
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-leaf-1 bg-leaf-pill flex-shrink-0 shadow-xs mt-1">
                        <img
                          src={avatarUrl}
                          alt={fullName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </motion.div>
                )
              })}

              {/* Streaming / Thinking indicator */}
              {loading && (
                <div className="flex items-start gap-3 sm:gap-4 justify-start animate-fade-in">
                  <div className="w-8 h-8 rounded-full bg-leaf-1 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                    <FontAwesomeIcon icon={faWandMagicSparkles} className="w-3.5 h-3.5 animate-spin" />
                  </div>
                  <div className="bg-white border border-botanical-border rounded-3xl rounded-tl-xs p-4 shadow-xs flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-leaf-1 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-leaf-1 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-leaf-1 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-botanical-mutedText font-medium">
                      Future You Coach is thinking...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ==================================================================== */}
        {/* 3. CHATGPT-STYLE FLOATING BOTTOM CAPSULE INPUT */}
        {/* ==================================================================== */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-botanical-cream via-botanical-cream/95 to-transparent pt-6 pb-4 px-4 sm:px-6 z-20">
          <div className="max-w-3xl mx-auto space-y-2">
            {/* Category Filter Chips Bar - Wraps cleanly on mobile */}
            <div className="flex flex-wrap items-center gap-1.5 pb-1 text-xs select-none">
              {CATEGORY_CHIPS.map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => setSelectedCategory(chip.id)}
                  className={`px-3 py-1 rounded-full font-medium transition-colors flex-shrink-0 text-xs flex items-center gap-1.5 cursor-pointer ${
                    selectedCategory === chip.id
                      ? 'bg-leaf-1 text-white shadow-xs'
                      : 'bg-white text-botanical-mutedText hover:text-leaf-darkText border border-botanical-border'
                  }`}
                >
                  <FontAwesomeIcon icon={chip.icon} className="text-xs" />
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>

            {/* Input Capsule */}
            <div className="relative bg-white border border-botanical-border focus-within:border-leaf-1 rounded-3xl shadow-md transition-all flex items-end p-2 sm:p-2.5 gap-2">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything: 'what is api', coding, philosophy, science, or your habit progress..."
                rows={1}
                className="flex-1 max-h-36 min-h-[40px] px-3 py-2 bg-transparent text-sm sm:text-base text-leaf-darkText placeholder:text-botanical-mutedText/70 focus:outline-none resize-none leading-relaxed"
                disabled={loading}
              />

              <button
                onClick={() => handleSend()}
                disabled={!inputMessage.trim() || loading}
                className="w-10 h-10 rounded-full bg-leaf-1 hover:bg-leaf-2 disabled:bg-botanical-border disabled:text-botanical-mutedText/40 text-white flex items-center justify-center transition-all duration-200 flex-shrink-0 shadow-xs cursor-pointer disabled:cursor-not-allowed"
                aria-label="Send message"
              >
                <FontAwesomeIcon icon={faArrowUp} className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-center text-botanical-mutedText select-none">
              Future You Coach helps you stay consistent and reflect on your daily routines.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default AICoach
