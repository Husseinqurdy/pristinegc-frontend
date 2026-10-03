import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ role }: { role?: 'accountant' | 'client' }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.must_change_password) return <Navigate to="/change-password" replace />
  if (role && user.role !== role) return <Navigate to={user.role === 'accountant' ? '/accountant' : '/client'} replace />
  return <Outlet />
}
