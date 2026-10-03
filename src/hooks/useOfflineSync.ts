import { useCallback, useEffect, useState } from 'react'
import {
  discardFailedItems, listQueue, markFailed, removeFromQueue, retryFailedItems, type QueueItem,
} from '../utils/offlineQueue'
import { incomeApi, expensesApi } from '../api/finance'
import { apiErrorMessage, apiErrorStatus } from '../api/client'

// Simple module-level pub/sub so every component using this hook stays in sync
// (e.g. the topbar badge and the page that just enqueued an entry).
let listeners: Array<() => void> = []
function notifyAll() {
  listeners.forEach((l) => l())
}

// Only one flush at a time, no matter how many components use the hook -
// otherwise the same entry could be sent twice.
let flushing = false

// HTTP statuses that mean "the server looked at this entry and said no", as
// opposed to "try again later". 401 is excluded: the session may just need a refresh.
function isRejection(status?: number) {
  return status !== undefined && status >= 400 && status < 500 && ![401, 408, 429].includes(status)
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingCount, setPendingCount] = useState(0)
  const [failedItems, setFailedItems] = useState<QueueItem[]>([])
  const [syncing, setSyncing] = useState(false)

  const refreshCount = useCallback(async () => {
    const q = await listQueue()
    setPendingCount(q.filter((i) => !i.failed).length)
    setFailedItems(q.filter((i) => i.failed))
  }, [])

  const flush = useCallback(async () => {
    if (!navigator.onLine || flushing) return
    flushing = true
    setSyncing(true)
    try {
      const queue = (await listQueue()).filter((i) => !i.failed)
      for (const item of queue) {
        try {
          if (item.kind === 'income') await incomeApi.create(item.payload)
          else if (item.kind === 'expense') await expensesApi.create(item.payload as never)
          await removeFromQueue(item.id)
        } catch (error) {
          if (isRejection(apiErrorStatus(error))) {
            // The server refused this entry. Park it as "failed" so it can't block
            // the others, and let the user retry or discard it.
            await markFailed(item, apiErrorMessage(error, 'The server rejected this entry.'))
            continue
          }
          // Network trouble / server error / expired session: stop and retry later.
          break
        }
      }
    } finally {
      flushing = false
      setSyncing(false)
      await refreshCount()
      notifyAll()
    }
  }, [refreshCount])

  const retryFailed = useCallback(async () => {
    await retryFailedItems()
    await refreshCount()
    notifyAll()
    flush()
  }, [flush, refreshCount])

  const discardFailed = useCallback(async () => {
    await discardFailedItems()
    await refreshCount()
    notifyAll()
  }, [refreshCount])

  useEffect(() => {
    refreshCount()
    listeners.push(refreshCount)

    function handleOnline() {
      setIsOnline(true)
      flush()
    }
    function handleOffline() {
      setIsOnline(false)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    if (navigator.onLine) flush()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      listeners = listeners.filter((l) => l !== refreshCount)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { isOnline, pendingCount, failedItems, syncing, flush, refreshCount, retryFailed, discardFailed }
}
