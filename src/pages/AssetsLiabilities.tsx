import { useEffect, useState, type FormEvent } from 'react'
import { Plus, Pencil, Trash2, Loader2, Landmark } from 'lucide-react'
import DataTable, { type Column } from '../components/DataTable'
import Drawer from '../components/Drawer'
import EmptyState from '../components/EmptyState'
import Button from '../components/Button'
import ConfirmDialog from '../components/ConfirmDialog'
import { inputClass, labelClass } from '../styles/form'
import { assetsApi, liabilitiesApi, clientsApi, formatTZS, type Asset, type Liability, type Client } from '../api/finance'
import { useAuth } from '../context/AuthContext'

const ASSET_TYPES = [
  ['cash', 'Cash'], ['recoverables', 'Recoverables'], ['inventory', 'Inventory'],
  ['ppe', 'Property, plant & equipment'], ['software', 'Software'], ['logo', 'Logo / intangible'], ['other', 'Other'],
] as const
const LIABILITY_TYPES = [
  ['tax', 'Tax liability'], ['directors_loan', "Directors' loan"], ['overdraft', 'Overdraft'],
  ['bank_loan', 'Bank loan'], ['other', 'Other'],
] as const

const emptyAssetForm = { client: '', asset_type: 'cash', description: '', value: '', date_recorded: new Date().toISOString().slice(0, 10) }
const emptyLiabForm = { client: '', liability_type: 'bank_loan', description: '', amount: '', balance_remaining: '', date_recorded: new Date().toISOString().slice(0, 10) }

