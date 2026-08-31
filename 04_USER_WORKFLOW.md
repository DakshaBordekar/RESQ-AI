# User Workflow Specification — RESQ-AI

## Document Information
- **Project Name:** RESQ-AI (AI-Powered Emergency & Disaster Response Orchestration Platform)
- **Document Version:** 1.0.0
- **Document Status:** FORMAL WORKFLOW SPECIFICATION
- **Target Persona:** Emergency Command Center Coordinator

---

## 1. Master System Workflow Architecture Overview

```
[Distress Ingestion] ---> [AI Parsing Layer] ---> [Priority Engine] ---> [Global Optimizer]
         |                       |                       |                      |
   Raw Citizen Text         Structured JSON          Score (0-100)        Matching Matrix
         |                       |                       |                      |
         v                       v                       v                      v
[Dynamic Road Router] <---> [Command Center Map] <---> [Hospital Allocator] <---> [Human Approval]
  (Dijkstra Detours)          (Live Situation)        (ICU & Trauma Bed)       (Dispatch Order)
```

---

## 2. Key Sequence Workflows

### Sequence Flow A: Incident Intake, AI Extraction, and Priority Triaging
```
Citizen / Operator          Frontend UI          Django Backend API        AI Service Layer      Priority Engine
      |                          |                       |                        |                     |
      |-- 1. Raw Distress Text ->|                       |                        |                     |
      |   "Trapped on 2nd floor" |                       |                        |                     |
      |                          |-- 2. POST /analyze -->|                        |                     |
      |                          |                       |-- 3. Extract Schema -->|                     |
      |                          |                       |   (Strict JSON prompt) |                     |
      |                          |                       |<-- 4. Extracted JSON --|                     |
      |                          |                       |   (Loc, Victims, Med)  |                     |
      |                          |<-- 5. Preview JSON ---|                        |                     |
      |                          |                       |                        |                     |
      |-- 6. Operator Verifies ->|                       |                        |                     |
      |                          |-- 7. POST /incidents->|                        |                     |
      |                          |                       |-- 8. Compute Score ------------------------->|
      |                          |                       |<-- 9. Priority P=94.5 (CRITICAL) ------------|
      |                          |                       |   (Save to PostgreSQL) |                     |
      |                          |<-- 10. 201 Created ---|                        |                     |
      |                          |   (Live Pin & Queue)  |                        |                     |
```

### Sequence Flow B: Road Blockage Disruption and Dynamic Re-Routing
```
GIS Specialist / Sim        Frontend Map        Django Backend API       Routing Engine       Active Dispatches
      |                          |                       |                      |                     |
      |-- 1. Click Block Road -->|                       |                      |                     |
      |   (Saidapet Bridge)      |                       |                      |                     |
      |                          |-- 2. Toggle Block --->|                      |                     |
      |                          |   POST /roads/block   |                      |                     |
      |                          |                       |-- 3. Set W(e) = inf->|                     |
      |                          |                       |-- 4. Find Traversed ---------------------->|
      |                          |                       |<-- 5. Impacted: Dispatch #12 --------------|
      |                          |                       |-- 6. Dijkstra Detour>|                     |
      |                          |                       |<-- 7. New Polyline --|                     |
      |                          |                       |   (ETA +4 mins)      |                     |
      |                          |<-- 8. 200 OK + Route -|                      |                     |
      |                          |-- 9. Update Line ---->|                      |                     |
      |                          |   (Red Alert Toast)   |                      |                     |
```

---

## 3. Workflow Catalog (20 End-to-End Operational Workflows)

---

### Workflow 1: Operator Authentication & Login
- **Actor:** Emergency Command Coordinator / Dispatcher.
- **Preconditions:** User has active credentials in PostgreSQL `auth_user` table with assigned RBAC role.
- **Trigger:** User navigates to `/login` and enters username/password.
- **Main Flow:**
  1. Frontend submits credentials to `POST /api/v1/auth/token/`.
  2. Django backend validates credentials, fetches user role, and issues signed JWT access/refresh token pair.
  3. Frontend stores access token in memory/secure storage and redirects to `/dashboard`.
