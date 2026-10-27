import { useState } from 'react'

// نستورد القائمة الجانبية
import Sidebar from '../components/Sidebar'

// نستورد عنوان الصفحة
import Header from '../components/Header'

// نستورد بطاقة الكتاب
import BookCard from '../components/BookCard'

// نستورد نوع بيانات الكتاب
import type { Book } from '../types'
import { API_URL } from '../config'

// نحدد البيانات والدوال التي تستقبلها الصفحة من App
type DashboardProps = {
  // قائمة الكتب المشتركة
  books: Book[]

  // دالة تحديث القائمة المشتركة
  setBooks: React.Dispatch<React.SetStateAction<Book[]>>

  // دالة التنقل بين الصفحات
  onNavigate: (page: 'Dashboard' | 'Library') => void
}

// ننشئ صفحة لوحة التحكم
function Dashboard({ books, setBooks, onNavigate }: DashboardProps) {
  // نخزّن رسالة الخطأ إذا فشل تحديث التقدم
  const [error, setError] = useState('')

  // نزيد التقدم ونحفظ النسبة الجديدة في قاعدة البيانات
  async function increaseProgress(id: number) {
    // نعثر على الكتاب الذي ضغط المستخدم على زره
    const selectedBook = books.find(book => book.id === id)

    // نتوقف إذا لم نجد الكتاب أو كانت قراءته مكتملة
    if (!selectedBook || selectedBook.progress >= 100) return

    // نحسب نسبة التقدم الجديدة، بحد أقصى 100%
    const nextProgress = Math.min(selectedBook.progress + 1, 100)

    try {
      // نمسح رسالة الخطأ السابقة
      setError('')

      // نرسل نسبة التقدم الجديدة إلى FastAPI
      const response = await fetch(
        `${API_URL}/books/${id}/progress`,
        {
          // نستخدم PATCH لتحديث جزء من بيانات الكتاب
          method: 'PATCH',

          // نحدد أن البيانات المرسلة بصيغة JSON
          headers: {
            'Content-Type': 'application/json',
          },

          // نرسل نسبة التقدم الجديدة
          body: JSON.stringify({
            progress: nextProgress,
          }),
        }
      )

      // نتحقق أن الخادم حفظ التحديث بنجاح
      if (!response.ok) {
        throw new Error('تعذّر حفظ تقدم القراءة')
      }

      // نستقبل بيانات الكتاب بعد تحديثه في قاعدة البيانات
      const updatedBook: Book = await response.json()

      // نحدّث الواجهة باستخدام البيانات التي أعادها الخادم
      setBooks(currentBooks =>
        currentBooks.map(book =>
          book.id === updatedBook.id ? updatedBook : book
        )
      )
    } catch {
      // نعرض رسالة إذا فشل الاتصال أو الحفظ
      setError('تعذّر حفظ التقدم. تأكد من تشغيل Backend وحاول مجددًا.')
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
        {error && <p role="alert">{error}</p>}

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
