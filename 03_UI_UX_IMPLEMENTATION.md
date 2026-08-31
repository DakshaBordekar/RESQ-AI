# UI/UX Implementation Specification — RESQ-AI

## Document Information
- **Project Name:** RESQ-AI (AI-Powered Emergency & Disaster Response Orchestration Platform)
- **Document Version:** 1.0.0
- **Document Status:** FORMAL FRONTEND IMPLEMENTATION SPECIFICATION
- **Framework:** React 18+ (TypeScript) + Vite + Tailwind CSS / Modern CSS Variables + React-Leaflet
- **Target Persona:** Emergency Command Center Coordinator

---

## 1. UX Principles & Crisis-Mode Design Philosophy
During an active disaster operation, emergency coordinators operate under severe cognitive overload, extreme time pressure, and sensory stress. The RESQ-AI user experience is engineered around four core tenets:
1. **Zero Cognitive Friction:** High-contrast situational awareness with unambiguous visual hierarchy. Critical data (priority score, trapped counts, hospital capacity, road blockages) is recognizable within 200ms of visual scan.
2. **Deterministic Confidence & Auditability:** Every automated suggestion visibly links to its underlying data (e.g., ETA calculation, risk formula, bed availability) rather than presenting an opaque black-box AI recommendation.
3. **One-Click Execution with Rapid Overrides:** Standard operational actions (approving optimal dispatches, toggling road blockages, re-routing assets) take exactly one click, with immediate undo and manual override capabilities.
4. **Resilient Offline-Aware State:** Visual indicators communicate WebSocket connection health, live simulation ticks, and data synchronization states transparently.

---

## 2. Visual Hierarchy & Screen Real Estate Allocation
The primary interface is structured as a full-viewport situational cockpit:
- **Global Header (Top Bar — 48px height):** System title, active scenario banner, live clock/simulation tick, active alerts badge, global optimization trigger, and operator profile.
- **Left Panel (Incident Triage & Priority Queue — 360px width, collapsible):** Live incident feed sorted strictly by descending calculated priority score, filter controls, and AI incident ingestion trigger.
- **Center Canvas (Interactive GIS Situation Map — Flexible width & height):** Real-time spatial map rendering Chennai road networks, dynamic flood risk zones, vehicle assets with active routes, hospital bed saturation heat markers, and incident locations.
- **Right Panel (Action & Explainability Hub — 400px width, collapsible):** AI extraction inspection card, dispatch recommendation details with mathematical/narrative explainability, active operations tracker, and EAP export preview.
- **Bottom Dock (Resource & Hospital Telemetry Bar — 140px height, collapsible):** Quick-glance fleet status meters (Ambulances, Rescue Boats, NDRF) and regional hospital ICU occupancy gauges.

---

## 3. Design System & CSS Token Architecture

### 3.1 CSS Design Tokens (`src/styles/tokens.css` or Tailwind Config)
```css
:root {
  /* Surface & Background Colors (Crisis Dark Theme) */
  --color-bg-canvas: #090D16;
  --color-bg-surface-1: #111827;
  --color-bg-surface-2: #1F2937;
  --color-bg-surface-3: #374151;
  --color-bg-overlay: rgba(9, 13, 22, 0.85);

  /* Border & Divider Tokens */
  --color-border-subtle: #1F2937;
  --color-border-default: #374151;
  --color-border-strong: #4B5563;

  /* Priority & Severity Semantics */
  --color-priority-critical: #EF4444;       /* Red - Tier 1 (80-100) */
  --color-priority-critical-bg: rgba(239, 68, 68, 0.12);
  --color-priority-high: #F97316;           /* Orange - Tier 2 (60-79) */
  --color-priority-high-bg: rgba(249, 115, 22, 0.12);
  --color-priority-medium: #EAB308;         /* Yellow - Tier 3 (35-59) */
  --color-priority-medium-bg: rgba(234, 179, 8, 0.12);
  --color-priority-low: #10B981;            /* Green - Tier 4 (0-34) */
  --color-priority-low-bg: rgba(16, 185, 129, 0.12);

  /* Operational Asset Status */
  --color-asset-available: #10B981;
  --color-asset-dispatched: #3B82F6;
  --color-asset-enroute: #6366F1;
  --color-asset-onscene: #8B5CF6;
  --color-asset-offline: #6B7280;

  /* Road Network & Hazard Colors */
  --color-road-clear: #10B981;
  --color-road-congested: #F59E0B;
  --color-road-flooded: #06B6D4;
  --color-road-blocked: #EF4444;

  /* Typography */
  --font-family-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-family-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* Typography Scale */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1.000rem; /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.250rem;   /* 20px */
  --text-2xl: 1.500rem;  /* 24px */
}
```

