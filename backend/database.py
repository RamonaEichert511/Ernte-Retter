import os

import psycopg
from psycopg.rows import dict_row

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set, e.g. "
        "postgresql://ernte_user:ernte_pass@db:5432/ernte_db"
    )


def db():
    """Open a connection for use in a `with` block.

    On success the transaction is committed, on an exception it is rolled
    back, and the connection is closed either way.
    """
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


def init_db():
    with db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        # one account per email, regardless of upper/lower case
        conn.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx "
            "ON users (LOWER(email))"
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS offers (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT NULL,
                status TEXT NOT NULL DEFAULT 'verfügbar',
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                owner_id INTEGER NOT NULL REFERENCES users(id),
                reserved_by INTEGER REFERENCES users(id),
                menge NUMERIC(10, 2) NOT NULL DEFAULT 1,
                einheit TEXT NOT NULL DEFAULT 'Stück',
                location TEXT NOT NULL DEFAULT ''
            )
            """
        )
        conn.execute(
            "ALTER TABLE offers ADD COLUMN IF NOT EXISTS einheit TEXT NOT NULL DEFAULT 'Stück'"
        )
        conn.execute(
            "ALTER TABLE offers ALTER COLUMN menge TYPE NUMERIC(10, 2)"
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS aufgaben (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                done BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
)