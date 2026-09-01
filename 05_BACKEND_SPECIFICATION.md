# 05 — Backend Specification
## DER-02: Threat-Zone Physics Engine & REST API Architecture

---

## 1. Directory Structure

```
backend/
├── apps/
│   ├── threat_zone/               # DER-02 Analytical Physics & Threat Domain App
│   │   ├── services/
│   │   │   ├── pool_fire_model.py     # Thomas (1963) & Welker-Sliepcevich Pool Fire Model
│   │   │   ├── bleve_fireball_model.py# Roberts Correlations Fireball Model
│   │   │   ├── blast_model.py         # Brode (1955) + Hopkinson-Cranz Blast Overpressure
│   │   │   ├── wind_warper.py         # Analytical Wind Displaced Polygon Displacer r(φ)
│   │   │   └── safe_vector_solver.py  # Safe Approach Direction Vector Solver ϕ_safe
│   │   ├── models.py              # Facility & Threat Scenario Models
│   │   ├── views.py               # REST API ViewSets
│   │   ├── urls.py                # Threat Zone Endpoint Routing
│   │   └── tests.py               # Analytical Physics Pytest Suite
│   └── core/                      # Shared Base Utilities
└── config/                        # Django Project Config
```

---

## 2. Analytical Physics Services

### 2.1 Pool Fire Model (`pool_fire_model.py`)
```python
def calculate_pool_fire_zones(diameter_m: float, fuel_type: str, wind_speed_ms: float, wind_direction_deg: float) -> dict:
    """
    Computes:
    - Flame Height H = 42 * D * (m_dot / (rho_a * sqrt(g * D)))^0.61 (Thomas 1963)
    - Flame Tilt cos(theta) = 1 / (1 + 0.78 * u_star^0.7) (Welker & Sliepcevich)
    - Displaced Flame Center Delta = (H / 2) * sin(theta)
    - Analytical Wind Boundary r(phi) = Delta * cos(phi) + sqrt( Q_rad / (4*pi*q) - Delta^2 * sin^2(phi) - H_c^2 )
    """
```

### 2.2 BLEVE Fireball Model (`bleve_fireball_model.py`)
```python
def calculate_bleve_fireball(mass_kg: float, fuel_type: str) -> dict:
    """
    Computes Roberts correlations:
    - Fireball Radius r_f = 3.86 * M^0.325
    - Fireball Duration t_f = 0.825 * M^0.26
    - Heat Release Rate Q_rad = (F_rad * M * Delta_Hc) / t_f
    """
```

### 2.3 Blast Overpressure Model (`blast_model.py`)
```python
def calculate_blast_overpressure(mass_kg: float, fuel_type: str, yield_factor: float) -> dict:
    """
    Computes Brode (1955) + Hopkinson-Cranz scaling:
    - W_TNT = (yield_factor * M * Delta_Hc) / 4184
    - Scaled Distance Z = R / (W_TNT^(1/3))
    - Overpressure P_s = 6.7 / Z^3 + 1 / Z [bar] -> kPa
    """
```

---

## 3. REST API Specifications

### 3.1 Calculate Threat Zone Endpoint
- **URL**: `POST /api/threat-zone/calculate/`
- **Request Body**:
  ```json
  {
    "facility_type": "FACILITY_A_LPG",
    "latitude": 13.0300,
    "longitude": 80.2350,
    "mass_kg": 40000,
    "pool_diameter_m": 30.0,
    "fuel_type": "LPG",
    "wind_speed_ms": 8.5,
    "wind_direction_deg": 135.0
  }
  ```
- **Response**:
  ```json
  {
    "facility_name": "Facility A — LPG Spherical Tank (BLEVE)",
    "physics_metrics": {
      "fireball_radius_m": 121.4,
      "fireball_duration_s": 16.2,
      "total_energy_gj": 1840.0,
      "flame_tilt_deg": 38.5,
      "downwind_displacement_m": 42.1
    },
    "threat_bands": {
      "red_lethal": { "thermal_kw": 12.5, "blast_kpa": 83, "max_radius_m": 430, "polygon": [...] },
      "orange_serious": { "thermal_kw": 4.7, "blast_kpa": 17, "max_radius_m": 680, "polygon": [...] },
      "yellow_evacuate": { "thermal_kw": 1.6, "blast_kpa": 3.5, "max_radius_m": 1150, "polygon": [...] }
    },
    "safe_approach_vector": {
      "angle_deg": 315.0,
      "cardinal": "NW",
      "status": "CLEAR_UPWIND_CROSSWIND"
    }
  }
  ```

### 3.2 Dual Facility Comparison Endpoint
- **URL**: `GET /api/threat-zone/scenarios/`
- **Response**: Returns side-by-side payload comparing **Facility A (LPG BLEVE)** vs **Facility B (Petroleum Pool Fire)** with physics rationale explanations.