---

## 4. Color Semantics & Accessibility Standards
- **High Contrast Ratio:** All critical text labels maintain a WCAG AAA compliant contrast ratio ($\ge 7:1$) against dark canvas backgrounds.
- **Redundant Encoding:** Critical states never rely solely on color. Every priority level, road status, and asset badge pairs a distinct color with a semantic icon and text label (e.g., Red circle + Flame icon + "CRITICAL 94.2").
- **Motion Sensitivity:** Pulsing animations on critical emergency markers respect the `prefers-reduced-motion` media query.

---

## 5. Typography & Font Specifications
- **Primary Body & UI Text:** Inter (Weights: 400 Regular, 500 Medium, 600 Semi-Bold, 700 Bold).
- **Telemetry, Coordinates & Numbers:** JetBrains Mono (Weights: 400, 600) to ensure tabular alignment in queues and metrics tables.

---

## 6. Spacing, Elevation & Layout Grid
- **8-Point Spacing Scale:** Spacers: 2px, 4px, 8px, 12px, 16px, 24px, 32px.
- **Elevation System:**
  - `elevation-1` (Panels): `box-shadow: 0 1px 3px rgba(0,0,0,0.5)`
  - `elevation-2` (Dropdowns, Flyouts): `box-shadow: 0 4px 6px rgba(0,0,0,0.6)`
  - `elevation-3` (Modals, Overlays): `box-shadow: 0 20px 25px rgba(0,0,0,0.85)`

---

## 7. Core Component Library

### 7.1 Buttons (`src/components/ui/Button.tsx`)
- **Variants:**
  - `primary`: Crisis blue background (`#2563EB`), white text, hover glow.
  - `danger`: Critical red background (`#DC2626`), white text.
  - `warning`: Orange background (`#D97706`), white text.
  - `secondary`: Dark grey surface (`#374151`), grey text, border outline.
  - `ghost`: Transparent background, hover highlight.
- **States:** `default`, `hover`, `active`, `focused`, `disabled`, `loading` (with animated SVG spinner).

### 7.2 Badges & Metric Chips (`src/components/ui/PriorityBadge.tsx`)
- High-visibility pill component rendering calculated score, icon, and tier label with subtle ambient backdrop glow.

### 7.3 Forms & Inputs (`src/components/ui/Input.tsx`, `Select.tsx`, `Textarea.tsx`)
- Dark-themed input components with high-contrast borders, focus rings (`#3B82F6`), inline validation error messages, and icon prefix/suffix slots.

### 7.4 Data Tables (`src/components/ui/DataTable.tsx`)
- Virtualized list table rendering incidents or resources, supporting column sort, row selection, and sticky header.

### 7.5 Cards & Metric Containers (`src/components/ui/Card.tsx`)
- Structured container with customizable header, body, footer, and subtle border hover animations.

### 7.6 Modals & Drawer Overlays (`src/components/ui/Modal.tsx`)
- Accessible dialog implementing focus trapping, `Escape` key dismissal, and backdrop blur.

### 7.7 Alerts & Banner Messages (`src/components/ui/Alert.tsx`)
- Inline notification banners for critical route severed warnings, hospital divert notices, and optimization results.

### 7.8 Toasts & System Alert Banners (`src/components/ui/Toast.tsx`)
- Notification stack fixed at top-right, supporting auto-dismiss ($5\text{s}$) or sticky critical alerts with audio chime.

### 7.9 Navigation Bars & Breadcrumbs (`src/components/layout/Header.tsx`)
- Top navigation with real-time incident counters, simulation tick badge, scenario switcher, and user role indicator.

---

## 8. Screen Specifications

### Screen 1: Emergency Command Center (Master Dashboard)
- **Route:** `/dashboard`
- **Purpose:** Primary operational cockpit for monitoring citywide crisis state, reviewing automated recommendations, and approving dispatches.
- **User:** Emergency Command Coordinator.
- **Layout:** Fullscreen 4-zone layout (Header, Left Queue, Center Map, Right Explainability Hub, Bottom Fleet Dock).
- **Data Required:**
  - `GET /api/v1/incidents/` (Active incident list with priority scores)
  - `GET /api/v1/resources/` (Active emergency vehicle fleet status)
  - `GET /api/v1/hospitals/` (Hospital capacities and ICU telemetry)
  - `GET /api/v1/roads/` (Road network graph with blockage states)
- **Key Interactions:**
  - Clicking an incident centers the map on coordinates and loads AI explanation in the right panel.
  - Clicking "Run Global Optimization" triggers backend calculation and displays animated proposed dispatch corridors.
  - Clicking a road segment opens a context menu to toggle `BLOCKED` status.

