export const config = { runtime: 'edge' };

import { getCorsHeaders, isDisallowedOrigin } from './_cors.js';
import { checkRateLimit } from './_rate-limit.js';

/**
 * Parse FIRMS CSV text into fire detection objects.
 * @param {string} csvText
 * @returns {Array<object>}
 */
function parseFirmsCsv(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim());

  const idx = (name) => headers.indexOf(name);
  const iLat = idx('latitude');
  const iLng = idx('longitude');
  const iBright = idx('bright_ti4');
  const iScan = idx('scan');
  const iTrack = idx('track');
  const iDate = idx('acq_date');
  const iTime = idx('acq_time');
  const iSat = idx('satellite');
  const iConf = idx('confidence');
  const iBright5 = idx('bright_ti5');
  const iFrp = idx('frp');
  const iDayNight = idx('daynight');

  const detections = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(',');

    const lat = parseFloat(cols[iLat] ?? '');
    const lng = parseFloat(cols[iLng] ?? '');
    if (isNaN(lat) || isNaN(lng)) continue;

    const brightness = parseFloat(cols[iBright] ?? '') || 0;
    const frp = parseFloat(cols[iFrp] ?? '') || 0;
    const acqDate = (cols[iDate] ?? '').trim();
    const acqTimeRaw = (cols[iTime] ?? '').trim().padStart(4, '0');
    const acqTime =
      acqDate
        ? `${acqDate}T${acqTimeRaw.slice(0, 2)}:${acqTimeRaw.slice(2)}:00Z`
        : new Date().toISOString();

    const satellite = (cols[iSat] ?? '').trim();
    const confidenceRaw = (cols[iConf] ?? '').trim().toLowerCase();
    let confidence = 'nominal';
    if (confidenceRaw === 'h' || confidenceRaw === 'high') {
      confidence = 'high';
    } else if (confidenceRaw === 'l' || confidenceRaw === 'low') {
      confidence = 'low';
    }

    const dayNight = (cols[iDayNight] ?? '').trim() || 'D';

    // Unused fields read but not stored in output (keep edge bundle lean)
    void cols[iScan];
    void cols[iTrack];
    void cols[iBright5];

    detections.push({
      id: `${lat}-${lng}-${acqDate}-${acqTimeRaw}`,
      lat,
      lng,
      brightness,
      frp,
      confidence,
      satellite,
      acqTime,
      region: `${lat.toFixed(1)},${lng.toFixed(1)}`,
      dayNight,
    });
  }

  return detections;
}

/**
 * Check if a point is on the Korean peninsula (not Japan, not sea, not China).
 * Uses simplified polygon checks following the Korea-China border (Yalu/Tumen rivers).
 */
function isKoreaLand(lat, lng) {
  // Basic bounding box
  if (lat < 33.0 || lat > 43.0) return false;
  if (lng < 124.0 || lng > 131.0) return false;

  // --- Exclude China/Manchuria ---
  // The Korea-China border roughly follows the Yalu and Tumen rivers.
  // Above certain latitudes, only eastern longitudes are Korea (North Korea).
  // Approximate border waypoints:
  //   lat 39.8 → lng ~124.3 (mouth of Yalu at Dandong/Sinuiju)
  //   lat 40.5 → lng ~125.5
  //   lat 41.0 → lng ~126.5
  //   lat 41.5 → lng ~127.5
  //   lat 42.0 → lng ~128.0
  //   lat 42.5 → lng ~129.0
  //   lat 43.0 → lng ~129.5 (Tumen River mouth)
  if (lat > 39.8) {
    // Linear interpolation of minimum longitude along the border
    const minLng = 124.3 + ((lat - 39.8) / (43.0 - 39.8)) * (129.5 - 124.3);
    if (lng < minLng) return false;
  }

  // --- Exclude Japan (Tsushima strait and east) ---
  if (lng > 130.0) return false; // Nothing east of 130°E is Korea
  if (lat < 36.0 && lng > 129.5) return false; // SE coast ends at ~129.4°E
  if (lat < 35.0 && lng > 129.0) return false; // Busan area ends at ~129.1°E
  if (lat < 34.0 && lng > 127.5) return false; // South of Jeju, nothing Korean

  // --- Exclude ocean (west/south) ---
  if (lat < 34.0 && lng < 126.0) return false; // SW sea
  if (lat < 35.0 && lng < 125.5) return false; // Yellow Sea
  if (lat >= 35.0 && lat < 37.0 && lng < 126.0) return false; // W coast

  return true;
}

/**
 * Get approximate Korean region name from lat/lng.
 */
