from __future__ import annotations

import asyncio
import logging
from typing import Set

from fastapi import WebSocket

from app.config import settings
from app.schemas.earthquake import EarthquakeAlertPayload

logger = logging.getLogger("sismocr.alert_manager")

# Un cliente lento no puede retrasar las alertas de los demás ni la ingesta
SEND_TIMEOUT_SECONDS = 5


class AlertManager:
    def __init__(self):
        self._connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def register(self, ws: WebSocket) -> bool:
        # Sin cabecera Origin no es un navegador: el navegador siempre la envía
        origin = ws.headers.get("origin")
        if origin and origin not in settings.cors_origins:
            await ws.close(code=1008)
            return False
        if len(self._connections) >= settings.ws_max_connections:
            await ws.close(code=1013)
            return False

        await ws.accept()
        async with self._lock:
            self._connections.add(ws)
        logger.info("WS client connected. Total: %d", len(self._connections))
        return True

    async def unregister(self, ws: WebSocket):
        async with self._lock:
            self._connections.discard(ws)
        logger.info("WS client disconnected. Total: %d", len(self._connections))

    async def _send(self, ws: WebSocket, text: str) -> WebSocket | None:
        """Devuelve el socket si quedó inservible."""
        try:
            await asyncio.wait_for(ws.send_text(text), SEND_TIMEOUT_SECONDS)
            return None
        except Exception:
            return ws

    async def _fan_out(self, text: str):
        async with self._lock:
            connections = list(self._connections)

        results = await asyncio.gather(*(self._send(ws, text) for ws in connections))
        dead = [ws for ws in results if ws is not None]

        if dead:
            async with self._lock:
                for ws in dead:
                    self._connections.discard(ws)
            logger.info("Cleaned %d stale WS connections", len(dead))

    async def broadcast(self, payload: EarthquakeAlertPayload):
        await self._fan_out(payload.model_dump_json())

    async def heartbeat(self):
        while True:
            await asyncio.sleep(settings.ws_heartbeat_interval)
            await self._fan_out('{"event":"HEARTBEAT"}')

    @property
    def connection_count(self) -> int:
        return len(self._connections)


alert_manager = AlertManager()
