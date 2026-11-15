
import { strings } from './strings'

export type BookStatus = 'want_to_read' | 'reading' | 'finished'

export const STATUS_LABELS: Record<BookStatus, string> = strings.status

export const STATUS_ORDER: BookStatus[] = [
  'reading',
  'want_to_read',
  'finished',
]

export type Book = {
  id: number
  title: string
  author: string
  progress: number
  status: BookStatus
}
