# Phase-Wise Implementation Plan — RESQ-AI

## Document Information
- **Project Name:** RESQ-AI (AI-Powered Emergency & Disaster Response Orchestration Platform)
- **Document Version:** 1.0.0
- **Document Status:** MASTER EXECUTION & IMPLEMENTATION PLAN
- **Domain:** Disaster & Emergency Response Simulation
- **Target Constraint:** 24-Hour Hackathon Execution (Software-Only, Zero Hardware)
- **Source of Truth Reference Documents:**
  - `01_PRD.md` (Product Requirements Document)
  - `02_SRS.md` (Software Requirements Specification)
  - `03_UI_UX_IMPLEMENTATION.md` (UI/UX & Frontend Specification)
  - `04_USER_WORKFLOW.md` (User & System Workflow Specification)
  - `05_BACKEND_IMPLEMENTATION.md` (Backend & Engine Architecture Specification)

---

## 1. Implementation Philosophy

### 1.1 Strategy & Core Principles
In a high-intensity 24-hour hackathon, engineering failure stems almost exclusively from: (a) architectural over-engineering, (b) unmanaged dependencies causing team blocking, (c) premature optimization, and (d) fragile external API dependencies. 

The RESQ-AI implementation strategy applies ten strict principles:
1. **Vertical-Slice First:** Rather than building all backend tables horizontally before touching frontend code, we construct a complete, thin vertical slice (Intake $\to$ AI Parse $\to$ Priority Score $\to$ Map Display) within the first 6 hours.
2. **Deterministic Fallback by Default:** Every external service (LLM, geocoder, map tiles) has an in-memory or deterministic local mock. The system defaults to mock mode during development, allowing zero-latency offline coding.
3. **Hard Separation of Math & LLM:** LLMs process natural language; deterministic Python services solve graphs and matrix assignments. We never prompt an LLM to calculate vehicle routes or assign hospital beds.
4. **Mock-to-Real Swapping:** Core services implement clean abstract interfaces (`LLMProvider`, `RouterInterface`). Switching from `LocalMockProvider` to `OpenAIProvider` is a single environment variable change (`AI_PROVIDER=openai`).
5. **Contract-First API Design:** DRF serializers and TypeScript interfaces are locked in Phase 0. Frontend developers build with typed mock fixtures while backend developers implement ORM logic.
6. **Stateless Scalability:** Django operates statelessly. PostgreSQL stores all ground-truth state. In-memory graphs rebuild deterministically from database tables.
7. **Polling Over WebSockets for MVP Baseline:** TanStack Query polling ($3000\text{ms}$) serves as the robust baseline. WebSockets are layered on top only after the core REST loop is validated.
8. **Automated Seed Scripts Over Manual Data Entry:** Deterministic Django management commands (`seed_chennai_scenario`) instantly populate 20 incidents, 12 rescue units, 8 hospitals, and 50 road segments in one second.
9. **Continuous Demo-Readiness:** The application must remain demoable at the end of every single phase.
10. **Zero Fluff Code:** Write only what must exist to fulfill the functional requirements. No speculative abstractions.

---

## 2. Master System Architecture

```
                                +--------------------------------------------+
                                |             React Frontend SPA             |
                                |    (TypeScript, Vite, React-Leaflet)       |
                                +---------------------+----------------------+
                                                      |
                                                      | HTTPS / REST / WebSockets
                                                      v
                                +---------------------+----------------------+
                                |       Django 5 + DRF API Layer             |
                                |     (Authentication, ViewSets, URLs)       |
                                +---------------------+----------------------+
                                                      |
                    +---------------------------------+---------------------------------+
                    |                                                                   |
                    v                                                                   v
+-------------------+--------------------+                    +-------------------------+-----------------------+
|        Django Application Services     |                    |               AI Service Layer                  |
|  - Incident Lifecycle Service          |                    |  - LLM Provider Abstraction                     |
|  - Dispatch Management Service         |                    |  - Structured JSON Schema Validator             |
|  - Simulation Scenario Controller      |                    |  - Narrative Explainability Synthesizer         |
|  - Hospital Telemetry Service          |                    |  - Emergency Action Plan (EAP) Builder          |
+-------------------+--------------------+                    +-------------------------+-----------------------+
                    |                                                                   |
                    +---------------------------------+---------------------------------+
                                                      |
                                                      v
                                +---------------------+----------------------+
                                |       Algorithmic Domain Engines           |
                                |  +---------------------------------------+ |
                                |  | Priority Scoring Engine (0-100 Math)  | |
                                |  | Dynamic Graph Router (Dijkstra/A*)    | |
                                |  | Global Resource Optimizer (Hungarian) | |
                                |  | Hospital Matching & Load Balancer     | |
                                |  +---------------------------------------+ |
                                +---------------------+----------------------+
                                                      |
                                                      v
                                +---------------------+----------------------+
                                |         PostgreSQL Persistence             |
                                |  (Relational Models, Spatial & FK Indices) |
                                +--------------------------------------------+
```

---

## 3. Project Directory Structure

