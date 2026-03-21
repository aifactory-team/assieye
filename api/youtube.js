export const config = { runtime: 'edge' };
import { getCorsHeaders, isDisallowedOrigin } from './_cors.js';
import { checkRateLimit } from './_rate-limit.js';

function getDemoVideos(query) {
  return [
    { id: 'live_placeholder_1', title: `${query} - 실시간 모니터링`, url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg', published: '실시간', author: 'YTN', views: 0 },
    { id: 'live_placeholder_2', title: `${query} - 뉴스 속보`, url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg', published: '실시간', author: 'SBS 뉴스', views: 0 },
    { id: 'live_placeholder_3', title: `${query} - 현장 중계`, url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg', published: '실시간', author: 'KBS News', views: 0 },
  ];
}

const DEFAULT_SEARCHES = [
  { id: 'live-1', query: 'breaking news live', lang: 'en' },
  { id: 'live-2', query: '실시간 뉴스', lang: 'ko' },
];

export default async function handler(req) {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (isDisallowedOrigin(req)) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  const rateLimitResponse = await checkRateLimit(req, corsHeaders);
  if (rateLimitResponse) return rateLimitResponse;

  const url = new URL(req.url);
  const query = url.searchParams.get('q') || 'news live';

  try {
    // Scrape YouTube search page for video data
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(searchUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
      },
    });
    clearTimeout(timeoutId);

    let videos = [];
    if (res.ok) {
      const html = await res.text();
      // Extract video data from ytInitialData JSON embedded in the page
      const dataMatch = html.match(/var ytInitialData\s*=\s*(\{.*?\});\s*<\/script>/s);
      if (dataMatch) {
        try {
          const data = JSON.parse(dataMatch[1]);
          const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
          const items = contents?.[0]?.itemSectionRenderer?.contents || [];
          for (const item of items) {
            const vr = item.videoRenderer;
            if (!vr) continue;
            const videoId = vr.videoId;
            const title = vr.title?.runs?.[0]?.text || '';
            const author = vr.ownerText?.runs?.[0]?.text || '';
            const published = vr.publishedTimeText?.simpleText || '';
            const viewText = vr.viewCountText?.simpleText || '';
            const viewsNum = parseInt(viewText.replace(/[^0-9]/g, '') || '0');
            videos.push({
              id: videoId,
              title,
              url: `https://www.youtube.com/watch?v=${videoId}`,
              thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
              published,
              author,
              views: viewsNum,
            });
            if (videos.length >= 20) break;
          }
        } catch {
          // JSON parse failed - return empty
        }
      }
    }

    if (videos.length === 0) {
      videos = getDemoVideos(query);
    }

    return new Response(JSON.stringify({
      videos,
      query,
      searches: DEFAULT_SEARCHES,
      fetchedAt: new Date().toISOString(),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, s-maxage=300', ...corsHeaders },
    });
  } catch (err) {
    console.error('[youtube] fetch failed:', err?.message ?? err);
    const demoVideos = getDemoVideos(query);
    return new Response(JSON.stringify({ videos: demoVideos, query, searches: DEFAULT_SEARCHES, fetchedAt: new Date().toISOString(), demo: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}
