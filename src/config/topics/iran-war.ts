import type { TopicConfig } from './types';

export const TOPIC_IRAN_WAR: TopicConfig = {
  id: 'iran-war',
  name: '이란 전쟁',
  icon: '⚔️',
  description: '이란 분쟁 상황 실시간 추적',
  theme: {
    accent: '#ff3333',
    accentRgb: '255,51,51',
    headerTint: 'rgba(32, 13, 13, 0.8)',
    panelBorder: 'rgba(74, 42, 42, 0.7)',
    panelBg: 'rgba(58, 26, 26, 0.85)',
    markerPrimary: '#ff3333',
    markerSecondary: '#ff8800',
    badgeBg: 'rgba(255, 51, 51, 0.2)',
  },
  map: {
    center: { lat: 32.4, lng: 53.7 },
    zoom: 5,
    globeAltitude: 2.0,
  },
  layers: {
    fires: true,
    satellites: true,
    flights: true,
    conflictZones: true,
  },
  panels: {
    left: [
      { type: 'conflict-timeline', title: '분쟁 타임라인' },
      { type: 'fire-hotspot', title: '열점/폭격 감지' },
      { type: 'flight', title: '항공 활동' },
      { type: 'satellite', title: '위성 궤도' },
    ],
    right: [
      { type: 'youtube' },
      { type: 'feed' },
    ],
    bottom: [
      { type: 'alert', title: '속보 경보' },
      { type: 'data-status' },
    ],
  },
  feeds: [
    { id: 'iran-ko', name: '이란 뉴스 (한국)', url: 'https://news.google.com/rss/search?q=이란+전쟁+미사일&hl=ko&gl=KR&ceid=KR:ko', lang: 'ko', category: 'breaking' },
    { id: 'iran-en', name: 'Iran Conflict', url: 'https://news.google.com/rss/search?q=iran+war+missile+strike&hl=en&gl=US&ceid=US:en', lang: 'en', category: 'international' },
    { id: 'iran-mil', name: 'Military Analysis', url: 'https://news.google.com/rss/search?q=iran+military+OSINT&hl=en&gl=US&ceid=US:en', lang: 'en', category: 'analysis' },
    { id: 'mideast', name: '중동 정세', url: 'https://news.google.com/rss/search?q=중동+이란+이스라엘&hl=ko&gl=KR&ceid=KR:ko', lang: 'ko', category: 'regional' },
  ],
  youtube: {
    liveSearchQuery: 'iran war live',
    vodSearchQuery: 'iran conflict analysis',
  },
  aiBriefing: {
    systemPrompt: '이란 분쟁 상황 분석 전문가 역할로, FIRMS 열점 데이터와 항공기 동향, 최신 뉴스를 종합해 군사적 상황을 브리핑해주세요. OSINT 관점에서 분석하되, 확인되지 않은 정보는 명시해주세요.',
    focusKeywords: ['이란', 'Iran', 'missile', '미사일', 'IRGC', 'strike', '공습'],
    lang: 'ko',
  },
  isBuiltIn: true,
};
