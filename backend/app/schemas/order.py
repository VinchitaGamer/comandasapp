import datetime
from pydantic import BaseModel
from typing import List, Optional
from app.schemas.menu import ModifierResponse

class OrderDetailCreate(BaseModel):
    plate_id: int
    quantity: int = 1
    comment: Optional[str] = None
    modifier_ids: List[int] = []

class OrderCreate(BaseModel):
    table_number: int
    items: List[OrderDetailCreate]

class OrderDetailResponse(BaseModel):
    id: int
    plate_id: int
    plate_name: str
    plate_price: float
    quantity: int
    comment: Optional[str] = None
    modifiers: List[ModifierResponse] = []

    class Config:
        from_attributes = True

class OrderResponse(BaseModel):
    id: int
    table_number: int
    waiter_id: int
    waiter_username: str
    status: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    details: List[OrderDetailResponse] = []
    total_price: float
    arqueo_id: Optional[int] = None
    payment_method: Optional[str] = None
    payment_cash: float = 0.0
    payment_qr: float = 0.0
    payment_card: float = 0.0

    class Config:
        from_attributes = True

class OrderPaymentUpdate(BaseModel):
    payment_method: str  # EFECTIVO, QR, TARJETA, DIVIDIDO
    payment_cash: float = 0.0
    payment_qr: float = 0.0
    payment_card: float = 0.0

