
 // نعرّف شكل الكتاب الذي ستستخدمه جميع الصفحات
export type Book = {
  id: number // معرّف فريد لكل كتاب
  title: string // عنوان الكتاب
  author: string // اسم المؤلف
  progress: number // نسبة التقدم في القراءة
}
