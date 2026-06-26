from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import datetime

from app.database import get_db
from app.models.user import User
from app.models.plate import Plate, Modifier
from app.models.order import Order, OrderDetail, OrderDetailModifier
from app.models.arqueo import Arqueo
from app.schemas.order import OrderCreate, OrderResponse, OrderPaymentUpdate
from app.core.security import get_current_user_payload, RoleChecker
from app.websockets.manager import manager

router = APIRouter(prefix="/comandas", tags=["Order Management"])

# Permissions
is_mesero_or_admin = RoleChecker(allowed_roles=["MESERO", "ADMIN"])
is_cocina_or_admin = RoleChecker(allowed_roles=["COCINA", "ADMIN"])
any_role = RoleChecker(allowed_roles=["MESERO", "COCINA", "ADMIN"])
is_admin = RoleChecker(allowed_roles=["ADMIN"])

def format_order(order: Order) -> dict:
    """Helper to convert Order SQLAlchemy model to custom dictionary format representing OrderResponse."""
    details_responses = []
    total_price = 0.0
    
    for detail in order.details:
        plate = detail.plate
        detail_total = plate.price
        
        modifier_responses = []
        for odm in detail.modifiers:
            mod = odm.modifier
            detail_total += mod.extra_price
            modifier_responses.append({
                "id": mod.id,
                "plate_id": mod.plate_id,
                "name": mod.name,
                "extra_price": mod.extra_price,
                "is_available": mod.is_available
            })
            
        item_total = detail_total * detail.quantity
        total_price += item_total
        
        details_responses.append({
            "id": detail.id,
            "plate_id": detail.plate_id,
            "plate_name": plate.name,
            "plate_price": plate.price,
            "quantity": detail.quantity,
            "comment": detail.comment,
            "modifiers": modifier_responses
        })
        
    return {
        "id": order.id,
        "table_number": order.table_number,
        "waiter_id": order.waiter_id,
        "waiter_username": order.waiter.username if order.waiter else "Desconocido",
        "status": order.status,
        "created_at": order.created_at,
        "updated_at": order.updated_at,
        "details": details_responses,
        "total_price": round(total_price, 2),
        "arqueo_id": order.arqueo_id,
        "payment_method": order.payment_method,
        "payment_cash": order.payment_cash,
        "payment_qr": order.payment_qr,
        "payment_card": order.payment_card
    }

@router.get("", response_model=List[OrderResponse])
def get_orders(
    status_filter: Optional[str] = None, 
    hours_limit: Optional[int] = None,
    db: Session = Depends(get_db), 
    user_payload: dict = Depends(any_role)
):
    """
    Get list of orders.
    Can be filtered by status (PENDIENTE, EN_PROCESO, LISTO, ENTREGADO, CANCELADO). Supports comma-separated list of statuses.
    Can be limited to orders updated in the last N hours.
    """
    query = db.query(Order).options(
        joinedload(Order.waiter),
        joinedload(Order.details).joinedload(OrderDetail.plate),
        joinedload(Order.details).joinedload(OrderDetail.modifiers).joinedload(OrderDetailModifier.modifier)
    )
    
    # Filter by status if provided
    if status_filter:
        status_list = [s.strip().upper() for s in status_filter.split(",")]
        query = query.filter(Order.status.in_(status_list))
    else:
        # Default behavior: Cocina and Mesero want to see active/uncompleted orders.
        # Active orders are PENDIENTE, EN_PROCESO, and LISTO.
        # ENTREGADO and CANCELADO are considered completed and archived.
        query = query.filter(Order.status.in_(["PENDIENTE", "EN_PROCESO", "LISTO"]))
        
    if hours_limit:
        cutoff = datetime.datetime.utcnow() - datetime.timedelta(hours=hours_limit)
        query = query.filter(Order.updated_at >= cutoff)
        
    orders = query.order_by(Order.created_at.asc()).all()
    return [format_order(o) for o in orders]

