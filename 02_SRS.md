# Software Requirements Specification (SRS) — RESQ-AI

## Document Information
- **Project Name:** RESQ-AI (AI-Powered Emergency & Disaster Response Orchestration Platform)
- **Document Version:** 1.0.0
- **Document Status:** FORMAL ENGINEERING SPECIFICATION
- **Architecture Baseline:** React (TypeScript) + Django REST Framework + PostgreSQL + Graph/Routing & Optimization Engines
- **Target Persona:** Emergency Command Center Coordinator

---

## 1. System Overview
RESQ-AI is a high-availability, real-time emergency decision-support and dispatch orchestration platform. The system ingests multi-channel unstructured distress data, transforms it into typed domain models via an AI service layer, deterministically scores incident priorities, matches casualties with specialized hospital capacities, calculates optimal graph-based evacuation routes with dynamic obstacle avoidance, and generates explainable emergency action plans.

```
+----------------------------------------------------------------------------------------------------+
|                                      PRESENTATION TIER (React SPA)                                 |
|   Command Center UI | Live Leaflet Map | Incident Triage Queue | Asset Dock | Simulation Controls |
+-------------------------------------------------+--------------------------------------------------+
                                                  | HTTPS / REST / WebSockets
+-------------------------------------------------v--------------------------------------------------+
|                                    API & SERVICE TIER (Django + DRF)                               |
|  +-------------------+  +-------------------+  +--------------------+  +------------------------+  |
|  |  Incident Engine  |  |  Priority Engine  |  |   Routing Engine   |  |  Optimization Engine   |  |
|  +-------------------+  +-------------------+  +--------------------+  +------------------------+  |
|  +-------------------+  +-------------------+  +--------------------+  +------------------------+  |
|  |  Hospital Engine  |  | Simulation Engine |  | AI Service Layer   |  |  Notification Engine   |  |
|  +-------------------+  +-------------------+  +--------------------+  +------------------------+  |
+-------------------------------------------------+--------------------------------------------------+
                                                  | ORM / SQL
+-------------------------------------------------v--------------------------------------------------+
|                                      DATA TIER (PostgreSQL)                                        |
|   Users | Incidents | Resources | Hospitals | Road Nodes & Edges | Dispatches | Simulation Logs    |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. System Objectives
1. **Automated Structured Extraction:** Convert unstructured natural language distress reports into typed JSON schemas with $\ge 95\%$ accuracy.
2. **Objective Prioritization:** Compute deterministic, multi-attribute priority scores ($0.00 - 100.00$) in $< 100\text{ms}$ per incident.
3. **Collision-Free Resource Optimization:** Assign available rescue teams, boats, and ambulances to high-priority incidents under capacity constraints in $< 1.5\text{s}$.
4. **Dynamic Graph Obstacle Avoidance:** Automatically re-route emergency vehicles around flooded, damaged, or congested road segments in $< 200\text{ms}$.
5. **Capacity-Aware Hospital Matching:** Route critical trauma casualties to facilities with operational trauma bays, blood banks, and ICU vacancies.
6. **Auditable Decision Explainability:** Deliver structured mathematical proofs and natural language justifications for 100% of automated suggestions.

---

## 3. Scope of the System
- **Included in Scope:**
  - Web-based Emergency Operations Center (EOC) Command Dashboard.
  - Multi-channel distress text ingestion and AI parsing.
  - Deterministic priority scoring and queue management.
  - Road network graph representation and Dijkstra/A* routing.
  - Bipartite matching / constrained resource allocation engine.
  - Hospital bed, ICU, and trauma capability load-balancing.
  - Stateful what-if disaster simulation sandbox.
  - Explainable emergency action plan export (JSON, Markdown).
- **Explicitly Excluded:**
  - Physical hardware/IoT firmware engineering.
  - Autonomous vehicle steering or drone flight controllers.
  - Direct PSTN telecommunication carrier hardware switching.

---

## 4. Functional Requirements

### 4.1 Incident Management Subsystem (FR-INC)
- **FR-INC-001:** The system shall provide an endpoint `POST /api/v1/incidents/` to ingest structured emergency reports containing location coordinates, severity, victim count, and hazard category.
- **FR-INC-002:** The system shall provide an endpoint `POST /api/v1/incidents/analyze-text/` allowing raw text ingestion that triggers the AI Extraction Service to output structured incident parameters.
- **FR-INC-003:** The system shall maintain an immutable lifecycle state machine for each incident: `REPORTED`, `PARSED`, `TRIAGED`, `DISPATCHED`, `ON_SCENE`, `RESOLVED`, `CANCELLED`.
- **FR-INC-004:** The system shall support tagging incidents with victim vulnerability flags: `ELDERLY`, `INFANT`, `PREGNANT`, `DISABLED`, `OXYGEN_DEPENDENT`, `DIALYSIS_DEPENDENT`.
- **FR-INC-005:** The system shall automatically escalate the priority of unresolved incidents via a time-decay factor after $T_{\text{decay}} \ge 15\text{ minutes}$.

### 4.2 Priority Scoring Subsystem (FR-PRI)
- **FR-PRI-001:** The system shall compute a composite priority score $P \in [0.00, 100.00]$ using a deterministic linear weighted sum of severity, scale, vulnerability, medical flag, urgency, and wait time.
- **FR-PRI-002:** The system shall classify incidents into four distinct priority tiers: `CRITICAL` ($[80, 100]$), `HIGH` ($[60, 79.99]$), `MEDIUM` ($[35, 59.99]$), and `LOW` ($[0, 34.99]$).
- **FR-PRI-003:** The priority calculation formula shall be fully configurable via administrative settings without requiring code deployment or server restart.

### 4.3 Resource Management Subsystem (FR-RES)
- **FR-RES-001:** The system shall track the real-time status of all emergency resources: `AVAILABLE`, `ASSIGNED`, `EN_ROUTE_INCIDENT`, `ON_SCENE`, `TRANSPORTING_HOSPITAL`, `RETURNING`, `OFFLINE`.
- **FR-RES-002:** The system shall support resource categorization: `AMBULANCE_BLS`, `AMBULANCE_ALS`, `RESCUE_BOAT`, `NDRF_TACTICAL_TEAM`, `FIRE_ENGINE`, `EVACUATION_BUS`, `HELICOPTER`.
- **FR-RES-003:** The system shall enforce capability matching such that waterlogged flood zones ($> 3\text{ ft}$) strictly require watercraft capabilities (`RESCUE_BOAT`).
- **FR-RES-004:** The system shall track resource passenger capacity and prevent assigning casualty loads that exceed the rated capacity $C_{\text{max}}$.

### 4.4 Dynamic Routing Subsystem (FR-ROUT)
- **FR-ROUT-001:** The system shall model the municipal road network as a directed weighted graph $G = (V, E)$, where $V$ represents intersections and $E$ represents road segments.
- **FR-ROUT-002:** The system shall compute shortest and safest paths between origin and destination nodes using Dijkstra's algorithm with dynamic penalty weights.
- **FR-ROUT-003:** The system shall support setting edge status to `CLEAR`, `CONGESTED`, `WATERLOGGED`, `HAZARDOUS`, or `BLOCKED`.
- **FR-ROUT-004:** When an edge is marked `BLOCKED`, the system shall immediately set its weight $W_e = \infty$ and trigger a re-route sweep across all active dispatches traversing that edge.
- **FR-ROUT-005:** The system shall return GeoJSON-compliant route geometries with step-by-step turn coordinates and estimated travel time in minutes.

### 4.5 Resource Optimization Subsystem (FR-OPT)
- **FR-OPT-001:** The system shall execute global resource-incident assignment using the Hungarian Algorithm / Linear Sum Assignment minimizing total response time weighted by incident priority.
- **FR-OPT-002:** The optimization engine shall filter the assignment candidate matrix by capability, active availability, and reachability.
- **FR-OPT-003:** If resource count $M < N$ (incidents), the engine shall greedily satisfy Tier-1 (`CRITICAL`) incidents first before allocating assets to lower tiers.
- **FR-OPT-004:** The optimization run shall return an execution plan containing proposed dispatches, overall cost metric, and unallocated incident warnings.

### 4.6 Hospital Matching Subsystem (FR-HOSP)
- **FR-HOSP-001:** The system shall track real-time hospital operational status: `ACCEPTING`, `DIVERT_SURGE`, `DIVERT_FULL`, `OFFLINE_BLACKOUT`.
- **FR-HOSP-002:** The system shall track capacity parameters: `general_beds_total`, `general_beds_available`, `icu_beds_total`, `icu_beds_available`, `trauma_bay_active`.
- **FR-HOSP-003:** The system shall evaluate hospital suitability using a multi-criteria scoring function factoring travel time, available bed percentage, and specialized medical match.
- **FR-HOSP-004:** When a hospital reaches $\ge 90\%$ ICU saturation, the system shall automatically divert subsequent critical trauma cases to the nearest eligible secondary hospital.

### 4.7 Simulation & What-If Subsystem (FR-SIM)
- **FR-SIM-001:** The system shall provide an isolated simulation sandbox environment allowing state mutation without corrupting persistent baseline records.
- **FR-SIM-002:** The simulation engine shall support event injection: `BLOCK_ROAD`, `FAIL_HOSPITAL`, `SPAWN_INCIDENTS`, `DISABLE_RESOURCE`, `RAISE_WATER_LEVEL`.
- **FR-SIM-003:** The system shall support discrete time stepping ($\Delta t = 1, 5, 15\text{ minutes}$) to simulate disaster escalation and asset movement.
- **FR-SIM-004:** The simulation engine shall calculate delta metrics comparing baseline response against post-disruption re-optimized plans.

### 4.8 AI & Explainability Subsystem (FR-AI)
- **FR-AI-001:** The AI service layer shall provide a standardized interface supporting OpenAI, Anthropic, and local heuristic fallback providers.
- **FR-AI-002:** All AI extraction outputs must conform to a strict JSON Schema validated by backend serializers.
- **FR-AI-003:** The system shall generate a two-tier explainability report for every dispatch: (a) Mathematical scoring breakdown and (b) Natural-language situational rationale.
- **FR-AI-004:** The system shall generate a structured Emergency Action Plan (EAP) summarizing operational assignments, transit corridors, and casualty hospital allocations.

---

## 5. Non-Functional Requirements (NFR)

### 5.1 Performance Requirements (NFR-PERF)
- **NFR-PERF-001:** The API shall respond to 95% of standard read/write queries in $< 200\text{ms}$ under a load of 100 concurrent requests.
- **NFR-PERF-002:** The Priority Scoring Engine shall compute priority scores for 100 incidents in $< 100\text{ms}$.
- **NFR-PERF-003:** The Global Resource Optimization Engine shall generate complete assignments for 50 resources and 100 incidents in $< 1200\text{ms}$.
- **NFR-PERF-004:** The Dynamic Routing Engine shall recalculate a single-pair shortest path on a 500-node graph in $< 80\text{ms}$.
- **NFR-PERF-005:** The frontend map shall maintain a smooth render rate of $\ge 50\text{ fps}$ while displaying 300+ dynamic markers and polylines.

### 5.2 Security Requirements (NFR-SEC)
- **NFR-SEC-001:** All API communications shall be encrypted in transit using TLS 1.3 / HTTPS.
- **NFR-SEC-002:** User authentication shall use JSON Web Tokens (JWT) with 15-minute access tokens and secure HTTP-only refresh tokens.
- **NFR-SEC-003:** The backend shall enforce Role-Based Access Control (RBAC) across all endpoints.
- **NFR-SEC-004:** All database queries shall use Django ORM parameterized statements to eliminate SQL Injection vulnerabilities.
- **NFR-SEC-005:** All free-text inputs sent to the LLM shall be sanitized to prevent prompt injection attacks.

### 5.3 Reliability & Availability (NFR-REL)
- **NFR-REL-001:** The system shall maintain 99.9% uptime during active simulation and demo execution.
- **NFR-REL-002:** If the external LLM provider experiences a timeout ($> 3000\text{ms}$) or rate limit, the system shall seamlessly degrade to local heuristic parsing without throwing an unhandled 500 error.
- **NFR-REL-003:** Database writes shall execute in ACID transactions ensuring zero phantom resource assignments.

### 5.4 Scalability & Maintainability (NFR-SCAL)
- **NFR-SCAL-001:** The backend architecture shall remain completely stateless to support horizontal container scaling behind a load balancer.
- **NFR-SCAL-002:** The database schema shall maintain foreign key B-tree indices and spatial indices to support up to 50,000 historical incident records.
- **NFR-SCAL-003:** Test coverage across core domain services (priority, routing, optimization) shall exceed 80%.

---

## 6. System & Component Architecture

```
                                  +-----------------------+
                                  |   React Frontend SPA  |
                                  |   (TypeScript + Vite) |
                                  +-----------+-----------+
                                              |
                                              | REST / WebSocket
                                              v
                              +---------------+---------------+
                              |    Django 5 + DRF Backend     |
                              |   (Authentication & Routing)  |
                              +---------------+---------------+
                                              |
        +-----------------------+-------------+-------------+-----------------------+
        |                       |                           |                       |
        v                       v                           v                       v
