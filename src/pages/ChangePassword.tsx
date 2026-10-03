import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { KeyRound } from 'lucide-react'
import api, { apiErrorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import Button from '../components/Button'
import PasswordInput from '../components/PasswordInput'
import { labelClass } from '../styles/form'

export default function ChangePassword() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (newPassword.length < 8) return setError('New password must be at least 8 characters.')
    if (newPassword !== confirm) return setError("New passwords don't match.")
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/change-password/', { old_password: oldPassword, new_password: newPassword })
      logout()
      navigate('/login')
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not change the password. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ivory p-6">
      <motion.form
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-2xl border border-navy-100 p-7 sm:p-8"
      >
        <div className="w-11 h-11 rounded-xl bg-navy-900 text-gold-400 flex items-center justify-center mb-5">
          <KeyRound className="w-5 h-5" />
        </div>
        <h2 className="font-display text-2xl text-navy-950 mb-1">Change your password</h2>
        <p className="text-slate-ink text-sm mb-6">
          Welcome, {user?.full_name || user?.username}. For security, please change your temporary password.
        </p>

        <label className={labelClass}>Old password</label>
        <PasswordInput value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className="mb-4" />

        <label className={labelClass}>New password</label>
        <PasswordInput value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mb-4" />

        <label className={labelClass}>Confirm new password</label>
        <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mb-2" />

        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}

        <Button type="submit" loading={loading} className="mt-6 w-full">
          {!loading && 'Save and sign in again'}
        </Button>
      </motion.form>
    </div>
  )
}