@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    order_in: OrderCreate, 
    db: Session = Depends(get_db), 
    user_payload: dict = Depends(is_mesero_or_admin)
):
    waiter_id = user_payload.get("id")
    
    # Create the Order header
    new_order = Order(
        table_number=order_in.table_number,
        waiter_id=waiter_id,
        status="PENDIENTE"
    )
    db.add(new_order)
    db.flush()  # Populates new_order.id
    
    # Process details
    for item in order_in.items:
        # Verify plate exists and is visible
        plate = db.query(Plate).filter(Plate.id == item.plate_id).first()
        if not plate:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Plato ID {item.plate_id} no existe")
        if not plate.is_visible:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Plato {plate.name} no está disponible para ordenar")
            
        detail = OrderDetail(
            order_id=new_order.id,
            plate_id=item.plate_id,
            quantity=item.quantity,
            comment=item.comment
        )
        db.add(detail)
        db.flush()  # Populates detail.id
        
        # Verify and add modifiers
        for mod_id in item.modifier_ids:
            modifier = db.query(Modifier).filter(Modifier.id == mod_id, Modifier.plate_id == item.plate_id).first()
            if not modifier:
                db.rollback()
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Modificador ID {mod_id} no existe o no corresponde a este plato")
            if not modifier.is_available:
                db.rollback()
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Modificador {modifier.name} no está disponible")
                
            odm = OrderDetailModifier(
                detail_id=detail.id,
                modifier_id=mod_id
            )
            db.add(odm)
            
    db.commit()
    db.refresh(new_order)
    
    # Reload with all relationships loaded for formatting
    order_loaded = db.query(Order).options(
        joinedload(Order.waiter),
        joinedload(Order.details).joinedload(OrderDetail.plate),
        joinedload(Order.details).joinedload(OrderDetail.modifiers).joinedload(OrderDetailModifier.modifier)
    ).filter(Order.id == new_order.id).first()
    
    formatted_order = format_order(order_loaded)
    
    # Notify cocina and admin via Websockets
    await manager.broadcast_to_role("COCINA", {"type": "NEW_ORDER", "order": formatted_order})
    await manager.broadcast_to_role("ADMIN", {"type": "NEW_ORDER", "order": formatted_order})
    
    return formatted_order

