import type { TopicConfig } from './types';

export const TOPIC_DAEJEON_FIRE: TopicConfig = {
  id: 'daejeon-fire',
  name: '대전 화재',
  icon: '🔥',
  description: '2026.03.20 대전 지역 화재 실시간 모니터링',
  theme: {
    accent: '#ff4444',
    accentRgb: '255,68,68',
    headerTint: 'rgba(40, 10, 10, 0.85)',
    panelBorder: 'rgba(120, 30, 30, 0.7)',
    panelBg: 'rgba(50, 15, 15, 0.85)',
    markerPrimary: '#ff0000',
    markerSecondary: '#ff6600',
    badgeBg: 'rgba(255, 68, 68, 0.2)',
  },
  map: {
    center: { lat: 36.3944, lng: 127.4183 },
    zoom: 14,
    globeAltitude: 1.2,
    dataCenter: { lat: 36.3944, lng: 127.4183 },
    markers: [
      {
        lat: 36.3944,
        lng: 127.4183,
        label: '화재 현장 (안전공업)',
        detail: '13:17 \uBC1C\uD654 | \uC0AC\uB9DD 11\uBA85 | \uBD80\uC0C1 59\uBA85 | \uC2E4\uC885 3\uBA85<br/>\uC9C4\uD654 \uC644\uB8CC(23:48) | \uC7D4\uD574 \uCCA0\uAC70 \uC218\uC0C9 \uC911',
        color: '#ff0000',
      },
    ],
  },
  layers: {
    fires: true,
    weather: true,
    dwi: true,
    cctv: true,
    satellites: false,
    flights: false,
  },
  panels: {
    left: [
      { type: 'platform-news' },
      { type: 'platform-youtube' },
    ],
    right: [
      { type: 'platform-twitter' },
      { type: 'platform-instagram' },
      { type: 'platform-facebook' },
    ],
    bottom: [
      { type: 'timeline-chart' },
      { type: 'situation-summary' },
      { type: 'fire-stats' },
      { type: 'predict' },
    ],
  },
  feeds: [
    { id: 'daejeon-fire-ko', name: '대전 화재 뉴스', url: 'https://news.google.com/rss/search?q=%EB%8C%80%EC%A0%84+%ED%99%94%EC%9E%AC&hl=ko&gl=KR&ceid=KR:ko', lang: 'ko', category: 'breaking' },
    { id: 'daejeon-fire-en', name: 'Daejeon Fire', url: 'https://news.google.com/rss/search?q=Daejeon+fire&hl=en&gl=US&ceid=US:en', lang: 'en', category: 'international' },
  ],
  youtube: {
    liveSearchQuery: '대전 화재 실시간',
    vodSearchQuery: '대전 불 화재',
  },
  aiBriefing: {
    systemPrompt: '',
    focusKeywords: ['\uB300\uC804', '\uB300\uC804 \uD654\uC7AC', '\uACF5\uC7A5 \uD654\uC7AC', 'daejeon fire', '\uBB38\uD3C9\uB3D9', '\uC548\uC804\uACF5\uC5C5', '\uC18C\uBC29\uB3D9\uC6D0\uB839'],
    lang: 'ko',
  },
  refreshIntervals: {
    agentNews: 10_000,
    feeds: 60_000,
    weather: 300_000,
  },
  isBuiltIn: true,
};
