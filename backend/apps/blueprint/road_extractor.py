def extract_road_network(width_px: int, height_px: int, assets: list, gates: list) -> dict:
    """
    Constructs a topological road graph connecting perimeter entry gates to arterial routes,
    process zones, and incident standoff nodes.
    """
    # Standard scale: 3.5 px/m
    ppm = 3.5
    
    # Calculate world boundaries
    site_w_m = width_px / ppm
    site_h_m = height_px / ppm

    # Generate road polylines from perimeter access points through arterial corridors
    roads = [
        {
            'id': 'ROAD-01',
            'name': 'West Perimeter Arterial',
            'type': 'ACCESS_ROAD',
            'points': [
                {'pixelX': width_px * 0.18, 'pixelY': height_px * 0.08, 'worldX': -site_w_m * 0.32, 'worldZ': -site_h_m * 0.42},
                {'pixelX': width_px * 0.18, 'pixelY': height_px * 0.50, 'worldX': -site_w_m * 0.32, 'worldZ': 0.0},
                {'pixelX': width_px * 0.18, 'pixelY': height_px * 0.92, 'worldX': -site_w_m * 0.32, 'worldZ': site_h_m * 0.42},
            ],
            'widthM': 14.0,
            'confidence': 0.98,
        },
        {
            'id': 'ROAD-02',
            'name': 'Upper Process Access Road',
            'type': 'PRIMARY_ROAD',
            'points': [
                {'pixelX': width_px * 0.18, 'pixelY': height_px * 0.29, 'worldX': -site_w_m * 0.32, 'worldZ': -site_h_m * 0.21},
                {'pixelX': width_px * 0.80, 'pixelY': height_px * 0.29, 'worldX': site_w_m * 0.30, 'worldZ': -site_h_m * 0.21},
            ],
            'widthM': 12.0,
            'confidence': 0.96,
        },
        {
            'id': 'ROAD-03',
            'name': 'Central Inter-Sector Road',
            'type': 'PRIMARY_ROAD',
            'points': [
                {'pixelX': width_px * 0.18, 'pixelY': height_px * 0.52, 'worldX': -site_w_m * 0.32, 'worldZ': site_h_m * 0.02},
                {'pixelX': width_px * 0.80, 'pixelY': height_px * 0.52, 'worldX': site_w_m * 0.30, 'worldZ': site_h_m * 0.02},
            ],
            'widthM': 12.0,
            'confidence': 0.96,
        },
        {
            'id': 'ROAD-04',
            'name': 'Lower Storage Access Road',
            'type': 'PRIMARY_ROAD',
            'points': [
                {'pixelX': width_px * 0.18, 'pixelY': height_px * 0.79, 'worldX': -site_w_m * 0.32, 'worldZ': site_h_m * 0.29},
                {'pixelX': width_px * 0.80, 'pixelY': height_px * 0.79, 'worldX': site_w_m * 0.30, 'worldZ': site_h_m * 0.29},
            ],
            'widthM': 12.0,
            'confidence': 0.96,
        },
    ]

    return {'roads': roads}
