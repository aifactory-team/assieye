import { Panel } from './Panel';
import { h, replaceChildren } from '@/utils/dom-utils';
import type { MarketQuote } from '@/services/market';

// Sector ETFs for each market
const SECTOR_SYMBOLS: Record<string, { symbol: string; name: string }[]> = {
  KR: [
    { symbol: '091160.KS', name: '반도체' },
    { symbol: '091170.KS', name: '자동차' },
    { symbol: '091180.KS', name: '철강' },
    { symbol: '091200.KS', name: '건설' },
    { symbol: '091220.KS', name: '금융' },
    { symbol: '091230.KS', name: '운송' },
  ],
  US: [
    { symbol: 'XLK', name: 'Technology' },
    { symbol: 'XLF', name: 'Financial' },
    { symbol: 'XLE', name: 'Energy' },
    { symbol: 'XLV', name: 'Healthcare' },
    { symbol: 'XLI', name: 'Industrial' },
    { symbol: 'ITA', name: 'Defense' },
  ],
};

export class StockSectorsPanel extends Panel {
  private quotes: MarketQuote[] = [];
  private market: string;

  constructor(title?: string, config?: { market?: string }) {
    super({ id: 'stock-sectors', title: title || '업종별 등락' });
    this.market = config?.market || 'US';
  }

  getSectorSymbols(): string[] {
    return (SECTOR_SYMBOLS[this.market] ?? SECTOR_SYMBOLS['US']!).map(s => s.symbol);
  }

  update(quotes: MarketQuote[]): void {
    this.quotes = quotes;
    this.setCount(quotes.length);
    this.render();
  }

  private render(): void {
    const sectors = SECTOR_SYMBOLS[this.market] ?? SECTOR_SYMBOLS['US']!;

    if (this.quotes.length === 0) {
      replaceChildren(this.contentEl, h('div', { className: 'panel-empty' }, '업종 데이터 없음'));
      return;
    }

    const items = sectors.map(sector => {
      const quote = this.quotes.find(q => q.symbol === sector.symbol);
      if (!quote) return null;

      const pct = quote.changePercent ?? 0;
      const isUp = pct >= 0;
      const barWidth = Math.min(Math.abs(pct) * 10, 100);
      const color = isUp ? '#00cc66' : '#ff3333';

      return h('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 8px',
          fontSize: '0.75rem',
        },
      },
        h('span', { style: { width: '70px', flexShrink: '0', color: 'var(--text-secondary)' } }, sector.name),
        h('div', { style: { flex: '1', height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', position: 'relative' } },
          h('div', { style: {
            position: 'absolute',
            [isUp ? 'left' : 'right']: '50%',
            width: `${barWidth}%`,
            height: '100%',
            background: color,
            borderRadius: '2px',
            transition: 'width 0.3s',
          } }),
        ),
        h('span', { style: { width: '55px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '600', color, flexShrink: '0' } },
          `${isUp ? '+' : ''}${pct.toFixed(2)}%`),
      );
    }).filter(Boolean);

    replaceChildren(this.contentEl, ...items as HTMLElement[]);
  }
}
