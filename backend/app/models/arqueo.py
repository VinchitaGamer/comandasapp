import datetime
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.database import Base

class Arqueo(Base):
    __tablename__ = "arqueos"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    opened_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    closed_at = Column(DateTime, nullable=True)
    status = Column(String, default="ABIERTO", nullable=False)  # ABIERTO, CERRADO
    initial_cash = Column(Float, nullable=False, default=0.0)
    estimated_cash = Column(Float, nullable=False, default=0.0)
    actual_cash = Column(Float, nullable=False, default=0.0)
    card_sales = Column(Float, nullable=False, default=0.0)
    difference = Column(Float, nullable=False, default=0.0)
    observations = Column(String, nullable=True)

    user = relationship("User")
    orders = relationship("Order", back_populates="arqueo")