- **Alternative Flow:** If user has 2FA enabled, backend returns `206 Partial Content` with temporary challenge token.
- **Failure Flow:** Invalid credentials return `401 Unauthorized` with error message "Invalid credentials or inactive account".
- **Database Changes:** `User.last_login` timestamp updated.
- **API Calls:** `POST /api/v1/auth/token/`
- **Frontend State:** `authStore.isAuthenticated = true`, `userRole = 'COORDINATOR'`.
- **AI Involvement:** None.
- **Final State:** User is authenticated and viewing the Command Center dashboard.

---

### Workflow 2: Command Center Dashboard Access & State Hydration
- **Actor:** Emergency Command Coordinator.
- **Preconditions:** User is authenticated with valid JWT.
- **Trigger:** Browser loads `/dashboard`.
- **Main Flow:**
  1. Frontend initiates parallel queries:
     - `GET /api/v1/incidents/` (Active incidents sorted by priority)
     - `GET /api/v1/resources/` (Active fleet locations and availability)
     - `GET /api/v1/hospitals/` (Capacity and ICU telemetry)
     - `GET /api/v1/roads/` (Road network graph and active blockages)
  2. TanStack Query caches server responses.
  3. React Leaflet map renders Chennai base tiles and overlays incident pins, vehicle icons, and road vectors.
- **Failure Flow:** If backend connection fails, frontend renders retry banner with offline cache fallback.
- **API Calls:** `GET /api/v1/incidents/`, `GET /api/v1/resources/`, `GET /api/v1/hospitals/`, `GET /api/v1/roads/`
- **Frontend State:** Master dashboard hydrated with live geospatial pins and sorted triage queue.

---

### Workflow 3: Manual Incident Creation
- **Actor:** Call Center Operator.
- **Preconditions:** Operator receives an emergency call with verified coordinates.
- **Trigger:** Operator clicks "+ New Incident" in Command Center.
- **Main Flow:**
  1. Operator fills modal form: title, address/coordinates, victim count, vulnerability flags, hazard type.
  2. Form submits payload to `POST /api/v1/incidents/`.
  3. Backend creates `Incident` record in `REPORTED` state.
  4. Backend automatically triggers Priority Scoring Engine.
  5. Incident appears in real-time triage queue.
- **API Calls:** `POST /api/v1/incidents/`
- **Database Changes:** Insert into `incidents_incident` and `incidents_incidentvictim`.
- **Final State:** Incident created and scored with priority tier.

---

### Workflow 4: AI-Powered Unstructured Distress Report Extraction
- **Actor:** Call Center Operator / Citizen Intake.
- **Preconditions:** Unstructured distress message received (SMS, radio transcription, citizen web portal).
- **Trigger:** Operator pastes freeform text into Intake Sandbox and clicks "AI Extract".
- **Main Flow:**
  1. Frontend sends text to `POST /api/v1/incidents/analyze-text/`.
  2. Backend AI service packages prompt with strict JSON schema instructions.
  3. LLM extracts entities: location, hazard type, victim count, vulnerability flags, medical urgency.
  4. Backend validates JSON against `IncidentExtractionSchema`.
  5. Extracted data returned to frontend for operator review.
- **Failure Flow:** If LLM times out ($> 3000\text{ms}$), heuristic regex parser extracts basic keywords and sets `confidence_score = 0.50`.
- **API Calls:** `POST /api/v1/incidents/analyze-text/`
- **AI Involvement:** High (LLM structured entity extraction and confidence scoring).
- **Final State:** Structured incident preview rendered in modal.

---