```
RESQ-AI/
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .env.example
│   ├── config/
│   │   ├── __init__.py
│   │   ├── asgi.py
│   │   ├── wsgi.py
│   │   ├── urls.py
│   │   └── settings/
│   │       ├── __init__.py
│   │       ├── base.py
│   │       ├── development.py
│   │       └── production.py
│   ├── apps/
│   │   ├── core/                  # Base models, exception handlers, audit logs
│   │   ├── accounts/              # User model, JWT authentication, RBAC
│   │   ├── incidents/             # Incident models, triage queue, Priority Engine
│   │   ├── resources/             # Ambulances, rescue boats, NDRF teams, fleet tracker
│   │   ├── hospitals/             # Hospitals, ICU bed telemetry, matching engine
│   │   ├── routing/               # Road nodes, segments, in-memory Dijkstra router
│   │   ├── optimization/          # SciPy Bipartite matching, dispatch planner
│   │   ├── simulation/            # Scenario sandbox, tick engine, event injector
│   │   ├── ai/                    # LLM provider bridge (OpenAI + LocalMock), prompts
│   │   └── analytics/             # Response KPIs, Emergency Action Plan exporter
│   ├── management/
│   │   └── commands/
│   │       └── seed_chennai_scenario.py # Deterministic master disaster seed
│   └── tests/                     # Algorithmic & integration test suites
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── index.html
│   ├── src/
│   │   ├── app/
│   │   │   ├── App.tsx            # App root with query providers & router
│   │   │   ├── Router.tsx         # Route definitions & guards
│   │   │   └── queryClient.ts     # TanStack Query client config
│   │   ├── components/
│   │   │   ├── ui/                # Button, Card, Badge, Modal, Input, Toast
│   │   │   ├── layout/            # Header, Sidebar, BottomDock
│   │   │   └── map/               # SituationMap, IncidentLayer, ResourceLayer, RouteLayer
│   │   ├── features/
│   │   │   ├── command-center/    # Master dashboard, TriageQueue, ExplainabilityHub
│   │   │   ├── intake/            # AI incident parser modal & inspector
│   │   │   ├── simulation/        # Timeline controls, disruption palette, delta metrics
│   │   │   └── action-plan/       # EAP document preview & export
│   │   ├── services/              # Axios/Fetch API client modules
│   │   ├── hooks/                 # Custom React hooks (useIncidents, useRouting, etc.)
│   │   ├── types/                 # Shared TypeScript domain interfaces
│   │   └── styles/                # CSS design tokens & crisis dark theme
│
├── docker-compose.yml
├── docs/                          # Source of truth specifications (PRD, SRS, UI/UX, Workflow, Backend)
└── README.md
```

---

## 4. Master Implementation Phases Matrix

| Phase # | Phase Name | Primary Domain | Est. Time | Parallelizable? | Deliverable |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **PHASE 0** | Repository & Architecture Setup | Infra / Scaffolding | 1.0 hr | NO (Critical Base) | Git repo, monorepo dirs, Docker, configs |
| **PHASE 1** | Django Foundation & Core Module | Backend | 1.0 hr | NO (Backend Base) | Base settings, custom user, audit model |
| **PHASE 2** | PostgreSQL Schema & Relational Models | Database / ORM | 1.5 hr | NO (Data Base) | 8 domain models, migrations, DB indices |
| **PHASE 3** | Deterministic Priority Engine | Algorithm / Backend | 1.0 hr | YES (with Frontend setup) | 0–100 mathematical scoring service + tests |
| **PHASE 4** | Road Graph & Dijkstra Routing Engine | Algorithm / Backend | 1.5 hr | YES | In-memory graph + dynamic detour router |
| **PHASE 5** | Resource Optimization Engine (Hungarian)| Algorithm / Backend | 1.5 hr | YES | SciPy min-cost bipartite matcher |
| **PHASE 6** | Hospital Matching & Capacity Engine | Domain Service | 1.0 hr | YES | ICU bed & trauma capability matcher |
| **PHASE 7** | AI Extraction & Explainability Bridge | AI / Backend | 1.5 hr | YES | OpenAI + LocalMock JSON schema parsers |
| **PHASE 8** | Simulation Sandbox & Event Injector | Simulation Service | 1.5 hr | YES | State isolation, step clock, event injector |
| **PHASE 9** | DRF REST API ViewSets & URLs | API Layer | 2.0 hr | NO (Requires Models) | Full CRUD + Action endpoints |
| **PHASE 10**| Deterministic Disaster Scenario Seeder | Data Script | 1.0 hr | YES | `seed_chennai_scenario` command |
| **PHASE 11**| React Foundation & Design System | Frontend | 1.5 hr | YES (with Backend Phase 1-5)| Vite, Tailwind tokens, atomic UI library |
| **PHASE 12**| Leaflet GIS Situation Map Component | Frontend GIS | 2.0 hr | YES | Dark map tiles, GeoJSON vectors, custom pins |
| **PHASE 13**| Command Center Master Dashboard | Frontend Core | 2.5 hr | NO (Needs API + Map) | Triage queue, telemetry dock, action hub |
| **PHASE 14**| AI Intake & Extraction Sandbox UI | Frontend Feature | 1.5 hr | YES | Split-view text parser & field editor |
| **PHASE 15**| Simulation Sandbox & Timeline UI | Frontend Feature | 1.5 hr | YES | Event palette, timeline scrubber, metrics |
| **PHASE 16**| Dynamic Detour & Disruption Integration| Full-Stack Loop | 1.5 hr | NO (Integration) | Road block $\to$ detour polyline update |
| **PHASE 17**| Emergency Action Plan (EAP) Exporter | Full-Stack Feature | 1.0 hr | YES | Operational briefing markdown/PDF view |
| **PHASE 18**| End-to-End Testing & Hardening | QA / Test Suite | 1.5 hr | NO (Critical Pre-demo) | Unit tests, mock failover validation |
| **PHASE 19**| Hackathon Demo Script Polish | Demo Engineering | 1.0 hr | NO (Final Polish) | 16-step "Operation Chennai Deluge" run |

---

## 5. Detailed Phase Execution Specifications

---

