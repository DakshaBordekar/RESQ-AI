# 02 — Technical Requirements Document (TRD)
## DER-02: Threat-Zone Estimation Physics & Computational Geometry Specification

---

## 1. Defensible Physics Models

### 1.1 Pool Fire Thermal Radiation Model (Thomas 1963 & Welker-Sliepcevich)

#### A. Flame Height ($H$)
According to Thomas (1963), the non-dimensional flame height $H$ for a pool diameter $D$ is:

$$H = 42 D \left( \frac{\dot{m}''}{\rho_a \sqrt{g D}} \right)^{0.61}$$

Where:
- $\dot{m}''$: Specific mass burning rate ($\text{kg}/(\text{m}^2\cdot\text{s})$) (e.g. $0.055 \text{ kg/m}^2\text{s}$ for gasoline).
- $\rho_a$: Ambient air density ($1.2 \text{ kg/m}^3$).
- $g$: Acceleration due to gravity ($9.81 \text{ m/s}^2$).

#### B. Flame Tilt in Wind ($\theta$)
According to Welker & Sliepcevich:

$$\cos\theta = \frac{1}{1 + 0.78 \cdot u^{*0.7}}, \quad \text{where } u^* = \frac{u}{\left( \frac{g \dot{m}'' D}{\rho_a} \right)^{1/3}}$$

Where $u$ is the prevailing wind speed ($\text{m/s}$).

#### C. Wind-Warped Zone Boundary Radius Equation ($r(\phi)$)
The exact displaced point-source radiation equation for wind-warped non-circular zones:

$$\Delta = \left( \frac{H}{2} \right) \sin\theta$$

$$r(\phi_{rel}) = \Delta \cos\phi_{rel} + \sqrt{ \frac{Q_{rad}}{4\pi q_{threshold}} - \Delta^2 \sin^2\phi_{rel} - H_c^2 }$$

Where:
- $\Delta$: Downwind displacement of the effective flame center.
- $\phi_{rel}$: Relative angle from downwind direction ($\phi_{rel} = \phi - \theta_{wind}$).
- $Q_{rad}$: Total radiative heat release rate ($Q_{rad} = \chi_r \cdot \dot{m}'' \cdot \frac{\pi D^2}{4} \cdot \Delta H_c$).
- $H_c$: Mid-flame height ($H_c = \frac{H}{2} \cos\theta$).
- $q_{threshold}$: Target severity band threshold ($12.5$, $4.7$, or $1.6 \text{ kW/m}^2$).

---

### 1.2 BLEVE Fireball Thermal Model (Roberts Correlations)

For catastrophic pressurized tank failure (BLEVE):

1. **Fireball Radius ($r_f$)**: $r_f = 3.86 M^{0.325}$ (meters)
2. **Fireball Duration ($t_f$)**: $t_f = 0.825 M^{0.26}$ (seconds)
3. **Total Radiative Heat Output ($Q_{rad}$)**: $Q_{rad} = \frac{F_{rad} \cdot M \cdot \Delta H_c}{t_f}$ ($\text{kW}$)
4. **Ground View Factor ($F$)**: $F = \frac{r_f^2}{4 d^2}$, where $d^2 = r^2 + H_c^2$ and $H_c = 1.5 r_f$.

---

### 1.3 Blast Overpressure Model (Brode 1955 + Hopkinson-Cranz Scaling)

1. **TNT Equivalent Mass ($W_{TNT}$)**:
   $$W_{TNT} = \frac{\eta \cdot M \cdot \Delta H_c}{4184}$$
   - $\eta = 0.04$ for BLEVE fireball explosions.
   - $\eta = 0.10$ for Vapor Cloud Explosions (VCE).

2. **Hopkinson-Cranz Scaled Distance ($Z$)**:
   $$Z = \frac{R}{W_{TNT}^{1/3}}$$

3. **Peak Blast Overpressure ($P_s$) [Brode 1955]**:
   $$P_s = \frac{6.7}{Z^3} + \frac{1}{Z} \quad [\text{bar}]$$
   Converting to $\text{kPa}$: $\Delta P (\text{kPa}) = P_s \times 100$.

---

## 2. Graded Severity Bands & Thresholds

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

## 3. Two Benchmark Facility Configurations

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        DUAL FACILITY CONFIGURATION BENCHMARKS                          │
├──────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│ Parameter                │ Facility A — LPG Sphere     │ Facility B — Petroleum Pool Fire│
├──────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ Scenario                 │ BLEVE Tank Explosion        │ Bund Breach Pool Fire         │
│ Geometry / Mass          │ $40,000 \text{ kg}$ LPG     │ $D = 30\text{m}$ Gasoline Pool│
│ Primary Hazard           │ Thermal Fireball + Blast    │ Thermal Radiation Only        │
│ Lethal Zone              │ $\sim 430 \text{ m}$ (Thermal)│ $\sim 35-60 \text{ m}$ (Warped)│
│ Blast Lethal Zone        │ $\sim 65 \text{ m}$ (Secondary)│ $\text{N/A}$                 │
│ Thermodynamic Rationale  │ Instantaneous energy release│ Sustained continuous release  │
│                          │ ($1,800\text{GJ}$ in $16\text{s}$)│ ($354\text{MW}$ continuously) │
└──────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```
