import { AnimatePresence, motion } from 'framer-motion'
import { CloudOff } from 'lucide-react'

export default function OfflineSavedBanner({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          className="overflow-hidden"
        >
          <div className="flex items-center gap-2.5 bg-amber-50 text-amber-800 text-sm px-4 py-3 rounded-xl mb-5">
            <CloudOff className="w-4 h-4 shrink-0" />
            You're offline - this entry was saved on this device and will sync automatically once you're back online.
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
