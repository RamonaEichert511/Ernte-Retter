import os
import sqlite3
from pathlib import Path

# Location can be overridden with DATABASE_PATH (used in Docker with a volume).
# Locally it falls back to harvest.db next to this file.
DB_PATH = Path(os.getenv("DATABASE_PATH", Path(__file__).parent / "harvest.db"))


def get_connection():
    """Open a new connection. Call this once per request and close it afterwards."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # lets us turn rows into dicts
    return conn


def init_db():
    """Create the offers table if it does not exist yet. Safe to run on every startup."""
    conn = get_connection()
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS offers (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                title       TEXT NOT NULL,
                description TEXT,
                status      TEXT NOT NULL DEFAULT 'verfügbar'
                            CHECK (status IN ('verfügbar', 'reserviert')),
                created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.commit()
    finally:
        conn.close()