export default function AssetsLiabilities() {
  const { user } = useAuth()
  const isAccountant = user?.role === 'accountant'
  const [tab, setTab] = useState<'assets' | 'liabilities'>('assets')
  const [assets, setAssets] = useState<Asset[]>([])
  const [liabilities, setLiabilities] = useState<Liability[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [filterClient, setFilterClient] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [editingLiab, setEditingLiab] = useState<Liability | null>(null)
  const [deleteAsset, setDeleteAsset] = useState<Asset | null>(null)
  const [deleteLiab, setDeleteLiab] = useState<Liability | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [assetForm, setAssetForm] = useState(emptyAssetForm)
  const [liabForm, setLiabForm] = useState(emptyLiabForm)

  async function load() {
    setLoading(true)
    const [a, l] = await Promise.all([assetsApi.list(filterClient || undefined), liabilitiesApi.list(filterClient || undefined)])
    setAssets(a); setLiabilities(l)
    setLoading(false)
  }

  useEffect(() => { load(); if (isAccountant) clientsApi.list().then(setClients) }, [filterClient])

  function openCreate() {
    setEditingAsset(null); setEditingLiab(null)
    setAssetForm(emptyAssetForm); setLiabForm(emptyLiabForm)
    setShowForm(true)
  }

  function openEditAsset(a: Asset) {
    setEditingAsset(a)
    setAssetForm({ client: a.client, asset_type: a.asset_type, description: a.description, value: a.value, date_recorded: a.date_recorded })
    setShowForm(true)
  }

  function openEditLiab(l: Liability) {
    setEditingLiab(l)
    setLiabForm({ client: l.client, liability_type: l.liability_type, description: l.description, amount: l.amount, balance_remaining: l.balance_remaining, date_recorded: l.date_recorded })
    setShowForm(true)
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (tab === 'assets') {
        const payload = isAccountant ? assetForm : { ...assetForm, client: undefined }
        if (editingAsset) await assetsApi.update(editingAsset.id, payload)
        else await assetsApi.create(payload)
      } else {
        const payload = isAccountant ? liabForm : { ...liabForm, client: undefined }
        if (editingLiab) await liabilitiesApi.update(editingLiab.id, payload)
        else await liabilitiesApi.create(payload)
      }
      setShowForm(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      if (deleteAsset) {
        await assetsApi.remove(deleteAsset.id)
        setAssets((prev) => prev.filter((a) => a.id !== deleteAsset.id))
        setDeleteAsset(null)
      } else if (deleteLiab) {
        await liabilitiesApi.remove(deleteLiab.id)
        setLiabilities((prev) => prev.filter((l) => l.id !== deleteLiab.id))
        setDeleteLiab(null)
      }
    } finally {
      setDeleting(false)
    }
  }

  const assetColumns: Column<Asset>[] = [
    { header: 'Description', isMobileTitle: true, cell: (a) => <span className="font-medium">{a.description}</span> },
    { header: 'Type', cell: (a) => ASSET_TYPES.find((t) => t[0] === a.asset_type)?.[1] },
    { header: 'Date', cell: (a) => a.date_recorded },
    { header: 'Value', align: 'right', cell: (a) => <span className="font-medium text-navy-950">{formatTZS(a.value)}</span> },
  ]

  const liabColumns: Column<Liability>[] = [
    { header: 'Description', isMobileTitle: true, cell: (l) => <span className="font-medium">{l.description}</span> },
    { header: 'Type', cell: (l) => LIABILITY_TYPES.find((t) => t[0] === l.liability_type)?.[1] },
    { header: 'Date', cell: (l) => l.date_recorded },
    { header: 'Original', align: 'right', cell: (l) => formatTZS(l.amount) },
    { header: 'Balance', align: 'right', cell: (l) => <span className="font-medium text-rose-700">{formatTZS(l.balance_remaining)}</span> },
  ]

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2 bg-white border border-navy-100 rounded-lg p-1">
          <button onClick={() => setTab('assets')} className={`px-4 py-1.5 rounded-md text-sm transition-colors ${tab === 'assets' ? 'bg-navy-900 text-white' : 'text-navy-900'}`}>Assets</button>
          <button onClick={() => setTab('liabilities')} className={`px-4 py-1.5 rounded-md text-sm transition-colors ${tab === 'liabilities' ? 'bg-navy-900 text-white' : 'text-navy-900'}`}>Liabilities</button>
        </div>
        <div className="flex items-center gap-3 ml-auto">
          {isAccountant && (
            <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)} className={`${inputClass} w-auto bg-white hidden sm:block`}>
              <option value="">All clients</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.business_name}</option>)}
            </select>
          )}
          <Button onClick={openCreate} icon={<Plus className="w-4 h-4" />}>Add</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-slate-ink"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : tab === 'assets' ? (
        assets.length === 0 ? <EmptyState icon={Landmark} title="No assets recorded yet" /> : (
          <DataTable columns={assetColumns} data={assets} actions={(a) => (
            <div className="flex items-center gap-3">
              <button onClick={() => openEditAsset(a)} className="text-slate-ink hover:text-navy-900" title="Edit"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => setDeleteAsset(a)} className="text-slate-ink hover:text-rose-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
            </div>
          )} />
        )
      ) : liabilities.length === 0 ? (
        <EmptyState icon={Landmark} title="No liabilities recorded yet" />
      ) : (
        <DataTable columns={liabColumns} data={liabilities} actions={(l) => (
          <div className="flex items-center gap-3">
            <button onClick={() => openEditLiab(l)} className="text-slate-ink hover:text-navy-900" title="Edit"><Pencil className="w-4 h-4" /></button>
            <button onClick={() => setDeleteLiab(l)} className="text-slate-ink hover:text-rose-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
          </div>
        )} />
      )}

      <Drawer open={showForm} onClose={() => setShowForm(false)} title={tab === 'assets' ? (editingAsset ? 'Edit asset' : 'Add asset') : (editingLiab ? 'Edit liability' : 'Add liability')}>
        {tab === 'assets' ? (
          <form onSubmit={handleCreate} className="space-y-4">
            {isAccountant && (
              <div><label className={labelClass}>Client *</label>
                <select value={assetForm.client} onChange={(e) => setAssetForm({ ...assetForm, client: e.target.value })} className={inputClass}>
                  <option value="">-- Select client --</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.business_name}</option>)}
                </select></div>
            )}
            <div><label className={labelClass}>Asset type</label>
              <select value={assetForm.asset_type} onChange={(e) => setAssetForm({ ...assetForm, asset_type: e.target.value })} className={inputClass}>
                {ASSET_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select></div>
            <div><label className={labelClass}>Description *</label>
              <input value={assetForm.description} onChange={(e) => setAssetForm({ ...assetForm, description: e.target.value })} className={inputClass} /></div>
            <div><label className={labelClass}>Value (TZS) *</label>
              <input type="number" value={assetForm.value} onChange={(e) => setAssetForm({ ...assetForm, value: e.target.value })} className={inputClass} /></div>
            <div><label className={labelClass}>Date</label>
              <input type="date" value={assetForm.date_recorded} onChange={(e) => setAssetForm({ ...assetForm, date_recorded: e.target.value })} className={inputClass} /></div>
            <Button type="submit" loading={saving} className="w-full">{!saving && (editingAsset ? 'Save changes' : 'Save')}</Button>
          </form>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            {isAccountant && (
              <div><label className={labelClass}>Client *</label>
                <select value={liabForm.client} onChange={(e) => setLiabForm({ ...liabForm, client: e.target.value })} className={inputClass}>
                  <option value="">-- Select client --</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.business_name}</option>)}
                </select></div>
            )}
            <div><label className={labelClass}>Liability type</label>
              <select value={liabForm.liability_type} onChange={(e) => setLiabForm({ ...liabForm, liability_type: e.target.value })} className={inputClass}>
                {LIABILITY_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select></div>
            <div><label className={labelClass}>Description *</label>
              <input value={liabForm.description} onChange={(e) => setLiabForm({ ...liabForm, description: e.target.value })} className={inputClass} /></div>
            <div><label className={labelClass}>Original amount (TZS) *</label>
              <input type="number" value={liabForm.amount} onChange={(e) => setLiabForm({ ...liabForm, amount: e.target.value })} className={inputClass} /></div>
            <div><label className={labelClass}>Balance remaining (TZS) *</label>
              <input type="number" value={liabForm.balance_remaining} onChange={(e) => setLiabForm({ ...liabForm, balance_remaining: e.target.value })} className={inputClass} /></div>
            <div><label className={labelClass}>Date</label>
              <input type="date" value={liabForm.date_recorded} onChange={(e) => setLiabForm({ ...liabForm, date_recorded: e.target.value })} className={inputClass} /></div>
            <Button type="submit" loading={saving} className="w-full">{!saving && (editingLiab ? 'Save changes' : 'Save')}</Button>
          </form>
        )}
      </Drawer>

      <ConfirmDialog
        open={!!deleteAsset || !!deleteLiab}
        title={deleteAsset ? 'Delete this asset?' : 'Delete this liability?'}
        message="This can't be undone."
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => { setDeleteAsset(null); setDeleteLiab(null) }}
      />
    </>
  )
}
