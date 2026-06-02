/*
 * Service Worker for SismosCR.
 * Three strategies:
 * 1. Map tiles: Cache-first with IndexedDB fallback (offline-first)
 * 2. API (v1/v2): Network-first (always try server, fallback to cache)
 * 3. Static assets: Cache-first (preloaded at install)
 *
 * Push notifications: Listens for push events, shows notification with quake data.
 * Why IndexedDB for tiles: Cache API has storage limits per origin (~50MB).
 *   IndexedDB can store hundreds of MBs, enough for offline CR map tiles.
 */

var CACHE = "sismoscr-v1";
var STATIC_ASSETS = ["/", "/history", "/offline"];

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
            return k !== CACHE;
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

  // Map tiles: cache-first with IndexedDB
  if (url.hostname.indexOf("basemaps.cartocdn.com") !== -1) {
    event.respondWith(tileStrategy(request));
    return;
  }

  // API calls: network-first (fresh data preferred)
  if (url.pathname.indexOf("/api/") === 0) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Everything else: cache-first (static assets)
  event.respondWith(cacheFirst(request));
});

// ── Strategies ────────────────────────────────────────────────────────────────

function tileStrategy(request) {
  return caches.match(request).then(function (cached) {
    if (cached) return cached;
    // Fetch and store in both Cache API and IndexedDB
    return fetch(request).then(function (response) {
      if (response.ok) {
        var copy = response.clone();
        caches.open(CACHE).then(function (cache) {
          cache.put(request, copy);
        });
        // Store in IndexedDB for offline persistence
        storeTileInIDB(request.url, response.clone());
      }
      return response;
    });
  });
}

function cacheFirst(request) {
  return caches.match(request).then(function (cached) {
    if (cached) return cached;
    return fetch(request).then(function (response) {
      if (response.ok) {
        var copy = response.clone();
        caches.open(CACHE).then(function (cache) {
          cache.put(request, copy);
        });
      }
      return response;
    });
  });
}

function networkFirst(request) {
  return fetch(request)
    .then(function (response) {
      if (response.ok) {
        var copy = response.clone();
        caches.open(CACHE).then(function (cache) {
          cache.put(request, copy);
        });
      }
      return response;
    })
    .catch(function () {
      return caches.match(request).then(function (cached) {
        if (cached) return cached;
        return new Response(
          JSON.stringify({ offline: true, error: "Sin conexi\u00f3n" }),
          { headers: { "Content-Type": "application/json" } }
        );
      });
    });
}

// ── IndexedDB tile storage (async, fire-and-forget) ──────────────────────────
function storeTileInIDB(url, response) {
  // IndexedDB is not directly available in SW scope with all browsers,
  // so we store the blob reference. The main thread reads from IDB.
  // For production, use the 'idb' library with the SW.
  response.blob().then(function (blob) {
    var openReq = indexedDB.open("sismoscr-tiles", 1);
    openReq.onupgradeneeded = function () {
      var db = openReq.result;
      if (!db.objectStoreNames.contains("tiles")) {
        db.createObjectStore("tiles", { keyPath: "url" });
      }
    };
    openReq.onsuccess = function () {
      var db = openReq.result;
      var tx = db.transaction("tiles", "readwrite");
      var store = tx.objectStore("tiles");
      store.put({ url: url, blob: blob, timestamp: Date.now() });
    };
  });
}
