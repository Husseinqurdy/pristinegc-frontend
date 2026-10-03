import { useState, type InputHTMLAttributes } from 'react'
import { Lock, Eye, EyeOff } from 'lucide-react'
import { inputClass } from '../styles/form'

export default function PasswordInput({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-ink pointer-events-none" />
      <input
        type={show ? 'text' : 'password'}
        className={`${inputClass} pl-10 pr-10 ${className}`}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-ink hover:text-navy-900"
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  )
}
