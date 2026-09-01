# 01 — User Requirements Document (URD)
## DER-02: Threat-Zone Estimation for Industrial Fire and Explosion Response

---

## 1. Executive Summary

The **DER-02 Threat-Zone Estimation System** is a real-time, physics-based decision support platform built on **Next.js (App Router)** and **Django REST Framework**.

During an industrial storage facility fire or explosion (e.g. LPG tank BLEVE, chemical storage pool fire, fuel depot vapor cloud explosion), emergency responders require an instantaneous, defensible assessment of **thermal radiation** and **blast overpressure hazard zones**.

Unlike primitive systems that draw static, unphysical circular buffers, this system computes **analytical wind-skewed, multi-tiered threat contours** (Thomas 1963, Welker & Sliepcevich flame tilt, Roberts BLEVE fireball, Brode 1955 blast overpressure) and calculates a **Safe Approach Corridor** so command teams can position staging areas and deploy fire tenders without endangering crew lives.

---

## 2. User Personas

### 2.1 Incident Commander (On-Scene Incident Lead)
- **Goal**: Instantly determine safety perimeters, order evacuation zones, and deploy responders from a safe vector.
- **Pain Point**: Lack of real-time physics-based hazard models under shifting wind conditions.

### 2.2 HAZMAT & Industrial Safety Specialist
- **Goal**: Evaluate chemical tank geometry, volume, pressure, and thermodynamic properties to predict thermal radiation and blast pressure falloff.
- **Pain Point**: Complex offline software (like ALOHA/PHAST) takes too long to set up during an active crisis.

### 2.3 Emergency Operations Center (EOC) Operator
- **Goal**: Monitor active industrial facilities, run "what-if" disruption scenarios (e.g. wind shifts, tank leaks), and compare **Facility A (LPG BLEVE)** vs **Facility B (Petroleum Pool Fire)**.

---

## 3. High-Level System Capabilities

| Capability ID | Feature Name | Description |
| :--- | :--- | :--- |
| **URD-01** | **Deterministic Physics Modeling** | Calculates thermal radiation flux ($\text{kW/m}^2$) and peak blast overpressure ($\text{kPa}$) using Thomas (1963), Roberts, and Brode (1955) analytical equations. |
| **URD-02** | **Analytical Wind Deformation** | Dynamically warps hazard zones downwind ($\Delta = \frac{H}{2} \sin\theta$) and compresses upwind based on live wind speed ($u$) and direction ($\theta$). |
| **URD-03** | **Graded 3-Tier Threat Bands** | Renders 3 distinct severity zones: Red (Lethal), Orange (Serious), Yellow (Evacuate). |
| **URD-04** | **Safe Approach Direction Solver** | Computes the optimal crosswind/upwind approach vector angle ($\phi_{safe}$) for fire tenders clear of hazardous thermal and blast contours. |
| **URD-05** | **Dual Facility Comparison** | Demonstrates two distinct facility configurations: **Facility A (LPG BLEVE)** vs **Facility B (Petroleum Pool Fire)** to explain thermodynamic differences. |
| **URD-06** | **2D GIS & 3D Digital Twin (Next.js)** | Built on Next.js with SSR/CSR optimization, Leaflet GIS, and Three.js/React-Three-Fiber 3D Digital Twin visualization. |

---

## 4. Threat Tiers & Thresholds

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        GRADED SEVERITY BANDS (PHYSICS THRESHOLDS)                      │
├─────────────────┬─────────────────────────────┬──────────────────────────┬─────────────┤
│ Band Name       │ Thermal Criterion           │ Blast Overpressure       │ Effect      │
├─────────────────┼─────────────────────────────┼──────────────────────────┼─────────────┤
│ 🔴 Red (Lethal) │ $> 12.5 \text{ kW/m}^2$     │ $> 83 \text{ kPa}$       │ 1% fatality in 10s, structural collapse │
│ 🟠 Orange (Serious)│ $4.7 - 12.5 \text{ kW/m}^2$│ $17 - 83 \text{ kPa}$    │ Severe burns, eardrum rupture           │
│ 🟡 Yellow (Evacuate)│ $1.6 - 4.7 \text{ kW/m}^2$ │ $3.5 - 17 \text{ kPa}$   │ Pain threshold, glass breakage          │
└─────────────────┴─────────────────────────────┴──────────────────────────┴─────────────┘
```

---

## 5. Non-Functional Requirements

1. **Architecture**: Next.js App Router frontend + Django REST API backend.
2. **Performance**: Analytical physics calculation and polygon rendering execute in $< 50\text{ms}$.
3. **Usability**: High-contrast tactical dark theme with color-coded threat contours and clear numerical labels.
