import { Panel } from './Panel';
import { h, replaceChildren } from '@/utils/dom-utils';
import { timeSince, escapeHtml } from '@/utils/format';
import type { AgentNewsData, AgentNewsItem, AgentNewsSeverity, AgentNewsPlatform } from '@/types';

const SEVERITY_COLORS: Record<AgentNewsSeverity, { icon: string; cls: string }> = {
  critical: { icon: '\uD83D\uDD34', cls: 'severity-critical' },
  high:     { icon: '\uD83D\uDFE0', cls: 'severity-high' },
  medium:   { icon: '\uD83D\uDFE1', cls: 'severity-medium' },
  low:      { icon: '\u26AA',       cls: 'severity-low' },
};

const PLATFORM_LABELS: Record<AgentNewsPlatform, { icon: string; label: string }> = {
  news:      { icon: '\uD83D\uDCF0', label: '\uB274\uC2A4' },
  youtube:   { icon: '\u25B6\uFE0F',  label: 'YouTube' },
  twitter:   { icon: '\uD835\uDD4F',  label: 'X' },
  instagram: { icon: '\uD83D\uDCF7', label: 'Instagram' },
  facebook:  { icon: '\uD83D\uDC4D', label: 'Facebook' },
  tiktok:    { icon: '\uD83C\uDFB5', label: 'TikTok' },
  threads:   { icon: '\uD83E\uDDF5', label: 'Threads' },
};

const MAX_AUTOPLAY = 2;

export class AgentNewsPanel extends Panel {
  private data: AgentNewsData | null = null;
  private previousItemCount = 0;
  private observer: IntersectionObserver | null = null;
  private autoplayCount = 0;

  constructor(title?: string) {
    super({
      id: 'agent-news',
      title: title || '\uC2E4\uC2DC\uAC04 \uD604\uC7A5 \uB274\uC2A4',
      showCount: true,
      infoTooltip: '\uC5D0\uC774\uC804\uD2B8\uAC00 \uC218\uC9D1\uD55C \uC2E4\uC2DC\uAC04 \uB274\uC2A4 \xB7 \uB3D9\uC601\uC0C1 \xB7 SNS (10\uCD08 \uAC04\uACA9)',
    });
  }

  update(data: AgentNewsData): void {
    const isNewData = this.data !== null && data.items.length > this.previousItemCount;
    data.items = [...data.items].sort((a, b) =>
      new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(),
    );
    this.data = data;
    this.previousItemCount = data.items.length;
    this.setCount(data.items.length);
    this.render(isNewData);
  }

  private render(highlightNew: boolean): void {
    if (!this.data) return;

    const { meta, items, summary } = this.data;

    const metaEl = h('div', { className: 'agent-news-meta' },
      h('span', null, `\uC5C5\uB370\uC774\uD2B8 #${meta.updateCount}`),
      h('span', null, `\xB7 ${timeSince(meta.lastUpdated)}`),
    );

    if (items.length === 0) {
      replaceChildren(this.contentEl, metaEl,
        h('div', { className: 'agent-news-empty' }, '\uC218\uC9D1\uB41C \uB274\uC2A4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4. \uC5D0\uC774\uC804\uD2B8 \uB300\uAE30 \uC911...'),
      );
      return;
    }

    // Interleave YouTube and news items 50/50
    const interleaved = this.interleaveItems(items);

    const listItems = interleaved.slice(0, 100).map((item, i) =>
      this.buildItem(item, highlightNew && i === 0),
    );
    const list = h('div', { className: 'agent-news-list' }, ...listItems);

    // Summary at the bottom
    const statsBar = this.buildStatsBar(summary);

    replaceChildren(this.contentEl, metaEl, list, statsBar);

    // Setup autoplay observer after DOM is ready
    requestAnimationFrame(() => this.setupAutoplay());
  }

  /** Interleave: alternate YouTube/video items with news items */
  private interleaveItems(items: AgentNewsItem[]): AgentNewsItem[] {
    const videos: AgentNewsItem[] = [];
    const nonVideos: AgentNewsItem[] = [];

    for (const item of items) {
      if (item.youtubeId || item.videoUrl || (item.platform === 'youtube')) {
        videos.push(item);
      } else {
        nonVideos.push(item);
      }
    }

    if (videos.length === 0 || nonVideos.length === 0) return items;

    const result: AgentNewsItem[] = [];
    const maxLen = Math.max(videos.length, nonVideos.length);
    let vi = 0, ni = 0;

    for (let i = 0; i < maxLen * 2 && (vi < videos.length || ni < nonVideos.length); i++) {
      if (i % 2 === 0 && ni < nonVideos.length) {
        result.push(nonVideos[ni++]!);
      } else if (i % 2 === 1 && vi < videos.length) {
        result.push(videos[vi++]!);
      } else if (ni < nonVideos.length) {
        result.push(nonVideos[ni++]!);
      } else if (vi < videos.length) {
        result.push(videos[vi++]!);
      }
    }

    return result;
  }

