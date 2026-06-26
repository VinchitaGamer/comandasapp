from fastapi import FastAPI, WebSocket, WebSocketDisconnect, status, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

from app.core.config import settings
from app.database import Base, engine
from app.core.seed import seed_db
from app.websockets.manager import manager
from app.api import auth, menu, comandas, arqueo

# Create DB tables and seed data on startup
Base.metadata.create_all(bind=engine)
seed_db()

app = FastAPI(
    title="Sistema de Comandas API",
    description="Backend para la gestión de comandas en tiempo real",
    version="1.0.0"
)

# CORS configuration
origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount REST API routers
app.include_router(auth.router, prefix="/api")
app.include_router(menu.router, prefix="/api")
app.include_router(comandas.router, prefix="/api")
app.include_router(arqueo.router, prefix="/api")

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Sistema de Comandas API funcionando correctamente"}

# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: Optional[str] = Query(None)):
    """
    WebSocket endpoint for real-time order updates.
    Expects JWT token in the query string: ws://domain/ws?token=<JWT_TOKEN>
    """
    if not token:
        await websocket.accept()
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Token es requerido")
        return

    role = None
    try:
        role = await manager.connect(websocket, token)
    except Exception:
        # Connection closed inside manager
        return

    try:
        while True:
            # Keep connection open. If client sends "ping", respond "pong".
            # Otherwise we ignore incoming messages as client states are updated via REST.
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        if role:
            manager.disconnect(websocket, role)
