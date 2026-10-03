import { type ReactNode, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, ArrowDownCircle, ArrowUpCircle, Landmark, Tags,
  Receipt, FileBarChart, Menu, X, WifiOff, RefreshCw, AlertTriangle,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useOfflineSync } from '../hooks/useOfflineSync'
import NotificationBell from './NotificationBell'
import UserMenu from './UserMenu'
import ConfirmDialog from './ConfirmDialog'

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard }

const accountantNav: NavItem[] = [
  { to: '/accountant', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/accountant/clients', label: 'Clients', icon: Users },
  { to: '/accountant/income', label: 'Income', icon: ArrowUpCircle },
  { to: '/accountant/expenses', label: 'Expenses', icon: ArrowDownCircle },
  { to: '/accountant/categories', label: 'Categories', icon: Tags },
  { to: '/accountant/assets-liabilities', label: 'Assets & Liabilities', icon: Landmark },
  { to: '/accountant/service-payments', label: 'Service Fees', icon: Receipt },
  { to: '/accountant/reports', label: 'Reports', icon: FileBarChart },
]

const clientNav: NavItem[] = [
  { to: '/client', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/client/income', label: 'Income', icon: ArrowUpCircle },
  { to: '/client/expenses', label: 'Expenses', icon: ArrowDownCircle },
  { to: '/client/assets-liabilities', label: 'Assets & Liabilities', icon: Landmark },
  { to: '/client/service-payments', label: 'Service Fees', icon: Receipt },
]

const TICKER_TEXT = 'PRISTINE GENERAL CONSULTANCY  \u2022  Clear bookkeeping for every business you serve  \u2022  '

export default function DashboardLayout({ children, title }: { children: ReactNode; title: string }) {
  const { user } = useAuth()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { isOnline, pendingCount, failedItems, syncing, retryFailed, discardFailed } = useOfflineSync()
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const nav = user?.role === 'accountant' ? accountantNav : clientNav
  const firstName = (user?.full_name || user?.username || '').split(' ')[0]

  const SidebarContent = (
    <>
      <div className="flex items-center gap-3 px-6 h-[88px] bg-header-gold border-b border-header-gold-border shrink-0">
        <div className="w-10 h-10 rounded-full bg-navy-800 ring-2 ring-white/40 flex items-center justify-center p-1.5 shrink-0">
          <img src="/logo-icon-white.png" alt="Pristine" className="w-full h-full object-contain" />
        </div>
        <div>
          <p className="font-display text-navy-900 text-base leading-none">Pristine</p>
          <p className="text-[10px] text-navy-800/70 tracking-widest font-medium">BOOKS</p>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto pt-3">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/accountant' || item.to === '/client'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive ? 'text-white' : 'text-navy-100/70 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="active-nav-pill"
                    className="absolute inset-0 bg-white/10 rounded-lg border-l-2 border-gold-500"
                    transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                  />
                )}
                <item.icon className="w-4 h-4 shrink-0 relative z-10" />
                <span className="relative z-10">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-5 border-t border-white/10">
        <p className="text-[11px] text-navy-100/40 leading-relaxed">
          © {new Date().getFullYear()} Pristine General Consultancy
        </p>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-ivory flex">
      <motion.aside
        initial={{ x: -24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.4 }}
        className="hidden lg:flex flex-col w-64 bg-navy-900 shrink-0"
      >
        {SidebarContent}
      </motion.aside>

      <AnimatePresence>
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="w-64 max-w-[75%] bg-navy-900 flex flex-col relative"
            >
              <button className="absolute top-5 right-4 text-white/70 hover:text-white" onClick={() => setMobileOpen(false)}>
                <X className="w-5 h-5" />
              </button>
              {SidebarContent}
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 bg-black/40" onClick={() => setMobileOpen(false)}
            />
          </div>
        )}
      </AnimatePresence>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Animated company ticker - "live motion" brand strip */}
        <div
          className="bg-navy-900 text-white/90 h-7 flex items-center overflow-hidden shrink-0"
          style={{ WebkitMaskImage: 'linear-gradient(to right, transparent, black 64px)', maskImage: 'linear-gradient(to right, transparent, black 64px)' }}
        >
          <div className="flex whitespace-nowrap animate-marquee text-[11px] tracking-wider font-medium">
            <span className="px-4">{TICKER_TEXT.repeat(4)}</span>
            <span className="px-4">{TICKER_TEXT.repeat(4)}</span>
          </div>
        </div>

        <header className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-[60px] bg-header-blue shadow-sm border-b border-header-blue-border sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button className="lg:hidden text-navy-900 shrink-0 -ml-1 p-1" onClick={() => setMobileOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-display text-lg sm:text-xl text-navy-900 truncate">{title}</h1>
          </div>

          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            {(!isOnline || pendingCount > 0) && (
              <span className={`hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${!isOnline ? 'bg-amber-50 text-amber-700' : 'bg-navy-50 text-navy-700'}`}>
                {!isOnline ? <WifiOff className="w-3.5 h-3.5" /> : <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />}
                {!isOnline ? 'Offline' : `Syncing ${pendingCount}…`}
              </span>
            )}
            {failedItems.length > 0 && (
              <span
                className="flex items-center gap-1.5 text-xs pl-2.5 pr-1.5 py-1 rounded-full bg-rose-50 text-rose-700"
                title={failedItems.map((i) => i.failed?.message).join('\n')}
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">{failedItems.length} not synced</span>
                <span className="sm:hidden">{failedItems.length}</span>
                <button onClick={retryFailed} className="ml-1 px-2 py-0.5 rounded-full bg-white/70 hover:bg-white">Retry</button>
                <button onClick={() => setConfirmDiscard(true)} className="px-2 py-0.5 rounded-full bg-white/70 hover:bg-white">Discard</button>
              </span>
            )}
            <motion.span
              key={firstName}
              initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}
              className="hidden md:inline text-sm text-slate-ink mr-1"
            >
              Welcome, <span className="text-navy-950 font-medium">{firstName}</span>
            </motion.span>
            <NotificationBell />
            <UserMenu />
          </div>
        </header>

        <ConfirmDialog
          open={confirmDiscard}
          title="Discard entries that could not sync?"
          message={`${failedItems.length} entr${failedItems.length === 1 ? 'y was' : 'ies were'} saved offline but rejected by the server. Discarding deletes them from this device.`}
          confirmLabel="Discard"
          onConfirm={async () => { await discardFailed(); setConfirmDiscard(false) }}
          onCancel={() => setConfirmDiscard(false)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
