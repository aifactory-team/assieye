import { ScatterplotLayer, IconLayer } from '@deck.gl/layers';
import type { WeatherStation } from '@/types';

/**
 * Wind-speed color ramp:
 *   < 5 m/s  → green
 *   5–10     → yellow
 *   10–15    → orange
 *   > 15     → red
 */
function windColor(windSpeed: number): [number, number, number, number] {
  if (windSpeed < 5) return [0, 200, 80, 200];
  if (windSpeed < 10) return [255, 220, 0, 200];
  if (windSpeed < 15) return [255, 136, 0, 210];
  return [220, 30, 0, 220];
}

// Simple arrow SVG pointing up (north = 0°), rotated by windDirection via getAngle
const ARROW_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><polygon points="16,2 26,28 16,22 6,28" fill="white"/></svg>`;
const ARROW_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(ARROW_SVG)}`;

const ICON_MAPPING = {
  arrow: { x: 0, y: 0, width: 32, height: 32, mask: true },
};

export function createWeatherIconLayer(stations: WeatherStation[]): [ScatterplotLayer, IconLayer] {
  const dotLayer = new ScatterplotLayer<WeatherStation>({
    id: 'weather-stations-dot',
    data: stations,
    getPosition: (d) => [d.lng, d.lat],
    getRadius: 4000,
    getFillColor: (d) => windColor(d.windSpeed),
    radiusMinPixels: 4,
    radiusMaxPixels: 14,
    pickable: true,
  });

  const arrowLayer = new IconLayer<WeatherStation>({
    id: 'weather-stations-arrow',
    data: stations,
    iconAtlas: ARROW_URL,
    iconMapping: ICON_MAPPING,
    getIcon: () => 'arrow',
    getPosition: (d) => [d.lng, d.lat],
    getSize: (d) => Math.max(16, Math.min(40, d.windSpeed * 3)),
    getColor: (d) => windColor(d.windSpeed),
    // deck.gl getAngle: clockwise degrees from north; wind direction is already
    // meteorological (degrees from north, clockwise), so pass directly.
    getAngle: (d) => d.windDirection,
    pickable: false,
  });

  return [dotLayer, arrowLayer];
}
