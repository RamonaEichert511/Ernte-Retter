import hashlib
import os
import secrets
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import WebSocket, WebSocketDisconnect
import jwt
from auth import SECRET_KEY, ALGORITHM

import psycopg.errors
from fastapi import (
    BackgroundTasks,
    Depends,
    FastAPI,
    HTTPException,
    Query,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm

from auth import (
    create_access_token,
    create_session,
    end_session,
    get_current_user,
    hash_password,
    touch_session,
    verify_password,
)
from creation.schemas import (
    ActivityRequest,
    Aufgabe,
    AufgabeCreate,
    Favorit,
    FavoritCreate,
    Konversation,
    Nachricht,
    NachrichtCreate,
    Offer,
    OfferCreate,
    ProfilPublic,
    ProfilUpdate,
    Rezept,
    RezeptCreate,
    Rezeptkategorie,
    ResendRequest,
    Token,
    UserCreate,
    UserMe,
    UserPublic,
    VerifyRequest,
    Wecker,
    WeckerCreate,
    UserUpdate,
)
from database import db, init_db
from email_service import (
    FRONTEND_URL,
    mail_kontakt,
    mail_reserviert,
    mail_verifizierung,
    offer_link,
    send_email,
)


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
#--------- web socket class definition --------------

# 1. Define the ConnectionManager class
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, user_id: int, message: dict):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                await connection.send_json(message)

# 2. Instantiate the manager globally so it can be used everywhere in main.py
manager = ConnectionManager()

# -----------------jwt --------------------

from jwt.exceptions import InvalidTokenError

def get_user_from_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
    except (InvalidTokenError, KeyError, ValueError):
        return None

    with db() as conn:
        return conn.execute(
            "SELECT id, name, email FROM users WHERE id = %s", (user_id,)
        ).fetchone()

# ---------- Auth ----------


def neues_token() -> tuple[str, str]:
    """Return (token for the email link, hash to store in the database)."""
    token = secrets.token_urlsafe(32)
    return token, hashlib.sha256(token.encode()).hexdigest()


@app.post(
    "/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED
)
def register(user: UserCreate, background_tasks: BackgroundTasks):
    token, token_hash = neues_token()
    with db() as conn:
        try:
            row = conn.execute(
                "INSERT INTO users "
                "(name, email, password_hash, email_verified, "
                "verify_token_hash, verify_expires) "
                "VALUES (%s, %s, %s, FALSE, %s, NOW() + INTERVAL '24 hours') "
                "RETURNING id, name, email",
                (
                    user.name.strip(),
                    user.email.lower(),
                    hash_password(user.password),
                    token_hash,
                ),
            ).fetchone()
        except psycopg.errors.UniqueViolation:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email is already registered",
            )
    subject, body = mail_verifizierung(
        row["name"], f"{FRONTEND_URL}/verify?token={token}"
    )
    background_tasks.add_task(send_email, row["email"], subject, body)
    return row


@app.post("/verify-email", status_code=status.HTTP_204_NO_CONTENT)
def verify_email(data: VerifyRequest):
    token_hash = hashlib.sha256(data.token.encode()).hexdigest()
    with db() as conn:
        row = conn.execute(
            "UPDATE users SET email_verified = TRUE, "
            "verify_token_hash = NULL, verify_expires = NULL "
            "WHERE verify_token_hash = %s AND verify_expires > NOW() "
            "RETURNING id",
            (token_hash,),
        ).fetchone()
        if row is None:
            raise HTTPException(
                status_code=400, detail="Link ungültig oder abgelaufen"
            )


@app.post("/resend-verification", status_code=status.HTTP_202_ACCEPTED)
def resend_verification(data: ResendRequest, background_tasks: BackgroundTasks):
    token, token_hash = neues_token()
    with db() as conn:
        row = conn.execute(
            "UPDATE users SET verify_token_hash = %s, "
            "verify_expires = NOW() + INTERVAL '24 hours' "
            "WHERE email = %s AND NOT email_verified RETURNING name, email",
            (token_hash, data.email.lower()),
        ).fetchone()
    if row is not None:
        subject, body = mail_verifizierung(
            row["name"], f"{FRONTEND_URL}/verify?token={token}"
        )
        background_tasks.add_task(send_email, row["email"], subject, body)
    # same answer whether or not the account exists
    return {
        "detail": "Falls ein unbestätigtes Konto existiert, "
        "wurde eine E-Mail gesendet."
    }


