import api from './client'

export type ExpenseCategory = { id: string; name: string }

export type Client = {
  id: string
  business_name: string
  company_name: string
  business_type: string
  is_active: boolean
  created_at: string
  full_name: string
}

export type Income = {
  id: string
  client: string
  client_name: string
  date: string
  description: string
  amount: string
  paid_through: 'cash' | 'bank'
  status: 'pending' | 'approved' | 'flagged'
  review_note: string
}

export type Expense = {
  id: string
  client: string
  client_name: string
  category: string
  category_name: string
  date: string
  details: string
  amount: string
  remarks: string
  receipt: string | null
  status: 'pending' | 'approved' | 'flagged'
  review_note: string
}

export type Asset = {
  id: string
  client: string
  asset_type: string
  description: string
  value: string
  date_recorded: string
}

export type Liability = {
  id: string
  client: string
  liability_type: string
  description: string
  amount: string
  balance_remaining: string
  date_recorded: string
}

export type ServicePayment = {
  id: string
  client: string
  client_name: string
  total_amount_due: string
  amount_paid: string
  balance: string
  date: string
  status: 'unpaid' | 'partial' | 'paid'
  notes: string
}

export type ReportSummary = {
  total_income: number
  total_expense: number
  net_profit: number
  expense_by_category: { category__name: string; total: number }[]
}

export type ReportPeriod = { date_from?: string; date_to?: string }

export type BalanceSheetEntry = { description: string; date: string; amount: number; original?: number }
export type BalanceSheetItem = { type: string; label: string; total: number; entries: BalanceSheetEntry[] }
export type BalanceSheet = {
  as_of: string
  assets: { groups: { label: string; subtotal: number; items: BalanceSheetItem[] }[]; total: number }
  liabilities: { items: BalanceSheetItem[]; total: number }
  equity: number
}

export type ClientCredentials = { username: string; generated_password: string }

export const clientsApi = {
  list: () => api.get<Client[]>('/auth/clients/').then((r) => r.data),
  create: (payload: Partial<Client> & { username: string; email?: string; phone?: string }) =>
    api.post('/auth/clients/', payload).then((r) => r.data),
  update: (id: string, payload: Partial<Client>) => api.patch(`/auth/clients/${id}/`, payload).then((r) => r.data),
  remove: (id: string) => api.delete(`/auth/clients/${id}/`),
  setActive: (id: string, is_active: boolean) => api.patch(`/auth/clients/${id}/`, { is_active }).then((r) => r.data),
  resetPassword: (id: string) =>
    api.post<ClientCredentials>(`/auth/clients/${id}/reset-password/`).then((r) => r.data),
}

export const categoriesApi = {
  list: () => api.get<ExpenseCategory[]>('/finance/categories/').then((r) => r.data),
  create: (name: string) => api.post('/finance/categories/', { name }).then((r) => r.data),
  update: (id: string, name: string) => api.patch(`/finance/categories/${id}/`, { name }).then((r) => r.data),
  remove: (id: string) => api.delete(`/finance/categories/${id}/`),
}

export const incomeApi = {
  list: (client?: string) => api.get<Income[]>('/finance/income/', { params: { client } }).then((r) => r.data),
  create: (payload: Partial<Income>) => api.post('/finance/income/', payload).then((r) => r.data),
  update: (id: string, payload: Partial<Income>) => api.patch(`/finance/income/${id}/`, payload).then((r) => r.data),
  remove: (id: string) => api.delete(`/finance/income/${id}/`),
  approve: (id: string) => api.post(`/finance/income/${id}/approve/`).then((r) => r.data),
  flag: (id: string, note: string) => api.post(`/finance/income/${id}/flag/`, { note }).then((r) => r.data),
  bulkApprove: (ids: string[]) => api.post('/finance/income/bulk_approve/', { ids }).then((r) => r.data),
  bulkFlag: (ids: string[], note: string) => api.post('/finance/income/bulk_flag/', { ids, note }).then((r) => r.data),
}

