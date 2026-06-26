from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Plate(Base):
    __tablename__ = "plates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    price = Column(Float, nullable=False)
    category = Column(String, nullable=False)  # Entradas, Fondos, Bebidas, Postres, etc.
    is_visible = Column(Boolean, default=True, nullable=False)

    modifiers = relationship("Modifier", back_populates="plate", cascade="all, delete-orphan")


class Modifier(Base):
    __tablename__ = "modifiers"

    id = Column(Integer, primary_key=True, index=True)
    plate_id = Column(Integer, ForeignKey("plates.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    extra_price = Column(Float, default=0.0, nullable=False)
    is_available = Column(Boolean, default=True, nullable=False)

    plate = relationship("Plate", back_populates="modifiers")
