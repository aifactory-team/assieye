import { getCorsHeaders, isDisallowedOrigin } from './_cors.js';

export const config = { runtime: 'edge' };

/**
 * Fetch a Yahoo Finance crumb+cookie pair required for API access.
 * Steps: 1) Hit fc.yahoo.com to get session cookies, 2) Use cookies to fetch crumb.
 */
async function getYahooCrumb() {
  // Step 1: Get session cookie
  const cookieRes = await fetch('https://fc.yahoo.com', {
    redirect: 'manual',
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    signal: AbortSignal.timeout(5000),
  });
  const setCookie = cookieRes.headers.get('set-cookie') || '';

  // Step 2: Get crumb using the cookie
  const crumbRes = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Cookie': setCookie,
    },
    signal: AbortSignal.timeout(5000),
  });

  if (!crumbRes.ok) return null;
  const crumb = await crumbRes.text();
  return { crumb: crumb.trim(), cookie: setCookie };
}

/**
 * Fetch quotes using Yahoo Finance v7 API with crumb authentication.
 */
async function fetchWithCrumb(symbolList) {
  const auth = await getYahooCrumb();
  if (!auth) return null;

  const symbolsParam = symbolList.map(s => encodeURIComponent(s)).join(',');
  const apiUrl = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${symbolsParam}&crumb=${encodeURIComponent(auth.crumb)}`;

  const res = await fetch(apiUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Cookie': auth.cookie,
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return (data.quoteResponse?.result || []).map(q => ({
    symbol: q.symbol,
    name: q.shortName || q.longName || q.symbol,
    price: q.regularMarketPrice,
    change: q.regularMarketChange,
    changePercent: q.regularMarketChangePercent,
    previousClose: q.regularMarketPreviousClose,
    currency: q.currency || 'USD',
    marketState: q.marketState,
    dayHigh: q.regularMarketDayHigh,
    dayLow: q.regularMarketDayLow,
    volume: q.regularMarketVolume,
  }));
}

/**
 * Fallback: fetch individual symbol quotes via v8 chart endpoint (no auth needed).
 */
async function fetchViaChart(symbolList) {
  const quotes = [];
  // Fetch up to 5 symbols in parallel to avoid rate limiting
  const batch = symbolList.slice(0, 10);
  const results = await Promise.allSettled(
    batch.map(async (symbol) => {
      const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
      const res = await fetch(chartUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const meta = data.chart?.result?.[0]?.meta;
      if (!meta) return null;
      return {
        symbol: meta.symbol,
        name: meta.shortName || meta.longName || meta.symbol,
        price: meta.regularMarketPrice,
        change: meta.regularMarketPrice - (meta.chartPreviousClose || meta.previousClose || meta.regularMarketPrice),
        changePercent: meta.chartPreviousClose
          ? ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100
          : 0,
        previousClose: meta.chartPreviousClose || meta.previousClose,
        currency: meta.currency || 'USD',
        marketState: meta.marketState || 'UNKNOWN',
      };
    })
  );

  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) quotes.push(r.value);
  }
  return quotes.length > 0 ? quotes : null;
}

export default async function handler(req) {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (isDisallowedOrigin(req)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }

  const url = new URL(req.url);
  const symbols = url.searchParams.get('symbols'); // comma-separated: "005930.KS,^KS11,CL=F"

  if (!symbols) {
    return new Response(JSON.stringify({ error: 'Missing symbols parameter' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  try {
    const symbolList = symbols.split(',').map(s => s.trim()).slice(0, 20);

    // Strategy 1: Try v7 API with crumb authentication
    let quotes = await fetchWithCrumb(symbolList);

    // Strategy 2: Fallback to v8 chart endpoint (per-symbol)
    if (!quotes) {
      quotes = await fetchViaChart(symbolList);
    }

    if (!quotes || quotes.length === 0) {
      throw new Error('All Yahoo Finance strategies failed');
    }

    return new Response(JSON.stringify({ quotes, fetchedAt: new Date().toISOString() }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60', ...corsHeaders },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to fetch market data', detail: err.message }), {
      status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}
