# RESQ-AI — AI-Powered Disaster & Emergency Response Orchestration Platform

[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen)]()
[![Backend](https://img.shields.io/badge/Backend-Django%205.1%20%7C%20DRF-092E20)]()
[![Frontend](https://img.shields.io/badge/Frontend-React%2018%20%7C%20TypeScript%20%7C%20Vite-61DAFB)]()
[![Routing](https://img.shields.io/badge/Routing-Local%20Dijkstra%20Graph-blue)]()
[![Optimization](https://img.shields.io/badge/Optimization-SciPy%20Hungarian-orange)]()
[![Map](https://img.shields.io/badge/Map-OpenStreetMap%20%2B%20Leaflet-green)]()

---

## 🌟 Executive Summary

**RESQ-AI** is a software-only disaster response and emergency command-center platform engineered for urban crisis scenarios (demonstrated using the *Operation Chennai Deluge* master scenario). It unifies AI-assisted entity extraction, composite priority scoring, multi-criteria resource optimization (Hungarian algorithm), deterministic graph routing with dynamic obstacle recalculation (Dijkstra), and live telemetry dispatching into a unified situational awareness dashboard.

---

## 🏛️ System Architecture

```mermaid
graph TD
    User["Emergency Caller / Citizen / Field Worker"] -->|Unstructured Voice / Text| Frontend["React 18 + Vite Command Center"]
    Frontend -->|POST /incidents/analyze-text/| DjangoAPI["Django REST Framework API"]
    
    subgraph "AI Enhancement Layer (Optional)"
        DjangoAPI --> LLMBridge["LLM Bridge Service"]
        LLMBridge -->|Online| OpenAI["OpenAI / OpenRouter API (GPT-4o-mini)"]
        LLMBridge -->|Offline Fallback| MockLLM["LocalMockProvider (Deterministic Regex + Landmarks)"]
    end
    
    subgraph "Core Emergency Decision Engine (100% Local & Deterministic)"
        DjangoAPI --> PriorityEngine["Priority Engine (Composite Severity/Vulnerability Math)"]
        DjangoAPI --> HungarianOptimizer["Resource Optimizer (SciPy Linear Sum Assignment)"]
        DjangoAPI --> DijkstraRouter["Dynamic Graph Router (In-Memory Dijkstra)"]
        DjangoAPI --> HospitalMatcher["Hospital Capacity & Capability Matcher"]
        DjangoAPI --> SimulationEngine["Disaster Disruption Engine (Blockages & Surges)"]
    end
    
    DjangoAPI --> Postgres["PostgreSQL Database"]
    Frontend -->|Standard XYZ Tiles (No Key)| OSM["OpenStreetMap Tile Layer"]
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Python 3.11+**
- **Node.js 18+**
- **PostgreSQL** (Active on `localhost:5432` or local development database)

---

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run migrations and seed baseline scenario
python manage.py migrate
python manage.py seed_chennai_scenario

# Start backend server
python manage.py runserver 0.0.0.0:8000
```

---

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0
```

Access the command center at **`http://localhost:5173`**.

---

## 🛡️ Hackathon Reliability Principles

1. **EXTERNAL SERVICES = ENHANCEMENT**:
   - `OPENAI_API_KEY`: Used for natural language parsing. If missing or offline, the system automatically uses the zero-latency `LocalMockProvider`.
   - `WEATHER_API_KEY`: Used for live OpenWeatherMap queries. If missing or activating, the system seamlessly displays simulated Chennai monsoon telemetry.
2. **ZERO MAP API KEYS**:
   - Uses standard OpenStreetMap raster tiles (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`).
   - `OPENSTREETMAP_API_KEY` is **NOT** required.
3. **100% LOCAL DETERMINISTIC CORE**:
   - Routing: Local in-memory graph Dijkstra with dynamic obstacle penalties.
   - Resource Allocation: SciPy Hungarian algorithm.
   - Hospital Selection: Local capacity & ICU constraint filter.

---

## 🧪 Testing & Verification

```bash
# Run backend test suite (13/13 tests)
cd backend
venv/bin/pytest -v

# Run frontend typecheck and production build
cd frontend
npm run typecheck
npm run build
```

---

## 📚 Project Documentation

- [01 — Product Requirements Document (PRD)](01_PRD.md)
- [02 — Software Requirements Specification (SRS)](02_SRS.md)
- [03 — UI/UX Implementation Specifications](03_UI_UX_IMPLEMENTATION.md)
- [04 — User Workflow Specification](04_USER_WORKFLOW.md)
- [05 — Backend Implementation Specifications](05_BACKEND_IMPLEMENTATION.md)
- [06 — Phase-Wise Implementation Plan](06_PHASE_WISE_IMPLEMENTATION.md)
- [07 — External API & Dependency Audit](07_EXTERNAL_API_AND_DEPENDENCY_AUDIT.md)
- [08 — External Integration & Configuration Manual](08_INTEGRATION_CONFIGURATION.md)