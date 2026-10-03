import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'

export default function EmptyState({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-navy-100 p-10 sm:p-12 text-center"
    >
      <Icon className="w-8 h-8 text-navy-100 mx-auto mb-3" />
      <p className="text-navy-950 font-medium mb-1">{title}</p>
      {hint && <p className="text-slate-ink text-sm">{hint}</p>}
    </motion.div>
  )
}
