import cv2
import numpy as np
import io
from PIL import Image

def preprocess_blueprint_image(image_bytes: bytes) -> dict:
    """
    Normalizes resolution, enhances contrast via CLAHE, cleans noise,
    and defines strict metadata exclusion boundaries.
    """
    # 1. Load image
    pil_img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    orig_w, orig_h = pil_img.size

    cv_img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)

    # 2. CLAHE contrast enhancement
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced_gray = clahe.apply(gray)

    # 3. Clean Binary Line Mask
    _, binary = cv2.threshold(enhanced_gray, 220, 255, cv2.THRESH_BINARY_INV)

    # Remove isolated 1px speckles
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    cleaned_binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)

    # 4. Strict Metadata & Drawing Exclusion Zones (0.0 to 1.0 normalized)
    exclusion_zones = [
        # Legend column (Right side)
        {'name': 'LEGEND', 'minX': 0.78, 'maxX': 1.0, 'minY': 0.18, 'maxY': 0.70},
        # Title block (Bottom Right)
        {'name': 'TITLE_BLOCK', 'minX': 0.76, 'maxX': 1.0, 'minY': 0.70, 'maxY': 1.0},
        # Drawing header (Top Right)
        {'name': 'DRAWING_HEADER', 'minX': 0.76, 'maxX': 1.0, 'minY': 0.0, 'maxY': 0.18},
        # Coordinate table (Bottom Left)
        {'name': 'COORDINATE_TABLE', 'minX': 0.0, 'maxX': 0.28, 'minY': 0.80, 'maxY': 1.0},
        # Outer Border Frame / Grid Ticks
        {'name': 'TOP_GRID', 'minX': 0.0, 'maxX': 1.0, 'minY': 0.0, 'maxY': 0.055},
        {'name': 'BOTTOM_GRID', 'minX': 0.0, 'maxX': 1.0, 'minY': 0.945, 'maxY': 1.0},
        {'name': 'LEFT_GRID', 'minX': 0.0, 'maxX': 0.055, 'minY': 0.0, 'maxY': 1.0},
        {'name': 'RIGHT_GRID', 'minX': 0.945, 'maxX': 1.0, 'minY': 0.0, 'maxY': 1.0},
    ]

    return {
        'width': orig_w,
        'height': orig_h,
        'cv_image': cv_img,
        'gray': enhanced_gray,
        'binary': cleaned_binary,
        'exclusion_zones': exclusion_zones,
    }

def is_in_exclusion_zone(x_px: float, y_px: float, width_px: float, height_px: float, zones: list) -> bool:
    nx = x_px / max(1.0, float(width_px))
    ny = y_px / max(1.0, float(height_px))
    for z in zones:
        if z['minX'] <= nx <= z['maxX'] and z['minY'] <= ny <= z['maxY']:
            return True
    return False
