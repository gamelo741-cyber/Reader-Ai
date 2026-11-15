import { useState } from 'react'

import Sidebar from '../components/Sidebar'

import Header from '../components/Header'

import BookCard from '../components/BookCard'

import type { Book } from '../types'
import { ApiError } from '../api'
import ApiErrorNotice from '../components/ApiErrorNotice'
import { strings } from '../strings'

type DashboardProps = {
  books: Book[]

  onUpdateProgress: (id: number, progress: number) => Promise<void>

  onNavigate: (page: 'Dashboard' | 'Library') => void
}

function Dashboard({ books, onUpdateProgress, onNavigate }: DashboardProps) {
  const [error, setError] = useState<ApiError | null>(null)
  const [serverWaking, setServerWaking] = useState(false)
  const [failedBookId, setFailedBookId] = useState<number | null>(null)

  async function increaseProgress(id: number) {
    const selectedBook = books.find(book => book.id === id)

    if (!selectedBook || selectedBook.progress >= 100) return

    const nextProgress = Math.min(selectedBook.progress + 1, 100)
    setError(null)
    setServerWaking(false)
    const wakingTimer = window.setTimeout(() => {
      setServerWaking(true)
    }, 5_000)

    try {
      await onUpdateProgress(id, nextProgress)
      setFailedBookId(null)
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError)
        setFailedBookId(id)
      } else {
        throw requestError
      }
    } finally {
      window.clearTimeout(wakingTimer)
      setServerWaking(false)
    }
  }

  return (
    <div className="app-layout">
      <Sidebar onNavigate={onNavigate} currentPage="Dashboard" />

      <main className="dashboard">
        <Header />

        {serverWaking && <p>{strings.app.serverWaking}</p>}
        {error && (
          <ApiErrorNotice
            error={error}
            onRetry={() => {
              if (failedBookId !== null) {
                void increaseProgress(failedBookId)
              }
            }}
          />
        )}

        <section className="reading-section">
          <h2>{strings.dashboard.continueReading}</h2>

          <div className="books-grid">
            {books.map(book => (
              <div className="book-item" key={book.id}>
                <BookCard
                  title={book.title}
                  author={book.author}
                  progress={book.progress}
                />

                <button
                  onClick={() => increaseProgress(book.id)}
                  disabled={book.progress >= 100}
                >
                  {book.progress >= 100
                    ? strings.dashboard.completed
                    : `${strings.dashboard.addProgress} (${book.progress}%)`}
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

export default Dashboard
