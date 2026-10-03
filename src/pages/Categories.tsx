import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pencil, Trash2, Check, X as XIcon, Tags, Loader2 } from 'lucide-react'
import EmptyState from '../components/EmptyState'
import Button from '../components/Button'
import ConfirmDialog from '../components/ConfirmDialog'
import { inputClass } from '../styles/form'
import { categoriesApi, type ExpenseCategory } from '../api/finance'

export default function Categories() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<ExpenseCategory | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    setLoading(true)
    setCategories(await categoriesApi.list())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setError('')
    setSaving(true)
    try {
      await categoriesApi.create(name.trim())
      setName('')
      load()
    } catch {
      setError('Could not add category - it may already exist.')
    } finally {
      setSaving(false)
    }
  }

  function startEdit(c: ExpenseCategory) {
    setEditingId(c.id)
    setEditValue(c.name)
    setError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditValue('')
  }

  async function saveEdit(id: string) {
    if (!editValue.trim()) return
    setSavingEdit(true)
    try {
      await categoriesApi.update(id, editValue.trim())
      setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name: editValue.trim() } : c)))
      cancelEdit()
    } catch {
      setError('Could not rename this category.')
    } finally {
      setSavingEdit(false)
    }
  }

  function handleEditKeyDown(e: KeyboardEvent<HTMLInputElement>, id: string) {
    if (e.key === 'Enter') saveEdit(id)
    if (e.key === 'Escape') cancelEdit()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await categoriesApi.remove(deleteTarget.id)
      setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch {
      setError('Could not delete this category - it may already be used on some expenses.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <p className="text-slate-ink text-sm mb-6">
        Categories used across every client's expense entries. Add, rename, or remove them to fit how your clients describe their spending.
      </p>

      <motion.form
        onSubmit={handleAdd}
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row gap-3 mb-6"
      >
        <input
          value={name} onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Transport, Rent, Salaries…"
          className={`${inputClass} sm:max-w-xs`}
        />
        <Button type="submit" loading={saving} icon={<Plus className="w-4 h-4" />}>
          {!saving && 'Add category'}
        </Button>
      </motion.form>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-16 text-slate-ink"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : categories.length === 0 ? (
        <EmptyState icon={Tags} title="No categories yet" hint="Add your first expense category above." />
      ) : (
        <div className="bg-white rounded-2xl border border-navy-100 divide-y divide-navy-50">
          <AnimatePresence initial={false}>
            {categories.map((c) => (
              <motion.div
                key={c.id}
                layout
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-between px-5 py-3"
              >
                {editingId === c.id ? (
                  <>
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => handleEditKeyDown(e, c.id)}
                      className={`${inputClass} py-1.5 mr-3`}
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => saveEdit(c.id)}
                        disabled={savingEdit}
                        className="text-emerald-600 hover:text-emerald-700 p-1 disabled:opacity-50"
                        title="Save"
                      >
                        {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      </button>
                      <button onClick={cancelEdit} className="text-slate-ink hover:text-rose-600 p-1" title="Cancel">
                        <XIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-sm text-navy-950">{c.name}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <button onClick={() => startEdit(c)} className="text-slate-ink hover:text-navy-900 transition-colors p-1" title="Rename">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteTarget(c)} className="text-slate-ink hover:text-rose-600 transition-colors p-1" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this category?"
        message={`"${deleteTarget?.name}" will be removed. Existing expenses already using it are unaffected.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}
