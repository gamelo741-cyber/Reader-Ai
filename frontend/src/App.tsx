
import { useCallback, useEffect, useState } from 'react' // لإدارة الحالة وتشغيل كود عند فتح التطبيق
import type { Book } from './types' // نستورد نوع الكتاب المشترك
import { ApiError, createBook, getBooks, updateProgress } from './api'
import ApiErrorNotice from './components/ApiErrorNotice'
import Dashboard from './pages/Dashboard' // نستورد لوحة التحكم
import Library from './pages/Library' // نستورد المكتبة

// ننشئ المكوّن الرئيسي للتطبيق
function App() {
  // نحدد الصفحة التي تظهر أولًا
  const [currentPage, setCurrentPage] = useState<'Dashboard' | 'Library'>('Dashboard')

  // نخزّن الكتب، ونبدأ بقائمة فارغة بدل البيانات التجريبية
  const [books, setBooks] = useState<Book[]>([])

  // نحدد هل التطبيق ما زال يجلب الكتب
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

  async function handleCreateBook(book: Pick<Book, 'title' | 'author'>) {
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

  // نعرض حالة التحميل أو الخطأ قبل إظهار الصفحة
  if (loading) {
    return (
      <p>
        {serverWaking
          ? 'الخادم يستيقظ، قد يستغرق ذلك حتى دقيقة...'
          : 'Loading your books...'}
      </p>
    )
  }

  if (error) {
    return <ApiErrorNotice error={error} onRetry={() => void loadBooks(true)} />
  }

  // نعرض الصفحة المطلوبة ونمرر لها نفس قائمة الكتب
  return currentPage === 'Dashboard' ? (
    // نمرر الكتب ودالة تحديثها إلى لوحة التحكم
    <Dashboard
      books={books}
      onUpdateProgress={handleUpdateProgress}
      onNavigate={setCurrentPage}
    />
  ) : (
    // نمرر الكتب ودالة تحديثها إلى المكتبة
    <Library
      books={books}
      onCreateBook={handleCreateBook}
      onNavigate={setCurrentPage}
    />
  )
}

// نصدّر التطبيق للاستخدام في main.tsx
export default App
