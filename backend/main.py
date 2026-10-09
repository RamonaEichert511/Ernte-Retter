import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from database import get_connection, init_db
from creation.schemas import Offer, OfferCreate


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()  # runs once at startup
    yield


app = FastAPI(title="Ernte Retter API", lifespan=lifespan)

origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/offers", response_model=list[Offer])
def list_offers():
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT id, title, description, status, created_at "
            "FROM offers ORDER BY id DESC"
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()
    


@app.post("/offers", response_model=Offer, status_code=201)
def create_offer(offer: OfferCreate):
    conn = get_connection()
    try:
        cur = conn.execute(
            "INSERT INTO offers (title, description) VALUES (?, ?)",
            (offer.title, offer.description),
        )
        conn.commit()
        row = conn.execute(
            "SELECT id, title, description, status, created_at "
            "FROM offers WHERE id = ?",
            (cur.lastrowid,),
        ).fetchone()
        return dict(row)
    finally:
        conn.close()


@app.put("/offers/{offer_id}/reserve", response_model=Offer)
def reserve_offer(offer_id: int):
    conn = get_connection()
    try:
        cur = conn.execute(
            "UPDATE offers SET status = 'reserviert' "
            "WHERE id = ? AND status = 'verfügbar'",
            (offer_id,),
        )
        conn.commit()

        row = conn.execute(
            "SELECT id, title, description, status, created_at "
            "FROM offers WHERE id = ?",
            (offer_id,),
        ).fetchone()

        if row is None:
            raise HTTPException(status_code=404, detail="Offer not found")
        if cur.rowcount == 0:
            raise HTTPException(status_code=409, detail="Offer already reserved")
        return dict(row)
    finally:
        conn.close()