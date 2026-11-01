import { API_URL } from './config'
import type { Book } from './types'

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
        throw new ApiError('The request timed out.', 'timeout', url, method)
      }

      throw new ApiError(
        'The request failed before a response was received.',
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
        throw new ApiError('The request timed out.', 'timeout', url, method)
      }

      throw new ApiError(
        'The response body could not be read.',
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
        snippet || response.statusText || 'The server returned an error.',
        'http',
        url,
        method,
        response.status
      )
    }

    try {
      return JSON.parse(responseBody) as T
    } catch {
      throw new ApiError(
        'The server response was not valid JSON.',
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
  book: Pick<Book, 'title' | 'author'>
): Promise<Book> {
  return request<Book>('/books', {
    method: 'POST',
    body: { ...book, progress: 0 },
  })
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
