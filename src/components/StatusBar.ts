import { h } from '@/utils/dom-utils';
import { t } from '@/services/i18n';

interface StatusBarData {
  fireCount: number;
  firmsRefreshedAt?: string;
  weatherRefreshedAt?: string;
  feedsRefreshedAt?: string;
}

function formatTime(iso?: string): string {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export class StatusBar {
  private readonly el: HTMLElement;
  private dotEl: HTMLElement;
  private firmsTimeEl: HTMLElement;
  private weatherTimeEl: HTMLElement;
  private feedsTimeEl: HTMLElement;
  private fireCountEl: HTMLElement;

  private readonly onOnline: () => void;
  private readonly onOffline: () => void;

  private viewsEl: HTMLElement;

  constructor() {
    this.dotEl = h('span', { className: 'status-dot' });
    this.firmsTimeEl = h('span', {}, 'N/A');
    this.weatherTimeEl = h('span', {}, 'N/A');
    this.feedsTimeEl = h('span', {}, 'N/A');
    this.fireCountEl = h('span', {}, '0');
    this.viewsEl = h('span', {}, '-');

    const onlineLabel = h('span', {}, t('status.online') || '\uC628\uB77C\uC778');

    this.el = h(
      'div',
      { className: 'status-bar' },
      h('div', { className: 'status-bar-item' }, this.dotEl, onlineLabel),
      h('div', { className: 'status-bar-separator' }),
      h(
        'div',
        { className: 'status-bar-item' },
        h('span', {}, '\uD83D\uDC65'),
        this.viewsEl,
      ),
      h('div', { className: 'status-bar-separator' }),
      h(
        'div',
        { className: 'status-bar-item' },
        h('span', {}, (t('status.fires') || '\uC5F4\uC810') + ':'),
        this.fireCountEl,
      ),
      h('div', { className: 'status-bar-separator' }),
      h(
        'div',
        { className: 'status-bar-item' },
        h('span', {}, (t('status.firms') || 'FIRMS') + ':'),
        this.firmsTimeEl,
      ),
      h('div', { className: 'status-bar-separator' }),
      h(
        'div',
        { className: 'status-bar-item' },
        h('span', {}, (t('status.weather') || '\uAE30\uC0C1') + ':'),
        this.weatherTimeEl,
      ),
      h('div', { className: 'status-bar-separator' }),
      h(
        'div',
        { className: 'status-bar-item' },
        h('span', {}, (t('status.feeds') || '\uB274\uC2A4') + ':'),
        this.feedsTimeEl,
      ),
    );

    // Record page view
    this.recordPageView();

    this.onOnline = () => this.setOnline(true);
    this.onOffline = () => this.setOnline(false);

    window.addEventListener('online', this.onOnline);
    window.addEventListener('offline', this.onOffline);

    // Set initial state
    this.setOnline(navigator.onLine);
  }

  private setOnline(online: boolean): void {
    if (online) {
      this.dotEl.classList.remove('offline');
    } else {
      this.dotEl.classList.add('offline');
    }
  }

  update(data: StatusBarData): void {
    this.fireCountEl.textContent = String(data.fireCount);
    this.firmsTimeEl.textContent = formatTime(data.firmsRefreshedAt);
    this.weatherTimeEl.textContent = formatTime(data.weatherRefreshedAt);
    this.feedsTimeEl.textContent = formatTime(data.feedsRefreshedAt);
  }

  getElement(): HTMLElement {
    return this.el;
  }

  private async recordPageView(): Promise<void> {
    try {
      const res = await fetch('/api/stats', { method: 'POST' });
      if (res.ok) {
        const data = await res.json() as { concurrent: number; todayViews: number; totalViews: number; peakConcurrent: number };
        this.viewsEl.textContent = `\uB3D9\uC2DC ${data.concurrent}\uBA85 \xB7 \uC624\uB298 ${data.todayViews}\uD68C \xB7 \uB204\uC801 ${data.totalViews}\uD68C`;
      }
    } catch {
      this.viewsEl.textContent = '-';
    }
  }

  destroy(): void {
    window.removeEventListener('online', this.onOnline);
    window.removeEventListener('offline', this.onOffline);
  }
}
