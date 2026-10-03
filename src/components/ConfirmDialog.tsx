import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import Button from './Button'

export default function ConfirmDialog({
  open, title, message, confirmLabel = 'Delete', loading, onConfirm, onCancel,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-navy-950/50 z-[60] flex items-center justify-center p-6"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-display text-lg text-navy-950 mb-1.5">{title}</h3>
            <p className="text-slate-ink text-sm mb-6">{message}</p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onCancel} className="flex-1">Cancel</Button>
              <Button
                onClick={onConfirm}
                loading={loading}
                className="flex-1 !bg-rose-600 hover:!bg-rose-700 text-white"
              >
                {!loading && confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