@router.patch("/{order_id}", response_model=OrderResponse)
async def update_order_status(
    order_id: int, 
    status_update: str, 
    db: Session = Depends(get_db), 
    user_payload: dict = Depends(any_role)
):
    """
    Update order status.
    Possible states: PENDIENTE, EN_PROCESO, LISTO, ENTREGADO
    """
    status_upper = status_update.upper()
    if status_upper not in ["PENDIENTE", "EN_PROCESO", "LISTO", "ENTREGADO", "CANCELADO"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Estado de comanda no válido")
        
    order = db.query(Order).options(
        joinedload(Order.waiter),
        joinedload(Order.details).joinedload(OrderDetail.plate),
        joinedload(Order.details).joinedload(OrderDetail.modifiers).joinedload(OrderDetailModifier.modifier)
    ).filter(Order.id == order_id).first()
    
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comanda no encontrada")
        
    # Role validation based on state transition
    role = user_payload.get("role")
    if status_upper == "CANCELADO" and role not in ["ADMIN"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo el administrador puede cancelar comandas de emergencia")
    if status_upper in ["EN_PROCESO", "LISTO"] and role not in ["COCINA", "ADMIN"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo la cocina puede cambiar la comanda a preparándose o lista")
    if status_upper == "ENTREGADO" and role not in ["MESERO", "ADMIN"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo el mesero puede marcar la comanda como entregada")
        
    order.status = status_upper
    order.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(order)
    
    formatted_order = format_order(order)
    
    # Broadcast updates
    if status_upper == "LISTO":
        # Alert meseros!
        await manager.broadcast_to_role("MESERO", {"type": "ORDER_READY", "order": formatted_order})
    else:
        # Alert everyone else of standard update
        await manager.broadcast_all({"type": "ORDER_UPDATED", "order": formatted_order})
        
    return formatted_order


@router.patch("/{order_id}/pago", response_model=OrderResponse)
async def update_order_payment(
    order_id: int,
    payment_in: OrderPaymentUpdate,
    db: Session = Depends(get_db),
    user_payload: dict = Depends(any_role)
):
    """
    Update the payment method and details for an order.
    Validates split payments and associates with the active arqueo.
    """
    order = db.query(Order).options(
        joinedload(Order.waiter),
        joinedload(Order.details).joinedload(OrderDetail.plate),
        joinedload(Order.details).joinedload(OrderDetail.modifiers).joinedload(OrderDetailModifier.modifier)
    ).filter(Order.id == order_id).first()
    
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comanda no encontrada")
        
    # Check if the order is already linked to a closed arqueo
    if order.arqueo_id:
        closed_arqueo = db.query(Arqueo).filter(Arqueo.id == order.arqueo_id, Arqueo.status == "CERRADO").first()
        if closed_arqueo:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se puede modificar el pago de una comanda asociada a un arqueo cerrado"
            )
            
    # Calculate the total price of the order dynamically
    total_price = 0.0
    for detail in order.details:
        detail_total = detail.plate.price
        for odm in detail.modifiers:
            detail_total += odm.modifier.extra_price
        total_price += detail_total * detail.quantity
        
    total_price = round(total_price, 2)
    
    # Check for active arqueo
    active_arqueo = db.query(Arqueo).filter(Arqueo.status == "ABIERTO").first()
    if not active_arqueo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debe abrir la caja (iniciar arqueo) antes de registrar un pago"
        )
        
    method_upper = payment_in.payment_method.upper()
    if method_upper not in ["EFECTIVO", "QR", "TARJETA", "DIVIDIDO"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Método de pago no válido")
        
    if method_upper == "DIVIDIDO":
        # Validate that the sum equals total price
        paid_sum = round(payment_in.payment_cash + payment_in.payment_qr + payment_in.payment_card, 2)
        if paid_sum != total_price:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El monto total pagado (S/. {paid_sum:.2f}) no coincide con el total de la comanda (S/. {total_price:.2f})"
            )
        order.payment_cash = payment_in.payment_cash
        order.payment_qr = payment_in.payment_qr
        order.payment_card = payment_in.payment_card
    else:
        # Direct payment methods
        order.payment_cash = total_price if method_upper == "EFECTIVO" else 0.0
        order.payment_qr = total_price if method_upper == "QR" else 0.0
        order.payment_card = total_price if method_upper == "TARJETA" else 0.0
        
    order.payment_method = method_upper
    order.arqueo_id = active_arqueo.id
    order.updated_at = datetime.datetime.utcnow()
    
    db.commit()
    db.refresh(order)
    
    formatted_order = format_order(order)
    await manager.broadcast_all({"type": "ORDER_UPDATED", "order": formatted_order})
    
    return formatted_order


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_order(
    order_id: int,
    db: Session = Depends(get_db),
    user_payload: dict = Depends(is_admin)
):
    """
    Delete a comanda entirely (Admin emergency feature).
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comanda no encontrada")
        
    # Check closed arqueo
    if order.arqueo_id:
        closed_arqueo = db.query(Arqueo).filter(Arqueo.id == order.arqueo_id, Arqueo.status == "CERRADO").first()
        if closed_arqueo:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se puede eliminar una comanda asociada a un arqueo cerrado"
            )
            
    db.delete(order)
    db.commit()
    
    # Broadcast deletion to all WebSocket clients
    await manager.broadcast_all({"type": "ORDER_DELETED", "order_id": order_id})
    return None
