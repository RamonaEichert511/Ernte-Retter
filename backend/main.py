import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from database import get_connection, init_db
from schemas import Offer, OfferCreate


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()  # runs once at startup
    yield


app = FastAPI(title="Harvest Saver API", lifespan=lifespan)

origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/offers", response_model=list[Offer])
def list_offers():
    # TODO: SELECT all offers, return a list of dicts
    ...


@app.post("/offers", response_model=Offer, status_code=201)
def create_offer(offer: OfferCreate):
    # TODO: INSERT, then SELECT the new row using cursor.lastrowid
    ...


@app.put("/offers/{offer_id}/reserve", response_model=Offer)
def reserve_offer(offer_id: int):
    # TODO: 404 if missing, 409 if already reserved, else UPDATE status
    ...