+---------------+       +---------------+           +---------------+       +---------------+
| Priority      |       | Dynamic Route |           | Resource      |       | AI Service    |
| Engine        |       | Engine        |           | Optimizer     |       | Layer         |
| (Multi-Factor)|       | (Dijkstra/A*) |           | (Hungarian)   |       | (LLM Bridge)  |
+-------+-------+       +-------+-------+           +-------+-------+       +-------+-------+
        |                       |                           |                       |
        +-----------------------+-------------+-------------+-----------------------+
                                              |
                                              v
                                  +-----------+-----------+
                                  |  PostgreSQL Database  |
                                  |  (Relational Storage) |
                                  +-----------------------+
```

---

## 7. Frontend Technical Requirements
- **Framework:** React 18+ with TypeScript.
- **Build Tool:** Vite for sub-second HMR and optimized production bundles.
- **Routing:** React Router v6 with protected route guards based on user role.
- **State Management:** TanStack Query (React Query) for server state caching, invalidation, and background polling.
- **Mapping Library:** Leaflet / React-Leaflet with custom SVG markers, dynamic polyline rendering, and tile caching.
- **UI & Styling:** Tailwind CSS / Vanilla CSS modules with high-contrast crisis-mode dark theme.
- **Component Architecture:** Atomic design (Atoms $\to$ Molecules $\to$ Organisms $\to$ Feature Panels).

---

## 8. Backend Technical Requirements
- **Framework:** Django 5.x with Django REST Framework (DRF).
- **Python Version:** Python 3.11+.
- **Database Engine:** PostgreSQL 15+ (with `psycopg2` / `psycopg3`).
- **Graph Processing:** NetworkX / Python standard graph algorithms for in-memory road network calculations.
- **Numerical Optimization:** SciPy (`scipy.optimize.linear_sum_assignment`) / NumPy for fast matrix math.
- **Architecture Pattern:** Clean Layered Architecture: `Views` $\to$ `Serializers` $\to$ `Services` $\to$ `Domain Engines` $\to$ `Models`.

---

## 9. Database Entity Requirements & Data Dictionary

### Core Relational Models:
1. `User` & `Role`: Operator authentication, role permissions (`COORDINATOR`, `FIELD_OFFICER`, `MEDICAL_LEAD`, `ADMIN`).
2. `Incident`: Emergency event record containing location, raw text, priority score, tier, and status.
3. `IncidentVictim`: Granular count of victims, vulnerable individuals, mobility, and specific medical dependencies.
4. `Resource`: Emergency asset record containing type, location, passenger capacity, capabilities, and status.
5. `Hospital`: Medical facility record containing coordinates, bed counts, ICU counts, and divert status.
6. `RoadNode` & `RoadSegment`: Graph vertices (intersections) and edges (streets) with length, base speed, and blockage state.
7. `Dispatch`: Operational assignment linking Incident, Resource, Target Hospital, Route, ETA, and Status.
8. `SimulationScenario` & `SimulationEvent`: State snapshot and timeline of injected disruption events.
9. `AuditLog`: Immutable audit trail tracking automated calculations and operator overrides.

---

## 10. API Specifications & Endpoints (Catalog)

### 10.1 Incident Endpoints (API-INC)
- `GET /api/v1/incidents/`: List all incidents with filtering by status, priority tier, and hazard type.
- `POST /api/v1/incidents/`: Create new structured incident record.
- `GET /api/v1/incidents/{id}/`: Retrieve detailed incident profile with victim breakdown.
- `PATCH /api/v1/incidents/{id}/`: Update incident status or manual overrides.
- `POST /api/v1/incidents/analyze-text/`: AI extraction endpoint transforming raw text to structured incident.
- `POST /api/v1/incidents/{id}/recalculate-priority/`: Recompute deterministic priority score.

### 10.2 Resource Endpoints (API-RES)
- `GET /api/v1/resources/`: List emergency fleet with live locations and availability status.
- `POST /api/v1/resources/`: Register new emergency resource asset.
- `PATCH /api/v1/resources/{id}/status/`: Update operational status (`AVAILABLE`, `OFFLINE`, etc.).

### 10.3 Routing Endpoints (API-ROUT)
- `POST /api/v1/routes/calculate/`: Calculate shortest route between origin and destination coordinates.
- `GET /api/v1/roads/`: Retrieve road network graph status and active blockage set.
- `POST /api/v1/roads/{id}/toggle-blockage/`: Invert edge blockage status and trigger recalculation.

### 10.4 Optimization & Dispatch Endpoints (API-OPT)
- `POST /api/v1/optimization/run/`: Execute global bipartite assignment optimization.
- `POST /api/v1/dispatch/approve/`: Coordinator approves proposed dispatch recommendation.
- `POST /api/v1/dispatch/{id}/cancel/`: Abort active dispatch and return asset to pool.

### 10.5 Hospital Endpoints (API-HOSP)
- `GET /api/v1/hospitals/`: List all hospitals with live bed and ICU telemetry.
- `PATCH /api/v1/hospitals/{id}/capacity/`: Update available bed and ICU counts.
- `POST /api/v1/hospitals/match/`: Match a specific casualty requirement to optimal hospital.

### 10.6 Simulation Endpoints (API-SIM)
- `POST /api/v1/simulation/create-scenario/`: Initialize new isolated simulation sandbox.
- `POST /api/v1/simulation/{id}/inject-event/`: Inject disruption (road block, hospital failure, flood surge).
- `POST /api/v1/simulation/{id}/step/`: Advance simulation clock by $\Delta t$.
- `POST /api/v1/simulation/{id}/reset/`: Revert sandbox to baseline state.

### 10.7 Action Plan & AI Endpoints (API-AI)
- `GET /api/v1/action-plan/generate/`: Generate complete explainable Emergency Action Plan (EAP).
- `POST /api/v1/explain/assignment/`: Generate natural language explanation for a specific dispatch decision.

---

## 11. AI Service Interface & Schema Validation
The AI Service Layer implements a strict contract:

```python
class LLMProviderInterface(ABC):
    @abstractmethod
    def extract_incident(self, raw_text: str) -> IncidentExtractionResult:
        pass

    @abstractmethod
    def generate_explanation(self, context_dict: dict) -> str:
        pass

    @abstractmethod
    def generate_action_plan(self, scenario_summary: dict) -> str:
        pass
