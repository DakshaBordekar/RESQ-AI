import heapq
import math
from typing import Dict, List, Tuple, Optional
from apps.routing.models import RoadNode, RoadSegment

class DynamicGraphRouter:
    def __init__(self):
        self.nodes: Dict[int, Tuple[float, float, str]] = {} # node_idx -> (lat, lon, name)
        self.adj: Dict[int, List[dict]] = {} # node_idx -> list of outgoing edges
        self.reload_graph()

    def reload_graph(self):
        """Loads or reloads the road graph directly from PostgreSQL models."""
        self.nodes = {}
        self.adj = {}
        
        all_nodes = RoadNode.objects.all()
        for node in all_nodes:
            self.nodes[node.node_index] = (node.latitude, node.longitude, node.name)
            self.adj[node.node_index] = []

        all_segments = RoadSegment.objects.select_related('source_node', 'target_node').all()
        for seg in all_segments:
            u = seg.source_node.node_index
            v = seg.target_node.node_index
            
            # Edge weight in travel minutes
            weight = seg.traversal_time_minutes
            
            edge_data_forward = {
                'target': v,
                'weight': weight,
                'length_km': seg.length_km,
                'status': seg.status,
                'name': seg.name,
                'segment_id': str(seg.id)
            }
            if u in self.adj:
                self.adj[u].append(edge_data_forward)

            # If two-way, add reverse edge
            if seg.is_two_way and v in self.adj:
                edge_data_reverse = {
                    'target': u,
                    'weight': weight,
                    'length_km': seg.length_km,
                    'status': seg.status,
                    'name': seg.name,
                    'segment_id': str(seg.id)
                }
                self.adj[v].append(edge_data_reverse)

    def find_nearest_node(self, lat: float, lon: float) -> Optional[int]:
        """Finds closest graph node index to given GPS coordinates."""
        if not self.nodes:
            return None
        
        best_node = None
        min_dist = float('inf')
        for node_idx, (nlat, nlon, _) in self.nodes.items():
            dist = (nlat - lat)**2 + (nlon - lon)**2
            if dist < min_dist:
                min_dist = dist
                best_node = node_idx
        return best_node

    def calculate_route(
        self,
        origin_lat: float,
        origin_lon: float,
        dest_lat: float,
        dest_lon: float
    ) -> dict:
        """
        Computes shortest feasible path from origin to destination via in-memory Dijkstra.
        """
        self.reload_graph() # Ensure latest blockage state is reflected
        
        start_node = self.find_nearest_node(origin_lat, origin_lon)
        end_node = self.find_nearest_node(dest_lat, dest_lon)

        if start_node is None or end_node is None:
            # Fallback direct line
            return {
                'path_nodes': [],
                'coordinates': [[origin_lat, origin_lon], [dest_lat, dest_lon]],
                'distance_km': round(self._haversine_dist(origin_lat, origin_lon, dest_lat, dest_lon), 2),
                'eta_minutes': 15.0,
                'is_blocked': False,
                'is_unreachable': False,
            }

        # Run Dijkstra
        pq = [(0.0, start_node, [start_node])]
        visited = set()
        dist = {node: float('inf') for node in self.nodes}
        dist[start_node] = 0.0

        while pq:
            cost, u, path = heapq.heappop(pq)
            if u in visited:
                continue
            visited.add(u)

            if u == end_node:
                # Build coordinate polyline including exact origin and destination coordinates
                coords = [[origin_lat, origin_lon]]
                total_km = 0.0
                for node_idx in path:
                    nlat, nlon, _ = self.nodes[node_idx]
                    coords.append([nlat, nlon])
                coords.append([dest_lat, dest_lon])

                # Calculate total km
                for i in range(len(coords) - 1):
                    total_km += self._haversine_dist(coords[i][0], coords[i][1], coords[i+1][0], coords[i+1][1])

                return {
                    'path_nodes': path,
                    'coordinates': coords,
                    'distance_km': round(total_km, 2),
                    'eta_minutes': round(cost + 2.0, 1), # +2 mins for staging / turns
                    'is_blocked': False,
                    'is_unreachable': False,
                }

            for edge in self.adj.get(u, []):
                v = edge['target']
                weight = edge['weight']
                if weight != float('inf') and dist[u] + weight < dist[v]:
                    dist[v] = dist[u] + weight
                    heapq.heappush(pq, (dist[v], v, path + [v]))

        # Destination is unreachable due to blockages / islands
        return {
            'path_nodes': [],
            'coordinates': [[origin_lat, origin_lon], [dest_lat, dest_lon]],
            'distance_km': round(self._haversine_dist(origin_lat, origin_lon, dest_lat, dest_lon), 2),
            'eta_minutes': float('inf'),
            'is_blocked': True,
            'is_unreachable': True,
            'warning': 'Target location is unreachable by road network. Aerial or amphibious extraction required.'
        }

    @staticmethod
    def _haversine_dist(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        dlat = (lat2 - lat1) * 111.0
        dlon = (lon2 - lon1) * 111.0 * math.cos(math.radians((lat1 + lat2) / 2.0))
        return math.sqrt(dlat**2 + dlon**2)
