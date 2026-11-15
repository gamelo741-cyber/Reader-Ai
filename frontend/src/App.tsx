
import { useCallback, useEffect, useState } from 'react'
import type { Book, BookStatus } from './types'
import {
  ApiError,
  createBook,
  deleteBook,
  getBooks,
  updateBook,
  updateProgress,
} from './api'
import ApiErrorNotice from './components/ApiErrorNotice'
import { strings } from './strings'
import Dashboard from './pages/Dashboard'
import Library from './pages/Library'

function App() {
  const [currentPage, setCurrentPage] = useState<'Dashboard' | 'Library'>('Dashboard')

  const [books, setBooks] = useState<Book[]>([])

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState<ApiError | null>(null)
  const [serverWaking, setServerWaking] = useState(false)

  const loadBooks = useCallback(async (isRetry = false) => {
    if (isRetry) {
      setError(null)
      setLoading(true)
    }

    const wakingTimer = window.setTimeout(() => {
      setServerWaking(true)
    }, 5_000)

    try {
      setBooks(await getBooks())
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError)
      } else {
        throw requestError
      }
    } finally {
      window.clearTimeout(wakingTimer)
      setLoading(false)
      setServerWaking(false)
    }
  }, [])

  useEffect(() => {
    const startupTimer = window.setTimeout(() => {
      void loadBooks()
    }, 0)

    return () => window.clearTimeout(startupTimer)
  }, [loadBooks])

  async function handleCreateBook(
    book: Pick<Book, 'title' | 'author'> & { status?: BookStatus }
  ) {
    const savedBook = await createBook(book)
    setBooks(currentBooks => [...currentBooks, savedBook])
  }

  async function handleUpdateProgress(id: number, progress: number) {
    const updatedBook = await updateProgress(id, progress)
    setBooks(currentBooks =>
      currentBooks.map(book =>
        book.id === updatedBook.id ? updatedBook : book
      )
    )
  }

  async function handleUpdateBook(
    id: number,
    data: { title?: string; author?: string; status?: BookStatus }
  ) {
    const updatedBook = await updateBook(id, data)
    setBooks(currentBooks =>
      currentBooks.map(book =>
        book.id === updatedBook.id ? updatedBook : book
      )
    )
  }

  async function handleDeleteBook(id: number) {
    try {
      await deleteBook(id)
    } catch (requestError) {
      if (!(requestError instanceof ApiError) || requestError.status !== 404) {
        throw requestError
      }
    }

    setBooks(currentBooks => currentBooks.filter(book => book.id !== id))
  }

  if (loading) {
    return (
      <p>
        {serverWaking
          ? strings.app.serverWaking
          : strings.app.loadingBooks}
      </p>
    )
  }

  if (error) {
    return <ApiErrorNotice error={error} onRetry={() => void loadBooks(true)} />
  }

  return currentPage === 'Dashboard' ? (
    <Dashboard
      books={books}
      onUpdateProgress={handleUpdateProgress}
      onNavigate={setCurrentPage}
    />
  ) : (
    <Library
      books={books}
      onCreateBook={handleCreateBook}
      onUpdateBook={handleUpdateBook}
      onDeleteBook={handleDeleteBook}
      onNavigate={setCurrentPage}
    />
  )
}

export default App
