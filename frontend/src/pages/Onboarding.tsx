import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBullseye,
  faUser,
  faPalette,
  faDumbbell,
  faCheck,
  faHeart,
  faUtensils,
  faMoon,
  faBrain,
  faBolt,
  faBookOpen,
  faWallet,
  faUsers,
  faWandMagicSparkles,
  faDroplet,
  faSpa,
  faCalendarCheck,
  faSun,
  faLaptop,
  faBell,
  faClock,
  faArrowRight,
  faRotateRight,
  faCompass,
} from '@fortawesome/free-solid-svg-icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../services/supabase'

const STEPS = [
  { id: 'welcome', title: 'Welcome', icon: faBullseye },
  { id: 'profile', title: 'Profile', icon: faUser },
  { id: 'preferences', title: 'Preferences', icon: faPalette },
  { id: 'goals', title: 'Goals', icon: faDumbbell },
  { id: 'complete', title: 'Complete', icon: faCheck },
]

const CATEGORIES = [
  { id: 'health', label: 'Health', icon: faHeart, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/40' },
  { id: 'fitness', label: 'Fitness', icon: faDumbbell, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
  { id: 'nutrition', label: 'Nutrition', icon: faUtensils, color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40' },
  { id: 'sleep', label: 'Sleep', icon: faMoon, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/40' },
  { id: 'mental_health', label: 'Mental Health', icon: faBrain, color: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/40' },
  { id: 'productivity', label: 'Productivity', icon: faBolt, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-950/40' },
  { id: 'learning', label: 'Learning', icon: faBookOpen, color: 'text-teal-700 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-950/40' },
  { id: 'finance', label: 'Finance', icon: faWallet, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
  { id: 'social', label: 'Social', icon: faUsers, color: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-50 dark:bg-pink-950/40' },
  { id: 'other', label: 'Other', icon: faWandMagicSparkles, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800/40' },
]

const SUGGESTED_HABITS = [
  { name: 'Drink 2L water daily', category: 'health', frequency: 'daily', target: 2, unit: 'L', icon: 'droplet' },
  { name: 'Exercise 30 minutes', category: 'fitness', frequency: 'daily', target: 30, unit: 'min', icon: 'dumbbell' },
  { name: 'Read 20 pages', category: 'learning', frequency: 'daily', target: 20, unit: 'pages', icon: 'book' },
  { name: 'Meditate 10 minutes', category: 'mental_health', frequency: 'daily', target: 10, unit: 'min', icon: 'spa' },
  { name: 'Sleep 8 hours', category: 'sleep', frequency: 'daily', target: 8, unit: 'hrs', icon: 'moon' },
  { name: 'Weekly planning', category: 'productivity', frequency: 'weekly', target: 1, unit: 'session', icon: 'list' },
]

function getHabitIconComponent(iconName: string) {
  switch (iconName) {
    case 'droplet':
      return <FontAwesomeIcon icon={faDroplet} className="w-4.5 h-4.5 text-sky-600 dark:text-sky-400" />
    case 'dumbbell':
      return <FontAwesomeIcon icon={faDumbbell} className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
    case 'book':
      return <FontAwesomeIcon icon={faBookOpen} className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
    case 'spa':
      return <FontAwesomeIcon icon={faSpa} className="w-4.5 h-4.5 text-purple-600 dark:text-purple-400" />
    case 'moon':
      return <FontAwesomeIcon icon={faMoon} className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
    case 'list':
      return <FontAwesomeIcon icon={faCalendarCheck} className="w-4.5 h-4.5 text-teal-600 dark:text-teal-400" />
    default:
      return <FontAwesomeIcon icon={faWandMagicSparkles} className="w-4.5 h-4.5 text-[#4A6225] dark:text-[#A8D968]" />
  }
}

export function Onboarding() {
  const navigate = useNavigate()
  const { user, onboardingCompleted, setOnboardingCompleted } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState(() => {
    let initialName = user?.user_metadata?.full_name || ''
    if (!initialName) {
      const saved = localStorage.getItem('future_you_active_user')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          initialName = parsed.user_metadata?.full_name || ''
        } catch {
          // ignore
        }
      }
    }
    return {
      full_name: initialName,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      theme: 'system' as 'light' | 'dark' | 'system',
      notifications: true,
      weekly_report: true,
      selectedCategories: [] as string[],
      selectedHabits: [] as string[],
    }
  })

  useEffect(() => {
    if (user?.user_metadata?.full_name && !formData.full_name) {
      setFormData(prev => ({ ...prev, full_name: user.user_metadata.full_name }))
    }
  }, [user, formData.full_name])

  // Guard: If this user already completed onboarding, skip immediately to dashboard
  useEffect(() => {
    if (user?.id) {
      const isAlreadyOnboarded =
        localStorage.getItem(`future_you_onboarded_${user.id}`) === 'true' || onboardingCompleted
      if (isAlreadyOnboarded) {
        navigate('/dashboard', { replace: true })
      }
    }
  }, [user, onboardingCompleted, navigate])

  const currentStepData = STEPS[currentStep]
  const progress = ((currentStep + 1) / STEPS.length) * 100

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleComplete = async () => {
    setLoading(true)

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user?.id,
          full_name: formData.full_name,
          timezone: formData.timezone,
          preferences: {
            theme: formData.theme,
            notifications: formData.notifications,
            weekly_report: formData.weekly_report,
            predictions: true,
            onboarding_completed: true,
            focus_categories: formData.selectedCategories,
          },
        })

      if (profileError) throw profileError

      const habitsToCreate = SUGGESTED_HABITS
        .filter(h => formData.selectedHabits.includes(h.name))
        .map(h => ({
          user_id: user?.id,
          name: h.name,
          category: h.category,
          frequency: h.frequency,
          target_value: h.target,
          unit: h.unit,
          icon: h.icon,
          color: CATEGORIES.find(c => c.id === h.category)?.color.replace('text-', '').replace('-500', '') || '#0ea5e9',
          is_active: true,
        }))

      if (habitsToCreate.length > 0) {
        const { error: habitsError } = await supabase
          .from('habits')
          .insert(habitsToCreate)

        if (habitsError) throw habitsError
      }

      if (user?.id) {
        localStorage.setItem(`future_you_onboarded_${user.id}`, 'true')
      }
      setOnboardingCompleted(true)
      navigate('/dashboard', { replace: true })
    } catch (error) {
      console.error('Onboarding error:', error)
      if (user?.id) {
        localStorage.setItem(`future_you_onboarded_${user.id}`, 'true')
      }
      setOnboardingCompleted(true)
      navigate('/dashboard', { replace: true })
    } finally {
      setLoading(false)
    }
  }

  const skipOnboarding = async () => {
    if (user?.id) {
      localStorage.setItem(`future_you_onboarded_${user.id}`, 'true')
      try {
        await supabase
          .from('profiles')
          .update({
            preferences: {
              onboarding_completed: true,
            },
          })
          .eq('id', user.id)
      } catch {
        // ignore
      }
    }
    setOnboardingCompleted(true)
    navigate('/dashboard', { replace: true })
  }

  const renderStep = () => {
    switch (currentStepData.id) {
      case 'welcome':
        return (
          <div className="text-center space-y-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-20 h-20 mx-auto rounded-3xl bg-[#EEF4E8] dark:bg-[#16271D] border border-[#CCD8B8] dark:border-[#22352B] flex items-center justify-center text-[#4A6225] dark:text-[#A8D968] shadow-xs"
            >
              <FontAwesomeIcon icon={faBullseye} className="text-3xl" />
            </motion.div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1D2516] dark:text-[#F5F2EB] tracking-tight">
                Welcome to Future You
              </h2>
              <p className="text-sm text-[#7A8C74] dark:text-[#A8BCA0] mt-2 max-w-md mx-auto leading-relaxed">
                Let's set up your personalized habit tracking experience. This will take less than a minute.
              </p>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="space-y-3 text-left max-w-md mx-auto"
            >
              <div className="flex items-center gap-3.5 p-4 bg-[#FAF7F0] dark:bg-[#121D17] border border-[#E8E2D5] dark:border-[#1E2E27] rounded-2xl shadow-2xs">
                <div className="w-9 h-9 rounded-xl bg-[#EEF4E8] dark:bg-[#16271D] text-[#4A6225] dark:text-[#A8D968] flex items-center justify-center flex-shrink-0 text-sm">
                  <FontAwesomeIcon icon={faCheck} />
                </div>
                <div>
                  <p className="font-semibold text-xs sm:text-sm text-[#1D2516] dark:text-[#F5F2EB]">Track habits that matter to you</p>
                  <p className="text-[11px] sm:text-xs text-[#7A8C74] dark:text-[#A8BCA0]">Build streaks and watch consistency flourish</p>
                </div>
              </div>
              <div className="flex items-center gap-3.5 p-4 bg-[#FAF7F0] dark:bg-[#121D17] border border-[#E8E2D5] dark:border-[#1E2E27] rounded-2xl shadow-2xs">
                <div className="w-9 h-9 rounded-xl bg-[#EEF4E8] dark:bg-[#16271D] text-[#4A6225] dark:text-[#A8D968] flex items-center justify-center flex-shrink-0 text-sm">
                  <FontAwesomeIcon icon={faWandMagicSparkles} />
                </div>
                <div>
                  <p className="font-semibold text-xs sm:text-sm text-[#1D2516] dark:text-[#F5F2EB]">AI Life Intelligence & What-If</p>
                  <p className="text-[11px] sm:text-xs text-[#7A8C74] dark:text-[#A8BCA0]">Simulate future trajectories and get adaptive guidance</p>
                </div>
              </div>
              <div className="flex items-center gap-3.5 p-4 bg-[#FAF7F0] dark:bg-[#121D17] border border-[#E8E2D5] dark:border-[#1E2E27] rounded-2xl shadow-2xs">
                <div className="w-9 h-9 rounded-xl bg-[#EEF4E8] dark:bg-[#16271D] text-[#4A6225] dark:text-[#A8D968] flex items-center justify-center flex-shrink-0 text-sm">
                  <FontAwesomeIcon icon={faHeart} />
                </div>
                <div>
                  <p className="font-semibold text-xs sm:text-sm text-[#1D2516] dark:text-[#F5F2EB]">Write letters to your future self</p>
                  <p className="text-[11px] sm:text-xs text-[#7A8C74] dark:text-[#A8BCA0]">Reflect, journal, and celebrate your daily growth</p>
                </div>
              </div>
            </motion.div>
          </div>
        )

      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-serif font-bold text-[#1D2516] dark:text-[#F5F2EB] tracking-tight">
                Tell us about yourself
              </h2>
              <p className="text-xs sm:text-sm text-[#7A8C74] dark:text-[#A8BCA0] mt-1">
                This helps customize your daily routine and reflections
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="full_name" className="block text-xs font-semibold uppercase tracking-wider text-[#43522C] dark:text-[#A8D968] mb-1.5">
                  Full Name
                </label>
                <input
                  id="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Your name"
                  className="w-full px-4 py-3 bg-[#FAF7F0] dark:bg-[#121D18] border border-[#E8E2D5] dark:border-[#22352B] rounded-2xl text-sm text-[#1D2516] dark:text-[#F5F2EB] placeholder:text-[#9BA18F] dark:placeholder:text-[#6E8268] focus:outline-none focus:ring-2 focus:ring-[#738541]/30 focus:border-[#738541] transition-all"
                  autoComplete="name"
                />
              </div>

              <div>
                <label htmlFor="timezone" className="block text-xs font-semibold uppercase tracking-wider text-[#43522C] dark:text-[#A8D968] mb-1.5">
                  Timezone
                </label>
                <select
                  id="timezone"
                  value={formData.timezone}
                  onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
                  className="w-full px-4 py-3 bg-[#FAF7F0] dark:bg-[#121D18] border border-[#E8E2D5] dark:border-[#22352B] rounded-2xl text-sm text-[#1D2516] dark:text-[#F5F2EB] focus:outline-none focus:ring-2 focus:ring-[#738541]/30 focus:border-[#738541] transition-all cursor-pointer"
                >
                  {[
                    'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
                    'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai',
                    'Asia/Kolkata', 'Asia/Singapore', 'Australia/Sydney', 'Pacific/Auckland'
                  ].map(tz => (
                    <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )

      case 'preferences':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-serif font-bold text-[#1D2516] dark:text-[#F5F2EB] tracking-tight">
                Customize your experience
              </h2>
              <p className="text-xs sm:text-sm text-[#7A8C74] dark:text-[#A8BCA0] mt-1">
                Choose your preferred theme and notification cadences
              </p>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#43522C] dark:text-[#A8D968] mb-3">
                Theme Appearance
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'light', label: 'Light', desc: 'Warm cream & clear paper', icon: faSun },
                  { id: 'dark', label: 'Dark', desc: 'Serene forest night', icon: faMoon },
                  { id: 'system', label: 'System', desc: 'Matches device', icon: faLaptop },
                ].map((t) => {
                  const isSelected = formData.theme === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, theme: t.id as 'light' | 'dark' | 'system' }))}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 cursor-pointer ${
                        isSelected
                          ? 'border-[#4A6225] dark:border-[#A8D968] bg-[#EEF4E8]/80 dark:bg-[#16271D] shadow-2xs'
                          : 'border-[#E8E2D5] dark:border-[#1E2E27] bg-[#FAF7F0] dark:bg-[#121D17] hover:border-[#CCD8B8] dark:hover:border-[#38592A]'
                      }`}
                    >
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shadow-2xs text-lg ${
                        t.id === 'light'
                          ? 'bg-[#FAF7F0] border-[#E8E2D5] text-[#D97706]'
                          : t.id === 'dark'
                          ? 'bg-[#091312] border-[#1E2E27] text-[#A8D968]'
                          : 'bg-gradient-to-br from-[#FAF7F0] to-[#091312] border-[#E8E2D5] dark:border-[#1E2E27] text-[#4A6225] dark:text-[#A8D968]'
                      }`}>
                        <FontAwesomeIcon icon={t.icon} />
                      </div>
                      <span className="font-semibold text-xs sm:text-sm text-[#1D2516] dark:text-[#F5F2EB]">{t.label}</span>
                      <span className="text-[10px] text-[#7A8C74] dark:text-[#A8BCA0] text-center leading-tight">
                        {t.desc}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#43522C] dark:text-[#A8D968] mb-1">
                Notifications
              </h3>
              <label className="flex items-center justify-between p-3.5 bg-[#FAF7F0] dark:bg-[#121D17] border border-[#E8E2D5] dark:border-[#1E2E27] rounded-2xl cursor-pointer hover:bg-[#EEF4E8]/50 dark:hover:bg-[#16271D] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#EEF4E8] dark:bg-[#16271D] text-[#4A6225] dark:text-[#A8D968] flex items-center justify-center text-xs">
                    <FontAwesomeIcon icon={faBell} />
                  </div>
                  <div>
                    <p className="font-semibold text-xs sm:text-sm text-[#1D2516] dark:text-[#F5F2EB]">Push notifications</p>
                    <p className="text-[11px] text-[#7A8C74] dark:text-[#A8BCA0]">Daily reminders and habit completion cues</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.notifications}
                  onChange={(e) => setFormData(prev => ({ ...prev, notifications: e.target.checked }))}
                  className="w-4.5 h-4.5 text-[#4A6225] rounded accent-[#4A6225] cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 bg-[#FAF7F0] dark:bg-[#121D17] border border-[#E8E2D5] dark:border-[#1E2E27] rounded-2xl cursor-pointer hover:bg-[#EEF4E8]/50 dark:hover:bg-[#16271D] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#EEF4E8] dark:bg-[#16271D] text-[#4A6225] dark:text-[#A8D968] flex items-center justify-center text-xs">
                    <FontAwesomeIcon icon={faClock} />
                  </div>
                  <div>
                    <p className="font-semibold text-xs sm:text-sm text-[#1D2516] dark:text-[#F5F2EB]">Weekly progress report</p>
                    <p className="text-[11px] text-[#7A8C74] dark:text-[#A8BCA0]">Deep consistency analysis sent every Monday</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.weekly_report}
                  onChange={(e) => setFormData(prev => ({ ...prev, weekly_report: e.target.checked }))}
                  className="w-4.5 h-4.5 text-[#4A6225] rounded accent-[#4A6225] cursor-pointer"
                />
              </label>
            </div>
          </div>
        )

      case 'goals':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-serif font-bold text-[#1D2516] dark:text-[#F5F2EB] tracking-tight">
                What areas do you want to cultivate?
              </h2>
              <p className="text-xs sm:text-sm text-[#7A8C74] dark:text-[#A8BCA0] mt-1">
                Select categories that resonate with your current life priorities
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {CATEGORIES.map((cat) => {
                const isSelected = formData.selectedCategories.includes(cat.id)
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      selectedCategories: isSelected
                        ? prev.selectedCategories.filter(c => c !== cat.id)
                        : [...prev.selectedCategories, cat.id]
                    }))}
                    className={`p-3 rounded-2xl border transition-all flex flex-col items-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'border-[#4A6225] dark:border-[#A8D968] bg-[#EEF4E8] dark:bg-[#16271D] shadow-2xs'
                        : 'border-[#E8E2D5] dark:border-[#1E2E27] bg-[#FAF7F0] dark:bg-[#121D17] hover:border-[#CCD8B8] dark:hover:border-[#38592A]'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl ${cat.bg} flex items-center justify-center text-sm`}>
                      <FontAwesomeIcon icon={cat.icon} className={cat.color} />
                    </div>
                    <span className={`font-semibold text-xs truncate max-w-full ${
                      isSelected ? 'text-[#1D2516] dark:text-[#F5F2EB]' : 'text-[#404D36] dark:text-[#C5D2BE]'
                    }`}>
                      {cat.label}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="pt-4 border-t border-[#E8E2D5] dark:border-[#1E2E27]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#43522C] dark:text-[#A8D968] mb-1">
                Quick-Start Habits
              </h3>
              <p className="text-xs text-[#7A8C74] dark:text-[#A8BCA0] mb-3">
                Select suggested habits to automatically initialize your tracker
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {SUGGESTED_HABITS.map((habit) => {
                  const isChecked = formData.selectedHabits.includes(habit.name)
                  return (
                    <label
                      key={habit.name}
                      className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-[#EEF4E8] dark:bg-[#16271D] border-[#4A6225] dark:border-[#A8D968]'
                          : 'bg-[#FAF7F0] dark:bg-[#121D17] border-[#E8E2D5] dark:border-[#1E2E27] hover:bg-[#EEF4E8]/60 dark:hover:bg-[#16271D]/80'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          selectedHabits: e.target.checked
                            ? [...prev.selectedHabits, habit.name]
                            : prev.selectedHabits.filter(h => h !== habit.name)
                        }))}
                        className="w-4.5 h-4.5 text-[#4A6225] rounded accent-[#4A6225] cursor-pointer"
                      />
                      <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#0E1714] border border-[#E8E2D5] dark:border-[#22352B] flex items-center justify-center flex-shrink-0 shadow-2xs">
                        {getHabitIconComponent(habit.icon)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs sm:text-sm text-[#1D2516] dark:text-[#F5F2EB] truncate">
                          {habit.name}
                        </p>
                        <p className="text-[11px] text-[#7A8C74] dark:text-[#A8BCA0] truncate">
                          {habit.target} {habit.unit} · {habit.frequency} · {habit.category}
                        </p>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>
        )

      case 'complete':
        return (
          <div className="text-center space-y-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-20 h-20 mx-auto rounded-3xl bg-[#EEF4E8] dark:bg-[#16271D] border border-[#CCD8B8] dark:border-[#22352B] flex items-center justify-center text-[#4A6225] dark:text-[#A8D968] shadow-xs text-3xl"
            >
              <FontAwesomeIcon icon={faCheck} />
            </motion.div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1D2516] dark:text-[#F5F2EB] tracking-tight">
                You're all set!
              </h2>
              <p className="text-sm text-[#7A8C74] dark:text-[#A8BCA0] mt-1 max-w-md mx-auto">
                Your personalized habit sanctuary is ready. Let's start shaping your future self.
              </p>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="space-y-2.5 text-left max-w-md mx-auto"
            >
              {formData.full_name && (
                <div className="flex items-center gap-3 p-3 bg-[#FAF7F0] dark:bg-[#121D17] border border-[#E8E2D5] dark:border-[#1E2E27] rounded-2xl">
                  <div className="w-7 h-7 rounded-lg bg-[#EEF4E8] dark:bg-[#16271D] text-[#4A6225] dark:text-[#A8D968] flex items-center justify-center flex-shrink-0 text-xs">
                    <FontAwesomeIcon icon={faCheck} />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[#1D2516] dark:text-[#F5F2EB]">
                    Name: <strong className="font-semibold">{formData.full_name}</strong>
                  </span>
                </div>
              )}
              <div className="flex items-center gap-3 p-3 bg-[#FAF7F0] dark:bg-[#121D17] border border-[#E8E2D5] dark:border-[#1E2E27] rounded-2xl">
                <div className="w-7 h-7 rounded-lg bg-[#EEF4E8] dark:bg-[#16271D] text-[#4A6225] dark:text-[#A8D968] flex items-center justify-center flex-shrink-0 text-xs">
                  <FontAwesomeIcon icon={faCheck} />
                </div>
                <span className="text-xs sm:text-sm font-medium text-[#1D2516] dark:text-[#F5F2EB]">
                  Timezone: <strong className="font-semibold">{formData.timezone}</strong>
                </span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-[#FAF7F0] dark:bg-[#121D17] border border-[#E8E2D5] dark:border-[#1E2E27] rounded-2xl">
                <div className="w-7 h-7 rounded-lg bg-[#EEF4E8] dark:bg-[#16271D] text-[#4A6225] dark:text-[#A8D968] flex items-center justify-center flex-shrink-0 text-xs">
                  <FontAwesomeIcon icon={faCheck} />
                </div>
                <span className="text-xs sm:text-sm font-medium text-[#1D2516] dark:text-[#F5F2EB]">
                  Theme: <strong className="font-semibold capitalize">{formData.theme}</strong>
                </span>
              </div>
              {formData.selectedCategories.length > 0 && (
                <div className="flex items-center gap-3 p-3 bg-[#FAF7F0] dark:bg-[#121D17] border border-[#E8E2D5] dark:border-[#1E2E27] rounded-2xl">
                  <div className="w-7 h-7 rounded-lg bg-[#EEF4E8] dark:bg-[#16271D] text-[#4A6225] dark:text-[#A8D968] flex items-center justify-center flex-shrink-0 text-xs">
                    <FontAwesomeIcon icon={faCheck} />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[#1D2516] dark:text-[#F5F2EB]">
                    Focus areas: <strong className="font-semibold">{formData.selectedCategories.length} selected</strong>
                  </span>
                </div>
              )}
              {formData.selectedHabits.length > 0 && (
                <div className="flex items-center gap-3 p-3 bg-[#FAF7F0] dark:bg-[#121D17] border border-[#E8E2D5] dark:border-[#1E2E27] rounded-2xl">
                  <div className="w-7 h-7 rounded-lg bg-[#EEF4E8] dark:bg-[#16271D] text-[#4A6225] dark:text-[#A8D968] flex items-center justify-center flex-shrink-0 text-xs">
                    <FontAwesomeIcon icon={faCheck} />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[#1D2516] dark:text-[#F5F2EB]">
                    Habits to create: <strong className="font-semibold">{formData.selectedHabits.length} routines</strong>
                  </span>
                </div>
              )}
            </motion.div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF7F0] dark:bg-[#091312] text-[#1D2516] dark:text-[#F5F2EB] transition-colors py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-xl bg-[#EEF4E8] dark:bg-[#16271D] text-[#4A6225] dark:text-[#A8D968] flex items-center justify-center text-sm shadow-2xs">
            <FontAwesomeIcon icon={faCompass} />
          </div>
          <span className="font-serif italic font-bold text-xl tracking-tight text-[#1D2516] dark:text-[#F5F2EB]">
            Future You
          </span>
        </div>

        {/* Progress Bar & Steps */}
        <div className="mb-7">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#43522C] dark:text-[#A8D968]">
              Step {currentStep + 1} of {STEPS.length} · {currentStepData.title}
            </span>
            <span className="text-xs font-mono font-medium text-[#7A8C74] dark:text-[#83967D]">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-[#E8E2D5] dark:bg-[#1A2820] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-[#4A6225] dark:bg-[#A8D968] rounded-full transition-all duration-500 ease-out"
            />
          </div>
          <div className="flex justify-between mt-3">
            {STEPS.map((step, index) => {
              const isPast = index < currentStep
              const isCurrent = index === currentStep
              return (
                <div key={step.id} className="flex flex-col items-center gap-1">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-medium transition-all shadow-2xs ${
                    isPast
                      ? 'bg-[#4A6225] dark:bg-[#4E6826] text-white'
                      : isCurrent
                      ? 'bg-[#EEF4E8] dark:bg-[#16271D] text-[#4A6225] dark:text-[#A8D968] border-2 border-[#4A6225] dark:border-[#A8D968]'
                      : 'bg-[#FAF7F0] dark:bg-[#121D17] border border-[#E8E2D5] dark:border-[#1E2E27] text-[#8A847A] dark:text-[#6E8268]'
                  }`}>
                    {isPast ? <FontAwesomeIcon icon={faCheck} /> : <FontAwesomeIcon icon={step.icon} />}
                  </div>
                  <span className={`text-[10px] hidden sm:block ${isCurrent ? 'text-[#1D2516] dark:text-[#F5F2EB] font-semibold' : 'text-[#7A8C74] dark:text-[#83967D]'}`}>
                    {step.title}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Step Content Card */}
        <motion.div
          key={currentStepData.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-white dark:bg-[#0E1714] border border-[#E8E2D5] dark:border-[#1E2E27] rounded-3xl p-6 sm:p-8 shadow-xs"
        >
          {renderStep()}
        </motion.div>

        {/* Navigation Action Buttons */}
        <div className="flex items-center justify-between mt-6">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="px-5 py-2.5 border border-[#E8E2D5] dark:border-[#1E2E27] bg-white dark:bg-[#121D17] text-[#404D36] dark:text-[#C5D2BE] hover:bg-[#FAF7F0] dark:hover:bg-[#16271D] rounded-xl text-xs sm:text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
          >
            Back
          </button>

          <div className="flex items-center gap-3">
            {currentStep < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 bg-[#4A6225] hover:bg-[#3D521E] dark:bg-[#4E6826] dark:hover:bg-[#41581F] text-white rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:shadow-md active:scale-95"
              >
                <span>Next</span>
                <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleComplete}
                disabled={loading}
                className="px-6 py-2.5 bg-[#4A6225] hover:bg-[#3D521E] dark:bg-[#4E6826] dark:hover:bg-[#41581F] text-white rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:shadow-md disabled:opacity-50 active:scale-95"
              >
                {loading ? (
                  <>
                    <FontAwesomeIcon icon={faRotateRight} className="animate-spin text-sm" />
                    <span>Getting started...</span>
                  </>
                ) : (
                  <>
                    <span>Get Started</span>
                    <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Skip Link */}
        <div className="text-center mt-5">
          <button
            type="button"
            onClick={skipOnboarding}
            className="text-xs text-[#7A8C74] dark:text-[#83967D] hover:text-[#1D2516] dark:hover:text-[#F5F2EB] font-medium transition-colors cursor-pointer"
          >
            Skip setup for now →
          </button>
        </div>
      </div>
    </div>
  )
}
