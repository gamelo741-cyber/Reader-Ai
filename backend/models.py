
# نستورد الأدوات اللازمة لتعريف نموذج الكتاب
from sqlmodel import SQLModel, Field


# نعرّف شكل الكتاب الذي سيُحفظ في قاعدة البيانات
class Book(SQLModel, table=True):
    # نحدد رقمًا فريدًا لكل كتاب، وتولّد قاعدة البيانات الرقم تلقائيًا
    id: int | None = Field(default=None, primary_key=True)

    # نخزّن عنوان الكتاب
    title: str

    # نخزّن اسم المؤلف
    author: str

    # نخزّن نسبة التقدم في القراءة، وتبدأ من صفر
    progress: int = Field(default=0, ge=0, le=100)
