import { h } from '@/utils/dom-utils';
import { t } from '@/services/i18n';
import type { MapMode } from '@/services/map-state';

export interface MapToolbarOptions {
  activeMode: MapMode;
  onToggle: (mode: MapMode) => void;
}

export class MapToolbar {
  private readonly el: HTMLElement;
  private globeBtn!: HTMLButtonElement;
  private flatBtn!: HTMLButtonElement;
  private activeMode: MapMode;
  private readonly onToggle: (mode: MapMode) => void;

  constructor(options: MapToolbarOptions) {
    this.activeMode = options.activeMode;
    this.onToggle = options.onToggle;

    this.globeBtn = h('button', {
      className: this.activeMode === 'globe' ? 'active' : '',
      onClick: () => this.setMode('globe'),
    }, t('map.globe')) as HTMLButtonElement;

    this.flatBtn = h('button', {
      className: this.activeMode === 'flat' ? 'active' : '',
      onClick: () => this.setMode('flat'),
    }, t('map.flat')) as HTMLButtonElement;

    this.el = h('div', { className: 'map-toolbar' }, this.globeBtn, this.flatBtn);
  }

  private setMode(mode: MapMode): void {
    if (mode === this.activeMode) return;
    this.activeMode = mode;
    this.globeBtn.className = mode === 'globe' ? 'active' : '';
    this.flatBtn.className = mode === 'flat' ? 'active' : '';
    this.onToggle(mode);
  }

  setActiveMode(mode: MapMode): void {
    this.activeMode = mode;
    this.globeBtn.className = mode === 'globe' ? 'active' : '';
    this.flatBtn.className = mode === 'flat' ? 'active' : '';
  }

  getElement(): HTMLElement {
    return this.el;
  }

  destroy(): void {
    this.el.remove();
  }
}
