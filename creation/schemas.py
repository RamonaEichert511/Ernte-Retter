from pydantic import BaseModel, Field


class OfferCreate(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    description: str = Field(default="", max_length=1000)


class Offer(BaseModel):
    id: int
    title: str
    description: str
    status: str
    created_at: str