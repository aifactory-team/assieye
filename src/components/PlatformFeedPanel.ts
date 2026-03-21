import { Panel } from './Panel';
import { h, replaceChildren } from '@/utils/dom-utils';
import { timeSince, escapeHtml } from '@/utils/format';
import type { AgentNewsItem, AgentNewsSeverity, AgentNewsPlatform } from '@/types';

const SEVERITY_COLORS: Record<AgentNewsSeverity, { icon: string; cls: string }> = {
  critical: { icon: '\uD83D\uDD34', cls: 'severity-critical' },
  high:     { icon: '\uD83D\uDFE0', cls: 'severity-high' },
  medium:   { icon: '\uD83D\uDFE1', cls: 'severity-medium' },
  low:      { icon: '\u26AA',       cls: 'severity-low' },
};

const PLATFORM_CONFIG: Record<AgentNewsPlatform, { icon: string; title: string }> = {
  news:      { icon: '', title: '\uB274\uC2A4' },
  youtube:   { icon: '', title: 'YouTube' },
  twitter:   { icon: '', title: 'X' },
  instagram: { icon: '', title: 'Instagram' },
  facebook:  { icon: '', title: 'Facebook' },
  tiktok:    { icon: '', title: 'TikTok' },
  threads:   { icon: '', title: 'Threads' },
};

export class PlatformFeedPanel extends Panel {
  private readonly platform: AgentNewsPlatform;
  private items: AgentNewsItem[] = [];
  private displayCount = 20;

  constructor(platform: AgentNewsPlatform, title?: string) {
    const config = PLATFORM_CONFIG[platform] || { icon: '', title: platform };
    super({
      id: `platform-${platform}`,
      title: title || `${config.icon} ${config.title}`,
      showCount: true,
      className: `platform-feed-panel platform-${platform}`,
    });
    this.platform = platform;
  }

  private ogPending = new Set<string>();
  private topicKeywords: string[] = [];

  setTopicKeywords(keywords: string[]): void {
    this.topicKeywords = keywords;
  }

  update(allItems: AgentNewsItem[]): void {
    let filtered = allItems.filter(item => (item.platform || 'news') === this.platform);

    // Filter by topic keywords for SNS platforms (title only, tags may be auto-added)
    if (this.topicKeywords.length > 0 && ['facebook', 'instagram', 'twitter', 'threads', 'tiktok'].includes(this.platform)) {
      const relevant = filtered.filter(item => {
        const text = `${item.title} ${item.description || ''}`.toLowerCase();
        return this.topicKeywords.some(kw => text.includes(kw.toLowerCase()));
      });
      if (relevant.length > 0) filtered = relevant;
    }

    this.items = filtered.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

    // Enrich items with cached OG images
    if (this.platform !== 'youtube') { // OG image fetch for all platforms except YouTube (has own thumbnails)
      for (const item of this.items.slice(0, 20)) {
        if (!item.thumbnailUrl && item.link && PlatformFeedPanel.ogCache.has(item.link)) {
          const cached = PlatformFeedPanel.ogCache.get(item.link);
          if (cached) item.thumbnailUrl = cached;
        }
        // Trigger OG fetch for items without thumbnail (max 5 concurrent)
        if (!item.thumbnailUrl && item.link && !PlatformFeedPanel.ogCache.has(item.link) && !this.ogPending.has(item.link)) {
          if (this.ogPending.size < 10) {
            this.ogPending.add(item.link);
            void this.fetchOgImage(item.link).then(() => {
              this.ogPending.delete(item.link);
              // Re-render after OG image cached
              if (PlatformFeedPanel.ogCache.get(item.link)) this.render();
            });
          }
        }
      }
    }

    this.setCount(this.items.length);
    if (this.items.length === 0) {
      this.hide();
    } else {
      this.show();
    }
    this.render();
  }

  private render(): void {
    // Apply cached OG images to items before rendering
    for (const item of this.items) {
      if (!item.thumbnailUrl && item.link) {
        const cached = PlatformFeedPanel.ogCache.get(item.link);
        if (cached) item.thumbnailUrl = cached;
      }
    }

    if (this.items.length === 0) {
      replaceChildren(this.contentEl,
        h('div', { className: 'agent-news-empty' }, '\uC218\uC9D1\uB41C \uD56D\uBAA9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4'),
      );
      return;
    }

    this.displayCount = Math.min(this.displayCount, this.items.length);
    const listItems = this.items.slice(0, this.displayCount).map(item => this.buildItem(item));
    const children: (HTMLElement | Node)[] = [...listItems];

    if (this.displayCount < this.items.length) {
      const remaining = this.items.length - this.displayCount;
      const moreBtn = h('button', { className: 'feed-load-more' }, `\uB354 \uBCF4\uAE30 (${remaining}\uAC74)`);
      moreBtn.addEventListener('click', () => {
        this.displayCount += 20;
        this.render();
      });
      children.push(moreBtn);
    }

    replaceChildren(this.contentEl, ...children);
  }

