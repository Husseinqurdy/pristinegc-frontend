import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, CheckCheck, Loader2 } from 'lucide-react'
import { notificationsApi, type AppNotification } from '../api/notifications'

function timeAgo(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const ref = useRef<HTMLDivElement>(null)

  async function load() {
    try {
      const data = await notificationsApi.list()
      setItems(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 45000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const unreadCount = items.filter((n) => !n.is_read).length

  async function handleMarkRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    await notificationsApi.markRead(id)
  }

  async function handleMarkAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })))
    await notificationsApi.markAllRead()
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-full text-navy-900 hover:bg-header-blue-border transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-gold-500 text-[10px] font-semibold text-navy-950 flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="fixed left-3 right-3 top-[92px] sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 w-auto sm:w-80 sm:max-w-[88vw] bg-white rounded-xl border border-navy-100 shadow-lg z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-navy-50">
              <span className="text-sm font-medium text-navy-950">Notifications</span>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} className="flex items-center gap-1 text-xs text-navy-900 hover:text-gold-600">
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8 text-slate-ink"><Loader2 className="w-4 h-4 animate-spin" /></div>
              ) : items.length === 0 ? (
                <p className="text-sm text-slate-ink text-center py-8">You're all caught up.</p>
              ) : (
                items.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => !n.is_read && handleMarkRead(n.id)}
                    className={`w-full text-left px-4 py-3 border-b border-navy-50 last:border-0 transition-colors hover:bg-navy-50/60 ${!n.is_read ? 'bg-gold-50/50' : ''}`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-gold-500 mt-1.5 shrink-0" />}
                      <div className={!n.is_read ? '' : 'pl-3.5'}>
                        <p className="text-sm text-navy-950 leading-snug">{n.message}</p>
                        <p className="text-xs text-slate-ink mt-0.5">{timeAgo(n.created_at)}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
