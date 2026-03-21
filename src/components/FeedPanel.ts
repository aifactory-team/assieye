import { Panel } from './Panel';
import { t } from '@/services/i18n';
import { h, replaceChildren, safeHtml } from '@/utils/dom-utils';
import { timeSince, escapeHtml } from '@/utils/format';
import type { RssFeedItem } from '@/types';

type Category = 'all' | 'policy' | 'international' | 'research' | 'monitoring';

const CATEGORIES: Category[] = ['all', 'policy', 'international', 'research', 'monitoring'];

const CATEGORY_LABELS: Record<Category, string> = {
  all: '전체',
  policy: '정책',
  international: '국제',
  research: '연구',
  monitoring: '모니터링',
};

export class FeedPanel extends Panel {
  private items: RssFeedItem[] = [];
  private activeCategory: Category = 'all';

  constructor() {
    super({
      id: 'feeds',
      title: t('panels.feeds'),
      showCount: true,
      infoTooltip: t('panels.feeds.tooltip'),
    });
  }

  /** Replace displayed items and re-render. */
  public update(items: RssFeedItem[]): void {
    // Sort by pubDate descending (newest first)
    this.items = [...items].sort((a, b) =>
      new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(),
    );
    this.setCount(items.length);
    this.render();
  }

  private render(): void {
    const filtered =
      this.activeCategory === 'all'
        ? this.items
        : this.items.filter((item) => item.category === this.activeCategory);

    const tabs = this.buildTabs();

    if (filtered.length === 0) {
      replaceChildren(
        this.contentEl,
        tabs,
        h('div', { className: 'feed-empty' }, '피드 항목이 없습니다'),
      );
      return;
    }

    const itemElements = filtered.slice(0, 50).map((item) => this.buildItem(item));
    const list = h('div', { className: 'feed-list' }, ...itemElements);

    replaceChildren(this.contentEl, tabs, list);
  }

  private buildTabs(): HTMLElement {
    return h(
      'div',
      { className: 'feed-tabs' },
      ...CATEGORIES.map((cat) => {
        const btn = h(
          'button',
          {
            className: `feed-tab${cat === this.activeCategory ? ' active' : ''}`,
            dataset: { category: cat },
          },
          CATEGORY_LABELS[cat],
        );
        btn.addEventListener('click', () => {
          this.activeCategory = cat;
          this.render();
        });
        return btn;
      }),
    );
  }

  private buildItem(item: RssFeedItem): HTMLElement {
    const langBadge = h(
      'span',
      { className: `feed-lang-badge ${item.lang}` },
      item.lang.toUpperCase(),
    );
    const sourceBadge = h('span', { className: 'feed-source-badge' }, escapeHtml(item.source));
    const absTime = new Date(item.pubDate).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    const dateEl = h('span', { className: 'feed-item-date' }, `${absTime} (${timeSince(item.pubDate)})`);

    const titleEl = h('a', {
      className: 'feed-item-title',
      href: item.link,
      target: '_blank',
      rel: 'noopener noreferrer',
    }, escapeHtml(item.title));

    const descEl = h('div', { className: 'feed-item-desc' });
    if (item.description) {
      descEl.appendChild(safeHtml(item.description.substring(0, 200)));
    }

    return h(
      'div',
      { className: 'feed-item' },
      h('div', { className: 'feed-item-meta' }, langBadge, sourceBadge, dateEl),
      titleEl,
      descEl,
    );
  }
}