### Screen 2: AI Incident Intake & Extraction Sandbox
- **Route:** `/incidents/intake`
- **Purpose:** Ingest unstructured multi-channel text/audio transcripts and preview structured JSON extractions.
- **User:** Call Center Operator / Dispatcher.
- **Layout:** Split-screen layout (Left: Raw Text Input & Preset Crisis Templates; Right: Live Extracted JSON Entity Inspector with editable fields).
- **API Endpoints:** `POST /api/v1/incidents/analyze-text/`, `POST /api/v1/incidents/`
- **Interactions:**
  - Operator types or pastes freeform message $\to$ clicks "AI Parse Incident".
  - System highlights extracted entities (Location, Victim Count, Vulnerability, Hazard Type) in interactive badges.
  - Operator edits or verifies fields $\to$ clicks "Save & Inject into Triage Queue".

### Screen 3: Crisis Simulation & What-If Studio
- **Route:** `/simulation`
- **Purpose:** Interactive sandbox to test disaster disruptions, weather escalations, and system resilience.
- **User:** Emergency Coordinator / Training Officer.
- **Layout:** Dual-view simulation canvas with timeline control bar, disaster event injection palette, and before/after comparison metric cards.
- **API Endpoints:**
  - `POST /api/v1/simulation/create-scenario/`
  - `POST /api/v1/simulation/{id}/inject-event/`
  - `POST /api/v1/simulation/{id}/step/`
- **Interactions:**
  - Drag-and-drop disaster events onto map (e.g., drop "Bridge Collapse" on Adyar Bridge).
  - Step forward in time (+5 mins, +15 mins).
  - Observe real-time delta metrics (e.g., Response Time: $+4.2\text{ min}$, Diverted Ambulances: $3$).

### Screen 4: Emergency Action Plan (EAP) & Briefing Center
- **Route:** `/action-plan`
- **Purpose:** Generate, review, and export standardized operational disaster briefings for field leaders and executive authorities.
- **User:** Incident Commander / Executive Authority.
- **Layout:** Document preview pane with markdown styling, export actions (PDF, Print, JSON), and tactical sector breakdown tables.
- **API Endpoints:** `GET /api/v1/action-plan/generate/`

---

## 9. Loading, Empty, and Error UI States

### 9.1 Loading States
- Skeleton loaders for incident cards and resource bars with pulse animation.
- Spinner indicators on buttons during AI extraction and optimization runs.

### 9.2 Empty States
- Custom illustrated SVG empty states for "No active critical incidents", "No available ambulances", and "Simulation idle".

### 9.3 Error States
- Inline retry buttons for failed API queries.
- Toast notifications with human-readable error descriptions and error tracking IDs.

---

## 10. Map Interaction Specifications & Leaflet Layer Architecture

### 10.1 Layer Stacking Order (Z-Index Hierarchy):
1. **Base Map Layer ($z=1$):** Dark-mode CartoDB / OpenStreetMap tile layer.
2. **Flood Risk Hazard Polygon Layer ($z=10$):** Semi-transparent cyan/blue polygons showing waterlogged lowlands.
3. **Road Graph Network Layer ($z=20$):** Interactive polylines colored by status (Green = Clear, Yellow = Congested, Red = Blocked).
4. **Active Vehicle Route Layer ($z=30$):** Animated glowing polylines showing in-transit emergency paths.
5. **Hospital & Shelter Markers ($z=40$):** Distinct H icons with mini circular progress rings showing bed occupancy percentage.
6. **Resource Asset Markers ($z=50$):** Directional vehicle/boat icons with pulsating status halos.
7. **Incident Triage Markers ($z=60$):** Color-coded priority pins with victim count badge and pulse animation for `CRITICAL` cases.

### 10.2 Marker Interaction Behavior:
- **Hover:** Displays quick tooltip with entity name, priority/capacity, and ETA.
- **Click:** Selects entity, syncs sidebar panel to detailed view, and highlights related routes and destination hospitals on the map.
- **Right-Click / Context Menu on Road Edge:** Opens rapid action menu: `[Mark Blocked / Flooded]`, `[Set Speed Limit]`, `[Inspect Capacity]`.

---

## 11. Component Hierarchy & React File Layout

