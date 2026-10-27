
import { useEffect, useState } from 'react'
// نستورد أنواع React اللازمة للنموذج وتحديث حالة الكتب
import type { FormEvent, Dispatch, SetStateAction } from 'react'

// نستورد القائمة الجانبية
import Sidebar from '../components/Sidebar'

// نستورد نوع الكتاب المشترك
import type { Book } from '../types'
import { API_URL } from '../config'

// نحدد البيانات التي تستقبلها صفحة المكتبة
type LibraryProps = {
  // قائمة الكتب المشتركة بين صفحات التطبيق
  books: Book[]

  // دالة تحديث قائمة الكتب المشتركة
  setBooks: Dispatch<SetStateAction<Book[]>>

  // دالة التنقل بين الصفحات
  onNavigate: (page: 'Dashboard' | 'Library') => void
}

// ننشئ صفحة المكتبة
function Library({ books, setBooks, onNavigate }: LibraryProps) {
  // نخزّن نص البحث
  const [search, setSearch] = useState('')

  // نخزّن عنوان الكتاب الجديد
  const [title, setTitle] = useState('')

  // نخزّن اسم مؤلف الكتاب الجديد
  const [author, setAuthor] = useState('')

  // نخزّن حالة تحميل الكتب
  const [loading, setLoading] = useState(true)

  // نخزّن رسالة الخطأ إن فشل الاتصال
  const [error, setError] = useState('')

  // نجلب الكتب من قاعدة البيانات عند فتح صفحة المكتبة
  useEffect(() => {
    // ننشئ دالة غير متزامنة لطلب الكتب
    async function loadBooks() {
      try {
        // نطلب قائمة الكتب من FastAPI
        const response = await fetch(`${API_URL}/books`)

        // نتأكد أن الطلب نجح
        if (!response.ok) {
          throw new Error('تعذّر جلب الكتب من الخادم')
        }

        // نحوّل استجابة JSON إلى قائمة كتب
        const data: Book[] = await response.json()

        // نحدّث القائمة المشتركة في التطبيق
        setBooks(data)
      } catch {
        // نعرض رسالة إذا تعذّر الاتصال بالـ Backend
        setError('تعذّر الاتصال بالخادم. تأكد أن Backend يعمل.')
      } finally {
        // ننهي حالة التحميل سواء نجح الطلب أم فشل
        setLoading(false)
      }
    }

    // نشغّل عملية جلب الكتب
    loadBooks()
  }, [setBooks])

  // نبحث في العنوان واسم المؤلف
  const filteredBooks = books.filter(book =>
    `${book.title} ${book.author}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  // نتعامل مع نموذج إضافة كتاب
  async function handleAddBook(event: FormEvent<HTMLFormElement>) {
    // نمنع المتصفح من إعادة تحميل الصفحة
    event.preventDefault()

    // نتأكد أن الحقول ليست فارغة
    if (!title.trim() || !author.trim()) return

    try {
      // نمسح رسالة الخطأ السابقة
      setError('')

      // نرسل الكتاب الجديد إلى الـ Backend ليُحفظ في SQLite
      const response = await fetch(`${API_URL}/books`, {
        // نستخدم POST لإنشاء كتاب جديد
        method: 'POST',

        // نحدد أن محتوى الطلب بصيغة JSON
        headers: {
          'Content-Type': 'application/json',
        },

        // نرسل بيانات الكتاب إلى الخادم
        body: JSON.stringify({
          title: title.trim(),
          author: author.trim(),
          progress: 0,
        }),
      })

      // نتأكد أن الخادم قبل الإضافة
      if (!response.ok) {
        throw new Error('تعذّرت إضافة الكتاب')
      }

      // نستقبل الكتاب المحفوظ، بما فيه المعرّف الذي أنشأته قاعدة البيانات
      const savedBook: Book = await response.json()

      // نضيف الكتاب المحفوظ إلى حالة التطبيق المشتركة
      setBooks(currentBooks => [...currentBooks, savedBook])

      // نفرّغ حقل العنوان
      setTitle('')

      // نفرّغ حقل المؤلف
      setAuthor('')
    } catch {
      // نعرض رسالة إذا فشل الحفظ
      setError('تعذّرت إضافة الكتاب. تأكد من تشغيل Backend وحاول مجددًا.')
    }
  }

  // نعرض واجهة المكتبة
  return (
    // نجمع القائمة الجانبية والمحتوى
    <div className="app-layout">
      {/* نعرض القائمة الجانبية */}
      <Sidebar onNavigate={onNavigate} currentPage="Library" />

      {/* المحتوى الرئيسي للمكتبة */}
      <main className="dashboard">
        {/* عنوان صفحة المكتبة */}
        <header className="dashboard-header">
          <h1>My Library</h1>
          <p>Keep all your books in one place.</p>
        </header>

        {/* نموذج إضافة كتاب جديد */}
        <form className="add-book-form" onSubmit={handleAddBook}>
          {/* حقل عنوان الكتاب */}
          <input
            value={title}
            onChange={event => setTitle(event.target.value)}
            placeholder="Book title"
            aria-label="Book title"
            required
          />

          {/* حقل اسم المؤلف */}
          <input
            value={author}
            onChange={event => setAuthor(event.target.value)}
            placeholder="Author"
            aria-label="Author"
            required
          />

          {/* زر إضافة الكتاب */}
          <button type="submit">Add book</button>
        </form>

        {/* نعرض رسائل التحميل أو الخطأ */}
        {loading && <p>Loading books...</p>}
        {error && <p role="alert">{error}</p>}

        {/* حقل البحث */}
        <input
          className="library-search"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Search by title or author..."
          aria-label="Search books"
        />

        {/* عدد الكتب المطابقة */}
        <p>{filteredBooks.length} books found</p>

        {/* شبكة الكتب */}
        <div className="books-grid">
          {filteredBooks.map(book => (
            // نستخدم معرّف قاعدة البيانات لتحديد كل كتاب
            <article className="book-item" key={book.id}>
              {/* عنوان الكتاب */}
              <h3>{book.title}</h3>

              {/* اسم المؤلف */}
              <p>{book.author}</p>

              {/* نسبة التقدم في القراءة */}
              <p>{book.progress}% read</p>
            </article>
          ))}
        </div>

        {/* رسالة عند عدم وجود نتائج بعد انتهاء التحميل */}
        {!loading && filteredBooks.length === 0 && (
          <p>No books found. Try another search.</p>
        )}
      </main>
    </div>
  )
}

// نصدّر صفحة المكتبة ليستخدمها التطبيق
export default Library
