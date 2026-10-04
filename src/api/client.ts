import axios from 'axios'
import { clearSession } from '../utils/session'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://gc.simunexus.com/api'

const api = axios.create({ baseURL: API_BASE_URL })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

function forceLogout() {
  // Only the session is cleared. Entries saved offline live in IndexedDB and
  // stay on the device until that same user signs in again and they sync.
  clearSession()
  window.location.href = '/login'
}

// One refresh at a time; every request that hit a 401 meanwhile waits for it.
let refreshPromise: Promise<void> | null = null

function refreshAccessToken(): Promise<void> {
  if (!refreshPromise) {
    const refresh = localStorage.getItem('refresh_token')
    refreshPromise = (refresh
      ? axios.post(`${API_BASE_URL}/auth/login/refresh/`, { refresh })
      : Promise.reject(new Error('no refresh token'))
    )
      .then(({ data }) => {
        localStorage.setItem('access_token', data.access)
        if (data.refresh) localStorage.setItem('refresh_token', data.refresh)
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const status = error.response?.status
    const isAuthEndpoint = original?.url?.includes('/auth/login')

    // The server says this user must set a new password before doing anything else.
    if (status === 403 && error.response?.data?.code === 'password_change_required') {
      try {
        const raw = localStorage.getItem('user')
        if (raw) localStorage.setItem('user', JSON.stringify({ ...JSON.parse(raw), must_change_password: true }))
      } catch { /* ignore a corrupt stored user */ }
      window.location.href = '/change-password'
      return Promise.reject(error)
    }

    if (status === 401 && original && !isAuthEndpoint) {
      // Already retried once and still 401 (e.g. session invalidated by a password
      // change): stop looping and send the user to sign in again.
      if (original._retry) {
        forceLogout()
        return Promise.reject(error)
      }
      original._retry = true
      try {
        await refreshAccessToken()
      } catch {
        // Refresh failed: every request waiting on it is rejected too (no hanging promises).
        forceLogout()
        return Promise.reject(error)
      }
      return api(original)
    }
    return Promise.reject(error)
  },
)

/** Best human-readable message from a DRF error response. */
export function apiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const data = (error as { response?: { data?: unknown } })?.response?.data
  if (typeof data === 'string') return data
  if (data && typeof data === 'object') {
    const first = Object.values(data as Record<string, unknown>)[0]
    if (Array.isArray(first) && first.length) return String(first[0])
    if (typeof first === 'string') return first
  }
  return fallback
}

export function apiErrorStatus(error: unknown): number | undefined {
  return (error as { response?: { status?: number } })?.response?.status
}

export default api
