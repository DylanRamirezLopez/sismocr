# SismosCR 🌋 — Monitoreo Sísmico de Costa Rica en Tiempo Real

Plataforma de código abierto para la detección, visualización y alerta temprana de sismos en Costa Rica. Obtiene datos en tiempo real desde **USGS**, **RSN (UCR)** y **OVSICORI (UNA)**, los procesa y los muestra en un mapa interactivo con alertas por WebSocket.

![Tech Stack](https://img.shields.io/badge/Next.js_16-000?logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript)
![Python](https://img.shields.io/badge/Python_3.14-3776AB?logo=python)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## ✨ Funcionalidades

- **Mapa interactivo** — Leaflet con marcadores clusterizados + heatmap por magnitud/tiempo
- **Datos en tiempo real** — Polling cada 60s (USGS) y 120s (RSN, OVSICORI)
- **Alertas WebSocket** — Notificaciones en vivo al detectar un sismo nuevo
- **Historial sísmico** — Filtros por fecha, magnitud, provincia; export CSV/GeoJSON/PDF
- **Modo offline** — Service Worker con IndexedDB para tiles y datos cacheados
- **Push notifications** — Alertas incluso con la app cerrada (Web Push API)
- **i18n ES/EN** — Interfaz completamente traducida
- **Dark mode** — Tema oscuro/claro persistente
- **Reverse geocoding** — Provincia detectada automáticamente desde coordenadas

## 🏗️ Arquitectura

```
sismocr/
├── sismoscr/          Frontend (Next.js 16, TypeScript, Tailwind v4)
│   ├── src/app/       Páginas (mapa, historial)
│   ├── src/components/ Componentes UI
│   ├── src/hooks/     Hooks React (WebSocket, fetching, dark mode)
│   ├── src/lib/       Utilidades, i18n, API config
│   └── public/        Service Worker, estáticos
│
├── backend/           Backend (FastAPI, SQLAlchemy, SQLite/PostGIS)
│   ├── app/api/       Rutas REST v1 y v2
│   ├── app/services/  Lógica de negocio (ingesta, dedup, geocoder, PDF)
│   ├── app/workers/   Workers de ingesta asíncronos
│   ├── app/models/    Modelos ORM
│   └── app/schemas/   Schemas Pydantic
│
└── .github/workflows/ CI pipeline
```

## 🚀 Instalación y uso

### Requisitos

- **Node.js** 18+ (recomendado 22)
- **Python** 3.12+
- **npm** o **pnpm**

### 1. Clonar e instalar dependencias

```bash
git clone <tu-repo>
cd sismocr

# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd ../sismoscr
npm install
```

### 2. Iniciar en desarrollo

```bash
# Opción A: un solo comando
sismoscr-live.bat    # Windows — abre 3 terminales: API + Worker + Frontend

# Opción B: manual (3 terminales)
cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --log-level warning
cd backend && python -m app.workers.ingestion_worker
cd sismoscr && npm run dev
```

La app estará disponible en `http://localhost:3000`.

### 3. Variables de entorno

Copia `backend/.env.example` a `backend/.env` y ajusta:

```env
# Opcional: PostgreSQL en vez de SQLite
DATABASE_URL=postgresql+asyncpg://usuario:password@localhost:5432/sismocr

# Opcional: Redis en vez de cache en memoria
REDIS_URL=redis://localhost:6379/0

# API v2 (por defecto activada)
ENABLE_API_V2=true
```

### 4. Tests

```bash
cd backend && python -m pytest tests/ -v
cd sismoscr && npx tsc --noEmit && npm run build
```

## 🧪 Tests

| Suite | Comando | Cobertura |
|-------|---------|-----------|
| Backend (pytest) | `cd backend && python -m pytest` | API, dedup, schemas, stats (22 tests) |
| TypeScript | `cd sismoscr && npx tsc --noEmit` | Tipado estricto |
| Build | `cd sismoscr && npm run build` | Producción |
| E2E (Playwright) | `cd sismoscr && npx playwright test` | Flujos críticos |

## 📡 API

### v1 (estable, compatible)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/earthquakes/recent` | Últimas 24h |
| GET | `/api/v1/earthquakes/history` | Historial paginado + filtros |
| GET | `/api/v1/earthquakes/stats` | Estadísticas |
| GET | `/api/v1/earthquakes/{id}` | Detalle |
| WS | `/api/v1/ws` | Alertas en tiempo real |

### v2 (nuevas features)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v2/earthquakes/geojson` | GeoJSON para mapas |
| GET | `/api/v2/export/csv` | Export CSV |
| GET | `/api/v2/export/pdf` | Reporte PDF |
| POST | `/api/v2/push/subscribe` | Registrar push |

## 🛠️ Tecnologías

**Frontend:** Next.js 16, React 19, TypeScript, Tailwind v4, Leaflet, Recharts, Framer Motion

**Backend:** FastAPI, SQLAlchemy 2.0, Pydantic v2, SQLite/PostGIS, httpx, reportlab

**Infra:** Docker Compose, GitHub Actions, Redis, WebSocket

## 📄 Licencia

MIT — ver [LICENSE](./LICENSE).

## 👥 Contribuir

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/nueva-feature`)
3. Commit (`git commit -m 'feat: agrega nueva feature'`)
4. Push (`git push origin feature/nueva-feature`)
5. Abre un Pull Request

## 📬 Contacto

Proyecto desarrollado y mantenido por [@anomalyco](https://github.com/anomalyco).
Reporta bugs o sugiere features en [Issues](https://github.com/anomalyco/sismocr/issues).
