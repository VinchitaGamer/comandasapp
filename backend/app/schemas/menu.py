from pydantic import BaseModel
from typing import List, Optional

class ModifierBase(BaseModel):
    name: str
    extra_price: float = 0.0
    is_available: bool = True

class ModifierCreate(ModifierBase):
    pass

class ModifierResponse(ModifierBase):
    id: int
    plate_id: int

    class Config:
        from_attributes = True

class PlateBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    category: str
    is_visible: bool = True

class PlateCreate(PlateBase):
    pass

class PlateResponse(PlateBase):
    id: int
    modifiers: List[ModifierResponse] = []

    class Config:
        from_attributes = True
