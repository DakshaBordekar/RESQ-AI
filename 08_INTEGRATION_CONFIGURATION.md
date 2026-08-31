# 08 — RESQ-AI EXTERNAL INTEGRATION & CONFIGURATION MANUAL

**Document Version:** 1.0.0  
**Status:** Canonical Master Guide  
**Project:** RESQ-AI (AI-Powered Disaster Response Decision Support Platform)  

---

## 1. System Integration Philosophy

RESQ-AI is engineered upon the fundamental disaster engineering principle:

> **EXTERNAL SERVICES = ENHANCEMENT**  
> **CORE EMERGENCY LOGIC = 100% LOCAL + DETERMINISTIC**

1. **AI / LLM Layer**: Enhances unstructured citizen text & voice reports into structured parameters. If the external LLM is offline or unauthenticated, the built-in deterministic `LocalMockProvider` automatically takes over with zero downtime.
2. **Map Visualization**: Standard OpenStreetMap raster tile layer via Leaflet. **Zero API keys required.**
3. **Routing Engine**: 100% Local in-memory Dijkstra graph engine with dynamic edge obstacle penalties. Zero external routing APIs (OSRM, Mapbox, Google) are used or required.
4. **Resource Optimization**: 100% Local SciPy Hungarian assignment algorithm with multi-criteria objective penalty cost matrix.
5. **Hospital Allocation**: 100% Local PostgreSQL bed vacancy & capability constraint matching.
6. **Weather Telemetry**: Live OpenWeatherMap integration with automatic fallback to deterministic monsoonal flood telemetry.

---

## 2. External Services Inventory & Requirements Matrix

| Service | Provider | Purpose | Status | Required / Optional | Fallback Mechanism | API Key Environment Variable |
|---|---|---|---|---|---|---|
| **LLM Entity Extraction** | OpenRouter / OpenAI | Extracts entities from citizen distress text | Integrated & Verified | **Optional Enhancement** | `LocalMockProvider` (Deterministic Regex & Landmark Parser) | `OPENAI_API_KEY`, `OPENAI_BASE_URL` |
| **Map Visualization** | OpenStreetMap Foundation | Base map raster GIS tiles | Integrated & Verified | **Required (Public CDN)** | Browser cached tiles / SVG grid | **NONE REQUIRED** (`OPENSTREETMAP_API_KEY` is NOT needed) |
| **Weather Telemetry** | OpenWeatherMap | Real-time weather conditions | Integrated & Verified | **Optional Enhancement** | `MockWeatherProvider` (Operation Chennai Monsoon Telemetry) | `WEATHER_API_KEY` |
| **Routing & Rerouting** | Internal Dijkstra Engine | Shortest path & dynamic obstacle bypass | Native Internal | **Required (Core)** | Local Graph with 999.0 penalty | **NONE (Local Engine)** |
| **Resource Assignment** | Internal Hungarian Engine | Multi-objective bipartite matching | Native Internal | **Required (Core)** | Local SciPy `linear_sum_assignment` | **NONE (Local Engine)** |
| **Hospital Selection** | PostgreSQL ORM | Capacity & specialty constraint filter | Native Internal | **Required (Core)** | Local database state | **NONE (Local Engine)** |
| **Realtime Telemetry** | Django REST API / Polling | Real-time situational synchronization | Native Internal | **Required (Core)** | 3.5s resilient poll loop | **NONE (Local Engine)** |

---

## 3. Environment Variables Reference

### Backend (`backend/.env`)

```ini
# Core Django
DEBUG=True
SECRET_KEY=django-insecure-resq-ai-master-key-hackathon-chennai-2026
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0

# Database (PostgreSQL)
DATABASE_URL=postgres://localhost:5432/resq_ai

# AI & LLM Engine (Supports OpenRouter sk-or-v1-... or OpenAI sk-proj-...)
AI_PROVIDER=openai
OPENAI_API_KEY=sk-or-v1-your-key-here
OPENAI_BASE_URL=https://openrouter.ai/api/v1

# Weather Telemetry (OpenWeatherMap)
WEATHER_API_KEY=your_openweathermap_api_key_here

# CORS Allowed Origins
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000
PORT=8000
```

### Frontend (`frontend/.env`)

```ini
# Backend API Root Endpoint
VITE_API_URL=http://localhost:8000/api/v1

# OpenStreetMap Default Settings (NO API KEY REQUIRED)
VITE_DEFAULT_MAP_CENTER_LAT=13.0300
VITE_DEFAULT_MAP_CENTER_LON=80.2350
VITE_DEFAULT_MAP_ZOOM=12
```

---

## 4. Provider Abstraction Architecture

### 4.1 LLM Provider (`backend/apps/ai/services/llm_bridge.py`)

```
LLMBridgeService.get_provider()
  ├── OpenAIProvider (Active when OPENAI_API_KEY is present)
  └── LocalMockProvider (Active when key missing, invalid, or AI_PROVIDER='local_mock')
```

### 4.2 Weather Provider (`backend/apps/simulation/services/weather_service.py`)

```
WeatherService.get_current_weather()
  ├── Live OpenWeatherMap API (Active when WEATHER_API_KEY is valid)
  └── Simulated Disaster Telemetry (Active when key missing, unauthorized, or offline)
```

### 4.3 Map Provider (`frontend/src/services/mapProvider.ts`)

```
getActiveMapTileProvider()
  ├── OpenStreetMap Standard (https://tile.openstreetmap.org/{z}/{x}/{y}.png)
  └── Custom Tile URL (via VITE_MAP_TILE_URL if specified)
```

---

## 5. Local Setup & Execution Instructions

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm
- PostgreSQL (or local SQLite during testing)

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_chennai_scenario
python manage.py runserver 0.0.0.0:8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0
```

---

## 6. Testing & Quality Assurance Commands

### Backend Test Suite
```bash
cd backend
venv/bin/pytest -v
```

### Frontend Verification
```bash
cd frontend
npm run typecheck
npm run build
```

### Offline Demo Verification
```bash
cd backend
venv/bin/pytest apps/core/test_offline_fallback.py -v
```

---

## 7. Troubleshooting & Recovery Matrix

| Issue | Root Cause | Resolution |
|---|---|---|
| AI Intake returns 500 | Invalid or expired OpenAI key | Backend automatically logs warning and falls back to `LocalMockProvider`. Set `AI_PROVIDER=local_mock` in `backend/.env` for 100% offline usage. |
| Weather shows "SIMULATED" badge | OpenWeather key activating or missing | Normal behavior during key propagation; realistic flood telemetry is displayed seamlessly. |
| Map tiles greyed out | Internet disconnected | Emergency markers, vehicles, hospital pins, and route polylines remain 100% visible on canvas. |
| Saidapet Bridge blocked route not clearing | Simulation state latched | Click "Reset" in top header or execute `POST /api/v1/simulation/reset/`. |
