# SismosCR 🌋 — Monitoreo Sísmico de Costa Rica en Tiempo Real

**Live App:** [sismoscr.vercel.app](https://sismoscr.vercel.app)
**API:** [sismocr-api.onrender.com](https://sismocr-api.onrender.com/docs)
**Repo:** [github.com/DylanRamirezLopez/sismocr](https://github.com/DylanRamirezLopez/sismocr)

[![Deploy](https://img.shields.io/badge/Frontend-Vercel-black?logo=vercel)](https://sismoscr.vercel.app)
[![Deploy](https://img.shields.io/badge/Backend-Render-46E3B7?logo=render)](https://sismocr-api.onrender.com)
[![CI](https://img.shields.io/badge/CI-GitHub_Actions-2088FF?logo=githubactions)](https://github.com/DylanRamirezLopez/sismocr/actions)
[![License](https://img.shields.io/badge/License-MIT-yellow)](/LICENSE)

---

## 📡 Fuentes de datos

| Fuente | Método | Intervalo | Cobertura |
|--------|--------|-----------|-----------|
| **USGS** — United States Geological Survey | `query.geojson` API | cada 60s | Global, filtrado por bounding box de CR |
| **RSN** — Red Sismológica Nacional (UCR) | API JSON `sismos.php` | cada 120s | Nacional, datos de 175 estaciones |
| **OVSICORI** — Observatorio Vulcanológico (UNA) | JS embebido en `mapa_sismos.php` | cada 120s | Nacional, datos automáticos y revisados |

### ¿Por qué 3 fuentes?

USGS es global y confiable, pero sus datos para CR tienen latencia de minutos. RSN y OVSICORI son fuentes locales con datos más precisos y rápidos. La deduplicación (±15km, ±60s) evita triplicar eventos usando distancia Haversine.

---

## 🏗️ Arquitectura

```
sismocr/
├── sismoscr/          Frontend
│   ├── src/app/       Next.js App Router (4 rutas)
│   ├── src/components/ 15 componentes React
│   ├── src/hooks/     4 hooks personalizados
│   ├── src/lib/       i18n ES/EN, utilidades, API config
│   └── public/        Service Worker offline-first
│
├── backend/           Backend
│   ├── app/api/       REST v1 (5 endpoints) + v2 (7 endpoints)
│   ├── app/services/  6 servicios: ingesta, dedup, geocoder, PDF, alertas
│   ├── app/workers/   Workers asíncronos (USGS + RSN + OVSICORI)
│   ├── app/models/    SQLAlchemy ORM
│   └── app/schemas/   Pydantic v2
│
└── .github/workflows/ CI + Keep Alive
```

### API v1 y v2 coexistiendo

v1 queda 100% intacta para compatibilidad. v2 usa el mismo `earthquake_service.py` — cero lógica duplicada. v2 añade GeoJSON, export CSV/PDF y push subscriptions. Activado via feature flag `ENABLE_API_V2`.

---

## ⚙️ Decisiones técnicas

### Offline-first con Service Worker + IndexedDB

**Por qué:** Costa Rica tiene zonas sin internet estable. El SW cachea tiles del mapa (Cache API) y datos (IndexedDB). Tres estrategias según el recurso:

| Recurso | Estrategia | Razón |
|---------|-----------|-------|
| Map tiles (cartocdn.com) | Cache-first + IndexedDB | El mapa debe verse sin conexión |
| API calls (/api/) | Network-first | Datos frescos优先, fallback a cache |
| Static assets | Cache-first | Pre-cargados en install |

### Reverse geocoding offline con polígonos del INEC

**Por qué:** Evitar llamadas a APIs de pago (Google Maps, Mapbox). Usamos Ray Casting sobre un GeoJSON simplificado de las 7 provincias de CR. 0 llamadas externas, 0 latencia, 0 costo.

### Deduplicación con Haversine vs PostGIS

Actualmente usamos Haversine en Python (±15km, ±60s). El script `scripts/migrate_to_postgres.py` migra a PostGIS que permite `ST_DWithin` nativo — consultas geoespaciales en SQL sin traer datos a Python. Escala a millones de filas.

### Heatmap con decaimiento temporal

`HeatmapLayer.tsx` pondera cada sismo por: `magnitud × max(0, 1 - horas / 168)`. Un M5 de hace 6h pesa 4.8, el mismo de hace 7 días pesa 0. Los sismos recientes dominan visualmente.

### PDF generado del lado del servidor

Usamos `reportlab` (no jsPDF). Razón: el PDF se genera en el backend y se sirve como descarga — no bloquea el UI, no depende del cliente, funciona offline.

---

## 🚀 Instalación

```bash
git clone https://github.com/DylanRamirezLopez/sismocr.git
cd sismocr

# Backend
cd backend && pip install -r requirements.txt && cd ..

# Frontend
cd sismoscr && npm install && cd ..

# Iniciar (Windows: doble click en sismoscr-live.bat)
start cmd /c "cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
start cmd /c "cd backend && python -m app.workers.ingestion_worker"
start cmd /c "cd sismoscr && npm run dev"
```

## 🧪 Tests

```bash
cd backend && python -m pytest tests/ -v    # 22 tests
cd sismoscr && npx tsc --noEmit              # TypeScript strict
cd sismoscr && npm run build                 # Production build
cd sismoscr && npx playwright test           # E2E critical flows
```

## 🌐 Despliegue

| Componente | Plataforma | URL |
|-----------|-----------|-----|
| Frontend (Next.js) | Vercel (Free) | [sismoscr.vercel.app](https://sismoscr.vercel.app) |
| Backend (FastAPI) | Render (Free) | [sismocr-api.onrender.com](https://sismocr-api.onrender.com) |
| PostgreSQL | Render (Free) | 1 GB incluido |
| CI + Keep Alive | GitHub Actions (Free) | cada 10 min |

**Keep Alive:** Render Free duerme tras 15 min sin tráfico. Un workflow de GitHub Actions pingea `/health` cada 10 minutos para mantenerlo despierto.

## 📄 Licencia

MIT — ver [LICENSE](./LICENSE). Eres libre de usar, modificar y distribuir.
