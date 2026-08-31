import time
import json
import logging
import urllib.request
from typing import Dict, Any
from django.conf import settings

logger = logging.getLogger(__name__)

class WeatherService:
    """Weather telemetry service supporting OpenWeatherMap API with automatic deterministic disaster fallback."""

    _cache: Dict[str, Any] = {}
    _cache_timestamp: float = 0.0
    CACHE_TTL_SECONDS: float = 120.0  # 2-minute memory cache

    @classmethod
    def get_current_weather(cls, lat: float = 13.0827, lon: float = 80.2707) -> Dict[str, Any]:
        """Fetches live meteorological telemetry for the disaster zone with seamless fallback."""
        current_time = time.time()
        if cls._cache and (current_time - cls._cache_timestamp < cls.CACHE_TTL_SECONDS):
            return cls._cache

        api_key = getattr(settings, 'WEATHER_API_KEY', '').strip()
        if api_key:
            try:
                url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}&units=metric"
                req = urllib.request.Request(url, headers={'User-Agent': 'RESQ-AI-Disaster-Platform/1.0'})
                with urllib.request.urlopen(req, timeout=3.5) as response:
                    if response.status == 200:
                        data = json.loads(response.read().decode())
                        weather_item = data.get('weather', [{}])[0]
                        main_data = data.get('main', {})
                        wind_data = data.get('wind', {})
                        rain_data = data.get('rain', {})

                        result = {
                            'provider': 'OpenWeatherMap (Live)',
                            'is_live': True,
                            'location': data.get('name', 'Chennai'),
                            'condition': weather_item.get('main', 'Monsoon'),
                            'description': weather_item.get('description', 'Heavy monsoonal rains').capitalize(),
                            'icon': weather_item.get('icon', '10d'),
                            'temperature_c': round(main_data.get('temp', 27.5), 1),
                            'humidity_pct': main_data.get('humidity', 88),
                            'wind_speed_kmh': round(wind_data.get('speed', 12.0) * 3.6, 1),
                            'rainfall_1h_mm': rain_data.get('1h', 24.5),
                            'pressure_hpa': main_data.get('pressure', 1004),
                            'timestamp': int(current_time)
                        }
                        cls._cache = result
                        cls._cache_timestamp = current_time
                        return result
            except Exception as e:
                logger.info(f"OpenWeatherMap live query unavailable ({e}), using resilient disaster telemetry fallback.")

        # Deterministic Disaster Scenario Telemetry (Operation Chennai Deluge)
        fallback_result = {
            'provider': 'Disaster Scenario Simulator (Baseline)',
            'is_live': False,
            'location': 'Chennai Central Command Sector',
            'condition': 'TORRENTIAL_MONSOON',
            'description': 'Severe monsoonal inundation & storm surge',
            'icon': '10d',
            'temperature_c': 26.8,
            'humidity_pct': 94,
            'wind_speed_kmh': 48.5,
            'rainfall_1h_mm': 42.0,
            'pressure_hpa': 996,
            'timestamp': int(current_time)
        }
        cls._cache = fallback_result
        cls._cache_timestamp = current_time
        return fallback_result
