import os
import sys
from pathlib import Path

from sqlalchemy import func, text
from sqlalchemy.engine import URL, make_url
from sqlalchemy.exc import ArgumentError, SQLAlchemyError
from sqlmodel import Session, create_engine, select

from models import Book


EXPECTED_BOOKS = {
    1: ("The Midnight Library", "Matt Haig", 100),
    2: ("The Midnight Library", "Matt Haig", 56),
    3: ("Finding Me", "Gamel Omar", 1),
}


class MigrationSafetyError(Exception):
    pass


def read_source_books() -> list[Book]:
    source_path = Path(__file__).with_name("reader_ai.db")
    if not source_path.is_file():
        raise MigrationSafetyError("The local SQLite database file was not found.")

    source_url = (
        f"sqlite:///file:{source_path.as_posix()}?mode=ro&uri=true"
    )
    source_engine = create_engine(
        source_url,
        connect_args={"check_same_thread": False},
    )
    try:
        with Session(source_engine) as session:
            books = session.exec(select(Book).order_by(Book.id)).all()
    finally:
        source_engine.dispose()

    actual_books = {
        book.id: (book.title, book.author, book.progress)
        for book in books
        if book.id is not None
    }
    if len(actual_books) != len(books):
        raise MigrationSafetyError(
            "The SQLite source contains a book without an ID; nothing was migrated."
        )

    missing_ids = sorted(EXPECTED_BOOKS.keys() - actual_books.keys())
    unexpected_ids = sorted(actual_books.keys() - EXPECTED_BOOKS.keys())
    changed_ids = sorted(
        book_id
        for book_id in EXPECTED_BOOKS.keys() & actual_books.keys()
        if EXPECTED_BOOKS[book_id] != actual_books[book_id]
    )
    if missing_ids or unexpected_ids or changed_ids:
        raise MigrationSafetyError(
            "SQLite contents do not match the reviewed three-book snapshot "
            f"(missing IDs: {missing_ids}; unexpected IDs: {unexpected_ids}; "
            f"changed IDs: {changed_ids}). Nothing was migrated."
        )

    return books


def get_postgres_url() -> URL:
    if os.environ.get("MIGRATION_MAINTENANCE_CONFIRMED") != "YES":
        raise MigrationSafetyError(
            "Stop the API and all other database clients, close their connections, "
            "and keep them stopped until migration completes. Set "
            "MIGRATION_MAINTENANCE_CONFIRMED=YES only after confirming this."
        )

    raw_url = os.environ.get("DATABASE_URL", "").strip()
    if not raw_url:
        raise MigrationSafetyError(
            "DATABASE_URL is not set. No database connection was attempted."
        )

    try:
        url = make_url(raw_url)
    except ArgumentError:
        raise MigrationSafetyError(
            "DATABASE_URL is invalid. Its value has not been displayed."
        ) from None

    if url.drivername in {"postgres", "postgresql"}:
        url = url.set(drivername="postgresql+psycopg")
    elif url.drivername != "postgresql+psycopg":
        raise MigrationSafetyError(
            "DATABASE_URL must use PostgreSQL with the psycopg 3 driver."
        )

    return url


def book_values(book: Book) -> tuple[int | None, str, str, int]:
    return book.id, book.title, book.author, book.progress


