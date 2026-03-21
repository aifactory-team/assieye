import { Panel } from './Panel';
import { h, replaceChildren } from '@/utils/dom-utils';
import { timeSince } from '@/utils/format';
import type { RssFeedItem } from '@/types';

export class ConflictTimelinePanel extends Panel {
  private items: RssFeedItem[] = [];

  constructor(title?: string) {
    super({ id: 'conflict-timeline', title: title || '이벤트 타임라인', showCount: true });
  }

  update(items: RssFeedItem[]): void {
    this.items = items;
    this.setCount(items.length);
    this.render();
  }

  private render(): void {
    if (this.items.length === 0) {
      replaceChildren(this.contentEl, h('div', { className: 'panel-empty' }, '이벤트 없음'));
      return;
    }

    // Sort by date descending
    const sorted = [...this.items].sort((a, b) =>
      new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
    );

    const timeline = sorted.slice(0, 30).map((item, i) => {
      const isFirst = i === 0;
      const dotColor = isFirst ? 'var(--accent)' : 'var(--text-secondary)';

      const dot = h('div', {
        style: {
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: dotColor,
          flexShrink: '0',
          marginTop: '4px',
          boxShadow: isFirst ? `0 0 6px ${dotColor}` : 'none',
        },
      });

      const line = h('div', {
        style: {
          width: '2px',
          flex: '1',
          background: 'rgba(255,255,255,0.1)',
          marginLeft: '3px',
          minHeight: '8px',
        },
      });

      const timeStr = timeSince(item.pubDate);
      const titleLink = h('a', {
        href: item.link,
        target: '_blank',
        rel: 'noopener noreferrer',
        style: {
          color: isFirst ? 'var(--accent)' : 'var(--text-primary)',
          textDecoration: 'none',
          fontSize: '0.75rem',
          fontWeight: isFirst ? '600' : '400',
          lineHeight: '1.3',
          display: 'block',
        },
      }, item.title);

      const meta = h('div', {
        style: { fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px' },
      },
        h('span', {}, item.source),
        h('span', { style: { margin: '0 4px' } }, '·'),
        h('span', {}, timeStr),
      );

      const content = h('div', { style: { flex: '1', paddingBottom: '8px' } }, titleLink, meta);

      const leftTrack = h('div', {
        style: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '14px', flexShrink: '0' },
      }, dot, line);

      return h('div', {
        style: { display: 'flex', gap: '8px' },
      }, leftTrack, content);
    });

    replaceChildren(this.contentEl, ...timeline);
  }
}
