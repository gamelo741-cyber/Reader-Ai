import os

# نستورد الأدوات اللازمة للتعامل مع قاعدة البيانات
from sqlmodel import SQLModel, Session, create_engine

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


# ننشئ دالة تفتح جلسة للتعامل مع قاعدة البيانات
def get_session():
    # نفتح جلسة اتصال جديدة
    with Session(engine) as session:
        # نسمح للـ API باستخدام الجلسة
        yield session
