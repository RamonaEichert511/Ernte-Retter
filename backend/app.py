from fastapi import FastAPI
from pydantic import BaseModel
import os
import psycopg
from motor.motor_asyncio import AsyncIOMotorClient

app = FastAPI()

# --- Datenbank-Verbindungen ---

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://admin:geheim123@postgres:5432/rezepte"
)
MONGO_URL = os.getenv(
    "MONGO_URL",
    "mongodb://admin:geheim123@mongo:27017/?authSource=admin"
)
mongo_client = AsyncIOMotorClient(MONGO_URL)
mongo_db = mongo_client.rezeptbuch


def get_pg():
    return psycopg.connect(DATABASE_URL)


@app.on_event("startup")
def startup():
    conn = get_pg()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS kategorien (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL
        )
    """)
    conn.commit()
    cur.close()
    conn.close()


# --- Kategorien (PostgreSQL) ---

class KategorieInput(BaseModel):
    name: str


@app.get("/api/kategorien")
def get_kategorien():
    conn = get_pg()
    cur = conn.cursor()
    cur.execute("SELECT id, name FROM kategorien ORDER BY id")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [{"id": r[0], "name": r[1]} for r in rows]


@app.post("/api/kategorien")
def add_kategorie(kat: KategorieInput):
    conn = get_pg()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO kategorien (name) VALUES (%s) RETURNING id",
        (kat.name,)
    )
    new_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    return {"id": new_id, "name": kat.name}


# --- Rezepte (MongoDB) ---

class RezeptInput(BaseModel):
    titel: str
    kategorie_id: int
    zutaten: list[str]
    schritte: list[str]


@app.get("/api/rezepte")
async def get_rezepte(kategorie: int = None):
    query = {}
    if kategorie is not None:
        query["kategorie_id"] = kategorie

    rezepte = []
    async for doc in mongo_db.rezepte.find(query):
        doc["_id"] = str(doc["_id"])
        rezepte.append(doc)
    return rezepte


@app.post("/api/rezepte")
async def add_rezept(rezept: RezeptInput):
    doc = rezept.model_dump()
    result = await mongo_db.rezepte.insert_one(doc)
    return {"id": str(result.inserted_id), "titel": rezept.titel}


# --- Health ---

@app.get("/api/health")
async def health():
    status = {"postgres": "error", "mongo": "error"}
    try:
        conn = get_pg()
        cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.close()
        conn.close()
        status["postgres"] = "connected"
    except Exception as e:
        status["postgres"] = str(e)
    try:
        await mongo_client.admin.command("ping")
        status["mongo"] = "connected"
    except Exception as e:
        status["mongo"] = str(e)
    return status