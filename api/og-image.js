import { getCorsHeaders, isDisallowedOrigin } from './_cors.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (isDisallowedOrigin(req)) {
    return new Response('Forbidden', { status: 403 });
  }

  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: 'url parameter required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AssiEye/1.0)' },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return new Response(JSON.stringify({ imageUrl: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
      });
    }

    // Only read first 15KB to find og:image
    const reader = res.body?.getReader();
    let html = '';
    if (reader) {
      while (html.length < 15000) {
        const { done, value } = await reader.read();
        if (done) break;
        html += new TextDecoder().decode(value);
      }
      reader.cancel();
    }

    // Extract og:image
    const match = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);

    const imageUrl = match?.[1] || null;

    return new Response(JSON.stringify({ imageUrl }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=86400', // Cache 24h
      },
    });
  } catch {
    return new Response(JSON.stringify({ imageUrl: null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
    });
  }
}
