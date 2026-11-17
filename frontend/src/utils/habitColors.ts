export interface HabitColorTheme {
  id: string
  name: string
  hex: string
  bgSoft: string
  bgSoftHover: string
  border: string
  borderHover: string
  badgeBg: string
  badgeText: string
  text: string
  ring: string
  glow: string
  iconBg: string
  buttonBg: string
  progressBar: string
}

export const HABIT_COLOR_PALETTES: Record<string, HabitColorTheme> = {
  leaf1: {
    id: 'leaf1',
    name: 'Leaf 1 (Deep Forest)',
    hex: '#738541',
    bgSoft: 'bg-[#738541]/10',
    bgSoftHover: 'hover:bg-[#738541]/15',
    border: 'border-[#738541]/30',
    borderHover: 'hover:border-[#738541]/60',
    badgeBg: 'bg-[#738541]/15 text-[#738541]',
    badgeText: 'text-[#738541]',
    text: 'text-[#738541]',
    ring: 'focus:ring-[#738541]',
    glow: 'shadow-[#738541]/20',
    iconBg: 'bg-[#738541] text-white',
    buttonBg: 'bg-[#738541] hover:bg-[#5f6e35] text-white',
    progressBar: 'bg-[#738541]',
  },
  leaf2: {
    id: 'leaf2',
    name: 'Leaf 2 (Botanical Green)',
    hex: '#869956',
    bgSoft: 'bg-[#869956]/10',
    bgSoftHover: 'hover:bg-[#869956]/15',
    border: 'border-[#869956]/30',
    borderHover: 'hover:border-[#869956]/60',
    badgeBg: 'bg-[#869956]/15 text-[#869956]',
    badgeText: 'text-[#869956]',
    text: 'text-[#869956]',
    ring: 'focus:ring-[#869956]',
    glow: 'shadow-[#869956]/20',
    iconBg: 'bg-[#869956] text-white',
    buttonBg: 'bg-[#869956] hover:bg-[#718247] text-white',
    progressBar: 'bg-[#869956]',
  },
  leaf4: {
    id: 'leaf4',
    name: 'Leaf 4 (Fresh Foliage)',
    hex: '#8DA55D',
    bgSoft: 'bg-[#8DA55D]/10',
    bgSoftHover: 'hover:bg-[#8DA55D]/15',
    border: 'border-[#8DA55D]/30',
    borderHover: 'hover:border-[#8DA55D]/60',
    badgeBg: 'bg-[#8DA55D]/15 text-[#8DA55D]',
    badgeText: 'text-[#8DA55D]',
    text: 'text-[#8DA55D]',
    ring: 'focus:ring-[#8DA55D]',
    glow: 'shadow-[#8DA55D]/20',
    iconBg: 'bg-[#8DA55D] text-white',
    buttonBg: 'bg-[#8DA55D] hover:bg-[#788e4e] text-white',
    progressBar: 'bg-[#8DA55D]',
  },
  leaf7: {
    id: 'leaf7',
    name: 'Leaf 7 (Light Sage)',
    hex: '#BBC094',
    bgSoft: 'bg-[#BBC094]/15',
    bgSoftHover: 'hover:bg-[#BBC094]/25',
    border: 'border-[#BBC094]/40',
    borderHover: 'hover:border-[#BBC094]/80',
    badgeBg: 'bg-[#BBC094]/25 text-[#5e663e]',
    badgeText: 'text-[#5e663e]',
    text: 'text-[#5e663e]',
    ring: 'focus:ring-[#BBC094]',
    glow: 'shadow-[#BBC094]/20',
    iconBg: 'bg-[#BBC094] text-[#333]',
    buttonBg: 'bg-[#BBC094] hover:bg-[#a6ab81] text-[#222]',
    progressBar: 'bg-[#BBC094]',
  },
  lavender: {
    id: 'lavender',
    name: 'Soft Lavender',
    hex: '#7E6BA5',
    bgSoft: 'bg-[#7E6BA5]/10',
    bgSoftHover: 'hover:bg-[#7E6BA5]/15',
    border: 'border-[#7E6BA5]/30',
    borderHover: 'hover:border-[#7E6BA5]/60',
    badgeBg: 'bg-[#7E6BA5]/15 text-[#7E6BA5]',
    badgeText: 'text-[#7E6BA5]',
    text: 'text-[#7E6BA5]',
    ring: 'focus:ring-[#7E6BA5]',
    glow: 'shadow-[#7E6BA5]/20',
    iconBg: 'bg-[#7E6BA5] text-white',
    buttonBg: 'bg-[#7E6BA5] hover:bg-[#6b5990] text-white',
    progressBar: 'bg-[#7E6BA5]',
  },
  terracotta: {
    id: 'terracotta',
    name: 'Terracotta',
    hex: '#C87850',
    bgSoft: 'bg-[#C87850]/10',
    bgSoftHover: 'hover:bg-[#C87850]/15',
    border: 'border-[#C87850]/30',
    borderHover: 'hover:border-[#C87850]/60',
    badgeBg: 'bg-[#C87850]/15 text-[#C87850]',
    badgeText: 'text-[#C87850]',
    text: 'text-[#C87850]',
    ring: 'focus:ring-[#C87850]',
    glow: 'shadow-[#C87850]/20',
    iconBg: 'bg-[#C87850] text-white',
    buttonBg: 'bg-[#C87850] hover:bg-[#b0653f] text-white',
    progressBar: 'bg-[#C87850]',
  },
  amber: {
    id: 'amber',
    name: 'Warm Amber',
    hex: '#C88E3E',
    bgSoft: 'bg-[#C88E3E]/10',
    bgSoftHover: 'hover:bg-[#C88E3E]/15',
    border: 'border-[#C88E3E]/30',
    borderHover: 'hover:border-[#C88E3E]/60',
    badgeBg: 'bg-[#C88E3E]/15 text-[#C88E3E]',
    badgeText: 'text-[#C88E3E]',
    text: 'text-[#C88E3E]',
    ring: 'focus:ring-[#C88E3E]',
    glow: 'shadow-[#C88E3E]/20',
    iconBg: 'bg-[#C88E3E] text-white',
    buttonBg: 'bg-[#C88E3E] hover:bg-[#b07a30] text-white',
    progressBar: 'bg-[#C88E3E]',
  },
}

export const CATEGORY_TO_COLOR: Record<string, string> = {
  health: 'leaf1',
  fitness: 'leaf2',
  learning: 'terracotta',
  sleep: 'lavender',
  productivity: 'amber',
  mental_health: 'leaf4',
  nutrition: 'leaf1',
  other: 'leaf1',
}

export function getHabitColorTheme(colorOrCategory?: string): HabitColorTheme {
  if (!colorOrCategory) return HABIT_COLOR_PALETTES.leaf1

  if (HABIT_COLOR_PALETTES[colorOrCategory]) {
    return HABIT_COLOR_PALETTES[colorOrCategory]
  }

  const matchByHex = Object.values(HABIT_COLOR_PALETTES).find(
    (palette) => palette.hex.toLowerCase() === colorOrCategory.toLowerCase()
  )
  if (matchByHex) return matchByHex

  const categoryColorId = CATEGORY_TO_COLOR[colorOrCategory]
  if (categoryColorId && HABIT_COLOR_PALETTES[categoryColorId]) {
    return HABIT_COLOR_PALETTES[categoryColorId]
  }

  return HABIT_COLOR_PALETTES.leaf1
}
