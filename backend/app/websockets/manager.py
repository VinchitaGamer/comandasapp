import json
from typing import Dict, List
from fastapi import WebSocket, status
from app.core.security import decode_token

class ConnectionManager:
    def __init__(self):
        # Store active connections by role: ADMIN, MESERO, COCINA
        self.active_connections: Dict[str, List[WebSocket]] = {
            "ADMIN": [],
            "MESERO": [],
            "COCINA": []
        }

    async def connect(self, websocket: WebSocket, token: str) -> str:
        """
        Accepts the websocket connection, decodes and validates the JWT token,
        and registers the socket under the user's role.
        Returns the role of the connected user.
        """
        await websocket.accept()
        try:
            # Decode token to verify
            payload = decode_token(token)
            role = payload.get("role")
            if role not in self.active_connections:
                raise ValueError("Rol no válido")
            
            self.active_connections[role].append(websocket)
            return role
        except Exception as e:
            # Close connection if token validation fails
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Token inválido o expirado")
            raise e

    def disconnect(self, websocket: WebSocket, role: str):
        if role in self.active_connections and websocket in self.active_connections[role]:
            self.active_connections[role].remove(websocket)

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_text(json.dumps(message))

    async def broadcast_to_role(self, role: str, message: dict):
        if role in self.active_connections:
            # Create a copy to prevent concurrent modification errors if sockets close mid-broadcast
            targets = list(self.active_connections[role])
            for connection in targets:
                try:
                    await connection.send_text(json.dumps(message))
                except Exception:
                    # Connection might have died, let's clean it up later or handle gracefully
                    pass

    async def broadcast_all(self, message: dict):
        for role in self.active_connections.keys():
            await self.broadcast_to_role(role, message)

manager = ConnectionManager()
