export const config = { runtime: 'edge' };
import { getCorsHeaders, isDisallowedOrigin } from './_cors.js';
import { checkRateLimit } from './_rate-limit.js';

// Key satellite groups to track
const TLE_SOURCES = [
  { id: 'weather', name: '기상위성', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=weather&FORMAT=tle' },
  { id: 'earth-obs', name: '지구관측', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=resource&FORMAT=tle' },
  { id: 'active', name: '활성위성', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle' },
];

function generateDemoSatellites() {
  return [
    { id: '25338', name: 'NOAA 15', tle1: '', tle2: '', inclination: 98.7, eccentricity: 0.0011, meanMotion: 14.26, epochYear: 2024, epochDay: 180 },
    { id: '28654', name: 'NOAA 18', tle1: '', tle2: '', inclination: 99.0, eccentricity: 0.0014, meanMotion: 14.23, epochYear: 2024, epochDay: 181 },
    { id: '33591', name: 'NOAA 19', tle1: '', tle2: '', inclination: 99.2, eccentricity: 0.0013, meanMotion: 14.12, epochYear: 2024, epochDay: 179 },
    { id: '37849', name: 'SUOMI NPP', tle1: '', tle2: '', inclination: 98.7, eccentricity: 0.0001, meanMotion: 14.19, epochYear: 2024, epochDay: 182 },
    { id: '43013', name: 'NOAA 20 (JPSS-1)', tle1: '', tle2: '', inclination: 98.7, eccentricity: 0.0001, meanMotion: 14.19, epochYear: 2024, epochDay: 183 },
    { id: '40069', name: 'HIMAWARI-8', tle1: '', tle2: '', inclination: 0.03, eccentricity: 0.0001, meanMotion: 1.0027, epochYear: 2024, epochDay: 180 },
    { id: '29155', name: 'GOES 13', tle1: '', tle2: '', inclination: 0.06, eccentricity: 0.0004, meanMotion: 1.0027, epochYear: 2024, epochDay: 181 },
    { id: '36411', name: 'COMS-1 (천리안)', tle1: '', tle2: '', inclination: 0.1, eccentricity: 0.0002, meanMotion: 1.0027, epochYear: 2024, epochDay: 178 },
    { id: '43823', name: 'GEO-KOMPSAT-2A', tle1: '', tle2: '', inclination: 0.04, eccentricity: 0.0001, meanMotion: 1.0027, epochYear: 2024, epochDay: 184 },
    { id: '52938', name: 'GEO-KOMPSAT-2B', tle1: '', tle2: '', inclination: 0.05, eccentricity: 0.0001, meanMotion: 1.0027, epochYear: 2024, epochDay: 185 },
  ];
}

function parseTle(text) {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
  const sats = [];
  for (let i = 0; i + 2 < lines.length; i += 3) {
    const name = lines[i].replace(/^0 /, '').trim();
    const line1 = lines[i + 1];
    const line2 = lines[i + 2];
    if (!line1.startsWith('1 ') || !line2.startsWith('2 ')) continue;
    const noradId = line1.substring(2, 7).trim();
    const inclination = parseFloat(line2.substring(8, 16));
    const eccentricity = parseFloat('0.' + line2.substring(26, 33));
    const meanMotion = parseFloat(line2.substring(52, 63));
    // Approximate current position using epoch & mean motion (rough)
    const epochYear = parseInt(line1.substring(18, 20));
    const epochDay = parseFloat(line1.substring(20, 32));
    const year = epochYear < 57 ? 2000 + epochYear : 1900 + epochYear;
    sats.push({
      id: noradId,
      name,
      tle1: line1,
      tle2: line2,
      inclination,
      eccentricity,
      meanMotion,
      epochYear: year,
      epochDay,
    });
  }
  return sats;
}

export default async function handler(req) {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (isDisallowedOrigin(req)) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  const rateLimitResponse = await checkRateLimit(req, corsHeaders);
  if (rateLimitResponse) return rateLimitResponse;

  const url = new URL(req.url);
  const group = url.searchParams.get('group') || 'weather';
  const source = TLE_SOURCES.find(s => s.id === group) || TLE_SOURCES[0];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(source.url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`CelesTrak responded ${res.status}`);
    const text = await res.text();
    const satellites = parseTle(text).slice(0, 100); // Limit to 100

    return new Response(JSON.stringify({ satellites, group: source.id, groupName: source.name, fetchedAt: new Date().toISOString() }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, s-maxage=3600', ...corsHeaders },
    });
  } catch (err) {
    console.error('[satellites] fetch failed:', err?.message ?? err);
    const demoSats = generateDemoSatellites();
    return new Response(JSON.stringify({ satellites: demoSats, group: source.id, groupName: source.name, fetchedAt: new Date().toISOString(), demo: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}
