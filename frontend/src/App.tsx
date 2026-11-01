
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
  // نطلب الكتب المحفوظة من الخادم
  const response = await fetch(`${API_URL}/books`);

  // نتحقق من نجاح الطلب
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`API error ${response.status}: ${details}`);
  }

  // نقرأ استجابة الخادم مرة واحدة فقط
  const savedBooks: Book[] = await response.json();

  // نحدّث قائمة الكتب
  setBooks(savedBooks);

} catch (error) {
  // نعرض السبب الحقيقي للخطأ
  console.error("Failed to load books:", error);

  const message =
    error instanceof Error ? error.message : String(error);

  setError(`تعذّر تحميل الكتب: ${message}`);

} finally {
  // ننهي التحميل
  setLoading(false);
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
