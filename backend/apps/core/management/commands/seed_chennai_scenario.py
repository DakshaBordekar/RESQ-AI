from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.incidents.models import Incident
from apps.incidents.services.priority_engine import PriorityEngine
from apps.resources.models import Resource
from apps.hospitals.models import Hospital
from apps.routing.models import RoadNode, RoadSegment
from apps.optimization.models import Dispatch
from apps.simulation.models import SimulationScenario, SimulationEvent

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds the deterministic master Chennai Disaster scenario (Operation Chennai Deluge 2026).'

    def handle(self, *args, **options):
        self.stdout.write("Resetting and seeding master Chennai disaster scenario...")

        # Clear existing operational records
        Dispatch.objects.all().delete()
        SimulationEvent.objects.all().delete()
        SimulationScenario.objects.all().delete()
        Incident.objects.all().delete()
        Resource.objects.all().delete()
        Hospital.objects.all().delete()
        RoadSegment.objects.all().delete()
        RoadNode.objects.all().delete()

        # 1. Seed Users
        if not User.objects.filter(username='coordinator_rajesh').exists():
            User.objects.create_user(
                username='coordinator_rajesh',
                email='rajesh.kumar@chennai-eoc.gov.in',
                password='resqpassword2026',
                role=User.Role.COORDINATOR,
                badge_number='EOC-CMD-01',
                department='Chief Emergency Command'
            )
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser(
                username='admin',
                email='admin@resq-ai.internal',
                password='adminpassword2026'
            )
        self.stdout.write("✓ Seeded Command Users.")

        # 2. Seed Road Network Nodes (Chennai Intersections)
        nodes_data = [
            (1, "Chennai Central", 13.0827, 80.2755),
            (2, "Marina Beach Junction", 13.0500, 80.2824),
            (3, "Mylapore Luz Corner", 13.0334, 80.2680),
            (4, "Adyar Bridge North", 13.0060, 80.2570),
            (5, "Adyar Bridge South", 12.9980, 80.2560),
            (6, "Saidapet Bridge Junction", 13.0205, 80.2230),
            (7, "Guindy Kathipara Junction", 13.0067, 80.2025),
            (8, "Velachery Main Junction", 12.9815, 80.2180),
            (9, "T. Nagar Panagal Park", 13.0400, 80.2330),
            (10, "Anna Nagar Roundtana", 13.0850, 80.2120),
            (11, "Koyambedu Junction", 13.0690, 80.1940),
            (12, "Tambaram GST Hub", 12.9249, 80.1260),
        ]
        created_nodes = {}
        for idx, name, lat, lon in nodes_data:
            created_nodes[idx] = RoadNode.objects.create(node_index=idx, name=name, latitude=lat, longitude=lon)
        self.stdout.write(f"✓ Seeded {len(created_nodes)} Road Network Intersections.")

        # 3. Seed Road Network Segments
        segments_data = [
            (1, 2, "Poonamallee / Kamarajar Salai", 3.8, 45.0),
            (2, 3, "Santhome High Road", 2.2, 40.0),
            (3, 4, "R.K. Mutt Road", 3.1, 35.0),
            (4, 5, "Adyar Bridge Arterial Crossing", 0.9, 30.0),
            (5, 8, "Besant Avenue to Velachery", 4.2, 40.0),
            (1, 9, "Anna Salai (Central to T. Nagar)", 5.5, 50.0),
            (9, 6, "Anna Salai (T. Nagar to Saidapet)", 2.4, 45.0),
            (6, 7, "Anna Salai (Saidapet to Guindy)", 2.0, 45.0),
            (7, 8, "Inner Ring Road (Guindy to Velachery)", 3.6, 40.0),
            (1, 10, "P.H. Road to Anna Nagar", 6.2, 50.0),
            (10, 11, "Inner Ring Road (Anna Nagar to Koyambedu)", 2.5, 45.0),
            (11, 7, "100 Feet Road (Koyambedu to Guindy)", 7.1, 55.0),
            (7, 12, "GST Road (Guindy to Tambaram)", 11.0, 60.0),
            (6, 4, "Chamiers / Kotturpuram Corridor", 3.0, 35.0),
            (9, 3, "Alwarpet / Eldams Road Link", 2.8, 30.0),
        ]
        for u, v, name, length, speed in segments_data:
            RoadSegment.objects.create(
                source_node=created_nodes[u],
                target_node=created_nodes[v],
                name=name,
                length_km=length,
                base_speed_kmh=speed,
                status=RoadSegment.Status.CLEAR,
                is_two_way=True
            )
        self.stdout.write(f"✓ Seeded {len(segments_data)} Road Segments.")

        # 4. Seed Chennai Regional Hospitals
        hospitals_data = [
            ("Apollo Hospital Greams Road", "21 Greams Lane, Thousand Lights", 13.0600, 80.2510, 250, 45, 40, 12, True, True, True),
            ("Rajiv Gandhi Govt General Hospital", "EVR Periyar Salai, Park Town", 13.0815, 80.2780, 500, 80, 60, 18, True, False, True),
            ("MIOT International", "4/112 Mount Poonamallee Rd, Manapakkam", 13.0245, 80.1780, 200, 35, 30, 8, True, True, False),
            ("Fortis Malar Hospital", "Gandhi Nagar, Adyar", 13.0070, 80.2580, 150, 22, 20, 5, True, False, True),
            ("Kauvery Hospital", "81 TTK Road, Alwarpet", 13.0350, 80.2520, 180, 28, 25, 6, True, False, True),
            ("Government Stanley Medical College", "Old Jail Rd, Royapuram", 13.1070, 80.2880, 350, 60, 45, 14, True, False, False),
            ("Sri Ramachandra Medical Center", "Porur", 13.0380, 80.1420, 300, 50, 35, 10, True, True, True),
            ("Chettinad Super Speciality Hospital", "OMR Kelambakkam", 12.8250, 80.2200, 220, 40, 25, 9, True, False, True),
        ]
        for name, addr, lat, lon, tb, ab, ti, ai, tb_bay, burn, pedia in hospitals_data:
            Hospital.objects.create(
                name=name, address=addr, latitude=lat, longitude=lon,
                total_beds=tb, available_beds=ab, total_icu=ti, available_icu=ai,
                has_trauma_bay=tb_bay, has_burn_unit=burn, has_pediatric=pedia,
                status=Hospital.Status.ACCEPTING
            )
        self.stdout.write(f"✓ Seeded {len(hospitals_data)} Hospitals.")

        # 5. Seed Emergency Fleet (Ambulances, Rescue Boats, Tactical NDRF)
        resources_data = [
            ("Ambulance A-01 (ALS)", "AMB-01", Resource.ResourceType.AMBULANCE_ALS, 13.0620, 80.2540, 2, ["ALS", "VENTILATOR", "OXYGEN", "PARAMEDIC"]),
            ("Ambulance A-02 (ALS)", "AMB-02", Resource.ResourceType.AMBULANCE_ALS, 13.0800, 80.2760, 2, ["ALS", "VENTILATOR", "OXYGEN", "DEFIBRILLATOR"]),
            ("Ambulance A-03 (BLS)", "AMB-03", Resource.ResourceType.AMBULANCE_BLS, 13.0360, 80.2650, 3, ["BLS", "OXYGEN", "FIRST_AID"]),
            ("Ambulance A-04 (BLS)", "AMB-04", Resource.ResourceType.AMBULANCE_BLS, 13.0090, 80.2050, 3, ["BLS", "OXYGEN", "FIRST_AID"]),
            ("Ambulance A-05 (ALS)", "AMB-05", Resource.ResourceType.AMBULANCE_ALS, 12.9830, 80.2190, 2, ["ALS", "OXYGEN", "PARAMEDIC"]),
            ("Ambulance A-06 (BLS)", "AMB-06", Resource.ResourceType.AMBULANCE_BLS, 13.0860, 80.2140, 3, ["BLS", "OXYGEN"]),
            ("Rescue Boat RB-01 (Inflatable)", "BOAT-01", Resource.ResourceType.RESCUE_BOAT, 12.9810, 80.2220, 6, ["WATER_RESCUE", "SHALLOW_DRAFT", "LIFE_JACKETS"]),
            ("Rescue Boat RB-02 (Inflatable)", "BOAT-02", Resource.ResourceType.RESCUE_BOAT, 13.0030, 80.2580, 6, ["WATER_RESCUE", "SHALLOW_DRAFT", "LIFE_JACKETS"]),
            ("Rescue Boat RB-03 (Motorized)", "BOAT-03", Resource.ResourceType.RESCUE_BOAT, 13.0190, 80.2240, 8, ["WATER_RESCUE", "HEAVY_TOW", "FLOOD_EXTRACTION"]),
            ("Rescue Boat RB-04 (Inflatable)", "BOAT-04", Resource.ResourceType.RESCUE_BOAT, 13.0480, 80.2800, 6, ["WATER_RESCUE", "LIFE_JACKETS"]),
            ("NDRF Tactical Team Alpha", "NDRF-T1", Resource.ResourceType.NDRF_TEAM, 13.0050, 80.2010, 10, ["WATER_RESCUE", "HEAVY_LIFT", "COLLAPSE_SEARCH", "PARAMEDIC"]),
            ("NDRF Tactical Team Bravo", "NDRF-T2", Resource.ResourceType.NDRF_TEAM, 13.0830, 80.2740, 10, ["WATER_RESCUE", "HEAVY_LIFT", "AERIAL_STAGING"]),
        ]
        for name, sign, rtype, lat, lon, cap, caps in resources_data:
            Resource.objects.create(
                name=name, call_sign=sign, type=rtype,
                status=Resource.Status.AVAILABLE,
                latitude=lat, longitude=lon, capacity=cap, capabilities=caps
            )
        self.stdout.write(f"✓ Seeded {len(resources_data)} Emergency Fleet Assets.")

        # 6. Seed Master Disaster Incidents
        incidents_data = [
            {
                'title': '3 Senior Citizens Trapped on Terrace, Water Level 5ft',
                'raw_text': 'Elderly grandmother and 2 others trapped on terrace in Velachery, water rising rapidly over 5 feet.',
                'location_name': 'Velachery Lake Sector East',
                'latitude': 12.9780, 'longitude': 80.2225,
                'hazard_type': Incident.HazardType.FLOOD,
                'people_affected': 3, 'vulnerable_people': 3,
                'vulnerability_flags': ['ELDERLY', 'DIALYSIS'],
                'medical_need': True, 'mobility_status': 'TRAPPED', 'urgency': 'IMMEDIATE',
                'status': Incident.Status.TRIAGED
            },
            {
                'title': 'Dialysis Patient in Respiratory Crisis',
                'raw_text': 'Critical dialysis patient without power, difficulty breathing near Saidapet canal.',
                'location_name': 'Saidapet Canal Bank Road',
                'latitude': 13.0195, 'longitude': 80.2240,
                'hazard_type': Incident.HazardType.MEDICAL,
                'people_affected': 1, 'vulnerable_people': 1,
                'vulnerability_flags': ['DIALYSIS', 'ELDERLY'],
                'medical_need': True, 'mobility_status': 'LIMITED', 'urgency': 'IMMEDIATE',
                'status': Incident.Status.TRIAGED
            },
            {
                'title': 'School Van Submerged in Railway Underpass',
                'raw_text': 'School transit van stalled in 4ft water at Guindy underpass with 7 children.',
                'location_name': 'Guindy Railway Underpass',
                'latitude': 13.0075, 'longitude': 80.2070,
                'hazard_type': Incident.HazardType.FLOOD,
                'people_affected': 8, 'vulnerable_people': 7,
                'vulnerability_flags': ['INFANT'],
                'medical_need': False, 'mobility_status': 'TRAPPED', 'urgency': 'IMMEDIATE',
                'status': Incident.Status.TRIAGED
            },
            {
                'title': 'Transformer Flash Fire near Adyar Crossing',
                'raw_text': 'Flooded electrical transformer sparking with visible smoke and fire.',
                'location_name': 'Adyar Bridge South Junction',
                'latitude': 12.9990, 'longitude': 80.2550,
                'hazard_type': Incident.HazardType.FIRE,
                'people_affected': 4, 'vulnerable_people': 0,
                'vulnerability_flags': [],
                'medical_need': False, 'mobility_status': 'AMBULATORY', 'urgency': 'URGENT',
                'status': Incident.Status.TRIAGED
            },
            {
                'title': 'Old Building Wall Collapse in Mylapore',
                'raw_text': 'Partial brick wall collapse on residential hut, 2 people lightly injured.',
                'location_name': 'Mylapore Tank Street',
                'latitude': 13.0340, 'longitude': 80.2660,
                'hazard_type': Incident.HazardType.STRUCTURAL,
                'people_affected': 5, 'vulnerable_people': 1,
                'vulnerability_flags': ['ELDERLY'],
                'medical_need': True, 'mobility_status': 'LIMITED', 'urgency': 'URGENT',
                'status': Incident.Status.TRIAGED
            },
            {
                'title': 'Community Shelter Food Shortage',
                'raw_text': 'Shelter on first floor with 20 people needs food packets and drinking water.',
                'location_name': 'T. Nagar Community Hall',
                'latitude': 13.0410, 'longitude': 80.2310,
                'hazard_type': Incident.HazardType.FLOOD,
                'people_affected': 20, 'vulnerable_people': 4,
                'vulnerability_flags': ['ELDERLY', 'INFANT'],
                'medical_need': False, 'mobility_status': 'AMBULATORY', 'urgency': 'MODERATE',
                'status': Incident.Status.TRIAGED
            },
            {
                'title': 'Pregnant Woman in Active Labor in Flooded House',
                'raw_text': 'Pregnant woman needs immediate evacuation to maternity hospital from Adyar.',
                'location_name': 'Adyar Gandhi Nagar',
                'latitude': 13.0050, 'longitude': 80.2530,
                'hazard_type': Incident.HazardType.MEDICAL,
                'people_affected': 2, 'vulnerable_people': 2,
                'vulnerability_flags': ['PREGNANT', 'INFANT'],
                'medical_need': True, 'mobility_status': 'LIMITED', 'urgency': 'IMMEDIATE',
                'status': Incident.Status.TRIAGED
            },
            {
                'title': 'Submerged Ground Floor Apartments',
                'raw_text': '6 families stranded as water entered ground floor homes up to waist height.',
                'location_name': 'Velachery 100 Feet Bypass Road',
                'latitude': 12.9840, 'longitude': 80.2160,
                'hazard_type': Incident.HazardType.FLOOD,
                'people_affected': 14, 'vulnerable_people': 3,
                'vulnerability_flags': ['ELDERLY'],
                'medical_need': False, 'mobility_status': 'LIMITED', 'urgency': 'URGENT',
                'status': Incident.Status.TRIAGED
            }
        ]
        for inc_dict in incidents_data:
            inc = Incident.objects.create(**inc_dict)
            score, tier = PriorityEngine.calculate_score(inc)
            inc.calculated_priority = score
            inc.priority_tier = tier
            inc.save()
        self.stdout.write(f"✓ Seeded {len(incidents_data)} Initial Emergency Incidents.")

        # 7. Seed Active Simulation Scenario
        SimulationScenario.objects.create(
            name='Operation Chennai Deluge 2026',
            description='Severe urban monsoonal deluge with storm surge along Adyar and Cooum river basins.',
            tick_minutes=0,
            is_active=True,
            weather_condition='TORRENTIAL_MONSOON'
        )
        self.stdout.write("✓ Initialized Active Simulation Scenario.")
        self.stdout.write(self.style.SUCCESS("★ Successfully seeded master Chennai scenario. System is 100% demo-ready."))
