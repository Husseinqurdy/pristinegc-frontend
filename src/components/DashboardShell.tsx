import { Outlet, useLocation } from 'react-router-dom'
import DashboardLayout from './DashboardLayout'

const TITLES: Record<string, string> = {
  '/accountant': 'Dashboard',
  '/accountant/clients': 'Clients',
  '/accountant/income': 'Income',
  '/accountant/expenses': 'Expenses',
  '/accountant/categories': 'Expense Categories',
  '/accountant/assets-liabilities': 'Assets & Liabilities',
  '/accountant/service-payments': 'Service Fees',
  '/accountant/reports': 'Reports',
  '/client': 'Dashboard',
  '/client/income': 'Income',
  '/client/expenses': 'Expenses',
  '/client/assets-liabilities': 'Assets & Liabilities',
  '/client/service-payments': 'Service Fees',
}

export default function DashboardShell() {
  const location = useLocation()
  const title = TITLES[location.pathname] || 'Pristine Books'

  return (
    <DashboardLayout title={title}>
      <Outlet />
    </DashboardLayout>
  )
}
