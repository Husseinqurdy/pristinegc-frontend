import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Clock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Button from './Button'

/** Minutes of no interaction before the user is signed out (override with VITE_IDLE_TIMEOUT_MINUTES). */
export const IDLE_MINUTES = Number(import.meta.env.VITE_IDLE_TIMEOUT_MINUTES) || 5
export const IDLE_REASON_KEY = 'logout_reason'

const IDLE_MS = IDLE_MINUTES * 60_000
const WARN_MS = 30_000
const ACTIVITY_KEY = 'last_activity'
const EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'wheel', 'touchstart', 'click'] as const

function lastActivity() {
  return Number(localStorage.getItem(ACTIVITY_KEY)) || Date.now()
}

/**
 * Signs the user out after IDLE_MINUTES without any interaction.
 *
 * - "Last activity" lives in localStorage, so activity in ANY open tab keeps
 *   every tab signed in, and one expiry covers them all.
 * - It compares timestamps instead of trusting a long setTimeout, because
 *   browsers freeze timers in background tabs and sleeping phones.
 * - 30 seconds before the end a warning appears; any interaction cancels it.
 * - While the device is OFFLINE the sign-out is held back until it reconnects.
 *   Signing in needs the network, so logging a field worker out with no signal
 *   would lock them out of recording entries. Entries saved offline are never
 *   deleted by a sign-out; they are sent when the same user signs in again.
 */
export default function IdleGuard() {
  const { user, logout } = useAuth()
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const lastWrite = useRef(0)

  useEffect(() => {
    if (!user) return

    function touch() {
      const now = Date.now()
      if (now - lastWrite.current < 5000) return
      lastWrite.current = now
      localStorage.setItem(ACTIVITY_KEY, String(now))
    }
    let signedOut = false // sign out exactly once, even if ticks arrive before React re-renders
    function check() {
      if (signedOut) return
      const remaining = IDLE_MS - (Date.now() - lastActivity())
      if (remaining <= 0) {
        if (!navigator.onLine) return
        signedOut = true
        sessionStorage.setItem(IDLE_REASON_KEY, 'idle')
        setSecondsLeft(null)
        logout()
      } else if (remaining <= WARN_MS) {
        setSecondsLeft(Math.ceil(remaining / 1000))
      } else {
        setSecondsLeft(null)
      }
    }
    function onWake() {
      if (document.visibilityState === 'visible') check()
    }

    // A fresh sign-in has no timestamp yet, so start the clock now. If one already
    // exists (page reload, or the installed app re-opened hours later) keep it:
    // a stale timestamp must sign the user out, not be quietly reset.
    if (!localStorage.getItem(ACTIVITY_KEY)) {
      lastWrite.current = Date.now()
      localStorage.setItem(ACTIVITY_KEY, String(lastWrite.current))
    }

    EVENTS.forEach((e) => window.addEventListener(e, touch, { passive: true, capture: true }))
    window.addEventListener('online', check)
    window.addEventListener('focus', onWake)
    document.addEventListener('visibilitychange', onWake)
    const timer = setInterval(check, 1000)
    check()

    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, touch, true))
      window.removeEventListener('online', check)
      window.removeEventListener('focus', onWake)
      document.removeEventListener('visibilitychange', onWake)
      clearInterval(timer)
    }
  }, [user, logout])

  function stay() {
    lastWrite.current = Date.now()
    localStorage.setItem(ACTIVITY_KEY, String(Date.now()))
    setSecondsLeft(null)
  }

  return (
    <AnimatePresence>
      {user && secondsLeft !== null && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-navy-950/50 z-[70] flex items-center justify-center p-6"
        >
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-2xl p-6 max-w-sm w-full text-center">
            <div className="w-11 h-11 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-display text-lg text-navy-950 mb-1.5">Still there?</h3>
            <p className="text-slate-ink text-sm mb-5">
              For your security you'll be signed out in <strong className="text-navy-950">{secondsLeft}s</strong> because
              there's been no activity.
            </p>
            <Button onClick={stay} className="w-full">Stay signed in</Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
