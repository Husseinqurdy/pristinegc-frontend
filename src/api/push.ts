import api from './client'

export const pushApi = {
  getPublicKey: () => api.get<{ publicKey: string }>('/auth/push/public-key/').then((r) => r.data.publicKey),
  subscribe: (subscription: PushSubscriptionJSON) => api.post('/auth/push/subscribe/', subscription),
  unsubscribe: (endpoint: string) => api.post('/auth/push/unsubscribe/', { endpoint }),
}
