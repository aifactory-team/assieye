import type { FireHotspot } from '@/types';

export interface ScatterplotLayerProps {
  id: string;
  data: FireHotspot[];
  getPosition: (d: FireHotspot) => [number, number];
  getRadius: (d: FireHotspot) => number;
  getFillColor: (d: FireHotspot) => [number, number, number, number];
  radiusMinPixels: number;
  radiusMaxPixels: number;
  pickable: boolean;
  opacity: number;
}

function hotspotColor(
  confidence: FireHotspot['confidence'],
  brightness: number,
): [number, number, number, number] {
  // Brightness drives color gradient: 300K=yellow, 400K+=red
  const t = Math.min(Math.max((brightness - 300) / 100, 0), 1);
  const r = 255;
  const g = Math.round(200 * (1 - t));
  const b = 0;

  // Confidence drives alpha/opacity
  let alpha: number;
  switch (confidence) {
    case 'high':
      alpha = 200;
      break;
    case 'nominal':
      alpha = 180;
      break;
    case 'low':
    default:
      alpha = 150;
      break;
  }

  return [r, g, b, alpha];
}

function frpRadius(frp: number): number {
  const min = 200;
  const max = 2000;
  // Scale: frp 0 -> min, frp 100+ -> max (clamped)
  const clamped = Math.min(Math.max(frp, 0), 100);
  return min + (clamped / 100) * (max - min);
}

export function createFireScatterplotLayer(
  fires: FireHotspot[],
): ScatterplotLayerProps {
  return {
    id: 'fire-hotspots-layer',
    data: fires,
    getPosition: (d) => [d.lng, d.lat],
    getRadius: (d) => frpRadius(d.frp),
    getFillColor: (d) => hotspotColor(d.confidence, d.brightness),
    radiusMinPixels: 3,
    radiusMaxPixels: 30,
    pickable: true,
    opacity: 1,
  };
}
