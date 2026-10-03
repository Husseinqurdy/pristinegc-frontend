import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import IdleGuard, { IDLE_REASON_KEY } from './IdleGuard'

// Plain elements instead of animated ones: exit animations never finish under fake timers.
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: unknown }) => children,
  motion: new Proxy({}, { get: () => (props: Record<string, unknown>) => {
    const { initial, animate, exit, transition, ...rest } = props
    void initial; void animate; void exit; void transition
    return <div {...rest} />
  } }),
}))

const logout = vi.fn()
let user: { id: string } | null = { id: 'u1' }

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user, logout }),
}))

const MIN = 60_000
const setOnline = (online: boolean) =>
  Object.defineProperty(navigator, 'onLine', { value: online, configurable: true })

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-03T10:00:00Z'))
  localStorage.clear()
  sessionStorage.clear()
  logout.mockClear()
  user = { id: 'u1' }
  setOnline(true)
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })

describe('IdleGuard (5 minute inactivity sign-out)', () => {
  it('signs out after 5 minutes with no activity and records why', () => {
    render(<IdleGuard />)
    advance(4 * MIN + 59_000)
    expect(logout).not.toHaveBeenCalled()
    advance(2_000)
    expect(logout).toHaveBeenCalledTimes(1)
    expect(sessionStorage.getItem(IDLE_REASON_KEY)).toBe('idle')
  })

  it('warns 30 seconds before the end', () => {
    render(<IdleGuard />)
    advance(4 * MIN + 20_000)
    expect(screen.queryByText('Still there?')).toBeNull()
    advance(15_000)
    expect(screen.getByText('Still there?')).toBeTruthy()
  })

  it('any interaction restarts the 5 minutes (and dismisses the warning)', () => {
    render(<IdleGuard />)
    advance(4 * MIN + 40_000)
    expect(screen.getByText('Still there?')).toBeTruthy()
    act(() => { window.dispatchEvent(new Event('mousemove')) })
    advance(1_500)
    expect(screen.queryByText('Still there?')).toBeNull()
    advance(4 * MIN)
    expect(logout).not.toHaveBeenCalled()
    advance(2 * MIN)
    expect(logout).toHaveBeenCalledTimes(1)
  })

  it('"Stay signed in" restarts the clock', () => {
    render(<IdleGuard />)
    advance(4 * MIN + 45_000)
    act(() => { screen.getByText('Stay signed in').click() })
    advance(4 * MIN)
    expect(logout).not.toHaveBeenCalled()
  })

  it('does not sign out while offline, but does as soon as it is back online', () => {
    render(<IdleGuard />)
    setOnline(false)
    advance(30 * MIN)
    expect(logout).not.toHaveBeenCalled()
    setOnline(true)
    act(() => { window.dispatchEvent(new Event('online')) })
    expect(logout).toHaveBeenCalledTimes(1)
  })

  it('re-opening the app hours later signs out instead of resetting the clock', () => {
    localStorage.setItem('last_activity', String(Date.now() - 3 * 60 * MIN))
    render(<IdleGuard />)
    expect(logout).toHaveBeenCalledTimes(1)
  })

  it('activity in another tab keeps this tab signed in (shared timestamp)', () => {
    render(<IdleGuard />)
    advance(4 * MIN)
    localStorage.setItem('last_activity', String(Date.now())) // what the other tab writes
    advance(3 * MIN)
    expect(logout).not.toHaveBeenCalled()
  })

  it('does nothing when nobody is signed in', () => {
    user = null
    render(<IdleGuard />)
    advance(30 * MIN)
    expect(logout).not.toHaveBeenCalled()
  })
})
