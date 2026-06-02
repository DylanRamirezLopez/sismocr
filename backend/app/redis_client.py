import time
from typing import Optional


class SimpleCache:
    def __init__(self):
        self._store: dict[str, tuple[float, str]] = {}

    def get(self, key: str) -> Optional[str]:
        expiry, value = self._store.get(key, (0, ""))
        if expiry < time.time():
            self._store.pop(key, None)
            return None
        return value

    async def get_async(self, key: str) -> Optional[str]:
        return self.get(key)

    def setex(self, key: str, ttl: int, value: str):
        self._store[key] = (time.time() + ttl, value)

    async def setex_async(self, key: str, ttl: int, value: str):
        self.setex(key, ttl, value)

    async def ping(self) -> bool:
        return True

    async def aclose(self):
        self._store.clear()


cache = SimpleCache()


async def init_redis():
    await cache.ping()


async def close_redis():
    await cache.aclose()


def get_redis() -> SimpleCache:
    return cache
