from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from app.database import get_db
from app.models.plate import Plate, Modifier
from app.schemas.menu import PlateCreate, PlateResponse, ModifierCreate, ModifierResponse
from app.core.security import RoleChecker, decode_token, oauth2_scheme

router = APIRouter(prefix="/menu", tags=["Menu Management"])

# Dependency to check admin permissions
is_admin = RoleChecker(allowed_roles=["ADMIN"])

@router.get("", response_model=List[PlateResponse])
def get_menu(include_hidden: bool = False, db: Session = Depends(get_db)):
    """
    Get all plates on the menu. If include_hidden is True, all plates are returned.
    Otherwise, only visible plates are returned.
    """
    query = db.query(Plate).options(joinedload(Plate.modifiers))
    
    if not include_hidden:
        # Mesero and Cocina only see visible plates
        query = query.filter(Plate.is_visible == True)
        
    plates = query.all()
    
    # Filter out unavailable modifiers if they are not admin
    if not include_hidden:
        for plate in plates:
            plate.modifiers = [m for m in plate.modifiers if m.is_available]
            
    return plates

@router.post("/plates", response_model=PlateResponse, status_code=status.HTTP_201_CREATED)
def create_plate(plate_in: PlateCreate, db: Session = Depends(get_db), admin_payload: dict = Depends(is_admin)):
    new_plate = Plate(
        name=plate_in.name,
        description=plate_in.description,
        price=plate_in.price,
        category=plate_in.category,
        is_visible=plate_in.is_visible
    )
    db.add(new_plate)
    db.commit()
    db.refresh(new_plate)
    return new_plate

@router.put("/plates/{plate_id}", response_model=PlateResponse)
def update_plate(plate_id: int, plate_in: PlateCreate, db: Session = Depends(get_db), admin_payload: dict = Depends(is_admin)):
    plate = db.query(Plate).filter(Plate.id == plate_id).first()
    if not plate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plato no encontrado")
    
    plate.name = plate_in.name
    plate.description = plate_in.description
    plate.price = plate_in.price
    plate.category = plate_in.category
    plate.is_visible = plate_in.is_visible
    
    db.commit()
    db.refresh(plate)
    return plate

@router.delete("/plates/{plate_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plate(plate_id: int, db: Session = Depends(get_db), admin_payload: dict = Depends(is_admin)):
    plate = db.query(Plate).filter(Plate.id == plate_id).first()
    if not plate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plato no encontrado")
    
    db.delete(plate)
    db.commit()
    return None

# Modifier Management Endpoints
@router.post("/plates/{plate_id}/modifiers", response_model=ModifierResponse, status_code=status.HTTP_201_CREATED)
def create_modifier(plate_id: int, modifier_in: ModifierCreate, db: Session = Depends(get_db), admin_payload: dict = Depends(is_admin)):
    plate = db.query(Plate).filter(Plate.id == plate_id).first()
    if not plate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plato no encontrado")
        
    new_modifier = Modifier(
        plate_id=plate_id,
        name=modifier_in.name,
        extra_price=modifier_in.extra_price,
        is_available=modifier_in.is_available
    )
    db.add(new_modifier)
    db.commit()
    db.refresh(new_modifier)
    return new_modifier

@router.put("/modifiers/{modifier_id}", response_model=ModifierResponse)
def update_modifier(modifier_id: int, modifier_in: ModifierCreate, db: Session = Depends(get_db), admin_payload: dict = Depends(is_admin)):
    modifier = db.query(Modifier).filter(Modifier.id == modifier_id).first()
    if not modifier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Modificador no encontrado")
        
    modifier.name = modifier_in.name
    modifier.extra_price = modifier_in.extra_price
    modifier.is_available = modifier_in.is_available
    
    db.commit()
    db.refresh(modifier)
    return modifier

@router.delete("/modifiers/{modifier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_modifier(modifier_id: int, db: Session = Depends(get_db), admin_payload: dict = Depends(is_admin)):
    modifier = db.query(Modifier).filter(Modifier.id == modifier_id).first()
    if not modifier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Modificador no encontrado")
        
    db.delete(modifier)
    db.commit()
    return None
