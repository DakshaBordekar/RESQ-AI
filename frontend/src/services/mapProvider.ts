export interface MapTileProviderConfig {
  name: string;
  url: string;
  attribution: string;
  maxZoom: number;
  subdomains?: string[];
}

/**
 * Standard OpenStreetMap Tile Provider
 * Endpoint: https://tile.openstreetmap.org/{z}/{x}/{y}.png
 * 
 * CRITICAL ARCHITECTURAL NOTE:
 * Standard OpenStreetMap tile access does NOT require any API key.
 * OPENSTREETMAP_API_KEY IS NOT REQUIRED.
 */
export const OPENSTREETMAP_PROVIDER: MapTileProviderConfig = {
  name: 'OpenStreetMap',
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
  maxZoom: 19,
};

export const getActiveMapTileProvider = (): MapTileProviderConfig => {
  const customUrl = import.meta.env.VITE_MAP_TILE_URL;
  if (customUrl) {
    return {
      name: 'Custom Map Provider',
      url: customUrl,
      attribution: import.meta.env.VITE_MAP_ATTRIBUTION || '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    };
  }
  return OPENSTREETMAP_PROVIDER;
};
