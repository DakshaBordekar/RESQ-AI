# Backend Implementation Specification — RESQ-AI

## Document Information
- **Project Name:** RESQ-AI (AI-Powered Emergency & Disaster Response Orchestration Platform)
- **Document Version:** 1.0.0
- **Document Status:** FORMAL BACKEND ENGINEERING SPECIFICATION
- **Framework:** Python 3.11+ / Django 5.x / Django REST Framework (DRF)
- **Database:** PostgreSQL 15+ (with PostGIS / Spatial Indices)
- **Target Persona:** Emergency Command Center Coordinator

---

## 1. Django Architecture & Layered Design Pattern
The backend is structured around a strict **Clean Layered Architecture** to prevent the anti-pattern of placing business logic inside Django views or serializers:

```
+-------------------------------------------------------------------------+
|                        API TIER (Views & ViewSets)                      |
|           Handles HTTP parsing, JWT Auth, RBAC permissions, and         |
|           response status formatting.                                   |
+------------------------------------+------------------------------------+
                                     |
+------------------------------------v------------------------------------+
|                    SERIALIZER & VALIDATION TIER                         |
|           Input sanitation, schema enforcement, and JSON serialization. |
+------------------------------------+------------------------------------+
                                     |
+------------------------------------v------------------------------------+
|                       APPLICATION SERVICE TIER                          |
|           Orchestrates domain workflows, transactions, and event audits.|
+------------------------------------+------------------------------------+
                                     |
+------------------------------------v------------------------------------+
|                 DOMAIN ENGINES & ALGORITHMIC SERVICES                   |
|  +-------------------+  +-------------------+  +---------------------+  |
|  |  Priority Engine  |  |   Routing Engine  |  | Optimization Engine |  |
|  |  (Multi-Attribute)|  |  (Dynamic Dijkstra|  |  (Linear Sum Assign |  |
|  +-------------------+  +-------------------+  +---------------------+  |
|  +-------------------+  +-------------------+  +---------------------+  |
|  |  Hospital Engine  |  | Simulation Engine |  |  AI Service Layer   |  |
|  |  (Capacity Load)  |  |  (Scenario State) |  |  (LLM Bridge + Mock)|  |
|  +-------------------+  +-------------------+  +---------------------+  |
+------------------------------------+------------------------------------+
                                     |
+------------------------------------v------------------------------------+
|                   PERSISTENCE TIER (Django ORM Models)                  |
|           PostgreSQL 15+ relational schema, B-Tree & Spatial indices.   |
+-------------------------------------------------------------------------+
```

---

## 2. Django Project & App Modular Structure

```
backend/
├── manage.py
├── config/
│   ├── __init__.py
│   ├── asgi.py
│   ├── wsgi.py
│   ├── urls.py
│   └── settings/
│       ├── base.py
│       ├── development.py
│       └── production.py
├── apps/
│   ├── core/                  # Base models, custom exceptions, audit logging
│   ├── accounts/              # User models, RBAC permissions, JWT auth
│   ├── incidents/             # Incident models, victims, priority engine
│   ├── resources/             # Ambulances, rescue boats, fleet tracking
│   ├── hospitals/             # Hospitals, ICU capacity, matching engine
│   ├── routing/               # Road network graph, dynamic Dijkstra router
│   ├── optimization/          # Bipartite matching, dispatch assignment
│   ├── simulation/            # Scenario sandbox, event injector, step engine
│   ├── ai/                    # LLM provider abstraction, prompt management
│   └── analytics/             # Reporting, KPI aggregations, EAP generator
└── tests/                     # Unit, integration, and algorithmic test suites
```

