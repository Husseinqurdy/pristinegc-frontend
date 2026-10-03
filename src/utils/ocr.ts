import Tesseract from 'tesseract.js'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href

export type ReceiptExtraction = {
  amount?: string
  date?: string
  rawText: string
}

const TOTAL_KEYWORDS = ['total', 'jumla', 'grand total', 'amount due', 'amount paid']

function parseAmount(text: string): string | undefined {
  const lines = text.split('\n')

  // Prefer a number on a line that mentions "total" / "jumla"
  for (const line of lines) {
    const lower = line.toLowerCase()
    if (TOTAL_KEYWORDS.some((kw) => lower.includes(kw))) {
      const match = line.match(/[\d,]+\.?\d{0,2}/g)
      if (match) {
        const nums = match.map((m) => parseFloat(m.replace(/,/g, ''))).filter((n) => n > 0)
        if (nums.length) return String(Math.max(...nums))
      }
    }
  }

  // Fallback: the largest plausible money-looking number in the whole receipt
  const allMatches = text.match(/[\d,]{3,}\.?\d{0,2}/g)
  if (allMatches) {
    const nums = allMatches
      .map((m) => parseFloat(m.replace(/,/g, '')))
      .filter((n) => n > 100 && n < 100000000)
    if (nums.length) return String(Math.max(...nums))
  }
  return undefined
}

function parseDate(text: string): string | undefined {
  // dd/mm/yyyy or dd-mm-yyyy
  const dmy = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/)
  if (dmy) {
    let [, d, m, y] = dmy
    if (y.length === 2) y = `20${y}`
    const day = d.padStart(2, '0')
    const month = m.padStart(2, '0')
    if (Number(month) <= 12 && Number(day) <= 31) return `${y}-${month}-${day}`
  }
  // yyyy-mm-dd
  const ymd = text.match(/\b(20\d{2})[/-](\d{1,2})[/-](\d{1,2})\b/)
  if (ymd) {
    const [, y, m, d] = ymd
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return undefined
}

async function pdfFirstPageToImage(file: File): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const page = await pdf.getPage(1)
  const viewport = page.getViewport({ scale: 2 })

  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas not supported')

  await page.render({ canvasContext: context, viewport, canvas }).promise

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not render PDF page'))), 'image/png')
  })
}

export async function extractReceiptData(
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<ReceiptExtraction> {
  const source: File | Blob = file.type === 'application/pdf' ? await pdfFirstPageToImage(file) : file

  const { data } = await Tesseract.recognize(source, 'eng', {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) onProgress(m.progress)
    },
  })
  const rawText = data.text || ''
  return {
    amount: parseAmount(rawText),
    date: parseDate(rawText),
    rawText,
  }
}
