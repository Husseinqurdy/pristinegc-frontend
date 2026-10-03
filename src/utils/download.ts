export function downloadBlob(data: BlobPart, filename: string) {
  const url = window.URL.createObjectURL(new Blob([data]))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

/**
 * Show a file (receipt image / PDF) in a new tab.
 *
 * The Blob MUST carry the real content type, otherwise the browser has no idea
 * it is a PDF or an image and just prints the raw bytes as text.
 * The tab is opened synchronously on click and filled in once the download
 * finishes, so popup blockers don't swallow it.
 */
export async function openBlobInNewTab(fetchFile: () => Promise<{ data: BlobPart; headers: Record<string, unknown> }>) {
  const win = window.open('', '_blank')
  try {
    const res = await fetchFile()
    const type = String(res.headers['content-type'] || 'application/octet-stream').split(';')[0]
    const url = window.URL.createObjectURL(new Blob([res.data], { type }))
    if (win) win.location.href = url
    else window.location.href = url
    // Keep the URL alive long enough for the new tab to load it, then free it.
    setTimeout(() => window.URL.revokeObjectURL(url), 5 * 60 * 1000)
  } catch (error) {
    win?.close()
    throw error
  }
}
