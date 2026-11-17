import type { Book, BookStatus } from './types'

export type ReadingStats = {
  total: number
  counts: Record<BookStatus, number>
  completionRate: number
  averageReadingProgress: number | null
  closestToFinishing: Book | null
}

function getBookStatus(book: Book): BookStatus {
  return book.status ?? 'want_to_read'
}

function getClampedProgress(progress: unknown): number | null {
  if (typeof progress !== 'number' || !Number.isFinite(progress)) return null
  return Math.min(100, Math.max(0, progress))
}

export function computeStats(books: Book[]): ReadingStats {
  const counts: Record<BookStatus, number> = {
    reading: 0,
    finished: 0,
    want_to_read: 0,
  }
  let readingProgressTotal = 0
  let readingProgressCount = 0
  let closestToFinishing: Book | null = null

  for (const book of books) {
    const status = getBookStatus(book)
    counts[status] += 1

    if (status !== 'reading') continue

    const progress = getClampedProgress(book.progress)
    if (progress === null) continue

    readingProgressTotal += progress
    readingProgressCount += 1

    if (
      progress < 100 &&
      (!closestToFinishing ||
        progress > closestToFinishing.progress ||
        (progress === closestToFinishing.progress &&
          book.id > closestToFinishing.id))
    ) {
      closestToFinishing = { ...book, progress }
    }
  }

  const total = books.length
  const finished = counts.finished

  return {
    total,
    counts,
    completionRate: total === 0 ? 0 : Math.round((finished / total) * 100),
    averageReadingProgress:
      readingProgressCount === 0
        ? null
        : Math.round(readingProgressTotal / readingProgressCount),
    closestToFinishing,
  }
}
