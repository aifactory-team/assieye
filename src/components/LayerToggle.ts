import { h } from '@/utils/dom-utils';
import { t } from '@/services/i18n';
import type { MapLayers } from '@/types';

export interface LayerToggleOptions {
  layers: MapLayers;
  onLayerChange: (layers: MapLayers) => void;
}

export class LayerToggle {
  private readonly el: HTMLElement;
  private layers: MapLayers;
  private readonly onLayerChange: (layers: MapLayers) => void;
  private checkboxes: Map<string, HTMLInputElement> = new Map();

  constructor(options: LayerToggleOptions) {
    this.layers = { ...options.layers };
    this.onLayerChange = options.onLayerChange;

    const firesCheck = this.createCheckbox('fires', t('map.fires'), this.layers.fires);
    const weatherCheck = this.createCheckbox('weather', t('map.weather'), this.layers.weather);
    const dwiCheck = this.createCheckbox('dwi', t('map.dwi'), this.layers.dwi);
    const satCheck = this.createCheckbox('satellites', t('map.satellites'), this.layers.satellites);
    const flightsCheck = this.createCheckbox('flights', t('map.flights'), this.layers.flights);
    const cctvCheck = this.createCheckbox('cctv', 'CCTV', this.layers.cctv);
    const buildingsCheck = this.createCheckbox('buildings', '3D 건물', this.layers.buildings);

    const label = h('span', { className: 'layer-toggle-label' }, t('map.layers'));

    this.el = h('div', { className: 'layer-toggle' }, label, firesCheck, weatherCheck, dwiCheck, satCheck, flightsCheck, cctvCheck, buildingsCheck);
  }

  private createCheckbox(key: keyof MapLayers, label: string, checked: boolean): HTMLElement {
    const input = h('input', {
      type: 'checkbox',
      checked: checked || undefined,
      onChange: (e: Event) => {
        const target = e.target as HTMLInputElement;
        this.layers = { ...this.layers, [key]: target.checked };
        this.onLayerChange({ ...this.layers });
      },
    }) as HTMLInputElement;

    // Set checked imperatively since the h() helper uses setAttribute
    if (checked) input.checked = true;

    this.checkboxes.set(key, input);

    return h('label', { className: 'layer-toggle-item' }, input, label);
  }

  resetLayers(layers: Record<string, boolean>): void {
    this.layers = { ...this.layers, ...layers } as MapLayers;
    for (const [key, input] of this.checkboxes) {
      if (key in layers) {
        input.checked = !!layers[key];
      }
    }
    this.onLayerChange({ ...this.layers });
  }

  getElement(): HTMLElement {
    return this.el;
  }

  destroy(): void {
    this.el.remove();
  }
}
