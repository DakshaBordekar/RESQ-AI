# 03 — UI/UX Implementation Specification
## DER-02: Industrial Threat-Zone Command Center Design System

---

## 1. Visual Aesthetics & Design Hierarchy

The **RESQ-AI Threat-Zone Command Center** adheres to a high-density, mission-critical dark tactical aesthetic (*"NASA Mission Control + Industrial Digital Twin"*).

### 1.1 Color Palette & Threat Coding

| Element / Tier | Hex Code | Visual Meaning |
| :--- | :--- | :--- |
| **Zone 1: Lethal Band** | `#EF4444` (Red) | Thermal $\ge 12.5 \text{ kW/m}^2$ / Overpressure $\ge 50 \text{ kPa}$ |
| **Zone 2: Severe Threat** | `#F97316` (Orange) | Thermal $5.0 - 12.5 \text{ kW/m}^2$ / Overpressure $20 - 50 \text{ kPa}$ |
| **Zone 3: Caution Band** | `#EAB308` (Yellow) | Thermal $1.6 - 5.0 \text{ kW/m}^2$ / Overpressure $7 - 20 \text{ kPa}$ |
| **Safe Approach Vector** | `#10B981` (Green) | Recommended responder entry corridor clear of threat contours |
| **Background Canvas** | `#030712` (Midnight Blue) | High contrast, zero glare mission control theme |
| **UI Panels & Drawers** | `#0f172a` / `#1e293b` | Glassmorphism, subtle borders (`#334155`) |

---

## 2. Layout Structure

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        RESQ-AI INDUSTRIAL THREAT COMMAND HEADER                        │
│ Facility: Chennai Petrochem Depot | Chemical: LPG / Diesel | Wind: 15.2 km/h SE (135°)  │
├───────────────────┬────────────────────────────────────────────────┬───────────────────┤
│ PARAMETER DOCK    │      INTERACTIVE 2D / 3D THREAT ZONE MAP      │ THREAT TELEMETRY  │
│ (Left Panel)      │                                                │ (Right Drawer)    │
│ • Facility Picker │ • Wind-Skewed Threat Polygons (Red/Orange/Yel) │ • Thermal Flux    │
│ • Tank Volume V   │ • 3D Flame & Vapor Dispersion Plume Mesh       │ • Peak Overpress. │
│ • Tank Pressure P │ • Safe Approach Vector Arrow (Green Corridor)  │ • Evac Perimeter  │
│ • Wind Speed u    │ • 2D GIS / 3D Digital Twin Mode Switcher       │ • Safe Entry Angle│
│ • Wind Angle θ    │ • Scenario A vs B Quick Toggle                 │ • Physics Explanation│
├───────────────────┴────────────────────────────────────────────────┴───────────────────┤
│                             SCENARIO COMPARISON BAR & CONTROLS                         │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Interactive UI Components

### 3.1 Facility & Parameter Control Dock (Left Drawer)
- **Presets Dropdown**:
  - `Configuration A: Pressurized LPG Sphere (5,000 m³)`
  - `Configuration B: Atmospheric Diesel Tank (15,000 m³)`
- **Dynamic Sliders & Inputs**:
  - Tank Volume ($V$ in $\text{m}^3$): $500 - 50,000 \text{ m}^3$
  - Tank Pressure ($P$ in $\text{bar}$): $1 - 25 \text{ bar}$
  - Chemical Selection: LPG, Propane, Methane, Gasoline, Diesel, Ammonia
  - Wind Speed ($u$ in $\text{m/s}$): $0 - 30 \text{ m/s}$
  - Wind Direction ($\theta$ in degrees): $0^\circ - 360^\circ$ (with compass dial widget)

### 3.2 Threat Map Visualization Canvas (Center Viewport)
- **2D GIS Layer**:
  - Renders 3 wind-skewed GeoJSON polygons (Red, Orange, Yellow) overlaid on OpenStreetMap.
  - Draws a prominent **Green Vector Arrow** emanating from the safe entry sector towards the perimeter.
  - Renders a clickable **Storage Facility Marker** showing tank geometry.
- **3D Digital Twin View**:
  - Renders 3D Industrial Storage Tank mesh (Sphere vs Cylinder).
  - Renders 3D wind-driven fire/vapor dispersion plume mesh tilting downwind.
  - Renders 3D shockwave expansion rings and 3D Safe Approach Corridor arrow.

### 3.3 Threat Telemetry & Physics Explanation Panel (Right Drawer)
- **Live Metrics**:
  - Max Thermal Radiation ($q_{max}$) & Lethal Distance ($R_{12.5kW}$)
  - Peak Blast Overpressure ($\Delta P_{max}$) & Damage Radius ($R_{50kPa}$)
  - Recommended Safe Entry Angle ($\phi_{safe}$)
- **Physics Rationale Section**:
  - Explains why Configuration A produces a blast-dominated threat vs Configuration B producing a thermal-dominated threat.
