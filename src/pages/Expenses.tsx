import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Check, Pencil, Trash2, Loader2, ArrowDownCircle, Paperclip, X as XIcon, ScanLine, Sparkles, Flag, Lock } from 'lucide-react'
import DataTable, { type Column } from '../components/DataTable'
import Drawer from '../components/Drawer'
import EmptyState from '../components/EmptyState'
import Button from '../components/Button'
import ConfirmDialog from '../components/ConfirmDialog'
import SearchableSelect from '../components/SearchableSelect'
import OfflineSavedBanner from '../components/OfflineSavedBanner'
import { inputClass, labelClass } from '../styles/form'
import { expensesApi, categoriesApi, clientsApi, formatTZS, type Expense, type Client, type ExpenseCategory } from '../api/finance'
import { useAuth } from '../context/AuthContext'
import { extractReceiptData } from '../utils/ocr'
import { enqueue } from '../utils/offlineQueue'
import { openBlobInNewTab } from '../utils/download'

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700', approved: 'bg-emerald-50 text-emerald-700', flagged: 'bg-rose-50 text-rose-700',
}
const statusLabel: Record<string, string> = { pending: 'Pending', approved: 'Approved', flagged: 'Flagged' }

const emptyForm = { client: '', category: '', date: new Date().toISOString().slice(0, 10), details: '', amount: '', remarks: '' }

