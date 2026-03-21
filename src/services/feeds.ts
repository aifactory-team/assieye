import type { RssFeedItem } from '@/types';
import type { TopicFeedSource } from '@/config/topics/types';

const API_URL = '/api/feeds';

function sortByDate(items: RssFeedItem[]): RssFeedItem[] {
  return [...items].sort((a, b) => {
    const ta = new Date(a.pubDate).getTime();
    const tb = new Date(b.pubDate).getTime();
    return tb - ta;
  });
}

function dedup(items: RssFeedItem[]): RssFeedItem[] {
  const seen = new Set<string>();
  const unique: RssFeedItem[] = [];
  for (const item of items) {
    const key = item.link || item.id;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }
  return unique;
}

/**
 * Fetch RSS feed items from the server-side proxy.
 * @param sourceId Optional feed source id to restrict results.
 */
export async function fetchFeeds(sourceId?: string): Promise<RssFeedItem[]> {
  const url = sourceId ? `${API_URL}?source=${encodeURIComponent(sourceId)}` : API_URL;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Feeds API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { items: RssFeedItem[]; fetchedAt: string };
  return dedup(sortByDate(data.items ?? []));
}

export async function fetchFeedsForTopic(sources: TopicFeedSource[]): Promise<RssFeedItem[]> {
  const res = await fetch('/api/feeds', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sources }),
  });
  if (!res.ok) throw new Error(`Feeds error: ${res.status}`);
  const data = (await res.json()) as { items: RssFeedItem[] };
  return dedup(sortByDate(data.items ?? []));
}
