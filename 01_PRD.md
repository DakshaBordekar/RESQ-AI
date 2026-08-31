# Product Requirements Document (PRD) — RESQ-AI

## Document Information
- **Project Name:** RESQ-AI (AI-Powered Emergency & Disaster Response Orchestration Platform)
- **Document Version:** 1.0.0
- **Document Status:** APPROVED FOR ARCHITECTURE & IMPLEMENTATION
- **Domain:** Disaster & Emergency Response (Simulation & Decision Support)
- **Constraint Profile:** Software-Only Simulation (Zero Physical Hardware Required)
- **Primary Demo Persona:** Emergency Command Center Coordinator

---

## 1. Executive Summary
RESQ-AI is an intelligent, real-time emergency response orchestration and decision-support platform designed to manage high-stakes urban disaster scenarios (e.g., severe urban flooding, storm surges, industrial hazard cascades). In mass-casualty crisis events, emergency dispatch centers are inundated by high-velocity unstructured reports, conflicting priority claims, rapid infrastructure failures (e.g., road floodings, bridge collapses), and acute resource scarcity (ambulances, rescue boats, ICU beds).

RESQ-AI bridges the gap between chaotic multi-channel reporting and high-stakes operational execution. It combines Large Language Models (LLMs) for unstructured report parsing, natural language explanation, and operator summaries with deterministic mathematical algorithms for multi-attribute incident priority scoring, graph-based dynamic routing (Dijkstra/A* with dynamic edge penalties), and multi-criteria resource allocation (Hungarian algorithm / Min-Cost Bipartite Matching with capability and capacity constraints). The platform delivers a centralized command center dashboard offering real-time situational awareness, explainable resource assignments, what-if scenario simulation, and automated emergency action plan generation.

---

## 2. Product Vision
To empower disaster management authorities, emergency coordinators, and field officers with an auditable, deterministic, and AI-accelerated command operating system that reduces critical emergency response latency by over 40%, eliminates resource allocation conflicts, dynamically navigates compromised transport networks, and provides transparent, mathematically sound decision rationales under extreme uncertainty.

---

## 3. Problem Statement
During major urban crises—such as the Chennai urban deluge or monsoonal flash floods—emergency operations centers face a systemic breakdown in coordination across multiple operational layers:
1. **Information Inundation & Unstructured Data:** Thousands of distress calls, SMS messages, and field dispatches arrive in chaotic free-text formats lacking standardized coordinates, severity grading, or vulnerability tags.
2. **Subjective Prioritization:** Dispatchers triage incidents manually based on caller emotional intensity rather than objective composite risk matrices (e.g., trapped elderly individuals with medical dependencies vs. ambulatory adults).
3. **Sub-optimal Resource Allocation:** Rescue teams, boats, and ambulances are assigned ad-hoc on a first-come-first-served basis rather than solving a global multi-objective optimization problem under strict capacity and capability constraints.
4. **Dynamic Infrastructure Blindness:** Static navigation systems route emergency vehicles into flooded or blocked thoroughfares, causing dispatch stalls and vehicle losses.
5. **Hospital Overcrowding & Mismatch:** Patients are rushed to the nearest hospital regardless of specialized capability (trauma, burn, pediatrics) or current ICU/bed saturation, triggering secondary diversion delays.
6. **Lack of Explainability:** Black-box automated systems create operator distrust, while purely manual workflows fail to scale.

---

## 4. Current Disaster Response Problems
Legacy disaster management workflows suffer from four fatal vulnerabilities:
- **Siloed Communication:** Fire, police, medical, and municipal rescue units operate on disconnected radio channels with zero unified digital state.
- **Static Decision Making:** Once an ambulance is dispatched, it cannot dynamically adapt to real-time bridge washouts or sudden hospital bed saturation.
- **Latency in Information Extraction:** Human operators spend 3 to 7 minutes per emergency call manually transcribing and categorizing incident details into disparate legacy systems.
- **Zero Simulation Capability:** Incident commanders have no software tools to evaluate the systemic ripple effects of a dam discharge or road network collapse before committing physical assets.

---

