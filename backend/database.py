import os

# نستورد الأدوات اللازمة للتعامل مع قاعدة البيانات
from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy import inspect, text

# نستورد نموذج الكتاب حتى يتعرّف SQLModel على الجدول المطلوب إنشاؤه
from models import Book

# نحدد اسم ملف قاعدة البيانات الذي سيُنشأ داخل مجلد backend
sqlite_url = "sqlite:///./reader_ai.db"
database_url = os.getenv("DATABASE_URL") or sqlite_url

if database_url.startswith("postgres://"):
    database_url = database_url.replace(
        "postgres://", "postgresql+psycopg://", 1
    )
elif database_url.startswith("postgresql://"):
    database_url = database_url.replace(
        "postgresql://", "postgresql+psycopg://", 1
    )

engine_options = (
    {"connect_args": {"check_same_thread": False}}
    if database_url.startswith("sqlite:")
    else {}
)

# ننشئ محرك الاتصال بقاعدة البيانات
engine = create_engine(database_url, **engine_options)


# ننشئ دالة لتجهيز جداول قاعدة البيانات
def create_db_and_tables():
    # ننشئ الجداول المعرّفة في نماذج SQLModel
    SQLModel.metadata.create_all(engine)


def ensure_book_status_column():
    columns = inspect(engine).get_columns("book")
    if any(column["name"] == "status" for column in columns):
        return False, 0

    with engine.begin() as connection:
        connection.execute(
            text(
                "ALTER TABLE book ADD COLUMN status VARCHAR(20) "
                "NOT NULL DEFAULT 'want_to_read'"
            )
        )
        finished_result = connection.execute(
            text("UPDATE book SET status = 'finished' WHERE progress >= 100")
        )
        reading_result = connection.execute(
            text(
                "UPDATE book SET status = 'reading' "
                "WHERE progress > 0 AND progress < 100"
            )
        )
        rows_backfilled = finished_result.rowcount + reading_result.rowcount

    return True, rows_backfilled


# ننشئ دالة تفتح جلسة للتعامل مع قاعدة البيانات
def get_session():
    # نفتح جلسة اتصال جديدة
    with Session(engine) as session:
        # نسمح للـ API باستخدام الجلسة
        yield session
