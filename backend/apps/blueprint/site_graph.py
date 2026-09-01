def build_normalized_site_graph(
    site_name: str,
    width_px: int,
    height_px: int,
    classified_assets: list,
    roads: list,
    gates: list,
    pixels_per_meter: float = 3.5,
    warnings: list = None
) -> dict:
    """
    Assembles the canonical normalized site graph bridging perception to the 3D twin & simulation.
    """
    ppm = max(0.1, pixels_per_meter)
    site_w_m = round(width_px / ppm, 1)
    site_h_m = round(height_px / ppm, 1)

    assets_out = []
    buildings_out = []
    pipe_racks_out = []
    assembly_points_out = []
    restricted_areas_out = []

    type_counts = {}

    for item in classified_assets:
        c_type = item['canonicalClass']
        count = type_counts.get(c_type, 0) + 1
        type_counts[c_type] = count

        # Generate deterministic prefix
        prefix_map = {
            'LPG_SPHERE': 'TK-LPG',
            'LPG_BULLET': 'TK-BULLET',
            'STORAGE_TANK': 'TK-STORAGE',
            'FIRE_WATER_TANK': 'FW',
            'FLARE_STACK': 'STACK',
            'CONTROL_ROOM': 'CR',
            'WAREHOUSE': 'WH',
            'MAINTENANCE_SHOP': 'MS',
            'PUMP_HOUSE': 'PH',
            'FIRE_PUMP_HOUSE': 'FPH',
            'PROCESS_AREA': 'PROC',
            'PIPE_RACK': 'RACK',
            'COOLING_TOWER': 'CT',
            'ELECTRICAL_SUBSTATION': 'ES',
            'ASSEMBLY_POINT': 'AP',
            'LOADING_BAY': 'BAY',
        }
        prefix = prefix_map.get(c_type, 'BLDG')
        asset_id = item.get('id') or f"{prefix}-{count:02d}"

        # 2D to 3D centered coordinate transform (meters)
        cx_px = item['center']['x']
        cy_px = item['center']['y']
        world_x = round((cx_px - width_px / 2.0) / ppm, 2)
        world_z = round((cy_px - height_px / 2.0) / ppm, 2)

        bw_px = item['bbox']['width']
        bh_px = item['bbox']['height']
        dim_w_m = round(max(2.0, bw_px / ppm), 1)
        dim_d_m = round(max(2.0, bh_px / ppm), 1)
        
        # Elevation profile
        dim_h_m = 14.0 if c_type == 'LPG_SPHERE' else 6.5 if c_type == 'LPG_BULLET' else 15.0 if c_type == 'STORAGE_TANK' else 8.0
        elev_y_m = 9.5 if c_type == 'LPG_SPHERE' else 3.25 if c_type == 'LPG_BULLET' else 7.5 if c_type == 'STORAGE_TANK' else 4.0

        asset_entry = {
            'id': asset_id,
            'name': item.get('name') or f"{c_type.replace('_', ' ')} #{asset_id}",
            'type': c_type,
            'category': item.get('category', 'UNKNOWN'),
            'pixelPos': {'x': round(cx_px, 1), 'y': round(cy_px, 1)},
            'pixelDimensions': {'width': round(bw_px, 1), 'height': round(bh_px, 1)},
            'worldPos': {'x': world_x, 'y': elev_y_m, 'z': world_z},
            'worldDimensions': {'width': dim_w_m, 'depth': dim_d_m, 'height': dim_h_m},
            'rotationDeg': 0,
            'rawPrediction': item.get('rawPrediction', item.get('type', 'UNKNOWN_ASSET')),
            'humanVerifiedClass': item.get('humanVerifiedClass', item.get('canonicalClass', item.get('type', 'UNKNOWN_ASSET'))),
            'confidence': item['confidence'],
            'confidenceTier': item['confidenceTier'],
            'evidence': item['evidence'],
            'associatedText': item.get('associatedText', ''),
            'source': item.get('source', 'ai_vision'),
            'hazardMetadata': item['hazardMetadata'],
            'simulationEnabled': item['hazardMetadata'].get('simulationEnabled', False),
            'confirmed': item['confidence'] >= 0.85,
            'verified': False,
        }

        if 'BUILDING' in c_type or c_type in ['CONTROL_ROOM', 'WAREHOUSE', 'MAINTENANCE_SHOP', 'PUMP_HOUSE', 'FIRE_PUMP_HOUSE', 'ELECTRICAL_SUBSTATION']:
            buildings_out.append(asset_entry)
        elif c_type == 'PIPE_RACK':
            pipe_racks_out.append(asset_entry)
        elif c_type == 'ASSEMBLY_POINT':
            assembly_points_out.append(asset_entry)

        assets_out.append(asset_entry)

    high_conf = len([a for a in assets_out if a['confidenceTier'] == 'HIGH'])
    med_conf = len([a for a in assets_out if a['confidenceTier'] == 'MEDIUM'])
    low_conf = len([a for a in assets_out if a['confidenceTier'] == 'LOW'])

    return {
        'site': {
            'name': site_name,
            'blueprintWidthPx': width_px,
            'blueprintHeightPx': height_px,
            'realWorldWidthM': site_w_m,
            'realWorldHeightM': site_h_m,
            'pixelsPerMeter': ppm,
            'scaleConfidence': 0.94,
            'northAngleDeg': 0,
        },
        'summary': {
            'totalAssets': len(assets_out),
            'hazardousAssetsCount': len([a for a in assets_out if a['simulationEnabled']]),
            'buildingsCount': len(buildings_out),
            'roadsCount': len(roads),
            'gatesCount': len(gates),
            'highConfidenceCount': high_conf,
            'mediumConfidenceCount': med_conf,
            'lowConfidenceCount': low_conf,
            'layoutConfidencePct': round(((high_conf * 1.0 + med_conf * 0.75 + low_conf * 0.4) / max(1, len(assets_out))) * 100),
        },
        'assets': assets_out,
        'buildings': buildings_out,
        'roads': roads,
        'gates': gates,
        'pipeRacks': pipe_racks_out,
        'assemblyPoints': assembly_points_out,
        'restrictedAreas': restricted_areas_out,
        'warnings': warnings or [],
    }