```

### Incident Extraction Output Schema:
```json
{
  "location_name": "string",
  "latitude": 13.0827,
  "longitude": 80.2707,
  "hazard_type": "FLOOD | FIRE | MEDICAL | STRUCTURAL_COLLAPSE",
  "severity": "CRITICAL | HIGH | MEDIUM | LOW",
  "people_affected": 3,
  "vulnerable_people": 2,
  "vulnerability_types": ["ELDERLY", "DIALYSIS_DEPENDENT"],
  "medical_need": true,
  "mobility_status": "TRAPPED | LIMITED | AMBULATORY",
  "urgency": "IMMEDIATE | URGENT | MODERATE",
  "confidence_score": 0.94
}
```

---

## 12. Dynamic Graph Routing Specification
- **Nodes ($V$):** Intersection coordinates $(lat_i, lon_i)$ with unique integer IDs.
- **Edges ($E$):** Directed segments $(u, v)$ with attributes:
  - `length_km`: Euclidean / Haversine distance.
  - `base_speed_kmh`: Normal speed limit ($30 - 60\text{ km/h}$).
  - `hazard_multiplier`: Float multiplier ($1.0 = \text{clear}, 2.5 = \text{waterlogged}, \infty = \text{blocked}$).
- **Traversal Cost Formula:**
  $$\text{Cost}(u, v) = \left( \frac{\text{length\_km}}{\text{base\_speed\_kmh}} \times 60 \right) \times \text{hazard\_multiplier}$$
- **Routing Algorithm:** Modified Dijkstra algorithm returning ordered node list and cumulative travel time.

---

## 13. Deterministic Resource Allocation Algorithm
- **Candidate Cost Matrix Construction:**
  For $N$ unassigned incidents and $M$ available resources:
  $$C_{ij} = \begin{cases} 
  w_1 \cdot \text{ETA}(R_j, I_i) - w_2 \cdot \text{Priority}(I_i) + w_3 \cdot \text{Risk}_{ij} & \text{if } R_j \text{ is capable of } I_i \\
  \infty & \text{otherwise}
  \end{cases}$$
- **Assignment Computation:** Execute `scipy.optimize.linear_sum_assignment(C)` to find optimal matching $\pi^*$ minimizing total cost $\sum C_{i, \pi(i)}$.
- **Post-Processing:** Prune assignments where cost is $\infty$; log unassigned incidents to alert queue.

---

## 14. Hospital Matching Algorithm
- **Objective:** Select hospital $H_k$ minimizing casualty transit risk while respecting bed capacity.
- **Score Calculation:**
  $$\text{Score}(H_k, I_i) = \alpha \cdot \text{TravelTime}(I_i, H_k) + \beta \cdot \left( \frac{\text{OccupiedICU}_k}{\text{TotalICU}_k} \times 100 \right) - \gamma \cdot \text{SpecialtyBonus}_k$$
- **Hard Constraints:**
  - If $I_i.\text{medical\_need} == \text{True}$ and $I_i.\text{needs\_icu} == \text{True}$, then $H_k.\text{icu\_available} > 0$.
  - If $H_k.\text{status} == \text{DIVERT\_FULL}$, $H_k$ is excluded from candidate set.

---

## 15. Authentication, Authorization & RBAC
- **Roles Defined:**
  1. `COORDINATOR`: Full read/write access to all dispatches, optimizations, and simulation controls.
  2. `FIELD_OFFICER`: Read access to command map, write access to assign status and on-scene reports.
  3. `MEDICAL_LEAD`: Read/write access to hospital bed telemetry and medical dispatch queues.
  4. `ADMIN`: Full system configuration, user role management, and audit log inspection.
- **Enforcement:** Django DRF Custom Permissions (`IsCoordinator`, `IsMedicalLead`, `IsFieldOfficer`).

---

## 16. Validation & Schema Enforcement
- All incoming REST payloads validated via DRF Serializers.
- Strict data type constraints:
  - Latitudes: $[-90.0, 90.0]$
  - Longitudes: $[-180.0, 180.0]$
  - Counts: Non-negative integers $\ge 0$.
  - Priority scores: Bounded floats $[0.00, 100.00]$.

---

## 17. Error Handling & HTTP Status Standards
- `200 OK`: Successful read or idempotent update.
- `201 Created`: Successful entity creation.
- `400 Bad Request`: Schema validation failure with field-level error dictionary.
- `401 Unauthorized`: Missing or expired JWT token.
- `403 Forbidden`: Insufficient role permissions.
- `404 Not Found`: Entity ID does not exist.
- `409 Conflict`: Resource already assigned or state transition invalid.
- `500 Internal Server Error`: Unhandled server exception with sanitized error tracking ID.

---

## 18. Logging, Auditability & Monitoring
- **Application Logging:** Python `logging` module with structured JSON formatter outputting timestamp, logger name, log level, user ID, and execution duration.
- **Audit Logging:** Every automated optimization run, manual dispatch override, and road blockage toggle is recorded in the `AuditLog` table with before/after state diffs.

---

## 19. Data Privacy & Compliance
- PII fields (`reporter_name`, `phone_number`) stored with column-level masking for unauthorized roles.
- System complies with emergency operational data handling principles (ephemeral retention for demo data, audit persistence for operational orders).

---

## 20. Testing Requirements & Verification Matrix
- **Unit Tests:**
  - Priority scoring formula accuracy across edge cases (all weights zero, all flags active).
  - Graph routing algorithm detour correctness on isolated diamond and grid graphs.
  - Hospital allocation score weighting and capacity constraint validation.
- **Integration Tests:**
  - End-to-end incident ingestion $\to$ AI parse $\to$ scoring $\to$ optimization $\to$ dispatch flow.
  - Road blockage injection $\to$ active dispatch route re-calculation check.
- **API Contract Tests:**
  - DRF schema validation tests ensuring 100% compliant request/response formats.

---

## 21. Deployment & Environment Configuration

### Environment Variables Matrix:
| Variable Name | Type | Description | Default / Example |
| :--- | :--- | :--- | :--- |
| `DEBUG` | Boolean | Django debug mode flag | `False` |
| `SECRET_KEY` | String | Django cryptographic secret | `django-insecure-resq-ai-key` |
| `DATABASE_URL` | String | PostgreSQL connection string | `postgres://user:pass@localhost:5432/resq_ai` |
| `AI_PROVIDER` | String | Active AI provider choice | `openai` / `local_mock` |
| `OPENAI_API_KEY` | String | Secret API key for OpenAI | `sk-...` |
| `CORS_ALLOWED_ORIGINS`| String | Comma-separated allowed frontend URLs | `http://localhost:5173,http://localhost:3000` |
| `DEFAULT_SCENARIO` | String | Initial disaster seed scenario | `chennai_deluge_2026` |
