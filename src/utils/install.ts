import { useSyncExternalStore } from 'react'

// Chrome fires `beforeinstallprompt` once, often BEFORE React has mounted, so
// it is captured here at start-up (see main.tsx) and handed out later.
type InstallEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: InstallEvent | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

const DISMISS_KEY = 'install_dismissed_at'
const DISMISS_DAYS = 7

export function initInstallCapture() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // we show our own button instead of Chrome's mini-bar
    deferred = e as InstallEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    emit()
  })
}

export function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function isIOS() {
  const ua = navigator.userAgent
  return /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isMobile() {
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent) || isIOS()
}

/**
 * installed - already running as an app: show nothing
 * prompt    - the browser gave us a one-tap install
 * ios       - iPhone/iPad: only "Share -> Add to Home Screen" works
 * manual    - a phone where the browser has not offered install (yet): explain the menu route
 * none      - desktop without an install offer: show nothing (the address bar has its own icon)
 */
export type InstallMode = 'installed' | 'prompt' | 'ios' | 'manual' | 'none'

export function getInstallMode(): InstallMode {
  if (isStandalone()) return 'installed'
  if (deferred) return 'prompt'
  if (isIOS()) return 'ios'
  if (isMobile()) return 'manual'
  return 'none'
}

export function isDismissed() {
  const at = Number(localStorage.getItem(DISMISS_KEY))
  return Boolean(at) && Date.now() - at < DISMISS_DAYS * 24 * 3600 * 1000
}
export function dismissInstall() {
  localStorage.setItem(DISMISS_KEY, String(Date.now()))
  emit()
}
/** Bring the banner back (used by the "Install app" menu item). */
export function showInstall() {
  localStorage.removeItem(DISMISS_KEY)
  emit()
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferred) return 'unavailable'
  const event = deferred
  await event.prompt()
  const { outcome } = await event.userChoice
  deferred = null // an install event can only be used once
  emit()
  return outcome
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function useInstall() {
  // A primitive snapshot keeps useSyncExternalStore from re-rendering needlessly.
  const snapshot = useSyncExternalStore(subscribe, () => `${getInstallMode()}|${isDismissed()}`)
  const [mode, dismissed] = snapshot.split('|')
  return { mode: mode as InstallMode, dismissed: dismissed === 'true' }
}
