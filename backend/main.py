import os
from contextlib import asynccontextmanager
from typing import List
from fastapi.security import OAuth2PasswordRequestForm
import psycopg.errors
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from database import db, init_db
from creation.schemas import LoginRequest, Offer, OfferCreate, Token, UserCreate, UserPublic


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Ernte-Retter API", lifespan=lifespan)

origins = [
    o.strip()
    for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type"],
)


# ---------- Auth ----------


@app.post(
    "/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED
)
def register(user: UserCreate):
    with db() as conn:
        try:
            row = conn.execute(
                "INSERT INTO users (name, email, password_hash) "
                "VALUES (%s, %s, %s) RETURNING id, name, email",
                (user.name.strip(), user.email.lower(), hash_password(user.password)),
            ).fetchone()
        except psycopg.errors.UniqueViolation:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email is already registered",
            )
        return row


@app.post("/login", response_model=Token)
def login(data: OAuth2PasswordRequestForm = Depends()):
    with db() as conn:
        row = conn.execute(
            "SELECT id, password_hash FROM users WHERE username = %s",
            (data.username,),
        ).fetchone()

    if row is None or not verify_password(
        data.password,
        row["password_hash"],
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Benutzername oder Passwort ist falsch",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return {
        "access_token": create_access_token(row["id"]),
        "token_type": "bearer",
    }


@app.get("/auth/me", response_model=UserPublic)
def me(current_user: dict = Depends(get_current_user)):
    return current_user


# ---------- Offers ----------


@app.get("/offers", response_model=List[Offer])
def list_offers():
    with db() as conn:
        rows = conn.execute(
            "SELECT * FROM offers ORDER BY created_at DESC, id DESC"
        ).fetchall()
    return rows


@app.post("/offers", response_model=Offer, status_code=status.HTTP_201_CREATED)
def create_offer(offer: OfferCreate, current_user: dict = Depends(get_current_user)):
    with db() as conn:
        return conn.execute(
            "INSERT INTO offers (title, description, owner_id) "
            "VALUES (%s, %s, %s) RETURNING *",
            (offer.title, offer.description, current_user["id"]),
        ).fetchone()


@app.put("/offers/{offer_id}/reserve", response_model=Offer)
def reserve_offer(offer_id: int, current_user: dict = Depends(get_current_user)):
    with db() as conn:
        row = conn.execute(
            "UPDATE offers SET status = 'reserviert', reserved_by = %s "
            "WHERE id = %s AND status = 'verfügbar' RETURNING *",
            (current_user["id"], offer_id),
        ).fetchone()
        if row is not None:
            return row
        exists = conn.execute(
            "SELECT 1 FROM offers WHERE id = %s", (offer_id,)
        ).fetchone()
        if exists is None:
            raise HTTPException(status_code=404, detail="Offer not found")
        raise HTTPException(status_code=409, detail="Offer is already reserved")


@app.delete("/offers/{offer_id}/reserve", response_model=Offer)
def withdraw_reservation(
    offer_id: int, current_user: dict = Depends(get_current_user)
):
    with db() as conn:
        row = conn.execute(
            "UPDATE offers SET status = 'verfügbar', reserved_by = NULL "
            "WHERE id = %s AND reserved_by = %s RETURNING *",
            (offer_id, current_user["id"]),
        ).fetchone()
        if row is not None:
            return row
        exists = conn.execute(
            "SELECT 1 FROM offers WHERE id = %s", (offer_id,)
        ).fetchone()
        if exists is None:
            raise HTTPException(status_code=404, detail="Offer not found")
        raise HTTPException(
            status_code=403, detail="You have not reserved this offer"
        )


@app.delete("/offers/{offer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_offer(offer_id: int, current_user: dict = Depends(get_current_user)):
    with db() as conn:
        row = conn.execute(
            "SELECT owner_id FROM offers WHERE id = %s", (offer_id,)
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Offer not found")
        if row["owner_id"] != current_user["id"]:
            raise HTTPException(
                status_code=403, detail="You can only delete your own offers"
            )
        conn.execute("DELETE FROM offers WHERE id = %s", (offer_id,))
