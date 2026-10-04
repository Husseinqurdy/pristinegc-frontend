import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dismissInstall, getInstallMode, initInstallCapture, isDismissed, promptInstall, showInstall } from './install'
import { clearSession } from './session'

const ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36'
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1'
const DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36'

function env(ua: string, standalone = false) {
  vi.stubGlobal('navigator', { userAgent: ua, platform: 'Linux', maxTouchPoints: 0 })
  window.matchMedia = vi.fn().mockReturnValue({ matches: standalone }) as never
}

beforeEach(() => { localStorage.clear(); initInstallCapture() })
afterEach(() => vi.unstubAllGlobals())

describe('install mode', () => {
  it('Android Chrome with no browser offer -> explain the menu route', () => {
    env(ANDROID)
    expect(getInstallMode()).toBe('manual')
  })
  it('iPhone -> Add to Home Screen instructions', () => {
    env(IPHONE)
    expect(getInstallMode()).toBe('ios')
  })
  it('desktop with no offer -> nothing (browser shows its own icon)', () => {
    env(DESKTOP)
    expect(getInstallMode()).toBe('none')
  })
  it('already installed -> nothing', () => {
    env(ANDROID, true)
    expect(getInstallMode()).toBe('installed')
  })
  it('a beforeinstallprompt event switches to one-tap install and can be used once', async () => {
    env(ANDROID)
    const prompt = vi.fn().mockResolvedValue(undefined)
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt, userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(getInstallMode()).toBe('prompt')

    expect(await promptInstall()).toBe('accepted')
    expect(prompt).toHaveBeenCalledTimes(1)
    expect(getInstallMode()).toBe('manual')
    expect(await promptInstall()).toBe('unavailable')
  })
})

describe('dismissal', () => {
  it('hides for a week, can be brought back, and survives sign-out', () => {
    expect(isDismissed()).toBe(false)
    dismissInstall()
    expect(isDismissed()).toBe(true)
    clearSession() // signing out must not forget the choice
    localStorage.setItem('access_token', 'x')
    expect(isDismissed()).toBe(true)
    showInstall()
    expect(isDismissed()).toBe(false)
  })
  it('expires after 7 days', () => {
    localStorage.setItem('install_dismissed_at', String(Date.now() - 8 * 24 * 3600 * 1000))
    expect(isDismissed()).toBe(false)
  })
  it('clearSession removes the session but not device settings', () => {
    localStorage.setItem('access_token', 'a'); localStorage.setItem('user', '{}'); dismissInstall()
    clearSession()
    expect(localStorage.getItem('access_token')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
    expect(localStorage.getItem('install_dismissed_at')).not.toBeNull()
  })
})
