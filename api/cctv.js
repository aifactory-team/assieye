export const config = { runtime: 'edge' };
import { getCorsHeaders, isDisallowedOrigin } from './_cors.js';
import { checkRateLimit } from './_rate-limit.js';

// Korean public CCTV streams near forest/mountain areas
// Sources: 산림청 (Korea Forest Service), 도로공사 (Road Corporation), 지자체
const KOREA_FOREST_CCTVS = [
  // 산림청 산불감시 CCTV (public ITS feeds)
  { id: 'cctv-gangwon-1', name: '강원 춘천 산불감시', lat: 37.88, lng: 127.73, streamUrl: '', source: '산림청', type: 'forest', status: 'active' },
  { id: 'cctv-gangwon-2', name: '강원 속초 산불감시', lat: 38.21, lng: 128.59, streamUrl: '', source: '산림청', type: 'forest', status: 'active' },
  { id: 'cctv-gangwon-3', name: '강원 강릉 산불감시', lat: 37.75, lng: 128.88, streamUrl: '', source: '산림청', type: 'forest', status: 'active' },
  { id: 'cctv-gangwon-4', name: '강원 홍천 산불감시', lat: 37.70, lng: 127.90, streamUrl: '', source: '산림청', type: 'forest', status: 'active' },
  { id: 'cctv-gangwon-5', name: '강원 영월 산불감시', lat: 37.18, lng: 128.46, streamUrl: '', source: '산림청', type: 'forest', status: 'active' },
  { id: 'cctv-gyeongbuk-1', name: '경북 안동 산불감시', lat: 36.57, lng: 128.73, streamUrl: '', source: '산림청', type: 'forest', status: 'active' },
  { id: 'cctv-gyeongbuk-2', name: '경북 포항 산불감시', lat: 36.02, lng: 129.37, streamUrl: '', source: '산림청', type: 'forest', status: 'active' },
  { id: 'cctv-gyeongbuk-3', name: '경북 영주 산불감시', lat: 36.81, lng: 128.62, streamUrl: '', source: '산림청', type: 'forest', status: 'active' },
  { id: 'cctv-chungbuk-1', name: '충북 청주 산불감시', lat: 36.64, lng: 127.49, streamUrl: '', source: '산림청', type: 'forest', status: 'active' },
  { id: 'cctv-jeonbuk-1', name: '전북 전주 산불감시', lat: 35.82, lng: 127.15, streamUrl: '', source: '산림청', type: 'forest', status: 'active' },
  { id: 'cctv-jeonnam-1', name: '전남 순천 산불감시', lat: 34.95, lng: 127.49, streamUrl: '', source: '산림청', type: 'forest', status: 'active' },
  { id: 'cctv-gyeongnam-1', name: '경남 밀양 산불감시', lat: 35.50, lng: 128.75, streamUrl: '', source: '산림청', type: 'forest', status: 'active' },
  // 도로공사 ITS CCTV (road cameras near mountains)
  { id: 'cctv-road-1', name: '영동고속도로 대관령', lat: 37.69, lng: 128.73, streamUrl: '', source: '도로공사', type: 'road', status: 'active' },
  { id: 'cctv-road-2', name: '중앙고속도로 춘천IC', lat: 37.87, lng: 127.74, streamUrl: '', source: '도로공사', type: 'road', status: 'active' },
  { id: 'cctv-road-3', name: '동해고속도로 강릉', lat: 37.76, lng: 128.90, streamUrl: '', source: '도로공사', type: 'road', status: 'active' },
  { id: 'cctv-road-4', name: '경부고속도로 대전IC', lat: 36.35, lng: 127.38, streamUrl: '', source: '도로공사', type: 'road', status: 'active' },
  // 국립공원 CCTV
  { id: 'cctv-park-1', name: '설악산 국립공원', lat: 38.12, lng: 128.47, streamUrl: '', source: '국립공원', type: 'park', status: 'active' },
  { id: 'cctv-park-2', name: '지리산 국립공원', lat: 35.34, lng: 127.73, streamUrl: '', source: '국립공원', type: 'park', status: 'active' },
  { id: 'cctv-park-3', name: '오대산 국립공원', lat: 37.80, lng: 128.57, streamUrl: '', source: '국립공원', type: 'park', status: 'active' },
  { id: 'cctv-park-4', name: '덕유산 국립공원', lat: 35.86, lng: 127.75, streamUrl: '', source: '국립공원', type: 'park', status: 'active' },
];

export default async function handler(req) {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (isDisallowedOrigin(req)) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  const rateLimitResponse = await checkRateLimit(req, corsHeaders);
  if (rateLimitResponse) return rateLimitResponse;

  return new Response(JSON.stringify({
    cctvs: KOREA_FOREST_CCTVS,
    count: KOREA_FOREST_CCTVS.length,
    fetchedAt: new Date().toISOString(),
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, s-maxage=3600', ...corsHeaders },
  });
}