  /** Observe iframes/videos in viewport, autoplay up to MAX_AUTOPLAY */
  private setupAutoplay(): void {
    if (this.observer) this.observer.disconnect();
    this.autoplayCount = 0;

    this.observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        if (this.autoplayCount >= MAX_AUTOPLAY) continue;

        const el = entry.target as HTMLElement;

        // YouTube iframe — add autoplay param
        if (el.tagName === 'IFRAME') {
          const src = el.getAttribute('src') || '';
          if (src && !src.includes('autoplay=1')) {
            el.setAttribute('src', src + (src.includes('?') ? '&' : '?') + 'autoplay=1&mute=1');
            this.autoplayCount++;
            this.observer?.unobserve(el);
          }
        }

        // HTML5 video — play muted
        if (el.tagName === 'VIDEO') {
          const video = el as HTMLVideoElement;
          video.muted = true;
          video.play().catch(() => {});
          this.autoplayCount++;
          this.observer?.unobserve(el);
        }
      }
    }, { root: this.contentEl, threshold: 0.5 });

    // Observe all video elements
    const mediaEls = this.contentEl.querySelectorAll('iframe.agent-news-video, video.agent-news-video');
    mediaEls.forEach(el => this.observer!.observe(el));
  }

  private buildStatsBar(summary: AgentNewsData['summary']): HTMLElement {
    return h('div', { className: 'agent-news-stats-bar' },
      h('div', { className: 'agent-news-stat' },
        h('span', { className: 'stat-label' }, '\uC0C1\uD669'),
        h('span', { className: 'stat-value' }, escapeHtml(summary.situation)),
      ),
      h('div', { className: 'agent-news-stat' },
        h('span', { className: 'stat-label stat-casualties' }, '\uD83D\uDEA8 \uC778\uBA85'),
        h('span', { className: 'stat-value stat-casualties' }, escapeHtml(summary.casualties)),
      ),
      h('div', { className: 'agent-news-stat' },
        h('span', { className: 'stat-label' }, '\uB300\uC751'),
        h('span', { className: 'stat-value' }, escapeHtml(summary.response)),
      ),
      h('div', { className: 'agent-news-stat' },
        h('span', { className: 'stat-label' }, '\uC804\uB9DD'),
        h('span', { className: 'stat-value' }, escapeHtml(summary.outlook)),
      ),
    );
  }

  private buildItem(item: AgentNewsItem, highlight: boolean): HTMLElement {
    const sev = SEVERITY_COLORS[item.severity] || SEVERITY_COLORS.low;
    const plat = PLATFORM_LABELS[item.platform || 'news'] || PLATFORM_LABELS.news;

    const severityBadge = h('span', { className: `agent-news-severity ${sev.cls}` }, sev.icon);
    const platformBadge = h('span', { className: `agent-news-platform platform-${item.platform || 'news'}` },
      `${plat.icon} ${plat.label}`);
    const sourceBadge = h('span', { className: 'agent-news-source' }, escapeHtml(item.source));
    const absTime = new Date(item.pubDate).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    const dateEl = h('span', { className: 'agent-news-date' }, `${absTime} (${timeSince(item.pubDate)})`);

    const titleEl = h('a', {
      className: 'agent-news-title',
      href: item.link,
      target: '_blank',
      rel: 'noopener noreferrer',
    }, escapeHtml(item.title));

    const children: HTMLElement[] = [
      h('div', { className: 'agent-news-item-meta' }, severityBadge, platformBadge, sourceBadge, dateEl),
      titleEl,
    ];

    if (item.description) {
      children.push(h('div', { className: 'agent-news-desc' }, escapeHtml(item.description)));
    }

    // YouTube: show thumbnail, click to load iframe (saves performance)
    if (item.youtubeId) {
      const ytId = escapeHtml(item.youtubeId);
      const thumbUrl = `https://i.ytimg.com/vi/${ytId}/mqdefault.jpg`;
      const wrapper = h('div', { className: 'agent-news-media agent-news-yt-lazy', dataset: { ytid: ytId } });
      const thumb = h('img', {
        className: 'agent-news-yt-thumb',
        src: thumbUrl,
        alt: item.title,
        loading: 'lazy',
      });
      const playBtn = h('div', { className: 'agent-news-yt-play' }, '\u25B6');
      wrapper.appendChild(thumb);
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
    }
    else if (item.videoUrl) {
      const video = h('video', {
        className: 'agent-news-video',
        src: item.videoUrl,
        controls: 'true',
        preload: 'metadata',
        muted: 'true',
      });
      children.push(h('div', { className: 'agent-news-media' }, video));
    }

    if (item.imageUrl) {
      children.push(h('div', { className: 'agent-news-media' },
        h('img', { className: 'agent-news-image', src: item.imageUrl, alt: item.title, loading: 'lazy' }),
      ));
    } else if (item.thumbnailUrl && !item.youtubeId && !item.videoUrl) {
      children.push(h('div', { className: 'agent-news-media' },
        h('img', { className: 'agent-news-thumbnail', src: item.thumbnailUrl, alt: item.title, loading: 'lazy' }),
      ));
    }

    if (item.agentNote) {
      children.push(h('div', { className: 'agent-news-note' }, `\uD83D\uDCAC ${escapeHtml(item.agentNote)}`));
    }

    const cls = `agent-news-item${highlight ? ' agent-news-new' : ''}`;
    return h('div', { className: cls }, ...children);
  }

  override destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    super.destroy();
  }
}
