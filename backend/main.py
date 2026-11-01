import logging
import os

# نستورد FastAPI والأدوات اللازمة للتعامل مع الطلبات والأخطاء
from fastapi import FastAPI, Depends, HTTPException

# نستورد أدوات التحقق من بيانات التحديث
from pydantic import BaseModel, Field

# نستورد أدوات التعامل مع قاعدة البيانات
from sqlmodel import Session, select

# نستورد إعدادات الاتصال بقاعدة البيانات
from database import create_db_and_tables, engine, get_session

# نستورد نموذج الكتاب
from models import Book

# نستورد أداة السماح للواجهة بالاتصال بالخادم
from fastapi.middleware.cors import CORSMiddleware


# ننشئ تطبيق Reader AI API
app = FastAPI(title="Reader AI API")
logger = logging.getLogger("uvicorn.error")

local_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
configured_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip().rstrip("/")
]
if "*" in configured_origins:
    raise ValueError("CORS_ORIGINS must contain explicit origins, not '*'.")

allowed_origins = list(dict.fromkeys(local_origins + configured_origins))

# نسمح لواجهة React المحلية بالاتصال بالـ Backend
app.add_middleware(
    CORSMiddleware,
    # نسمح بعناوين الواجهة المحلية وعناوين CORS_ORIGINS الصريحة
    allow_origins=allowed_origins,
    # نسمح بأنواع طلبات HTTP المختلفة
    allow_methods=["*"],
    # نسمح بالترويسات اللازمة للطلبات
    allow_headers=["*"],
)


# نحدد شكل البيانات التي نستقبلها عند تحديث التقدم
class ProgressUpdate(BaseModel):
    # نسمح بنسبة من صفر إلى 100 فقط
    progress: int = Field(ge=0, le=100)


# ننشئ جداول قاعدة البيانات عند بدء تشغيل الخادم
@app.on_event("startup")
def on_startup():
    logger.info("Allowed CORS origins: %s", allowed_origins)
    logger.info("Database dialect: %s", engine.dialect.name)

    # ننشئ الجداول إذا لم تكن موجودة
    create_db_and_tables()


# ننشئ رابطًا للتأكد أن الـ API يعمل
@app.get("/")
def home():
    # نرجع رسالة نجاح
    return {"message": "Reader AI API يعمل بنجاح!"}


@app.get("/health")
def health():
    return {"status": "ok"}


# ننشئ رابطًا لجلب الكتب المحفوظة
@app.get("/books", response_model=list[Book])
def get_books(session: Session = Depends(get_session)):
    # نجهز استعلامًا لجلب جميع الكتب
    statement = select(Book)

    # ننفذ الاستعلام ونعيد النتائج
    return session.exec(statement).all()


# ننشئ رابطًا لإضافة كتاب جديد
@app.post("/books", response_model=Book, status_code=201)
def add_book(book: Book, session: Session = Depends(get_session)):
    # نمنع إرسال رقم الكتاب عند إضافته لأول مرة
    if book.id is not None:
        # نوضح سبب رفض الطلب
        raise HTTPException(
            status_code=400,
            detail="لا ترسل id عند إضافة كتاب",
        )

    # نضيف الكتاب إلى جلسة قاعدة البيانات
    session.add(book)

    # نحفظ الكتاب فعليًا
    session.commit()

    # نحدّث بيانات الكتاب للحصول على الرقم الذي أنشأته قاعدة البيانات
    session.refresh(book)

    # نرجع الكتاب بعد حفظه
    return book


# ننشئ رابطًا لتحديث نسبة التقدم لكتاب محدد
@app.patch("/books/{book_id}/progress", response_model=Book)
def update_book_progress(
    # نستقبل رقم الكتاب من الرابط
    book_id: int,

    # نستقبل نسبة التقدم الجديدة من جسم الطلب
    update: ProgressUpdate,

    # نفتح جلسة اتصال بقاعدة البيانات
    session: Session = Depends(get_session),
):
    # نبحث عن الكتاب باستخدام رقمه
    book = session.get(Book, book_id)

    # نرجع خطأ إذا لم نعثر على الكتاب
    if book is None:
        raise HTTPException(status_code=404, detail="الكتاب غير موجود")

    # نحدّث نسبة التقدم للكتاب
    book.progress = update.progress

    # نحفظ التغيير في قاعدة البيانات
    session.add(book)
    session.commit()

    # نحدّث بيانات الكتاب بعد الحفظ
    session.refresh(book)

    # نرجع بيانات الكتاب بعد التحديث
    return book
