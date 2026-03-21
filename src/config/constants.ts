export const KOREA_CENTER = { lat: 36.5, lng: 127.5 };

export const KOREA_BBOX = { west: 124, south: 33, east: 132, north: 43 };

export const GLOBE_ALTITUDE = 1.5;

export const FLAT_MAP_ZOOM = 6;

export const REFRESH_INTERVALS = {
  firms: 15 * 60 * 1000,
  weather: 60 * 60 * 1000,
  feeds: 30 * 60 * 1000,
  dwi: 24 * 60 * 60 * 1000,
  satellites: 60 * 60 * 1000,
  flights: 30 * 1000,
  youtube: 10 * 60 * 1000,
} as const;

export const STORAGE_KEYS = {
  mapMode: 'assieye-map-mode',
  mapLayers: 'assieye-map-layers',
  panelSpans: 'assieye-panel-spans',
} as const;
