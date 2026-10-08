import os
import sqlite3

DB_PATH = os.getenv("DB_PATH", "harvest.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    # TODO: CREATE TABLE IF NOT EXISTS offers (...)
    # columns: id, title, description, status, created_at
    conn.commit()
    conn.close()