### Domain Responsibility Matrix:
- **`core`**: Implements `TimeStampedModel`, global exception handlers, and immutable `AuditLog`.
- **`accounts`**: Implements custom `User` model, role choices (`COORDINATOR`, `FIELD_OFFICER`, `MEDICAL_LEAD`), and DRF permission classes.
- **`incidents`**: Manages emergency events, victim counts, vulnerability flags, and the deterministic `PriorityEngine`.
- **`resources`**: Tracks fleet status, vehicle capabilities (`WATER_RESCUE`, `ALS`, `HEAVY_LIFT`), and active assignments.
- **`hospitals`**: Tracks bed/ICU saturation and evaluates casualty-to-facility compatibility.
- **`routing`**: Models intersections and road segments as an in-memory weighted graph; executes dynamic detour searches.
- **`optimization`**: Implements SciPy-backed Linear Sum Assignment for global collision-free dispatches.
- **`simulation`**: Manages isolated scenario sessions and stateful disruption event injection.
- **`ai`**: Provider-agnostic interface for OpenAI/Anthropic and local fallback heuristics.
- **`analytics`**: Aggregates macro response KPIs and exports Emergency Action Plans (EAPs).

---

## 3. Settings Architecture & Environment Configuration
Django settings are partitioned into `base.py`, `development.py`, and `production.py` using `django-environ`:

```python
# config/settings/base.py
import environ
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
env = environ.Env(
    DEBUG=(bool, False),
    AI_PROVIDER=(str, 'openai'),
    SCENARIO_NAME=(str, 'chennai_deluge_2026')
)
environ.Env.read_env(BASE_DIR / '.env')

SECRET_KEY = env('SECRET_KEY')
DEBUG = env('DEBUG')
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['localhost', '127.0.0.1'])

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    # Local Apps
    'apps.core',
    'apps.accounts',
    'apps.incidents',
    'apps.resources',
    'apps.hospitals',
    'apps.routing',
    'apps.optimization',
    'apps.simulation',
    'apps.ai',
    'apps.analytics',
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
    'EXCEPTION_HANDLER': 'apps.core.exceptions.custom_exception_handler',
}
```

---

## 4. Database Schema & Django ORM Models

### 4.1 Core Models (`apps/core/models.py`)
```python
import uuid
from django.db import models
from django.conf import settings

class TimeStampedModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

class AuditLog(TimeStampedModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=100, db_index=True)
    entity_name = models.CharField(max_length=100)
    entity_id = models.CharField(max_length=100)
    details = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
```

### 4.2 Incident Models (`apps/incidents/models.py`)
```python
from django.db import models
from apps.core.models import TimeStampedModel

class Incident(TimeStampedModel):
    class HazardType(models.TextChoices):
        FLOOD = 'FLOOD', 'Urban Flood'
        FIRE = 'FIRE', 'Fire Hazard'
        MEDICAL = 'MEDICAL', 'Medical Emergency'
        STRUCTURAL = 'STRUCTURAL_COLLAPSE', 'Structural Collapse'

    class PriorityTier(models.TextChoices):
        CRITICAL = 'CRITICAL', 'Tier 1 - Critical'
        HIGH = 'HIGH', 'Tier 2 - High'
        MEDIUM = 'MEDIUM', 'Tier 3 - Medium'
        LOW = 'LOW', 'Tier 4 - Low'

    class Status(models.TextChoices):
        REPORTED = 'REPORTED', 'Reported'
        PARSED = 'PARSED', 'AI Parsed'
        TRIAGED = 'TRIAGED', 'Triaged'
        DISPATCHED = 'DISPATCHED', 'Dispatched'
        ON_SCENE = 'ON_SCENE', 'On Scene'
        RESOLVED = 'RESOLVED', 'Resolved'
        CANCELLED = 'CANCELLED', 'Cancelled'

    title = models.CharField(max_length=255)
    raw_text = models.TextField(blank=True, default='')
    location_name = models.CharField(max_length=255)
    latitude = models.FloatField(db_index=True)
    longitude = models.FloatField(db_index=True)
    hazard_type = models.CharField(max_length=50, choices=HazardType.choices, default=HazardType.FLOOD)
    people_affected = models.PositiveIntegerField(default=1)
    vulnerable_people = models.PositiveIntegerField(default=0)
    vulnerability_flags = models.JSONField(default=list) # e.g. ["ELDERLY", "INFANT"]
    medical_need = models.BooleanField(default=False)
    mobility_status = models.CharField(max_length=50, default='AMBULATORY')
    urgency = models.CharField(max_length=50, default='URGENT')
    calculated_priority = models.FloatField(default=0.0, db_index=True)
    priority_tier = models.CharField(max_length=20, choices=PriorityTier.choices, default=PriorityTier.MEDIUM)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.REPORTED, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=['status', 'calculated_priority']),
            models.Index(fields=['latitude', 'longitude']),
        ]
```

