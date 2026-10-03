import { useEffect, useState, type FormEvent } from 'react'
import { Plus, Check, Pencil, Trash2, Loader2, ArrowUpCircle, Flag, Lock } from 'lucide-react'
import DataTable, { type Column } from '../components/DataTable'
import Drawer from '../components/Drawer'
import EmptyState from '../components/EmptyState'
import Button from '../components/Button'
import ConfirmDialog from '../components/ConfirmDialog'
import OfflineSavedBanner from '../components/OfflineSavedBanner'
import { inputClass, labelClass } from '../styles/form'
import { incomeApi, clientsApi, formatTZS, type Income, type Client } from '../api/finance'
import { useAuth } from '../context/AuthContext'
import { enqueue } from '../utils/offlineQueue'

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700', approved: 'bg-emerald-50 text-emerald-700', flagged: 'bg-rose-50 text-rose-700',
}
const statusLabel: Record<string, string> = { pending: 'Pending', approved: 'Approved', flagged: 'Flagged' }

const emptyForm = { client: '', date: new Date().toISOString().slice(0, 10), description: '', amount: '', paid_through: 'cash' as 'cash' | 'bank' }

export default function IncomePage() {
  const { user } = useAuth()
  const isAccountant = user?.role === 'accountant'
  const [entries, setEntries] = useState<Income[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [filterClient, setFilterClient] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Income | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Income | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [offlineNotice, setOfflineNotice] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [flagTarget, setFlagTarget] = useState<Income | 'bulk' | null>(null)
  const [flagNote, setFlagNote] = useState('')
  const [lockedNotice, setLockedNotice] = useState('')

  const [form, setForm] = useState(emptyForm)

  async function load() {
    setLoading(true)
    setEntries(await incomeApi.list(filterClient || undefined))
    setLoading(false)
  }

  useEffect(() => {
    load()
    setSelected(new Set())
    if (isAccountant) clientsApi.list().then(setClients)
  }, [filterClient])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setFormError('')
    setShowForm(true)
  }

  function openEdit(e: Income) {
    if (e.status === 'approved') {
      setLockedNotice("This entry has already been approved and can't be edited. Ask your accountant if a correction is needed.")
      setTimeout(() => setLockedNotice(''), 5000)
      return
    }
    setEditing(e)
    setForm({ client: e.client, date: e.date, description: e.description, amount: e.amount, paid_through: e.paid_through })
    setFormError('')
    setShowForm(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.amount || !form.description || (isAccountant && !form.client)) {
      setFormError('Please fill in all required fields.')
      return
    }
    setFormError('')
    setSaving(true)
    try {
      const payload = isAccountant ? form : { ...form, client: undefined }
      if (!navigator.onLine && !editing) {
        await enqueue('income', payload)
        setShowForm(false)
        setForm(emptyForm)
        setFormError('')
        setOfflineNotice(true)
        setTimeout(() => setOfflineNotice(false), 5000)
        return
      }
      if (editing) await incomeApi.update(editing.id, payload)
      else await incomeApi.create(payload)
      setShowForm(false)
      load()
    } catch {
      setFormError('Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function approve(id: string) {
    await incomeApi.approve(id)
    load()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await incomeApi.remove(deleteTarget.id)
      setEntries((prev) => prev.filter((x) => x.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch {
      setLockedNotice("This entry has already been approved and can't be deleted.")
      setTimeout(() => setLockedNotice(''), 5000)
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  function toggleSelectAll(checked: boolean) {
    setSelected(checked ? new Set(entries.filter((e) => e.status === 'pending').map((e) => e.id)) : new Set())
  }

  async function handleBulkApprove() {
    if (selected.size === 0) return
    setBulkBusy(true)
    try {
      await incomeApi.bulkApprove(Array.from(selected))
      setSelected(new Set())
      load()
    } finally {
      setBulkBusy(false)
    }
  }

  async function submitFlag() {
    setBulkBusy(true)
    try {
      if (flagTarget === 'bulk') await incomeApi.bulkFlag(Array.from(selected), flagNote)
      else if (flagTarget) await incomeApi.flag(flagTarget.id, flagNote)
      setSelected(new Set())
      setFlagTarget(null)
      setFlagNote('')
      load()
    } finally {
      setBulkBusy(false)
    }
  }

  const columns: Column<Income>[] = [
    { header: 'Description', isMobileTitle: true, cell: (e) => (
      <div>
        <span className="font-medium">{e.description}</span>
        {e.status === 'flagged' && e.review_note && <p className="text-xs text-rose-600 mt-0.5">Note: {e.review_note}</p>}
      </div>
    ) },
    { header: 'Date', cell: (e) => e.date },
    ...(isAccountant ? [{ header: 'Client', cell: (e: Income) => e.client_name } as Column<Income>] : []),
    { header: 'Method', cell: (e) => <span className="capitalize">{e.paid_through}</span> },
    { header: 'Amount', align: 'right', cell: (e) => <span className="font-medium text-navy-950">{formatTZS(e.amount)}</span> },
    { header: 'Status', cell: (e) => <span className={`text-xs px-2 py-1 rounded-full ${statusStyles[e.status]}`}>{statusLabel[e.status]}</span> },
  ]

  return (
    <>
      <OfflineSavedBanner show={offlineNotice} />
      {lockedNotice && (
        <div className="flex items-center gap-2.5 bg-rose-50 text-rose-700 text-sm px-4 py-3 rounded-xl mb-5">
          <Lock className="w-4 h-4 shrink-0" /> {lockedNotice}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        {isAccountant ? (
          <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)} className={`${inputClass} w-auto bg-white`}>
            <option value="">All clients</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.business_name}</option>)}
          </select>
        ) : <p className="text-slate-ink text-sm hidden sm:block">Record your daily sales and income.</p>}

        <Button onClick={openCreate} icon={<Plus className="w-4 h-4" />} className="ml-auto sm:ml-0">
          Add income
        </Button>
      </div>

      {isAccountant && selected.size > 0 && (
        <div className="flex items-center gap-3 bg-navy-50 border border-navy-100 rounded-xl px-4 py-2.5 mb-4">
          <span className="text-sm text-navy-900 font-medium">{selected.size} selected</span>
          <Button onClick={handleBulkApprove} loading={bulkBusy} icon={<Check className="w-4 h-4" />} className="!py-1.5 !px-3 text-sm">
            {!bulkBusy && 'Approve selected'}
          </Button>
          <Button variant="secondary" onClick={() => setFlagTarget('bulk')} icon={<Flag className="w-4 h-4" />} className="!py-1.5 !px-3 text-sm">
            Flag selected
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-slate-ink"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : entries.length === 0 ? (
        <EmptyState icon={ArrowUpCircle} title="No income recorded yet" />
      ) : (
        <DataTable
          columns={columns}
          data={entries}
          selectable={isAccountant}
          selectedIds={selected}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          isSelectable={(e) => e.status === 'pending'}
          actions={(e) => (
            <div className="flex items-center gap-3">
              {isAccountant && e.status === 'pending' && (
                <>
                  <button onClick={() => approve(e.id)} className="text-emerald-700 hover:text-emerald-800" title="Approve">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setFlagTarget(e)} className="text-slate-ink hover:text-rose-600" title="Flag"><Flag className="w-4 h-4" /></button>
                </>
              )}
              {e.status === 'approved' ? (
                <span title="Locked - already approved"><Lock className="w-4 h-4 text-slate-ink/40" /></span>
              ) : (
                <>
                  <button onClick={() => openEdit(e)} className="text-slate-ink hover:text-navy-900" title="Edit"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => setDeleteTarget(e)} className="text-slate-ink hover:text-rose-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
                </>
              )}
            </div>
          )}
        />
      )}

      <Drawer open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit income' : 'Add income'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isAccountant && (
            <div>
              <label className={labelClass}>Client *</label>
              <select value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} className={inputClass}>
                <option value="">-- Select client --</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.business_name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className={labelClass}>Date *</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Description *</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. shop sales" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Amount (TZS) *</label>
            <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Paid through</label>
            <select value={form.paid_through} onChange={(e) => setForm({ ...form, paid_through: e.target.value as 'cash' | 'bank' })} className={inputClass}>
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
            </select>
          </div>
          {formError && <p className="text-red-600 text-sm">{formError}</p>}
          <Button type="submit" loading={saving} className="w-full">{!saving && (editing ? 'Save changes' : 'Save')}</Button>
        </form>
      </Drawer>

      <Drawer open={!!flagTarget} onClose={() => setFlagTarget(null)} title="Flag for correction">
        <div className="space-y-4">
          <p className="text-sm text-slate-ink">
            {flagTarget === 'bulk' ? `Flagging ${selected.size} entries.` : 'Flagging this entry.'}{' '}
            The client will see this note and can edit the entry, which sends it back for your review.
          </p>
          <div>
            <label className={labelClass}>Note for the client *</label>
            <textarea value={flagNote} onChange={(e) => setFlagNote(e.target.value)} rows={3} className={inputClass} placeholder="e.g. Amount looks too high, please check the receipt" />
          </div>
          <Button onClick={submitFlag} loading={bulkBusy} disabled={!flagNote.trim()} className="w-full">
            {!bulkBusy && 'Send flag'}
          </Button>
        </div>
      </Drawer>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this income entry?"
        message="This can't be undone."
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}
