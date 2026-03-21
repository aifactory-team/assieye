import type { TopicConfig } from './types';

export const TOPIC_IRAN_KR_STOCK: TopicConfig = {
  id: 'iran-kr-stock',
  name: '이란사태 한국증시',
  icon: '📉',
  description: '이란 사태가 한국 증시에 미치는 영향 추적',
  theme: {
    accent: '#3399ff',
    accentRgb: '51,153,255',
    headerTint: 'rgba(13, 20, 32, 0.8)',
    panelBorder: 'rgba(42, 58, 74, 0.7)',
    panelBg: 'rgba(26, 38, 58, 0.85)',
    markerPrimary: '#3399ff',
    markerSecondary: '#ff4444',
    badgeBg: 'rgba(51, 153, 255, 0.2)',
  },
  map: {
    center: { lat: 36.5, lng: 90 },
    zoom: 3,
    globeAltitude: 2.5,
    dataCenter: { lat: 32.4, lng: 53.7 },
  },
  layers: {
    fires: true,
    flights: true,
    satellites: true,
    stockMarkers: true,
  },
  panels: {
    left: [
      { type: 'stock-ticker', title: 'KOSPI / KOSDAQ', config: { market: 'KR', indices: ['KOSPI', 'KOSDAQ'] } },
      { type: 'stock-sectors', title: '업종별 등락', config: { market: 'KR' } },
      { type: 'oil-price', title: '유가 동향' },
      { type: 'fire-hotspot', title: '중동 열점' },
    ],
    right: [
      { type: 'youtube' },
      { type: 'feed' },
    ],
    bottom: [
      { type: 'alert', title: '시장 속보' },
      { type: 'data-status' },
    ],
  },
  feeds: [
    { id: 'iran-stock-kr', name: '이란 증시 영향', url: 'https://news.google.com/rss/search?q=이란+증시+코스피&hl=ko&gl=KR&ceid=KR:ko', lang: 'ko', category: 'market' },
    { id: 'oil-kr', name: '유가 영향', url: 'https://news.google.com/rss/search?q=유가+이란+한국+경제&hl=ko&gl=KR&ceid=KR:ko', lang: 'ko', category: 'commodity' },
    { id: 'defense-kr', name: '방산주', url: 'https://news.google.com/rss/search?q=방산주+이란+한국&hl=ko&gl=KR&ceid=KR:ko', lang: 'ko', category: 'sector' },
    { id: 'iran-market-en', name: 'Iran Market Impact', url: 'https://news.google.com/rss/search?q=iran+oil+price+stock+market&hl=en&gl=US&ceid=US:en', lang: 'en', category: 'international' },
  ],
  youtube: {
    liveSearchQuery: '이란 증시 영향 실시간',
    vodSearchQuery: '이란 사태 한국 경제',
  },
  aiBriefing: {
    systemPrompt: '이란 사태가 한국 증시(KOSPI/KOSDAQ)에 미치는 영향을 분석하는 금융 전문가 역할입니다. 유가 동향, 방산주, 운송주, 환율 영향을 중심으로 브리핑해주세요.',
    focusKeywords: ['KOSPI', '코스피', '유가', '방산', '환율', '이란', '원유'],
    lang: 'ko',
  },
  isBuiltIn: true,
};
