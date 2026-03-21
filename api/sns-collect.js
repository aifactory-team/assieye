import { getCorsHeaders, isDisallowedOrigin } from './_cors.js';

export const config = { runtime: 'edge' };

/**
 * SNS collection endpoint - scrapes social media via web search
 * POST /api/sns-collect?topic=daejeon-fire&platform=twitter
 */
export default async function handler(req) {
  if (isDisallowedOrigin(req)) {
    return new Response('Forbidden', { status: 403 });
  }
  const corsHeaders = getCorsHeaders(req, 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const topic = url.searchParams.get('topic') || 'daejeon-fire';
  const platform = url.searchParams.get('platform') || 'twitter';

  const keywords = {
    'daejeon-fire': ['대전 화재', '대전 공장 화재', 'Daejeon fire'],
    'bts-concert': ['BTS 광화문', 'BTS concert Gwanghwamun', 'BTS 콘서트'],
  };

  const topicKeywords = keywords[topic] || [topic];
  const query = `${topicKeywords[0]} ${platform === 'twitter' ? 'site:x.com OR site:twitter.com' : platform === 'instagram' ? 'site:instagram.com' : 'site:facebook.com'}`;

  try {
    // Use Google search to find SNS posts
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=10&tbs=qdr:h12`;
    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AssiEye/1.0)' },
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ items: [], error: 'Search failed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const html = await res.text();
    // Extract links and titles from search results
    const items = [];
    const linkRegex = /href="\/url\?q=([^&"]+)/g;
    const titleRegex = /<h3[^>]*>([^<]+)<\/h3>/g;
    let linkMatch, titleMatch;

    while ((linkMatch = linkRegex.exec(html)) && items.length < 10) {
      titleMatch = titleRegex.exec(html);
      const link = decodeURIComponent(linkMatch[1]);
      const title = titleMatch ? titleMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') : '';

      if (link.includes(platform === 'twitter' ? 'x.com' : platform)) {
        items.push({
          title: title || link.split('/').pop(),
          link,
          pubDate: new Date().toISOString(),
          source: platform === 'twitter' ? 'X' : platform,
          platform,
        });
      }
    }

    return new Response(JSON.stringify({ items, count: items.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=900' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ items: [], error: String(err) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
