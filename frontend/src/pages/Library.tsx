
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'

import Sidebar from '../components/Sidebar'
import {
  STATUS_LABELS,
  STATUS_ORDER,
  type Book,
  type BookStatus,
  type SortOption,
} from '../types'
import { ApiError } from '../api'
import ApiErrorNotice from '../components/ApiErrorNotice'
import { strings } from '../strings'

type StatusFilter = BookStatus | 'all'

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: strings.library.all },
  { value: 'reading', label: STATUS_LABELS.reading },
  { value: 'finished', label: STATUS_LABELS.finished },
  { value: 'want_to_read', label: STATUS_LABELS.want_to_read },
]

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'recent', label: strings.library.sortOptions.recent },
  { value: 'title', label: strings.library.sortOptions.title },
  { value: 'author', label: strings.library.sortOptions.author },
  { value: 'progress_desc', label: strings.library.sortOptions.progressDesc },
  { value: 'progress_asc', label: strings.library.sortOptions.progressAsc },
]

type LibraryProps = {
  books: Book[]
  onCreateBook: (
    book: Pick<Book, 'title' | 'author'> & { status?: BookStatus }
  ) => Promise<void>
  onUpdateBook: (
    id: number,
    data: { title?: string; author?: string; status?: BookStatus }
  ) => Promise<void>
  onDeleteBook: (id: number) => Promise<void>
  onNavigate: (page: 'Dashboard' | 'Library') => void
}

function getBookStatus(book: Book): BookStatus {
  return book.status ?? 'want_to_read'
}

function isBookStatus(value: string): value is BookStatus {
  return STATUS_ORDER.some(status => status === value)
}

function isSortOption(value: string): value is SortOption {
  return SORT_OPTIONS.some(option => option.value === value)
}

