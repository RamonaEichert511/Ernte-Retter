import os
from contextlib import asynccontextmanager
from typing import Optional

import psycopg.errors
from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm

from auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from creation.schemas import (
    Aufgabe,
    AufgabeCreate,
    Favorit,
    FavoritCreate,
    Offer,
    OfferCreate,
    Rezept,
    RezeptCreate,
    Rezeptkategorie,
    Token,
    UserCreate,
    UserPublic,
    Wecker,
    WeckerCreate,
)
from database import db, init_db


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
                (
                    user.name.strip(),
                    user.email.lower(),
                    hash_password(user.password),
                ),
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
            "SELECT id, password_hash FROM users WHERE email = %s",
            (data.username.lower(),),
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


@app.get("/me", response_model=UserPublic)
def get_me(current_user: UserPublic = Depends(get_current_user)):
    return current_user


# ---------- Offers (Ernte teilen) ----------


OFFER_SELECT = (
    "SELECT o.*, u.name AS owner_name "
    "FROM offers o JOIN users u ON u.id = o.owner_id "
)


@app.get("/offers", response_model=list[Offer])
def list_offers():
    with db() as conn:
        return conn.execute(
            OFFER_SELECT + "ORDER BY o.created_at DESC"
        ).fetchall()


@app.post("/offers", response_model=Offer)
def create_offer(
    data: OfferCreate, current_user: dict = Depends(get_current_user)
):
    with db() as conn:
        new = conn.execute(
            "INSERT INTO offers "
            "(title, description, menge, einheit, location, owner_id) "
            "VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
            (
                data.title,
                data.description,
                data.menge,
                data.einheit,
                data.location,
                current_user["id"],
            ),
        ).fetchone()
        return conn.execute(
            OFFER_SELECT + "WHERE o.id = %s", (new["id"],)
        ).fetchone()


@app.delete("/offers/{offer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_offer(
    offer_id: int, current_user: dict = Depends(get_current_user)
):
    with db() as conn:
        row = conn.execute(
            "DELETE FROM offers WHERE id = %s AND owner_id = %s RETURNING id",
            (offer_id, current_user["id"]),
        ).fetchone()
        if row is not None:
            return
        exists = conn.execute(
            "SELECT 1 FROM offers WHERE id = %s", (offer_id,)
        ).fetchone()
        if exists is None:
            raise HTTPException(status_code=404, detail="Offer not found")
        raise HTTPException(
            status_code=403, detail="You do not own this offer"
        )


@app.put("/offers/{offer_id}/reserve", response_model=Offer)
def reserve_offer(
    offer_id: int, current_user: dict = Depends(get_current_user)
):
    with db() as conn:
        row = conn.execute(
            "UPDATE offers SET status = 'reserviert', reserved_by = %s "
            "WHERE id = %s AND status = 'verfügbar' RETURNING id",
            (current_user["id"], offer_id),
        ).fetchone()
        if row is not None:
            return conn.execute(
                OFFER_SELECT + "WHERE o.id = %s", (offer_id,)
            ).fetchone()
        exists = conn.execute(
            "SELECT 1 FROM offers WHERE id = %s", (offer_id,)
        ).fetchone()
        if exists is None:
            raise HTTPException(status_code=404, detail="Offer not found")
        raise HTTPException(
            status_code=409, detail="Offer is already reserved"
        )


@app.delete("/offers/{offer_id}/reserve", response_model=Offer)
def withdraw_reservation(
    offer_id: int, current_user: dict = Depends(get_current_user)
):
    with db() as conn:
        row = conn.execute(
            "UPDATE offers SET status = 'verfügbar', reserved_by = NULL "
            "WHERE id = %s AND reserved_by = %s RETURNING id",
            (offer_id, current_user["id"]),
        ).fetchone()
        if row is not None:
            return conn.execute(
                OFFER_SELECT + "WHERE o.id = %s", (offer_id,)
            ).fetchone()
        exists = conn.execute(
            "SELECT 1 FROM offers WHERE id = %s", (offer_id,)
        ).fetchone()
        if exists is None:
            raise HTTPException(status_code=404, detail="Offer not found")
        raise HTTPException(
            status_code=403, detail="You have not reserved this offer"
        )


# ---------- Aufgaben ----------


@app.get("/aufgaben", response_model=list[Aufgabe])
def list_aufgaben(current_user: dict = Depends(get_current_user)):
    with db() as conn:
        return conn.execute(
            "SELECT * FROM aufgaben WHERE user_id = %s ORDER BY created_at",
            (current_user["id"],),
        ).fetchall()


@app.post("/aufgaben", response_model=Aufgabe)
def create_aufgabe(
    data: AufgabeCreate, current_user: dict = Depends(get_current_user)
):
    with db() as conn:
        return conn.execute(
            "INSERT INTO aufgaben (user_id, title, priority, kategorie) "
            "VALUES (%s, %s, %s, %s) RETURNING *",
            (current_user["id"], data.title, data.priority, data.kategorie),
        ).fetchone()


