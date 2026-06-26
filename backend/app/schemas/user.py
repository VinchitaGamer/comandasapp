from pydantic import BaseModel
from typing import Optional

class UserBase(BaseModel):
    username: str
    role: str  # ADMIN, MESERO, COCINA

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None
