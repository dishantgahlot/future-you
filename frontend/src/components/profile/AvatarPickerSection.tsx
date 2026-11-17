import { useState, useMemo, useRef, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faMars,
  faVenus,
  faDice,
  faCheck,
  faCamera,
  faPaintBrush,
  faLink,
  faUpload,
  faCircleCheck,
  faCircleXmark,
} from '@fortawesome/free-solid-svg-icons'
import { useUserProfile } from '../../contexts/UserProfileContext'

export interface AvatarPreset {
  id: string
  name: string
  seed: string
  gender: 'male' | 'female'
  hair: string
  clothing: string
  eyes: string
  head: string
}

const PRESET_AVATARS: AvatarPreset[] = [
  // Female Presets (Matching Screenshot Style)
  {
    id: 'f-tara',
    name: 'Tara',
    seed: 'Tara',
    gender: 'female',
    hair: 'SHORT COLORED',
    clothing: 'WINTER HOOD',
    eyes: 'NO GLASSES',
    head: 'WINTER CAP',
  },
  {
    id: 'f-maya',
    name: 'Maya',
    seed: 'Maya',
    gender: 'female',
    hair: 'CURLY BOB',
    clothing: 'BOTANICAL KNIT',
    eyes: 'ROUND GLASSES',
    head: 'BERET',
  },
  {
    id: 'f-zoe',
    name: 'Zoe',
    seed: 'Zoe',
    gender: 'female',
    hair: 'LONG NATURAL',
    clothing: 'LINEN SHIRT',
    eyes: 'NO GLASSES',
    head: 'HEADBAND',
  },
  {
    id: 'f-elena',
    name: 'Elena',
    seed: 'Elena',
    gender: 'female',
    hair: 'BRAIDED BUN',
    clothing: 'WARM SWEATER',
    eyes: 'NO GLASSES',
    head: 'SUN HAT',
  },
  {
    id: 'f-aria',
    name: 'Aria',
    seed: 'Aria',
    gender: 'female',
    hair: 'WAVY LOCKS',
    clothing: 'FOLIAGE TEE',
    eyes: 'ROUND FRAMES',
    head: 'BEANIE',
  },
  {
    id: 'f-chloe',
    name: 'Chloe',
    seed: 'Chloe',
    gender: 'female',
    hair: 'SLEEK PONYTAIL',
    clothing: 'WINTER COAT',
    eyes: 'SUNGLASSES',
    head: 'BERET',
  },
  {
    id: 'f-sophia',
    name: 'Sophia',
    seed: 'Sophia',
    gender: 'female',
    hair: 'SHOULDER LENGTH',
    clothing: 'CASUAL HOOD',
    eyes: 'NO GLASSES',
    head: 'FLORAL BAND',
  },
  {
    id: 'f-isla',
    name: 'Isla',
    seed: 'Isla',
    gender: 'female',
    hair: 'TWISTED BRAIDS',
    clothing: 'BOTANICAL SHIRT',
    eyes: 'WIRE GLASSES',
    head: 'WIDE BRIM',
  },

  // Male Presets
  {
    id: 'm-felix',
    name: 'Felix',
    seed: 'Felix',
    gender: 'male',
    hair: 'SHORT FADE',
    clothing: 'WINTER HOOD',
    eyes: 'ROUND GLASSES',
    head: 'WINTER CAP',
  },
  {
    id: 'm-milo',
    name: 'Milo',
    seed: 'Milo',
    gender: 'male',
    hair: 'CLASSIC SIDE',
    clothing: 'CASUAL CREW',
    eyes: 'NO GLASSES',
    head: 'BEANIE',
  },
  {
    id: 'm-oliver',
    name: 'Oliver',
    seed: 'Oliver',
    gender: 'male',
    hair: 'MESSY WAVE',
    clothing: 'BOTANICAL TEE',
    eyes: 'WIRE GLASSES',
    head: 'NONE',
  },
  {
    id: 'm-leo',
    name: 'Leo',
    seed: 'Leo',
    gender: 'male',
    hair: 'CROP CUT',
    clothing: 'WARM SWEATER',
    eyes: 'SUNGLASSES',
    head: 'BASEBALL CAP',
  },
  {
    id: 'm-kai',
    name: 'Kai',
    seed: 'Kai',
    gender: 'male',
    hair: 'TEXTURED SPIKES',
    clothing: 'HOODIE',
    eyes: 'NO GLASSES',
    head: 'WINTER CAP',
  },
  {
    id: 'm-noah',
    name: 'Noah',
    seed: 'Noah',
    gender: 'male',
    hair: 'CURLY AFRO',
    clothing: 'LINEN SHIRT',
    eyes: 'ROUND FRAMES',
    head: 'NONE',
  },
  {
    id: 'm-alex',
    name: 'Alex',
    seed: 'Alex',
    gender: 'male',
    hair: 'SHORT NATURAL',
    clothing: 'MINIMAL CREW',
    eyes: 'NO GLASSES',
    head: 'BEANIE',
  },
  {
    id: 'm-liam',
    name: 'Liam',
    seed: 'Liam',
    gender: 'male',
    hair: 'SIDE PART',
    clothing: 'COLLARED COAT',
    eyes: 'GLASSES',
    head: 'NONE',
  },
]

