from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field

Einheit = Literal["kg", "g", "Stück", "Bund", "Liter"]


# ---------- Offers ----------


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
    menge: float
    einheit: Einheit = "Stück"
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


class Token(BaseModel):
    access_token: str
    token_type: str


# ---------- Aufgaben ----------


class AufgabeCreate(BaseModel):
    title: str


class Aufgabe(BaseModel):
    id: int
    title: str
    done: bool
    created_at: datetime

class FavoritCreate(BaseModel):
    recipe_id: int


class Favorit(BaseModel):
    id: int
    recipe_id: int
    created_at: datetime


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