import { useState } from 'react'

// نستورد القائمة الجانبية
import Sidebar from '../components/Sidebar'

// نستورد عنوان الصفحة
import Header from '../components/Header'

// نستورد بطاقة الكتاب
import BookCard from '../components/BookCard'

// نستورد نوع بيانات الكتاب
import type { Book } from '../types'
import { ApiError } from '../api'
import ApiErrorNotice from '../components/ApiErrorNotice'

// نحدد البيانات والدوال التي تستقبلها الصفحة من App
type DashboardProps = {
  // قائمة الكتب المشتركة
  books: Book[]

  onUpdateProgress: (id: number, progress: number) => Promise<void>

  // دالة التنقل بين الصفحات
  onNavigate: (page: 'Dashboard' | 'Library') => void
}

// ننشئ صفحة لوحة التحكم
function Dashboard({ books, onUpdateProgress, onNavigate }: DashboardProps) {
  const [error, setError] = useState<ApiError | null>(null)
  const [serverWaking, setServerWaking] = useState(false)
  const [failedBookId, setFailedBookId] = useState<number | null>(null)

  // نزيد التقدم ونحفظ النسبة الجديدة في قاعدة البيانات
  async function increaseProgress(id: number) {
    // نعثر على الكتاب الذي ضغط المستخدم على زره
    const selectedBook = books.find(book => book.id === id)

    // نتوقف إذا لم نجد الكتاب أو كانت قراءته مكتملة
    if (!selectedBook || selectedBook.progress >= 100) return

    // نحسب نسبة التقدم الجديدة، بحد أقصى 100%
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

  // نعرض محتوى لوحة التحكم
  return (
    // نجمع القائمة الجانبية والمحتوى
    <div className="app-layout">
      {/* نعرض القائمة الجانبية ونربطها بالتنقل */}
      <Sidebar onNavigate={onNavigate} currentPage="Dashboard" />

      {/* المحتوى الرئيسي */}
      <main className="dashboard">
        {/* عنوان الصفحة */}
        <Header />

        {/* نعرض رسالة الخطأ عند فشل حفظ التقدم */}
        {serverWaking && <p>الخادم يستيقظ، قد يستغرق ذلك حتى دقيقة...</p>}
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

        {/* قسم الكتب التي نتابع قراءتها */}
        <section className="reading-section">
          {/* عنوان القسم */}
          <h2>Continue Reading</h2>

          {/* نعرض بطاقة لكل كتاب */}
          <div className="books-grid">
            {books.map(book => (
              // نستخدم رقم الكتاب لتمييز كل بطاقة
              <div className="book-item" key={book.id}>
                {/* نعرض بيانات الكتاب ونسبة تقدمه */}
                <BookCard
                  title={book.title}
                  author={book.author}
                  progress={book.progress}
                />

                {/* نحدّث التقدم ونحفظه عند الضغط */}
                <button
                  onClick={() => increaseProgress(book.id)}
                  disabled={book.progress >= 100}
                >
                  {/* نغيّر النص عندما تكتمل القراءة */}
                  {book.progress >= 100
                    ? 'Completed'
                    : `Add 1% progress (${book.progress}%)`}
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

// نصدّر الصفحة ليستخدمها التطبيق
export default Dashboard
