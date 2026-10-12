from datetime import datetime

from pydantic import BaseModel, Field


class OfferCreate(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)


class Offer(BaseModel):
    id: int
    title: str
    description: str | None
    status: str
    created_at: datetime