## 5. Target Users
1. **Emergency Command Coordinator:** High-level decision-maker overseeing citywide crisis response, approving automated dispatch recommendations, and monitoring macro KPIs.
2. **Disaster Response Field Officer:** Tactical manager coordinating physical deployments of NDRF/SDRF rescue teams, flood rescue boats, and evacuation vehicles.
3. **Medical Logistics Coordinator:** Healthcare specialist tracking hospital bed availability, ICU occupancy, trauma center status, and ambulance-to-hospital routing.
4. **GIS / Infrastructure Specialist:** Engineering operator monitoring flood depths, bridge closures, and road network disruptions.
5. **System Administrator:** Platform maintainer managing user authentication, RBAC, API integrations, LLM provider fallback chains, and audit logs.

---

## 6. User Personas

### Persona 1: Rajesh Kumar — Chief Emergency Operations Coordinator (EOC)
- **Background:** 18 years in municipal disaster management and civil defense.
- **Core Needs:** Single-pane-of-glass situational awareness, rapid validation of automated resource dispatches, ability to simulate flood surge impacts on road networks.
- **Pain Points:** Disconnected spreadsheets, conflicting radio reports, lack of clarity on why certain ambulances were sent to distant hospitals.

### Persona 2: Dr. Priya Sundaram — Medical Logistics Lead
- **Background:** 12 years in emergency trauma triage and hospital administration.
- **Core Needs:** Real-time visibility into bed capacities, automated routing of ventilator-dependent flood victims to hospitals with operational backup power and ICU vacancies.
- **Pain Points:** Ambulances arriving at hospitals that are already in divert mode, requiring dangerous secondary transfers.

### Persona 3: Inspector K. Raman — NDRF Tactical Rescue Commander
- **Background:** 10 years in water rescue and field operations.
- **Core Needs:** Instant dispatch alerts with verified hazard types, turn-by-turn routes bypassing submerged underpasses, accurate victim counts and vulnerability tags.
- **Pain Points:** Dispatching inflatable boats to dry zones or light utility vehicles into 5-foot waterlogged corridors.

---

## 7. User Pain Points Matrix

| ID | Persona | Core Pain Point | RESQ-AI Solution |
| :--- | :--- | :--- | :--- |
| **PP-01** | Coordinator | Call centers overwhelmed by panic-filled, unstructured distress text. | LLM structured entity extraction with strict JSON schema parsing and fallback validation. |
| **PP-02** | Field Officer | Ambulances stranded in waterlogged roads during flash floods. | Dynamic road network graph with real-time blockage edge-weighting and automatic detour re-optimization. |
| **PP-03** | Medical Lead | Specialized trauma patients sent to primary clinics without blood banks or ICUs. | Multi-attribute hospital matching engine evaluating distance, capabilities, and real-time bed capacity. |
| **PP-04** | Coordinator | Operators override automated suggestions due to lack of trust. | Dual-layer explainability: mathematical scoring breakdown + human-readable justification narrative. |
| **PP-05** | Coordinator | Inability to test response plans before weather fronts escalate. | Built-in discrete what-if simulation sandbox allowing instant scenario mutation and re-planning. |

---

## 8. Product Goals
1. **Sub-Second Prioritization:** Ingest and mathematically score 100+ concurrent emergency incidents in $< 500\text{ms}$.
2. **Deterministic Resource Optimization:** Generate globally optimal, collision-free dispatch plans for available rescue teams and ambulances within 1.5 seconds.
3. **Adaptive Graph Re-routing:** Recalculate all affected vehicle routes in $< 200\text{ms}$ upon notification of road inundation or blockage.
4. **Structured Incident Parsing:** Attain $\ge 95\%$ entity extraction precision on unstructured citizen distress text via LLM zero-shot/few-shot structured extraction.
5. **Explainable Triage & Dispatch:** Provide mathematically grounded, human-auditable rationales for 100% of automated recommendations.
6. **Zero-Hardware Simulation Fidelity:** Deliver a fully interactive, deterministic simulation environment demonstrating a complete crisis lifecycle.

---

## 9. Non-Goals (Out of Scope)
- Physical IoT sensor hardware integration or custom LoRaWAN gateway firmware (simulated telemetry only).
- Direct bi-directional telecom carrier integration for legacy PSTN trunk lines.
- Native mobile app binary compilation for iOS/Android (responsive PWA / desktop web command center is primary).
- Automated physical vehicle autopilot or drone flight control systems.
- Unconstrained autonomous dispatch without operator approval (system operates as Decision Support, human-in-the-loop).

---

