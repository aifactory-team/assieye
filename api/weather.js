export const config = { runtime: 'edge' };

import { getCorsHeaders, isDisallowedOrigin } from './_cors.js';
import { checkRateLimit } from './_rate-limit.js';

const STATIONS = [
  { id: 'seoul',    name: '서울',  lat: 37.5665, lng: 126.9780, nx: 60,  ny: 127 },
  { id: 'chuncheon', name: '춘천', lat: 37.8813, lng: 127.7298, nx: 73,  ny: 134 },
  { id: 'daegu',    name: '대구',  lat: 35.8714, lng: 128.6014, nx: 89,  ny: 90  },
  { id: 'ulsan',    name: '울산',  lat: 35.5384, lng: 129.3114, nx: 98,  ny: 76  },
  { id: 'jeju',     name: '제주',  lat: 33.4996, lng: 126.5312, nx: 52,  ny: 38  },
  { id: 'daejeon',  name: '대전',  lat: 36.3504, lng: 127.3845, nx: 67,  ny: 100 },
  { id: 'gwangju',  name: '광주',  lat: 35.1595, lng: 126.8526, nx: 58,  ny: 74  },
  { id: 'pohang',   name: '포항',  lat: 36.0190, lng: 129.3435, nx: 102, ny: 84  },
  { id: 'chungju',  name: '충주',  lat: 36.9910, lng: 127.9259, nx: 69,  ny: 107 },
  { id: 'changwon', name: '창원',  lat: 35.2280, lng: 128.6811, nx: 82,  ny: 71  },
  { id: 'incheon',  name: '인천',  lat: 37.4563, lng: 126.7052, nx: 55,  ny: 124 },
  { id: 'gangneung', name: '강릉', lat: 37.7519, lng: 128.8761, nx: 92,  ny: 131 },
  { id: 'jeonju',   name: '전주',  lat: 35.8242, lng: 127.1480, nx: 63,  ny: 89  },
  { id: 'mokpo',    name: '목포',  lat: 34.8118, lng: 126.3922, nx: 50,  ny: 67  },
  { id: 'andong',   name: '안동',  lat: 36.5684, lng: 128.7294, nx: 85,  ny: 99  },
  { id: 'suwon',    name: '수원',  lat: 37.2636, lng: 127.0286, nx: 71,  ny: 121 },
  { id: 'icheon',   name: '이천',  lat: 37.2720, lng: 127.4350, nx: 74,  ny: 115 },
  { id: 'wonju',    name: '원주',  lat: 37.3422, lng: 127.9202, nx: 84,  ny: 123 },
  { id: 'suncheon', name: '순천',  lat: 34.9506, lng: 127.4872, nx: 56,  ny: 50  },
  { id: 'miryang',  name: '밀양',  lat: 35.5037, lng: 128.7464, nx: 80,  ny: 75  },
];

function generateDemoWeather() {
  const now = new Date();
  const hour = now.getHours();
  return STATIONS.map(s => ({
    id: s.id,
    name: s.name,
    lat: s.lat,
    lng: s.lng,
    temp: 5 + Math.sin(hour / 6 * Math.PI) * 10 + (s.lat - 35) * -1.5 + Math.random() * 2,
    humidity: 40 + Math.random() * 30,
    windSpeed: 2 + Math.random() * 8,
    windDirection: Math.floor(Math.random() * 360),
    rainfall: Math.random() > 0.8 ? Math.random() * 5 : 0,
  }));
}

/** Attempt to fetch all stations from KMA Ultra-Short-Term Observation API */
async function fetchFromKma(apiKey) {
  const now = new Date();
  // KMA base_time must be on the hour; round down to current hour
  const base_date =
    String(now.getFullYear()) +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  const base_time = String(now.getHours()).padStart(2, '0') + '00';

  const results = await Promise.all(
    STATIONS.map(async (station) => {
      const url =
        `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst` +
        `?serviceKey=${encodeURIComponent(apiKey)}` +
        `&numOfRows=1000&pageNo=1&dataType=JSON` +
        `&base_date=${base_date}&base_time=${base_time}` +
        `&nx=${station.nx}&ny=${station.ny}`;

      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`KMA ${res.status} for ${station.id}`);
      const json = await res.json();

      const items = json?.response?.body?.items?.item ?? [];
      const byCategory = {};
      for (const item of items) byCategory[item.category] = parseFloat(item.obsrValue);

      return {
        id: station.id,
        name: station.name,
        lat: station.lat,
        lng: station.lng,
        temp: byCategory['T1H'] ?? 0,
        humidity: byCategory['REH'] ?? 0,
        windSpeed: byCategory['WSD'] ?? 0,
        windDirection: byCategory['VEC'] ?? 0,
        rainfall: byCategory['RN1'] ?? 0,
      };
    })
  );

  return results;
}

/** Fetch from Open-Meteo (fallback) */
async function fetchFromOpenMeteo() {
  const lats = STATIONS.map((s) => s.lat).join(',');
  const lngs = STATIONS.map((s) => s.lng).join(',');

  const apiUrl =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lats}&longitude=${lngs}` +
    `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation` +
    `&wind_speed_unit=ms` +
    `&timezone=Asia%2FSeoul`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  let apiRes;
  try {
    apiRes = await fetch(apiUrl, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!apiRes.ok) throw new Error(`Open-Meteo responded ${apiRes.status}`);

  const json = await apiRes.json();
  const results = Array.isArray(json) ? json : [json];

  return STATIONS.map((station, i) => {
    const entry = results[i];
    const current = entry?.current ?? {};
    return {
      id: station.id,
      name: station.name,
      lat: station.lat,
      lng: station.lng,
      temp: current.temperature_2m ?? 0,
      humidity: current.relative_humidity_2m ?? 0,
      windSpeed: current.wind_speed_10m ?? 0,
      windDirection: current.wind_direction_10m ?? 0,
      rainfall: current.precipitation ?? 0,
    };
  });
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
    let stations;
    const kmaKey = process.env.KMA_API_KEY;

    if (kmaKey) {
      try {
        stations = await fetchFromKma(kmaKey);
      } catch (kmaErr) {
        console.warn('[weather] KMA failed, falling back to Open-Meteo:', kmaErr?.message);
        stations = await fetchFromOpenMeteo();
      }
    } else {
      stations = await fetchFromOpenMeteo();
    }

    return new Response(
      JSON.stringify({ stations, fetchedAt: new Date().toISOString() }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=3600',
          ...corsHeaders,
        },
      },
    );
  } catch (err) {
    console.error('[weather] fetch failed:', err?.message ?? err);
    const demoStations = generateDemoWeather();
    return new Response(
      JSON.stringify({ stations: demoStations, fetchedAt: new Date().toISOString(), demo: true }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
}
