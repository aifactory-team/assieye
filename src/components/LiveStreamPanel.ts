import { h, replaceChildren } from '@/utils/dom-utils';
import { escapeHtml } from '@/utils/format';
import type { AgentNewsItem } from '@/types';

const MAX_LIVE = 3;

export class LiveStreamPanel {
  private readonly el: HTMLElement;
  private currentIds: string[] = [];

  constructor() {
    this.el = h('div', { className: 'live-stream-panel' });
    this.el.style.display = 'none';
  }

  update(items: AgentNewsItem[]): void {
    const lives = items.filter(i => i.isLive && i.youtubeId).slice(0, MAX_LIVE);

    if (lives.length === 0) {
      this.el.style.display = 'none';
      this.currentIds = [];
      return;
    }

    const ids = lives.map(l => l.youtubeId!);
    if (ids.join(',') === this.currentIds.join(',')) return;
    this.currentIds = ids;

    const closeBtn = h('button', { className: 'live-close' }, '\u2715');
    closeBtn.addEventListener('click', () => {
      this.el.style.display = 'none';
      this.currentIds = [];
    });

    const cards = lives.map((live, idx) => {
      const header = h('div', { className: 'live-card-header' },
        h('span', { className: 'live-badge' }, '\uD83D\uDD34 LIVE'),
        h('span', { className: 'live-title' }, escapeHtml(live.title)),
        h('span', { className: 'live-source' }, escapeHtml(live.source)),
      );

      const ytId = live.youtubeId!;

      if (idx === 0) {
        // First: autoplay iframe
        const iframe = h('iframe', {
          className: 'live-iframe',
          src: `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&rel=0&enablejsapi=1`,
          allow: 'accelerometer; autoplay; encrypted-media; gyroscope',
          allowFullscreen: 'true',
          frameBorder: '0',
        }) as HTMLIFrameElement;

        let muted = true;
        const muteBtn = h('button', { className: 'live-mute-btn' }, '\uD83D\uDD07');
        muteBtn.addEventListener('click', () => {
          muted = !muted;
          muteBtn.textContent = muted ? '\uD83D\uDD07' : '\uD83D\uDD0A';
          const base = `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&enablejsapi=1`;
          iframe.src = base + (muted ? '&mute=1' : '&mute=0');
        });

        return h('div', { className: 'live-card' }, header, muteBtn, iframe);
      }

      // Others: thumbnail, click to play
      const wrapper = h('div', { className: 'agent-news-yt-lazy' });
      const thumb = h('img', {
        className: 'agent-news-yt-thumb',
        src: `https://i.ytimg.com/vi/${ytId}/mqdefault.jpg`,
        alt: live.title,
      });
      const playBtn = h('div', { className: 'agent-news-yt-play' }, '\u25B6');
      wrapper.appendChild(thumb);
      wrapper.appendChild(playBtn);
      wrapper.addEventListener('click', () => {
        const iframe = h('iframe', {
          className: 'live-iframe',
          src: `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&rel=0`,
          allow: 'accelerometer; autoplay; encrypted-media; gyroscope',
          allowFullscreen: 'true',
          frameBorder: '0',
        });
        wrapper.replaceWith(iframe);
      });

      return h('div', { className: 'live-card' }, header, wrapper);
    });

    const grid = h('div', { className: 'live-grid' }, ...cards);
    replaceChildren(this.el, closeBtn, grid);
    this.el.style.display = '';
  }

  getElement(): HTMLElement {
    return this.el;
  }

  destroy(): void {
    this.el.remove();
  }
}