## 10. Product Scope

```
[ Unstructured Ingestion ] ---> [ LLM Parsing Layer ] ---> [ Multi-Factor Scoring ]
             |                           |                           |
    Citizen / Radio Text        Strict JSON Schema           Priority Score (0-100)
             |                           |                           |
             v                           v                           v
[ Dynamic Road Graph ] <---> [ Resource Optimizer ] <---> [ Hospital Matching ]
  (Dijkstra Detour Engine)     (Hungarian / Min-Cost)       (Capacity & Trauma Fit)
             |                           |                           |
             +---------------------------+---------------------------+
                                         v
                         [ Unified Command Center UI ]
                         (Map + Triage + Simulation)
```

---

## 11. MVP Scope (24-Hour Hackathon Implementation)
- **Incident Engine:** Manual incident creation, bulk JSON seed, citizen text simulation, and LLM extraction.
- **Priority Engine:** Deterministic scoring combining people affected, vulnerability, severity, medical need, and urgency.
- **Resource Management:** Real-time state tracking for ambulances, rescue boats, NDRF teams, and fire tenders.
- **Hospital Allocation:** Capacity, specialty, and travel-time aware matching engine.
- **Dynamic Routing:** Graph representation of Chennai road grid with real-time blockage toggling and Dijkstra recalculation.
- **Command Dashboard:** Interactive map (Leaflet/MapLibre), live incident queue, resource status dock, and dispatch plan viewer.
- **Simulation Sandbox:** What-if event injector (Road Blockage, Hospital Saturation, Cascade Incident Arrival).
- **Explainability Engine:** Structured rule/score audit trail + AI-generated natural language operational briefing.

---

## 12. Future Scope (Post-Hackathon Enhancements)
- Multi-agency federation (inter-state disaster management synchronization across national command grids).
- Satellite SAR (Synthetic Aperture Radar) flood extent raster overlay and automated road-cutting polygon analysis.
- Voice-to-text live telephony pipeline with multi-lingual Indian regional language transcription (Tamil, Hindi, Telugu).
- Decentralized offline-first field agent synchronization via peer-to-peer mesh networking.

---

## 13. Core Features Catalog

| Feature Code | Feature Name | Primary Purpose | Lead Module |
| :--- | :--- | :--- | :--- |
| **FEAT-01** | AI Incident Extractor | Converts unstructured distress text to typed JSON domain entities. | `ai` |
| **FEAT-02** | Priority Scoring Engine | Computes composite 0–100 priority score using deterministic weights. | `incidents` |
| **FEAT-03** | Dynamic Graph Router | Computes optimal detours around flooded edges using Dijkstra/A*. | `routing` |
| **FEAT-04** | Resource Optimizer | Bipartite matching of available units to priority incidents. | `optimization` |
| **FEAT-05** | Hospital Allocator | Matches casualties to facilities based on ICU beds and trauma units. | `hospitals` |
| **FEAT-06** | Command Center Map | Real-time GIS situational visualization with interactive layers. | `frontend` |
| **FEAT-07** | What-If Simulator | Injects disruptions (road blocks, surge casualties) and tests resilience. | `simulation` |
| **FEAT-08** | Explainability Service | Delivers mathematical score breakdowns and plain-English briefs. | `ai` / `core` |
| **FEAT-09** | Action Plan Generator | Generates timestamped operational orders and incident briefs. | `analytics` |

---

## 14. Detailed Feature Descriptions

### Feature 1: AI-Powered Unstructured Incident Parser
- **Purpose:** Transform messy, informal citizen reports into validated domain models.
- **User:** Citizen / Call Center Operator.
- **Trigger:** Submission of freeform incident text or emergency call log.
- **Inputs:** `raw_text` string (e.g., *"Water level reached 4ft near Velachery bus stop, 3 senior citizens trapped on terrace, one is diabetic without insulin"*).
- **Processing:** Sanitized prompt sent to backend AI service layer; output structured via strict JSON Schema; validated by Pydantic/Django serializer.
- **Outputs:** Standardized fields: `location_name`, `latitude`, `longitude`, `hazard_type`, `severity`, `people_affected`, `vulnerable_people`, `medical_need`, `mobility_status`, `urgency_level`.
- **Edge Cases:** Ambiguous location strings fall back to bounding box centroid with low confidence flag; malformed LLM responses fall back to regex/heuristic keyword extractor.
- **Acceptance Criteria:** Valid JSON returned in $< 2.5\text{s}$ with zero unhandled schema exceptions.

