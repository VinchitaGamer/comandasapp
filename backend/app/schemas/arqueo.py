import datetime
from pydantic import BaseModel
from typing import Optional

class ArqueoCreate(BaseModel):
    initial_cash: float

class ArqueoClose(BaseModel):
    actual_cash: float
    observations: Optional[str] = None

class ArqueoResponse(BaseModel):
    id: int
    user_id: int
    username: str
    opened_at: datetime.datetime
    closed_at: Optional[datetime.datetime] = None
    status: str
    initial_cash: float
    estimated_cash: float
    actual_cash: float
    card_sales: float
    difference: float
    observations: Optional[str] = None

    class Config:
        from_attributes = True