def validate_postgres_schema(session: Session) -> None:
    schema_name = Book.__table__.schema or session.execute(
        text("SELECT current_schema()")
    ).scalar_one()
    table_name = Book.__table__.name

    column_rows = session.execute(
        text(
            "SELECT column_name, data_type, is_nullable "
            "FROM information_schema.columns "
            "WHERE table_schema = :schema_name AND table_name = :table_name"
        ),
        {"schema_name": schema_name, "table_name": table_name},
    ).all()
    actual_columns = {
        row.column_name: (row.data_type, row.is_nullable)
        for row in column_rows
    }
    expected_columns = {
        "id": ({"integer"}, "NO"),
        "title": ({"character varying", "text"}, "NO"),
        "author": ({"character varying", "text"}, "NO"),
        "progress": ({"integer"}, "NO"),
    }
    if set(actual_columns) != set(expected_columns):
        raise MigrationSafetyError(
            "The PostgreSQL books table has missing or unexpected columns; "
            "nothing was migrated."
        )

    for column_name, (allowed_types, expected_nullable) in (
        expected_columns.items()
    ):
        actual_type, actual_nullable = actual_columns[column_name]
        if (
            actual_type not in allowed_types
            or actual_nullable != expected_nullable
        ):
            raise MigrationSafetyError(
                "The PostgreSQL books table column definitions do not match "
                f"the Book model ({column_name}); nothing was migrated."
            )

    primary_key_columns = session.execute(
        text(
            "SELECT key_column.column_name "
            "FROM information_schema.table_constraints AS table_constraint "
            "JOIN information_schema.key_column_usage AS key_column "
            "ON key_column.constraint_catalog = table_constraint.constraint_catalog "
            "AND key_column.constraint_schema = table_constraint.constraint_schema "
            "AND key_column.constraint_name = table_constraint.constraint_name "
            "AND key_column.table_schema = table_constraint.table_schema "
            "AND key_column.table_name = table_constraint.table_name "
            "WHERE table_constraint.constraint_type = 'PRIMARY KEY' "
            "AND table_constraint.table_schema = :schema_name "
            "AND table_constraint.table_name = :table_name "
            "ORDER BY key_column.ordinal_position"
        ),
        {"schema_name": schema_name, "table_name": table_name},
    ).scalars().all()
    if primary_key_columns != ["id"]:
        raise MigrationSafetyError(
            "The PostgreSQL books table primary key does not match the Book "
            "model; nothing was migrated."
        )


def sync_postgres_sequence(session: Session) -> None:
    sequence_name = session.execute(
        text(
            "SELECT pg_get_serial_sequence(:table_name, :column_name)"
        ),
        {
            "table_name": Book.__table__.fullname,
            "column_name": Book.__table__.c.id.name,
        },
    ).scalar_one_or_none()
    if sequence_name is None:
        raise MigrationSafetyError(
            "Could not identify the PostgreSQL ID sequence; the transaction "
            "will be rolled back."
        )

    max_id = session.execute(select(func.max(Book.id))).scalar_one() or 0
    sequence_identifier = session.execute(
        text(
            "SELECT format('%I.%I', sequence_schema.nspname, sequence_class.relname) "
            "FROM pg_class AS sequence_class "
            "JOIN pg_namespace AS sequence_schema "
            "ON sequence_schema.oid = sequence_class.relnamespace "
            "WHERE sequence_class.oid = CAST(:sequence_name AS regclass)"
        ),
        {"sequence_name": sequence_name},
    ).scalar_one_or_none()
    if sequence_identifier is None:
        raise MigrationSafetyError(
            "Could not safely resolve the PostgreSQL ID sequence; the transaction "
            "will be rolled back."
        )

    increment_by = session.execute(
        text(
            "SELECT seqincrement FROM pg_sequence "
            "WHERE seqrelid = CAST(:sequence_name AS regclass)"
        ),
        {"sequence_name": sequence_name},
    ).scalar_one_or_none()
    if increment_by is None or increment_by <= 0:
        raise MigrationSafetyError(
            "The PostgreSQL ID sequence has no supported positive increment; "
            "the transaction will be rolled back."
        )

    sequence_value, is_called = session.execute(
        text(f"SELECT last_value, is_called FROM {sequence_identifier}")
    ).one()

    next_sequence_value = (
        sequence_value + increment_by if is_called else sequence_value
    )
    next_value_after_max_id = max_id + increment_by
    restart_value = max(next_sequence_value, next_value_after_max_id)

    session.execute(
        text(f"ALTER SEQUENCE {sequence_identifier} RESTART WITH {restart_value}")
    )


