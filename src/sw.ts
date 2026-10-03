/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare let self: ServiceWorkerGlobalScope

// Standard Vite PWA precache injection point.
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Single-page app: any page navigation (e.g. reloading /client/expenses while
// offline, or opening the installed app on a deep link) gets the cached app
// shell, and React Router takes it from there. API calls are not navigations,
// so they are never answered from here.
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')))

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Real OS/browser push notification - this is what lets a notification show
// up even when the app/tab is closed, similar to WhatsApp.
self.addEventListener('push', (event) => {
  let data: { title?: string; body?: string; url?: string } = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Pristine Books', body: event.data ? event.data.text() : '' }
  }

  const title = data.title || 'Pristine Books'
  const options: NotificationOptions = {
    body: data.body || '',
    icon: '/logo-icon.png',
    badge: '/logo-icon.png',
    data: { url: data.url || '/' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// Clicking the notification focuses an existing tab or opens a new one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data && event.notification.data.url) || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      return self.clients.openWindow(targetUrl)
    }),
  )
})
