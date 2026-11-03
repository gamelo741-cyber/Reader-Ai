
import { useState } from 'react'
import type { FormEvent } from 'react'

import Sidebar from '../components/Sidebar'
import type { Book } from '../types'
import { ApiError } from '../api'
import ApiErrorNotice from '../components/ApiErrorNotice'

type LibraryProps = {
  books: Book[]
  onCreateBook: (book: Pick<Book, 'title' | 'author'>) => Promise<void>
  onUpdateBook: (
    id: number,
    data: { title?: string; author?: string }
  ) => Promise<void>
  onDeleteBook: (id: number) => Promise<void>
  onNavigate: (page: 'Dashboard' | 'Library') => void
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
  const [failedAction, setFailedAction] = useState<
    'add' | 'edit' | 'delete' | null
  >(null)
  const [failedDeleteId, setFailedDeleteId] = useState<number | null>(null)

  // البحث في عناوين الكتب وأسماء المؤلفين
  const filteredBooks = books.filter(book =>
    `${book.title} ${book.author}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  // إضافة كتاب جديد
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
      await onCreateBook({ title: title.trim(), author: author.trim() })
      setTitle('')
      setAuthor('')
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
      setEditValidationError('أدخل العنوان واسم المؤلف.')
      return
    }
    if (trimmedTitle.length > 255 || trimmedAuthor.length > 255) {
      setEditValidationError('الحد الأقصى لكل حقل 255 حرفًا.')
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
    }
  }

  return (
    <div className="app-layout">
      <Sidebar onNavigate={onNavigate} currentPage="Library" />

      <main className="dashboard">
        <header className="dashboard-header">
          <h1>My Library</h1>
          <p>Keep all your books in one place.</p>
        </header>

        <form className="add-book-form" onSubmit={handleAddBook}>
          <input
            value={title}
            onChange={event => setTitle(event.target.value)}
            placeholder="Book title"
            aria-label="Book title"
            required
          />

          <input
            value={author}
            onChange={event => setAuthor(event.target.value)}
            placeholder="Author"
            aria-label="Author"
            required
          />

          <button type="submit">Add book</button>
        </form>

        {serverWaking && <p>الخادم يستيقظ، قد يستغرق ذلك حتى دقيقة...</p>}
        {error && (
          <ApiErrorNotice error={error} onRetry={retryFailedAction} />
        )}

        <input
          className="library-search"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Search by title or author..."
          aria-label="Search books"
        />

        <p>{filteredBooks.length} books found</p>

        <div className="books-grid">
          {filteredBooks.map(book => (
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
                    aria-label={`عنوان الكتاب ${book.title}`}
                    maxLength={255}
                    required
                  />
                  <input
                    value={editAuthor}
                    onChange={event => setEditAuthor(event.target.value)}
                    aria-label={`اسم مؤلف الكتاب ${book.title}`}
                    maxLength={255}
                    required
                  />
                  <button
                    type="submit"
                    disabled={pendingEdit}
                    aria-label={`حفظ تعديلات ${book.title}`}
                  >
                    حفظ
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditing}
                    disabled={pendingEdit}
                    aria-label={`إلغاء تعديل ${book.title}`}
                  >
                    إلغاء
                  </button>
                  {editValidationError && (
                    <p role="alert">{editValidationError}</p>
                  )}
                </form>
              ) : (
                <>
                  <h3>{book.title}</h3>
                  <p>{book.author}</p>
                  <p>{book.progress}% read</p>
                  <div className="book-actions">
                    <button
                      type="button"
                      onClick={() => startEditing(book)}
                      disabled={pendingEdit || pendingDeleteId !== null}
                      aria-label={`تعديل ${book.title}`}
                    >
                      تعديل
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            `هل تريد حذف "${book.title}"؟ لا يمكن التراجع.`
                          )
                        ) {
                          void deleteBook(book.id)
                        }
                      }}
                      disabled={pendingDeleteId !== null || pendingEdit}
                      aria-label={`حذف ${book.title}`}
                    >
                      حذف
                    </button>
                  </div>
                </>
              )}
            </article>
          ))}
        </div>

        {filteredBooks.length === 0 && !error && (
          <p>No books found. Try another search.</p>
        )}
      </main>
    </div>
  )
}

export default Library
