import json
import logging
import os
from abc import ABC, abstractmethod
from typing import Dict, Any
from django.conf import settings
from apps.ai.prompts import INCIDENT_EXTRACTION_PROMPT, ACTION_PLAN_PROMPT

logger = logging.getLogger(__name__)

class BaseLLMProvider(ABC):
    @abstractmethod
    def extract_incident(self, text: str) -> Dict[str, Any]:
        pass

    @abstractmethod
    def generate_action_plan(self, telemetry_context: Dict[str, Any]) -> str:
        pass


class OpenAIProvider(BaseLLMProvider):
    def __init__(self, api_key: str, base_url: str = None):
        from openai import OpenAI
        
        # Auto-detect OpenRouter keys or custom base URLs
        is_openrouter = api_key.startswith("sk-or-v1-") or (base_url and "openrouter" in base_url)
        resolved_base_url = base_url or ("https://openrouter.ai/api/v1" if is_openrouter else None)
        self.model = "openai/gpt-4o-mini" if is_openrouter else "gpt-4o-mini"
        
        default_headers = {}
        if is_openrouter:
            default_headers = {
                "HTTP-Referer": "http://localhost:5173",
                "X-Title": "RESQ-AI Disaster Response Command Center"
            }

        self.client = OpenAI(
            api_key=api_key,
            base_url=resolved_base_url,
            default_headers=default_headers if default_headers else None
        )

    def extract_incident(self, text: str) -> Dict[str, Any]:
        prompt = INCIDENT_EXTRACTION_PROMPT.format(text=text)
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": "You are a crisis response dispatch entity extraction AI. Output strictly valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                timeout=6.0
            )
            content = response.choices[0].message.content
            return json.loads(content)
        except Exception as e:
            logger.warning(f"OpenAI extraction failed, falling back to LocalMockProvider: {e}")
            return LocalMockProvider().extract_incident(text)

    def generate_action_plan(self, telemetry_context: Dict[str, Any]) -> str:
        prompt = ACTION_PLAN_PROMPT.format(
            critical_count=telemetry_context.get('critical_count', 0),
            dispatched_count=telemetry_context.get('dispatched_count', 0),
            hospital_summary=telemetry_context.get('hospital_summary', 'Normal'),
            blocked_roads=telemetry_context.get('blocked_roads', 'None')
        )
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are the Chief Emergency Operations Commander."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                timeout=8.0
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.warning(f"OpenAI action plan failed, falling back to LocalMockProvider: {e}")
            return LocalMockProvider().generate_action_plan(telemetry_context)


