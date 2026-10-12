import sqlite3
from pathlib import Path

# The database file lives next to this script, inside backend/
DB_PATH = Path(__file__).parent / "harvest.db"

STATUS_AVAILABLE = "verfügbar"
STATUS_RESERVED = "reserviert"


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


def get_all_offers():
    """Return all offers as a list of dicts, newest first."""
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT id, title, description, status, created_at "
            "FROM offers ORDER BY created_at DESC, id DESC"
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def get_offer(offer_id):
    """Return one offer as a dict, or None if the id does not exist."""
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT id, title, description, status, created_at "
            "FROM offers WHERE id = ?",
            (offer_id,),
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def create_offer(title, description=None):
    """Insert a new offer and return it as a dict."""
    conn = get_connection()
    try:
        cursor = conn.execute(
            "INSERT INTO offers (title, description) VALUES (?, ?)",
            (title, description),
        )
        conn.commit()
        new_id = cursor.lastrowid
    finally:
        conn.close()
    return get_offer(new_id)


def reserve_offer(offer_id):
    """Set an offer to 'reserviert'. Returns the updated offer, or None if the id does not exist."""
    conn = get_connection()
    try:
        cursor = conn.execute(
            "UPDATE offers SET status = ? WHERE id = ?",
            (STATUS_RESERVED, offer_id),
        )
        conn.commit()
        if cursor.rowcount == 0:
            return None
    finally:
        conn.close()
    return get_offer(offer_id)


if __name__ == "__main__":
    # Quick manual test: run with `python backend/database.py`
    init_db()
    first = create_offer("Tomaten", "Ca. 2 kg Cherrytomaten aus dem Garten")
    create_offer("Zucchini", "Drei große Zucchini")
    print("Created:", first)
    print("Reserved:", reserve_offer(first["id"]))
    print("Missing id:", reserve_offer(9999))
    print("All offers:")
    for offer in get_all_offers():
        print(" ", offer)