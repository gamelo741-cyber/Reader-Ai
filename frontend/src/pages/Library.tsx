
import { useState } from 'react'
import type { FormEvent } from 'react'

import Sidebar from '../components/Sidebar'
import type { Book } from '../types'
import { ApiError } from '../api'
import ApiErrorNotice from '../components/ApiErrorNotice'

type LibraryProps = {
  books: Book[]
  onCreateBook: (book: Pick<Book, 'title' | 'author'>) => Promise<void>
  onNavigate: (page: 'Dashboard' | 'Library') => void
}

function Library({ books, onCreateBook, onNavigate }: LibraryProps) {
  const [search, setSearch] = useState('')
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [error, setError] = useState<ApiError | null>(null)
  const [serverWaking, setServerWaking] = useState(false)

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
          <ApiErrorNotice error={error} onRetry={() => void saveBook()} />
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
              <h3>{book.title}</h3>
              <p>{book.author}</p>
              <p>{book.progress}% read</p>
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
