import type { AgentNewsData, AgentNewsItem, AgentNewsSummary, AgentNewsPlatform } from '@/types';

let BASE_PATH = '/data/daejeon-fire';

/** Set the active topic for agent news data loading */
export function setAgentNewsTopic(topicId: string): void {
  BASE_PATH = `/data/${topicId}`;
}

const CHANNELS: { dir: string; platform: AgentNewsPlatform }[] = [
  { dir: 'news', platform: 'news' },
  { dir: 'youtube', platform: 'youtube' },
  { dir: 'x', platform: 'twitter' },
  { dir: 'instagram', platform: 'instagram' },
  { dir: 'facebook', platform: 'facebook' },
  { dir: 'tiktok', platform: 'tiktok' },
  { dir: 'threads', platform: 'threads' },
];

const DEFAULT_SUMMARY: AgentNewsSummary = {
  situation: '모니터링 중',
  casualties: '확인 중',
  response: '확인 중',
  outlook: '확인 중',
  lastAnalysis: new Date().toISOString(),
};

/** Fetch the channel index and return items with platform set */
async function fetchChannelItems(dir: string, platform: AgentNewsPlatform): Promise<AgentNewsItem[]> {
  try {
    const res = await fetch(`${BASE_PATH}/${dir}/index.json?t=${Date.now()}`);
    if (!res.ok) return [];
    const files: string[] = await res.json();

    const items: AgentNewsItem[] = [];
    const fetches = files.slice(0, 200).map(async (file) => {
      try {
        const r = await fetch(`${BASE_PATH}/${dir}/${file}`);
        if (!r.ok) return;
        const raw = await r.json();
        items.push({
          id: raw.id || file.replace('.json', ''),
          title: raw.title || '',
          link: raw.link || '',
          pubDate: raw.pubDate || raw.collectedAt || '',
          source: raw.source || '',
          description: raw.description || '',
          category: raw.category || 'news',
          lang: raw.lang || 'ko',
          severity: raw.severity || 'medium',
          tags: raw.tags || [],
          agentNote: raw.agentNote || '',
          platform,
          imageUrl: raw.imageUrl,
          videoUrl: raw.videoUrl,
          youtubeId: raw.youtubeId || extractYoutubeId(raw.link, platform),
          thumbnailUrl: raw.thumbnailUrl || extractYoutubeThumbnail(raw.link, platform),
          isLive: raw.isLive ?? detectLive(raw.title, platform),
        });
      } catch { /* skip */ }
    });
    await Promise.allSettled(fetches);
    return items;
  } catch {
    return [];
  }
}

/** Fetch summary from summary.json, fallback to news.json */
async function fetchSummary(): Promise<AgentNewsSummary> {
  try {
    // Try summary.json first
    const res = await fetch(`${BASE_PATH}/summary.json?t=${Date.now()}`);
    if (res.ok) return await res.json();
  } catch { /* fall through */ }

  try {
    // Fallback to news.json summary field
    const res = await fetch(`${BASE_PATH}/news.json?t=${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.summary) return data.summary;
    }
  } catch { /* fall through */ }

  return DEFAULT_SUMMARY;
}

function detectLive(title: string, platform: AgentNewsPlatform): boolean {
  if (platform !== 'youtube') return false;
  if (!title) return false;
  const t = title.toLowerCase();
  return t.includes('live') || t.includes('생중계') || t.includes('라이브') || t.includes('🔴');
}

function extractYoutubeId(link: string, platform: AgentNewsPlatform): string | undefined {
  if (platform !== 'youtube' || !link) return undefined;
  const m = link.match(/(?:watch\?v=|shorts\/)([a-zA-Z0-9_-]{11})/);
  return m?.[1];
}

function extractYoutubeThumbnail(link: string, platform: AgentNewsPlatform): string | undefined {
  const id = extractYoutubeId(link, platform);
  return id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : undefined;
}

export async function fetchAgentNews(): Promise<AgentNewsData> {
  // Fetch all channels + summary in parallel
  const [channelResults, summary] = await Promise.all([
    Promise.allSettled(CHANNELS.map(ch => fetchChannelItems(ch.dir, ch.platform))),
    fetchSummary(),
  ]);

  const allItems: AgentNewsItem[] = [];
  for (const r of channelResults) {
    if (r.status === 'fulfilled') allItems.push(...r.value);
  }

  // Sort newest first
  allItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

  return {
    meta: {
      topic: 'daejeon-fire',
      lastUpdated: new Date().toISOString(),
      agentId: 'claude-code',
      updateCount: allItems.length,
      searchQueries: ['대전 화재'],
    },
    items: allItems,
    summary,
  };
}

export class AgentNewsWatcher {
  private lastItemCount = -1;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  start(onUpdate: (data: AgentNewsData) => void, intervalMs = 10_000): void {
    // Delay first poll to allow map to finish loading
    setTimeout(() => {
      this.poll(onUpdate, true);
      this.intervalId = setInterval(() => this.poll(onUpdate, false), intervalMs);
    }, 3000);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async poll(onUpdate: (data: AgentNewsData) => void, force = false): Promise<void> {
    try {
      const data = await fetchAgentNews();
      if (force || data.items.length !== this.lastItemCount) {
        this.lastItemCount = data.items.length;
        onUpdate(data);
      }
    } catch {
      // Silently ignore fetch errors
    }
  }
}