### 4.3 Resource Models (`apps/resources/models.py`)
```python
from django.db import models
from apps.core.models import TimeStampedModel

class Resource(TimeStampedModel):
    class ResourceType(models.TextChoices):
        AMBULANCE_BLS = 'AMBULANCE_BLS', 'Basic Life Support Ambulance'
        AMBULANCE_ALS = 'AMBULANCE_ALS', 'Advanced Life Support Ambulance'
        RESCUE_BOAT = 'RESCUE_BOAT', 'Inflatable Flood Rescue Boat'
        NDRF_TEAM = 'NDRF_TEAM', 'NDRF Tactical Rescue Team'
        FIRE_ENGINE = 'FIRE_ENGINE', 'Heavy Fire Tender'

    class Status(models.TextChoices):
        AVAILABLE = 'AVAILABLE', 'Available'
        ASSIGNED = 'ASSIGNED', 'Assigned'
        EN_ROUTE_INCIDENT = 'EN_ROUTE_INCIDENT', 'En Route to Incident'
        ON_SCENE = 'ON_SCENE', 'On Scene'
        TRANSPORTING_HOSPITAL = 'TRANSPORTING_HOSPITAL', 'Transporting to Hospital'
        RETURNING = 'RETURNING', 'Returning to Base'
        OFFLINE = 'OFFLINE', 'Offline / Maintenance'

    name = models.CharField(max_length=100)
    call_sign = models.CharField(max_length=50, unique=True)
    type = models.CharField(max_length=50, choices=ResourceType.choices)
    status = models.CharField(max_length=50, choices=Status.choices, default=Status.AVAILABLE, db_index=True)
    latitude = models.FloatField()
    longitude = models.FloatField()
    capacity = models.PositiveIntegerField(default=4)
    capabilities = models.JSONField(default=list) # e.g. ["WATER_RESCUE", "OXYGEN", "VENTILATOR"]
```

### 4.4 Hospital & Medical Models (`apps/hospitals/models.py`)
```python
from django.db import models
from apps.core.models import TimeStampedModel

class Hospital(TimeStampedModel):
    class Status(models.TextChoices):
        ACCEPTING = 'ACCEPTING', 'Accepting Casualties'
        DIVERT_SURGE = 'DIVERT_SURGE', 'Surge Warning (Near Capacity)'
        DIVERT_FULL = 'DIVERT_FULL', 'Full - Diverting Inbound'
        OFFLINE = 'OFFLINE', 'Offline / Power Loss'

    name = models.CharField(max_length=200)
    latitude = models.FloatField()
    longitude = models.FloatField()
    total_beds = models.PositiveIntegerField(default=100)
    available_beds = models.PositiveIntegerField(default=20)
    total_icu = models.PositiveIntegerField(default=20)
    available_icu = models.PositiveIntegerField(default=5)
    has_trauma_bay = models.BooleanField(default=True)
    has_burn_unit = models.BooleanField(default=False)
    has_pediatric = models.BooleanField(default=True)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.ACCEPTING)
```

