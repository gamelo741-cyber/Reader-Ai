import { API_URL } from './config'
import { strings } from './strings'
import type { Book, BookStatus } from './types'

export type ApiErrorKind = 'network' | 'http' | 'timeout' | 'parse'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly url: string
  readonly method: string
  readonly status?: number

  constructor(
    message: string,
    kind: ApiErrorKind,
    url: string,
    method: string,
    status?: number
  ) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.url = url
    this.method = method
    this.status = status
  }
}

type RequestOptions = {
  method?: string
  body?: unknown
}

const REQUEST_TIMEOUT_MS = 60_000
const HTTP_BODY_SNIPPET_LENGTH = 200

async function request<T>(
  path: string,
  { method = 'GET', body }: RequestOptions = {}
): Promise<T> {
  const url = `${API_URL}${path}`
  const controller = new AbortController()
  let timedOut = false
  const timeoutId = window.setTimeout(() => {
    timedOut = true
    controller.abort()
  }, REQUEST_TIMEOUT_MS)

  try {
    let response: Response

    try {
      response = await fetch(url, {
        method,
        signal: controller.signal,
        ...(body === undefined
          ? {}
          : {
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            }),
      })
    } catch {
      if (timedOut) {
        throw new ApiError(strings.errors.requestTimeout, 'timeout', url, method)
      }

      throw new ApiError(
        strings.errors.requestFailed,
        'network',
        url,
        method
      )
    }

    let responseBody: string
    try {
      responseBody = await response.text()
    } catch {
      if (timedOut) {
        throw new ApiError(strings.errors.requestTimeout, 'timeout', url, method)
      }

      throw new ApiError(
        strings.errors.responseReadFailed,
        'parse',
        url,
        method,
        response.status
      )
    }

    if (!response.ok) {
      const snippet = responseBody
        .trim()
        .slice(0, HTTP_BODY_SNIPPET_LENGTH)
      throw new ApiError(
        snippet || response.statusText || strings.errors.serverError,
        'http',
        url,
        method,
        response.status
      )
    }

    if (response.status === 204 || responseBody.length === 0) {
      return undefined as T
    }

    try {
      return JSON.parse(responseBody) as T
    } catch {
      throw new ApiError(
        strings.errors.invalidJson,
        'parse',
        url,
        method,
        response.status
      )
    }
  } finally {
    window.clearTimeout(timeoutId)
  }
}

export function getBooks(): Promise<Book[]> {
  return request<Book[]>('/books')
}

export function createBook(
  book: Pick<Book, 'title' | 'author'> & { status?: BookStatus }
): Promise<Book> {
  return request<Book>('/books', {
    method: 'POST',
    body: { ...book, progress: 0 },
  })
}

export function updateBook(
  id: number,
  data: { title?: string; author?: string; status?: BookStatus }
): Promise<Book> {
  return request<Book>(`/books/${id}`, {
    method: 'PATCH',
    body: data,
  })
}

export function deleteBook(id: number): Promise<void> {
  return request<void>(`/books/${id}`, { method: 'DELETE' })
}

export function updateProgress(
  bookId: number,
  progress: number
): Promise<Book> {
  return request<Book>(`/books/${bookId}/progress`, {
    method: 'PATCH',
    body: { progress },
  })
}