function getKoreaRegion(lat, lng) {
  // North Korea (above ~38.5°N)
  if (lat >= 39.8) return '북한 북부';
  if (lat >= 38.5) return '북한';

  // South Korea regions (roughly south of ~38.5°N)
  // Seoul/Gyeonggi: lat 37.2-38.5, lng 126.3-127.5
  if (lat >= 37.2 && lat < 38.5 && lng >= 126.3 && lng <= 127.5) return '서울/경기';
  // Gangwon: lat 37.0-38.5, lng 127.5-129.5
  if (lat >= 37.0 && lat < 38.5 && lng > 127.5 && lng <= 129.5) return '강원';
  // Incheon/western Gyeonggi
  if (lat >= 37.0 && lat < 38.5 && lng < 126.3) return '인천/경기서부';
  // Chungcheong: lat 36.0-37.2, lng <= 127.8
  if (lat >= 36.0 && lat < 37.2 && lng <= 127.8) return '충청';
  // Gyeongbuk: lat 35.5-37.0, lng > 127.8
  if (lat >= 35.5 && lat < 37.0 && lng > 127.8) return '경북';
  // Ulsan/Busan
  if (lat >= 35.0 && lat < 35.5 && lng > 128.5) return '울산/부산';
  // Gyeongnam
  if (lat >= 34.5 && lat < 35.5 && lng > 127.5 && lng <= 128.5) return '경남';
  // Jeonbuk
  if (lat >= 35.0 && lat < 36.0 && lng <= 127.5) return '전북';
  // Jeonnam
  if (lat >= 34.0 && lat < 35.0 && lng <= 127.5) return '전남';
  // Jeju
  if (lat < 34.0) return '제주';

  return '한국';
}

/**
 * Get approximate region name from lat/lng for non-Korea locations.
 */
function getGenericRegion(lat, lng) {
  // Middle East / Iran region
  if (lat >= 25 && lat <= 40 && lng >= 44 && lng <= 63) {
    if (lat >= 35 && lng <= 50) return 'NW Iran';
    if (lat >= 35 && lng > 50 && lng <= 56) return 'NE Iran';
    if (lat >= 35 && lng > 56) return 'Khorasan';
    if (lat >= 30 && lat < 35 && lng <= 50) return 'W Iran';
    if (lat >= 30 && lat < 35 && lng > 50 && lng <= 56) return 'Central Iran';
    if (lat >= 30 && lat < 35 && lng > 56) return 'E Iran';
    if (lat < 30 && lng <= 52) return 'Persian Gulf';
    if (lat < 30 && lng > 52) return 'SE Iran';
  }
  // Iraq
  if (lat >= 29 && lat <= 37.5 && lng >= 38 && lng < 44) return 'Iraq';
  // Turkey
  if (lat >= 36 && lat <= 42 && lng >= 26 && lng <= 45) return 'Turkey';
  // Japan
  if (lat >= 30 && lat <= 46 && lng >= 129 && lng <= 146) return 'Japan';
  // China nearby
  if (lat >= 35 && lat <= 45 && lng >= 110 && lng <= 124) return 'China';
  // Russia Far East
  if (lat >= 42 && lng >= 130 && lng <= 145) return 'Russia';
  // Fallback: use rounded coordinates
  return `${Math.floor(lat)}°N,${Math.floor(lng)}°E`;
}

/**
 * Generate realistic demo fire detection data for Korea region.
 * Used when NASA_FIRMS_MAP_KEY is not configured.
 */
function generateDemoData() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const hotspots = [
    { lat: 37.87, lng: 127.73, brightness: 320, frp: 15.2, confidence: 'high', region: '강원 춘천' },
    { lat: 37.95, lng: 128.15, brightness: 305, frp: 12.8, confidence: 'high', region: '강원 홍천' },
    { lat: 35.82, lng: 128.73, brightness: 290, frp: 8.5, confidence: 'nominal', region: '경북 경산' },
    { lat: 36.03, lng: 129.38, brightness: 340, frp: 22.1, confidence: 'high', region: '경북 포항' },
    { lat: 35.10, lng: 128.98, brightness: 275, frp: 6.3, confidence: 'nominal', region: '경남 김해' },
    { lat: 36.64, lng: 127.50, brightness: 310, frp: 11.4, confidence: 'high', region: '충북 청주' },
    { lat: 35.90, lng: 127.15, brightness: 265, frp: 5.1, confidence: 'low', region: '전북 전주' },
    { lat: 34.95, lng: 127.49, brightness: 285, frp: 7.9, confidence: 'nominal', region: '전남 순천' },
    { lat: 37.45, lng: 126.65, brightness: 295, frp: 9.2, confidence: 'nominal', region: '경기 인천' },
    { lat: 38.10, lng: 128.62, brightness: 355, frp: 28.5, confidence: 'high', region: '강원 속초' },
    { lat: 36.35, lng: 128.75, brightness: 300, frp: 10.7, confidence: 'nominal', region: '경북 안동' },
    { lat: 35.55, lng: 129.32, brightness: 330, frp: 18.3, confidence: 'high', region: '울산' },
  ];

  return hotspots.map((h, i) => ({
    id: `demo-${h.lat}-${h.lng}-${dateStr}`,
    lat: h.lat + (Math.sin(i * 7 + now.getHours()) * 0.05),
    lng: h.lng + (Math.cos(i * 5 + now.getHours()) * 0.05),
    brightness: h.brightness,
    frp: h.frp,
    confidence: h.confidence,
    satellite: 'DEMO',
    acqTime: now.toISOString(),
    region: h.region,
    dayNight: now.getHours() >= 6 && now.getHours() < 18 ? 'D' : 'N',
  }));
}

