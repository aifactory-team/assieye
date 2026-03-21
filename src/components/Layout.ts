import { h } from '@/utils/dom-utils';
import { Header } from './Header';
import { MapContainer } from './MapContainer';

export class Layout {
  private readonly el: HTMLElement;
  readonly header: Header;
  readonly mapContainer: MapContainer;
  readonly panelsLeft: HTMLElement;
  readonly panelsRight: HTMLElement;
  readonly panelsBottom: HTMLElement;
  /** @deprecated use panelsLeft/panelsRight/panelsBottom */
  readonly panelsGrid: HTMLElement;

  constructor() {
    this.header = new Header();
    this.mapContainer = new MapContainer();
    this.panelsLeft = h('div', { className: 'panels-left' });
    this.panelsRight = h('div', { className: 'panels-right' });
    this.panelsBottom = h('div', { className: 'panels-bottom' });
    this.panelsGrid = this.panelsLeft; // backward compat

    this.el = h(
      'div',
      { className: 'app-layout' },
      this.mapContainer.getElement(),
      h('div', { className: 'overlay-ui' },
        this.header.getElement(),
        this.panelsLeft,
        this.panelsRight,
        this.panelsBottom,
      ),
    );
  }

  getElement(): HTMLElement {
    return this.el;
  }

  destroy(): void {
    this.mapContainer.destroy();
    this.header.destroy();
    this.el.remove();
  }
}
