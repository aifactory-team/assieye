import { h, replaceChildren, safeHtml } from '@/utils/dom-utils';
import { t } from '@/services/i18n';

export interface PanelOptions {
  id: string;
  title: string;
  showCount?: boolean;
  className?: string;
  infoTooltip?: string;
}

export class Panel {
  protected readonly el: HTMLElement;
  protected readonly contentEl: HTMLElement;
  protected readonly headerEl: HTMLElement;
  private countEl: HTMLElement | null = null;
  private badgeEl: HTMLElement | null = null;
  private collapsed = false;
  readonly id: string;

  constructor(options: PanelOptions) {
    this.id = options.id;

    this.contentEl = h('div', { className: 'panel-content' });

    const titleEl = h('span', { className: 'panel-title' }, options.title);

    const collapseBtn = h('span', { className: 'panel-collapse-btn', title: '접기/펼치기' }, '\u25BC');
    collapseBtn.addEventListener('click', () => this.toggleCollapse());

    const headerChildren: (HTMLElement | null)[] = [titleEl];

    if (options.infoTooltip) {
      headerChildren.push(
        h('span', { className: 'panel-info', title: options.infoTooltip }, '?'),
      );
    }

    if (options.showCount) {
      this.countEl = h('span', { className: 'panel-count' }, '0');
      headerChildren.push(this.countEl);
    }

    headerChildren.push(collapseBtn);

    this.headerEl = h(
      'div',
      { className: 'panel-header' },
      ...headerChildren.filter(Boolean) as HTMLElement[],
    );

    this.headerEl.setAttribute('role', 'button');
    this.headerEl.setAttribute('aria-expanded', 'true');

    // Click header to collapse/expand
    this.headerEl.addEventListener('click', (e) => {
      // Don't toggle if clicking interactive elements inside header
      const target = e.target as HTMLElement;
      if (target.tagName === 'SELECT' || target.tagName === 'BUTTON' || target.tagName === 'INPUT') return;
      this.toggleCollapse();
    });

    const resizeHandle = h('div', { className: 'panel-resize-handle' });
    this.initResize(resizeHandle);

    const classNames = ['panel'];
    if (options.className) classNames.push(options.className);

    this.el = h(
      'div',
      { className: classNames.join(' '), dataset: { panelId: options.id } },
      this.headerEl,
      this.contentEl,
      resizeHandle,
    );
  }

  private toggleCollapse(): void {
    this.collapsed = !this.collapsed;
    this.el.classList.toggle('panel--collapsed', this.collapsed);
    this.headerEl.setAttribute('aria-expanded', String(!this.collapsed));
    const btn = this.headerEl.querySelector('.panel-collapse-btn');
    if (btn) btn.textContent = this.collapsed ? '\u25B6' : '\u25BC';
  }

  private initResize(handle: HTMLElement): void {
    let startY = 0;
    let startHeight = 0;

    const onMove = (e: MouseEvent) => {
      const delta = e.clientY - startY;
      const newHeight = Math.max(60, startHeight + delta);
      this.el.style.height = `${newHeight}px`;
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    handle.addEventListener('mousedown', (e: MouseEvent) => {
      e.preventDefault();
      startY = e.clientY;
      startHeight = this.el.getBoundingClientRect().height;
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  showLoading(): void {
    replaceChildren(
      this.contentEl,
      h('div', { className: 'panel-loading' }, t('common.loading')),
    );
  }

  showError(message?: string): void {
    replaceChildren(
      this.contentEl,
      h(
        'div',
        { className: 'error-message' },
        message ?? t('common.failedToLoad'),
      ),
    );
  }

  showConfigError(message: string): void {
    replaceChildren(
      this.contentEl,
      h('div', { className: 'error-message config-error' }, message),
    );
  }

  setContent(...children: (Node | string)[]): void {
    replaceChildren(this.contentEl, ...children);
  }

  setHtmlContent(html: string): void {
    replaceChildren(this.contentEl, safeHtml(html));
  }

  setCount(count: number): void {
    if (this.countEl) {
      this.countEl.textContent = String(count);
    }
  }

  setDataBadge(label: string, type: 'live' | 'cached' | 'error' = 'live'): void {
    if (!this.badgeEl) {
      this.badgeEl = h('span', { className: 'panel-badge' });
      this.headerEl.appendChild(this.badgeEl);
    }
    this.badgeEl.textContent = label;
    this.badgeEl.className = `panel-badge panel-badge--${type}`;
  }

  clearDataBadge(): void {
    if (this.badgeEl) {
      this.badgeEl.remove();
      this.badgeEl = null;
    }
  }

  getElement(): HTMLElement {
    return this.el;
  }

  destroy(): void {
    this.el.remove();
  }

  show(): void {
    this.el.style.display = '';
  }

  hide(): void {
    this.el.style.display = 'none';
  }

  toggle(visible?: boolean): void {
    if (visible === undefined) {
      this.el.style.display = this.el.style.display === 'none' ? '' : 'none';
    } else {
      this.el.style.display = visible ? '' : 'none';
    }
  }
}
