import { h } from '@/utils/dom-utils';

interface LegendEntry {
  label: string;
  color: string;
}

const LEGEND_ENTRIES: LegendEntry[] = [
  { label: '안전', color: '#22c55e' },
  { label: '주의', color: '#eab308' },
  { label: '경고', color: '#f97316' },
  { label: '위험', color: '#ef4444' },
  { label: '매우위험', color: '#640000' },
];

export class DwiLegend {
  private readonly el: HTMLElement;

  constructor() {
    const entries = LEGEND_ENTRIES.map((entry) =>
      h(
        'div',
        { className: 'dwi-legend-entry', style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' } },
        h('span', {
          className: 'dwi-legend-swatch',
          style: {
            display: 'inline-block',
            width: '16px',
            height: '16px',
            borderRadius: '3px',
            background: entry.color,
            flexShrink: '0',
          },
        }),
        h('span', { className: 'dwi-legend-label', style: { fontSize: '0.75rem', color: '#e5e7eb' } }, entry.label),
      ),
    );

    const title = h(
      'div',
      { className: 'dwi-legend-title', style: { fontSize: '0.8rem', fontWeight: '600', color: '#f9fafb', marginBottom: '6px' } },
      '위험지수',
    );

    this.el = h(
      'div',
      {
        className: 'dwi-legend',
        style: {
          position: 'absolute',
          bottom: '32px',
          left: '12px',
          background: 'rgba(17,24,39,0.85)',
          borderRadius: '8px',
          padding: '10px 12px',
          zIndex: '10',
          pointerEvents: 'none',
          backdropFilter: 'blur(4px)',
        },
      },
      title,
      ...entries,
    );
  }

  getElement(): HTMLElement {
    return this.el;
  }

  show(): void {
    this.el.style.display = '';
  }

  hide(): void {
    this.el.style.display = 'none';
  }
}
