import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { KeyRound, LogOut, ChevronDown, Bell, BellOff, Loader2, Download } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { pushApi } from '../api/push'
import { promptInstall, showInstall, useInstall } from '../utils/install'
import { isPushSupported, getCurrentSubscription, enablePushNotifications, disablePushNotifications } from '../utils/push'

export default function UserMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  // Push only exists once the server has VAPID keys configured.
  const [pushAvailable, setPushAvailable] = useState(false)
  const { mode: installMode } = useInstall()
  const [pushBusy, setPushBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (isPushSupported()) {
      pushApi.getPublicKey()
        .then(() => {
          setPushAvailable(true)
          return getCurrentSubscription().then((sub) => setPushEnabled(Boolean(sub)))
        })
        .catch(() => setPushAvailable(false))
    }
  }, [])

  async function togglePush() {
    setPushBusy(true)
    try {
      if (pushEnabled) {
        await disablePushNotifications()
        setPushEnabled(false)
      } else {
        await enablePushNotifications()
        setPushEnabled(true)
      }
    } catch {
      // permission denied or unsupported - leave state unchanged
    } finally {
      setPushBusy(false)
    }
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const name = user?.full_name || user?.username || '?'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-header-blue-border transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-gold-100 text-gold-600 flex items-center justify-center font-medium text-xs shrink-0">
          {name.charAt(0).toUpperCase()}
        </div>
        <span className="hidden sm:inline text-sm text-navy-900 truncate max-w-[120px]">{name}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-ink transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="fixed left-3 right-3 top-[92px] sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 w-auto sm:w-56 bg-white rounded-xl border border-navy-100 shadow-lg z-50 overflow-hidden py-1"
          >
            <div className="px-3.5 py-2.5 border-b border-navy-50">
              <p className="text-sm text-navy-950 font-medium truncate">{name}</p>
              <p className="text-xs text-slate-ink capitalize">{user?.role}</p>
            </div>
            {isPushSupported() && pushAvailable && (
              <button
                onClick={togglePush}
                disabled={pushBusy}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-navy-900 hover:bg-navy-50 transition-colors disabled:opacity-60"
              >
                {pushBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : pushEnabled ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                {pushEnabled ? 'Disable notifications' : 'Enable notifications'}
              </button>
            )}
            {(installMode === 'prompt' || installMode === 'ios' || installMode === 'manual') && (
              <button
                onClick={() => {
                  setOpen(false)
                  if (installMode === 'prompt') promptInstall()
                  else showInstall() // shows the how-to card again
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-navy-900 hover:bg-navy-50 transition-colors"
              >
                <Download className="w-4 h-4" /> Install app
              </button>
            )}
            <button
              onClick={() => { setOpen(false); navigate('/change-password') }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-navy-900 hover:bg-navy-50 transition-colors"
            >
              <KeyRound className="w-4 h-4" /> Change password
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Log out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