@app.put("/aufgaben/{aufgabe_id}/toggle", response_model=Aufgabe)
def toggle_aufgabe(
    aufgabe_id: int, current_user: dict = Depends(get_current_user)
):
    with db() as conn:
        row = conn.execute(
            "UPDATE aufgaben SET done = NOT done "
            "WHERE id = %s AND user_id = %s RETURNING *",
            (aufgabe_id, current_user["id"]),
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Aufgabe not found")
        return row


@app.delete("/aufgaben/{aufgabe_id}", status_code=204)
def delete_aufgabe(
    aufgabe_id: int, current_user: dict = Depends(get_current_user)
):
    with db() as conn:
        row = conn.execute(
            "DELETE FROM aufgaben WHERE id = %s AND user_id = %s RETURNING id",
            (aufgabe_id, current_user["id"]),
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Aufgabe not found")


# ---------- Rezepte ----------


REZEPT_SELECT = (
    "SELECT r.*, u.name AS owner_name "
    "FROM rezepte r LEFT JOIN users u ON u.id = r.owner_id "
)


@app.get("/rezepte", response_model=list[Rezept])
def list_rezepte(kategorie: Optional[Rezeptkategorie] = Query(default=None)):
    with db() as conn:
        if kategorie:
            return conn.execute(
                REZEPT_SELECT
                + "WHERE r.kategorie = %s ORDER BY r.created_at DESC",
                (kategorie,),
            ).fetchall()
        return conn.execute(
            REZEPT_SELECT + "ORDER BY r.created_at DESC"
        ).fetchall()


@app.get("/rezepte/{rezept_id}", response_model=Rezept)
def get_rezept(rezept_id: int):
    with db() as conn:
        row = conn.execute(
            REZEPT_SELECT + "WHERE r.id = %s", (rezept_id,)
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Rezept not found")
        return row


@app.post("/rezepte", response_model=Rezept, status_code=201)
def create_rezept(
    data: RezeptCreate, current_user: dict = Depends(get_current_user)
):
    with db() as conn:
        new = conn.execute(
            "INSERT INTO rezepte "
            "(owner_id, title, beschreibung, zutaten, schritte, kategorie, "
            "image_url) VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id",
            (
                current_user["id"],
                data.title,
                data.beschreibung,
                data.zutaten,
                data.schritte,
                data.kategorie,
                data.image_url,
            ),
        ).fetchone()
        return conn.execute(
            REZEPT_SELECT + "WHERE r.id = %s", (new["id"],)
        ).fetchone()


@app.delete("/rezepte/{rezept_id}", status_code=204)
def delete_rezept(
    rezept_id: int, current_user: dict = Depends(get_current_user)
):
    with db() as conn:
        row = conn.execute(
            "DELETE FROM rezepte WHERE id = %s AND owner_id = %s RETURNING id",
            (rezept_id, current_user["id"]),
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Rezept not found")


# ---------- Favoriten ----------


@app.get("/favoriten", response_model=list[Rezept])
def list_favoriten(current_user: dict = Depends(get_current_user)):
    with db() as conn:
        return conn.execute(
            "SELECT r.*, u.name AS owner_name FROM favoriten f "
            "JOIN rezepte r ON r.id = f.recipe_id "
            "LEFT JOIN users u ON u.id = r.owner_id "
            "WHERE f.user_id = %s ORDER BY f.created_at",
            (current_user["id"],),
        ).fetchall()


@app.post("/favoriten", response_model=Favorit)
def add_favorit(
    data: FavoritCreate, current_user: dict = Depends(get_current_user)
):
    with db() as conn:
        try:
            return conn.execute(
                "INSERT INTO favoriten (user_id, recipe_id) VALUES (%s, %s) "
                "ON CONFLICT (user_id, recipe_id) "
                "DO UPDATE SET recipe_id = EXCLUDED.recipe_id RETURNING *",
                (current_user["id"], data.recipe_id),
            ).fetchone()
        except psycopg.errors.ForeignKeyViolation:
            raise HTTPException(status_code=404, detail="Rezept not found")


@app.delete("/favoriten/{recipe_id}", status_code=204)
def remove_favorit(
    recipe_id: int, current_user: dict = Depends(get_current_user)
):
    with db() as conn:
        row = conn.execute(
            "DELETE FROM favoriten WHERE recipe_id = %s AND user_id = %s "
            "RETURNING id",
            (recipe_id, current_user["id"]),
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Favorit not found")


# ---------- Wecker (Vorratskammer) ----------


@app.get("/wecker", response_model=list[Wecker])
def list_wecker(current_user: dict = Depends(get_current_user)):
    with db() as conn:
        return conn.execute(
            "SELECT * FROM wecker WHERE user_id = %s ORDER BY fertig_am",
            (current_user["id"],),
        ).fetchall()


@app.post("/wecker", response_model=Wecker)
def create_wecker(
    data: WeckerCreate, current_user: dict = Depends(get_current_user)
):
    with db() as conn:
        return conn.execute(
            "INSERT INTO wecker (user_id, produkt, einlegedatum, fertig_am) "
            "VALUES (%s, %s, %s, %s) RETURNING *",
            (
                current_user["id"],
                data.produkt,
                data.einlegedatum,
                data.fertig_am,
            ),
        ).fetchone()


@app.delete("/wecker/{wecker_id}", status_code=204)
def delete_wecker(
    wecker_id: int, current_user: dict = Depends(get_current_user)
):
    with db() as conn:
        row = conn.execute(
            "DELETE FROM wecker WHERE id = %s AND user_id = %s RETURNING id",
            (wecker_id, current_user["id"]),
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Wecker not found")