### 4.5 Road Network & Routing Models (`apps/routing/models.py`)
```python
from django.db import models
from apps.core.models import TimeStampedModel

class RoadNode(TimeStampedModel):
    node_index = models.PositiveIntegerField(unique=True, db_index=True)
    name = models.CharField(max_length=150, blank=True)
    latitude = models.FloatField()
    longitude = models.FloatField()

class RoadSegment(TimeStampedModel):
    class Status(models.TextChoices):
        CLEAR = 'CLEAR', 'Clear'
        CONGESTED = 'CONGESTED', 'Congested'
        WATERLOGGED = 'WATERLOGGED', 'Waterlogged (Slow Passage)'
        BLOCKED = 'BLOCKED', 'Blocked / Submerged'

    source_node = models.ForeignKey(RoadNode, on_delete=models.CASCADE, related_name='outgoing_segments')
    target_node = models.ForeignKey(RoadNode, on_delete=models.CASCADE, related_name='incoming_segments')
    length_km = models.FloatField()
    base_speed_kmh = models.FloatField(default=40.0)
    hazard_multiplier = models.FloatField(default=1.0)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.CLEAR, db_index=True)
```

### 4.6 Dispatch & Assignment Models (`apps/optimization/models.py`)
```python
from django.db import models
from apps.core.models import TimeStampedModel
from apps.incidents.models import Incident
from apps.resources.models import Resource
from apps.hospitals.models import Hospital

class Dispatch(TimeStampedModel):
    class Status(models.TextChoices):
        PROPOSED = 'PROPOSED', 'Proposed Assignment'
        APPROVED = 'APPROVED', 'Approved by Coordinator'
        DISPATCHED = 'DISPATCHED', 'Unit Dispatched'
        COMPLETED = 'COMPLETED', 'Operation Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'

    incident = models.ForeignKey(Incident, on_delete=models.CASCADE, related_name='dispatches')
    resource = models.ForeignKey(Resource, on_delete=models.CASCADE, related_name='dispatches')
    target_hospital = models.ForeignKey(Hospital, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.PROPOSED)
    route_geometry = models.JSONField(default=list) # List of [lat, lon] coordinates
    distance_km = models.FloatField(default=0.0)
    eta_minutes = models.FloatField(default=0.0)
    mathematical_rationale = models.JSONField(default=dict)
    narrative_explanation = models.TextField(blank=True, default='')
```

---

## 5. Domain Engines & Algorithmic Implementations

### 5.1 Priority Scoring Engine (`apps/incidents/services/priority_engine.py`)
```python
class PriorityEngine:
    WEIGHT_SEVERITY = 0.30
    WEIGHT_VULNERABILITY = 0.20
    WEIGHT_SCALE = 0.15
    WEIGHT_MEDICAL = 0.15
    WEIGHT_URGENCY = 0.10
    WEIGHT_DECAY = 0.10

    @classmethod
    def calculate_score(cls, incident) -> float:
        # Severity Factor (0 - 100)
        sev_map = {'CRITICAL': 100.0, 'HIGH': 75.0, 'MEDIUM': 40.0, 'LOW': 15.0}
        s_score = sev_map.get(incident.priority_tier, 40.0)

        # Vulnerability Factor (0 - 100)
        v_score = min(100.0, incident.vulnerable_people * 35.0)

        # Scale Factor (0 - 100)
        n_score = min(100.0, incident.people_affected * 10.0)

        # Medical Factor (0 or 100)
        m_score = 100.0 if incident.medical_need else 0.0

        # Urgency Factor (0 - 100)
        urg_map = {'IMMEDIATE': 100.0, 'URGENT': 70.0, 'MODERATE': 30.0}
        u_score = urg_map.get(incident.urgency, 50.0)

        # Time Decay Factor (Points for wait time)
        # Scaled to add up to 25 points after 60 minutes
        t_score = min(100.0, (incident.created_at_age_minutes or 0) * 1.66)

        raw_score = (
            cls.WEIGHT_SEVERITY * s_score +
            cls.WEIGHT_VULNERABILITY * v_score +
            cls.WEIGHT_SCALE * n_score +
            cls.WEIGHT_MEDICAL * m_score +
            cls.WEIGHT_URGENCY * u_score +
            cls.WEIGHT_DECAY * t_score
        )

        return round(min(100.0, max(0.0, raw_score)), 2)
```

