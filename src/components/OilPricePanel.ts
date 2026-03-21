import { Panel } from './Panel';
import { h, replaceChildren } from '@/utils/dom-utils';
import type { MarketQuote } from '@/services/market';

const OIL_SYMBOLS = [
  { symbol: 'CL=F', name: 'WTI 원유' },
  { symbol: 'BZ=F', name: 'Brent 원유' },
  { symbol: 'NG=F', name: '천연가스' },
  { symbol: 'GC=F', name: '금' },
];

export class OilPricePanel extends Panel {
  private quotes: MarketQuote[] = [];

  constructor(title?: string) {
    super({ id: 'oil-price', title: title || '원자재 시세' });
  }

  static getSymbols(): string[] {
    return OIL_SYMBOLS.map(s => s.symbol);
  }

  update(quotes: MarketQuote[]): void {
    this.quotes = quotes;
    this.render();
  }

  private render(): void {
    if (this.quotes.length === 0) {
      replaceChildren(this.contentEl, h('div', { className: 'panel-empty' }, '원자재 데이터 없음'));
      return;
    }

    const items = OIL_SYMBOLS.map(oil => {
      const quote = this.quotes.find(q => q.symbol === oil.symbol);
      if (!quote) return null;

      const isUp = (quote.change ?? 0) >= 0;
      const color = isUp ? '#00cc66' : '#ff3333';
      const arrow = isUp ? '▲' : '▼';

      return h('div', {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '6px 8px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        },
      },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
          h('span', { style: { fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-primary)' } }, oil.name),
        ),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
          h('span', { style: { fontSize: '0.8rem', fontWeight: '700', fontFamily: 'monospace', color: 'var(--text-primary)' } },
            `$${(quote.price ?? 0).toFixed(2)}`),
          h('span', { style: { fontSize: '0.7rem', fontWeight: '600', fontFamily: 'monospace', color } },
            `${arrow} ${Math.abs(quote.changePercent ?? 0).toFixed(2)}%`),
        ),
      );
    }).filter(Boolean);

    replaceChildren(this.contentEl, ...items as HTMLElement[]);
  }
}
