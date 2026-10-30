/*
 * Service Worker for SismosCR.
 * - HTML: red primero, para no congelar una versión vieja de la app
 * - API: red primero con timeout; sin red, copia guardada marcada con X-SW-Cached
 * - Tiles: caché primero, con tope de entradas
 * - Resto (assets con hash): caché primero
 * Push notifications: Listens for push events, shows notification with quake data.
 */

var CACHE = "sismoscr-v2";
var TILE_CACHE = "sismoscr-tiles-v1";
var STATIC_ASSETS = ["/", "/history"];
var MAX_TILES = 1000;
var API_TIMEOUT_MS = 15000;

// ── Install: precache shell ──────────────────────────────────────────────────
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ────────────────────────────────────────────────
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (k) {
            return k !== CACHE && k !== TILE_CACHE;
          })
          .map(function (k) {
            return caches.delete(k);
          })
      );
    })
  );
  self.clients.claim();
});

// ── Push: show notification for new quake alerts ─────────────────────────────
self.addEventListener("push", function (event) {
  if (!event.data) return;
  try {
    var data = event.data.json();
    if (data.event !== "NEW_QUAKE_ALERT") return;

    var mag = data.magnitude.toFixed(1);
    var loc = data.location_description || "Desconocida";
    var title = "Sismo " + mag + " ML detectado";
    var body = "Ubicaci\u00f3n: " + loc + " \u2022 " + data.depth_km + " km prof.";

    event.waitUntil(
      self.registration.showNotification(title, {
        body: body,
        icon: "/icon-192.svg",
        badge: "/icon-192.svg",
        vibrate: [200, 100, 200],
        data: { id: data.id, url: "/?eq=" + data.id },
        requireInteraction: true,
      })
    );
  } catch (e) {
    console.error("Push handler error:", e);
  }
});

// ── Notification click: open app and focus quake ─────────────────────────────
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var url = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.indexOf(self.location.origin) !== -1 && "focus" in client) {
          client.postMessage({ type: "OPEN_QUAKE", id: event.notification.data.id });
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ── Fetch: route to appropriate strategy ─────────────────────────────────────
self.addEventListener("fetch", function (event) {
  var request = event.request;
  var url = new URL(request.url);

  if (request.method !== "GET") return;

  if (request.mode === "navigate") {
    event.respondWith(pageStrategy(request));
    return;
  }

  if (url.hostname === "tile.openstreetmap.org") {
    event.respondWith(tileStrategy(request));
    return;
  }

  if (url.pathname.indexOf("/api/") === 0) {
    event.respondWith(apiStrategy(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

// ── Strategies ────────────────────────────────────────────────────────────────

function saveCopy(request, response) {
  if (!response.ok) return;
  var copy = response.clone();
  caches.open(CACHE).then(function (cache) {
    cache.put(request, copy);
  });
}

function pageStrategy(request) {
  return fetch(request)
    .then(function (response) {
      saveCopy(request, response);
      return response;
    })
    .catch(function () {
      return caches.match(request, { ignoreSearch: true }).then(function (cached) {
        return cached || caches.match("/");
      });
    });
}

function apiStrategy(request) {
  return fetch(request, { signal: AbortSignal.timeout(API_TIMEOUT_MS) })
    .then(function (response) {
      saveCopy(request, response);
      return response;
    })
    .catch(function () {
      return caches.match(request).then(function (cached) {
        if (!cached) {
          // 503 y no 200: una lista vacía parecería "no hubo sismos"
          return new Response(JSON.stringify({ offline: true, error: "Sin conexi\u00f3n" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          });
        }
        var headers = new Headers(cached.headers);
        headers.set("X-SW-Cached", "1");
        return new Response(cached.body, { status: cached.status, headers: headers });
      });
    });
}

function tileStrategy(request) {
  return caches.open(TILE_CACHE).then(function (cache) {
    return cache.match(request).then(function (cached) {
      if (cached) return cached;
      return fetch(request).then(function (response) {
        if (response.ok) {
          cache.put(request, response.clone()).then(function () {
            return trimTiles(cache);
          });
        }
        return response;
      });
    });
  });
}

function trimTiles(cache) {
  return cache.keys().then(function (keys) {
    var excess = keys.slice(0, Math.max(0, keys.length - MAX_TILES));
    return Promise.all(
      excess.map(function (key) {
        return cache.delete(key);
      })
    );
  });
}

function cacheFirst(request) {
  return caches.match(request).then(function (cached) {
    if (cached) return cached;
    return fetch(request).then(function (response) {
      saveCopy(request, response);
      return response;
    });
  });
}
