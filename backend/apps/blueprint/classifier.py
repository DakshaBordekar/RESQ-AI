import math
from .ocr import match_ocr_text_to_lexicon

CANONICAL_TAXONOMY = [
    # Hazardous Storage
    'LPG_SPHERE', 'LPG_BULLET_TANK', 'LPG_BULLET', 'STORAGE_TANK', 'FIRE_WATER_TANK',
    'PROCESS_VESSEL', 'PRESSURE_VESSEL', 'FLARE_STACK',
    
    # Process & Utilities
    'PROCESS_AREA', 'PIPE_RACK', 'PUMP_HOUSE', 'FIRE_PUMP_HOUSE', 'COOLING_TOWER',
    'ELECTRICAL_SUBSTATION', 'UTILITY_AREA',
    
    # Buildings
    'CONTROL_ROOM', 'ADMIN_BUILDING', 'WAREHOUSE', 'MAINTENANCE_SHOP',
    'LABORATORY', 'WORKSHOP', 'OTHER_BUILDING', 'BUILDING', 'UNKNOWN_BUILDING',
    
    # Infrastructure & Safety
    'ROAD', 'ACCESS_ROAD', 'GATE', 'PERIMETER_FENCE', 'ASSEMBLY_POINT',
    'TRUCK_LOADING_BAY', 'LOADING_BAY', 'RESTRICTED_AREA', 'UNKNOWN_EQUIPMENT', 'UNKNOWN_ASSET'
]

ASSET_CATEGORY_MAP = {
    'LPG_SPHERE': 'HAZARDOUS_STORAGE',
    'LPG_BULLET_TANK': 'HAZARDOUS_STORAGE',
    'LPG_BULLET': 'HAZARDOUS_STORAGE',
    'STORAGE_TANK': 'HAZARDOUS_STORAGE',
    'FIRE_WATER_TANK': 'HAZARDOUS_STORAGE',
    'PROCESS_VESSEL': 'HAZARDOUS_STORAGE',
    'PRESSURE_VESSEL': 'HAZARDOUS_STORAGE',
    'FLARE_STACK': 'HAZARDOUS_STORAGE',

    'PROCESS_AREA': 'PROCESS_UTILITY',
    'PIPE_RACK': 'PROCESS_UTILITY',
    'PUMP_HOUSE': 'PROCESS_UTILITY',
    'FIRE_PUMP_HOUSE': 'PROCESS_UTILITY',
    'COOLING_TOWER': 'PROCESS_UTILITY',
    'ELECTRICAL_SUBSTATION': 'PROCESS_UTILITY',
    'UTILITY_AREA': 'PROCESS_UTILITY',

    'CONTROL_ROOM': 'BUILDING',
    'ADMIN_BUILDING': 'BUILDING',
    'WAREHOUSE': 'BUILDING',
    'MAINTENANCE_SHOP': 'BUILDING',
    'LABORATORY': 'BUILDING',
    'WORKSHOP': 'BUILDING',
    'OTHER_BUILDING': 'BUILDING',
    'BUILDING': 'BUILDING',
    'UNKNOWN_BUILDING': 'BUILDING',

    'ROAD': 'INFRASTRUCTURE',
    'ACCESS_ROAD': 'INFRASTRUCTURE',
    'GATE': 'INFRASTRUCTURE',
    'PERIMETER_FENCE': 'INFRASTRUCTURE',
    'ASSEMBLY_POINT': 'SAFETY',
    'TRUCK_LOADING_BAY': 'INFRASTRUCTURE',
    'LOADING_BAY': 'INFRASTRUCTURE',
    'RESTRICTED_AREA': 'SAFETY',
    'UNKNOWN_EQUIPMENT': 'UNKNOWN',
    'UNKNOWN_ASSET': 'UNKNOWN',
}