### 5.2 Dynamic Graph Routing Engine (`apps/routing/services/router.py`)
```python
import heapq
import math
from typing import Dict, List, Tuple

class DynamicGraphRouter:
    def __init__(self, nodes: Dict[int, Tuple[float, float]], edges: List[dict]):
        self.nodes = nodes # node_id -> (lat, lon)
        self.adj = {node_id: [] for node_id in nodes}
        for edge in edges:
            u, v = edge['source'], edge['target']
            weight = edge['length_km'] / (edge['base_speed_kmh'] / 60.0) # travel time in minutes
            if edge['status'] == 'BLOCKED':
                weight = float('inf')
            elif edge['status'] == 'WATERLOGGED':
                weight *= edge.get('hazard_multiplier', 2.5)
            self.adj[u].append((v, weight, edge['length_km']))

    def find_shortest_path(self, start_node: int, end_node: int) -> Tuple[List[int], float, float]:
        pq = [(0.0, start_node, [])]
        visited = set()
        dist = {node: float('inf') for node in self.nodes}
        dist[start_node] = 0.0

        while pq:
            cost, u, path = heapq.heappop(pq)
            if u in visited:
                continue
            visited.add(u)
            current_path = path + [u]

            if u == end_node:
                total_distance_km = sum(
                    math.dist(self.nodes[current_path[i]], self.nodes[current_path[i+1]]) * 111.0
                    for i in range(len(current_path)-1)
                )
                return current_path, cost, round(total_distance_km, 2)

            for v, weight, length in self.adj.get(u, []):
                if weight != float('inf') and dist[u] + weight < dist[v]:
                    dist[v] = dist[u] + weight
                    heapq.heappush(pq, (dist[v], v, current_path))

        return [], float('inf'), 0.0
```

### 5.3 Deterministic Resource Optimization Engine (`apps/optimization/services/optimizer.py`)
```python
import numpy as np
from scipy.optimize import linear_sum_assignment

class GlobalResourceOptimizer:
    @classmethod
    def run_optimization(cls, incidents, resources, road_router):
        if not incidents or not resources:
            return []

        N = len(incidents)
        M = len(resources)
        cost_matrix = np.full((N, M), 1e6)

        for i, inc in enumerate(incidents):
            for j, res in enumerate(resources):
                # Capability Constraint Check
                if inc.hazard_type == 'FLOOD' and 'WATER_RESCUE' not in res.capabilities:
                    continue # Infeasible assignment
                
                # Compute ETA via road router
                eta = road_router.estimate_eta((res.latitude, res.longitude), (inc.latitude, inc.longitude))
                if eta == float('inf'):
                    continue

                # Cost = w1 * ETA - w2 * PriorityScore
                cost = (0.60 * eta) - (0.40 * inc.calculated_priority)
                cost_matrix[i, j] = cost

        row_ind, col_ind = linear_sum_assignment(cost_matrix)
        assignments = []

        for r, c in zip(row_ind, col_ind):
            if cost_matrix[r, c] < 1e5:
                assignments.append({
                    'incident': incidents[r],
                    'resource': resources[c],
                    'cost_score': float(cost_matrix[r, c]),
                })

        return assignments
```

---

## 6. AI Service Layer & Provider Abstraction (`apps/ai/services/llm_bridge.py`)

