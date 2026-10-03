import { useEffect, useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Copy, Check, Building2, Loader2, Pencil, Trash2, Power, KeyRound } from 'lucide-react'
import DataTable, { type Column } from '../components/DataTable'
import Drawer from '../components/Drawer'
import EmptyState from '../components/EmptyState'
import Button from '../components/Button'
import ConfirmDialog from '../components/ConfirmDialog'
import { inputClass, labelClass } from '../styles/form'
import { clientsApi, type Client } from '../api/finance'
import { apiErrorMessage } from '../api/client'

const emptyForm = { business_name: '', company_name: '', business_type: '', username: '', email: '', phone: '' }

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [saving, setSaving] = useState(false)
  const [credentials, setCredentials] = useState<{ username: string; password: string; title: string; hint: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [resetTarget, setResetTarget] = useState<Client | null>(null)
  const [resetting, setResetting] = useState(false)
  const [notice, setNotice] = useState('')

  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')

  async function loadClients() {
    setLoading(true)
    setClients(await clientsApi.list())
    setLoading(false)
  }

  useEffect(() => { loadClients() }, [])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setFormError('')
    setShowForm(true)
  }

  function openEdit(c: Client) {
    setEditing(c)
    setForm({ business_name: c.business_name, company_name: c.company_name, business_type: c.business_type, username: '', email: '', phone: '' })
    setFormError('')
    setShowForm(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.business_name || (!editing && !form.username)) {
      setFormError('Business name and username are required.')
      return
    }
    setFormError('')
    setSaving(true)
    try {
      if (editing) {
        await clientsApi.update(editing.id, { business_name: form.business_name, company_name: form.company_name, business_type: form.business_type })
        setShowForm(false)
      } else {
        const created = await clientsApi.create(form)
        setCredentials({
          username: form.username, password: created.generated_password,
          title: 'Account created',
          hint: "Share these sign-in details with your client. They won't be shown again.",
        })
        setShowForm(false)
      }
      loadClients()
    } catch {
      setFormError(editing ? 'Could not save changes.' : 'Could not create client. The username may already be taken.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(c: Client) {
    setTogglingId(c.id)
    try {
      await clientsApi.setActive(c.id, !c.is_active)
      setClients((prev) => prev.map((x) => (x.id === c.id ? { ...x, is_active: !x.is_active } : x)))
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await clientsApi.remove(deleteTarget.id)
      setClients((prev) => prev.filter((c) => c.id !== deleteTarget.id))
    } catch (err) {
      // e.g. the client already has records - they can only be disabled.
      setNotice(apiErrorMessage(err, 'Could not delete this client.'))
      setTimeout(() => setNotice(''), 8000)
    } finally {
      setDeleteTarget(null)
      setDeleting(false)
    }
  }

  async function handleResetPassword() {
    if (!resetTarget) return
    setResetting(true)
    try {
      const res = await clientsApi.resetPassword(resetTarget.id)
      setCredentials({
        username: res.username, password: res.generated_password,
        title: 'Password reset',
        hint: "Give this temporary password to your client. They'll be asked to choose their own when they sign in. It won't be shown again.",
      })
    } catch (err) {
      setNotice(apiErrorMessage(err, 'Could not reset the password.'))
      setTimeout(() => setNotice(''), 8000)
    } finally {
      setResetTarget(null)
      setResetting(false)
    }
  }

  function copyCreds() {
    if (!credentials) return
    navigator.clipboard.writeText(`Username: ${credentials.username}\nPassword: ${credentials.password}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const columns: Column<Client>[] = [
    { header: 'Business', isMobileTitle: true, cell: (c) => <span className="font-medium text-navy-950">{c.business_name}</span> },
    { header: 'Company name', cell: (c) => c.company_name || '—' },
    { header: 'Type', cell: (c) => c.business_type || '—' },
    {
      header: 'Status',
      cell: (c) => (
        <span className={`text-xs px-2 py-1 rounded-full ${c.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
          {c.is_active ? 'Active' : 'Disabled'}
        </span>
      ),
    },
    { header: 'Added', cell: (c) => new Date(c.created_at).toLocaleDateString('en-GB') },
  ]

  return (
    <>
      <div className="flex items-center justify-between mb-6 gap-3">
        <p className="text-slate-ink text-sm hidden sm:block">All the businesses you provide bookkeeping for.</p>
        <Button onClick={openCreate} icon={<Plus className="w-4 h-4" />} className="ml-auto sm:ml-0">
          New client
        </Button>
      </div>

      {notice && (
        <div className="bg-rose-50 text-rose-700 text-sm px-4 py-3 rounded-xl mb-5">{notice}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-slate-ink"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : clients.length === 0 ? (
        <EmptyState icon={Building2} title="No clients yet" hint="Tap 'New client' to add the first business you're supporting." />
      ) : (
        <DataTable
          columns={columns}
          data={clients}
          actions={(c) => (
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleToggleActive(c)}
                disabled={togglingId === c.id}
                title={c.is_active ? 'Disable client' : 'Activate client'}
                className={`${c.is_active ? 'text-emerald-600 hover:text-rose-600' : 'text-slate-ink hover:text-emerald-600'} transition-colors disabled:opacity-50`}
              >
                {togglingId === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
              </button>
              <button onClick={() => setResetTarget(c)} className="text-slate-ink hover:text-navy-900 transition-colors" title="Reset password">
                <KeyRound className="w-4 h-4" />
              </button>
              <button onClick={() => openEdit(c)} className="text-slate-ink hover:text-navy-900 transition-colors" title="Edit">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => setDeleteTarget(c)} className="text-slate-ink hover:text-rose-600 transition-colors" title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        />
      )}

      <Drawer open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit client' : 'Add a new client'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Business name *</label>
            <input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} className={inputClass} />
            <p className="text-xs text-slate-ink mt-1">The everyday trading name shown throughout the app.</p>
          </div>
          <div>
            <label className={labelClass}>Company name (optional)</label>
            <input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              placeholder="e.g. registered legal entity name" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Business type</label>
            <input value={form.business_type} onChange={(e) => setForm({ ...form, business_type: e.target.value })}
              placeholder="e.g. retail shop" className={inputClass} />
          </div>

          {!editing && (
            <>
              <div>
                <label className={labelClass}>Login username *</label>
                <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
              </div>
            </>
          )}

          {formError && <p className="text-red-600 text-sm">{formError}</p>}

          <Button type="submit" loading={saving} className="w-full">
            {!saving && (editing ? 'Save changes' : 'Create client account')}
          </Button>
          {!editing && (
            <p className="text-xs text-slate-ink">
              A password will be generated automatically and shown once — copy it and hand it to your client.
            </p>
          )}
        </form>
      </Drawer>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this client?"
        message={`This permanently removes "${deleteTarget?.business_name}" and their login. A client that already has records can't be deleted - disable the account instead.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={!!resetTarget}
        title="Reset this client's password?"
        message={`"${resetTarget?.business_name}" will be signed out everywhere and given a new temporary password.`}
        confirmLabel="Reset password"
        loading={resetting}
        onConfirm={handleResetPassword}
        onCancel={() => setResetTarget(null)}
      />

      <AnimatePresence>
        {credentials && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-navy-950/50 z-50 flex items-center justify-center p-6"
          >
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl p-7 max-w-sm w-full">
              <h3 className="font-display text-xl text-navy-950 mb-1">{credentials.title}</h3>
              <p className="text-slate-ink text-sm mb-5">{credentials.hint}</p>
              <div className="bg-navy-50 rounded-xl p-4 mb-4 space-y-2">
                <p className="text-sm text-navy-950"><span className="text-slate-ink">Username:</span> <strong>{credentials.username}</strong></p>
                <p className="text-sm text-navy-950"><span className="text-slate-ink">Password:</span> <strong>{credentials.password}</strong></p>
              </div>
              <div className="flex gap-2">
                <Button onClick={copyCreds} icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} className="flex-1">
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button variant="secondary" onClick={() => setCredentials(null)} className="flex-1">Close</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
