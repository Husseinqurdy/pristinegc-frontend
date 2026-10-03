import { get, set, del, keys } from 'idb-keyval'

export type QueueKind = 'income' | 'expense'

export type QueueItem = {
  id: string
  kind: QueueKind
  payload: Record<string, unknown>
  createdAt: number
  /** Who saved it. Entries are only ever sent by the same user. */
  userId?: string
  /** Set when the server rejected the entry (e.g. validation error). */
  failed?: { message: string; at: number }
}

const PREFIX = 'offline-queue:'

export function currentUserId(): string | undefined {
  try {
    const raw = localStorage.getItem('user')
    return raw ? (JSON.parse(raw).id as string) : undefined
  } catch {
    return undefined
  }
}

export async function enqueue(kind: QueueKind, payload: Record<string, unknown>): Promise<QueueItem> {
  const id = crypto.randomUUID()
  const item: QueueItem = { id, kind, payload, createdAt: Date.now(), userId: currentUserId() }
  await set(PREFIX + id, item)
  return item
}

/** Items belonging to the signed-in user (items without an owner are legacy and count as theirs). */
export async function listQueue(): Promise<QueueItem[]> {
  const uid = currentUserId()
  const allKeys = await keys()
  const queueKeys = allKeys.filter((k): k is string => typeof k === 'string' && k.startsWith(PREFIX))
  const items = await Promise.all(queueKeys.map((k) => get<QueueItem>(k)))
  return items
    .filter((i): i is QueueItem => Boolean(i))
    .filter((i) => !i.userId || i.userId === uid)
    .sort((a, b) => a.createdAt - b.createdAt)
}

export async function removeFromQueue(id: string) {
  await del(PREFIX + id)
}

export async function markFailed(item: QueueItem, message: string) {
  await set(PREFIX + item.id, { ...item, failed: { message, at: Date.now() } })
}

/** Put every failed item back in line for another attempt. */
export async function retryFailedItems() {
  for (const item of await listQueue()) {
    if (item.failed) await set(PREFIX + item.id, { ...item, failed: undefined })
  }
}

export async function discardFailedItems() {
  for (const item of await listQueue()) {
    if (item.failed) await del(PREFIX + item.id)
  }
}
