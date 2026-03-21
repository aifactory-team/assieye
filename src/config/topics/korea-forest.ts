import type { TopicConfig } from './types';

export const TOPIC_KOREA_FOREST: TopicConfig = {
  id: 'korea-forest',
  name: '산불 감시',
  icon: '🔥',
  description: '한국 산림 산불 실시간 모니터링',
  theme: {
    accent: '#00cc66',
    accentRgb: '0,204,102',
    headerTint: 'rgba(13, 32, 13, 0.8)',
    panelBorder: 'rgba(42, 74, 42, 0.7)',
    panelBg: 'rgba(26, 58, 26, 0.85)',
    markerPrimary: '#ff3300',
    markerSecondary: '#ff8800',
    badgeBg: 'rgba(0, 204, 102, 0.2)',
  },
  map: {
    center: { lat: 36.5, lng: 127.5 },
    zoom: 6,
    globeAltitude: 1.5,
    dataCenter: { lat: 37.0, lng: 127.5 }, // bbox radius 5 → 122.5~132.5 but filtered by isKoreaLand
  },
  layers: {
    fires: true,
    weather: true,
    dwi: true,
    satellites: true,
    flights: true,
    cctv: true,
  },
  panels: {
    left: [
      { type: 'fire-hotspot' },
      { type: 'weather' },
      { type: 'satellite' },
      { type: 'flight' },
    ],
    right: [
      { type: 'youtube' },
      { type: 'feed' },
    ],
    bottom: [
      { type: 'alert' },
      { type: 'data-status' },
    ],
  },
  feeds: [
    { id: 'forest-news', name: '산림·산불 뉴스', url: 'https://news.google.com/rss/search?q=산림+산불&hl=ko&gl=KR&ceid=KR:ko', lang: 'ko', category: 'policy' },
    { id: 'wildfire-intl', name: 'Wildfire News', url: 'https://news.google.com/rss/search?q=wildfire+forest+fire&hl=en&gl=US&ceid=US:en', lang: 'en', category: 'international' },
  ],
  youtube: {
    liveSearchQuery: '산불 실시간',
    vodSearchQuery: 'wildfire live stream',
  },
  aiBriefing: {
    systemPrompt: '한국 산림 산불 상황을 분석하는 전문가 역할로, 현재 산불 현황, 기상 조건, 위험도를 종합 브리핑해주세요.',
    focusKeywords: ['산불', '산림', 'wildfire', 'FIRMS', '열점'],
    lang: 'ko',
  },
  isBuiltIn: true,
};
