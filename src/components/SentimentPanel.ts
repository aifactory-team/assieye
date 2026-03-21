import { Panel } from './Panel';
import { h, replaceChildren } from '@/utils/dom-utils';
import { escapeHtml } from '@/utils/format';
import type { AgentNewsItem } from '@/types';

const POSITIVE_KEYWORDS = ['\uAC10\uC0AC', '\uC751\uC6D0', '\uD76C\uB9DD', '\uAD6C\uC870', '\uC0DD\uC874', '\uC9C4\uD654 \uC644\uB8CC', '\uBCF5\uAD6C', '\uAE30\uBD80', '\uC704\uB85C', '\uCD94\uBAA8', '\uC548\uC804', '\uC2B9\uB9AC', '\uCD95\uD558', '\uD589\uBCF5', '\uC0AC\uB791', '\uC131\uACF5', '\uCD5C\uACE0'];
const NEGATIVE_KEYWORDS = ['\uC0AC\uB9DD', '\uC2E4\uC885', '\uBD95\uAD34', '\uD3ED\uBC1C', '\uBD80\uC0C1', '\uD53C\uD574', '\uC704\uD5D8', '\uBE44\uD310', '\uBD84\uB178', '\uCC45\uC784', '\uACBD\uBE44', '\uCC98\uBC8C', '\uBB38\uC81C', '\uC704\uAE30', '\uC0AC\uACE0', '\uB17C\uB780'];

type Sentiment = 'positive' | 'negative' | 'neutral';

function classifySentiment(item: AgentNewsItem): Sentiment {
  const text = `${item.title} ${item.description || ''}`.toLowerCase();
  const posScore = POSITIVE_KEYWORDS.filter(kw => text.includes(kw)).length;
  const negScore = NEGATIVE_KEYWORDS.filter(kw => text.includes(kw)).length;
  if (posScore > negScore) return 'positive';
  if (negScore > posScore) return 'negative';
  return 'neutral';
}

export class SentimentPanel extends Panel {
  private readonly sentiment: 'positive' | 'negative';

  constructor(sentiment: 'positive' | 'negative', title?: string) {
    super({
      id: `sentiment-${sentiment}`,
      title: title || (sentiment === 'positive' ? '\uAE0D\uC815 \uC5EC\uB860' : '\uBD80\uC815 \uC5EC\uB860'),
      showCount: true,
      className: `sentiment-panel sentiment-${sentiment}`,
    });
    this.sentiment = sentiment;
  }

  update(allItems: AgentNewsItem[]): void {
    const classified = allItems
      .map(item => ({ item, sentiment: classifySentiment(item) }))
      .filter(c => c.sentiment === this.sentiment)
      .slice(0, 20);

    this.setCount(classified.length);

    if (classified.length === 0) {
      this.hide();
      return;
    }
    this.show();

    const ratio = Math.round((classified.length / Math.max(allItems.length, 1)) * 100);
    const bar = h('div', { className: 'sentiment-bar-wrap' },
      h('div', { className: 'sentiment-bar-label' },
        `${this.sentiment === 'positive' ? '\uAE0D\uC815' : '\uBD80\uC815'} ${ratio}% (${classified.length}\uAC74)`),
      h('div', { className: 'sentiment-bar' },
        h('div', { className: `sentiment-bar-fill sentiment-${this.sentiment}`, style: `width:${ratio}%` }),
      ),
    );

    const items = classified.slice(0, 10).map(({ item }) => {
      const title = h('a', {
        className: 'agent-news-title',
        href: item.link,
        target: '_blank',
        rel: 'noopener noreferrer',
      }, escapeHtml(item.title));

      const source = h('span', { className: 'agent-news-source' }, escapeHtml(item.source));

      return h('div', { className: 'sentiment-item' }, source, title);
    });

    replaceChildren(this.contentEl, bar, ...items);
  }
}
