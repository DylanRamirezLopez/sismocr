from __future__ import annotations

import asyncio
import json
import logging
from typing import Set

from fastapi import WebSocket

from app.schemas.earthquake import EarthquakeAlertPayload

logger = logging.getLogger("sismocr.alert_manager")


class AlertManager:
    def __init__(self):
        self._connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def register(self, ws: WebSocket):
        await ws.accept()
        async with self._lock:
            self._connections.add(ws)
        logger.info("WS client connected. Total: %d", len(self._connections))

    async def unregister(self, ws: WebSocket):
        async with self._lock:
            self._connections.discard(ws)
        logger.info("WS client disconnected. Total: %d", len(self._connections))

    async def broadcast(self, payload: EarthquakeAlertPayload):
        payload_json = payload.model_dump_json()
        dead: list[WebSocket] = []

        async with self._lock:
            connections = list(self._connections)

        for ws in connections:
            try:
                await ws.send_text(payload_json)
            except Exception:
                dead.append(ws)

        if dead:
            async with self._lock:
                for ws in dead:
                    self._connections.discard(ws)
            logger.info("Cleaned %d stale WS connections", len(dead))

    async def heartbeat(self):
        while True:
            await asyncio.sleep(30)
            async with self._lock:
                connections = list(self._connections)
            for ws in connections:
                try:
                    await ws.send_json({"event": "HEARTBEAT"})
                except Exception:
                    pass

    @property
    def connection_count(self) -> int:
        return len(self._connections)


alert_manager = AlertManager()
