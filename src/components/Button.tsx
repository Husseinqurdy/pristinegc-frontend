import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean
  variant?: 'primary' | 'secondary' | 'ghost'
  icon?: ReactNode
}

const variants = {
  primary: 'bg-navy-900 hover:bg-navy-800 text-white',
  secondary: 'border border-navy-100 text-navy-900 hover:bg-navy-50 bg-white',
  ghost: 'text-navy-900 hover:bg-navy-50',
}

export default function Button({ loading, variant = 'primary', icon, children, className = '', disabled, ...rest }: Props) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      disabled={disabled || loading}
      className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...(rest as any)}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </motion.button>
  )
}
