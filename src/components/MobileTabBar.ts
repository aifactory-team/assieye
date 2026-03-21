import { h } from '@/utils/dom-utils';

export interface MobileTab {
  id: string;
  icon: string;
  label: string;
  badge?: number;
}

export class MobileTabBar {
  private readonly el: HTMLElement;
  private tabs: MobileTab[] = [];
  private activeId = '';
  private onSelect: (id: string) => void;

  constructor(onSelect: (id: string) => void) {
    this.onSelect = onSelect;
    this.el = h('nav', { className: 'mobile-tab-bar' });
  }

  setTabs(tabs: MobileTab[], activeId: string): void {
    this.tabs = tabs;
    this.activeId = activeId;
    this.render();
  }

  setActive(id: string): void {
    this.activeId = id;
    this.render();
  }

  updateBadge(id: string, count: number): void {
    const tab = this.tabs.find(t => t.id === id);
    if (tab) tab.badge = count;
    const badge = this.el.querySelector(`[data-tab="${id}"] .mobile-tab-badge`) as HTMLElement;
    if (badge) badge.textContent = count > 0 ? String(count) : '';
  }

  private render(): void {
    const buttons = this.tabs.map(tab => {
      const isActive = tab.id === this.activeId;
      const badge = tab.badge && tab.badge > 0
        ? h('span', { className: 'mobile-tab-badge' }, String(tab.badge))
        : h('span', { className: 'mobile-tab-badge' });

      const btn = h('button', {
        className: `mobile-tab${isActive ? ' active' : ''}`,
        dataset: { tab: tab.id },
      },
        h('span', { className: 'mobile-tab-icon' }, tab.icon),
        h('span', { className: 'mobile-tab-label' }, tab.label),
        badge,
      );

      btn.addEventListener('click', () => {
        this.activeId = tab.id;
        this.onSelect(tab.id);
        this.render();
      });

      return btn;
    });

    this.el.replaceChildren(...buttons);
  }

  getElement(): HTMLElement {
    return this.el;
  }

  destroy(): void {
    this.el.remove();
  }
}
