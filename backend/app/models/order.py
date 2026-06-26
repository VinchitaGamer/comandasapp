import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float
from sqlalchemy.orm import relationship
from app.database import Base

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    table_number = Column(Integer, nullable=False)
    waiter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="PENDIENTE", nullable=False)  # PENDIENTE, EN_PROCESO, LISTO, ENTREGADO, CANCELADO
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)
    arqueo_id = Column(Integer, ForeignKey("arqueos.id"), nullable=True)
    payment_method = Column(String, nullable=True)  # EFECTIVO, QR, TARJETA, DIVIDIDO
    payment_cash = Column(Float, default=0.0, nullable=False)
    payment_qr = Column(Float, default=0.0, nullable=False)
    payment_card = Column(Float, default=0.0, nullable=False)

    waiter = relationship("User")
    arqueo = relationship("Arqueo", back_populates="orders")

    details = relationship("OrderDetail", back_populates="order", cascade="all, delete-orphan")


class OrderDetail(Base):
    __tablename__ = "order_details"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    plate_id = Column(Integer, ForeignKey("plates.id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    comment = Column(String, nullable=True)

    order = relationship("Order", back_populates="details")
    plate = relationship("Plate")
    modifiers = relationship("OrderDetailModifier", back_populates="detail", cascade="all, delete-orphan")


class OrderDetailModifier(Base):
    __tablename__ = "order_detail_modifiers"

    id = Column(Integer, primary_key=True, index=True)
    detail_id = Column(Integer, ForeignKey("order_details.id", ondelete="CASCADE"), nullable=False)
    modifier_id = Column(Integer, ForeignKey("modifiers.id"), nullable=False)

    detail = relationship("OrderDetail", back_populates="modifiers")
    modifier = relationship("Modifier")
