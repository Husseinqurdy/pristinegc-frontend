import api from './client'

export const authApi = {
  verifyUsername: (username: string) =>
    api.post<{ valid: boolean; full_name: string }>('/auth/verify-username/', { username }).then((r) => r.data),
  resetPassword: (username: string, new_password: string) =>
    api.post('/auth/reset-password/', { username, new_password }).then((r) => r.data),
}
