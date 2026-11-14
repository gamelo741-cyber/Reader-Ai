
export type BookStatus = 'want_to_read' | 'reading' | 'finished'

export const STATUS_LABELS: Record<BookStatus, string> = {
  want_to_read: 'أريد قراءته',
  reading: 'أقرأ الآن',
  finished: 'أنهيت',
}

export const STATUS_ORDER: BookStatus[] = [
  'reading',
  'want_to_read',
  'finished',
]

// نعرّف شكل الكتاب الذي ستستخدمه جميع الصفحات
export type Book = {
  id: number // معرّف فريد لكل كتاب
  title: string // عنوان الكتاب
  author: string // اسم المؤلف
  progress: number // نسبة التقدم في القراءة
  status: BookStatus
}