### Feature 2: Deterministic Incident Priority Scoring Engine
- **Purpose:** Provide an objective, transparent, and reproducible priority ranking across all active incidents.
- **User:** System automated / Emergency Coordinator.
- **Trigger:** Incident creation, incident update, or periodic decay tick.
- **Processing:** Weighted mathematical formula evaluating severity, vulnerability, scale, medical dependency, and time-decay.
- **Outputs:** Normalized score $[0.00, 100.00]$ and categorical tier (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).

### Feature 3: Dynamic Graph-Based Road Network & Routing Engine
- **Purpose:** Compute shortest, safest, and flood-free emergency routes for rescue units.
- **User:** Dispatcher / Field Crew.
- **Trigger:** Dispatch recommendation or road blockage event.
- **Inputs:** Origin coordinate, Destination coordinate, Current road graph edge weights and active blockage set.
- **Processing:** Graph search (Dijkstra with hazard penalty weights $W_e = \text{distance} \times \text{congestion} \times \text{hazard\_factor}$). If edge is `BLOCKED`, weight = $\infty$.
- **Outputs:** Polyline route geometry, step-by-step waypoint nodes, total distance (km), estimated travel time (min), risk score.
- **Acceptance Criteria:** Recomputes active routes upon blockage in $< 100\text{ms}$.

---

## 15. Functional Requirements (Summary)
- **FR-01:** The system shall ingest incident reports via REST API in structured JSON or raw text format.
- **FR-02:** The system shall extract structured parameters from raw text with confidence scores.
- **FR-03:** The system shall calculate priority scores deterministically without LLM intervention in the mathematical formula.
- **FR-04:** The system shall maintain real-time status and coordinates for all emergency assets.
- **FR-05:** The system shall prevent over-assignment of single resources to overlapping active dispatches.
- **FR-06:** The system shall update edge weights in the routing graph when road blockage events occur.
- **FR-07:** The system shall re-evaluate all affected active dispatches when road or hospital states change.
- **FR-08:** The system shall log every automated recommendation and human override in an immutable audit table.

---

## 16. User Stories & Acceptance Criteria

### User Story 1: Intelligent Intake
- **As an** Emergency Call Operator,
- **I want** raw text distress messages to be automatically parsed into structured incident records,
- **So that** I don't waste precious minutes manually filling out 15 form fields during a crisis.
- **Acceptance Criteria:**
  - Given raw citizen text, when submitted to `/api/v1/incidents/analyze-text/`, then return structured JSON matching `IncidentExtractionSchema` in $< 2.5\text{s}$.
  - If LLM API fails, fallback keyword extractor triggers without throwing a 500 error.

### User Story 2: Instant Detour on Flood Blockage
- **As a** Dispatch Coordinator,
- **I want** the system to automatically re-route in-transit rescue boats and ambulances when a bridge is reported flooded,
- **So that** emergency vehicles avoid getting trapped in rising waters.
- **Acceptance Criteria:**
  - Given an active dispatch traversing Edge $E_k$, when Edge $E_k$ status is updated to `BLOCKED`, then active dispatch status is updated to `RE_ROUTED`, new route polyline is generated, and coordinator is alerted within $200\text{ms}$.

---

## 17. Priority Scoring Model & Mathematical Formulation

The incident priority score $P \in [0, 100]$ is computed as follows:

$$P = \min\left(100.0, \; w_S \cdot S + w_V \cdot V + w_N \cdot N + w_M \cdot M + w_U \cdot U + w_T \cdot T\right)$$

Where default weights satisfy $\sum w = 1.0$:
- $w_S = 0.30$ (Severity Factor: `CRITICAL`=100, `HIGH`=75, `MEDIUM`=40, `LOW`=15)
- $w_V = 0.20$ (Vulnerability Factor: $\min(100, \text{vulnerable\_count} \times 35)$)
- $w_N = 0.15$ (Scale Factor: $\min(100, \text{people\_affected} \times 10)$)
- $w_M = 0.15$ (Medical Emergency Factor: `True`=100, `False`=0)
- $w_U = 0.10$ (Urgency Level: `IMMEDIATE`=100, `URGENT`=70, `MODERATE`=30)
- $w_T = 0.10$ (Time-Decay Escalation: $\min(100, \text{minutes\_unattended} \times 2.5)$)

