import cv2
import numpy as np

# Canonical Industrial Keyword Lexicon
EQUIPMENT_LEXICON = [
    # Hazardous Storage
    {'type': 'LPG_SPHERE', 'keywords': ['LPG SPHERE', 'SPHERE', 'T-101', 'T-102', 'S-101', 'S-102', 'S-103', 'SPHERICAL TANK']},
    {'type': 'LPG_BULLET_TANK', 'keywords': ['BULLET TANK', 'LPG BULLET', 'T-103', 'T-104', 'T-105', 'T-106', 'T-201', 'T-202', 'T-203', 'T-204', 'BULLET VESSEL']},
    {'type': 'STORAGE_TANK', 'keywords': ['STORAGE TANK', 'T-201', 'T-202', 'T-501', 'T-502', 'T-503', 'T-504', 'DIESEL TANK', 'GASOLINE TANK', 'ATMOSPHERIC TANK']},
    {'type': 'FIRE_WATER_TANK', 'keywords': ['FIRE WATER TANK', 'FIRE WATER', 'FW-101', 'FW-501', 'WATER RESERVOIR']},
    {'type': 'FLARE_STACK', 'keywords': ['FLARE STACK', 'FLARE', 'ELEVATED FLARE']},
    
    # Process & Utilities
    {'type': 'PROCESS_AREA', 'keywords': ['PROCESS AREA', 'PROCESS UNIT', 'FRACTIONATION', 'CATALYTIC CRACKING', 'CCU-01', 'CRACKER']},
    {'type': 'PIPE_RACK', 'keywords': ['PIPE RACK', 'PIPE BRIDGE', 'R-01', 'R-02', 'RACK']},
    {'type': 'FIRE_PUMP_HOUSE', 'keywords': ['FIRE PUMP HOUSE', 'FIRE PUMP', 'FPH-01']},
    {'type': 'PUMP_HOUSE', 'keywords': ['PUMP HOUSE', 'PUMP STATION', 'PH-01']},
    {'type': 'COOLING_TOWER', 'keywords': ['COOLING TOWER', 'COOLING BASIN', 'CT-01']},
    {'type': 'ELECTRICAL_SUBSTATION', 'keywords': ['ELECTRICAL SUBSTATION', 'SUBSTATION', 'TRANSFORMER', 'ES-01']},
    {'type': 'UTILITY_AREA', 'keywords': ['UTILITY AREA', 'UTILITIES', 'AIR COMPRESSOR']},
    
    # Buildings
    {'type': 'CONTROL_ROOM', 'keywords': ['CONTROL ROOM & CCR', 'CONTROL ROOM', 'CCR', 'CENTRAL CONTROL', 'OPERATIONS CONTROL', 'CR-01']},
    {'type': 'WAREHOUSE', 'keywords': ['WAREHOUSE', 'W-01', 'W-02', 'STORAGE WAREHOUSE']},
    {'type': 'MAINTENANCE_SHOP', 'keywords': ['MAINTENANCE SHOP', 'WORKSHOP', 'M-01', 'MECHANICAL SHOP']},
    {'type': 'ADMIN_BUILDING', 'keywords': ['ADMIN BUILDING', 'ADMINISTRATION', 'OFFICE']},

    # Infrastructure & Safety
    {'type': 'TRUCK_LOADING_BAY', 'keywords': ['TRUCK LOADING BAY', 'LOADING BAY', 'GANTRY', 'TANKER BAY']},
    {'type': 'ASSEMBLY_POINT', 'keywords': ['ASSEMBLY POINT', 'MUSTER POINT', 'AP-01', 'AP-02']},
    {'type': 'GATE', 'keywords': ['MAIN GATE', 'SECONDARY GATE', 'EMERGENCY GATE', 'ACCESS GATE', 'GATE']},
]

METADATA_IGNORE_WORDS = [
    'PROJECT', 'TITLE', 'DRAWING NO', 'REV', 'SHEET', 'DATE', 'DESIGNED BY',
    'CHECKED BY', 'APPROVED BY', 'SCALE', 'NOTES', 'ALL DIMENSIONS', 'COORDINATE SYSTEM',
    'REFERENCE COORDINATES', 'PLANT MANAGER', 'SAFETY TEAM', 'RESQ ENGINEERING', 'NORTH'
]

def extract_localized_ocr_tokens(gray_img: np.ndarray, exclusion_zones: list) -> list:
    """
    Locates text regions across the blueprint using morphological gradient dilation,
    filters drawing metadata, and returns localized OCR tokens.
    """
    h, w = gray_img.shape
    tokens = []

    # Morphological gradient to detect text bands
    grad_x = cv2.Sobel(gray_img, cv2.CV_16S, 1, 0, ksize=3)
    abs_grad_x = cv2.convertScaleAbs(grad_x)
    _, text_thresh = cv2.threshold(abs_grad_x, 60, 255, cv2.THRESH_BINARY)
    
    # Connect letters into words/phrases horizontally
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (12, 3))
    dilated = cv2.morphologyEx(text_thresh, cv2.MORPH_CLOSE, kernel)
    
    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    for cnt in contours:
        x, y, bw, bh = cv2.boundingRect(cnt)
        if bw < 20 or bh < 6 or bw > 350 or bh > 60:
            continue
        cx, cy = x + bw / 2.0, y + bh / 2.0
        nx, ny = cx / w, cy / h

        # Exclude drawing title block / legend margins
        if any(z['minX'] <= nx <= z['maxX'] and z['minY'] <= ny <= z['maxY'] for z in exclusion_zones):
            continue

        tokens.append({
            'bbox': {'x': float(x), 'y': float(y), 'width': float(bw), 'height': float(bh)},
            'center': {'x': float(cx), 'y': float(cy)},
        })

    return tokens

def match_ocr_text_to_lexicon(text: str) -> dict:
    """
    Matches a text string against the industrial equipment lexicon.
    """
    if not text:
        return {'matchedType': None, 'score': 0.0, 'keyword': None}
    
    upper = text.upper().strip()

    # Ignore metadata text
    for ig in METADATA_IGNORE_WORDS:
        if ig in upper:
            return {'matchedType': None, 'score': 0.0, 'keyword': None}

    # Match against equipment lexicon (prioritizing longer, specific phrases)
    for rule in EQUIPMENT_LEXICON:
        for kw in rule['keywords']:
            if kw in upper:
                return {
                    'matchedType': rule['type'],
                    'score': 0.96 if len(kw) > 6 else 0.90,
                    'keyword': kw,
                }

    return {'matchedType': None, 'score': 0.0, 'keyword': None}

def associate_text_with_candidate(cand_center: dict, cand_bbox: dict, ocr_tokens: list, max_dist: float = 110.0) -> list:
    """
    Finds localized OCR tokens located inside or close to the candidate object.
    """
    cx, cy = cand_center['x'], cand_center['y']
    bx, by, bw, bh = cand_bbox['x'], cand_bbox['y'], cand_bbox['width'], cand_bbox['height']
    
    matches = []
    for token in ocr_tokens:
        tx, ty = token['center']['x'], token['center']['y']
        
        # Check containment
        is_inside = (bx - 15 <= tx <= bx + bw + 15) and (by - 15 <= ty <= by + bh + 15)
        dist = np.hypot(cx - tx, cy - ty)
        
        if is_inside or dist < max_dist:
            matches.append({
                'token': token,
                'distance': float(dist),
                'isInside': is_inside,
            })

    # Sort closest first
    matches.sort(key=lambda m: (not m['isInside'], m['distance']))
    return matches