/**
 * Generate demo fire detections within an arbitrary bbox.
 */
function generateDemoBboxData(bboxStr) {
  const parts = bboxStr.split(',').map(Number);
  if (parts.length !== 4) return [];
  const [west, south, east, north] = parts;
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const count = 8;
  const hotspots = [];
  for (let i = 0; i < count; i++) {
    const lat = south + Math.random() * (north - south);
    const lng = west + Math.random() * (east - west);
    const brightness = 270 + Math.random() * 100;
    const frp = 5 + Math.random() * 25;
    const confLevels = ['high', 'nominal', 'low'];
    hotspots.push({
      id: `demo-${lat.toFixed(4)}-${lng.toFixed(4)}-${dateStr}`,
      lat: Math.round(lat * 1000) / 1000,
      lng: Math.round(lng * 1000) / 1000,
      brightness: Math.round(brightness),
      frp: Math.round(frp * 10) / 10,
      confidence: confLevels[i % 3],
      satellite: 'DEMO',
      acqTime: now.toISOString(),
      region: `${lat.toFixed(1)},${lng.toFixed(1)}`,
      dayNight: now.getHours() >= 6 && now.getHours() < 18 ? 'D' : 'N',
    });
  }
  return hotspots;
}

export default async function handler(req) {
  const corsHeaders = getCorsHeaders(req);

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

  // Parse query params early so demo mode can use them
  const url = new URL(req.url);
  const daysParam = parseInt(url.searchParams.get('days') ?? '2', 10);
  const days = Math.max(1, Math.min(10, isNaN(daysParam) ? 2 : daysParam));

  // Accept custom bbox via query params, default to Korea peninsula
  const bboxParam = url.searchParams.get('bbox'); // format: "west,south,east,north"
  const bbox = bboxParam || '124,33,130,43';

  const apiKey = process.env.NASA_FIRMS_MAP_KEY;
  if (!apiKey) {
    // Return demo data when no API key is configured
    const demoDetections = bboxParam ? generateDemoBboxData(bbox) : generateDemoData();
    return new Response(
      JSON.stringify({
        fireDetections: demoDetections,
        count: demoDetections.length,
        fetchedAt: new Date().toISOString(),
        demo: true,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=300',
          ...corsHeaders,
        },
      },
    );
  }
  const firmsUrl = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${apiKey}/VIIRS_SNPP_NRT/${bbox}/${days}`;

  let csvText;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(firmsUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'AssiEye/1.0 (+https://assieye.vercel.app)' },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[firms] upstream responded ${res.status}`);
      return new Response(
        JSON.stringify({ error: `FIRMS upstream error: ${res.status}` }),
        {
          status: 502,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      );
    }

    csvText = await res.text();
  } catch (err) {
    console.warn('[firms] fetch failed:', err?.message ?? err);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch FIRMS data' }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    );
  }

  const rawDetections = parseFirmsCsv(csvText);
  // Apply region names: Korea-specific names for Korean coordinates, generic for others
  let fireDetections;
  if (!bboxParam) {
    // Default Korea mode: filter to Korean land only + name regions
    fireDetections = rawDetections.filter(d => isKoreaLand(d.lat, d.lng)).map(d => ({ ...d, region: getKoreaRegion(d.lat, d.lng) }));
  } else {
    // Custom bbox: apply region names where possible
    fireDetections = rawDetections.map(d => {
      if (isKoreaLand(d.lat, d.lng)) {
        return { ...d, region: getKoreaRegion(d.lat, d.lng) };
      }
      return { ...d, region: getGenericRegion(d.lat, d.lng) };
    });
  }

  return new Response(
    JSON.stringify({
      fireDetections,
      count: fireDetections.length,
      fetchedAt: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=900',
        ...corsHeaders,
      },
    },
  );
}
