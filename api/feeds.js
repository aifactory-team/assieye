export const config = { runtime: 'edge' };

import { getCorsHeaders, isDisallowedOrigin } from './_cors.js';
import { checkRateLimit } from './_rate-limit.js';
import { XMLParser } from 'fast-xml-parser';

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

const FEED_SOURCES = [
  {
    id: 'forest-news',
    name: '뉴스',
    url: 'https://news.google.com/rss/search?q=%EB%89%B4%EC%8A%A4&hl=ko&gl=KR&ceid=KR:ko',
    lang: 'ko',
    category: 'policy',
  },
  {
    id: 'policy',
    name: '정부 정책',
    url: 'https://www.korea.kr/rss/policy.xml',
    lang: 'ko',
    category: 'policy',
  },
  {
    id: 'climate-news',
    name: '기후·환경 뉴스',
    url: 'https://news.google.com/rss/search?q=%EA%B8%B0%ED%9B%84+%ED%99%98%EA%B2%BD+%EC%82%B0%EB%A6%BC&hl=ko&gl=KR&ceid=KR:ko',
    lang: 'ko',
    category: 'monitoring',
  },
  {
    id: 'wildfire-intl',
    name: 'Wildfire News',
    url: 'https://news.google.com/rss/search?q=wildfire+forest+fire&hl=en&gl=US&ceid=US:en',
    lang: 'en',
    category: 'international',
  },
];

/**
 * Strip HTML tags from a string.
 * @param {string} html
 * @returns {string}
 */
function stripHtml(html) {
  return String(html).replace(/<[^>]+>/g, '').trim();
}

/**
 * Coerce a parsed value to a plain string.
 * fast-xml-parser may return objects for CDATA or mixed nodes.
 * @param {unknown} val
 * @returns {string}
 */
function toStr(val) {
  if (val == null) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'object' && '#text' in val) return String(val['#text']).trim();
  return String(val).trim();
}

/**
 * Parse RSS/Atom XML and return normalised items.
 * @param {string} xml
 * @param {{ id: string; name: string; lang: string; category: string }} source
 * @returns {Array<object>}
 */
function parseXml(xml, source) {
  let parsed;
  try {
    parsed = xmlParser.parse(xml);
  } catch {
    return [];
  }

  // RSS: parsed.rss.channel.item
  // Atom: parsed.feed.entry
  let rawItems = [];
  if (parsed?.rss?.channel) {
    const ch = parsed.rss.channel;
    rawItems = Array.isArray(ch.item) ? ch.item : ch.item ? [ch.item] : [];
  } else if (parsed?.feed) {
    const feed = parsed.feed;
    rawItems = Array.isArray(feed.entry) ? feed.entry : feed.entry ? [feed.entry] : [];
  }

  const items = [];
  for (const raw of rawItems) {
    const title = toStr(raw.title) || '(제목 없음)';

    // Link: RSS <link> text, Atom <link href="..."/>
    let link = '';
    if (raw.link) {
      if (typeof raw.link === 'string') {
        link = raw.link.trim();
      } else if (typeof raw.link === 'object') {
        // Atom: { '@_href': '...' } or array
        const linkObj = Array.isArray(raw.link) ? raw.link[0] : raw.link;
        link = toStr(linkObj['@_href'] ?? linkObj);
      }
    }

    // Date
    const pubDate =
      toStr(raw.pubDate) ||
      toStr(raw.updated) ||
      toStr(raw.published) ||
      new Date().toISOString();

    // Description / summary / content
    const descRaw = raw.description ?? raw.summary ?? raw['content:encoded'] ?? raw.content ?? '';
    const description = stripHtml(toStr(descRaw)).substring(0, 500);

    // Guid / id
    const guid = toStr(raw.guid) || toStr(raw.id) || link;

    if (!link && !title) continue;

    // Extract thumbnail from RSS media tags
    const mediaContent = raw['media:content'] || raw['media:group']?.['media:content'];
    const mediaThumbnail = raw['media:thumbnail'];
    const enclosure = raw.enclosure;
    let thumbnailUrl = '';
    if (mediaContent?.['@_url']) {
      thumbnailUrl = mediaContent['@_url'];
    } else if (Array.isArray(mediaContent) && mediaContent[0]?.['@_url']) {
      thumbnailUrl = mediaContent[0]['@_url'];
    } else if (mediaThumbnail?.['@_url']) {
      thumbnailUrl = mediaThumbnail['@_url'];
    } else if (enclosure?.['@_url'] && enclosure?.['@_type']?.startsWith('image')) {
      thumbnailUrl = enclosure['@_url'];
    }

    items.push({
      id: `${source.id}:${guid || title}`,
      title,
      link,
      pubDate,
      source: source.name,
      description,
      category: source.category,
      lang: source.lang,
      thumbnailUrl: thumbnailUrl || undefined,
    });
  }

  return items;
}

/**
 * Fetch one feed with a timeout, returning [] on failure.
 * @param {{ id: string; name: string; url: string; lang: string; category: string }} source
 * @returns {Promise<Array<object>>}
 */
async function fetchFeedSource(source) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(source.url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'AssiEye/1.0 (+https://assieye.vercel.app)' },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[feeds] ${source.id} responded ${res.status}`);
      return [];
    }

    const text = await res.text();
    return parseXml(text, source);
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn(`[feeds] ${source.id} fetch failed:`, err?.message ?? err);
    return [];
  }
}

export default async function handler(req) {
  const corsHeaders = getCorsHeaders(req, 'GET, POST, OPTIONS');

  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Block disallowed origins
  if (isDisallowedOrigin(req)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // Rate limit
  const rateLimitResponse = await checkRateLimit(req, corsHeaders);
  if (rateLimitResponse) return rateLimitResponse;

  // Determine feed sources: POST body takes precedence over hardcoded list
  let feedSources = FEED_SOURCES;

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      if (body.sources && Array.isArray(body.sources)) {
        // Use provided sources instead of hardcoded FEED_SOURCES
        feedSources = body.sources;
      }
    } catch (e) {
      // Fall through to default sources
    }
  }

  const url = new URL(req.url);
  const sourceParam = url.searchParams.get('source');

  const sources = sourceParam
    ? feedSources.filter((s) => s.id === sourceParam)
    : feedSources;

  if (sources.length === 0) {
    return new Response(JSON.stringify({ error: 'Unknown source' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // Fetch all sources in parallel
  const results = await Promise.all(sources.map(fetchFeedSource));
  const items = results.flat();

  return new Response(
    JSON.stringify({ items, fetchedAt: new Date().toISOString() }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=1800',
        ...corsHeaders,
      },
    },
  );
}