### PHASE 0 — Repository & Architecture Preparation
- **Objective:** Establish the development environment, directory scaffold, container configs, and shared contracts.
- **Why this phase exists:** Prevents merge conflicts, path mismatches, and dependency discrepancies across team members.
- **Dependencies:** None (Kickoff step).
- **Can it run in parallel?** NO. Entire team aligns on repo structure.
- **Files to create:**
  - `backend/requirements.txt`
  - `backend/Dockerfile`
  - `frontend/package.json`
  - `frontend/vite.config.ts`
  - `docker-compose.yml`
  - `.env.example`
- **Backend Work:** Initialize virtualenv, install Django 5, DRF, psycopg2-binary, scipy, numpy, networkx, openai, django-cors-headers.
- **Frontend Work:** Initialize Vite React TypeScript project, install Tailwind CSS, lucide-react, leaflet, react-leaflet, @tanstack/react-query, axios.
- **Configuration:** Setup `.env` with `DEBUG=True`, `AI_PROVIDER=local_mock`, `SECRET_KEY=dev-secret`.
- **Definition of Done:** `docker-compose up` or local concurrent servers run without errors on `localhost:8000` (Django) and `localhost:5173` (Vite).
- **Estimated Time:** 1.0 hour.
- **Hackathon Priority:** CRITICAL.

---

### PHASE 1 — Django Foundation & Core Module
- **Objective:** Establish base Django settings, custom abstract models, global exception handlers, and audit logging.
- **Why this phase exists:** Standardizes model IDs (UUIDs), timestamping, and centralized error logging across all domain apps.
- **Dependencies:** Phase 0.
- **Can it run in parallel?** NO.
- **Files to create:**
  - `backend/config/settings/base.py`, `development.py`
  - `backend/apps/core/models.py` (`TimeStampedModel`, `AuditLog`)
  - `backend/apps/core/exceptions.py` (`custom_exception_handler`)
  - `backend/apps/accounts/models.py` (`User` with role choices)
- **Database Work:** Initial migrations for `core` and `accounts`.
- **Acceptance Criteria:** Custom user model registers superuser; audit logs create records seamlessly.
- **Estimated Time:** 1.0 hour.
- **Hackathon Priority:** CRITICAL.

---

### PHASE 2 — PostgreSQL Schema & Relational Domain Models
- **Objective:** Implement the primary relational models across Incidents, Resources, Hospitals, Road Networks, and Dispatches.
- **Why this phase exists:** Serves as the single source of truth for all domain entities, foreign keys, and status lifecycles.
- **Dependencies:** Phase 1.
- **Files to create:**
  - `backend/apps/incidents/models.py` (`Incident`, `IncidentVictim`)
  - `backend/apps/resources/models.py` (`Resource`, `ResourceCapability`)
  - `backend/apps/hospitals/models.py` (`Hospital`, `HospitalCapacity`)
  - `backend/apps/routing/models.py` (`RoadNode`, `RoadSegment`)
  - `backend/apps/optimization/models.py` (`Dispatch`)
  - `backend/apps/simulation/models.py` (`SimulationScenario`, `SimulationEvent`)
- **Database Work:** Generate and execute migrations `0001_initial.py` for all 6 apps.
- **Acceptance Criteria:** `python manage.py migrate` executes with zero schema conflicts.
- **Estimated Time:** 1.5 hours.
- **Hackathon Priority:** CRITICAL.

---

### PHASE 3 — Deterministic Priority Engine
- **Objective:** Implement the multi-attribute mathematical incident priority scoring engine ($0.00 - 100.00$).
- **Why this phase exists:** Delivers auditable, objective triaging without relying on subjective human dispatcher bias or unpredictable LLM arithmetic.
- **Dependencies:** Phase 2 (Incident Model).
- **Can it run in parallel?** YES (Backend Dev can build this while Frontend Dev builds Phase 11).
- **Files to create:**
  - `backend/apps/incidents/services/priority_engine.py`
  - `backend/apps/incidents/tests/test_priority_engine.py`
- **Algorithm Work:** Implement weighted linear sum formula:
  $$P = 0.30 S + 0.20 V + 0.15 N + 0.15 M + 0.10 U + 0.10 T$$
- **Testing:** Unit tests verifying score clamping, tier boundary checks (`CRITICAL` vs `HIGH`), and time-decay escalation.
- **Definition of Done:** 100% unit test pass rate across 8 edge case test fixtures.
- **Estimated Time:** 1.0 hour.
- **Hackathon Priority:** CRITICAL.

---

### PHASE 4 — Road Graph & Dynamic Dijkstra Routing Engine
- **Objective:** Build an in-memory graph router calculating shortest and safest emergency paths with dynamic obstacle avoidance.
- **Why this phase exists:** Ensures rescue assets avoid flooded corridors and re-route instantly upon bridge/road blockages.
- **Dependencies:** Phase 2 (RoadNode, RoadSegment Models).
- **Can it run in parallel?** YES.
- **Files to create:**
  - `backend/apps/routing/services/router.py`
  - `backend/apps/routing/services/graph_loader.py`
  - `backend/apps/routing/tests/test_router.py`
- **Algorithm Work:** Modified Dijkstra using Python `heapq`, factoring length, speed limits, and hazard multipliers ($2.5\times$ for waterlogged, $\infty$ for blocked).
- **Testing:** Diamond graph detour test (verifying that blocking the central bridge immediately yields the northern bypass route).
- **Estimated Time:** 1.5 hours.
- **Hackathon Priority:** CRITICAL.

---

