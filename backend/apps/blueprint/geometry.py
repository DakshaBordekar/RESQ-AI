import cv2
import numpy as np

def extract_blueprint_geometry(gray_img: np.ndarray, binary_img: np.ndarray, exclusion_zones: list) -> list:
    """
    Extracts high-fidelity physical asset candidates (spherical tanks, bullet vessels, storage tanks,
    buildings, pipe racks, and flare stacks) using hierarchical contour analysis and strict NMS.
    """
    h, w = gray_img.shape
    candidates = []

    # Clean binary mask to merge equipment walls while excluding thin dimension leaders
    kernel_close = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    closed_binary = cv2.morphologyEx(binary_img, cv2.MORPH_CLOSE, kernel_close)

    # Use RETR_TREE to capture internal equipment footprints inside the facility perimeter
    contours, hierarchy = cv2.findContours(closed_binary, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    for cnt in contours:
        area = cv2.contourArea(cnt)
        # Filter: Substantial equipment footprint
        if area < 1800 or area > (w * h * 0.12):
            continue

        x, y, bw, bh = cv2.boundingRect(cnt)
        cx, cy = x + bw / 2.0, y + bh / 2.0
        nx, ny = cx / w, cy / h

        # Exclude drawing title block / legend margins / coordinate tables
        if any(z['minX'] <= nx <= z['maxX'] and z['minY'] <= ny <= z['maxY'] for z in exclusion_zones):
            continue

        peri = cv2.arcLength(cnt, True)
        circularity = 4 * np.pi * (area / (peri * peri)) if peri > 0 else 0
        aspect_ratio = bw / max(1.0, float(bh))

        shape_type = 'RECTANGULAR'
        geom_conf = 0.85

        if aspect_ratio >= 3.8 or (1.0 / aspect_ratio >= 3.8):
            shape_type = 'LINEAR'
            geom_conf = 0.94
        elif (1.7 <= aspect_ratio <= 3.6) and bh >= 25:
            shape_type = 'HORIZONTAL_CAPSULE'
            geom_conf = 0.96
        elif circularity >= 0.72 and (0.75 <= aspect_ratio <= 1.30):
            shape_type = 'CIRCULAR'
            geom_conf = 0.95
        elif (0.65 <= aspect_ratio <= 2.2) and area >= 3000:
            shape_type = 'RECTANGULAR'
            geom_conf = 0.90

        candidates.append({
            'id': f"CAND-{len(candidates)+1:02d}",
            'shape': shape_type,
            'bbox': {'x': float(x), 'y': float(y), 'width': float(bw), 'height': float(bh)},
            'center': {'x': float(cx), 'y': float(cy)},
            'circularity': float(circularity),
            'aspect_ratio': float(aspect_ratio),
            'area_px': float(area),
            'geometryConfidence': float(geom_conf),
        })

    # Strict IoU Non-Maximum Suppression
    return apply_strict_nms(candidates, iou_thresh=0.30)

def calculate_iou(boxA: dict, boxB: dict) -> float:
    xA = max(boxA['x'], boxB['x'])
    yA = max(boxA['y'], boxB['y'])
    xB = min(boxA['x'] + boxA['width'], boxB['x'] + boxB['width'])
    yB = min(boxA['y'] + boxA['height'], boxB['y'] + boxB['height'])

    interArea = max(0.0, xB - xA) * max(0.0, yB - yA)
    boxAArea = boxA['width'] * boxA['height']
    boxBArea = boxB['width'] * boxB['height']
    unionArea = boxAArea + boxBArea - interArea

    return interArea / max(1e-5, unionArea)

def apply_strict_nms(candidates: list, iou_thresh: float = 0.30) -> list:
    if not candidates:
        return []

    # Sort by area descending
    candidates.sort(key=lambda c: c['area_px'], reverse=True)
    selected = []

    for c in candidates:
        is_dup = False
        for s in selected:
            if calculate_iou(c['bbox'], s['bbox']) > iou_thresh:
                is_dup = True
                break
        if not is_dup:
            selected.append(c)

    return selected[:20]  # Cap to top 20 distinct physical assets
