export const config = { runtime: 'edge' };
import { getCorsHeaders, isDisallowedOrigin } from './_cors.js';
import { checkRateLimit } from './_rate-limit.js';

function generateDemoFlights(bbox) {
  const { lamin, lomin, lamax, lomax } = bbox || KOREA_BBOX;
  const isKorea = !bbox;
  const count = 12;
  const now = Date.now();
  const countries = isKorea
    ? ['Republic of Korea', 'Republic of Korea', 'Republic of Korea', 'Republic of Korea', 'Republic of Korea', 'Republic of Korea', 'Republic of Korea', 'Republic of Korea', 'Republic of Korea', 'Republic of Korea', 'Japan', 'China']
    : ['Unknown', 'Commercial', 'Military', 'Private', 'Unknown', 'Commercial', 'Military', 'Private', 'Unknown', 'Commercial', 'Military', 'Private'];

  const flights = [];
  for (let i = 0; i < count; i++) {
    const lat = lamin + (Math.random() * 0.7 + 0.15) * (lamax - lamin);
    const lng = lomin + (Math.random() * 0.7 + 0.15) * (lomax - lomin);
    flights.push({
      icao24: `demo-${i.toString(16).padStart(6, '0')}`,
      callsign: `FL${(100 + i * 17).toString()}`,
      country: countries[i % countries.length],
      lat: lat + Math.sin(now / 10000 + i) * 0.1,
      lng: lng + Math.cos(now / 10000 + i) * 0.1,
      altitude: 5000 + Math.random() * 8000,
      onGround: false,
      velocity: 180 + Math.random() * 100,
      heading: Math.random() * 360,
      verticalRate: (Math.random() - 0.5) * 5,
      squawk: String(1000 + i * 111),
    });
  }
  return flights;
}

// Korea bounding box for flight tracking
const KOREA_BBOX = { lamin: 33, lomin: 124, lamax: 43, lomax: 130 };

export default async function handler(req) {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (isDisallowedOrigin(req)) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  const rateLimitResponse = await checkRateLimit(req, corsHeaders);
  if (rateLimitResponse) return rateLimitResponse;

  const url = new URL(req.url);
  const bboxParam = url.searchParams.get('bbox'); // format: "west,south,east,north"

  let bbox;
  if (bboxParam) {
    const parts = bboxParam.split(',').map(Number);
    if (parts.length === 4) {
      bbox = { lomin: parts[0], lamin: parts[1], lomax: parts[2], lamax: parts[3] };
    }
  }
  if (!bbox) bbox = KOREA_BBOX; // default

  try {
    const apiUrl = `https://opensky-network.org/api/states/all?lamin=${bbox.lamin}&lomin=${bbox.lomin}&lamax=${bbox.lamax}&lomax=${bbox.lomax}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`OpenSky responded ${res.status}`);
    const data = await res.json();
    const states = data.states || [];

    let flights = states.map(s => ({
      icao24: s[0],
      callsign: (s[1] || '').trim(),
      country: s[2],
      lng: s[5],
      lat: s[6],
      altitude: s[7], // barometric altitude in meters
      onGround: s[8],
      velocity: s[9], // m/s
      heading: s[10], // degrees from north
      verticalRate: s[11],
      squawk: s[14],
    })).filter(f => f.lat != null && f.lng != null);

    // If OpenSky returns 0 flights for a non-default bbox, generate demo data
    if (flights.length === 0 && bboxParam) {
      flights = generateDemoFlights(bbox);
    }

    return new Response(JSON.stringify({ flights, count: flights.length, demo: flights.length > 0 && states.length === 0, fetchedAt: new Date().toISOString() }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, s-maxage=15', ...corsHeaders },
    });
  } catch (err) {
    console.error('[flights] fetch failed:', err?.message ?? err);
    const demoFlights = generateDemoFlights(bboxParam ? bbox : null);
    return new Response(JSON.stringify({ flights: demoFlights, count: demoFlights.length, fetchedAt: new Date().toISOString(), demo: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}