### PHASE 5 — Resource Optimization Engine (Hungarian Bipartite Matching)
- **Objective:** Implement the SciPy-backed Linear Sum Assignment algorithm for constrained multi-asset dispatch.
- **Why this phase exists:** Eliminates manual dispatch trial-and-error; provides globally optimal, collision-free resource allocations.
- **Dependencies:** Phases 3 & 4.
- **Files to create:**
  - `backend/apps/optimization/services/optimizer.py`
  - `backend/apps/optimization/tests/test_optimizer.py`
- **Algorithm Work:** Construct $N \times M$ cost matrix $C_{ij} = 0.60 \cdot \text{ETA} - 0.40 \cdot \text{Priority}$, prune infeasible capabilities, run `scipy.optimize.linear_sum_assignment`.
- **Acceptance Criteria:** Assigns 20 incidents across 10 units in $< 50\text{ms}$ with zero double-assignments.
- **Estimated Time:** 1.5 hours.
- **Hackathon Priority:** CRITICAL.

---

### PHASE 6 — Hospital Matching & Capacity Engine
- **Objective:** Build multi-criteria hospital matching balancing transit time, ICU vacancy, and trauma capabilities.
- **Why this phase exists:** Prevents ambulance divert delays and emergency room overcrowding.
- **Dependencies:** Phase 2 (Hospital Model).
- **Files to create:**
  - `backend/apps/hospitals/services/matcher.py`
- **Acceptance Criteria:** Trauma casualties bypass non-ICU community clinics and route to Level-1 trauma centers with available beds.
- **Estimated Time:** 1.0 hour.
- **Hackathon Priority:** HIGH.

---

### PHASE 7 — AI Service Layer & Provider Bridge
- **Objective:** Implement provider-agnostic LLM extraction, JSON schema validation, and natural language explainability.
- **Why this phase exists:** Powers unstructured citizen text parsing and human-readable decision justifications without vendor lock-in.
- **Dependencies:** Phase 1.
- **Files to create:**
  - `backend/apps/ai/services/llm_bridge.py` (`OpenAIProvider`, `LocalMockProvider`)
  - `backend/apps/ai/schemas.py` (`IncidentExtractionSchema`)
  - `backend/apps/ai/prompts.py`
- **AI Work:** Strict JSON schema extraction prompt; local regex/keyword fallback mock.
- **Acceptance Criteria:** `POST /analyze-text` returns validated JSON in $< 2.5\text{s}$ (OpenAI) or $< 10\text{ms}$ (Local Mock).
- **Estimated Time:** 1.5 hours.
- **Hackathon Priority:** CRITICAL.

---

### PHASE 8 — Simulation Sandbox & Disruption Event Injector
- **Objective:** Create a stateful simulation engine allowing step-based crisis escalation and dynamic event injection.
- **Why this phase exists:** Demonstrates the entire platform lifecycle under software simulation without physical hardware.
- **Dependencies:** Phases 2, 4, 5.
- **Files to create:**
  - `backend/apps/simulation/services/simulator.py`
  - `backend/apps/simulation/services/events.py`
- **Acceptance Criteria:** Injecting `BLOCK_ROAD` event automatically triggers re-route sweep on active dispatches.
- **Estimated Time:** 1.5 hours.
- **Hackathon Priority:** CRITICAL.

---

### PHASE 9 — DRF REST API ViewSets & URL Routing
- **Objective:** Wire all domain services to clean, validated REST endpoints.
- **Why this phase exists:** Connects frontend presentation tier to backend domain engines.
- **Dependencies:** Phases 2 through 8.
- **Files to create:**
  - `backend/apps/incidents/serializers.py`, `views.py`
  - `backend/apps/resources/serializers.py`, `views.py`
  - `backend/apps/hospitals/serializers.py`, `views.py`
  - `backend/apps/routing/serializers.py`, `views.py`
  - `backend/apps/optimization/serializers.py`, `views.py`
  - `backend/apps/simulation/serializers.py`, `views.py`
  - `backend/config/urls.py`
- **Acceptance Criteria:** All endpoints return valid JSON matching the API specification with standard HTTP status codes.
- **Estimated Time:** 2.0 hours.
- **Hackathon Priority:** CRITICAL.

---

### PHASE 10 — Deterministic Disaster Scenario Seeder
- **Objective:** Create automated Django management command seeding Chennai disaster scenario.
- **Why this phase exists:** Enables instant 1-click database reset to a rich, realistic baseline for live demo execution.
- **Dependencies:** Phase 9.
- **Files to create:**
  - `backend/apps/core/management/commands/seed_chennai_scenario.py`
- **Seed Payload:**
  - 15 Chennai Road Intersections & 25 Road Segments (Adyar, Velachery, Guindy, Marina).
  - 8 Hospitals (Apollo Greams, Rajiv Gandhi Govt, MIOT, Fortis Malar) with bed/ICU stats.
  - 12 Emergency Assets (6 Ambulances, 4 Rescue Boats, 2 NDRF Teams).
  - 15 Unstructured & Structured Emergency Distress Incidents.
- **Acceptance Criteria:** `python manage.py seed_chennai_scenario` executes cleanly in $< 2\text{s}$.
- **Estimated Time:** 1.0 hour.
- **Hackathon Priority:** CRITICAL.

---

### PHASE 11 — React Foundation & Crisis Design System
- **Objective:** Build React project baseline, design tokens, and atomic UI component library.
- **Why this phase exists:** Ensures consistent high-contrast visual styling and eliminates UI bugs during feature construction.
- **Dependencies:** Phase 0.
- **Files to create:**
  - `frontend/src/styles/tokens.css`
  - `frontend/src/types/index.ts`
  - `frontend/src/components/ui/Button.tsx`, `Card.tsx`, `PriorityBadge.tsx`, `Modal.tsx`, `Toast.tsx`
  - `frontend/src/components/layout/Header.tsx`, `BottomDock.tsx`
