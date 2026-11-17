import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faXmark,
  faCheck,
  faPenToSquare,
  faPalette,
} from '@fortawesome/free-solid-svg-icons'
import type { Habit, HabitFormData, HabitCategory } from '../../types'
import { HABIT_CATEGORIES, HABIT_COLORS, HABIT_ICONS, CATEGORY_DEFAULT_UNITS, FREQUENCIES } from '../../types'

interface HabitModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: HabitFormData) => Promise<void>
  editingHabit: Habit | null
  loading?: boolean
}

export function HabitModal({ isOpen, onClose, onSubmit, editingHabit, loading = false }: HabitModalProps) {
  type FormData = Omit<HabitFormData, 'target_value'> & { target_value: number | string }

  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    category: 'health',
    frequency: 'daily',
    target_value: 1,
    unit: '',
    color: HABIT_COLORS[0],
    icon: HABIT_ICONS[0],
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [activeTab, setActiveTab] = useState<'basics' | 'appearance'>('basics')

  useEffect(() => {
    if (isOpen) {
      if (editingHabit) {
        setFormData({
          name: editingHabit.name,
          description: editingHabit.description || '',
          category: editingHabit.category,
          frequency: editingHabit.frequency,
          target_value: editingHabit.target_value,
          unit: editingHabit.unit,
          color: editingHabit.color,
          icon: editingHabit.icon,
        })
      } else {
        setFormData({
          name: '',
          description: '',
          category: 'health',
          frequency: 'daily',
          target_value: 1,
          unit: CATEGORY_DEFAULT_UNITS.health,
          color: HABIT_COLORS[0],
          icon: HABIT_ICONS[0],
        })
      }
      setErrors({})
      setActiveTab('basics')
    }
  }, [isOpen, editingHabit])

  // Update unit when category changes
  useEffect(() => {
    if (formData.category && !editingHabit) {
      setFormData(prev => ({
        ...prev,
        unit: CATEGORY_DEFAULT_UNITS[formData.category as HabitCategory] || 'times',
      }))
    }
  }, [formData.category, editingHabit])

  const validateForm = () => {
    const newErrors: Partial<Record<keyof FormData, string>> = {}
    if (!formData.name.trim()) newErrors.name = 'Habit name is required'
    if (Number(formData.target_value) <= 0) newErrors.target_value = 'Target must be greater than 0'
    if (!formData.unit.trim()) newErrors.unit = 'Unit is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    const submitData: HabitFormData = {
      ...formData,
      target_value: Number(formData.target_value),
    }
    await onSubmit(submitData)
  }

  const handleChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="habit-modal-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-card rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 id="habit-modal-title" className="text-heading-md font-serif text-foreground">
            {editingHabit ? 'Edit Habit' : 'Create New Habit'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
            aria-label="Close modal"
          >
            <FontAwesomeIcon icon={faXmark} className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-4">
          {[
            { id: 'basics', label: 'Basics', icon: faPenToSquare },
            { id: 'appearance', label: 'Appearance', icon: faPalette },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'basics' | 'appearance')}
              className={`flex items-center gap-2 px-4 py-3 text-body-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'text-primary border-primary'
                  : 'text-muted-foreground hover:text-foreground border-transparent'
              }`}
            >
              <FontAwesomeIcon icon={tab.icon} className="text-sm" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-6">
          {activeTab === 'basics' && (
            <div className="space-y-6">
              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-body-sm font-medium text-foreground mb-1.5">
                  Habit Name <span className="text-destructive">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g., Morning run, Read 30 minutes"
                  className={`w-full px-4 py-3 bg-accent border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${
                    errors.name ? 'border-destructive' : 'border-border'
                  }`}
                  disabled={loading}
                  autoFocus
                />
                {errors.name && <p className="text-caption text-destructive mt-1">{errors.name}</p>}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-body-sm font-medium text-foreground mb-1.5">
                  Description (optional)
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Add a note about this habit..."
                  rows={3}
                  className="w-full px-4 py-3 bg-accent border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                  disabled={loading}
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-body-sm font-medium text-foreground mb-1.5">
                  Category <span className="text-destructive">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {HABIT_CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => handleChange('category', cat.value)}
                      className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1.5 ${
                        formData.category === cat.value
                          ? `border-${cat.color.replace('text-', '')} bg-${cat.color.replace('text-', '')}/10`
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <span className="text-xl">{cat.icon}</span>
                      <span className={`text-caption font-medium ${formData.category === cat.value ? cat.color : 'text-muted-foreground'}`}>
                        {cat.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-body-sm font-medium text-foreground mb-1.5">
                  Frequency <span className="text-destructive">*</span>
                </label>
                <div className="flex gap-3">
                  {FREQUENCIES.map(freq => (
                    <label
                      key={freq.value}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        formData.frequency === freq.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="frequency"
                        value={freq.value}
                        checked={formData.frequency === freq.value}
                        onChange={() => handleChange('frequency', freq.value)}
                        className="sr-only"
                      />
                      <div className="text-center">
                        <p className="font-medium text-foreground">{freq.label}</p>
                        <p className="text-caption text-muted-foreground">{freq.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Target & Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="target_value" className="block text-body-sm font-medium text-foreground mb-1.5">
                    Target Value <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="target_value"
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={formData.target_value}
                    onChange={(e) => handleChange('target_value', parseFloat(e.target.value) || 0)}
                    className={`w-full px-4 py-3 bg-accent border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${
                      errors.target_value ? 'border-destructive' : 'border-border'
                    }`}
                    disabled={loading}
                  />
                  {errors.target_value && <p className="text-caption text-destructive mt-1">{errors.target_value}</p>}
                </div>
                <div>
                  <label htmlFor="unit" className="block text-body-sm font-medium text-foreground mb-1.5">
                    Unit <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="unit"
                    type="text"
                    value={formData.unit}
                    onChange={(e) => handleChange('unit', e.target.value)}
                    placeholder="e.g., minutes, pages, glasses"
                    className={`w-full px-4 py-3 bg-accent border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${
                      errors.unit ? 'border-destructive' : 'border-border'
                    }`}
                    disabled={loading}
                  />
                  {errors.unit && <p className="text-caption text-destructive mt-1">{errors.unit}</p>}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-6">
              {/* Color */}
              <div>
                <label className="block text-body-sm font-medium text-foreground mb-1.5">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {HABIT_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleChange('color', color)}
                      className={`w-10 h-10 rounded-xl border-2 transition-all flex items-center justify-center ${
                        formData.color === color
                          ? 'border-primary scale-110 shadow-md'
                          : 'border-transparent hover:border-border'
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={`Color ${color}`}
                    >
                      {formData.color === color && <FontAwesomeIcon icon={faCheck} className="h-4 w-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Icon */}
              <div>
                <label className="block text-body-sm font-medium text-foreground mb-1.5">
                  Icon
                </label>
                <div className="grid grid-cols-5 sm:grid-cols-7 gap-2 max-h-60 overflow-y-auto">
                  {HABIT_ICONS.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => handleChange('icon', icon)}
                      className={`p-3 rounded-xl border-2 transition-all text-2xl flex items-center justify-center ${
                        formData.icon === icon
                          ? 'border-primary bg-primary/5'
                          : 'border-transparent hover:border-border'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="bg-accent/50 rounded-xl p-4">
                <p className="text-body-sm text-muted-foreground mb-3">Preview</p>
                <div className="flex items-center gap-4 p-4 bg-background rounded-lg border border-border">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: formData.color }}>
                    <span className="text-2xl">{formData.icon}</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{formData.name || 'Habit Name'}</p>
                    <p className="text-body-sm text-muted-foreground">
                      {formData.target_value} {formData.unit} · {FREQUENCIES.find(f => f.value === formData.frequency)?.label}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 text-body font-medium text-muted-foreground hover:text-foreground bg-transparent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                  Saving...
                </>
              ) : (
                editingHabit ? 'Save Changes' : 'Create Habit'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}