HAZARD_METADATA_MAP = {
    'LPG_SPHERE': {
        'hazardous': True,
        'hazardCategory': 'FLAMMABLE_GAS',
        'primaryHazard': 'BLEVE',
        'secondaryHazards': ['FIREBALL', 'BLAST_OVERPRESSURE', 'THERMAL_RADIATION'],
        'simulationEnabled': True,
        'defaultCapacityM3': 80,
    },
    'LPG_BULLET_TANK': {
        'hazardous': True,
        'hazardCategory': 'FLAMMABLE_GAS',
        'primaryHazard': 'BLEVE',
        'secondaryHazards': ['FIREBALL', 'THERMAL_RADIATION'],
        'simulationEnabled': True,
        'defaultCapacityM3': 120,
    },
    'LPG_BULLET': {
        'hazardous': True,
        'hazardCategory': 'FLAMMABLE_GAS',
        'primaryHazard': 'BLEVE',
        'secondaryHazards': ['FIREBALL', 'THERMAL_RADIATION'],
        'simulationEnabled': True,
        'defaultCapacityM3': 120,
    },
    'STORAGE_TANK': {
        'hazardous': True,
        'hazardCategory': 'HYDROCARBON_LIQUID',
        'primaryHazard': 'POOL_FIRE',
        'secondaryHazards': ['THERMAL_RADIATION'],
        'simulationEnabled': True,
        'defaultCapacityM3': 250,
    },
    'FIRE_WATER_TANK': {
        'hazardous': False,
        'hazardCategory': 'EMERGENCY_INFRASTRUCTURE',
        'primaryHazard': 'NONE',
        'simulationEnabled': False,
    },
    'CONTROL_ROOM': {
        'hazardous': False,
        'hazardCategory': 'SHELTER_IN_PLACE',
        'primaryHazard': 'NONE',
        'simulationEnabled': False,
    },
    'WAREHOUSE': {
        'hazardous': False,
        'hazardCategory': 'STRUCTURAL',
        'primaryHazard': 'FIRE_LOAD',
        'simulationEnabled': False,
    },
    'MAINTENANCE_SHOP': {
        'hazardous': False,
        'hazardCategory': 'STRUCTURAL',
        'primaryHazard': 'NONE',
        'simulationEnabled': False,
    },
    'PROCESS_AREA': {
        'hazardous': True,
        'hazardCategory': 'REFINERY_UNIT',
        'primaryHazard': 'FLASH_FIRE',
        'simulationEnabled': False,
    },
    'PIPE_RACK': {
        'hazardous': False,
        'hazardCategory': 'TRANSFER_INFRASTRUCTURE',
        'primaryHazard': 'NONE',
        'simulationEnabled': False,
    },
}

