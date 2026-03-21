import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import type { DwiCell } from '@/types';

/**
 * Color ramp: green → yellow → orange → red → dark red
 */
const DWI_COLOR_RANGE: [number, number, number, number][] = [
  [0, 160, 60, 128],
  [255, 220, 0, 160],
  [255, 136, 0, 180],
  [220, 30, 0, 200],
  [100, 0, 0, 220],
];

export function createDwiHeatmapLayer(cells: DwiCell[]): HeatmapLayer {
  return new HeatmapLayer<DwiCell>({
    id: 'dwi-heatmap-layer',
    data: cells,
    getPosition: (d) => [d.lng, d.lat],
    getWeight: (d) => d.riskIndex,
    radiusPixels: 60,
    intensity: 1,
    threshold: 0.05,
    colorRange: DWI_COLOR_RANGE,
    opacity: 0.5,
  });
}