function Library({
  books,
  onCreateBook,
  onUpdateBook,
  onDeleteBook,
  onNavigate,
}: LibraryProps) {
  const [search, setSearch] = useState('')
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [newBookStatus, setNewBookStatus] =
    useState<BookStatus>('want_to_read')
  const [activeStatus, setActiveStatus] = useState<StatusFilter>('all')
  const [sortOption, setSortOption] = useState<SortOption>('recent')
  const [error, setError] = useState<ApiError | null>(null)
  const [serverWaking, setServerWaking] = useState(false)
  const [editingBookId, setEditingBookId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editAuthor, setEditAuthor] = useState('')
  const [editValidationError, setEditValidationError] = useState<string | null>(
    null
  )
  const [pendingEdit, setPendingEdit] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)
  const [pendingStatusId, setPendingStatusId] = useState<number | null>(null)
  const [failedAction, setFailedAction] = useState<
    'add' | 'edit' | 'delete' | 'status' | null
  >(null)
  const [failedDeleteId, setFailedDeleteId] = useState<number | null>(null)
  const [failedStatusChange, setFailedStatusChange] = useState<{
    bookId: number
    status: BookStatus
  } | null>(null)

  const statusCounts = books.reduce<Record<BookStatus, number>>(
    (counts, book) => {
      counts[getBookStatus(book)] += 1
      return counts
    },
    { want_to_read: 0, reading: 0, finished: 0 }
  )

  const filteredBooks = useMemo(
    () =>
      books.filter(book => {
        const matchesStatus =
          activeStatus === 'all' || getBookStatus(book) === activeStatus
        const matchesSearch = `${book.title} ${book.author}`
          .toLowerCase()
          .includes(search.toLowerCase())
        return matchesStatus && matchesSearch
      }),
    [activeStatus, books, search]
  )

  const sortedBooks = useMemo(() => {
    const compareText = (a: string | undefined, b: string | undefined) =>
      (a ?? '').localeCompare(b ?? '', undefined, {
        sensitivity: 'base',
        numeric: true,
      })
    const sorted = [...filteredBooks]

    sorted.sort((a, b) => {
      if (sortOption === 'recent') return b.id - a.id

      let comparison = 0
      if (sortOption === 'title') {
        comparison = compareText(a.title, b.title)
      } else if (sortOption === 'author') {
        comparison = compareText(a.author, b.author)
      } else if (sortOption === 'progress_desc') {
        comparison = b.progress - a.progress
      } else {
        comparison = a.progress - b.progress
      }

      return comparison || a.id - b.id
    })

    return sorted
  }, [filteredBooks, sortOption])

  async function handleAddBook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!title.trim() || !author.trim()) return

    await saveBook()
  }

  async function saveBook() {
    setError(null)
    setFailedAction(null)
    setServerWaking(false)
    const wakingTimer = window.setTimeout(() => {
      setServerWaking(true)
    }, 5_000)

    try {
      await onCreateBook({
        title: title.trim(),
        author: author.trim(),
        status: newBookStatus,
      })
      setTitle('')
      setAuthor('')
      setNewBookStatus('want_to_read')
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError)
        setFailedAction('add')
      } else {
        throw requestError
      }
    } finally {
      window.clearTimeout(wakingTimer)
      setServerWaking(false)
    }
  }

  function startEditing(book: Book) {
    setError(null)
    setEditValidationError(null)
    setEditingBookId(book.id)
    setEditTitle(book.title)
    setEditAuthor(book.author)
  }

  function cancelEditing() {
    setEditingBookId(null)
    setEditValidationError(null)
  }

  async function saveEdit() {
    if (editingBookId === null) return

    const trimmedTitle = editTitle.trim()
    const trimmedAuthor = editAuthor.trim()
    if (!trimmedTitle || !trimmedAuthor) {
      setEditValidationError(strings.library.editValidationRequired)
      return
    }
    if (trimmedTitle.length > 255 || trimmedAuthor.length > 255) {
      setEditValidationError(strings.library.editValidationLength)
      return
    }

    setError(null)
    setFailedAction(null)
    setEditValidationError(null)
    setServerWaking(false)
    setPendingEdit(true)
    const wakingTimer = window.setTimeout(() => {
      setServerWaking(true)
    }, 5_000)

    try {
      await onUpdateBook(editingBookId, {
        title: trimmedTitle,
        author: trimmedAuthor,
      })
      setEditingBookId(null)
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError)
        setFailedAction('edit')
      } else {
        throw requestError
      }
    } finally {
      window.clearTimeout(wakingTimer)
      setServerWaking(false)
      setPendingEdit(false)
    }
  }

  async function changeStatus(bookId: number, status: BookStatus) {
    setError(null)
    setFailedAction(null)
    setFailedStatusChange(null)
    setServerWaking(false)
    setPendingStatusId(bookId)
    const wakingTimer = window.setTimeout(() => {
      setServerWaking(true)
    }, 5_000)

    try {
      await onUpdateBook(bookId, { status })
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError)
        setFailedAction('status')
        setFailedStatusChange({ bookId, status })
      } else {
        throw requestError
      }
    } finally {
      window.clearTimeout(wakingTimer)
      setServerWaking(false)
      setPendingStatusId(null)
    }
  }

  async function deleteBook(id: number) {
    setError(null)
    setFailedAction(null)
    setServerWaking(false)
    setPendingDeleteId(id)
    const wakingTimer = window.setTimeout(() => {
      setServerWaking(true)
    }, 5_000)

    try {
      await onDeleteBook(id)
      setFailedDeleteId(null)
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError)
        setFailedAction('delete')
        setFailedDeleteId(id)
      } else {
        throw requestError
      }
    } finally {
      window.clearTimeout(wakingTimer)
      setServerWaking(false)
      setPendingDeleteId(null)
    }
  }

  function retryFailedAction() {
    if (failedAction === 'add') {
      void saveBook()
    } else if (failedAction === 'edit') {
      void saveEdit()
    } else if (failedAction === 'delete' && failedDeleteId !== null) {
      void deleteBook(failedDeleteId)
    } else if (failedAction === 'status' && failedStatusChange !== null) {
      void changeStatus(failedStatusChange.bookId, failedStatusChange.status)
    }
  }

  return (
    <div className="app-layout">
      <Sidebar onNavigate={onNavigate} currentPage="Library" />

      <main className="dashboard">
        <header className="dashboard-header">
          <h1>{strings.library.title}</h1>
          <p>{strings.library.description}</p>
        </header>

        <form className="add-book-form" onSubmit={handleAddBook}>
          <input
            value={title}
            onChange={event => setTitle(event.target.value)}
            placeholder={strings.library.bookTitle}
            aria-label={strings.library.bookTitle}
            required
          />

          <input
            value={author}
            onChange={event => setAuthor(event.target.value)}
            placeholder={strings.library.author}
            aria-label={strings.library.author}
            required
          />

          <select
            value={newBookStatus}
            onChange={event => {
              if (isBookStatus(event.target.value)) {
                setNewBookStatus(event.target.value)
              }
            }}
            aria-label={strings.library.readingStatus}
          >
            {STATUS_ORDER.map(status => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>

          <button type="submit">{strings.library.addBook}</button>
        </form>

        {serverWaking && <p>{strings.app.serverWaking}</p>}
        {error && (
          <ApiErrorNotice error={error} onRetry={retryFailedAction} />
        )}

        <div className="library-toolbar">
          <input
            className="library-search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder={strings.library.searchPlaceholder}
            aria-label={strings.library.searchAriaLabel}
          />

          <div className="library-sort-control">
            <label htmlFor="library-sort">{strings.library.sortBy}</label>
            <select
              id="library-sort"
              value={sortOption}
              onChange={event => {
                if (isSortOption(event.target.value)) {
                  setSortOption(event.target.value)
                }
              }}
            >
              {SORT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p>{filteredBooks.length} {strings.library.booksFound}</p>

        <div
          className="status-filter-tabs"
          role="tablist"
          aria-label={strings.library.filterAriaLabel}
        >
          {STATUS_TABS.map(tab => {
            const count =
              tab.value === 'all' ? books.length : statusCounts[tab.value]
            return (
              <button
                type="button"
                className="status-filter-tab"
                key={tab.value}
                role="tab"
                aria-selected={activeStatus === tab.value}
                onClick={() => setActiveStatus(tab.value)}
              >
                {tab.label} ({count})
              </button>
            )
          })}
        </div>

        <div className="books-grid">
          {sortedBooks.map(book => (
            <article className="book-item" key={book.id}>
              {editingBookId === book.id ? (
                <form
                  className="add-book-form edit-book-form"
                  onSubmit={event => {
                    event.preventDefault()
                    void saveEdit()
                  }}
                >
                  <input
                    value={editTitle}
                    onChange={event => setEditTitle(event.target.value)}
                    aria-label={strings.library.editTitleAriaLabel.replace(
                      '{title}',
                      book.title
                    )}
                    maxLength={255}
                    required
                  />
                  <input
                    value={editAuthor}
                    onChange={event => setEditAuthor(event.target.value)}
                    aria-label={strings.library.editAuthorAriaLabel.replace(
                      '{title}',
                      book.title
                    )}
                    maxLength={255}
                    required
                  />
                  <button
                    type="submit"
                    disabled={pendingEdit}
                    aria-label={strings.library.saveEditAriaLabel.replace(
                      '{title}',
                      book.title
                    )}
                  >
                    {strings.library.save}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditing}
                    disabled={pendingEdit}
                    aria-label={strings.library.cancelEditAriaLabel.replace(
                      '{title}',
                      book.title
                    )}
                  >
                    {strings.library.cancel}
                  </button>
                  {editValidationError && (
                    <p role="alert">{editValidationError}</p>
                  )}
                </form>
              ) : (
                <>
                  <div className="book-status-controls">
                    <span className="book-status-badge">
                      {STATUS_LABELS[getBookStatus(book)]}
                    </span>
                    <select
                      value={getBookStatus(book)}
                      onChange={event => {
                        if (isBookStatus(event.target.value)) {
                          void changeStatus(book.id, event.target.value)
                        }
                      }}
                      aria-label={strings.library.readingStatusForAriaLabel.replace(
                        '{title}',
                        book.title
                      )}
                      disabled={
                        pendingStatusId !== null ||
                        pendingDeleteId !== null ||
                        pendingEdit
                      }
                    >
                      {STATUS_ORDER.map(status => (
                        <option key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <h3>{book.title}</h3>
                  <p>{book.author}</p>
                  <p>{book.progress}{strings.library.percentRead}</p>
                  <div className="book-actions">
                    <button
                      type="button"
                      onClick={() => startEditing(book)}
                      disabled={pendingEdit || pendingDeleteId !== null}
                      aria-label={strings.library.editBookAriaLabel.replace(
                        '{title}',
                        book.title
                      )}
                    >
                      {strings.library.edit}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            strings.library.deleteConfirmation.replace(
                              '{title}',
                              book.title
                            )
                          )
                        ) {
                          void deleteBook(book.id)
                        }
                      }}
                      disabled={pendingDeleteId !== null || pendingEdit}
                      aria-label={strings.library.deleteBookAriaLabel.replace(
                        '{title}',
                        book.title
                      )}
                    >
                      {strings.library.delete}
                    </button>
                  </div>
                </>
              )}
            </article>
          ))}
        </div>

        {filteredBooks.length === 0 && !error && (
          <p>
            {activeStatus !== 'all' && statusCounts[activeStatus] === 0
              ? strings.library.emptyStatus
              : books.length === 0
                ? strings.library.emptyLibrary
                : strings.library.emptySearch}
          </p>
        )}
      </main>
    </div>
  )
}

export default Library