def migrate() -> tuple[int, int]:
    source_books = read_source_books()
    postgres_url = get_postgres_url()
    target_engine = create_engine(postgres_url, pool_pre_ping=True)
    try:
        inserted_count = 0

        with Session(target_engine) as session:
            with session.begin():
                server_version = session.execute(
                    text("SELECT current_setting('server_version_num')::integer")
                ).scalar_one()
                if server_version < 100000:
                    raise MigrationSafetyError(
                        "PostgreSQL 10 or later is required for safe sequence "
                        "synchronization; nothing was migrated."
                    )

                table_name = Book.__table__.fullname
                table_exists = session.execute(
                    text("SELECT to_regclass(:table_name)"),
                    {"table_name": table_name},
                ).scalar_one_or_none()
                if table_exists is None:
                    raise MigrationSafetyError(
                        "The PostgreSQL books table does not exist. Create the "
                        "schema separately before running this data migration."
                    )

                dialect = session.get_bind().dialect
                quoted_table_name = dialect.identifier_preparer.format_table(
                    Book.__table__
                )
                session.execute(
                    text(
                        f"LOCK TABLE {quoted_table_name} "
                        "IN ACCESS EXCLUSIVE MODE"
                    )
                )
                validate_postgres_schema(session)

                target_books = session.exec(select(Book)).all()
                target_by_id = {book.id: book for book in target_books}
                books_to_insert: list[Book] = []

                for source_book in source_books:
                    existing = target_by_id.get(source_book.id)
                    duplicate_ids = sorted(
                        target_book.id
                        for target_book in target_books
                        if (
                            target_book.title,
                            target_book.author,
                            target_book.progress,
                        )
                        == (
                            source_book.title,
                            source_book.author,
                            source_book.progress,
                        )
                        and target_book.id != source_book.id
                    )
                    if duplicate_ids:
                        raise MigrationSafetyError(
                            "A matching PostgreSQL book already exists under "
                            f"ID(s) {duplicate_ids}; nothing was changed."
                        )

                    if existing is not None:
                        if book_values(existing) != book_values(source_book):
                            raise MigrationSafetyError(
                                "A PostgreSQL row has a conflicting value for "
                                f"book ID {source_book.id}; nothing was changed."
                            )
                        continue

                    books_to_insert.append(
                        Book(
                            id=source_book.id,
                            title=source_book.title,
                            author=source_book.author,
                            progress=source_book.progress,
                        )
                    )

                session.add_all(books_to_insert)
                session.flush()
                inserted_count = len(books_to_insert)

                target_after_migration = session.exec(
                    select(Book).where(
                        Book.id.in_([book.id for book in source_books])
                    )
                ).all()
                target_by_id_after = {
                    book.id: book for book in target_after_migration
                }
                for source_book in source_books:
                    migrated_book = target_by_id_after.get(source_book.id)
                    if (
                        migrated_book is None
                        or book_values(migrated_book) != book_values(source_book)
                    ):
                        raise MigrationSafetyError(
                            "PostgreSQL verification failed for book ID "
                            f"{source_book.id}; the transaction will be rolled back."
                        )

                sync_postgres_sequence(session)

        return inserted_count, len(source_books) - inserted_count
    finally:
        target_engine.dispose()


def main() -> int:
    try:
        inserted_count, existing_count = migrate()
    except MigrationSafetyError as error:
        print(f"Migration stopped safely: {error}", file=sys.stderr)
        return 1
    except (SQLAlchemyError, OSError, ImportError) as error:
        print(
            "Migration failed "
            f"({type(error).__name__}); diagnostic details were omitted "
            "to protect database credentials.",
            file=sys.stderr,
        )
        return 1

    print(
        "Migration verified: "
        f"{inserted_count} inserted, "
        f"{existing_count} already present and identical; "
        "PostgreSQL ID sequence synchronized."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
