
import { strings } from './strings'

export type BookStatus = 'want_to_read' | 'reading' | 'finished'

export type SortOption =
  | 'recent'
  | 'title'
  | 'author'
  | 'progress_desc'
  | 'progress_asc'

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
  status?: BookStatus
}
