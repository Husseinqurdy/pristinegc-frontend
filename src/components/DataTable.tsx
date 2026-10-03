import { useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export type Column<T> = {
  header: string
  cell: (row: T) => ReactNode
  align?: 'left' | 'right'
  /** Hide this column on the mobile card view (e.g. redundant with the card title) */
  hideOnMobile?: boolean
  /** Render as the card's title on mobile instead of a labeled row */
  isMobileTitle?: boolean
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035 } },
}
const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

const PAGE_SIZE = 25

export default function DataTable<T extends { id: string }>({
  columns, data, actions, selectable, selectedIds, onToggleSelect, onToggleSelectAll, isSelectable,
}: {
  columns: Column<T>[]
  data: T[]
  /** Optional per-row action rendered top-right of the mobile card / last table column */
  actions?: (row: T) => ReactNode
  /** Enable a leading checkbox column for bulk actions */
  selectable?: boolean
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  onToggleSelectAll?: (checked: boolean) => void
  /** Optionally disable the checkbox for specific rows (e.g. already-approved entries) */
  isSelectable?: (row: T) => boolean
}) {
  const [requestedPage, setPage] = useState(0)
  const pageCount = Math.max(1, Math.ceil(data.length / PAGE_SIZE))
  // Stay on a valid page when rows disappear (delete, filter change).
  const page = Math.min(requestedPage, pageCount - 1)

  const allRows = data
  const pageRows = allRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const titleCol = columns.find((c) => c.isMobileTitle) ?? columns[0]
  const bodyCols = columns.filter((c) => c !== titleCol && !c.hideOnMobile)
  // "Select all" applies to every selectable row in the list, not just the visible page.
  const selectableRows = isSelectable ? allRows.filter(isSelectable) : allRows
  const allSelected = selectable && selectableRows.length > 0 && selectableRows.every((r) => selectedIds?.has(r.id))

  return (
    <>
      {/* Desktop / tablet: real table */}
      <div className="hidden sm:block bg-white rounded-2xl border border-navy-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-navy-50 text-navy-900 text-left">
              {selectable && (
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => onToggleSelectAll?.(e.target.checked)}
                    className="rounded border-navy-200 accent-navy-900"
                  />
                </th>
              )}
              {columns.map((c, i) => (
                <th key={i} className={`px-5 py-3 font-medium ${c.align === 'right' ? 'text-right' : ''}`}>{c.header}</th>
              ))}
              {actions && <th className="px-5 py-3 font-medium" />}
            </tr>
          </thead>
          <motion.tbody variants={container} initial="hidden" animate="show">
            {pageRows.map((row) => {
              const rowSelectable = !isSelectable || isSelectable(row)
              return (
                <motion.tr key={row.id} variants={item} className="border-t border-navy-50 hover:bg-navy-50/40 transition-colors">
                  {selectable && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        disabled={!rowSelectable}
                        checked={selectedIds?.has(row.id) || false}
                        onChange={() => onToggleSelect?.(row.id)}
                        className="rounded border-navy-200 accent-navy-900 disabled:opacity-30"
                      />
                    </td>
                  )}
                  {columns.map((c, i) => (
                    <td key={i} className={`px-5 py-3 ${c.align === 'right' ? 'text-right' : ''}`}>{c.cell(row)}</td>
                  ))}
                  {actions && <td className="px-5 py-3">{actions(row)}</td>}
                </motion.tr>
              )
            })}
          </motion.tbody>
        </table>
      </div>

      {/* Mobile: stacked cards */}
      <motion.div variants={container} initial="hidden" animate="show" className="sm:hidden space-y-3">
        {pageRows.map((row) => {
          const rowSelectable = !isSelectable || isSelectable(row)
          return (
            <motion.div key={row.id} variants={item} className="bg-white rounded-xl border border-navy-100 p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-start gap-2 min-w-0">
                  {selectable && (
                    <input
                      type="checkbox"
                      disabled={!rowSelectable}
                      checked={selectedIds?.has(row.id) || false}
                      onChange={() => onToggleSelect?.(row.id)}
                      className="rounded border-navy-200 accent-navy-900 mt-0.5 shrink-0 disabled:opacity-30"
                    />
                  )}
                  <div className="font-medium text-navy-950 text-sm leading-snug">{titleCol.cell(row)}</div>
                </div>
                {actions && <div className="shrink-0">{actions(row)}</div>}
              </div>
              <div className="space-y-1.5">
                {bodyCols.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-slate-ink text-xs">{c.header}</span>
                    <span className="text-navy-950">{c.cell(row)}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )
        })}
      </motion.div>

      {allRows.length > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-4 text-sm text-slate-ink">
          <span>
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, allRows.length)} of {allRows.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg border border-navy-100 bg-white text-navy-900 disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="tabular-nums">{page + 1} / {pageCount}</span>
            <button
              onClick={() => setPage(Math.min(pageCount - 1, page + 1))}
              disabled={page >= pageCount - 1}
              className="p-1.5 rounded-lg border border-navy-100 bg-white text-navy-900 disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
