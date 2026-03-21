import { Panel } from './Panel';
import { h, replaceChildren } from '@/utils/dom-utils';

interface DataStatus {
  fires: number;
  weather: number;
  satellites: number;
  flights: number;
  cctvs: number;
  feeds: number;
  youtube: number;
}

export class DataStatusPanel extends Panel {
  private status: DataStatus = {
    fires: 0, weather: 0, satellites: 0,
    flights: 0, cctvs: 0, feeds: 0, youtube: 0,
  };

  constructor() {
    super({
      id: 'data-status',
      title: '\uB370\uC774\uD130 \uD604\uD669',
      infoTooltip: '\uC2E4\uC2DC\uAC04 \uB370\uC774\uD130 \uC18C\uC2A4 \uC0C1\uD0DC',
    });
    this.render();
  }

  updateStatus(partial: Partial<DataStatus>): void {
    Object.assign(this.status, partial);
    this.render();
  }

  private render(): void {
    const rows = [
      { label: '\uC5F4\uC810 \uAC10\uC9C0', count: this.status.fires, color: '#ff6600' },
      { label: '\uAE30\uC0C1 \uAD00\uCE21\uC18C', count: this.status.weather, color: '#0099ff' },
      { label: '\uC704\uC131 \uCD94\uC801', count: this.status.satellites, color: '#c8a0ff' },
      { label: '\uD56D\uACF5\uAE30 \uCD94\uC801', count: this.status.flights, color: '#64b4ff' },
      { label: 'CCTV', count: this.status.cctvs, color: '#00ff64' },
      { label: '\uB274\uC2A4 \uD53C\uB4DC', count: this.status.feeds, color: '#c0d8c0' },
      { label: 'YouTube', count: this.status.youtube, color: '#ff0000' },
    ];

    const items = rows.map(r => {
      const dot = h('span', {
        style: `display:inline-block;width:6px;height:6px;border-radius:50%;background:${r.color};margin-right:6px;`,
      });
      const label = h('span', { style: 'flex:1;color:#a0c8a0;font-size:0.68rem;' }, r.label);
      const count = h('span', {
        style: `font-variant-numeric:tabular-nums;color:${r.count > 0 ? '#c0d8c0' : '#505050'};font-size:0.68rem;font-weight:600;`,
      }, String(r.count));

      return h('div', {
        style: 'display:flex;align-items:center;padding:3px 4px;border-bottom:1px solid #1e3e1e;',
      }, dot, label, count);
    });

    const now = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const timeEl = h('div', {
      style: 'text-align:right;padding:4px;color:#507050;font-size:0.6rem;',
    }, `\uAC31\uC2E0: ${now}`);

    replaceChildren(this.contentEl, ...items, timeEl);
  }
}
