from datetime import date, datetime
from typing import Literal, Optional

import re

from pydantic import BaseModel, EmailStr, Field, field_validator

Einheit = Literal["kg", "g", "Stück", "Bund", "Liter"]
Prioritaet = Literal["hoch", "mittel", "niedrig"]
Aufgabenkategorie = Literal[
    "allgemein", "garten", "küche", "einkochen", "einkauf"
]
# the name of the second category ("abendessen") is still open
Rezeptkategorie = Literal["haltbarmachen", "abendessen"]


# ---------- Offers (Ernte teilen) ----------


class OfferCreate(BaseModel):
    title: str
    description: Optional[str] = None
    menge: float = Field(default=1, gt=0)
    einheit: Einheit = "Stück"
    location: str


class Offer(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    status: str
    created_at: datetime
    owner_id: int
    owner_name: str
    reserved_by: Optional[int] = None
    reserved_by_name: Optional[str] = None
    menge: float
    einheit: Einheit
    location: str


# ---------- Users and auth ----------


class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(max_length=128)


class UserPublic(BaseModel):
    id: int
    name: Optional[str] = None
    email: EmailStr


# ---------- Profile ("Mein Konto") ----------


class UserMe(UserPublic):
    """Own account data, including the optional profile fields."""

    wohnort: Optional[str] = None
    plz: Optional[str] = None
    ueber_mich: Optional[str] = None


class ProfilUpdate(BaseModel):
    """PATCH /me: only the fields that are sent are changed. An empty text
    (or null) removes the saved value."""

    wohnort: Optional[str] = Field(default=None, max_length=100)
    plz: Optional[str] = None
    ueber_mich: Optional[str] = Field(default=None, max_length=1000)

    @field_validator("wohnort", "plz", "ueber_mich", mode="before")
    @classmethod
    def _strip(cls, v):
        return v.strip() if isinstance(v, str) else v

    @field_validator("plz")
    @classmethod
    def _plz_pruefen(cls, v):
        if v and not re.fullmatch(r"[0-9]{5}", v):
            raise ValueError("PLZ muss leer sein oder aus 5 Ziffern bestehen")
        return v


class ProfilPublic(BaseModel):
    """Public profile: no email and no other private account data."""

    id: int
    name: Optional[str] = None
    wohnort: Optional[str] = None
    plz: Optional[str] = None
    ueber_mich: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str


class ActivityRequest(BaseModel):
    """Body of POST /auth/activity. The server uses its own clock to extend
    the session, so this client time is accepted but not trusted."""

    last_activity_at: Optional[datetime] = None


class VerifyRequest(BaseModel):
    token: str


class ResendRequest(BaseModel):
    email: EmailStr


# ---------- Nachrichten (Chat) ----------


class NachrichtCreate(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    # only needed when the offer owner writes: who should receive it
    an: Optional[int] = None


class Nachricht(BaseModel):
    id: int
    offer_id: int
    sender_id: int
    recipient_id: int
    text: str
    created_at: datetime
    gelesen: bool


class Konversation(BaseModel):
    offer_id: int
    offer_title: str
    partner_id: int
    partner_name: str
    letzte_nachricht: str
    letzte_zeit: datetime
    ungelesen: int


# ---------- Aufgaben ----------


class AufgabeCreate(BaseModel):
    title: str
    priority: Prioritaet = "mittel"
    kategorie: Aufgabenkategorie = "allgemein"


class Aufgabe(BaseModel):
    id: int
    title: str
    priority: Prioritaet
    kategorie: Aufgabenkategorie
    done: bool
    created_at: datetime


# ---------- Rezepte ----------


class RezeptCreate(BaseModel):
    title: str = Field(min_length=1)
    beschreibung: Optional[str] = None
    zutaten: list[str] = []
    vorbereitung: Optional[str] = None
    schritte: list[str] = []
    fertigstellung: Optional[str] = None
    tipps: Optional[str] = None
    kategorie: Rezeptkategorie = "abendessen"
    image_url: Optional[str] = None


class Rezept(BaseModel):
    id: int
    owner_id: Optional[int] = None
    owner_name: Optional[str] = None
    title: str
    beschreibung: Optional[str] = None
    zutaten: list[str]
    vorbereitung: Optional[str] = None
    schritte: list[str]
    fertigstellung: Optional[str] = None
    tipps: Optional[str] = None
    kategorie: Rezeptkategorie
    image_url: Optional[str] = None
    created_at: datetime


# ---------- Favoriten ----------


class FavoritCreate(BaseModel):
    recipe_id: int


class Favorit(BaseModel):
    id: int
    recipe_id: int
    created_at: datetime


# ---------- Wecker (Vorratskammer) ----------


class WeckerCreate(BaseModel):
    produkt: str
    einlegedatum: date
    fertig_am: datetime


class Wecker(BaseModel):
    id: int
    produkt: str
    einlegedatum: date
    fertig_am: datetime
    created_at: datetime