from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, EmailStr, Field

Einheit = Literal["kg", "g", "Stück", "Bund", "Liter"]


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