```python
import json
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any

logger = logging.getLogger(__name__)

class LLMProvider(ABC):
    @abstractmethod
    def extract_incident_schema(self, text: str) -> Dict[str, Any]:
        pass

    @abstractmethod
    def synthesize_explanation(self, context: Dict[str, Any]) -> str:
        pass

class OpenAIProvider(LLMProvider):
    def __init__(self, api_key: str):
        from openai import OpenAI
        self.client = OpenAI(api_key=api_key)

    def extract_incident_schema(self, text: str) -> Dict[str, Any]:
        prompt = (
            "Extract emergency parameters from this distress report into JSON format: "
            "{location_name, latitude, longitude, hazard_type, severity, people_affected, "
            "vulnerable_people, vulnerability_flags, medical_need, mobility_status, urgency}. "
            f"Text: {text}"
        )
        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            timeout=3.0
        )
        return json.loads(response.choices[0].message.content)

    def synthesize_explanation(self, context: Dict[str, Any]) -> str:
        prompt = f"Synthesize a 2-sentence operational justification for dispatching resource {context['resource_name']} to incident {context['incident_title']} with priority {context['priority']}."
        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            timeout=3.0
        )
        return response.choices[0].message.content

class LocalMockProvider(LLMProvider):
    """Deterministic fallback provider for offline/zero-cost demo runs."""
    def extract_incident_schema(self, text: str) -> Dict[str, Any]:
        is_flood = 'water' in text.lower() or 'flood' in text.lower()
        return {
            "location_name": "Velachery Main Road, Chennai",
            "latitude": 12.9815,
            "longitude": 80.2180,
            "hazard_type": "FLOOD" if is_flood else "MEDICAL",
            "severity": "CRITICAL" if "trapped" in text.lower() else "HIGH",
            "people_affected": 3,
            "vulnerable_people": 2,
            "vulnerability_flags": ["ELDERLY"],
            "medical_need": True,
            "mobility_status": "TRAPPED",
            "urgency": "IMMEDIATE",
            "confidence_score": 0.95
        }

    def synthesize_explanation(self, context: Dict[str, Any]) -> str:
        return (
            f"Resource {context.get('resource_name', 'Asset')} was allocated to {context.get('incident_title', 'Incident')} "
            f"because it is the closest capable unit with an ETA of {context.get('eta', 8)} minutes, matching priority score {context.get('priority', 90)}."
        )
```

---

## 7. Django REST API ViewSets & URLs

### 7.1 Incident ViewSet (`apps/incidents/views.py`)
```python
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.incidents.models import Incident
from apps.incidents.serializers import IncidentSerializer
from apps.incidents.services.priority_engine import PriorityEngine
from apps.ai.services.llm_bridge import LocalMockProvider, OpenAIProvider
from django.conf import settings

class IncidentViewSet(viewsets.ModelViewSet):
    queryset = Incident.objects.all().order_by('-calculated_priority')
    serializer_class = IncidentSerializer

    @action(detail=False, methods=['post'], url_path='analyze-text')
    def analyze_text(self, request):
        raw_text = request.data.get('raw_text', '')
        if not raw_text:
            return Response({'error': 'raw_text parameter is required'}, status=status.HTTP_400_BAD_REQUEST)

        provider = LocalMockProvider() if settings.AI_PROVIDER == 'local_mock' else OpenAIProvider(settings.OPENAI_API_KEY)
        try:
            extracted_data = provider.extract_incident_schema(raw_text)
            return Response(extracted_data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], url_path='recalculate-priority')
    def recalculate_priority(self, request, pk=None):
        incident = self.get_object()
        incident.calculated_priority = PriorityEngine.calculate_score(incident)
        incident.save()
        return Response({'calculated_priority': incident.calculated_priority}, status=status.HTTP_200_OK)
```

---

## 8. Docker & Production Containerization

### Dockerfile:
```dockerfile
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app/

EXPOSE 8000
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
```

---

## 9. Testing & Quality Assurance Suite

### Unit & Algorithmic Tests:
1. `test_priority_engine_bounds`: Verifies score clamping to $[0.00, 100.00]$ across extreme parameter sets.
2. `test_dijkstra_blocked_detour`: Verifies that marking a bridge edge `BLOCKED` routes around the impediment.
3. `test_bipartite_matching_capability_isolation`: Verifies that flood incidents are never assigned land-only utility vehicles.
4. `test_hospital_divert_threshold`: Verifies that $100\%$ saturated ICU facilities divert casualties to fallback hospitals.
