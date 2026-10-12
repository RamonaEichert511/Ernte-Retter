import os
import time

import psycopg
from psycopg.rows import dict_row

# In Docker, DATABASE_URL is passed in automatically (host "db").
# The fallback is for running locally against a Postgres on localhost.
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://ernte_user:ernte_pass@localhost:5432/ernte_db",
)


def get_connection():
    """Open a new connection. Call this once per request and close it afterwards."""
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)  # rows come back as dicts


def init_db(retries=10, delay=2):
    """Create the offers table if it does not exist yet.

    Postgres can take a few seconds to accept connections after the container
    starts, so we retry a few times before giving up.
    """
    for attempt in range(1, retries + 1):
        try:
            conn = get_connection()
            break
        except psycopg.OperationalError:
            if attempt == retries:
                raise
            print(f"Database not ready (attempt {attempt}/{retries}), retrying...")
            time.sleep(delay)

    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS offers (
                id          SERIAL PRIMARY KEY,
                title       TEXT NOT NULL,
                description TEXT,
                status      TEXT NOT NULL DEFAULT 'verfügbar'
                            CHECK (status IN ('verfügbar', 'reserviert')),
                created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
            )
            """
        )
        conn.commit()
    finally:
        conn.close()