  private buildItem(item: AgentNewsItem): HTMLElement {
    const sev = SEVERITY_COLORS[item.severity] || SEVERITY_COLORS.low;
    const timeLabel = new Date(item.pubDate).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

    const severityBadge = h('span', { className: `agent-news-severity ${sev.cls}` }, sev.icon);
    const sourceBadge = h('span', { className: 'agent-news-source' }, escapeHtml(item.source));
    const dateEl = h('span', { className: 'agent-news-date' }, `${timeLabel} (${timeSince(item.pubDate)})`);

    const titleEl = h('a', {
      className: 'agent-news-title',
      href: item.link,
      target: '_blank',
      rel: 'noopener noreferrer',
    }, escapeHtml(item.title));

    const cachedOg = PlatformFeedPanel.ogCache.get(item.link);
    const thumbUrl = item.thumbnailUrl || (cachedOg || undefined);
    const hasThumb = !!(thumbUrl && !item.youtubeId && !item.videoUrl && !item.imageUrl);

    const bodyChildren: HTMLElement[] = [
      h('div', { className: 'agent-news-item-meta' }, severityBadge, sourceBadge, dateEl),
      titleEl,
    ];

    if (item.description) {
      bodyChildren.push(h('div', { className: 'agent-news-desc' }, escapeHtml(item.description)));
    }

    if (item.agentNote) {
      bodyChildren.push(h('div', { className: 'agent-news-note' }, `\uD83D\uDCAC ${escapeHtml(item.agentNote)}`));
    }

    // Side-by-side layout: thumbnail (or avatar) | text body
    {
      const letter = (item.source || '?')[0]!;
      const hue = Array.from(item.source || 'A').reduce((s, c) => s + c.charCodeAt(0), 0) % 360;

      let visual: HTMLElement;
      if (hasThumb) {
        const img = h('img', {
          className: 'agent-news-thumbnail',
          src: thumbUrl!,
          alt: item.title,
          loading: 'lazy',
        }) as HTMLImageElement;
        // Fallback to avatar on load error (CDN expiry etc)
        img.onerror = () => {
          const avatar = h('div', {
            className: 'agent-news-avatar',
            style: `background:hsl(${hue},50%,35%);`,
          }, letter);
          if (img.parentElement) {
            img.parentElement.replaceChild(avatar, img);
          }
        };
        visual = img;
      } else if (!item.youtubeId && !item.videoUrl) {
        // Start with avatar, try to load OG image in background
        const avatar = h('div', {
          className: 'agent-news-avatar',
          style: `background:hsl(${hue},50%,35%);`,
        }, letter);
        visual = avatar;

      } else {
        visual = null as unknown as HTMLElement;
      }
      if (visual) {
        const body = h('div', { className: 'agent-news-item-body' }, ...bodyChildren);
        return h('div', { className: 'agent-news-item agent-news-item-with-thumb' }, visual, body);
      }
    }

    // Full-width media below text
    const children: HTMLElement[] = [...bodyChildren];

    if (item.youtubeId) {
      const ytId = escapeHtml(item.youtubeId);
      const wrapper = h('div', { className: 'agent-news-media agent-news-yt-lazy' });
      const thumbImg = h('img', {
        className: 'agent-news-yt-thumb',
        src: `https://i.ytimg.com/vi/${ytId}/mqdefault.jpg`,
        alt: item.title,
        loading: 'lazy',
      });
      const playBtn = h('div', { className: 'agent-news-yt-play' }, '\u25B6');
      wrapper.appendChild(thumbImg);
      wrapper.appendChild(playBtn);
      wrapper.addEventListener('click', () => {
        const iframe = h('iframe', {
          className: 'agent-news-video',
          src: `https://www.youtube.com/embed/${ytId}?rel=0&autoplay=1&mute=1`,
          allow: 'accelerometer; autoplay; encrypted-media; gyroscope',
          allowFullscreen: 'true',
          frameBorder: '0',
        });
        wrapper.replaceChildren(iframe);
        wrapper.classList.remove('agent-news-yt-lazy');
      });
      children.push(wrapper);
    } else if (item.videoUrl) {
      children.push(h('div', { className: 'agent-news-media' },
        h('video', { className: 'agent-news-video', src: item.videoUrl, controls: 'true', preload: 'metadata', muted: 'true' }),
      ));
    }

    if (item.imageUrl) {
      children.push(h('div', { className: 'agent-news-media' },
        h('img', { className: 'agent-news-image', src: item.imageUrl, alt: item.title, loading: 'lazy' }),
      ));
    }

    return h('div', { className: 'agent-news-item' }, ...children);
  }

  private static ogCache = new Map<string, string | null>();

  private async fetchOgImage(url: string): Promise<string | null> {
    if (PlatformFeedPanel.ogCache.has(url)) return PlatformFeedPanel.ogCache.get(url) ?? null;
    try {
      const res = await fetch(`/api/og-image?url=${encodeURIComponent(url)}`);
      if (!res.ok) return null;
      const data = await res.json() as { imageUrl: string | null };
      PlatformFeedPanel.ogCache.set(url, data.imageUrl);
      return data.imageUrl;
    } catch {
      PlatformFeedPanel.ogCache.set(url, null);
      return null;
    }
  }
}