### Priority Tiers:
- **CRITICAL (80.00 – 100.00):** Immediate life threat, trapped vulnerable individuals, active flooding.
- **HIGH (60.00 – 79.99):** High water levels, multiple people stranded, medical attention required.
- **MEDIUM (35.00 – 59.99):** Property risk, food/water shortage, ambulatory adults.
- **LOW (0.00 – 34.99):** Inquiries, minor waterlogging, non-emergency evacuations.

---

## 18. Priority Definitions & Thresholds
- **Tier 1 (Red / Critical):** Dispatch SLA $< 5\text{ minutes}$. Automatic coordinator alert modal.
- **Tier 2 (Orange / High):** Dispatch SLA $< 15\text{ minutes}$.
- **Tier 3 (Yellow / Medium):** Dispatch SLA $< 45\text{ minutes}$.
- **Tier 4 (Green / Low):** Dispatch SLA $< 120\text{ minutes}$ or community shelter staging.

---

## 19. Incident Lifecycle State Transitions

```
+-----------------------------------------------------------------------------------+
|                                                                                   |
v                                                                                   |
[REPORTED] ---> [PARSED] ---> [TRIAGED] ---> [DISPATCHED] ---> [ON_SCENE] ---> [RESOLVED]
                   |             |                |
                   v             v                v
             [REJECTED]     [CANCELLED]      [DIVERTED]
```

---

## 20. Resource Lifecycle State Transitions

```
[AVAILABLE] <====================================+
     |                                           |
     v (Dispatch Triggered)                      |
[DISPATCHED] ---> [EN_ROUTE] ---> [ON_SCENE] ---> [RETURNING]
     |                                 |
     v (Breakdown / Blocked)           v (Patient Picked Up)
[OFFLINE] <--------------------- [TRANSPORTING_TO_HOSPITAL]
```

---

## 21. Hospital Workflow & Allocation Logic
1. **Telemetry Ingestion:** Hospitals broadcast available General Beds, ICU Beds, and Trauma Bay Status.
2. **Capability Filtering:** Filter candidate hospitals by patient requirement (`needs_icu`, `needs_trauma`, `needs_pediatric`).
3. **Load Balancing Metric:**
   $$\text{Hospital Cost} = 0.45 \cdot \text{ETA} + 0.35 \cdot \left(\frac{\text{Occupied Beds}}{\text{Total Beds}} \times 100\right) + 0.20 \cdot \text{Specialty Match Bonus}$$
4. **Assignment:** Candidate with lowest composite cost is assigned; destination bed reservation decrement is staged atomically.

---

## 22. Dynamic Routing Workflow
1. **Graph Construction:** Road network nodes $V$ (intersections) and directed edges $E$ (road segments).
2. **Dynamic Weighting:**
   $$\text{Weight}(e) = \frac{\text{length\_km}}{\text{base\_speed\_kmh}} \times \text{congestion\_multiplier} \times \text{flood\_risk\_multiplier}$$
   If edge is marked `BLOCKED`, $\text{Weight}(e) = \infty$.
3. **Execution:** Path calculation executed via Dijkstra's algorithm. Returns turn-by-turn coordinate arrays and estimated arrival times.

---

## 23. Simulation Workflow & Sandbox Architecture
- **State Isolation:** Simulation events execute against a scoped `SimulationScenario` session, preventing corruption of persistent baseline registries.
- **Tick Engine:** Allows stepping forward in 1-minute, 5-minute, or 15-minute simulated intervals.
- **Event Injection Palette:**
  - Trigger sudden rain escalation (increases flood levels on low-elevation road segments).
  - Force-close bridges (e.g., Adyar River bridge closures).
  - Trigger hospital generator failure (switches hospital status to `DIVERT_FULL`).
  - Spawn wave of 15 high-urgency distress calls.

---

## 24. AI Functionality & Model Responsibilities
- **Model Role:** Structured information extraction, text summarization, explainability synthesis, and operator Q&A.
- **Provider Abstraction:** Unified interface supporting OpenAI (`gpt-4o-mini`), Anthropic (`claude-3-5-sonnet`), and Local Fallback Heuristics.
- **Zero Hallucination Guard:** LLM responses are strictly constrained to JSON Schemas; numeric attributes are parsed and bounded by deterministic validators.

