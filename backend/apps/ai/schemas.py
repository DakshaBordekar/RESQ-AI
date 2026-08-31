from typing import List, Optional
from pydantic import BaseModel, Field

class IncidentExtractionSchema(BaseModel):
    location_name: str = Field(..., description="Identified location name or landmark")
    latitude: float = Field(..., description="Estimated latitude in Chennai bounds (12.8 - 13.3)")
    longitude: float = Field(..., description="Estimated longitude in Chennai bounds (80.1 - 80.4)")
    hazard_type: str = Field("FLOOD", description="FLOOD, FIRE, MEDICAL, STRUCTURAL_COLLAPSE")
    severity: str = Field("HIGH", description="CRITICAL, HIGH, MEDIUM, LOW")
    people_affected: int = Field(1, ge=1, description="Estimated number of victims")
    vulnerable_people: int = Field(0, ge=0, description="Count of elderly, infants, or disabled")
    vulnerability_flags: List[str] = Field(default_factory=list, description="Tags like ELDERLY, INFANT, DIALYSIS")
    medical_need: bool = Field(False, description="Whether emergency medical triage is needed")
    mobility_status: str = Field("AMBULATORY", description="TRAPPED, LIMITED, AMBULATORY")
    urgency: str = Field("URGENT", description="IMMEDIATE, URGENT, MODERATE")
    summary: str = Field("", description="One sentence concise incident summary")
    confidence_score: float = Field(0.90, ge=0.0, le=1.0)
