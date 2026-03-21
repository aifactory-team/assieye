import { Panel } from './Panel';
import { h, replaceChildren } from '@/utils/dom-utils';
import { formatNumber, timeSince } from '@/utils/format';
import { t } from '@/services/i18n';
import type { FireRegionStats } from '@/types';

export type FireRegionSelectCallback = (stats: FireRegionStats) => void;
export type FireDaysChangeCallback = (days: number) => void;

export class FireHotspotPanel extends Panel {
  private onRegionSelect: FireRegionSelectCallback | null = null;
  private onDaysChange: FireDaysChangeCallback | null = null;
  private lastUpdated: string | null = null;
  private currentDays = 2;

  constructor() {
    super({
      id: 'fire-hotspots',
      title: t('panels.fireHotspots'),
      showCount: true,
      infoTooltip: t('panels.fireHotspots.tooltip'),
    });
  }

  setOnRegionSelect(cb: FireRegionSelectCallback): void {
    this.onRegionSelect = cb;
  }

  setOnDaysChange(cb: FireDaysChangeCallback): void {
    this.onDaysChange = cb;
  }

  private buildDaysSelector(): HTMLElement {
    const options = [1, 2, 3, 5, 7, 10];
    const select = h('select', { className: 'fire-days-select' }) as HTMLSelectElement;
    for (const d of options) {
      const opt = h('option', { value: String(d) }, `${d}일`) as HTMLOptionElement;
      if (d === this.currentDays) opt.selected = true;
      select.appendChild(opt);
    }
    select.addEventListener('change', () => {
      this.currentDays = parseInt(select.value, 10);
      if (this.onDaysChange) this.onDaysChange(this.currentDays);
    });
    return h('div', { className: 'fire-days-control' },
      h('span', {}, '조회기간: '),
      select,
    );
  }

  update(stats: FireRegionStats[], totalCount: number): void {
    this.lastUpdated = new Date().toISOString();
    this.setCount(totalCount);
    this.setDataBadge(t('common.live'), 'live');

    const daysSelector = this.buildDaysSelector();

    if (stats.length === 0) {
      replaceChildren(
        this.contentEl,
        daysSelector,
        h('div', { className: 'panel-empty' }, `최근 ${this.currentDays}일간 감지된 열점이 없습니다`),
      );
      return;
    }

    const sorted = [...stats].sort((a, b) => b.count - a.count);

    const thead = h(
      'thead',
      null,
      h(
        'tr',
        null,
        h('th', null, t('fireTable.region')),
        h('th', null, t('fireTable.fires')),
        h('th', null, t('fireTable.highConf')),
        h('th', null, t('fireTable.totalFrp')),
      ),
    );

    const tbody = h('tbody');
    for (const row of sorted) {
      const tr = h(
        'tr',
        { className: 'fire-row', style: 'cursor:pointer' },
        h('td', null, row.region),
        h('td', null, formatNumber(row.count)),
        h('td', null, formatNumber(row.highCount)),
        h('td', null, formatNumber(Math.round(row.totalFrp))),
      );

      tr.addEventListener('click', () => {
        if (this.onRegionSelect) {
          this.onRegionSelect(row);
        }
        console.log('[FireHotspotPanel] region selected:', row);
        this.el.dispatchEvent(
          new CustomEvent('fire-region-select', {
            detail: row,
            bubbles: true,
          }),
        );
      });

      tbody.appendChild(tr);
    }

    const table = h('table', { className: 'fire-table' }, thead, tbody);

    const footer = h(
      'div',
      { className: 'panel-footer' },
      this.lastUpdated
        ? `최근 갱신: ${timeSince(this.lastUpdated)}`
        : '',
    );

    replaceChildren(this.contentEl, daysSelector, table, footer);
  }
}
