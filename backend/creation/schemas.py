from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field

Einheit = Literal["kg", "g", "Stück", "Bund", "Liter"]


# ---------- Offers ----------


class OfferCreate(BaseModel):
    title: str
    description: Optional[str] = None
    menge: float = Field(gt=0)
    einheit: Einheit
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