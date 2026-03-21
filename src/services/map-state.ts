import { KOREA_CENTER, FLAT_MAP_ZOOM, STORAGE_KEYS } from '@/config/constants';
import { loadFromStorage, saveToStorage } from '@/utils/storage';

export type MapMode = 'globe' | 'flat';

interface MapState {
  center: { lat: number; lng: number };
  zoom: number;
  mode: MapMode;
}

const DEFAULT_STATE: MapState = {
  center: { ...KOREA_CENTER },
  zoom: FLAT_MAP_ZOOM,
  mode: 'flat',
};

let state: MapState = loadMapState();

function loadMapState(): MapState {
  const savedMode = loadFromStorage<MapMode>(STORAGE_KEYS.mapMode, DEFAULT_STATE.mode);
  return {
    center: { ...DEFAULT_STATE.center },
    zoom: DEFAULT_STATE.zoom,
    mode: savedMode,
  };
}

export function saveMapState(): void {
  saveToStorage(STORAGE_KEYS.mapMode, state.mode);
}

export function getCenter(): { lat: number; lng: number } {
  return { ...state.center };
}

export function setCenter(lat: number, lng: number): void {
  state.center = { lat, lng };
}

export function getZoom(): number {
  return state.zoom;
}

export function setZoom(zoom: number): void {
  state.zoom = zoom;
}

export function getMapMode(): MapMode {
  return state.mode;
}

export function setMapMode(mode: MapMode): void {
  state.mode = mode;
  saveMapState();
}

export function resetMapState(): void {
  state = { ...DEFAULT_STATE, center: { ...DEFAULT_STATE.center } };
  saveMapState();
}