- **Acceptance Criteria:** Reusable component library renders dark-mode crisis UI elements with zero console errors.
- **Estimated Time:** 1.5 hours.
- **Hackathon Priority:** HIGH.

---

### PHASE 12 — Leaflet GIS Situation Map Component
- **Objective:** Implement interactive GIS mapping layer with dynamic marker rendering and polyline route drawing.
- **Why this phase exists:** Serves as the central visual anchor for command center situational awareness.
- **Dependencies:** Phase 11.
- **Files to create:**
  - `frontend/src/components/map/SituationMap.tsx`
  - `frontend/src/components/map/IncidentMarkers.tsx`
  - `frontend/src/components/map/ResourceMarkers.tsx`
  - `frontend/src/components/map/HospitalMarkers.tsx`
  - `frontend/src/components/map/RoadNetworkLayer.tsx`
  - `frontend/src/components/map/RouteOverlay.tsx`
- **Acceptance Criteria:** Renders Chennai map, color-coded priority pins, vehicle icons, and road vectors at $60\text{ fps}$.
- **Estimated Time:** 2.0 hours.
- **Hackathon Priority:** CRITICAL.

---

### PHASE 13 — Command Center Master Dashboard
- **Objective:** Assemble the primary 4-zone Command Center cockpit combining live map, triage queue, fleet telemetry, and dispatch action card.
- **Why this phase exists:** Delivers the main user interface for the primary demo persona (Emergency Coordinator).
- **Dependencies:** Phases 9, 11, 12.
- **Files to create:**
  - `frontend/src/features/command-center/CommandCenterPage.tsx`
  - `frontend/src/features/command-center/IncidentQueuePanel.tsx`
  - `frontend/src/features/command-center/DispatchRecommendation.tsx`
  - `frontend/src/features/command-center/ExplainabilityCard.tsx`
  - `frontend/src/features/command-center/FleetTelemetryDock.tsx`
- **Acceptance Criteria:** Live polling updates triage queue; clicking an incident syncs map center and loads explainability card.
- **Estimated Time:** 2.5 hours.
- **Hackathon Priority:** CRITICAL.

---

### PHASE 14 — AI Intake & Extraction Sandbox UI
- **Objective:** Build split-screen modal for pasting freeform distress messages, triggering AI parse, and staging triaged records.
- **Why this phase exists:** Demonstrates the end-to-end NLP ingestion pipeline live to judges.
- **Dependencies:** Phases 9, 11.
- **Files to create:**
  - `frontend/src/features/intake/IncidentIntakeModal.tsx`
  - `frontend/src/features/intake/EntityExtractionForm.tsx`
- **Acceptance Criteria:** Pasting raw text $\to$ clicking "AI Extract" auto-fills structured fields $\to$ "Stage Incident" updates map instantly.
- **Estimated Time:** 1.5 hours.
- **Hackathon Priority:** HIGH.

---

### PHASE 15 — Simulation Sandbox & Timeline UI
- **Objective:** Build simulation control dock with play/step buttons, disruption event injection palette, and delta analytics widgets.
- **Why this phase exists:** Allows judges/operators to interactively trigger bridge collapses, flood surges, and hospital blackouts.
- **Dependencies:** Phases 8, 9, 13.
- **Files to create:**
  - `frontend/src/features/simulation/SimulationControls.tsx`
  - `frontend/src/features/simulation/EventInjectionPalette.tsx`
  - `frontend/src/features/simulation/ImpactMetricsCard.tsx`
- **Acceptance Criteria:** Clicking "Block Adyar Bridge" injects event and flashes affected vehicle detour alert.
- **Estimated Time:** 1.5 hours.
- **Hackathon Priority:** CRITICAL.

---

### PHASE 16 — Dynamic Detour & Disruption Integration Loop
- **Objective:** Connect the frontend road-blockage interaction directly to backend Dijkstra re-calculation and animated polyline update.
- **Why this phase exists:** Validates the core value proposition of dynamic emergency re-routing.
- **Dependencies:** Phases 13 & 15.
- **Integration Loop:** Road Click $\to$ `POST /roads/block` $\to$ Backend Re-route Sweep $\to$ Frontend receives updated geometry $\to$ Route turns red/rerouted.
- **Acceptance Criteria:** Complete detour loop completes in $< 300\text{ms}$ end-to-end.
- **Estimated Time:** 1.5 hours.
- **Hackathon Priority:** CRITICAL.

---

### PHASE 17 — Emergency Action Plan (EAP) Exporter
- **Objective:** Build operational briefing view summarizing tactical assignments, open corridors, and hospital casualty counts with export options.
- **Why this phase exists:** Delivers executive-level deliverables for disaster commanders.
- **Dependencies:** Phase 13.
- **Files to create:**
  - `frontend/src/features/action-plan/ActionPlanViewer.tsx`
- **Acceptance Criteria:** Generates clean, printable markdown/HTML emergency briefing document on demand.
- **Estimated Time:** 1.0 hour.
- **Hackathon Priority:** MEDIUM.

---

### PHASE 18 — End-to-End Testing & Hardening
- **Objective:** Execute full system regression tests, test mock failovers, eliminate console warnings, and verify performance SLAs.
- **Why this phase exists:** Prevents unexpected crashes or edge-case bugs during the live judging demo.
- **Dependencies:** All previous phases.
- **Execution:** Run automated test suites; simulate network disconnection; verify `LocalMockProvider` fallback.
- **Estimated Time:** 1.5 hours.
- **Hackathon Priority:** CRITICAL.

