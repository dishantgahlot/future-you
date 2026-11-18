/**
 * Desktop Notification Utility for Future You (WhatsApp-Style)
 * Native Web Notifications + Web Audio API synthesizer for clean notification chimes
 */

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied'
  return Notification.permission
}

/**
 * Plays a pleasant WhatsApp-like cheerful dual-tone chime using Web Audio API.
 * Requires no external audio files or network requests.
 */
export function playNotificationChime(): void {
  try {
    if (typeof window === 'undefined') return
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return

    const ctx = new AudioCtx()
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    const now = ctx.currentTime

    // Dual-tone melodic chime: first harmonic note (D5 -> A5), second harmonic (A5 -> D6)
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gainNode = ctx.createGain()

    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(587.33, now) // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.09) // A5

    osc2.type = 'triangle'
    osc2.frequency.setValueAtTime(880, now) // A5
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.12) // D6

    // Envelope: quick attack, smooth exponential decay
    gainNode.gain.setValueAtTime(0.001, now)
    gainNode.gain.linearRampToValueAtTime(0.25, now + 0.02)
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4)

    osc1.connect(gainNode)
    osc2.connect(gainNode)
    gainNode.connect(ctx.destination)

    osc1.start(now)
    osc2.start(now)
    osc1.stop(now + 0.4)
    osc2.stop(now + 0.4)
  } catch {
    // Non-blocking fallback
  }
}

export interface ShowDesktopNotificationOptions {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  silent?: boolean
  onClick?: () => void
}

/**
 * Displays a native desktop notification (OS toast) and plays the chime sound.
 */
export function showDesktopNotification(options: ShowDesktopNotificationOptions): Notification | null {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return null
  }

  try {
    // Play chime sound
    if (!options.silent) {
      playNotificationChime()
    }

    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || '/android-chrome-192x192.png',
      badge: options.badge || '/favicon-32x32.png',
      tag: options.tag || `future-you-${Date.now()}`,
      silent: true, // We handle the chime smoothly via Web Audio API so OS doesn't clash
    })

    notification.onclick = () => {
      try {
        window.focus()
        notification.close()
        if (options.onClick) {
          options.onClick()
        }
      } catch {}
    }

    return notification
  } catch (err) {
    console.warn('[DesktopNotification] Failed to display desktop alert:', err)
    return null
  }
}