function toExpenseFormData(payload: Partial<Expense> & { receiptFile?: File | null }) {
  const fd = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    if (key === 'receiptFile' || value === undefined || value === null) return
    fd.append(key, value as string)
  })
  if (payload.receiptFile) fd.append('receipt', payload.receiptFile)
  return fd
}

export const expensesApi = {
  list: (client?: string) => api.get<Expense[]>('/finance/expenses/', { params: { client } }).then((r) => r.data),
  create: (payload: Partial<Expense> & { receiptFile?: File | null }) =>
    api.post('/finance/expenses/', toExpenseFormData(payload)).then((r) => r.data),
  update: (id: string, payload: Partial<Expense> & { receiptFile?: File | null }) =>
    api.patch(`/finance/expenses/${id}/`, toExpenseFormData(payload)).then((r) => r.data),
  remove: (id: string) => api.delete(`/finance/expenses/${id}/`),
  approve: (id: string) => api.post(`/finance/expenses/${id}/approve/`).then((r) => r.data),
  flag: (id: string, note: string) => api.post(`/finance/expenses/${id}/flag/`, { note }).then((r) => r.data),
  bulkApprove: (ids: string[]) => api.post('/finance/expenses/bulk_approve/', { ids }).then((r) => r.data),
  bulkFlag: (ids: string[], note: string) => api.post('/finance/expenses/bulk_flag/', { ids, note }).then((r) => r.data),
  downloadReceipt: (id: string) => api.get(`/finance/expenses/${id}/receipt/`, { responseType: 'blob' }),
}

export const assetsApi = {
  list: (client?: string) => api.get<Asset[]>('/finance/assets/', { params: { client } }).then((r) => r.data),
  create: (payload: Partial<Asset>) => api.post('/finance/assets/', payload).then((r) => r.data),
  update: (id: string, payload: Partial<Asset>) => api.patch(`/finance/assets/${id}/`, payload).then((r) => r.data),
  remove: (id: string) => api.delete(`/finance/assets/${id}/`),
}

export const liabilitiesApi = {
  list: (client?: string) => api.get<Liability[]>('/finance/liabilities/', { params: { client } }).then((r) => r.data),
  create: (payload: Partial<Liability>) => api.post('/finance/liabilities/', payload).then((r) => r.data),
  update: (id: string, payload: Partial<Liability>) => api.patch(`/finance/liabilities/${id}/`, payload).then((r) => r.data),
  remove: (id: string) => api.delete(`/finance/liabilities/${id}/`),
}

export const servicePaymentsApi = {
  list: () => api.get<ServicePayment[]>('/finance/service-payments/').then((r) => r.data),
  create: (payload: Partial<ServicePayment>) => api.post('/finance/service-payments/', payload).then((r) => r.data),
  update: (id: string, payload: Partial<ServicePayment>) => api.patch(`/finance/service-payments/${id}/`, payload).then((r) => r.data),
  remove: (id: string) => api.delete(`/finance/service-payments/${id}/`),
  downloadPdf: (id: string) => api.get(`/finance/service-payments/${id}/pdf/`, { responseType: 'blob' }),
}

export const reportsApi = {
  summary: (client?: string, period: ReportPeriod = {}) =>
    api.get<ReportSummary>('/finance/reports/summary/', { params: { client, ...period } }).then((r) => r.data),
  exportExcel: (client?: string, period: ReportPeriod = {}) =>
    api.get('/finance/reports/export/', {
      params: { client, ...period, as_of: period.date_to },
      responseType: 'blob',
    }),
  exportPdf: (client?: string, period: ReportPeriod = {}) =>
    api.get('/finance/reports/export-pdf/', { params: { client, ...period }, responseType: 'blob' }),
  balanceSheet: (client?: string, asOf?: string) =>
    api.get<BalanceSheet>('/finance/reports/balance-sheet/', { params: { client, as_of: asOf } }).then((r) => r.data),
  balanceSheetPdf: (client?: string, asOf?: string) =>
    api.get('/finance/reports/balance-sheet/export-pdf/', { params: { client, as_of: asOf }, responseType: 'blob' }),
}

export function formatTZS(value: string | number) {
  const n = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('en-TZ', { maximumFractionDigits: 0 }).format(n) + ' TZS'
}