@app.post("/login", response_model=Token)
def login(data: OAuth2PasswordRequestForm = Depends()):
    with db() as conn:
        row = conn.execute(
            "SELECT id, password_hash, email_verified FROM users "
            "WHERE email = %s",
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

    if not row["email_verified"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="E-Mail-Adresse ist noch nicht bestätigt",
        )

    # every login starts its own session (one per device)
    session_id = create_session(row["id"])
    return {
        "access_token": create_access_token(row["id"], session_id),
        "token_type": "bearer",
    }



@app.put("/me", response_model=UserPublic)
def update_me(data: UserUpdate, current_user: dict = Depends(get_current_user)):
    with db() as conn:
        updates = []
        params = []
        if data.name is not None:
            updates.append("name = %s")
            params.append(data.name.strip())
        if data.password is not None:
            updates.append("password_hash = %s")
            params.append(hash_password(data.password))
        
        if not updates:
            return current_user

        params.append(current_user["id"])
        row = conn.execute(
            f"UPDATE users SET {', '.join(updates)} WHERE id = %s RETURNING id, name, email",
            tuple(params)
        ).fetchone()
        return row

@app.post("/auth/activity", response_model=Token)
def auth_activity(
    data: Optional[ActivityRequest] = None,
    current_user: dict = Depends(get_current_user),
):
    """Explicit activity report from the frontend: extends the session and
    returns a renewed token. get_current_user already rejects expired or
    ended sessions with 401; touch_session checks again atomically."""
    if not touch_session(current_user["session_id"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return {
        "access_token": create_access_token(
            current_user["id"], current_user["session_id"]
        ),
        "token_type": "bearer",
    }


@app.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def auth_logout(current_user: dict = Depends(get_current_user)):
    end_session(current_user["session_id"])

# ---------- Profile ("Mein Konto") ----------

# the only profile fields a user can change (also protects the column names)
PROFILFELDER = ("wohnort", "plz", "ueber_mich")

ME_SELECT = (
    "SELECT id, name, email, wohnort, plz, ueber_mich FROM users "
    "WHERE id = %s"
)


@app.get("/me", response_model=UserMe)
def get_me(current_user: dict = Depends(get_current_user)):
    with db() as conn:
        return conn.execute(ME_SELECT, (current_user["id"],)).fetchone()


@app.patch("/me", response_model=UserMe)
def update_me(
    data: ProfilUpdate, current_user: dict = Depends(get_current_user)
):
    # only fields that were sent; an empty text or null removes the value
    gesendet = data.model_dump(exclude_unset=True)
    felder = [f for f in PROFILFELDER if f in gesendet]
    with db() as conn:
        if felder:
            conn.execute(
                "UPDATE users SET "
                + ", ".join(f"{f} = %s" for f in felder)
                + " WHERE id = %s",
                (*[gesendet[f] or None for f in felder], current_user["id"]),
            )
        return conn.execute(ME_SELECT, (current_user["id"],)).fetchone()


@app.get("/users/{user_id}/profile", response_model=ProfilPublic)
def get_public_profile(user_id: int):
    # no login required; only public fields are selected
    with db() as conn:
        row = conn.execute(
            "SELECT id, name, wohnort, plz, ueber_mich FROM users "
            "WHERE id = %s",
            (user_id,),
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="User not found")
        return row


# ---------- Offers (Ernte teilen) ----------


OFFER_SELECT = (
    "SELECT o.*, u.name AS owner_name, r.name AS reserved_by_name "
    "FROM offers o JOIN users u ON u.id = o.owner_id "
    "LEFT JOIN users r ON r.id = o.reserved_by "
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
    offer_id: int,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    with db() as conn:
        row = conn.execute(
            "UPDATE offers SET status = 'reserviert', reserved_by = %s "
            "WHERE id = %s AND status = 'verfügbar' RETURNING id",
            (current_user["id"], offer_id),
        ).fetchone()
        if row is not None:
            offer = conn.execute(
                OFFER_SELECT + "WHERE o.id = %s", (offer_id,)
            ).fetchone()
            owner = conn.execute(
                "SELECT email FROM users WHERE id = %s", (offer["owner_id"],)
            ).fetchone()
            subject, body = mail_reserviert(
                offer["owner_name"], offer["title"], offer_link(offer_id)
            )
            background_tasks.add_task(send_email, owner["email"], subject, body)
            return offer
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
            "WHERE id = %s AND (reserved_by = %s OR owner_id= %s) RETURNING id",
            (offer_id, current_user["id"], current_user["id"]),
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


# ---------- Nachrichten (Chat) ----------
#
# A conversation is always between the owner of an offer and one other
# person. The other person starts it; the owner can answer (or write to
# whoever reserved the offer).


def _zwischen(offer_id: int, a: int, b: int):
    """SQL condition and params for messages between users a and b."""
    return (
        "offer_id = %s AND ((sender_id = %s AND recipient_id = %s) "
        "OR (sender_id = %s AND recipient_id = %s))",
        (offer_id, a, b, b, a),
    )


@app.post(
    "/offers/{offer_id}/nachrichten",
    response_model=Nachricht,
    status_code=status.HTTP_201_CREATED,
)
def send_nachricht(
    offer_id: int,
    data: NachrichtCreate,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    me = current_user["id"]
    text = data.text.strip()
    if not text:
        raise HTTPException(status_code=422, detail="Nachricht ist leer")
    with db() as conn:
        offer = conn.execute(
            "SELECT id, title, owner_id, reserved_by FROM offers WHERE id = %s",
            (offer_id,),
        ).fetchone()
        if offer is None:
            raise HTTPException(status_code=404, detail="Offer not found")

        if me == offer["owner_id"]:
            partner = data.an
            if partner is None or partner == me:
                raise HTTPException(
                    status_code=422, detail="Empfänger fehlt"
                )
            hat_geschrieben = conn.execute(
                "SELECT 1 FROM nachrichten WHERE offer_id = %s "
                "AND sender_id = %s AND recipient_id = %s LIMIT 1",
                (offer_id, partner, me),
            ).fetchone()
            if hat_geschrieben is None and offer["reserved_by"] != partner:
                raise HTTPException(
                    status_code=403,
                    detail="Du kannst nur Personen anschreiben, "
                    "die sich gemeldet oder reserviert haben",
                )
        else:
            partner = offer["owner_id"]

        bedingung, params = _zwischen(offer_id, me, partner)
        bisher = conn.execute(
            f"SELECT 1 FROM nachrichten WHERE {bedingung} LIMIT 1", params
        ).fetchone()

        row = conn.execute(
            "INSERT INTO nachrichten (offer_id, sender_id, recipient_id, text) "
            "VALUES (%s, %s, %s, %s) RETURNING *",
            (offer_id, me, partner, text),
        ).fetchone()

        # email only for the first message of a conversation
        if bisher is None:
            empfaenger = conn.execute(
                "SELECT email FROM users WHERE id = %s", (partner,)
            ).fetchone()
            if empfaenger is not None:
                subject, body = mail_kontakt(offer["title"], offer_link(offer_id))
                background_tasks.add_task(
                    send_email, empfaenger["email"], subject, body
                )

        # Trigger the WebSocket notification asynchronously via background tasks
        background_tasks.add_task(
            manager.send_personal_message,
            partner,
            {
                "type": "new_message",
                "id": row["id"],
                "offer_id": offer_id,
                "sender_id": me,
                "text": text,
            },
        )

        return row


@app.get("/offers/{offer_id}/nachrichten", response_model=list[Nachricht])
def list_nachrichten(
    offer_id: int,
    mit: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
):
    me = current_user["id"]
    with db() as conn:
        offer = conn.execute(
            "SELECT owner_id FROM offers WHERE id = %s", (offer_id,)
        ).fetchone()
        if offer is None:
            raise HTTPException(status_code=404, detail="Offer not found")
        if mit is None:
            if me == offer["owner_id"]:
                raise HTTPException(
                    status_code=422, detail="Parameter 'mit' fehlt"
                )
            mit = offer["owner_id"]

        bedingung, params = _zwischen(offer_id, me, mit)
        rows = conn.execute(
            f"SELECT * FROM nachrichten WHERE {bedingung} "
            "ORDER BY created_at, id",
            params,
        ).fetchall()
        conn.execute(
            "UPDATE nachrichten SET gelesen = TRUE WHERE offer_id = %s "
            "AND sender_id = %s AND recipient_id = %s AND NOT gelesen",
            (offer_id, mit, me),
        )
        return rows


@app.get("/nachrichten/inbox", response_model=list[Konversation])
def inbox(current_user: dict = Depends(get_current_user)):
    me = current_user["id"]
    with db() as conn:
        rows = conn.execute(
            "WITH k AS ("
            "  SELECT n.*, CASE WHEN n.sender_id = %s "
            "    THEN n.recipient_id ELSE n.sender_id END AS partner_id "
            "  FROM nachrichten n "
            "  WHERE n.sender_id = %s OR n.recipient_id = %s"
            ") "
            "SELECT DISTINCT ON (k.offer_id, k.partner_id) "
            "  k.offer_id, o.title AS offer_title, k.partner_id, "
            "  u.name AS partner_name, k.text AS letzte_nachricht, "
            "  k.created_at AS letzte_zeit, "
            "  (SELECT COUNT(*) FROM nachrichten x "
            "   WHERE x.offer_id = k.offer_id AND x.sender_id = k.partner_id "
            "   AND x.recipient_id = %s AND NOT x.gelesen)::int AS ungelesen "
            "FROM k JOIN offers o ON o.id = k.offer_id "
            "JOIN users u ON u.id = k.partner_id "
            "ORDER BY k.offer_id, k.partner_id, k.created_at DESC",
            (me, me, me, me),
        ).fetchall()
    return sorted(rows, key=lambda r: r["letzte_zeit"], reverse=True)

@app.delete("/offers/{offer_id}/nachrichten", status_code=status.HTTP_204_NO_CONTENT)
def delete_nachrichten(
    offer_id: int,
    mit: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
):
    me = current_user["id"]
    with db() as conn:
        # Check if the offer exists
        offer = conn.execute(
            "SELECT owner_id FROM offers WHERE id = %s", (offer_id,)
        ).fetchone()
        if offer is None:
            raise HTTPException(status_code=404, detail="Offer not found")
            
        # If the current user is the owner, they must specify who they want to delete the chat with
        if mit is None:
            if me == offer["owner_id"]:
                raise HTTPException(
                    status_code=422, detail="Parameter 'mit' fehlt"
                )
            mit = offer["owner_id"]

        # Use the existing _zwischen helper to find messages between 'me' and 'mit'
        bedingung, params = _zwischen(offer_id, me, mit)
        
        # Delete the messages for this conversation
        conn.execute(
            f"DELETE FROM nachrichten WHERE {bedingung}",
            params,
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
            "(owner_id, title, beschreibung, zutaten, vorbereitung, schritte, "
            "fertigstellung, tipps, kategorie, image_url) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
            (
                current_user["id"],
                data.title,
                data.beschreibung,
                data.zutaten,
                data.vorbereitung,
                data.schritte,
                data.fertigstellung,
                data.tipps,
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

#------- web socket -------------

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def notify_user(self, user_id: int, data: dict):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                await connection.send_json(data)

@app.websocket("/ws/notifications")
async def websocket_notifications(websocket: WebSocket, token: str = Query(...)):
    try:
        # Token validieren
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
    except (InvalidTokenError, KeyError, ValueError):
        await websocket.close(code=4001)
        return

    await manager.connect(user_id, websocket)
    try:
        while True:
            # Verbindung offen halten und auf eingehende Pings/Nachrichten lauschen falls nötig
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)