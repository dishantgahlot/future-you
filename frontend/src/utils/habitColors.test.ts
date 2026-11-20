import { describe, it, expect } from 'vitest'
import {
  getHabitColorTheme,
  HABIT_COLOR_PALETTES,
  CATEGORY_TO_COLOR,
} from './habitColors'

describe('Habit Colors & Theming Utility Suite', () => {
  it('returns appropriate theme when passing standard category name', () => {
    const fitnessTheme = getHabitColorTheme('fitness')
    expect(fitnessTheme).toBeDefined()
    expect(fitnessTheme.hex).toBe(HABIT_COLOR_PALETTES.leaf2.hex)
    expect(fitnessTheme.border).toBeDefined()

    const sleepTheme = getHabitColorTheme('sleep')
    expect(sleepTheme).toBeDefined()
    expect(sleepTheme.hex).toBe(HABIT_COLOR_PALETTES.lavender.hex)
  })

  it('resolves theme from hex color code', () => {
    const targetHex = HABIT_COLOR_PALETTES.leaf1.hex
    const theme = getHabitColorTheme(targetHex)
    expect(theme).toBeDefined()
    expect(theme.hex.toLowerCase()).toBe(targetHex.toLowerCase())
  })

  it('falls back gracefully to default theme (leaf1) for undefined or unknown input', () => {
    const defaultTheme = getHabitColorTheme(undefined)
    expect(defaultTheme).toBeDefined()
    expect(defaultTheme.id).toBe('leaf1')
    expect(defaultTheme.hex).toBe(HABIT_COLOR_PALETTES.leaf1.hex)

    const unknownTheme = getHabitColorTheme('non-existent-color-or-cat')
    expect(unknownTheme).toBeDefined()
    expect(unknownTheme.id).toBe('leaf1')
  })

  it('maps all defined categories to valid palettes in CATEGORY_TO_COLOR', () => {
    Object.entries(CATEGORY_TO_COLOR).forEach(([category, paletteKey]) => {
      expect(typeof category).toBe('string')
      expect(HABIT_COLOR_PALETTES[paletteKey]).toBeDefined()
      expect(HABIT_COLOR_PALETTES[paletteKey].hex).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })
  })
})