---

## 25. Deterministic Optimization Functionality
- **Algorithm Selection:** Bipartite Min-Cost Matching / Linear Sum Assignment (Hungarian Algorithm) with capability filtering.
- **Why Classical Optimization?** Guarantees global optimality, executes in $< 50\text{ms}$ for $N=100$ items, completely reproducible, mathematically auditable, zero token cost.

---

## 26. Explainability Architecture
- **Layer 1: Mathematical Transparency:** Exposes raw feature weights, distance matrices, and capability match vectors in the API response.
- **Layer 2: Natural Language Briefing:** Generates concise operational explanations:
  *"Rescue Boat RB-02 assigned to Incident #14 because water depth exceeds 4 feet, 3 senior citizens are trapped on roof, and RB-02 is the closest watercraft with remaining capacity (4 seats available)."*

---

## 27. Analytics & Macro Reporting
- Real-time KPI Dashboards tracking:
  - Average Dispatch Response Time (mins).
  - Triage SLA Compliance Rate (%).
  - Total Casualties Extracted vs. Pending.
  - Fleet Utilization Rate by Asset Type (Ambulances vs. Boats vs. NDRF).
  - Citywide Hospital Bed Saturation Heatmap.

---

## 28. Notification & Alerting Engine
- **Channels:** In-app WebSocket toast alerts, high-priority audio chime for `CRITICAL` incidents, modal interrupts for road network disconnections.
- **Alert Tiers:** `INFO` (resource returned to base), `WARNING` (hospital at 85% capacity), `CRITICAL_ALERT` (active dispatch route severed by floodwaters).

---

## 29. Error Scenarios & Graceful Degradation Matrix

| Scenario Code | Root Cause | Impact | Automated System Mitigation |
| :--- | :--- | :--- | :--- |
| **ERR-AI-01** | LLM API Timeout / Rate Limit | Cannot parse raw text automatically | Fallback to deterministic regex & keyword extractor; tag incident `NEEDS_MANUAL_REVIEW`. |
| **ERR-OPT-01** | Demand Exceeds Supply ($N_{inc} > N_{res}$) | Incidents left unassigned | Priority queue sorted descending; high-priority queue alerted to coordinator for mutual-aid request. |
| **ERR-ROUT-01** | Islanding / Destination Unreachable | Path calculation returns $\infty$ | Alert coordinator: "Target Islanded by Floodwaters". Suggest amphibious or helicopter asset. |
| **ERR-HOSP-01** | All City ICU Beds Exhausted | Cannot allocate critical patient | Place patient in triage stabilization queue; alert state coordinator for emergency inter-city airlift. |

---

## 30. Security Requirements
- **Authentication:** JWT (JSON Web Tokens) with 15-minute access token lifespan and secure HTTP-only refresh tokens.
- **Authorization:** Strict Role-Based Access Control (RBAC) enforced at Django ViewSet and Service Layer.
- **Sanitization:** All free-text inputs sanitized against XSS; SQL parameterization enforced via Django ORM.
- **Prompt Injection Defense:** Strict separation of system prompt instructions and untrusted citizen report strings.

---

## 31. Privacy Considerations
- **PII Protection:** Citizen phone numbers, full names, and exact street addresses masked for non-authorized viewers.
- **Data Retention:** Incident logs anonymized post-disaster review according to emergency data compliance standards.

---

## 32. Performance Requirements
- **API Latency:** $p95 < 250\text{ms}$ for all standard CRUD requests.
- **Optimization Latency:** $p95 < 1200\text{ms}$ for global assignment of 100 incidents across 50 resources.
- **Routing Latency:** $p95 < 150\text{ms}$ for single-pair Dijkstra search on 1,000-node graph.
- **UI Render Latency:** $60\text{ fps}$ map panning with 500+ dynamic GeoJSON markers.

---

## 33. Scalability Architecture
- **Stateless Application Layer:** Django backend instances operate completely statelessly.
- **Database Optimization:** PostgreSQL with B-tree indices on foreign keys, spatial indices for geospatial queries, and JSONB indexing for raw extraction payloads.
- **Client-Side Virtualization:** React table and queue virtual scrolling for handling 1,000+ simultaneous incident rows.

---

