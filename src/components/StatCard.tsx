import { useEffect, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { motion, animate } from 'framer-motion'

export default function StatCard({
  label, value, formatValue, icon: Icon, tone = 'navy', delay = 0,
}: {
  label: string
  /** Raw numeric value - the card animates counting up to this on mount/change. */
  value: number
  /** How to render the animated number, e.g. (n) => formatTZS(n). Defaults to a plain integer. */
  formatValue?: (n: number) => string
  icon: LucideIcon
  tone?: 'navy' | 'gold' | 'green' | 'red'
  delay?: number
}) {
  const [display, setDisplay] = useState(0)
  const prevValue = useRef(0)

  useEffect(() => {
    const controls = animate(prevValue.current, value, {
      duration: 0.9,
      delay,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(v),
    })
    prevValue.current = value
    return () => controls.stop()
  }, [value, delay])

  const tones = {
    navy: 'bg-navy-900 text-white',
    gold: 'bg-gold-500 text-navy-950',
    green: 'bg-emerald-600 text-white',
    red: 'bg-rose-600 text-white',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, boxShadow: '0 12px 24px -8px rgba(15,42,74,0.18)' }}
      transition={{ duration: 0.4, delay }}
      className="bg-white rounded-2xl border border-navy-100 p-5 flex items-start justify-between"
    >
      <div>
        <p className="text-xs text-slate-ink mb-1.5">{label}</p>
        <p className="font-display text-2xl text-navy-950 tabular-nums">
          {formatValue ? formatValue(display) : Math.round(display).toLocaleString()}
        </p>
      </div>
      <motion.div
        initial={{ scale: 0, rotate: -15 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 12, delay: delay + 0.1 }}
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tones[tone]}`}
      >
        <Icon className="w-5 h-5" />
      </motion.div>
    </motion.div>
  )
}
