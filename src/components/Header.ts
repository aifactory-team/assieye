import { h } from '@/utils/dom-utils';
import { t } from '@/services/i18n';
import type { TopicSelector } from './TopicSelector';

export interface HeaderStats {
  casualties?: string;
  missing?: string;
  progress?: string;
  newsCount?: number;
  videoCount?: number;
}

export class Header {
  private readonly el: HTMLElement;
  private selectorSlot: HTMLElement;
  private statsEl: HTMLElement;

  constructor(topicSelector?: TopicSelector) {
    this.selectorSlot = h('div', {
      className: 'header-topic-selector-slot',
      style: { position: 'relative', display: 'flex', alignItems: 'center' },
    });

    if (topicSelector) {
      this.selectorSlot.appendChild(topicSelector.getElement());
    }

    this.statsEl = h('div', { className: 'header-stats' });

    this.el = h(
      'header',
      { className: 'app-header' },
      h('h1', { className: 'app-title' }, t('app.title')),
      this.selectorSlot,
      this.statsEl,
    );
  }

  setTopicSelector(topicSelector: TopicSelector): void {
    while (this.selectorSlot.firstChild) {
      this.selectorSlot.removeChild(this.selectorSlot.firstChild);
    }
    this.selectorSlot.appendChild(topicSelector.getElement());
  }

  updateStats(stats: HeaderStats): void {
    const badges: HTMLElement[] = [];
    if (stats.casualties) {
      badges.push(h('span', { className: 'header-stat header-stat-danger' }, `\uD83D\uDEA8 ${stats.casualties}`));
    }
    if (stats.missing) {
      badges.push(h('span', { className: 'header-stat header-stat-warn' }, `\uD83D\uDD0D ${stats.missing}`));
    }
    if (stats.progress) {
      badges.push(h('span', { className: 'header-stat header-stat-info' }, `\uD83D\uDD25 ${stats.progress}`));
    }
    if (stats.newsCount != null) {
      badges.push(h('span', { className: 'header-stat' }, `\uD83D\uDCF0 ${stats.newsCount}`));
    }
    if (stats.videoCount != null) {
      badges.push(h('span', { className: 'header-stat' }, `\u25B6\uFE0F ${stats.videoCount}`));
    }

    this.statsEl.replaceChildren(...badges);
  }

  getElement(): HTMLElement {
    return this.el;
  }

  destroy(): void {
    this.el.remove();
  }
}
