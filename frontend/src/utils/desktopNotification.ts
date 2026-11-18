/**
 * Desktop Notification Utility for Future You
 * Native Web Notifications + Service Worker registration + Web Audio API synthesizer for clean notification chimes.
 */

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied'
  return Notification.permission
}

/**
 * Registers the notification service worker if supported by the browser.
 */
export async function registerNotificationServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    return registration
  } catch (err) {
    console.debug('[DesktopNotification] Service Worker registration skipped or failed:', err)
    return null
  }
}

// Auto-register service worker on startup in browser environment
if (typeof window !== 'undefined') {
  registerNotificationServiceWorker().catch(() => {})
}

/**
 * Plays a cheerful dual-tone melodic chime using Web Audio API.
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
  requireInteraction?: boolean
  onClick?: () => void
}

/**
 * Displays a native desktop notification (OS toast) and plays the chime sound.
 * Ensures compatibility with Windows 10/11 Action Center and Chromium notification engine.
 */
export async function showDesktopNotification(
  options: ShowDesktopNotificationOptions
): Promise<Notification | null> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return null
  }

  try {
    // Play chime sound
    if (!options.silent) {
      playNotificationChime()
    }

    // Build fully-qualified URLs for icon and badge so Windows Action Center displays them reliably
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const iconUrl = options.icon
      ? (options.icon.startsWith('http') ? options.icon : `${origin}${options.icon.startsWith('/') ? '' : '/'}${options.icon}`)
      : `${origin}/android-chrome-192x192.png`

    const badgeUrl = options.badge
      ? (options.badge.startsWith('http') ? options.badge : `${origin}${options.badge.startsWith('/') ? '' : '/'}${options.badge}`)
      : `${origin}/favicon-32x32.png`

    const notificationOptions: NotificationOptions = {
      body: options.body,
      icon: iconUrl,
      badge: badgeUrl,
      tag: options.tag || `future-you-${Date.now()}`,
      // IMPORTANT FOR WINDOWS: Never pass silent: true! Windows Action Center suppresses toast banner pop-ups when silent is true.
      silent: false,
      // Keep notification active on desktop until the user clicks or dismisses it
      requireInteraction: options.requireInteraction ?? true,
    }

    // 1. Try Service Worker showNotification if active (preferred by modern Chromium on desktop & mobile)
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready
        if (reg && typeof reg.showNotification === 'function') {
          await reg.showNotification(options.title, notificationOptions)
          return null
        }
      } catch (swErr) {
        console.debug('[DesktopNotification] Service worker showNotification fallback to new Notification:', swErr)
      }
    }

    // 2. Direct Window Notification API constructor
    const notification = new Notification(options.title, notificationOptions)

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
