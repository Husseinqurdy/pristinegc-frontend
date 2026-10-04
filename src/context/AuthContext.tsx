import { clearSession } from '../utils/session'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import api from '../api/client'

export type UserInfo = {
  id: string
  username: string
  full_name: string
  role: 'accountant' | 'client'
  must_change_password: boolean
  business_name?: string
  client_id?: string
}

type AuthContextType = {
  user: UserInfo | null
  login: (username: string, password: string) => Promise<UserInfo>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(() => {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  })

  // Signing out (or an expired session) in one tab signs out every open tab.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      // key === null means localStorage.clear() was called in another tab.
      if (e.key === null || (e.key === 'access_token' && !e.newValue)) setUser(null)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  async function login(username: string, password: string) {
    const { data } = await api.post('/auth/login/', { username, password })
    localStorage.setItem('access_token', data.access)
    localStorage.setItem('refresh_token', data.refresh)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user as UserInfo
  }

  const logout = useCallback(() => {
    clearSession()
    setUser(null)
  }, [])

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
