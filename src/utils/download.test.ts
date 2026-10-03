import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { openBlobInNewTab } from './download'

describe('openBlobInNewTab (receipt viewer)', () => {
  const fakeWin = { location: { href: '' }, close: vi.fn() }
  let blobs: Blob[]

  beforeEach(() => {
    blobs = []
    fakeWin.location.href = ''
    fakeWin.close.mockClear()
    vi.spyOn(window, 'open').mockReturnValue(fakeWin as unknown as Window)
    window.URL.createObjectURL = vi.fn((b: Blob | MediaSource) => { blobs.push(b as Blob); return 'blob:test' })
    window.URL.revokeObjectURL = vi.fn()
  })
  afterEach(() => vi.restoreAllMocks())

  it('keeps the real content type so a PDF renders as a PDF, not as raw text', async () => {
    await openBlobInNewTab(async () => ({ data: new Uint8Array([37, 80, 68, 70]), headers: { 'content-type': 'application/pdf' } }))
    expect(blobs[0].type).toBe('application/pdf')
    expect(fakeWin.location.href).toBe('blob:test')
  })

  it('strips parameters such as charset from the content type', async () => {
    await openBlobInNewTab(async () => ({ data: new Uint8Array([1]), headers: { 'content-type': 'image/jpeg; charset=binary' } }))
    expect(blobs[0].type).toBe('image/jpeg')
  })

  it('closes the blank tab if the download fails', async () => {
    await expect(openBlobInNewTab(async () => { throw new Error('boom') })).rejects.toThrow('boom')
    expect(fakeWin.close).toHaveBeenCalled()
  })
})
