import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { User, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { apiErrorStatus } from '../api/client'
import { IDLE_MINUTES, IDLE_REASON_KEY } from '../components/IdleGuard'
import Button from '../components/Button'
import PasswordInput from '../components/PasswordInput'
import { inputClass, labelClass } from '../styles/form'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  // Shown once if the previous session ended because of inactivity.
  const [wasIdle] = useState(() => {
    const idle = sessionStorage.getItem(IDLE_REASON_KEY) === 'idle'
    sessionStorage.removeItem(IDLE_REASON_KEY)
    return idle
  })

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!username || !password) {
      setError('Please enter your username and password.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const user = await login(username, password)
      if (user.must_change_password) {
        navigate('/change-password')
      } else if (user.role === 'accountant') {
        navigate('/accountant')
      } else {
        navigate('/client')
      }
    } catch (err) {
      setError(
        apiErrorStatus(err) === 429
          ? 'Too many attempts. Please wait a minute and try again.'
          : 'Incorrect username or password.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-ivory">
      {/* Left: brand panel */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}
        className="hidden lg:flex flex-col justify-between bg-navy-900 text-white p-14 relative overflow-hidden"
      >
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-navy-800/60" />
        <div className="absolute -left-10 bottom-0 w-72 h-72 rounded-full bg-navy-800/40" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center p-2.5 shrink-0 shadow-lg shadow-black/20">
            <img src="/logo-icon-mono-white.png" alt="Pristine" className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="font-display text-2xl leading-none tracking-wide">Pristine</p>
            <p className="text-sm text-gold-400 tracking-widest font-medium mt-1">General Consultancy</p>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="font-display text-4xl leading-tight mb-4">
            Clear bookkeeping, for every business you serve.
          </h1>
          <p className="text-navy-100/80 leading-relaxed">
            Record income and expenses every day, let your accountant review and build reports —
            no notebooks, no mixed-up records.
          </p>
        </div>

        <p className="relative z-10 text-xs text-navy-100/50">© {new Date().getFullYear()} Pristine General Consultancy</p>
      </motion.div>

      {/* Right: login form */}
      <div className="flex items-center justify-center p-6 sm:p-8">
        <motion.form
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}
          onSubmit={handleSubmit}
          className="w-full max-w-sm"
        >
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-full bg-navy-800 ring-2 ring-gold-500/50 flex items-center justify-center p-2 shrink-0">
              <img src="/logo-icon-white.png" alt="Pristine" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="font-display text-xl leading-none text-navy-900">Pristine</p>
              <p className="text-xs text-gold-600 tracking-widest font-semibold mt-1">General Consultancy</p>
            </div>
          </div>

          <h2 className="font-display text-2xl text-navy-900 mb-1">Welcome back</h2>
          <p className="text-slate-ink text-sm mb-8">Sign in to continue to your dashboard.</p>

          {wasIdle && (
            <div className="bg-amber-50 text-amber-800 text-sm px-4 py-3 rounded-xl mb-6">
              You were signed out after {IDLE_MINUTES} minutes of inactivity. Please sign in again.
            </div>
          )}

          <label className={labelClass}>Username</label>
          <div className="relative mb-5">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-ink" />
            <input
              type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. accountant"
              className={`${inputClass} pl-10`}
            />
          </div>

          <label className={labelClass}>Password</label>
          <div className="mb-2">
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>

          <div className="flex justify-end mb-2">
            <Link to="/forgot-password" className="text-xs text-navy-900 hover:text-gold-600">Forgot password?</Link>
          </div>

          {error && <p className="text-red-600 text-sm mt-2 mb-2">{error}</p>}

          <Button type="submit" loading={loading} className="mt-6 w-full">
            {!loading && <>Sign in <ArrowRight className="w-4 h-4" /></>}
          </Button>

          <p className="text-xs text-slate-ink mt-6 text-center">
            Don't have an account? Contact your accountant to have one created for you.
          </p>
        </motion.form>
      </div>
    </div>
  )
}