## 34. Success Metrics
- **Response Time Reduction:** $\ge 35\%$ decrease in total time from report ingestion to on-scene rescue team arrival.
- **Resource Utilization:** $\ge 85\%$ active utilization of high-value specialized assets (Boats, ALS Ambulances).
- **Route Detour Avoidance:** Zero vehicle entrapments in reported flooded zones.
- **Coordinator Trust Score:** $\ge 90\%$ acceptance rate of automated AI/Optimization recommendations without manual override.

---

## 35. Key Performance Indicators (KPIs)
1. **Mean Time to Triage (MTTT):** Target $< 10\text{ seconds}$ per incident.
2. **Mean Time to Dispatch (MTTD):** Target $< 60\text{ seconds}$ from report intake to vehicle roll.
3. **Hospital Saturation Variance:** Target $< 15\%$ load delta across regional trauma centers.
4. **System Availability:** 99.9% uptime during active crisis mode.

---

## 36. Hackathon Demo Scenario: "Operation Chennai Deluge"
- **Setting:** Extreme Monsoonal Flood across Chennai Central, Velachery, and Adyar districts.
- **Phase 1: Zero-State & Baseline Fleet (Minute 0–2):** Coordinator views city map with staged assets (12 Ambulances, 6 NDRF Boats, 8 Hospitals).
- **Phase 2: Burst Distress Intake (Minute 2–4):** Ingest 15 raw text messages ranging from trapped dialysis patients to minor roof leaks. AI parses all 15 in parallel; Priority Engine scores them from 94.5 (Critical) down to 22.0 (Low).
- **Phase 3: Automated Global Dispatch (Minute 4–6):** Coordinator clicks "Run Smart Dispatch". System computes optimal boat/ambulance allocations and routes avoiding known waterlogged avenues.
- **Phase 4: Disaster Escalation & Detour (Minute 6–8):** Inject Road Blockage at Saidapet Bridge. Active Ambulance A-04 route turns red; system recalculates 4-minute detour via Guindy flyover in 60ms.
- **Phase 5: Hospital Surge Divert (Minute 8–9):** Inject ICU Full event at Rajiv Gandhi Government Hospital. Incoming trauma patient automatically re-routed to Apollo Greams Road.
- **Phase 6: EAP Generation & Briefing (Minute 9–10):** Coordinator exports complete Emergency Action Plan with full explainability breakdown.

---

## 37. Hackathon Judging Strategy & Winning Differentiators
1. **Not Just a Chatbot:** Emphasize the deterministic optimization and graph routing engine; show that AI is used responsibly for NLP and explainability rather than as an unreliable black-box dispatcher.
2. **High-Fidelity Visual Impact:** Dark-mode command center UI with animated route polylines, pulsing critical incident markers, and real-time metric counters.
3. **Flawless Live Simulation:** Zero external hardware dependency; every failure mode and crisis escalation is demonstrated dynamically in software.
4. **Architectural Rigor:** Clean separation of Django services, mathematical optimization, and React component layers.

---

## 38. Risks & Vulnerabilities
- **Risk 1:** LLM latency spikes or API token rate limits during live evaluation.
- **Risk 2:** Combinatorial explosion in optimization if incident count scales beyond $N=1,000$.
- **Risk 3:** Road network graph disconnection if too many edges are blocked simultaneously.

---

## 39. Mitigations & Defensive Engineering
- **Mitigation 1:** Local Mock/Heuristic AI Provider switchable via single environment variable (`AI_PROVIDER=local_mock` or `openai`).
- **Mitigation 2:** Partitioning optimization into priority buckets (`CRITICAL` solved first in $O(N)$ batch, followed by `HIGH`).
- **Mitigation 3:** Graph connectivity fallback: when no road path exists, routing engine returns straight-line bearing with "AERIAL / AMPHIBIOUS ACCESS ONLY" flag.

---

## 40. Future Roadmap & Post-Disaster Evolution
- **Q3 2026:** Integration with ISRO Bhuvan and Sentinel-1 satellite flood inundation maps.
- **Q4 2026:** Autonomous drone swarm telemetry ingestion for aerial thermal victim detection.
- **Q1 2027:** Cross-state NDRF mutual-aid automated logistics federation.
- **Q2 2027:** Offline-first PWA field responder mobile sync with peer-to-peer Wi-Fi Direct mesh relays.
