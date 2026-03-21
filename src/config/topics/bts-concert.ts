import type { TopicConfig } from './types';

export const TOPIC_BTS_CONCERT: TopicConfig = {
  id: 'bts-concert',
  name: 'BTS 광화문 콘서트',
  icon: '🎵',
  description: 'BTS 광화문 콘서트 실시간 모니터링',
  theme: {
    accent: '#9b59b6',
    accentRgb: '155,89,182',
    headerTint: 'rgba(30, 10, 40, 0.85)',
    panelBorder: 'rgba(80, 30, 120, 0.7)',
    panelBg: 'rgba(30, 15, 45, 0.85)',
    markerPrimary: '#9b59b6',
    markerSecondary: '#e74c3c',
    badgeBg: 'rgba(155, 89, 182, 0.2)',
  },
  map: {
    center: { lat: 37.5759, lng: 126.9769 },
    zoom: 16,
    globeAltitude: 1.2,
    dataCenter: { lat: 37.5759, lng: 126.9769 },
    markers: [
      {
        lat: 37.5759,
        lng: 126.9769,
        label: '광화문광장 (BTS 콘서트)',
        detail: 'BTS 광화문 콘서트 현장',
        color: '#9b59b6',
      },
    ],
  },
  layers: {
    fires: false,
    weather: true,
    dwi: false,
    cctv: true,
    satellites: false,
    flights: false,
  },
  panels: {
    left: [
      { type: 'agent-news' },
      { type: 'platform-youtube' },
    ],
    right: [
      { type: 'platform-news' },
      { type: 'platform-twitter' },
      { type: 'platform-instagram' },
      { type: 'platform-tiktok' },
      { type: 'platform-facebook' },
      { type: 'platform-threads' },
    ],
    bottom: [
      { type: 'sentiment-positive' },
      { type: 'sentiment-negative' },
      { type: 'timeline-chart' },
      { type: 'situation-summary' },
      { type: 'fire-stats' },
      { type: 'predict' },
    ],
  },
  feeds: [
    { id: 'bts-news-ko', name: 'BTS 뉴스', url: 'https://news.google.com/rss/search?q=BTS+%EA%B4%91%ED%99%94%EB%AC%B8+%EC%BD%98%EC%84%9C%ED%8A%B8&hl=ko&gl=KR&ceid=KR:ko', lang: 'ko', category: 'entertainment' },
    { id: 'bts-news-en', name: 'BTS Concert', url: 'https://news.google.com/rss/search?q=BTS+Gwanghwamun+concert&hl=en&gl=US&ceid=US:en', lang: 'en', category: 'international' },
  ],
  youtube: {
    liveSearchQuery: 'BTS 광화문 콘서트 실시간',
    vodSearchQuery: 'BTS 광화문 콘서트',
  },
  aiBriefing: {
    systemPrompt: '',
    focusKeywords: [],
    lang: 'ko',
  },
  refreshIntervals: {
    agentNews: 10_000,
    feeds: 60_000,
    weather: 300_000,
  },
  isBuiltIn: true,
};