export default function ExpensesPage() {
  const { user } = useAuth()
  const isAccountant = user?.role === 'accountant'
  const [entries, setEntries] = useState<Expense[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [filterClient, setFilterClient] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [offlineNotice, setOfflineNotice] = useState(false)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [scanApplied, setScanApplied] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [flagTarget, setFlagTarget] = useState<Expense | 'bulk' | null>(null)
  const [flagNote, setFlagNote] = useState('')
  const [lockedNotice, setLockedNotice] = useState('')
  const [downloadingReceipt, setDownloadingReceipt] = useState<string | null>(null)

  const [form, setForm] = useState(emptyForm)

  async function load() {
    setLoading(true)
    setEntries(await expensesApi.list(filterClient || undefined))
    setLoading(false)
  }

  useEffect(() => {
    load()
    setSelected(new Set())
    categoriesApi.list().then(setCategories)
    if (isAccountant) clientsApi.list().then(setClients)
  }, [filterClient])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setReceiptFile(null)
    setScanApplied(false)
    setFormError('')
    setShowForm(true)
  }

  function openEdit(e: Expense) {
    if (e.status === 'approved') {
      setLockedNotice("This entry has already been approved and can't be edited. Ask your accountant if a correction is needed.")
      setTimeout(() => setLockedNotice(''), 5000)
      return
    }
    setEditing(e)
    setForm({ client: e.client, category: e.category, date: e.date, details: e.details, amount: e.amount, remarks: e.remarks })
    setReceiptFile(null)
    setScanApplied(false)
    setFormError('')
    setShowForm(true)
  }

  async function handleReceiptSelect(file: File | null) {
    setReceiptFile(file)
    setScanApplied(false)
    if (!file || !(file.type.startsWith('image/') || file.type === 'application/pdf')) return
    setScanning(true)
    setScanProgress(0)
    try {
      const result = await extractReceiptData(file, setScanProgress)
      let applied = false
      setForm((prev) => {
        const next = { ...prev }
        if (result.amount && !prev.amount) { next.amount = result.amount; applied = true }
        if (result.date && !prev.date) { next.date = result.date; applied = true }
        return next
      })
      setScanApplied(applied)
    } catch {
      // best-effort only
    } finally {
      setScanning(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.amount || !form.details || !form.category || (isAccountant && !form.client)) {
      setFormError('Please fill in all required fields.')
      return
    }
    setFormError('')
    setSaving(true)
    try {
      const payload = isAccountant ? { ...form, receiptFile } : { ...form, client: undefined, receiptFile }
      if (!navigator.onLine && !editing) {
        await enqueue('expense', payload)
        setShowForm(false)
        setForm(emptyForm)
        setReceiptFile(null)
        setFormError('')
        setOfflineNotice(true)
        setTimeout(() => setOfflineNotice(false), 5000)
        return
      }
      if (editing) await expensesApi.update(editing.id, payload)
      else await expensesApi.create(payload)
      setShowForm(false)
      load()
    } catch {
      setFormError('Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function approve(id: string) {
    await expensesApi.approve(id)
    load()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await expensesApi.remove(deleteTarget.id)
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
      await expensesApi.bulkApprove(Array.from(selected))
      setSelected(new Set())
      load()
    } finally {
      setBulkBusy(false)
    }
  }

  async function submitFlag() {
    setBulkBusy(true)
    try {
      if (flagTarget === 'bulk') await expensesApi.bulkFlag(Array.from(selected), flagNote)
      else if (flagTarget) await expensesApi.flag(flagTarget.id, flagNote)
      setSelected(new Set())
      setFlagTarget(null)
      setFlagNote('')
      load()
    } finally {
      setBulkBusy(false)
    }
  }

  async function viewReceipt(e: Expense) {
    setDownloadingReceipt(e.id)
    try {
      await openBlobInNewTab(() => expensesApi.downloadReceipt(e.id))
    } catch {
      setLockedNotice('Could not open the receipt. Please try again.')
      setTimeout(() => setLockedNotice(''), 5000)
    } finally {
      setDownloadingReceipt(null)
    }
  }

  const columns: Column<Expense>[] = [
    { header: 'Details', isMobileTitle: true, cell: (e) => (
      <div>
        <span className="font-medium">{e.details}</span>
        {e.status === 'flagged' && e.review_note && <p className="text-xs text-rose-600 mt-0.5">Note: {e.review_note}</p>}
      </div>
    ) },
    { header: 'Date', cell: (e) => e.date },
    ...(isAccountant ? [{ header: 'Client', cell: (e: Expense) => e.client_name } as Column<Expense>] : []),
    { header: 'Category', cell: (e) => e.category_name },
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
        ) : <p className="text-slate-ink text-sm hidden sm:block">Record your daily expenses.</p>}

        <Button onClick={openCreate} icon={<Plus className="w-4 h-4" />} className="ml-auto sm:ml-0">
          Add expense
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
        <EmptyState icon={ArrowDownCircle} title="No expenses recorded yet" />
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
              {e.receipt && (
                <button onClick={() => viewReceipt(e)} disabled={downloadingReceipt === e.id} className="text-slate-ink hover:text-navy-900 disabled:opacity-50" title="View receipt">
                  {downloadingReceipt === e.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                </button>
              )}
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

      <Drawer open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit expense' : 'Add expense'}>
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
            <label className={labelClass}>Details *</label>
            <input value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Category *</label>
            {categories.length === 0 ? (
              <p className="text-sm text-slate-ink">
                No categories yet.{' '}
                {isAccountant ? (
                  <Link to="/accountant/categories" className="text-navy-900 underline">Add one first</Link>
                ) : 'Ask your accountant to add one.'}
              </p>
            ) : (
              <SearchableSelect
                options={categories.map((c) => ({ id: c.id, label: c.name }))}
                value={form.category}
                onChange={(id) => setForm({ ...form, category: id })}
                placeholder="Type to search categories…"
              />
            )}
          </div>
          <div>
            <label className={labelClass}>Amount (TZS) *</label>
            <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Remarks</label>
            <textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} rows={2} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Receipt (optional)</label>
            {editing?.receipt && !receiptFile && (
              <button type="button" onClick={() => viewReceipt(editing)} className="flex items-center gap-1.5 text-sm text-navy-900 underline mb-2">
                <Paperclip className="w-3.5 h-3.5" /> View current receipt
              </button>
            )}
            {receiptFile ? (
              <div className="bg-navy-50 rounded-lg px-3 py-2">
                <div className="flex items-center justify-between text-sm text-navy-950">
                  <span className="truncate">{receiptFile.name}</span>
                  <button type="button" onClick={() => { setReceiptFile(null); setScanApplied(false) }} className="text-slate-ink hover:text-rose-600 shrink-0 ml-2">
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
                {scanning && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-ink">
                    <ScanLine className="w-3.5 h-3.5 animate-pulse text-gold-600" />
                    Reading receipt… {Math.round(scanProgress * 100)}%
                  </div>
                )}
                {!scanning && scanApplied && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-700">
                    <Sparkles className="w-3.5 h-3.5" /> Amount/date auto-filled from receipt - please double check.
                  </div>
                )}
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 border border-dashed border-navy-100 rounded-lg py-3 text-sm text-slate-ink cursor-pointer hover:border-gold-500 hover:text-navy-900 transition-colors">
                <Paperclip className="w-4 h-4" /> Attach photo or PDF
                <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleReceiptSelect(e.target.files?.[0] || null)} />
              </label>
            )}
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
            <textarea value={flagNote} onChange={(e) => setFlagNote(e.target.value)} rows={3} className={inputClass} placeholder="e.g. Receipt doesn't match this amount" />
          </div>
          <Button onClick={submitFlag} loading={bulkBusy} disabled={!flagNote.trim()} className="w-full">
            {!bulkBusy && 'Send flag'}
          </Button>
        </div>
      </Drawer>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this expense entry?"
        message="This can't be undone."
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}
