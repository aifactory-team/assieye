import type { RssFeedItem } from '@/types';

const CACHE_PREFIX = 'assieye-summary-';
const MAX_CONCURRENT = 1;
const REQUEST_DELAY_MS = 2000;

let pendingRequests = 0;

async function hashText(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

function getCachedSummary(hash: string): string | null {
  try {
    return localStorage.getItem(CACHE_PREFIX + hash);
  } catch {
    return null;
  }
}

function setCachedSummary(hash: string, summary: string): void {
  try {
    localStorage.setItem(CACHE_PREFIX + hash, summary);
  } catch {
    // Storage full - ignore
  }
}

async function waitForSlot(): Promise<void> {
  while (pendingRequests >= MAX_CONCURRENT) {
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

export async function summarizeArticle(item: RssFeedItem): Promise<string> {
  const text = `${item.title}\n\n${item.description || ''}`;
  const hash = await hashText(text);

  const cached = getCachedSummary(hash);
  if (cached) return cached;

  await waitForSlot();
  pendingRequests++;

  try {
    const res = await fetch('/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lang: item.lang, mode: 'summary' }),
    });

    if (!res.ok) throw new Error(`Summarize API error: ${res.status}`);

    const data = await res.json() as { summary: string };
    setCachedSummary(hash, data.summary);

    await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY_MS));

    return data.summary;
  } finally {
    pendingRequests--;
  }
}

export async function generateDailyBrief(items: RssFeedItem[], systemPrompt?: string, lang?: string): Promise<string> {
  const text = items
    .slice(0, 20)
    .map(item => `[${item.source}] ${item.title}\n${item.description || ''}`)
    .join('\n\n---\n\n');

  const hash = await hashText(text);
  const cached = getCachedSummary(hash);
  if (cached) return cached;

  await waitForSlot();
  pendingRequests++;

  try {
    const res = await fetch('/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lang: lang ?? 'ko', mode: 'brief', systemPrompt }),
    });

    if (!res.ok) throw new Error(`Summarize API error: ${res.status}`);

    const data = await res.json() as { summary: string };
    setCachedSummary(hash, data.summary);

    return data.summary;
  } finally {
    pendingRequests--;
  }
}
