import { Panel } from './Panel';
import { h, replaceChildren } from '@/utils/dom-utils';
import { t } from '@/services/i18n';
import { checkAndSendAlerts } from '@/services/alerts';
import type { FireHotspot } from '@/types';

export class AlertPanel extends Panel {
  constructor() {
    super({
      id: 'alerts',
      title: t('panels.alerts'),
      showCount: true,
      infoTooltip: t('panels.alerts.tooltip'),
    });

    this.renderTestButton();
  }

  private renderTestButton(): void {
    const btn = h('button', { className: 'alert-test-btn' }, t('panels.alerts.testBtn') || '테스트 알림');
    btn.addEventListener('click', () => void this.handleTest());
    this.el.appendChild(btn);
  }

  private async handleTest(): Promise<void> {
    const mockFire: FireHotspot = {
      lat: 37.5,
      lng: 127.0,
      brightness: 350,
      frp: 25,
      confidence: 'high',
      satellite: 'AQUA',
      acqTime: new Date().toISOString(),
      region: '테스트 지역',
      dayNight: 'D',
    };
    await checkAndSendAlerts([mockFire], []);
  }

  /** Show fire detections as alerts */
  updateFromFires(fires: FireHotspot[]): void {
    this.setCount(fires.length);

    if (fires.length === 0) {
      replaceChildren(
        this.contentEl,
        h('div', { className: 'panel-empty' }, '감지된 이벤트가 없습니다'),
      );
      return;
    }

    // Sort by time descending (newest first), then by confidence
    const sorted = [...fires].sort((a, b) => {
      const timeDiff = new Date(b.acqTime).getTime() - new Date(a.acqTime).getTime();
      if (timeDiff !== 0) return timeDiff;
      const order: Record<string, number> = { high: 0, nominal: 1, low: 2 };
      return (order[a.confidence] ?? 1) - (order[b.confidence] ?? 1);
    });

    const items = sorted.slice(0, 12).map(fire => {
      const confColor =
        fire.confidence === 'high' ? '#ff3300' :
        fire.confidence === 'nominal' ? '#ff8800' : '#ffcc00';

      const dot = h('span', {
        className: 'alert-status',
        style: `color:${confColor}; font-size:0.8rem;`,
      }, '\u25CF');

      const details = h('div', { className: 'alert-details' },
        h('span', { className: 'alert-location' }, fire.region || `${fire.lat.toFixed(2)}, ${fire.lng.toFixed(2)}`),
        h('span', { className: 'alert-meta' },
          `FRP: ${fire.frp.toFixed(1)} | ${fire.confidence} | ${fire.satellite}`),
      );

      const time = h('span', { className: 'alert-time' },
        fire.acqTime ? new Date(fire.acqTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '',
      );

      return h('div', { className: 'alert-item' }, dot, details, time);
    });

    replaceChildren(this.contentEl, ...items);
  }
}
