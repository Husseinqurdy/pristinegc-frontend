import api from './client'

export type AppNotification = {
  id: string
  message: string
  link: string
  is_read: boolean
  created_at: string
}

export const notificationsApi = {
  list: () => api.get<AppNotification[]>('/auth/notifications/').then((r) => r.data),
  markRead: (id: string) => api.post(`/auth/notifications/${id}/mark_read/`).then((r) => r.data),
  markAllRead: () => api.post('/auth/notifications/mark_all_read/').then((r) => r.data),
}
