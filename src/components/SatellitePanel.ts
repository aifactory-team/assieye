import { Panel } from './Panel';
import { t } from '@/services/i18n';
import { h, replaceChildren } from '@/utils/dom-utils';
import type { Satellite } from '@/services/satellites';

type SatelliteGroup = 'weather' | 'earth-obs' | 'active';

const GROUPS: SatelliteGroup[] = ['weather', 'earth-obs', 'active'];

const GROUP_LABELS: Record<SatelliteGroup, string> = {
  weather: '기상',
  'earth-obs': '지구관측',
  active: '활성',
};

export class SatellitePanel extends Panel {
  private satellites: Satellite[] = [];
  private activeGroup: SatelliteGroup = 'weather';
  public onGroupChange?: (group: SatelliteGroup) => void;
  public onItemClick?: (satellite: Satellite | null) => void;
  private selectedId: string | null = null;

  constructor() {
    super({
      id: 'satellites',
      title: t('panels.satellites') || '위성 궤적',
      showCount: true,
    });
  }

  public update(satellites: Satellite[]): void {
    this.satellites = satellites;
    this.setCount(satellites.length);
    this.render();
  }

  private render(): void {
    const selector = this.buildGroupSelector();

    if (this.satellites.length === 0) {
      replaceChildren(
        this.contentEl,
        selector,
        h('div', { className: 'satellite-empty' }, '위성 데이터가 없습니다'),
      );
      return;
    }

    const table = this.buildTable();

    if (this.selectedId) {
      const tracked = this.satellites.find((s) => s.id === this.selectedId);
      if (tracked) {
        const badge = h(
          'div',
          {
            style:
              'padding:4px 8px;background:#1a3a1a;border:1px solid #2a5a2a;border-radius:4px;margin-bottom:4px;font-size:0.7rem;color:#80ff80;display:flex;align-items:center;gap:4px;',
          },
          h('span', { style: 'color:#00ff64;' }, '📡'),
          `추적 중: ${tracked.name}`,
        );
        const stopBtn = h(
          'span',
          { style: 'margin-left:auto;cursor:pointer;color:#ff6666;font-size:0.8rem;' },
          '✕',
        );
        stopBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.selectedId = null;
          this.onItemClick?.(null);
          this.render();
        });
        badge.appendChild(stopBtn);
        replaceChildren(this.contentEl, selector, badge, table);
        return;
      }
    }

    replaceChildren(this.contentEl, selector, table);
  }

  private buildGroupSelector(): HTMLElement {
    const select = h('select', { className: 'satellite-group-select' }) as HTMLSelectElement;

    for (const group of GROUPS) {
      const option = h('option', { value: group }, GROUP_LABELS[group]) as HTMLOptionElement;
      if (group === this.activeGroup) {
        option.selected = true;
      }
      select.appendChild(option);
    }

    select.addEventListener('change', () => {
      this.activeGroup = select.value as SatelliteGroup;
      this.onGroupChange?.(this.activeGroup);
    });

    return h('div', { className: 'satellite-group-selector' }, select);
  }

  private buildTable(): HTMLElement {
    const thead = h(
      'thead',
      null,
      h(
        'tr',
        null,
        h('th', null, 'Name'),
        h('th', null, 'Inclination'),
        h('th', null, 'Mean Motion'),
        h('th', null, 'Epoch'),
      ),
    );

    const rows = this.satellites.slice(0, 100).map((sat) => {
      const row = h(
        'tr',
        {
          style: `cursor:pointer;${sat.id === this.selectedId ? 'background:#1a3a1a;' : ''}`,
        },
        h('td', null, sat.name),
        h('td', null, String(sat.inclination)),
        h('td', null, String(sat.meanMotion)),
        h('td', null, `${sat.epochYear}/${Math.round(sat.epochDay)}`),
      );
      row.addEventListener('click', () => {
        if (this.selectedId === sat.id) {
          this.selectedId = null;
          this.onItemClick?.(null);
        } else {
          this.selectedId = sat.id;
          this.onItemClick?.(sat);
        }
        this.render();
      });
      return row;
    });

    const tbody = h('tbody', null, ...rows);

    return h('table', { className: 'satellite-table' }, thead, tbody);
  }
}