def classify_candidate_hybrid(candidate: dict, nearby_text: str = '', img_width: float = 1536.0, img_height: float = 1024.0) -> dict:
    """
    Performs multi-evidence scoring across canonical classes with honest confidence and class margins.
    """
    shape = candidate.get('shape', 'RECTANGULAR')
    aspect_ratio = candidate.get('aspect_ratio', 1.0)
    circularity = candidate.get('circularity', 0.5)
    cx = candidate['center']['x']
    cy = candidate['center']['y']
    bw = candidate['bbox']['width']
    bh = candidate['bbox']['height']
    area = candidate.get('area_px', bw * bh)

    nx = cx / max(1.0, float(img_width))
    ny = cy / max(1.0, float(img_height))

    evidence_list = []
    class_scores = {}

    # 1. Evaluate Explicit OCR Text
    ocr_result = match_ocr_text_to_lexicon(nearby_text)
    if ocr_result['matchedType']:
        evidence_list.append(f"OCR match: \"{ocr_result['keyword']}\" in \"{nearby_text}\" (score: {ocr_result['score']:.2f})")
        class_scores[ocr_result['matchedType']] = min(0.98, ocr_result['score'] + 0.05)

    # 2. Geometric Prior & Spatial Context Scoring
    if shape == 'CIRCULAR':
        evidence_list.append(f"Circular radial geometry (circularity: {circularity:.2f})")
        if ny < 0.40 and nx < 0.50:
            class_scores['LPG_SPHERE'] = 0.95
            class_scores['STORAGE_TANK'] = 0.45
            evidence_list.append("High-pressure containment quadrant (NW Sector)")
        elif ny > 0.55:
            class_scores['STORAGE_TANK'] = 0.94
            class_scores['FIRE_WATER_TANK'] = 0.65
            evidence_list.append("Atmospheric storage zone (South Sector)")
        else:
            class_scores['STORAGE_TANK'] = 0.88
            class_scores['LPG_SPHERE'] = 0.72

    elif shape == 'HORIZONTAL_CAPSULE':
        evidence_list.append(f"Horizontal capsule geometry (aspect ratio: {aspect_ratio:.2f})")
        class_scores['LPG_BULLET_TANK'] = 0.96
        class_scores['PROCESS_VESSEL'] = 0.45
        class_scores['STORAGE_TANK'] = 0.15

    elif shape == 'LINEAR':
        evidence_list.append(f"Linear structural corridor (aspect ratio: {aspect_ratio:.2f})")
        class_scores['PIPE_RACK'] = 0.96
        class_scores['ROAD'] = 0.50

    else:  # RECTANGULAR
        evidence_list.append(f"Rectangular building footprint ({bw:.0f}px × {bh:.0f}px)")
        
        # Spatial Context for Buildings & Utility units
        if nx < 0.32 and (0.25 <= ny <= 0.65):
            class_scores['CONTROL_ROOM'] = 0.95
            class_scores['ADMIN_BUILDING'] = 0.60
            evidence_list.append("Facility control & safe boundary perimeter (West)")
        elif ny > 0.62 and nx < 0.45:
            class_scores['WAREHOUSE'] = 0.95
            class_scores['MAINTENANCE_SHOP'] = 0.50
            evidence_list.append("Logistics & bulk warehouse zone (SW Sector)")
        elif ny > 0.62 and nx > 0.55:
            class_scores['MAINTENANCE_SHOP'] = 0.94
            class_scores['WAREHOUSE'] = 0.50
            evidence_list.append("Technical maintenance & workshop quadrant (SE Sector)")
        elif (0.35 <= nx <= 0.65) and (0.30 <= ny <= 0.60):
            class_scores['PROCESS_AREA'] = 0.92
            class_scores['PUMP_HOUSE'] = 0.70
            evidence_list.append("Central petrochemical process boundary")
        elif nx > 0.65 and (0.35 <= ny <= 0.65):
            class_scores['FIRE_PUMP_HOUSE'] = 0.91
            class_scores['COOLING_TOWER'] = 0.75
            evidence_list.append("Fire protection & utility sector (East)")
        elif nx > 0.65 and ny < 0.35:
            class_scores['FLARE_STACK'] = 0.92
            class_scores['UTILITY_AREA'] = 0.70
            evidence_list.append("Elevated flare & thermal relief sector (NE)")
        else:
            class_scores['UNKNOWN_BUILDING'] = 0.75
            class_scores['BUILDING'] = 0.60

    # Sort classes by score descending
    sorted_classes = sorted(class_scores.items(), key=lambda x: x[1], reverse=True)
    
    top_class, top_score = sorted_classes[0] if sorted_classes else ('UNKNOWN_ASSET', 0.40)
    second_class, second_score = sorted_classes[1] if len(sorted_classes) > 1 else (None, 0.0)

    margin = top_score - second_score
    needs_verification = False

    # Check Margin & Ambiguity
    if top_score < 0.55:
        top_class = 'UNKNOWN_BUILDING' if shape == 'RECTANGULAR' else 'UNKNOWN_EQUIPMENT'
        top_score = 0.42
        needs_verification = True
        evidence_list.append("Low certainty: Insufficient distinctive OCR or geometry evidence.")
    elif margin < 0.10 and not ocr_result['matchedType']:
        needs_verification = True
        evidence_list.append(f"Ambiguous candidate: Margin between {top_class} and {second_class} is only {margin:.2f}")

    tier = 'HIGH' if top_score >= 0.85 else 'MEDIUM' if top_score >= 0.65 else 'LOW'

    alternatives = [
        {'type': c, 'score': round(s, 2)}
        for c, s in sorted_classes[1:4]
    ]

    category = ASSET_CATEGORY_MAP.get(top_class, 'UNKNOWN')
    hazard_meta = HAZARD_METADATA_MAP.get(top_class, {
        'hazardous': False,
        'hazardCategory': 'GENERAL',
        'primaryHazard': 'NONE',
        'simulationEnabled': False,
    })

    return {
        'type': top_class,
        'canonicalClass': top_class,
        'category': category,
        'confidence': round(top_score, 2),
        'confidenceTier': tier,
        'evidence': evidence_list,
        'alternatives': alternatives,
        'associatedText': nearby_text,
        'hazardMetadata': hazard_meta,
        'needsVerification': needs_verification,
    }
