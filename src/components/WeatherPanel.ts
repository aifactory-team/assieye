import { Panel } from './Panel';
import { t } from '@/services/i18n';
import { h, replaceChildren } from '@/utils/dom-utils';
import { formatNumber } from '@/utils/format';
import type { WeatherStation } from '@/types';

/**
 * Simple fire-weather risk score based on temperature, humidity, wind speed.
 * Returns 0-100.
 */
function calcFireRisk(station: WeatherStation): number {
  const score =
    station.temp * 2 +
    station.windSpeed * 3 -
    station.humidity * 0.5 -
    station.rainfall * 10;
  return Math.max(0, Math.min(100, score));
}

type RiskLevel = '안전' | '주의' | '경고' | '위험';

function riskLevel(score: number): RiskLevel {
  if (score < 21) return '안전';
  if (score < 51) return '주의';
  if (score < 66) return '경고';
  return '위험';
}

const RISK_COLORS: Record<RiskLevel, string> = {
  '안전': '#22c55e',
  '주의': '#eab308',
  '경고': '#f97316',
  '위험': '#ef4444',
};

function windDirLabel(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round(deg / 45) % 8;
  return dirs[idx] ?? 'N';
}

export class WeatherPanel extends Panel {
  private stations: WeatherStation[] = [];

  constructor() {
    super({
      id: 'weather',
      title: t('panels.weather'),
      showCount: true,
      className: 'weather-panel',
    });
  }

  public update(stations: WeatherStation[]): void {
    this.stations = stations;
    this.setCount(stations.length);
    this.render();
  }

  private render(): void {
    if (this.stations.length === 0) {
      replaceChildren(
        this.contentEl,
        h('div', { className: 'panel-loading' }, t('common.loading')),
      );
      return;
    }

    const header = h(
      'div',
      { className: 'weather-table-header weather-row' },
      h('span', {}, '지점'),
      h('span', {}, '기온(°C)'),
      h('span', {}, '습도(%)'),
      h('span', {}, '풍속(m/s)'),
      h('span', {}, '풍향'),
      h('span', {}, '강수(mm)'),
      h('span', {}, '위험도'),
    );

    const rows = this.stations.map((st) => {
      const score = calcFireRisk(st);
      const level = riskLevel(score);
      const color = RISK_COLORS[level];

      const badge = h(
        'span',
        {
          className: 'weather-risk-badge',
          style: { background: color, color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' },
        },
        level,
      );

      return h(
        'div',
        { className: 'weather-row weather-data-row' },
        h('span', { className: 'weather-name' }, st.name),
        h('span', {}, formatNumber(Math.round(st.temp * 10) / 10)),
        h('span', {}, formatNumber(Math.round(st.humidity))),
        h('span', {}, formatNumber(Math.round(st.windSpeed * 10) / 10)),
        h('span', {}, windDirLabel(st.windDirection)),
        h('span', {}, formatNumber(Math.round(st.rainfall * 10) / 10)),
        badge,
      );
    });

    const table = h('div', { className: 'weather-table' }, header, ...rows);
    replaceChildren(this.contentEl, table);
  }
}
