import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Wallet, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import StatCard from '../components/StatCard'
import { reportsApi, incomeApi, formatTZS, type Income } from '../api/finance'

export default function ClientDashboard() {
  const [summary, setSummary] = useState({ total_income: 0, total_expense: 0, net_profit: 0 })
  const [recent, setRecent] = useState<Income[]>([])

  useEffect(() => {
    reportsApi.summary().then((s) => setSummary(s))
    incomeApi.list().then((data) => setRecent(data.slice(0, 6)))
  }, [])

  return (
    <>
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Approved income" value={summary.total_income} formatValue={formatTZS} icon={TrendingUp} tone="green" delay={0} />
        <StatCard label="Approved expenses" value={summary.total_expense} formatValue={formatTZS} icon={TrendingDown} tone="red" delay={0.05} />
        <StatCard
          label={summary.net_profit >= 0 ? 'Profit' : 'Loss'}
          value={Math.abs(summary.net_profit)}
          formatValue={formatTZS}
          icon={Wallet}
          tone={summary.net_profit >= 0 ? 'gold' : 'red'}
          delay={0.1}
        />
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl border border-navy-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg text-navy-950">Recent income</h3>
          <Link to="/client/income" className="flex items-center gap-1.5 text-sm bg-navy-900 hover:bg-navy-800 text-white px-3.5 py-2 rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-slate-ink text-sm py-6 text-center">No income recorded yet. Start today.</p>
        ) : (
          <div className="space-y-1">
            {recent.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2.5 border-b border-navy-50 last:border-0">
                <div>
                  <p className="text-sm text-navy-950">{r.description}</p>
                  <p className="text-xs text-slate-ink">{r.date}</p>
                </div>
                <span className="text-sm font-medium text-navy-950">{formatTZS(r.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </>
  )
}
