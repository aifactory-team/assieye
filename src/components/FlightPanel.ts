import { Panel } from './Panel';
import { t } from '@/services/i18n';
import { h, replaceChildren } from '@/utils/dom-utils';
import type { Flight } from '@/services/flights';

function formatAltitude(meters: number): string {
  return Math.round(meters).toLocaleString();
}

function msToKmh(ms: number): string {
  return (ms * 3.6).toFixed(1);
}

export class FlightPanel extends Panel {
  private flights: Flight[] = [];
  public onItemClick?: (flight: Flight | null) => void;
  private selectedIcao: string | null = null;

  constructor() {
    super({
      id: 'flights',
      title: t('panels.flights') || '항공 추적',
      showCount: true,
    });
  }

  public update(flights: Flight[]): void {
    this.flights = flights;
    this.setCount(flights.length);
    this.render();
  }

  private render(): void {
    if (this.flights.length === 0) {
      replaceChildren(
        this.contentEl,
        h('div', { className: 'flight-empty' }, '항공편 데이터가 없습니다'),
      );
      return;
    }

    const table = this.buildTable();

    if (this.selectedIcao) {
      const tracked = this.flights.find((f) => f.icao24 === this.selectedIcao);
      if (tracked) {
        const badge = h(
          'div',
          {
            style:
              'padding:4px 8px;background:#1a3a1a;border:1px solid #2a5a2a;border-radius:4px;margin-bottom:4px;font-size:0.7rem;color:#80ff80;display:flex;align-items:center;gap:4px;',
          },
          h('span', { style: 'color:#00ff64;' }, '📡'),
          `추적 중: ${tracked.callsign ?? tracked.icao24}`,
        );
        const stopBtn = h(
          'span',
          { style: 'margin-left:auto;cursor:pointer;color:#ff6666;font-size:0.8rem;' },
          '✕',
        );
        stopBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.selectedIcao = null;
          this.onItemClick?.(null);
          this.render();
        });
        badge.appendChild(stopBtn);
        replaceChildren(this.contentEl, badge, table);
        return;
      }
    }

    replaceChildren(this.contentEl, table);
  }

  private buildTable(): HTMLElement {
    const thead = h(
      'thead',
      null,
      h(
        'tr',
        null,
        h('th', null, 'Callsign'),
        h('th', null, 'Country'),
        h('th', null, 'Altitude(m)'),
        h('th', null, 'Speed(km/h)'),
        h('th', null, 'Heading'),
      ),
    );

    const rows = this.flights.slice(0, 100).map((flight) => {
      const row = h(
        'tr',
        {
          style: `cursor:pointer;${flight.icao24 === this.selectedIcao ? 'background:#1a3a1a;' : ''}`,
        },
        h('td', null, flight.callsign ?? ''),
        h('td', null, flight.country ?? ''),
        h('td', null, formatAltitude(flight.altitude ?? 0)),
        h('td', null, msToKmh(flight.velocity ?? 0)),
        h('td', null, String(Math.round(flight.heading ?? 0)) + '\u00B0'),
      );
      row.addEventListener('click', () => {
        if (this.selectedIcao === flight.icao24) {
          this.selectedIcao = null;
          this.onItemClick?.(null);
        } else {
          this.selectedIcao = flight.icao24;
          this.onItemClick?.(flight);
        }
        this.render();
      });
      return row;
    });

    const tbody = h('tbody', null, ...rows);

    return h('table', { className: 'flight-table' }, thead, tbody);
  }
}