class LocalMockProvider(BaseLLMProvider):
    """Deterministic, zero-latency local fallback parser for offline/demo reliability."""

    LOCATION_MAP = {
        'velachery': {'name': 'Velachery Main Road, Chennai', 'lat': 12.9815, 'lon': 80.2180},
        'adyar': {'name': 'Adyar Bridge & Canal Zone', 'lat': 13.0012, 'lon': 80.2565},
        'saidapet': {'name': 'Saidapet Bridge / Anna Salai', 'lat': 13.0205, 'lon': 80.2230},
        'guindy': {'name': 'Guindy Industrial Estate / Flyover', 'lat': 13.0067, 'lon': 80.2025},
        'marina': {'name': 'Marina Beach / Kamarajar Salai', 'lat': 13.0500, 'lon': 80.2824},
        'tambaram': {'name': 'Tambaram GST Road', 'lat': 12.9249, 'lon': 80.1260},
        'mylapore': {'name': 'Mylapore Tank Zone', 'lat': 13.0334, 'lon': 80.2680},
        'nungambakkam': {'name': 'Nungambakkam High Road', 'lat': 13.0569, 'lon': 80.2425},
    }

    def extract_incident(self, text: str) -> Dict[str, Any]:
        lower = text.lower()
        
        # 1. Identify Location
        matched_loc = {'name': 'Chennai Central Urban Sector', 'lat': 13.0827, 'lon': 80.2707}
        for kw, loc in self.LOCATION_MAP.items():
            if kw in lower:
                matched_loc = loc
                break

        # 2. Hazard Type
        if 'fire' in lower or 'smoke' in lower or 'flame' in lower:
            hazard = 'FIRE'
        elif 'collapse' in lower or 'building' in lower or 'debris' in lower:
            hazard = 'STRUCTURAL_COLLAPSE'
        elif 'heart' in lower or 'chest' in lower or 'stroke' in lower or 'oxygen' in lower:
            hazard = 'MEDICAL'
        else:
            hazard = 'FLOOD'

        # 3. Vulnerability Flags
        flags = []
        if 'elderly' in lower or 'grandmother' in lower or 'grandfather' in lower or 'senior' in lower or 'old' in lower:
            flags.append('ELDERLY')
        if 'baby' in lower or 'infant' in lower or 'child' in lower or 'pregnant' in lower:
            flags.append('INFANT')
        if 'dialysis' in lower or 'oxygen' in lower or 'ventilator' in lower or 'insulin' in lower:
            flags.append('DIALYSIS')
        if 'disabled' in lower or 'wheelchair' in lower:
            flags.append('DISABLED')

        # 4. Mobility & Victims
        trapped = 'trapped' in lower or 'terrace' in lower or 'roof' in lower or 'cannot leave' in lower
        mobility = 'TRAPPED' if trapped else ('LIMITED' if flags else 'AMBULATORY')

        import re
        num_matches = re.findall(r'\b(\d+)\b', text)
        people_count = int(num_matches[0]) if num_matches else (3 if trapped else 1)
        vulnerable_count = len(flags) * (2 if people_count > 2 else 1)

        # 5. Severity & Urgency
        if trapped or 'dialysis' in flags or people_count >= 5 or hazard == 'STRUCTURAL_COLLAPSE':
            severity = 'CRITICAL'
            urgency = 'IMMEDIATE'
        elif len(flags) > 0 or hazard == 'FIRE':
            severity = 'HIGH'
            urgency = 'URGENT'
        else:
            severity = 'MEDIUM'
            urgency = 'MODERATE'

        return {
            "location_name": matched_loc['name'],
            "latitude": matched_loc['lat'],
            "longitude": matched_loc['lon'],
            "hazard_type": hazard,
            "severity": severity,
            "people_affected": max(1, people_count),
            "vulnerable_people": max(0, vulnerable_count),
            "vulnerability_flags": flags,
            "medical_need": bool('dialysis' in flags or 'oxygen' in flags or hazard == 'MEDICAL' or severity == 'CRITICAL'),
            "mobility_status": mobility,
            "urgency": urgency,
            "summary": f"Distress report at {matched_loc['name']} involving {people_count} people ({severity} priority).",
            "confidence_score": 0.96
        }

    def generate_action_plan(self, telemetry_context: Dict[str, Any]) -> str:
        crit = telemetry_context.get('critical_count', 3)
        disp = telemetry_context.get('dispatched_count', 4)
        hosp = telemetry_context.get('hospital_summary', 'Apollo & Rajiv Gandhi Govt Hospital')
        roads = telemetry_context.get('blocked_roads', 'Saidapet Bridge Submerged')

        return (
            f"### EMERGENCY ACTION PLAN — OPERATION CHENNAI CRISIS RESPONSE\n\n"
            f"**1. SITUATIONAL ASSESSMENT:**\n"
            f"Severe inundation across Adyar Basin and Velachery lowlands. Currently tracking {crit} Tier-1 Critical incidents with high vulnerable population density. {roads} is flagged impassable; traffic diverted via Guindy flyover.\n\n"
            f"**2. ASSET DISPATCH & EVACUATION CORRIDORS:**\n"
            f"{disp} tactical units (Amphibious Boats & ALS Ambulances) deployed under automated collision-free routing. Primary transit corridors established along Anna Salai and Inner Ring Road.\n\n"
            f"**3. MEDICAL DIRECTIVES:**\n"
            f"Trauma and dialysis casualties routed directly to {hosp}. Secondary general casualties routed to Community Relief Shelters."
        )


class LLMBridgeService:
    @classmethod
    def get_provider(cls) -> BaseLLMProvider:
        provider_mode = getattr(settings, 'AI_PROVIDER', 'local_mock')
        api_key = getattr(settings, 'OPENAI_API_KEY', '')
        base_url = getattr(settings, 'OPENAI_BASE_URL', None)

        if provider_mode == 'openai' and api_key:
            return OpenAIProvider(api_key=api_key, base_url=base_url)
        return LocalMockProvider()
