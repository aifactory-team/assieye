import { Panel } from './Panel';
import { h, replaceChildren } from '@/utils/dom-utils';
import type { MarketQuote } from '@/services/market';

export class StockTickerPanel extends Panel {
  private quotes: MarketQuote[] = [];
  private symbols: string[] = [];

  constructor(title?: string, config?: { market?: string; indices?: string[] }) {
    const displayTitle = title || '주가 지수';
    super({ id: 'stock-ticker', title: displayTitle });

    // Map config to Yahoo Finance symbols
    if (config?.indices) {
      this.symbols = config.indices.map(idx => {
        const symbolMap: Record<string, string> = {
          'KOSPI': '^KS11',
          'KOSDAQ': '^KQ11',
          'SPX': '^GSPC',
          'NDX': '^IXIC',
          'DJI': '^DJI',
          'NIKKEI': '^N225',
          'HSI': '^HSI',
        };
        return symbolMap[idx] || idx;
      });
    } else {
      this.symbols = ['^GSPC', '^IXIC', '^DJI'];
    }
  }

  getSymbols(): string[] {
    return this.symbols;
  }

  update(quotes: MarketQuote[]): void {
    this.quotes = quotes;
    this.setCount(quotes.length);
    this.render();
  }

  private render(): void {
    if (this.quotes.length === 0) {
      replaceChildren(this.contentEl, h('div', { className: 'panel-empty' }, '시장 데이터 없음'));
      return;
    }

    const items = this.quotes.map(q => {
      const isUp = q.change >= 0;
      const color = isUp ? '#00cc66' : '#ff3333';
      const arrow = isUp ? '▲' : '▼';

      return h('div', {
        className: 'stock-ticker-item',
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '6px 8px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        },
      },
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '2px' } },
          h('span', { style: { fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-primary)' } }, q.name || q.symbol),
          h('span', { style: { fontSize: '0.65rem', color: 'var(--text-secondary)' } }, q.symbol),
        ),
        h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' } },
          h('span', { style: { fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'monospace' } },
            typeof q.price === 'number' ? q.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--'),
          h('span', { style: { fontSize: '0.7rem', fontWeight: '600', color, fontFamily: 'monospace' } },
            `${arrow} ${Math.abs(q.change ?? 0).toFixed(2)} (${Math.abs(q.changePercent ?? 0).toFixed(2)}%)`),
        ),
      );
    });

    replaceChildren(this.contentEl, ...items);
  }
}