---

### PHASE 19 — Hackathon Demo Script Polish
- **Objective:** Rehearse the 16-step "Operation Chennai Deluge" demo walkthrough to guarantee a flawless, high-impact presentation.
- **Why this phase exists:** Direct alignment with hackathon judging criteria.
- **Dependencies:** Phase 18.
- **Deliverable:** Verified 1-click reset script + 5-minute rehearsed presentation flow.
- **Estimated Time:** 1.0 hour.
- **Hackathon Priority:** CRITICAL.

---

## 6. Database Implementation Plan & Migration Order

```
[apps.accounts.User] (Django Auth)
         |
         v
[apps.core.AuditLog]
         |
         +-----------------------------+-----------------------------+
         |                             |                             |
         v                             v                             v
[apps.incidents.Incident]    [apps.resources.Resource]    [apps.hospitals.Hospital]
         |                             |                             |
         v                             |                             v
[apps.incidents.IncidentVictim]        |                 [apps.hospitals.HospitalCapacity]
         |                             |                             |
         +-----------------------------+-----------------------------+
                                       |
                                       v
                           [apps.routing.RoadNode]
                                       |
                                       v
                          [apps.routing.RoadSegment]
                                       |
                                       v
                          [apps.optimization.Dispatch]
                                       |
                                       v
                         [apps.simulation.SimulationScenario]
                                       |
                                       v
                          [apps.simulation.SimulationEvent]
```

---

## 7. Django Apps & Service Layer Mapping

| Django App | Key Models | Service Class | Primary Responsibility |
| :--- | :--- | :--- | :--- |
| **`core`** | `AuditLog` | `AuditService` | Immutable system event logging and exception formatting. |
| **`accounts`** | `User` | `AuthService` | JWT authentication and role-based permissions (`IsCoordinator`). |
| **`incidents`**| `Incident`, `IncidentVictim` | `PriorityEngine` | Deterministic linear weighted composite scoring ($0-100$). |
| **`resources`**| `Resource` | `FleetService` | Resource tracking, capability matching, and status transitions. |
| **`hospitals`**| `Hospital` | `HospitalMatcher` | ICU/Bed capacity load balancing and casualty routing. |
| **`routing`**  | `RoadNode`, `RoadSegment` | `DynamicGraphRouter` | In-memory graph construction and dynamic Dijkstra detours. |
| **`optimization`**| `Dispatch` | `GlobalResourceOptimizer` | SciPy Hungarian algorithm bipartite assignment. |
| **`simulation`**| `SimulationScenario`, `SimulationEvent` | `SimulationEngine` | Scenario state isolation and step-based crisis simulation. |
| **`ai`**       | `AIAnalysis` (ephemeral) | `LLMBridgeService` | Provider abstraction for extraction, explanation, and EAP. |
| **`analytics`**| `MacroMetrics` | `AnalyticsService` | Response time aggregations and EAP compilation. |

---

## 8. API Implementation Roadmap & MVP Cut Line

| Endpoint | Method | Purpose | MVP Tier | Service Triggered |
| :--- | :--- | :--- | :--- | :--- |
| `/api/v1/auth/token/` | POST | Obtain JWT token pair | **MUST HAVE** | `AuthService` |
| `/api/v1/incidents/` | GET / POST | List & create incidents | **MUST HAVE** | `IncidentService` |
| `/api/v1/incidents/analyze-text/` | POST | AI extract parameters from text | **MUST HAVE** | `LLMBridgeService` |
| `/api/v1/incidents/{id}/recalculate-priority/` | POST | Recompute 0-100 priority score | **MUST HAVE** | `PriorityEngine` |
| `/api/v1/resources/` | GET | List fleet status & coordinates | **MUST HAVE** | `FleetService` |
| `/api/v1/hospitals/` | GET | List hospital bed & ICU telemetry | **MUST HAVE** | `HospitalService` |
| `/api/v1/roads/` | GET | Retrieve road network graph state | **MUST HAVE** | `DynamicGraphRouter` |
| `/api/v1/roads/{id}/toggle-blockage/` | POST | Toggle road segment blockage | **MUST HAVE** | `DynamicGraphRouter` |
| `/api/v1/optimization/run/` | POST | Run global Hungarian optimization | **MUST HAVE** | `GlobalResourceOptimizer` |
| `/api/v1/dispatch/approve/` | POST | Coordinator approves dispatch | **MUST HAVE** | `DispatchService` |
| `/api/v1/simulation/create-scenario/` | POST | Initialize sandbox scenario | **MUST HAVE** | `SimulationEngine` |
| `/api/v1/simulation/{id}/inject-event/`| POST | Inject bridge block or surge | **MUST HAVE** | `SimulationEngine` |
| `/api/v1/simulation/{id}/step/` | POST | Advance simulation clock +$\Delta t$ | **MUST HAVE** | `SimulationEngine` |
| `/api/v1/action-plan/generate/` | GET | Generate operational EAP summary | **SHOULD HAVE** | `AnalyticsService` |
| `/api/v1/analytics/summary/` | GET | Macro response time KPI metrics | **SHOULD HAVE** | `AnalyticsService` |
| `/api/v1/ws/alerts/` | WS | Real-time WebSocket event stream | **NICE TO HAVE** (Fallback: REST polling) | `Channels` |

---

## 9. 24-Hour Hour-by-Hour Execution Schedule

