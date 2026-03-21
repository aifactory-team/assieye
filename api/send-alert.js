import { getCorsHeaders, isDisallowedOrigin } from './_cors.js';
import { checkRateLimit } from './_rate-limit.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const corsHeaders = getCorsHeaders(req, 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  if (isDisallowedOrigin(req)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  const rateLimited = await checkRateLimit(req, corsHeaders);
  if (rateLimited) return rateLimited;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return new Response(JSON.stringify({ error: 'Telegram not configured' }), {
      status: 503, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  try {
    const body = await req.json();
    const { lat, lng, brightness, frp, confidence, satellite, acqTime } = body;

    const message = [
      'AssiEye 경보',
      '',
      `위치: ${lat}, ${lng}`,
      `시간: ${acqTime}`,
      `위성: ${satellite}`,
      `신뢰도: ${confidence}`,
      `밝기: ${brightness}K`,
      `FRP: ${frp} MW`,
    ].join('\n');

    const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;
    const telegramRes = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
      signal: AbortSignal.timeout(10000),
    });

    if (!telegramRes.ok) {
      const errText = await telegramRes.text();
      throw new Error(`Telegram API error: ${telegramRes.status} ${errText}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to send alert', detail: err.message }), {
      status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}