```
src/
├── app/
│   ├── App.tsx                          # Root component with providers
│   ├── Router.tsx                       # Route definitions
│   └── queryClient.ts                   # TanStack Query configuration
├── components/
│   ├── ui/                              # Reusable atomic UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── PriorityBadge.tsx
│   │   ├── Modal.tsx
│   │   ├── Alert.tsx
│   │   ├── Toast.tsx
│   │   └── Toggle.tsx
│   ├── layout/                          # Layout wrappers
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── BottomDock.tsx
│   └── map/                             # GIS & Leaflet map components
│       ├── SituationMap.tsx             # Master map container
│       ├── IncidentMarkers.tsx          # Dynamic SVG incident markers
│       ├── ResourceMarkers.tsx          # Vehicle/Boat tracking markers
│       ├── HospitalMarkers.tsx          # Hospital capacity markers
│       ├── RoadNetworkLayer.tsx         # Polyline road graph overlay
│       └── RouteOverlay.tsx             # Active dispatch path polylines
├── features/
│   ├── command-center/
│   │   ├── CommandCenterPage.tsx        # Master dashboard container
│   │   ├── IncidentQueuePanel.tsx       # Sorted priority list
│   │   ├── DispatchRecommendation.tsx   # Proposed dispatch card
│   │   ├── ExplainabilityCard.tsx       # Decision justification view
│   │   └── FleetTelemetryDock.tsx       # Bottom resource bar
│   ├── intake/
│   │   ├── IncidentIntakeModal.tsx      # AI parser modal
│   │   └── EntityExtractionForm.tsx     # Editable extracted attributes
│   ├── simulation/
│   │   ├── SimulationControls.tsx       # Play/Pause/Step timeline bar
│   │   ├── EventInjectionPalette.tsx    # Disaster event buttons
│   │   └── ImpactMetricsCard.tsx        # Delta analytics widget
│   └── action-plan/
│       └── ActionPlanViewer.tsx         # Rendered operational plan
```

---

## 12. Component TypeScript Interfaces

```typescript
export type PriorityTier = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type IncidentStatus = 'REPORTED' | 'PARSED' | 'TRIAGED' | 'DISPATCHED' | 'ON_SCENE' | 'RESOLVED' | 'CANCELLED';
export type ResourceType = 'AMBULANCE_BLS' | 'AMBULANCE_ALS' | 'RESCUE_BOAT' | 'NDRF_TACTICAL_TEAM' | 'FIRE_ENGINE';
export type ResourceStatus = 'AVAILABLE' | 'ASSIGNED' | 'EN_ROUTE' | 'ON_SCENE' | 'RETURNING' | 'OFFLINE';

export interface Incident {
  id: string;
  title: string;
  raw_text: string;
  location_name: string;
  latitude: number;
  longitude: number;
  hazard_type: 'FLOOD' | 'FIRE' | 'MEDICAL' | 'STRUCTURAL_COLLAPSE';
  severity: PriorityTier;
  people_affected: number;
  vulnerable_people: number;
  vulnerability_types: string[];
  medical_need: boolean;
  mobility_status: 'TRAPPED' | 'LIMITED' | 'AMBULATORY';
  urgency: 'IMMEDIATE' | 'URGENT' | 'MODERATE';
  calculated_priority: number; // 0.00 - 100.00
  priority_tier: PriorityTier;
  status: IncidentStatus;
  created_at: string;
}

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  status: ResourceStatus;
  latitude: number;
  longitude: number;
  capacity: number;
  capabilities: string[];
  assigned_incident_id?: string;
  current_route_id?: string;
  eta_minutes?: number;
}

export interface Hospital {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  total_beds: number;
  available_beds: number;
  total_icu: number;
  available_icu: number;
  has_trauma_bay: boolean;
  status: 'ACCEPTING' | 'DIVERT_SURGE' | 'DIVERT_FULL' | 'OFFLINE';
  occupancy_percentage: number;
}

export interface DispatchPlan {
  id: string;
  incident_id: string;
  resource_id: string;
  hospital_id?: string;
  route_geometry: [number, number][];
  distance_km: number;
  eta_minutes: number;
  mathematical_rationale: {
    priority_score: number;
    distance_score: number;
    capability_matched: boolean;
    hospital_capacity_score?: number;
  };
  narrative_explanation: string;
  status: 'PROPOSED' | 'APPROVED' | 'DISPATCHED';
}
```

---

## 13. Responsive Behavior & Viewport Breakpoints
- **Desktop Command Station ($\ge 1440\text{px}$):** Default multi-column layout with persistent left queue, right explainability hub, and bottom dock.
- **Laptop Display ($1024\text{px} - 1439\text{px}$):** Sidebars automatically collapse into floating overlay panels toggled via icon buttons.
- **Tablet / Field Display ($768\text{px} - 1023\text{px}$):** Center map dominates; bottom sheet tab bar swaps between Incident Queue, Map View, and Resource Manager.

---

## 14. Error Boundaries & Fallback UI
- Every major widget (`MapView`, `IncidentQueuePanel`, `ExplainabilityCard`) is wrapped in a dedicated React Error Boundary (`<WidgetErrorBoundary>`).
- If the map tile server fails, the component renders a fallback vector grid with a retry trigger, ensuring the rest of the command center remains fully operational.