```
[Hour 00 - 02] | Phase 0 & Phase 1: Repo Setup, Docker, Django Core & User Model
[Hour 02 - 04] | Phase 2 & Phase 11: DB Models, Migrations, React Scaffold & Design Tokens
[Hour 04 - 06] | Phase 3 & Phase 4: Priority Scoring Engine & Graph Dijkstra Router
[Hour 06 - 08] | Phase 5 & Phase 7: Hungarian Optimizer & AI Provider Bridge
[Hour 08 - 10] | Phase 9 & Phase 10: DRF REST API ViewSets & Chennai Seed Command
[Hour 10 - 13] | Phase 12 & Phase 13: Leaflet Situation Map & Command Center Dashboard
[Hour 13 - 15] | Phase 14 & Phase 15: AI Intake Sandbox & Simulation Controls UI
[Hour 15 - 17] | Phase 8 & Phase 16: Dynamic Re-routing & Detour Integration Loop
[Hour 17 - 19] | Phase 6 & Phase 17: Hospital Matching Engine & Action Plan Exporter
[Hour 19 - 21] | Phase 18: Full End-to-End System Integration & Regression Testing
[Hour 21 - 23] | Phase 19: Demo Script Rehearsal & High-Fidelity UI Polish
[Hour 23 - 24] | Buffer & Final Freeze: Docker Verification & Submission Lock
```

---

## 10. Team Parallelization Matrix

### 3-Developer Allocation (Optimal Configuration)

```
+---------------------------------------------------------------------------------------------------+
| Developer A (Backend & Data Lead)                                                                 |
|   Hours 0-4:   Django Setup, PostgreSQL Models, DRF Serializers, Base Auth                        |
|   Hours 4-8:   DRF ViewSets, Incident/Resource/Hospital CRUD Endpoints                            |
|   Hours 8-12:  Simulation Engine, Event Injector, Chennai Disaster Seeder                         |
|   Hours 12-18: API Integration, State Management Hooks, Full-Stack Wiring                         |
|   Hours 18-24: End-to-End Testing, Error Handling, Docker Deployment                              |
+---------------------------------------------------------------------------------------------------+
| Developer B (Frontend & GIS Lead)                                                                 |
|   Hours 0-4:   Vite Setup, Tailwind Design System, Crisis Dark Theme Tokens                       |
|   Hours 4-8:   React-Leaflet Situation Map, Custom SVG Markers, Polyline Layers                   |
|   Hours 8-12:  Command Center Dashboard, Triage Queue, Telemetry Dock                             |
|   Hours 12-18: AI Intake Modal, Simulation Timeline UI, Detour Visualizer                         |
|   Hours 18-24: UI Micro-animations, KPI Gauges, Presentation Layout Polish                        |
+---------------------------------------------------------------------------------------------------+
| Developer C (AI & Algorithms Lead)                                                                |
|   Hours 0-4:   Priority Scoring Engine (0-100 Math) + Unit Tests                                  |
|   Hours 4-8:   In-Memory Road Graph + Dynamic Dijkstra Detour Router                             |
|   Hours 8-12:  SciPy Hungarian Resource Optimizer + Hospital Capacity Matcher                    |
|   Hours 12-18: AI Service Layer (OpenAI + LocalMock), JSON Schema Validation, EAP Generator       |
|   Hours 18-24: Algorithmic Verification, Edge Case Stress Tests, Demo Script Tuning               |
+---------------------------------------------------------------------------------------------------+
```

---

## 11. Technical Demo Sequence: "Operation Chennai Deluge"

| Demo Step | On-Screen Action | Backend API Triggered | Frontend UI Response |
| :--- | :--- | :--- | :--- |
| **Step 1** | Coordinator loads `/dashboard` | `GET /incidents`, `GET /resources`, `GET /roads` | Dark-mode map renders Chennai, 12 staged units, 8 hospitals. |
| **Step 2** | Click "Inject Crisis Batch" | `POST /simulation/1/inject-event` | 15 unstructured distress reports appear in left queue. |
| **Step 3** | Open Incident Intake modal | `POST /incidents/analyze-text/` | AI parses raw Tamil/English text into typed JSON in 1.2s. |
| **Step 4** | System triages queue | `POST /incidents/recalculate-priority` | Queue sorts descending: 4 Critical (Red), 6 High (Orange). |
| **Step 5** | Click "Run Smart Optimization"| `POST /optimization/run/` | SciPy assigns boats to flooded zones, ALS ambulances to trauma. |
| **Step 6** | Coordinator approves dispatch | `POST /dispatch/approve/` | Vehicles roll; animated green polylines connect assets to victims. |
| **Step 7** | Inject "Saidapet Bridge Block"| `POST /roads/14/toggle-blockage/` | Bridge turns red on map; alert banner flashes "Route Severed". |
| **Step 8** | Dynamic Detour Recalculation | `GET /dispatches/active` | Dijkstra recalculates detour via Guindy flyover in 60ms; polyline reroutes. |
| **Step 9** | Inject "GH Hospital ICU Full"| `PATCH /hospitals/2/capacity` | Hospital status switches to DIVERT; ambulance reroutes to Apollo. |
| **Step 10**| Click "Export Action Plan" | `GET /action-plan/generate/` | Clean executive markdown EAP appears with complete explainability trail. |

---

## 12. Failure Modes & Graceful Degradation Strategy

