import { useMemo, useState } from 'react'

import Sidebar from '../components/Sidebar'

import Header from '../components/Header'

import BookCard from '../components/BookCard'

import type { Book } from '../types'
import { ApiError } from '../api'
import ApiErrorNotice from '../components/ApiErrorNotice'
import { strings } from '../strings'
import { computeStats } from '../stats'

type DashboardProps = {
  books: Book[]

  onUpdateProgress: (id: number, progress: number) => Promise<void>

  onNavigate: (page: 'Dashboard' | 'Library') => void
}

function Dashboard({ books, onUpdateProgress, onNavigate }: DashboardProps) {
  const stats = useMemo(() => computeStats(books), [books])
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

        <section className="dashboard-statistics">
          <h2>{strings.dashboard.statisticsHeading}</h2>

          {stats.total === 0 ? (
            <p className="dashboard-empty-state">
              {strings.dashboard.emptyLibrary}
            </p>
          ) : (
            <>
              <div className="books-grid">
                <article className="book-item dashboard-stat-card">
                  <h3>{strings.dashboard.totalBooks}</h3>
                  <p className="dashboard-stat-value">{stats.total}</p>
                </article>
                <article className="book-item dashboard-stat-card">
                  <h3>{strings.dashboard.readingBooks}</h3>
                  <p className="dashboard-stat-value">{stats.counts.reading}</p>
                </article>
                <article className="book-item dashboard-stat-card">
                  <h3>{strings.dashboard.finishedBooks}</h3>
                  <p className="dashboard-stat-value">{stats.counts.finished}</p>
                </article>
                <article className="book-item dashboard-stat-card">
                  <h3>{strings.dashboard.wantToReadBooks}</h3>
                  <p className="dashboard-stat-value">
                    {stats.counts.want_to_read}
                  </p>
                </article>
              </div>

              <div className="books-grid">
                <article className="book-item dashboard-stat-card">
                  <h3>{strings.dashboard.completionRate}</h3>
                  <p className="dashboard-stat-value">
                    {stats.completionRate}
                    {strings.dashboard.percentSuffix}
                  </p>
                  <div
                    className="dashboard-progress-track"
                    role="progressbar"
                    aria-label={strings.dashboard.completionProgressLabel}
                    aria-valuenow={stats.completionRate}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="dashboard-progress-fill"
                      style={{ width: `${stats.completionRate}%` }}
                    />
                  </div>
                </article>

                <article className="book-item dashboard-stat-card">
                  <h3>{strings.dashboard.averageReadingProgress}</h3>
                  <p className="dashboard-stat-value">
                    {stats.averageReadingProgress === null
                      ? strings.dashboard.notAvailable
                      : `${stats.averageReadingProgress}${strings.dashboard.percentSuffix}`}
                  </p>
                  <div
                    className="dashboard-progress-track"
                    role="progressbar"
                    aria-label={strings.dashboard.averageProgressLabel}
                    aria-valuenow={stats.averageReadingProgress ?? undefined}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuetext={
                      stats.averageReadingProgress === null
                        ? strings.dashboard.noAverageProgress
                        : `${stats.averageReadingProgress}${strings.dashboard.percentSuffix}`
                    }
                  >
                    <div
                      className="dashboard-progress-fill"
                      style={{
                        width: `${stats.averageReadingProgress ?? 0}%`,
                      }}
                    />
                  </div>
                </article>

                <article className="book-item dashboard-stat-card">
                  <h3>{strings.dashboard.closestToFinishing}</h3>
                  {stats.closestToFinishing ? (
                    <>
                      <p className="dashboard-closest-book">
                        {stats.closestToFinishing.title ||
                          strings.dashboard.untitledBook}
                      </p>
                      <p className="dashboard-closest-book">
                        {stats.closestToFinishing.author ||
                          strings.dashboard.unknownAuthor}
                      </p>
                      <p className="dashboard-stat-value">
                        {stats.closestToFinishing.progress}
                        {strings.dashboard.percentSuffix}
                      </p>
                      <div
                        className="dashboard-progress-track"
                        role="progressbar"
                        aria-label={strings.dashboard.closestProgressLabel.replace(
                          '{title}',
                          stats.closestToFinishing.title ||
                            strings.dashboard.untitledBook
                        )}
                        aria-valuenow={stats.closestToFinishing.progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          className="dashboard-progress-fill"
                          style={{
                            width: `${stats.closestToFinishing.progress}%`,
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <p>{strings.dashboard.noBooksInProgress}</p>
                  )}
                </article>
              </div>
            </>
          )}
        </section>

        {stats.total > 0 && (
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
                      : `${strings.dashboard.addProgress} (${book.progress}${strings.dashboard.percentSuffix})`}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default Dashboard
