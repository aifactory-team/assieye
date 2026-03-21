import { getCorsHeaders, isDisallowedOrigin } from './_cors.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (isDisallowedOrigin(req)) {
    return new Response('Forbidden', { status: 403 });
  }

  const corsHeaders = getCorsHeaders(req, 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const now = new Date();
  const hour = now.getHours();

  // Time-based realistic simulation
  const baseVisitors = 12;
  const peakMultiplier = hour >= 13 && hour <= 20 ? 3 : hour >= 9 && hour <= 23 ? 2 : 1;
  const concurrent = baseVisitors * peakMultiplier + Math.floor(Math.random() * 8);
  const todayViews = concurrent * 15 + Math.floor(Math.random() * 50) + hour * 20;
  const totalViews = 2847 + todayViews;
  const uniqueToday = Math.ceil(todayViews * 0.6);
  const peakConcurrent = Math.max(concurrent, Math.floor(baseVisitors * 3.5));

  return new Response(JSON.stringify({
    concurrent,
    todayViews,
    totalViews,
    uniqueToday,
    peakConcurrent,
    serverTime: now.toISOString(),
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
  });
}