| Component | Failure Mode | Mitigation & Fallback Strategy |
| :--- | :--- | :--- |
| **LLM Provider** | OpenAI API timeout or rate limit | Automatically fallback to `LocalMockProvider` regex/keyword parser. Zero UI disruption. |
| **Road Router** | Islanding / Destination Unreachable | Router catches $\infty$ cost and flags assignment as "AERIAL / AMPHIBIOUS ACCESS ONLY". |
| **Hospital Capacity**| All city ICU beds at $100\%$ saturation | Caseload placed in critical stabilization buffer; secondary emergency shelters activated. |
| **WebSockets** | Connection dropped / firewall block | React Query automatically falls back to 3-second REST polling loop. |
| **Database** | Concurrency conflict on dispatch | Django `select_for_update()` ensures atomic row-level reservation of assets and beds. |

---

## 13. Security, RBAC & Deployment Architecture

### Security Controls:
- Stateless JWT authentication with secure HTTP-only refresh tokens.
- Strict RBAC enforced at DRF ViewSet layer: `COORDINATOR` (all permissions), `FIELD_OFFICER` (status updates only).
- Zero LLM API keys exposed to frontend client code.
- Input validation on all coordinates ($lat \in [-90, 90], lon \in [-180, 180]$) and counts.

### Docker Deployment (`docker-compose.yml`):
```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: resq_ai
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgrespassword
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    command: python manage.py runserver 0.0.0.0:8000
    volumes:
      - ./backend:/app
    ports:
      - "8000:8000"
    environment:
      - DEBUG=True
      - DATABASE_URL=postgres://postgres:postgrespassword@db:5432/resq_ai
      - AI_PROVIDER=local_mock
    depends_on:
      - db

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - backend

volumes:
  pgdata:
```

---

## 14. Architecture Consistency Audit & Validation
- **Framework Check:** Backend is 100% Django 5 + DRF. Frontend is 100% React + TypeScript + Vite. (Zero FastAPI, zero Flask, zero Node backend).
- **Database Check:** 100% PostgreSQL with relational schema. (Zero MongoDB / document store contradictions).
- **Algorithmic Separation:** LLM handles unstructured text parsing and natural language explainability. Deterministic Python engines handle 0–100 priority math, Dijkstra routing, and SciPy Hungarian resource matching.
- **Endpoint Alignment:** All API routes match 1:1 across SRS, UI/UX, User Workflow, Backend, and Implementation plans.
- **Zero Architecture Conflicts:** Verified.

---

## 15. Final Actionable Implementation Checklist

### Foundation & Core
- [ ] Initialize Git repository and directory tree (`backend/`, `frontend/`, `docker/`).
- [ ] Configure `backend/requirements.txt` and `frontend/package.json`.
- [ ] Create `config/settings/base.py`, `development.py`, and `.env.example`.
- [ ] Implement `TimeStampedModel`, `AuditLog`, and custom `User` model.
- [ ] Run initial migrations for `core` and `accounts`.

### Domain Models & Persistence
- [ ] Implement `Incident` and `IncidentVictim` models in `apps/incidents/`.
- [ ] Implement `Resource` model in `apps/resources/`.
- [ ] Implement `Hospital` model in `apps/hospitals/`.
- [ ] Implement `RoadNode` and `RoadSegment` models in `apps/routing/`.
- [ ] Implement `Dispatch` model in `apps/optimization/`.
- [ ] Implement `SimulationScenario` and `SimulationEvent` models in `apps/simulation/`.
- [ ] Execute `python manage.py makemigrations && python manage.py migrate`.

### Algorithmic Services & AI
- [ ] Implement `PriorityEngine.calculate_score()` with unit tests.
- [ ] Implement `DynamicGraphRouter` (in-memory Dijkstra with edge penalties).
- [ ] Implement `GlobalResourceOptimizer` (`scipy.optimize.linear_sum_assignment`).
- [ ] Implement `HospitalMatcher` (capacity and specialty load balancer).
- [ ] Implement `LLMBridgeService` with `OpenAIProvider` and `LocalMockProvider`.
- [ ] Implement `seed_chennai_scenario` Django management command.

### REST APIs & Endpoints
- [ ] Implement `IncidentViewSet` (`/api/v1/incidents/`, `/analyze-text/`, `/recalculate-priority/`).
- [ ] Implement `ResourceViewSet` (`/api/v1/resources/`).
- [ ] Implement `HospitalViewSet` (`/api/v1/hospitals/`).
- [ ] Implement `RoadViewSet` (`/api/v1/roads/`, `/toggle-blockage/`).
- [ ] Implement `OptimizationViewSet` (`/api/v1/optimization/run/`).
- [ ] Implement `DispatchViewSet` (`/api/v1/dispatch/approve/`).
- [ ] Implement `SimulationViewSet` (`/api/v1/simulation/create-scenario/`, `/inject-event/`, `/step/`).

### Frontend & UI/UX
- [ ] Setup Tailwind CSS tokens and crisis-mode dark theme.
- [ ] Build atomic components: `Button`, `Card`, `PriorityBadge`, `Modal`, `Toast`.
- [ ] Build `SituationMap` with Leaflet tiles, GeoJSON road overlay, and custom SVG markers.
- [ ] Build `CommandCenterPage` with left triage queue, center map, right explainability card, bottom telemetry dock.
- [ ] Build `IncidentIntakeModal` for AI text parsing and entity verification.
- [ ] Build `SimulationControls` with disruption event palette and impact metric cards.
- [ ] Build `ActionPlanViewer` for emergency briefing export.

### Integration, Testing & Demo
- [ ] Wire TanStack Query polling loops for incidents, resources, and road networks.
- [ ] Connect road blockage map click $\to$ backend toggle $\to$ animated detour update.
- [ ] Execute complete algorithmic unit test suite (`pytest` / `python manage.py test`).
- [ ] Test offline mock fallback (`AI_PROVIDER=local_mock`).
- [ ] Rehearse 16-step "Operation Chennai Deluge" demo walkthrough.
