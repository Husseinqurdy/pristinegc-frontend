import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { KeyRound, ArrowLeft } from 'lucide-react'

export default function ForgotPassword() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ivory p-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-white rounded-2xl border border-navy-100 p-7 sm:p-8"
      >
        <div className="w-11 h-11 rounded-xl bg-navy-900 text-gold-400 flex items-center justify-center mb-5">
          <KeyRound className="w-5 h-5" />
        </div>
        <h2 className="font-display text-2xl text-navy-950 mb-1">Forgot your password?</h2>
        <p className="text-slate-ink text-sm mb-5">
          For the safety of your financial records, passwords can't be reset from this page.
        </p>

        <div className="space-y-4 text-sm text-navy-950">
          <div className="bg-navy-50 rounded-xl p-4">
            <p className="font-medium mb-1">I'm a client</p>
            <p className="text-slate-ink">
              Ask your accountant to reset your password. They'll give you a temporary one, and you'll be asked to choose
              your own when you sign in.
            </p>
          </div>
          <div className="bg-navy-50 rounded-xl p-4">
            <p className="font-medium mb-1">I'm the accountant</p>
            <p className="text-slate-ink">
              Ask the system administrator to reset it on the server.
            </p>
          </div>
        </div>

        <Link to="/login" className="mt-6 inline-flex items-center gap-1.5 text-sm text-navy-900 hover:text-gold-600">
          <ArrowLeft className="w-4 h-4" /> Back to sign in
        </Link>
      </motion.div>
    </div>
  )
}
