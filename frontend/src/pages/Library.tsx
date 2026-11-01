
import { useEffect, useState } from 'react'
import type { FormEvent, Dispatch, SetStateAction } from 'react'

import Sidebar from '../components/Sidebar'
import type { Book } from '../types'
import { API_URL } from '../config'

type LibraryProps = {
  books: Book[]
  setBooks: Dispatch<SetStateAction<Book[]>>
  onNavigate: (page: 'Dashboard' | 'Library') => void
}

function Library({ books, setBooks, onNavigate }: LibraryProps) {
  const [search, setSearch] = useState('')
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // جلب الكتب من الخادم عند فتح صفحة المكتبة
  useEffect(() => {
    async function loadBooks() {
      try {
        setError('')

        const response = await fetch(`${API_URL}/books`)

        if (!response.ok) {
          const details = await response.text()
          throw new Error(`API error ${response.status}: ${details}`)
        }

        const data: Book[] = await response.json()
        setBooks(data)

      } catch (error) {
        console.error('Library loadBooks error:', error)

        const message =
          error instanceof Error ? error.message : String(error)

        setError(`تعذّر تحميل الكتب: ${message}`)

      } finally {
        setLoading(false)
      }
    }

    loadBooks()
  }, [setBooks])

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

    try {
      setError('')

      const response = await fetch(`${API_URL}/books`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          author: author.trim(),
          progress: 0,
        }),
      })

      if (!response.ok) {
        const details = await response.text()
        throw new Error(`API error ${response.status}: ${details}`)
      }

      const savedBook: Book = await response.json()

      setBooks(currentBooks => [...currentBooks, savedBook])

      setTitle('')
      setAuthor('')

    } catch (error) {
      console.error('Library addBook error:', error)

      const message =
        error instanceof Error ? error.message : String(error)

      setError(`تعذّرت إضافة الكتاب: ${message}`)
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

        {loading && <p>Loading books...</p>}
        {error && <p role="alert">{error}</p>}

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

        {!loading && filteredBooks.length === 0 && !error && (
          <p>No books found. Try another search.</p>
        )}
      </main>
    </div>
  )
}

export default Library
