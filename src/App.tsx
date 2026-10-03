import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardShell from './components/DashboardShell'
import IdleGuard from './components/IdleGuard'

import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ChangePassword from './pages/ChangePassword'
import AccountantDashboard from './pages/AccountantDashboard'
import ClientDashboard from './pages/ClientDashboard'
import Clients from './pages/Clients'
import Categories from './pages/Categories'
import IncomePage from './pages/Income'
import ExpensesPage from './pages/Expenses'
import AssetsLiabilities from './pages/AssetsLiabilities'
import ServicePayments from './pages/ServicePayments'
import Reports from './pages/Reports'

function RootRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={user.role === 'accountant' ? '/accountant' : '/client'} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <IdleGuard />
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/change-password" element={<ChangePassword />} />

          <Route element={<ProtectedRoute role="accountant" />}>
            <Route element={<DashboardShell />}>
              <Route path="/accountant" element={<AccountantDashboard />} />
              <Route path="/accountant/clients" element={<Clients />} />
              <Route path="/accountant/categories" element={<Categories />} />
              <Route path="/accountant/income" element={<IncomePage />} />
              <Route path="/accountant/expenses" element={<ExpensesPage />} />
              <Route path="/accountant/assets-liabilities" element={<AssetsLiabilities />} />
              <Route path="/accountant/service-payments" element={<ServicePayments />} />
              <Route path="/accountant/reports" element={<Reports />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute role="client" />}>
            <Route element={<DashboardShell />}>
              <Route path="/client" element={<ClientDashboard />} />
              <Route path="/client/income" element={<IncomePage />} />
              <Route path="/client/expenses" element={<ExpensesPage />} />
              <Route path="/client/assets-liabilities" element={<AssetsLiabilities />} />
              <Route path="/client/service-payments" element={<ServicePayments />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
