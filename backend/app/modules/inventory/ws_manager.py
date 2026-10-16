import json
from typing import List, Dict, Any
from fastapi import WebSocket

class ConnectionManager:
    """
    Manages active WebSocket connections from Angular Web & Mobile clients
    broadcasting real-time inventory locking, countdowns, and booking updates.
    """
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: Dict[str, Any]):
        """
        Broadcasts message to all connected clients.
        Gracefully handles disconnected sockets.
        """
        dead_connections = []
        payload_text = json.dumps(message)
        for connection in self.active_connections:
            try:
                await connection.send_text(payload_text)
            except Exception:
                dead_connections.append(connection)
        
        for dead in dead_connections:
            self.disconnect(dead)

# Global singleton connection manager
manager = ConnectionManager()
