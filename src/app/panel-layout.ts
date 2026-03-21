import type { AppModule } from '@/types';
import type { Panel } from '@/components/Panel';
import { h } from '@/utils/dom-utils';
import type { AppContext } from './app-context';

export class PanelLayoutManager implements AppModule {
  private readonly ctx: AppContext;
  private readonly gridEl: HTMLElement;
  private readonly panels = new Map<string, Panel>();

  constructor(ctx: AppContext) {
    this.ctx = ctx;
    this.gridEl = h('div', { className: 'panels-grid' });
  }

  init(): void {
    this.ctx.container.appendChild(this.gridEl);
  }

  addPanel(panel: Panel): void {
    this.panels.set(panel.id, panel);
    this.gridEl.appendChild(panel.getElement());
  }

  removePanel(id: string): void {
    const panel = this.panels.get(id);
    if (panel) {
      panel.destroy();
      this.panels.delete(id);
    }
  }

  getPanel(id: string): Panel | undefined {
    return this.panels.get(id);
  }

  getGridElement(): HTMLElement {
    return this.gridEl;
  }

  destroy(): void {
    for (const panel of this.panels.values()) {
      panel.destroy();
    }
    this.panels.clear();
    this.gridEl.remove();
  }
}
