import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, TrendingUp, TrendingDown, Clock, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import StatCard from '../components/StatCard'
import { clientsApi, reportsApi, incomeApi, expensesApi, formatTZS, type Client } from '../api/finance'

export default function AccountantDashboard() {
  const [clients, setClients] = useState<Client[]>([])
  const [totals, setTotals] = useState({ income: 0, expense: 0 })
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    clientsApi.list().then(setClients)
    reportsApi.summary().then((s) => setTotals({ income: s.total_income, expense: s.total_expense }))
    Promise.all([incomeApi.list(), expensesApi.list()]).then(([inc, exp]) => {
      setPendingCount(inc.filter((i) => i.status === 'pending').length + exp.filter((e) => e.status === 'pending').length)
    })
  }, [])

  return (
    <>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Clients" value={clients.length} icon={Users} tone="navy" delay={0} />
        <StatCard label="Income (approved)" value={totals.income} formatValue={formatTZS} icon={TrendingUp} tone="green" delay={0.05} />
        <StatCard label="Expenses (approved)" value={totals.expense} formatValue={formatTZS} icon={TrendingDown} tone="red" delay={0.1} />
        <StatCard label="Awaiting review" value={pendingCount} icon={Clock} tone="gold" delay={0.15} />
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl border border-navy-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg text-navy-950">Recent clients</h3>
          <Link to="/accountant/clients" className="text-sm text-navy-900 hover:text-gold-600 flex items-center gap-1">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {clients.length === 0 ? (
          <p className="text-slate-ink text-sm py-6 text-center">You haven't added any clients yet.</p>
        ) : (
          <div className="space-y-1">
            {clients.slice(0, 6).map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2.5 border-b border-navy-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-navy-50 text-navy-900 flex items-center justify-center text-xs font-medium">
                    {c.business_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-navy-950">{c.business_name}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${c.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  {c.is_active ? 'Active' : 'Disabled'}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </>
  )
}
