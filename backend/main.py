import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from creation.schemas import Offer, OfferCreate
from database import init_db, get_connection


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()  # runs once at startup
    yield


app = FastAPI(title="Ernte Retter API", lifespan=lifespan)

origins = [
    o.strip()
    for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
]
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
        cur = conn.execute(
            "SELECT id, title, description, status, created_at "
            "FROM offers ORDER BY id DESC"
        )
        return cur.fetchall()
    finally:
        conn.close()


@app.post("/offers", response_model=Offer, status_code=201)
def create_offer(offer: OfferCreate):
    conn = get_connection()
    try:
        cur = conn.execute(
            "INSERT INTO offers (title, description) VALUES (%s, %s) "
            "RETURNING id, title, description, status, created_at",
            (offer.title, offer.description),
        )
        row = cur.fetchone()
        conn.commit()
        return row
    finally:
        conn.close()


@app.put("/offers/{offer_id}/reserve", response_model=Offer)
def reserve_offer(offer_id: int):
    conn = get_connection()
    try:
        # Only succeeds if the offer exists AND is still available
        cur = conn.execute(
            "UPDATE offers SET status = 'reserviert' "
            "WHERE id = %s AND status = 'verfügbar' "
            "RETURNING id, title, description, status, created_at",
            (offer_id,),
        )
        row = cur.fetchone()
        conn.commit()

        if row is not None:
            return row

        # Nothing was updated: either the id does not exist or it was already reserved
        exists = conn.execute(
            "SELECT 1 FROM offers WHERE id = %s", (offer_id,)
        ).fetchone()
        if exists is None:
            raise HTTPException(status_code=404, detail="Offer not found")
        raise HTTPException(status_code=409, detail="Offer already reserved")
    finally:
        conn.close()