
import { useEffect, useState } from 'react' // لإدارة الحالة وتشغيل كود عند فتح التطبيق
import type { Book } from './types' // نستورد نوع الكتاب المشترك
import { API_URL } from './config'
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

  // نخزّن رسالة الخطأ إن تعذّر جلب الكتب
  const [error, setError] = useState('')

  // نجلب الكتب المحفوظة عند تشغيل التطبيق لأول مرة
  useEffect(() => {
    // ننشئ دالة لجلب الكتب من الـ Backend
    async function loadBooks() {
      try {
        // نطلب الكتب المحفوظة في SQLite
        const response = await fetch(`${API_URL}/books`)

        // نتأكد أن الخادم أعاد استجابة ناجحة
        if (!response.ok) {
          throw new Error('تعذّر جلب الكتب')
        }

        // نحوّل استجابة الخادم إلى قائمة كتب
        const savedBooks: Book[] = await response.json()

        // نحدّث قائمة الكتب المشتركة في التطبيق
        setBooks(savedBooks)
      } catch {
        // نعرض رسالة إذا فشل الاتصال
        setError('تعذّر الاتصال بالخادم. تأكد أن Backend يعمل.')
      } finally {
        // ننهي التحميل سواء نجح الطلب أو فشل
        setLoading(false)
      }
    }

    // نشغّل عملية جلب الكتب
    loadBooks()
  }, [])

  // نعرض حالة التحميل أو الخطأ قبل إظهار الصفحة
  if (loading) {
    return <p>Loading your books...</p>
  }

  // نعرض الخطأ إذا تعذّر الاتصال
  if (error) {
    return <p role="alert">{error}</p>
  }

  // نعرض الصفحة المطلوبة ونمرر لها نفس قائمة الكتب
  return currentPage === 'Dashboard' ? (
    // نمرر الكتب ودالة تحديثها إلى لوحة التحكم
    <Dashboard
      books={books}
      setBooks={setBooks}
      onNavigate={setCurrentPage}
    />
  ) : (
    // نمرر الكتب ودالة تحديثها إلى المكتبة
    <Library
      books={books}
      setBooks={setBooks}
      onNavigate={setCurrentPage}
    />
  )
}

// نصدّر التطبيق للاستخدام في main.tsx
export default App
