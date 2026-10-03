import { pushApi } from '../api/push'

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export async function getCurrentSubscription() {
  if (!isPushSupported()) return null
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

export async function enablePushNotifications() {
  if (!isPushSupported()) throw new Error('Push notifications are not supported on this browser.')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notification permission was not granted.')

  const registration = await navigator.serviceWorker.ready
  const publicKey = await pushApi.getPublicKey()

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  })

  await pushApi.subscribe(subscription.toJSON() as PushSubscriptionJSON)
  return subscription
}

export async function disablePushNotifications() {
  const subscription = await getCurrentSubscription()
  if (!subscription) return
  await pushApi.unsubscribe(subscription.endpoint)
  await subscription.unsubscribe()
}