const ART_STYLES = [
  { id: 'open-peeps', name: 'Open Peeps' },
  { id: 'lorelei', name: 'Lorelei' },
  { id: 'notionists', name: 'Notionists' },
  { id: 'adventurer', name: 'Adventurer' },
]

export function AvatarPickerSection() {
  const { avatarUrl, avatarStyle, avatarSeed, updateAvatar } = useUserProfile()

  // Detect whether current avatar is a custom URL or an illustration
  const isCustomInitially =
    avatarStyle === 'custom' ||
    (!avatarUrl.includes('api.dicebear.com') && (avatarUrl.startsWith('http') || avatarUrl.startsWith('data:image/')))

  const [avatarMode, setAvatarMode] = useState<'illustrated' | 'custom'>(() => {
    return isCustomInitially ? 'custom' : 'illustrated'
  })

  // DiceBear State
  const [selectedGender, setSelectedGender] = useState<'all' | 'female' | 'male'>('all')
  const [activeStyle, setActiveStyle] = useState<string>(
    avatarStyle && avatarStyle !== 'custom' ? avatarStyle : 'open-peeps'
  )
  const [presets, setPresets] = useState<AvatarPreset[]>(PRESET_AVATARS)
  // Default to null so the currently applied avatar (avatarUrl) is strictly the initial selection in both modes!
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(() => {
    if (avatarStyle !== 'custom') {
      const found = PRESET_AVATARS.find((p) => p.seed === avatarSeed)
      return found ? found.id : null
    }
    return null
  })

  // Custom Photo URL State - Strictly uses the currently applied photo, never any random photo
  const [customUrlInput, setCustomUrlInput] = useState<string>(() => {
    return avatarUrl || ''
  })
  const [customUrlPreview, setCustomUrlPreview] = useState<string>(() => {
    return avatarUrl || ''
  })
  const [urlError, setUrlError] = useState<string | null>(null)
  const [imageLoaded, setImageLoaded] = useState<boolean>(true)
  const [savedSuccess, setSavedSuccess] = useState(false)

  // Keep custom preview in sync with current applied avatarUrl
  useEffect(() => {
    if (!customUrlInput && avatarUrl) {
      setCustomUrlInput(avatarUrl)
      setCustomUrlPreview(avatarUrl)
    }
  }, [avatarUrl, customUrlInput])

  const carouselRef = useRef<HTMLDivElement>(null)

  // Filter presets based on selected gender
  const filteredPresets = useMemo(() => {
    if (selectedGender === 'all') return presets
    return presets.filter((p) => p.gender === selectedGender)
  }, [presets, selectedGender])

  // Current active preset (null if user is viewing their currently applied avatar)
  const currentPreset = useMemo(() => {
    if (!selectedPresetId) return null
    return presets.find((p) => p.id === selectedPresetId) || null
  }, [presets, selectedPresetId])

  // Build DiceBear URL with green accents matching reference image
  const buildAvatarUrl = (seed: string, style: string = activeStyle) => {
    const greenAccents = '738541,4ade80,8ca25a,526e2d'
    return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(
      seed
    )}&clothingColor=${greenAccents}&accessoriesProbability=50`
  }

  // In BOTH DiceBear and Custom mode, default strictly to the currently applied profile photo (avatarUrl)
  const currentBigAvatarUrl = useMemo(() => {
    if (avatarMode === 'custom') {
      return customUrlPreview || avatarUrl
    }
    // In illustrated mode: if user explicitly selected a preset, show that preset.
    // Otherwise, default strictly to the currently applied profile photo (avatarUrl)!
    if (currentPreset) {
      return buildAvatarUrl(currentPreset.seed, activeStyle)
    }
    return avatarUrl
  }, [avatarMode, customUrlPreview, currentPreset, activeStyle, avatarUrl])

  // Detect whether the big avatar is a custom image (requiring object-cover) or SVG illustration
  const isBigAvatarCustom = useMemo(() => {
    if (avatarMode === 'custom') return true
    if (currentPreset) return false
    return (
      !avatarUrl.includes('api.dicebear.com') &&
      (avatarUrl.startsWith('http') || avatarUrl.startsWith('data:image/'))
    )
  }, [avatarMode, currentPreset, avatarUrl])

  // Handle Preset Selection
  const handleSelectPreset = (preset: AvatarPreset) => {
    setSelectedPresetId(preset.id)
    const newUrl = buildAvatarUrl(preset.seed, activeStyle)
    updateAvatar(newUrl, activeStyle, preset.seed)
    triggerSaveFeedback()
  }

  // Handle Style Switch
  const handleStyleChange = (styleId: string) => {
    setActiveStyle(styleId)
    if (currentPreset) {
      const newUrl = buildAvatarUrl(currentPreset.seed, styleId)
      updateAvatar(newUrl, styleId, currentPreset.seed)
    }
    triggerSaveFeedback()
  }

  // Handle Randomize
  const handleRandomize = () => {
    const hairStyles = ['SHORT FADE', 'CURLY BOB', 'MESSY WAVE', 'BRAIDED BUN', 'SHORT COLORED', 'CROP CUT', 'LONG NATURAL']
    const clothes = ['WINTER HOOD', 'BOTANICAL KNIT', 'LINEN SHIRT', 'WARM SWEATER', 'FOLIAGE TEE', 'CASUAL CREW']
    const eyeOptions = ['NO GLASSES', 'ROUND GLASSES', 'WIRE FRAMES', 'SUNGLASSES']
    const headOptions = ['WINTER CAP', 'BEANIE', 'BERET', 'SUN HAT', 'NONE', 'HEADBAND']

    const newPresets: AvatarPreset[] = Array.from({ length: 12 }, (_, i) => {
      const randSeed = `Hero_${Math.random().toString(36).substring(2, 7)}`
      const isMale = i % 2 === 0
      return {
        id: `rand-${randSeed}`,
        name: `Avatar ${i + 1}`,
        seed: randSeed,
        gender: isMale ? 'male' : 'female',
        hair: hairStyles[Math.floor(Math.random() * hairStyles.length)],
        clothing: clothes[Math.floor(Math.random() * clothes.length)],
        eyes: eyeOptions[Math.floor(Math.random() * eyeOptions.length)],
        head: headOptions[Math.floor(Math.random() * headOptions.length)],
      }
    })

    setPresets(newPresets)
    setSelectedPresetId(newPresets[0].id)
    const newUrl = buildAvatarUrl(newPresets[0].seed, activeStyle)
    updateAvatar(newUrl, activeStyle, newPresets[0].seed)
    triggerSaveFeedback()
  }

  // Handle Custom URL Apply
  const handleApplyCustomUrl = () => {
    const trimmed = customUrlInput.trim()
    if (!trimmed) {
      setUrlError('Please enter a photo URL.')
      return
    }
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('data:image/')) {
      setUrlError('Please enter a valid URL starting with https://')
      return
    }

    setUrlError(null)
    setCustomUrlPreview(trimmed)
    updateAvatar(trimmed, 'custom', 'custom-photo')
    triggerSaveFeedback()
  }

  // Handle Local File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setUrlError('Please select a valid image file (PNG, JPG, WebP).')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setUrlError('File size is too large. Please select an image under 2MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      if (dataUrl) {
        setCustomUrlInput(dataUrl)
        setCustomUrlPreview(dataUrl)
        setUrlError(null)
        updateAvatar(dataUrl, 'custom', 'uploaded-photo')
        triggerSaveFeedback()
      }
    }
    reader.readAsDataURL(file)
  }

  const triggerSaveFeedback = () => {
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 2500)
  }

  // Sync slider index: 0 = currently applied avatar, 1..N = filteredPresets
  const currentIndex = useMemo(() => {
    if (!selectedPresetId) return 0
    const idx = filteredPresets.findIndex((p) => p.id === selectedPresetId)
    return idx >= 0 ? idx + 1 : 0
  }, [filteredPresets, selectedPresetId])

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = parseInt(e.target.value, 10)
    if (idx === 0) {
      setSelectedPresetId(null)
      if (carouselRef.current) {
        carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' })
      }
      return
    }
    const target = filteredPresets[idx - 1]
    if (target) {
      handleSelectPreset(target)
      if (carouselRef.current) {
        const itemWidth = 84
        carouselRef.current.scrollTo({
          left: idx * itemWidth - carouselRef.current.clientWidth / 2 + itemWidth / 2,
          behavior: 'smooth',
        })
      }
    }
  }

  return (
    <div className="bg-white/95 dark:bg-[#0D1814] rounded-3xl border border-[#E8E2D5] dark:border-[#223326] p-5 sm:p-8 shadow-[0_2px_12px_rgba(29,37,22,0.03)] space-y-6 relative overflow-hidden transition-colors">
      {/* 1. Prominent Uppercase Title Matching Reference */}
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-serif font-extrabold uppercase tracking-[0.2em] text-[#1D2516] dark:text-[#F5F2EB]">
          Pick Your Avatar
        </h2>
      </div>

      {/* 2. Mode Selector Tabs (Avatars vs Custom Photo URL) */}
      <div className="flex items-center justify-center gap-1.5 p-1 bg-[#FAF8F3] dark:bg-[#15231C] border border-[#E8E2D5] dark:border-[#223326] rounded-2xl w-fit mx-auto select-none">
        <button
          type="button"
          onClick={() => {
            setAvatarMode('illustrated')
          }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            avatarMode === 'illustrated'
              ? 'bg-[#738541] text-white shadow-xs'
              : 'text-[#6F6759] dark:text-[#9BAF90] hover:text-[#1D2516] dark:hover:text-[#F5F2EB]'
          }`}
        >
          <FontAwesomeIcon icon={faPaintBrush} className="text-xs" />
          <span>Avatars</span>
        </button>

        <button
          type="button"
          onClick={() => setAvatarMode('custom')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            avatarMode === 'custom'
              ? 'bg-[#738541] text-white shadow-xs'
              : 'text-[#6F6759] dark:text-[#9BAF90] hover:text-[#1D2516] dark:hover:text-[#F5F2EB]'
          }`}
        >
          <FontAwesomeIcon icon={faCamera} className="text-xs" />
          <span>Custom Photo URL</span>
        </button>
      </div>

      {/* 3. Three-Column Stage Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pt-2">
        {/* Left Column */}
        <div className="md:col-span-3 flex flex-col items-center md:items-start justify-center gap-3">
          {avatarMode === 'illustrated' ? (
            <>
              <div className="text-xs font-bold uppercase tracking-wider text-[#1D2516] dark:text-[#F5F2EB]">
                Gender
              </div>
              <div className="flex items-center gap-3.5">
                {/* Male Selector Button */}
                <button
                  type="button"
                  onClick={() => setSelectedGender(selectedGender === 'male' ? 'all' : 'male')}
                  title="Show Male Avatars"
                  className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    selectedGender === 'male'
                      ? 'ring-3 ring-[#738541] bg-[#EEF4E8] dark:bg-[#1D2D23] shadow-md scale-105'
                      : 'border-2 border-[#D5CBB6] dark:border-[#223326] bg-[#FAF8F3] dark:bg-[#15231C] opacity-65 hover:opacity-100 hover:scale-102'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center">
                    <img
                      src={buildAvatarUrl('Felix', 'open-peeps')}
                      alt="Male Avatar"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#1D2516] text-[#A9C378] flex items-center justify-center text-[10px] shadow-xs">
                    <FontAwesomeIcon icon={faMars} />
                  </div>
                </button>

                {/* Female Selector Button */}
                <button
                  type="button"
                  onClick={() => setSelectedGender(selectedGender === 'female' ? 'all' : 'female')}
                  title="Show Female Avatars"
                  className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    selectedGender === 'female'
                      ? 'ring-3 ring-[#738541] bg-[#EEF4E8] dark:bg-[#1D2D23] shadow-md scale-105'
                      : 'border-2 border-[#D5CBB6] dark:border-[#223326] bg-[#FAF8F3] dark:bg-[#15231C] opacity-65 hover:opacity-100 hover:scale-102'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center">
                    <img
                      src={buildAvatarUrl('Tara', 'open-peeps')}
                      alt="Female Avatar"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#1D2516] text-[#A9C378] flex items-center justify-center text-[10px] shadow-xs">
                    <FontAwesomeIcon icon={faVenus} />
                  </div>
                </button>
              </div>
              {selectedGender !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedGender('all')}
                  className="text-[11px] text-[#738541] dark:text-[#9EB868] hover:underline font-semibold cursor-pointer"
                >
                  Show all genders
                </button>
              )}
            </>
          ) : (
            <div className="space-y-2 text-center md:text-left">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#738541] dark:text-[#9EB868] inline-flex items-center gap-1">
                <FontAwesomeIcon icon={faCamera} className="text-[10px]" />
                Personal Photo
              </span>
              <p className="text-xs text-[#6F6759] dark:text-[#9BAF90] leading-relaxed">
                Paste any direct image link from the web or upload an image from your computer.
              </p>
            </div>
          )}
        </div>

        {/* Center Column: Big Circular Spotlight with Doodle Accents */}
        <div className="md:col-span-6 flex flex-col items-center justify-center relative">
          <div className="relative">
            {/* Hand-Drawn Doodle Dashes */}
            <svg
              className="absolute -top-3 -right-2 w-8 h-8 text-[#738541] pointer-events-none select-none"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="4" y1="12" x2="1" y2="12" />
              <line x1="6" y1="6" x2="3" y2="3" />
              <line x1="12" y1="4" x2="12" y2="1" />
            </svg>
            <svg
              className="absolute top-1/2 -left-4 w-6 h-8 text-[#738541] pointer-events-none select-none"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="20" y1="6" x2="23" y2="3" />
              <line x1="20" y1="12" x2="24" y2="12" />
              <line x1="20" y1="18" x2="23" y2="21" />
            </svg>

            {/* Big Circular Canvas Background */}
            <div className="w-52 h-52 sm:w-64 sm:h-64 rounded-full bg-[#EAE3D2] dark:bg-[#16271D] border-2 border-[#D5CBB6] dark:border-[#223326] flex items-center justify-center p-3 shadow-inner overflow-hidden">
              <img
                src={currentBigAvatarUrl}
                alt="Selected Profile Avatar"
                onError={() => {
                  if (avatarMode === 'custom') {
                    setUrlError('Unable to load image from this URL. Please verify it is a direct image link.')
                    setImageLoaded(false)
                  }
                }}
                onLoad={() => {
                  setUrlError(null)
                  setImageLoaded(true)
                }}
                className={`w-full h-full select-none ${
                  isBigAvatarCustom ? 'object-cover rounded-full' : 'object-contain'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Attributes List */}
        <div className="md:col-span-3 flex flex-col items-center md:items-start justify-center gap-2.5 w-full">
          <div className="w-full space-y-2.5 bg-[#FAF8F3] dark:bg-[#132219] border border-[#E8E2D5] dark:border-[#223326] rounded-2xl p-3.5">
            {avatarMode === 'illustrated' ? (
              currentPreset ? (
                <>
                  <div className="flex items-center justify-between gap-2 border-b border-[#E8E2D5] dark:border-[#223326] pb-1.5">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#1D2516] dark:text-[#F5F2EB]">
                      HAIR
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#738541] dark:text-[#A8D968] text-right truncate">
                      {currentPreset.hair}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-b border-[#E8E2D5] dark:border-[#223326] pb-1.5">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#1D2516] dark:text-[#F5F2EB]">
                      CLOTHING
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#738541] dark:text-[#A8D968] text-right truncate">
                      {currentPreset.clothing}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-b border-[#E8E2D5] dark:border-[#223326] pb-1.5">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#1D2516] dark:text-[#F5F2EB]">
                      EYES
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#738541] dark:text-[#A8D968] text-right truncate">
                      {currentPreset.eyes}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#1D2516] dark:text-[#F5F2EB]">
                      HEAD
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#738541] dark:text-[#A8D968] text-right truncate">
                      {currentPreset.head}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2 border-b border-[#E8E2D5] dark:border-[#223326] pb-1.5">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#1D2516] dark:text-[#F5F2EB]">
                      PHOTO
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#738541] dark:text-[#A8D968] text-right truncate">
                      CURRENT APPLIED
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-b border-[#E8E2D5] dark:border-[#223326] pb-1.5">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#1D2516] dark:text-[#F5F2EB]">
                      SOURCE
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#738541] dark:text-[#A8D968] text-right">
                      {avatarStyle === 'custom' ? 'CUSTOM URL' : avatarStyle.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-b border-[#E8E2D5] dark:border-[#223326] pb-1.5">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#1D2516] dark:text-[#F5F2EB]">
                      STATUS
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#738541] dark:text-[#A8D968] text-right">
                      ACTIVE
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#1D2516] dark:text-[#F5F2EB]">
                      DISPLAY
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#738541] dark:text-[#A8D968] text-right">
                      {avatarStyle === 'custom' ? 'PERSONAL PHOTO' : 'AVATAR'}
                    </span>
                  </div>
                </>
              )
            ) : (
              <>
                <div className="flex items-center justify-between gap-2 border-b border-[#E8E2D5] dark:border-[#223326] pb-1.5">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#1D2516] dark:text-[#F5F2EB]">
                    SOURCE
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#738541] dark:text-[#A8D968] text-right">
                    CUSTOM URL
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 border-b border-[#E8E2D5] dark:border-[#223326] pb-1.5">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#1D2516] dark:text-[#F5F2EB]">
                    FORMAT
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#738541] dark:text-[#A8D968] text-right">
                    PERSONAL PHOTO
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 border-b border-[#E8E2D5] dark:border-[#223326] pb-1.5">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#1D2516] dark:text-[#F5F2EB]">
                    STATUS
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#738541] dark:text-[#A8D968] text-right">
                    {imageLoaded ? 'ACTIVE' : 'ERROR'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#1D2516] dark:text-[#F5F2EB]">
                    ROUNDING
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#738541] dark:text-[#A8D968] text-right">
                    CIRCULAR
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 4. Bottom Controls: Carousel (Illustrated) OR Custom URL Input (Custom) */}
      {avatarMode === 'illustrated' ? (
        <div className="pt-2 border-t border-[#E8E2D5]/80 space-y-3">
          {/* Horizontal Thumbnails Row */}
          <div
            ref={carouselRef}
            className="flex items-center gap-3 overflow-x-auto pb-3 pt-2 px-1 scroll-smooth select-none"
          >
            {/* 1. Currently Applied Profile Avatar (Always Visible & First) */}
            <button
              type="button"
              onClick={() => setSelectedPresetId(null)}
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex-shrink-0 flex items-center justify-center p-1.5 transition-all cursor-pointer relative ${
                selectedPresetId === null
                  ? 'ring-3 ring-[#738541] bg-[#EEF4E8] scale-105 shadow-md border-transparent z-10'
                  : 'border border-[#E8E2D5] bg-[#FAF8F3] hover:bg-[#F2EDE2] hover:scale-102 opacity-80 hover:opacity-100'
              }`}
              title="Currently Applied Profile Avatar"
            >
              <div className="w-full h-full rounded-xl overflow-hidden flex items-center justify-center bg-[#ECE5D8]">
                <img
                  src={avatarUrl}
                  alt="Currently Applied"
                  className={`w-full h-full ${
                    !avatarUrl.includes('api.dicebear.com') ? 'object-cover' : 'object-contain'
                  }`}
                />
              </div>
              <span className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 text-[9px] font-bold uppercase tracking-wider bg-[#1D2516] text-[#A9C378] px-1.5 py-0.5 rounded-full shadow-xs whitespace-nowrap">
                Current
              </span>
            </button>

            {filteredPresets.map((preset) => {
              const isSelected = preset.id === selectedPresetId
              const thumbUrl = buildAvatarUrl(preset.seed, activeStyle)

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex-shrink-0 flex items-center justify-center p-1.5 transition-all cursor-pointer relative ${
                    isSelected
                      ? 'ring-3 ring-[#738541] bg-[#EEF4E8] scale-105 shadow-md border-transparent z-10'
                      : 'border border-[#E8E2D5] bg-[#FAF8F3] hover:bg-[#F2EDE2] hover:scale-102 opacity-75 hover:opacity-100'
                  }`}
                >
                  <img
                    src={thumbUrl}
                    alt={preset.name}
                    className="w-full h-full object-contain"
                  />
                </button>
              )
            })}
          </div>

          {/* Slider Track (Matching Screenshot Pill Slider) */}
          {filteredPresets.length > 0 && (
            <div className="w-full max-w-sm mx-auto px-4">
              <input
                type="range"
                min="0"
                max={filteredPresets.length}
                value={currentIndex}
                onChange={handleSliderChange}
                aria-label="Avatar carousel slider"
                className="w-full h-2 bg-[#EAE3D2] rounded-full appearance-none cursor-pointer accent-[#738541]"
              />
            </div>
          )}

          {/* Action & Style Selector Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            {/* Style Tabs */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6F6759] mr-1">
                Style:
              </span>
              {ART_STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => handleStyleChange(style.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    activeStyle === style.id
                      ? 'bg-[#738541] text-white border-[#738541] shadow-2xs'
                      : 'bg-[#FAF8F3] border-[#E8E2D5] text-[#4E5642] hover:bg-[#F0EAE0]'
                  }`}
                >
                  {style.name}
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleRandomize}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E8E2D5] bg-[#FAF8F3] hover:bg-[#F0EAE0] text-xs font-semibold text-[#4E5642] transition-colors cursor-pointer shadow-2xs"
              >
                <FontAwesomeIcon icon={faDice} className="text-[#738541]" />
                <span>Randomize</span>
              </button>

              <button
                type="button"
                disabled={selectedPresetId === null}
                onClick={() => {
                  if (currentPreset) {
                    const url = buildAvatarUrl(currentPreset.seed, activeStyle)
                    updateAvatar(url, activeStyle, currentPreset.seed)
                    triggerSaveFeedback()
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer ${
                  selectedPresetId === null
                    ? 'bg-[#EEF4E8] text-[#415525] border border-[#CCD8B8] cursor-default'
                    : 'bg-[#738541] hover:bg-[#5E6D34] text-white'
                }`}
              >
                <FontAwesomeIcon icon={faCheck} className="text-xs" />
                <span>
                  {selectedPresetId === null
                    ? 'Active Profile Avatar'
                    : savedSuccess
                    ? 'Saved!'
                    : 'Use This Avatar'}
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Custom Photo URL Input Section */
        <div className="pt-2 border-t border-[#E8E2D5]/80 space-y-4">
          <div className="max-w-xl mx-auto space-y-3.5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#738541] mb-1.5">
                Paste Image URL (Direct PNG, JPG, WebP link)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8A9280]">
                    <FontAwesomeIcon icon={faLink} className="text-xs" />
                  </div>
                  <input
                    type="url"
                    value={customUrlInput}
                    onChange={(e) => {
                      setCustomUrlInput(e.target.value)
                      setUrlError(null)
                      const val = e.target.value.trim()
                      if (val.startsWith('http') || val.startsWith('data:image/')) {
                        setCustomUrlPreview(val)
                      }
                    }}
                    placeholder="https://example.com/your-photo.jpg"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-[#FAF8F3] border border-[#E8E2D5] text-xs text-[#1D2516] font-medium placeholder-[#8A9280] focus:outline-none focus:border-[#738541] transition-colors"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleApplyCustomUrl}
                  className="px-4 py-2.5 rounded-xl bg-[#738541] hover:bg-[#5E6D34] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0"
                >
                  <FontAwesomeIcon icon={faCheck} className="text-xs" />
                  <span>Apply Photo</span>
                </button>
              </div>
            </div>

            {/* Upload File & Revert Bar (Zero Random Photos) */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pt-1">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E8E2D5] bg-[#FAF8F3] hover:bg-[#F2EDE2] text-xs font-semibold text-[#4E5642] cursor-pointer shadow-2xs transition-colors">
                <FontAwesomeIcon icon={faUpload} className="text-[#738541] text-xs" />
                <span>Upload From Device</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomUrlInput(avatarUrl)
                    setCustomUrlPreview(avatarUrl)
                    setUrlError(null)
                  }}
                  className="text-xs font-semibold text-[#738541] hover:underline cursor-pointer"
                >
                  Reset to Current Photo
                </button>
              )}
            </div>

            {/* Error Message */}
            {urlError && (
              <div className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 flex items-center gap-2 animate-fade-in">
                <FontAwesomeIcon icon={faCircleXmark} className="text-rose-600 text-xs shrink-0" />
                <span>{urlError}</span>
              </div>
            )}

            {/* Success Message */}
            {savedSuccess && (
              <div className="text-xs font-semibold text-[#415525] bg-[#EEF4E8] border border-[#CCD8B8] rounded-xl px-3 py-2 flex items-center gap-2 animate-fade-in">
                <FontAwesomeIcon icon={faCircleCheck} className="text-[#738541] text-xs shrink-0" />
                <span>Personalized photo applied and saved as your profile avatar!</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
