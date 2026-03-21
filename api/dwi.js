export const config = { runtime: 'edge' };

import { getCorsHeaders, isDisallowedOrigin } from './_cors.js';
import { checkRateLimit } from './_rate-limit.js';

/**
 * Approximate land mask for the Korean peninsula.
 * Returns true if (lat, lng) is roughly on land.
 * Uses simplified longitude ranges per latitude band.
 */
function isKoreaLand(lat, lng) {
  // Hard east boundary - nothing east of 130°E is Korea
  if (lng > 130.0) return false;

  // Jeju island (tighter bounds)
  if (lat >= 33.1 && lat <= 33.55 && lng >= 126.15 && lng <= 126.95) return true;
  // Southern coast (narrower east boundary to exclude Tsushima)
  if (lat >= 34.0 && lat <= 34.5 && lng >= 126.3 && lng <= 128.8) return true;
  if (lat >= 34.5 && lat <= 35.0 && lng >= 126.5 && lng <= 129.1) return true;
  // Central-south (tighter west to exclude Yellow Sea)
  if (lat >= 35.0 && lat <= 35.5 && lng >= 126.8 && lng <= 129.4) return true;
  if (lat >= 35.5 && lat <= 36.0 && lng >= 126.6 && lng <= 129.5) return true;
  // Central
  if (lat >= 36.0 && lat <= 36.5 && lng >= 126.5 && lng <= 129.4) return true;
  if (lat >= 36.5 && lat <= 37.0 && lng >= 126.4 && lng <= 129.2) return true;
  // Seoul / Gyeonggi
  if (lat >= 37.0 && lat <= 37.5 && lng >= 126.5 && lng <= 129.1) return true;
  if (lat >= 37.5 && lat <= 38.0 && lng >= 126.3 && lng <= 128.8) return true;
  // Gangwon (narrower)
  if (lat >= 38.0 && lat <= 38.6 && lng >= 127.0 && lng <= 128.7) return true;
  // North Korea
  if (lat >= 38.0 && lat <= 39.5 && lng >= 124.5 && lng <= 129.0) return true;
  if (lat >= 39.5 && lat <= 41.0 && lng >= 124.8 && lng <= 129.5) return true;
  if (lat >= 41.0 && lat <= 43.0 && lng >= 126.5 && lng <= 130.0) return true;
  return false;
}

/**
 * Build a 0.25-degree grid covering the Korean peninsula (land only).
 */
function buildGrid() {
  const points = [];
  for (let lat = 33; lat <= 43; lat += 0.25) {
    for (let lng = 124; lng <= 132; lng += 0.25) {
      const rLat = Math.round(lat * 100) / 100;
      const rLng = Math.round(lng * 100) / 100;
      if (isKoreaLand(rLat, rLng)) {
        points.push({ lat: rLat, lng: rLng });
      }
    }
  }
  return points;
}

function calcRisk(temp, windSpeed, humidity, rainfall) {
  const score = temp * 2 + windSpeed * 3 - humidity * 0.5 - rainfall * 10;
  return Math.max(0, Math.min(100, score));
}

function riskLevel(score) {
  if (score <= 20) return '안전';
  if (score <= 50) return '주의';
  if (score <= 65) return '경고';
  if (score <= 85) return '위험';
  return '매우위험';
}

export default async function handler(req) {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (isDisallowedOrigin(req)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const rateLimitResponse = await checkRateLimit(req, corsHeaders);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const grid = buildGrid();

    // Split into batches of 50 to avoid URL length limits
    const BATCH_SIZE = 50;
    const allResults = [];

    for (let i = 0; i < grid.length; i += BATCH_SIZE) {
      const batch = grid.slice(i, i + BATCH_SIZE);
      const lats = batch.map((p) => p.lat).join(',');
      const lngs = batch.map((p) => p.lng).join(',');

      const apiUrl =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${lats}&longitude=${lngs}` +
        `&current=temperature_2m,wind_speed_10m,relative_humidity_2m,precipitation` +
        `&timezone=Asia%2FSeoul`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const apiRes = await fetch(apiUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!apiRes.ok) throw new Error(`Open-Meteo responded ${apiRes.status}`);
        const json = await apiRes.json();
        const results = Array.isArray(json) ? json : [json];
        allResults.push(...results);
      } catch (batchErr) {
        clearTimeout(timeoutId);
        // Fill failed batch with defaults
        for (let j = 0; j < batch.length; j++) allResults.push(null);
      }
    }

    const cells = grid.map((point, i) => {
      const entry = allResults[i];
      const current = entry?.current ?? {};
      const temp = current.temperature_2m ?? 15;
      const wind = current.wind_speed_10m ?? 0;
      const humidity = current.relative_humidity_2m ?? 60;
      const rain = current.precipitation ?? 0;
      const riskIndex = calcRisk(temp, wind, humidity, rain);
      return {
        lat: point.lat,
        lng: point.lng,
        riskIndex,
        level: riskLevel(riskIndex),
      };
    });

    return new Response(
      JSON.stringify({ cells, date: new Date().toISOString().slice(0, 10) }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=86400',
          ...corsHeaders,
        },
      },
    );
  } catch (err) {
    console.error('[dwi] fetch failed:', err?.message ?? err);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch DWI data' }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    );
  }
}
