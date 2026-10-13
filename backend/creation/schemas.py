from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class OfferCreate(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=1000)


class Offer(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    status: str
    created_at: datetime
    owner_id: int
    reserved_by: Optional[int] = None


class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(max_length=128)


class UserPublic(BaseModel):
    id: int
    name: str
    email: EmailStr

class Token(BaseModel):
    access_token: str
    token_type: str