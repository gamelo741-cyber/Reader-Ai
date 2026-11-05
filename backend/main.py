import logging
import os
from typing import Literal

# نستورد FastAPI والأدوات اللازمة للتعامل مع الطلبات والأخطاء
from fastapi import FastAPI, Depends, HTTPException, Response

# نستورد أدوات التحقق من بيانات التحديث
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

# نستورد أدوات التعامل مع قاعدة البيانات
from sqlmodel import Session, select

# نستورد إعدادات الاتصال بقاعدة البيانات
from database import (
    create_db_and_tables,
    ensure_book_status_column,
    engine,
    get_session,
)

# نستورد نموذج الكتاب
from models import Book

# نستورد أداة السماح للواجهة بالاتصال بالخادم
from fastapi.middleware.cors import CORSMiddleware


# ننشئ تطبيق Reader AI API
app = FastAPI(title="Reader AI API")
logger = logging.getLogger("uvicorn.error")

BookStatus = Literal["want_to_read", "reading", "finished"]

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


class BookUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = None
    author: str | None = None
    status: BookStatus | None = None

    @field_validator("title", "author", "status", mode="before")
    @classmethod
    def reject_null_values(cls, value):
        if value is None:
            raise ValueError("This field cannot be null.")
        return value

    @field_validator("title", "author")
    @classmethod
    def normalize_text(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be empty.")
        if len(value) > 255:
            raise ValueError("This field cannot be longer than 255 characters.")
        return value

    @model_validator(mode="after")
    def require_update_field(self):
        if not self.model_fields_set:
            raise ValueError("At least one of title, author, or status must be provided.")
        return self


class BookCreate(BaseModel):
    id: int | None = None
    title: str
    author: str
    progress: int = Field(default=0, ge=0, le=100)
    status: BookStatus = "want_to_read"


# نحدد شكل البيانات التي نستقبلها عند تحديث التقدم
class ProgressUpdate(BaseModel):
    # نسمح بنسبة من صفر إلى 100 فقط
    progress: int = Field(ge=0, le=100)


# ننشئ جداول قاعدة البيانات عند بدء تشغيل الخادم
@app.on_event("startup")
def on_startup():
    logger.info("Allowed CORS origins: %s", allowed_origins)
    logger.info(
        "Database target: dialect=%s host=%s database=%s",
        engine.dialect.name,
        engine.url.host,
        engine.url.database,
    )

    # ننشئ الجداول إذا لم تكن موجودة
    create_db_and_tables()
    try:
        added, rows_backfilled = ensure_book_status_column()
    except Exception:
        logger.exception("Book status migration failed; startup will abort.")
        raise

    if added:
        logger.info(
            "Book status column added; rows backfilled: %s",
            rows_backfilled,
        )
    else:
        logger.info("Book status column already existed; rows backfilled: 0")


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


@app.patch("/books/{book_id}", response_model=Book)
def update_book(
    book_id: int,
    update: BookUpdate,
    session: Session = Depends(get_session),
):
    book = session.get(Book, book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found")

    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(book, field, value)

    session.add(book)
    session.commit()
    session.refresh(book)
    return book


@app.delete("/books/{book_id}", status_code=204)
def delete_book(book_id: int, session: Session = Depends(get_session)):
    book = session.get(Book, book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found")

    session.delete(book)
    session.commit()
    return Response(status_code=204)


# ننشئ رابطًا لإضافة كتاب جديد
@app.post("/books", response_model=Book, status_code=201)
def add_book(book: BookCreate, session: Session = Depends(get_session)):
    # نمنع إرسال رقم الكتاب عند إضافته لأول مرة
    if book.id is not None:
        # نوضح سبب رفض الطلب
        raise HTTPException(
            status_code=400,
            detail="لا ترسل id عند إضافة كتاب",
        )

    status = book.status
    if "status" not in book.model_fields_set and book.progress >= 100:
        status = "finished"

    new_book = Book(
        title=book.title,
        author=book.author,
        progress=book.progress,
        status=status,
    )

    # نضيف الكتاب إلى جلسة قاعدة البيانات
    session.add(new_book)

    # نحفظ الكتاب فعليًا
    session.commit()

    # نحدّث بيانات الكتاب للحصول على الرقم الذي أنشأته قاعدة البيانات
    session.refresh(new_book)

    # نرجع الكتاب بعد حفظه
    return new_book


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
    if update.progress >= 100:
        book.status = "finished"

    # نحفظ التغيير في قاعدة البيانات
    session.add(book)
    session.commit()

    # نحدّث بيانات الكتاب بعد الحفظ
    session.refresh(book)

    # نرجع بيانات الكتاب بعد التحديث
    return book
