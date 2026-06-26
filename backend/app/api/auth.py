from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, Token
from app.core.security import verify_password, get_password_hash, create_access_token, decode_token, oauth2_scheme

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.username, "role": user.role, "id": user.id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "username": user.username
    }

@router.post("/register", response_model=UserResponse)
def register(user_in: UserCreate, db: Session = Depends(get_db), current_user_token: str = Depends(oauth2_scheme)):
    # Check if this is the very first user in the database
    # If so, bypass token authentication so the system can be initialized
    user_count = db.query(User).count()
    
    if user_count > 0:
        # Standard flow: Verify that the current user is an ADMIN
        try:
            payload = decode_token(current_user_token)
            if payload.get("role") != "ADMIN":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No tienes permisos suficientes para registrar usuarios"
                )
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido o expirado para registrar"
            )

    # Check if username already exists
    existing_user = db.query(User).filter(User.username == user_in.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El nombre de usuario ya está registrado"
        )

    # Create new user
    new_user = User(
        username=user_in.username,
        password_hash=get_password_hash(user_in.password),
        role=user_in.role.upper()  # Ensure role is uppercase (ADMIN, MESERO, COCINA)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.get("/me", response_model=UserResponse)
def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    payload = decode_token(token)
    username = payload.get("sub")
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return user

@router.get("/users", response_model=list[UserResponse])
def list_users(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    payload = decode_token(token)
    if payload.get("role") != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos suficientes para ver los usuarios"
        )
    return db.query(User).all()