### Workflow 5: Incident Verification & Operator Staging
- **Actor:** Dispatch Coordinator.
- **Preconditions:** Structured extraction previewed in UI.
- **Trigger:** Operator reviews extracted fields and clicks "Verify & Stage".
- **Main Flow:**
  1. Operator corrects any location or victim count inaccuracies.
  2. Frontend sends verified payload to `POST /api/v1/incidents/`.
  3. Backend saves incident in `TRIAGED` state and triggers Priority Engine.
  4. Map places pulsating priority pin on coordinates.
- **API Calls:** `POST /api/v1/incidents/`
- **Database Changes:** `Incident.status = 'TRIAGED'`.
- **Final State:** Incident officially staged in the global triage queue.

---

### Workflow 6: Deterministic Priority Calculation
- **Actor:** System Automated / Coordinator.
- **Preconditions:** Incident record exists with validated attributes.
- **Trigger:** Incident creation, attribute update, or periodic time-decay tick.
- **Main Flow:**
  1. Priority Engine computes:
     $$P = 0.30 S + 0.20 V + 0.15 N + 0.15 M + 0.10 U + 0.10 T$$
  2. Score clamped to $[0.00, 100.00]$.
  3. Priority tier assigned (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
  4. Incident queue re-sorts descending by calculated score.
- **API Calls:** `POST /api/v1/incidents/{id}/recalculate-priority/`
- **Database Changes:** `Incident.calculated_priority = P`, `Incident.priority_tier = Tier`.
- **Final State:** Incident ranked deterministically in global queue.

---

### Workflow 7: Constrained Resource Optimization Run
- **Actor:** Emergency Command Coordinator.
- **Preconditions:** Unassigned incidents exist in queue; available emergency assets exist in fleet.
- **Trigger:** Coordinator clicks "Run Global Optimization" in dashboard header.
- **Main Flow:**
  1. Frontend issues `POST /api/v1/optimization/run/`.
  2. Optimization Engine constructs cost matrix $C_{ij}$ factoring priority, travel time, and capability match.
  3. Executes Hungarian Algorithm (`linear_sum_assignment`).
  4. Returns proposed multi-asset dispatch assignments with travel times and explainability metrics.
  5. UI displays proposed dispatch corridors on map with dashed glowing lines.
- **Optimization Involvement:** Global Bipartite Min-Cost Matching.
- **API Calls:** `POST /api/v1/optimization/run/`
- **Final State:** Staged dispatch recommendations awaiting operator approval.

---

### Workflow 8: Capacity-Aware Hospital Matching
- **Actor:** Medical Logistics Lead / Optimization Engine.
- **Preconditions:** Casualties require medical transport.
- **Trigger:** Optimization engine evaluates incident with `medical_need = True`.
- **Main Flow:**
  1. Engine queries all hospitals with `status != 'DIVERT_FULL'`.
  2. Filters facilities matching patient specialty requirements (ICU, Trauma, Pediatric).
  3. Calculates composite score balancing travel time and bed occupancy.
  4. Selects primary hospital and secondary divert facility.
- **API Calls:** `POST /api/v1/hospitals/match/`
- **Final State:** Target hospital assigned to dispatch recommendation.

---

### Workflow 9: Graph-Based Dynamic Route Calculation
- **Actor:** Routing Engine.
- **Preconditions:** Origin coordinate (Resource) and Destination coordinate (Incident/Hospital) provided.
- **Trigger:** Dispatch plan generated or road condition changed.
- **Main Flow:**
  1. Routing Engine maps origin/destination to nearest graph intersection nodes.
  2. Runs Dijkstra algorithm factoring active edge speeds and flood multipliers.
  3. Returns turn-by-turn polyline geometry, distance in km, and ETA in minutes.
- **API Calls:** `POST /api/v1/routes/calculate/`
- **Final State:** Route polyline rendered on Leaflet situation map.

---

### Workflow 10: Dispatch Approval & Unit Deployment
- **Actor:** Emergency Command Coordinator.
- **Preconditions:** Proposed dispatch plan displayed in UI.
- **Trigger:** Coordinator clicks "Approve & Dispatch Unit".
- **Main Flow:**
  1. Frontend submits `POST /api/v1/dispatch/approve/` with `dispatch_id`.
  2. Backend updates `Dispatch.status = 'DISPATCHED'`.
  3. Backend updates `Resource.status = 'EN_ROUTE_INCIDENT'` and reserves hospital bed.
  4. Route line turns from dashed to solid green on map; vehicle icon begins movement animation.
- **Database Changes:** Transactional update on `Dispatch`, `Resource`, and `HospitalCapacity`.
- **API Calls:** `POST /api/v1/dispatch/approve/`
- **Final State:** Emergency unit physically deployed.

---

### Workflow 11: Dynamic In-Transit Route Update
- **Actor:** System Automated.
- **Preconditions:** Resource is en route to an incident.
- **Trigger:** Minor traffic congestion reported on active path edge.
- **Main Flow:**
  1. System detects 20% slowdown on active segment.
  2. Recomputes Dijkstra path; evaluates if alternate corridor saves $\ge 3\text{ minutes}$.
  3. Updates active route geometry seamlessly without stopping vehicle.
- **Final State:** Navigation polyline updated on map.

---

### Workflow 12: Road Blockage Injection & Real-Time Detour Recalculation
- **Actor:** GIS Specialist / Simulation Engine.
- **Preconditions:** Active emergency vehicle is traversing Road Segment $E_k$.
- **Trigger:** Road Segment $E_k$ marked `BLOCKED` (e.g., bridge submerged).
- **Main Flow:**
  1. Operator toggles road segment to `BLOCKED` or simulation event fires.
  2. Backend sets $W(E_k) = \infty$ in graph.
  3. System sweeps active dispatches traversing $E_k$.
  4. Recalculates detour path from vehicle's current location to destination in $< 100\text{ms}$.
  5. UI displays warning toast: "Route Severed — Detour Recalculated (+4 mins)".
- **API Calls:** `POST /api/v1/roads/{id}/toggle-blockage/`
- **Final State:** Vehicle re-routed safely around flooded sector.

---

### Workflow 13: Surge Critical Incident Injection & Re-Optimization
- **Actor:** Simulation Engine / Ingestion Stream.
- **Preconditions:** All high-value assets currently assigned to medium-priority tasks.
- **Trigger:** Critical disaster report arrives ($P = 98.5$, trapped dialysis patients).
- **Main Flow:**
  1. New incident ingested and scored as Tier-1 `CRITICAL`.
  2. System detects zero idle ALS Ambulances.
  3. Evaluates if nearest en-route ambulance can be preemptively diverted from a low-priority task.
  4. Coordinator receives high-priority alert modal with recommended diversion plan.
  5. Coordinator approves swap with single click.
- **Final State:** Critical casualty assigned nearest unit; lower-priority task re-queued.

---

### Workflow 14: Hospital Saturation & Emergency Divert
- **Actor:** Hospital Administrator / Simulation Event.
- **Preconditions:** Hospital $H_1$ receives surge of walk-in casualties.
- **Trigger:** ICU beds at $H_1$ reach 0 ($100\%$ saturation); status switches to `DIVERT_FULL`.
- **Main Flow:**
  1. Hospital status updated via `PATCH /api/v1/hospitals/{id}/capacity/`.
  2. System identifies in-transit ambulances bound for $H_1$.
  3. Automatically re-allocates destinations to secondary facility $H_2$ (Apollo Greams Road).
  4. Recalculates new hospital routes for all affected ambulances.
- **Final State:** Ambulances diverted to facility with active ICU capacity.

---

### Workflow 15: Resource Breakdown / Mechanical Failure
- **Actor:** Field Responder / Simulation Event.
- **Preconditions:** Resource $R_3$ is en route to critical incident.
- **Trigger:** $R_3$ reports engine failure in deep water.
- **Main Flow:**
  1. Operator sets $R_3$ status to `OFFLINE`.
  2. Incident $I_5$ is immediately returned to `TRIAGED` state.
  3. Global Optimizer re-runs in background and assigns backup unit $R_7$.
- **Final State:** Incident protected from abandonment; backup dispatched.

---

### Workflow 16: What-If Crisis Simulation Sandbox Execution
- **Actor:** Emergency Coordinator.
- **Preconditions:** Simulation scenario selected (e.g., "Adyar Basin Dam Discharge").
- **Trigger:** Coordinator clicks "Advance Simulation +15 Mins".
- **Main Flow:**
  1. Frontend submits `POST /api/v1/simulation/{id}/step/` with `step_minutes = 15`.
  2. Simulation Engine advances water levels, blocks low-lying bridges, and spawns scripted distress calls.
  3. UI updates map flood polygons, highlights severed routes, and presents impact metrics.
- **API Calls:** `POST /api/v1/simulation/{id}/step/`
- **Final State:** Coordinator evaluates disaster progression under controlled simulation.

---

### Workflow 17: Emergency Action Plan (EAP) Generation & Export
- **Actor:** Incident Commander.
- **Preconditions:** Multi-asset response operations active.
- **Trigger:** Commander navigates to `/action-plan` and clicks "Generate Operational Briefing".
- **Main Flow:**
  1. Backend compiles operational metrics, sector assignments, and hospital loads into structured context.
  2. LLM synthesizes natural-language executive summary.
  3. UI renders formatted EAP with sector tables, route maps, and export buttons (PDF, Markdown, JSON).
- **API Calls:** `GET /api/v1/action-plan/generate/`
- **AI Involvement:** High (Executive synthesis and tactical narrative structuring).
- **Final State:** Standardized operational briefing ready for executive distribution.

---

### Workflow 18: Operator Manual Override & Audit Logging
- **Actor:** Emergency Coordinator.
- **Preconditions:** Automated optimization proposes Resource $R_1$ for Incident $I_4$.
- **Trigger:** Coordinator manually drags Resource $R_2$ onto Incident $I_4$.
- **Main Flow:**
  1. UI displays confirmation modal: "Override Automated Recommendation?".
  2. Coordinator enters brief rationale ("R2 possesses specialized bariatric stretcher").
  3. Backend updates assignment and logs override event in `AuditLog` table with timestamp and user ID.
- **Database Changes:** Insert into `core_auditlog`.
- **Final State:** Manual override executed and recorded in immutable audit log.

---

### Workflow 19: Incident On-Scene Resolution & Resource De-allocation
- **Actor:** Field Officer / Coordinator.
- **Preconditions:** Rescue unit arrives on scene and completes victim extraction.
- **Trigger:** Operator clicks "Mark Incident Resolved".
- **Main Flow:**
  1. Frontend submits `PATCH /api/v1/incidents/{id}/` with `status = 'RESOLVED'`.
  2. Incident pin turns grey on map and moves to "Resolved" archive tab.
  3. Resource status transitions to `RETURNING` or `AVAILABLE`.
- **Database Changes:** `Incident.status = 'RESOLVED'`, `Resource.status = 'AVAILABLE'`.
- **Final State:** Incident closed; resource returned to active dispatch pool.

---

### Workflow 20: Post-Operation Analytics & Response Debrief
- **Actor:** System Administrator / Emergency Coordinator.
- **Preconditions:** Disaster operation or simulation run completed.
- **Trigger:** User opens Analytics dashboard.
- **Main Flow:**
  1. Frontend fetches aggregated telemetry metrics: Mean Time to Triage, Fleet Utilization, Detour Counts, Hospital Load Variance.
  2. Renders interactive time-series charts and spatial heatmaps.
- **API Calls:** `GET /api/v1/analytics/summary/`
- **Final State:** Comprehensive operational debrief displayed.
