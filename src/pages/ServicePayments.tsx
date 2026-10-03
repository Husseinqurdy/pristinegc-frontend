import { useEffect, useState, type FormEvent } from 'react'
import { Plus, Pencil, Trash2, Loader2, Receipt, FileDown } from 'lucide-react'
import DataTable, { type Column } from '../components/DataTable'
import Drawer from '../components/Drawer'
import EmptyState from '../components/EmptyState'
import Button from '../components/Button'
import ConfirmDialog from '../components/ConfirmDialog'
import { inputClass, labelClass } from '../styles/form'
import { downloadBlob } from '../utils/download'
import { servicePaymentsApi, clientsApi, formatTZS, type ServicePayment, type Client } from '../api/finance'
import { useAuth } from '../context/AuthContext'

const statusStyles: Record<string, string> = {
  unpaid: 'bg-rose-50 text-rose-700', partial: 'bg-amber-50 text-amber-700', paid: 'bg-emerald-50 text-emerald-700',
}
const statusLabel: Record<string, string> = { unpaid: 'Unpaid', partial: 'Partially paid', paid: 'Paid' }

const emptyForm = { client: '', total_amount_due: '', amount_paid: '0', date: new Date().toISOString().slice(0, 10), notes: '' }

export default function ServicePayments() {
  const { user } = useAuth()
  const isAccountant = user?.role === 'accountant'
  const [entries, setEntries] = useState<ServicePayment[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ServicePayment | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ServicePayment | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const [form, setForm] = useState(emptyForm)

  async function load() {
    setLoading(true)
    setEntries(await servicePaymentsApi.list())
    setLoading(false)
  }

  useEffect(() => { load(); if (isAccountant) clientsApi.list().then(setClients) }, [])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  function openEdit(p: ServicePayment) {
    setEditing(p)
    setForm({ client: p.client, total_amount_due: p.total_amount_due, amount_paid: p.amount_paid, date: p.date, notes: p.notes })
    setShowForm(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const paid = parseFloat(form.amount_paid || '0')
      const due = parseFloat(form.total_amount_due || '0')
      const status = paid <= 0 ? 'unpaid' : paid >= due ? 'paid' : 'partial'
      if (editing) await servicePaymentsApi.update(editing.id, { ...form, status })
      else await servicePaymentsApi.create({ ...form, status })
      setShowForm(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await servicePaymentsApi.remove(deleteTarget.id)
      setEntries((prev) => prev.filter((x) => x.id !== deleteTarget.id))
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  async function handleDownload(p: ServicePayment) {
    setDownloadingId(p.id)
    try {
      const response = await servicePaymentsApi.downloadPdf(p.id)
      downloadBlob(response.data, `${p.status === 'paid' ? 'receipt' : 'invoice'}-${p.date}.pdf`)
    } finally {
      setDownloadingId(null)
    }
  }

  const columns: Column<ServicePayment>[] = [
    { header: 'Date', isMobileTitle: true, cell: (p) => <span className="font-medium">{p.date}</span> },
    ...(isAccountant ? [{ header: 'Client', cell: (p: ServicePayment) => p.client_name } as Column<ServicePayment>] : []),
    { header: 'Total fee', align: 'right', cell: (p) => formatTZS(p.total_amount_due) },
    { header: 'Paid', align: 'right', cell: (p) => formatTZS(p.amount_paid) },
    { header: 'Balance', align: 'right', cell: (p) => <span className="font-medium text-navy-950">{formatTZS(p.balance)}</span> },
    { header: 'Status', cell: (p) => <span className={`text-xs px-2 py-1 rounded-full ${statusStyles[p.status]}`}>{statusLabel[p.status]}</span> },
  ]

  return (
    <>
      <div className="flex items-center justify-between mb-6 gap-3">
        <p className="text-slate-ink text-sm hidden sm:block">
          {isAccountant ? 'Fees you charge clients for bookkeeping services.' : 'History of your payments to your accountant.'}
        </p>
        {isAccountant && (
          <Button onClick={openCreate} icon={<Plus className="w-4 h-4" />} className="ml-auto sm:ml-0">
            New invoice
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-slate-ink"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : entries.length === 0 ? (
        <EmptyState icon={Receipt} title="No payments recorded yet" />
      ) : (
        <DataTable
          columns={columns}
          data={entries}
          actions={(p) => (
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleDownload(p)}
                disabled={downloadingId === p.id}
                className="text-slate-ink hover:text-navy-900 disabled:opacity-50"
                title={p.status === 'paid' ? 'Download receipt (PDF)' : 'Download invoice (PDF)'}
              >
                {downloadingId === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              </button>
              {isAccountant && (
                <>
                  <button onClick={() => openEdit(p)} className="text-slate-ink hover:text-navy-900" title="Edit"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => setDeleteTarget(p)} className="text-slate-ink hover:text-rose-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
                </>
              )}
            </div>
          )}
        />
      )}

      <Drawer open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit service fee payment' : 'Record a service fee payment'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className={labelClass}>Client *</label>
            <select value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} className={inputClass}>
              <option value="">-- Select client --</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.business_name}</option>)}
            </select></div>
          <div><label className={labelClass}>Total fee (TZS) *</label>
            <input type="number" value={form.total_amount_due} onChange={(e) => setForm({ ...form, total_amount_due: e.target.value })} className={inputClass} /></div>
          <div><label className={labelClass}>Amount paid (TZS)</label>
            <input type="number" value={form.amount_paid} onChange={(e) => setForm({ ...form, amount_paid: e.target.value })} className={inputClass} /></div>
          <div><label className={labelClass}>Date</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} /></div>
          <div><label className={labelClass}>Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className={inputClass} /></div>
          <Button type="submit" loading={saving} className="w-full">{!saving && (editing ? 'Save changes' : 'Save')}</Button>
        </form>
      </Drawer>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this payment record?"
        message="This can't be undone."
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}
