import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, TrendingUp, TrendingDown, Wallet, Download, FileText, Landmark, Scale, HandCoins } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import StatCard from '../components/StatCard'
import Button from '../components/Button'
import { downloadBlob } from '../utils/download'
import {
  reportsApi, clientsApi, formatTZS,
  type ReportSummary, type BalanceSheet, type BalanceSheetItem, type Client,
} from '../api/finance'
import { apiErrorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { inputClass } from '../styles/form'

const COLORS = ['#0F2A4A', '#C9971C', '#1F4E82', '#DBAE3F', '#5B6472', '#163B63', '#A87A12']
const today = () => new Date().toISOString().slice(0, 10)

type Tab = 'pnl' | 'balance'

export default function Reports() {
  const { user } = useAuth()
  const isAccountant = user?.role === 'accountant'
  const [tab, setTab] = useState<Tab>('pnl')
  const [clients, setClients] = useState<Client[]>([])
  const [filterClient, setFilterClient] = useState('')

  // Profit & loss
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [summary, setSummary] = useState<ReportSummary | null>(null)

  // Balance sheet
  const [asOf, setAsOf] = useState(today())
  const [sheet, setSheet] = useState<BalanceSheet | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exportingExcel, setExportingExcel] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)

  const periodInvalid = Boolean(dateFrom && dateTo && dateFrom > dateTo)

  useEffect(() => {
    if (isAccountant) clientsApi.list().then(setClients)
  }, [isAccountant])

  useEffect(() => {
    if (tab !== 'pnl' || periodInvalid) return
    let cancelled = false
    setLoading(true)
    setError('')
    reportsApi
      .summary(filterClient || undefined, { date_from: dateFrom || undefined, date_to: dateTo || undefined })
      .then((data) => { if (!cancelled) setSummary(data) })
      .catch((e) => { if (!cancelled) setError(apiErrorMessage(e, 'Could not load the report.')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [tab, filterClient, dateFrom, dateTo, periodInvalid])

  useEffect(() => {
    if (tab !== 'balance' || !asOf) return
    let cancelled = false
    setLoading(true)
    setError('')
    reportsApi
      .balanceSheet(filterClient || undefined, asOf)
      .then((data) => { if (!cancelled) setSheet(data) })
      .catch((e) => { if (!cancelled) setError(apiErrorMessage(e, 'Could not load the balance sheet.')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [tab, filterClient, asOf])

  async function handleExportExcel() {
    setExportingExcel(true)
    try {
      const response = await reportsApi.exportExcel(filterClient || undefined, {
        date_from: dateFrom || undefined, date_to: dateTo || undefined,
      })
      downloadBlob(response.data, 'pristine-books-report.xlsx')
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not export the report.'))
    } finally {
      setExportingExcel(false)
    }
  }

  async function handleExportPdf() {
    setExportingPdf(true)
    try {
      if (tab === 'pnl') {
        const response = await reportsApi.exportPdf(filterClient || undefined, {
          date_from: dateFrom || undefined, date_to: dateTo || undefined,
        })
        downloadBlob(response.data, 'pristine-books-report.pdf')
      } else {
        const response = await reportsApi.balanceSheetPdf(filterClient || undefined, asOf || undefined)
        downloadBlob(response.data, `balance-sheet-${asOf}.pdf`)
      }
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not export the report.'))
    } finally {
      setExportingPdf(false)
    }
  }

  const categoryData = summary?.expense_by_category.map((c) => ({
    name: c.category__name || 'Other', value: c.total,
  })) || []

  const compareData = summary ? [
    { name: 'Income', amount: summary.total_income },
    { name: 'Expenses', amount: summary.total_expense },
  ] : []

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2 bg-white border border-navy-100 rounded-lg p-1">
          <button onClick={() => setTab('pnl')} className={`px-4 py-1.5 rounded-md text-sm transition-colors ${tab === 'pnl' ? 'bg-navy-900 text-white' : 'text-navy-900'}`}>
            Profit &amp; Loss
          </button>
          <button onClick={() => setTab('balance')} className={`px-4 py-1.5 rounded-md text-sm transition-colors ${tab === 'balance' ? 'bg-navy-900 text-white' : 'text-navy-900'}`}>
            Balance Sheet
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3 ml-auto">
          {isAccountant && (
            <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)}
              className="px-4 py-2 rounded-lg border border-navy-100 bg-white text-sm text-navy-900">
              <option value="">All clients</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.business_name}</option>)}
            </select>
          )}
          {tab === 'pnl' && (
            <Button variant="secondary" onClick={handleExportExcel} loading={exportingExcel} icon={<Download className="w-4 h-4" />}>
              {!exportingExcel && 'Excel'}
            </Button>
          )}
          <Button variant="secondary" onClick={handleExportPdf} loading={exportingPdf} icon={<FileText className="w-4 h-4" />}>
            {!exportingPdf && 'PDF'}
          </Button>
        </div>
      </div>

      {tab === 'pnl' ? (
        <div className="flex flex-wrap items-end gap-3 mb-6">
          <div>
            <label className="block text-xs text-slate-ink mb-1">From</label>
            <input type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} className={`${inputClass} w-auto bg-white`} />
          </div>
          <div>
            <label className="block text-xs text-slate-ink mb-1">To</label>
            <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} className={`${inputClass} w-auto bg-white`} />
          </div>
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo('') }} className="text-sm text-navy-900 underline pb-2.5">Clear dates</button>
          )}
          <p className="text-slate-ink text-sm pb-2.5 hidden md:block">Approved income and expenses only. Leave dates empty for all time.</p>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-3 mb-6">
          <div>
            <label className="block text-xs text-slate-ink mb-1">As at</label>
            <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className={`${inputClass} w-auto bg-white`} />
          </div>
          <p className="text-slate-ink text-sm pb-2.5 hidden md:block">
            Everything recorded on or before this date. Liabilities count what is still owed.
          </p>
        </div>
      )}

      {periodInvalid && tab === 'pnl' && (
        <div className="bg-rose-50 text-rose-700 text-sm px-4 py-3 rounded-xl mb-5">The start date must not be after the end date.</div>
      )}
      {error && <div className="bg-rose-50 text-rose-700 text-sm px-4 py-3 rounded-xl mb-5">{error}</div>}

      {tab === 'pnl' ? (
        loading || !summary ? (
          !error && <div className="flex justify-center py-16 text-slate-ink"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : (
          <>
            <div className="grid sm:grid-cols-3 gap-4 mb-6">
              <StatCard label="Total income" value={summary.total_income} formatValue={formatTZS} icon={TrendingUp} tone="green" delay={0} />
              <StatCard label="Total expenses" value={summary.total_expense} formatValue={formatTZS} icon={TrendingDown} tone="red" delay={0.05} />
              <StatCard
                label={summary.net_profit >= 0 ? 'Profit' : 'Loss'}
                value={Math.abs(summary.net_profit)}
                formatValue={formatTZS}
                icon={Wallet}
                tone={summary.net_profit >= 0 ? 'gold' : 'red'}
                delay={0.1}
              />
            </div>

            <div className="grid lg:grid-cols-5 gap-6">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="lg:col-span-2 bg-white rounded-2xl border border-navy-100 p-6">
                <h3 className="font-display text-lg text-navy-950 mb-4">Income vs Expenses</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={compareData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E4EAF1" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#5B6472' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#5B6472' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v) => formatTZS(Number(v))} cursor={{ fill: '#F1F4F8' }} />
                      <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                        {compareData.map((entry, i) => (
                          <Cell key={i} fill={entry.name === 'Income' ? '#0F2A4A' : '#C9971C'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="lg:col-span-3 bg-white rounded-2xl border border-navy-100 p-6">
                <h3 className="font-display text-lg text-navy-950 mb-4">Expenses by category</h3>
                {categoryData.length === 0 ? (
                  <p className="text-slate-ink text-sm py-8 text-center">No approved expenses in this period.</p>
                ) : (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                          {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v) => formatTZS(Number(v))} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </motion.div>
            </div>
          </>
        )
      ) : loading || !sheet ? (
        !error && <div className="flex justify-center py-16 text-slate-ink"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : (
        <BalanceSheetView sheet={sheet} />
      )}
    </>
  )
}

function Lines({ items, tone }: { items: BalanceSheetItem[]; tone: 'asset' | 'liability' }) {
  return (
    <>
      {items.map((item) => (
        <div key={item.type} className="py-2">
          <div className="flex items-center justify-between text-sm text-navy-950">
            <span className="pl-3">{item.label}</span>
            <span className="font-medium tabular-nums">{formatTZS(item.total)}</span>
          </div>
          {item.entries.map((e, i) => (
            <div key={i} className="flex items-center justify-between text-xs text-slate-ink pl-7 mt-0.5 gap-3">
              <span className="truncate">
                {e.description} <span className="opacity-70">({e.date})</span>
                {tone === 'liability' && e.original !== undefined && e.original !== e.amount && (
                  <span className="opacity-70"> · original {formatTZS(e.original)}</span>
                )}
              </span>
              <span className="tabular-nums shrink-0">{formatTZS(e.amount)}</span>
            </div>
          ))}
        </div>
      ))}
    </>
  )
}

function BalanceSheetView({ sheet }: { sheet: BalanceSheet }) {
  const empty = sheet.assets.groups.length === 0 && sheet.liabilities.items.length === 0
  return (
    <>
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total assets" value={sheet.assets.total} formatValue={formatTZS} icon={Landmark} tone="navy" delay={0} />
        <StatCard label="Total liabilities" value={sheet.liabilities.total} formatValue={formatTZS} icon={HandCoins} tone="red" delay={0.05} />
        <StatCard
          label={sheet.equity >= 0 ? 'Net assets (equity)' : 'Net deficit'}
          value={Math.abs(sheet.equity)}
          formatValue={formatTZS}
          icon={Scale}
          tone={sheet.equity >= 0 ? 'green' : 'red'}
          delay={0.1}
        />
      </div>

      {empty ? (
        <div className="bg-white rounded-2xl border border-navy-100 p-8 text-center text-slate-ink text-sm">
          No assets or liabilities were recorded on or before {sheet.as_of}. Add them under Assets &amp; Liabilities.
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6 items-start">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl border border-navy-100 p-6">
            <h3 className="font-display text-lg text-navy-950 mb-3">Assets</h3>
            {sheet.assets.groups.length === 0 && <p className="text-slate-ink text-sm py-2">No assets recorded.</p>}
            {sheet.assets.groups.map((group) => (
              <div key={group.label} className="mb-3 last:mb-0">
                <p className="text-xs uppercase tracking-wide text-slate-ink bg-navy-50 rounded-md px-3 py-1.5">{group.label}</p>
                <Lines items={group.items} tone="asset" />
                <div className="flex items-center justify-between text-sm font-medium text-navy-950 border-t border-navy-100 pt-2 px-3">
                  <span>Total {group.label.toLowerCase()}</span>
                  <span className="tabular-nums">{formatTZS(group.subtotal)}</span>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between font-medium text-navy-950 bg-navy-50 rounded-lg px-3 py-2.5 mt-4">
              <span>Total assets</span>
              <span className="tabular-nums">{formatTZS(sheet.assets.total)}</span>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl border border-navy-100 p-6">
            <h3 className="font-display text-lg text-navy-950 mb-3">Liabilities</h3>
            {sheet.liabilities.items.length === 0 && <p className="text-slate-ink text-sm py-2">No liabilities recorded.</p>}
            <Lines items={sheet.liabilities.items} tone="liability" />
            <div className="flex items-center justify-between font-medium text-navy-950 bg-navy-50 rounded-lg px-3 py-2.5 mt-4">
              <span>Total liabilities</span>
              <span className="tabular-nums">{formatTZS(sheet.liabilities.total)}</span>
            </div>
            <div className={`flex items-center justify-between font-semibold rounded-lg px-3 py-3 mt-3 ${sheet.equity >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              <span>Net assets (equity)</span>
              <span className="tabular-nums">{formatTZS(sheet.equity)}</span>
            </div>
            <p className="text-xs text-slate-ink mt-3">Net assets = total assets − total liabilities.</p>
          </motion.div>
        </div>
      )}
    </>
  )
}
