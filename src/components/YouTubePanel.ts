import { Panel } from './Panel';
import { t } from '@/services/i18n';
import { h, replaceChildren } from '@/utils/dom-utils';
import type { YouTubeVideo, YouTubeSearchOption } from '@/services/youtube';

const DEFAULT_SEARCHES: YouTubeSearchOption[] = [
  { id: 'live-1', query: 'breaking news live', lang: 'en' },
  { id: 'live-2', query: '실시간 뉴스', lang: 'ko' },
];

const ROTATE_INTERVAL = 30_000;

export class YouTubePanel extends Panel {
  private videos: YouTubeVideo[] = [];
  private searches: YouTubeSearchOption[] = DEFAULT_SEARCHES;
  private activeQuery: string = DEFAULT_SEARCHES[0]!.query;
  private activeVideoIndex = 0;
  private rotateTimer: ReturnType<typeof setInterval> | null = null;
  public onQueryChange?: (query: string) => void;

  constructor() {
    super({
      id: 'youtube',
      title: t('panels.youtube') || 'YouTube',
      showCount: true,
    });
  }

  public update(videos: YouTubeVideo[], searches?: YouTubeSearchOption[]): void {
    // Sort by published date descending (newest first)
    this.videos = [...videos].sort((a, b) =>
      new Date(b.published).getTime() - new Date(a.published).getTime(),
    );
    if (searches) {
      this.searches = searches;
    }
    this.setCount(videos.length);
    this.activeVideoIndex = 0;
    this.startRotation();
    this.render();
  }

  private startRotation(): void {
    this.stopRotation();
    if (this.videos.length <= 1) return;
    this.rotateTimer = setInterval(() => {
      this.activeVideoIndex = (this.activeVideoIndex + 1) % this.videos.length;
      this.render();
    }, ROTATE_INTERVAL);
  }

  private stopRotation(): void {
    if (this.rotateTimer) {
      clearInterval(this.rotateTimer);
      this.rotateTimer = null;
    }
  }

  private selectVideo(index: number): void {
    this.activeVideoIndex = index;
    this.startRotation();
    this.render();
  }

  private render(): void {
    const tabs = this.buildTabs();

    if (this.videos.length === 0) {
      replaceChildren(
        this.contentEl,
        tabs,
        h('div', { className: 'youtube-empty' }, '영상이 없습니다'),
      );
      return;
    }

    const activeVideo = this.videos[this.activeVideoIndex];
    const player = activeVideo
      ? this.buildPlayer(activeVideo)
      : h('div', {});

    const cards = this.videos.slice(0, 20).map((video, i) => this.buildCard(video, i));
    const list = h('div', { className: 'youtube-list' }, ...cards);

    replaceChildren(this.contentEl, tabs, player, list);
  }

  private buildPlayer(video: YouTubeVideo): HTMLElement {
    const iframe = h('iframe', {
      className: 'youtube-player-iframe',
      src: `https://www.youtube.com/embed/${video.id}?autoplay=1&mute=1&rel=0`,
      allow: 'autoplay; encrypted-media',
      allowFullscreen: 'true',
      frameBorder: '0',
    });
    return h('div', { className: 'youtube-player' }, iframe);
  }

  private buildTabs(): HTMLElement {
    return h(
      'div',
      { className: 'youtube-tabs' },
      ...this.searches.map((search) => {
        const btn = h(
          'button',
          {
            className: `youtube-tab${search.query === this.activeQuery ? ' active' : ''}`,
            dataset: { query: search.query },
          },
          search.query,
        );
        btn.addEventListener('click', () => {
          this.activeQuery = search.query;
          this.onQueryChange?.(this.activeQuery);
          this.render();
        });
        return btn;
      }),
    );
  }

  private buildCard(video: YouTubeVideo, index: number): HTMLElement {
    const isActive = index === this.activeVideoIndex;

    const thumbnail = h('img', {
      className: 'youtube-thumb',
      src: video.thumbnail,
      alt: video.title,
      width: '80',
      height: '45',
    });

    const title = h('div', { className: 'youtube-card-title' }, video.title);
    const pubTime = video.published
      ? new Date(video.published).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
      : '';
    const author = h('div', { className: 'youtube-card-author' }, `${video.author}${pubTime ? ` · ${pubTime}` : ''}`);

    const info = h('div', { className: 'youtube-card-info' }, title, author);

    const card = h(
      'div',
      {
        className: `youtube-card${isActive ? ' youtube-card--active' : ''}`,
      },
      thumbnail,
      info,
    );

    card.addEventListener('click', (e) => {
      e.preventDefault();
      this.selectVideo(index);
    });

    return card;
  }

  override destroy(): void {
    this.stopRotation();
    super.destroy();
  }
}
