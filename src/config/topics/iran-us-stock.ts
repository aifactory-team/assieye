import type { TopicConfig } from './types';

export const TOPIC_IRAN_US_STOCK: TopicConfig = {
  id: 'iran-us-stock',
  name: '이란사태 미국증시',
  icon: '📊',
  description: '이란 사태의 미국 증시·원유시장 영향 추적',
  theme: {
    accent: '#00ccaa',
    accentRgb: '0,204,170',
    headerTint: 'rgba(13, 28, 26, 0.8)',
    panelBorder: 'rgba(42, 74, 68, 0.7)',
    panelBg: 'rgba(26, 52, 48, 0.85)',
    markerPrimary: '#00ccaa',
    markerSecondary: '#ff6644',
    badgeBg: 'rgba(0, 204, 170, 0.2)',
  },
  map: {
    center: { lat: 30, lng: -30 },
    zoom: 2,
    globeAltitude: 3.0,
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
      { type: 'stock-ticker', title: 'S&P 500 / NASDAQ', config: { market: 'US', indices: ['SPX', 'NDX', 'DJI'] } },
      { type: 'stock-sectors', title: 'Sector Performance', config: { market: 'US' } },
      { type: 'oil-price', title: 'Crude Oil (WTI/Brent)' },
      { type: 'fire-hotspot', title: 'FIRMS Hotspots' },
    ],
    right: [
      { type: 'youtube' },
      { type: 'feed' },
    ],
    bottom: [
      { type: 'alert', title: 'Breaking News' },
      { type: 'data-status' },
    ],
  },
  feeds: [
    { id: 'iran-us-market', name: 'Iran Market Impact', url: 'https://news.google.com/rss/search?q=iran+stock+market+wall+street+oil&hl=en&gl=US&ceid=US:en', lang: 'en', category: 'market' },
    { id: 'oil-futures', name: 'Oil Futures', url: 'https://news.google.com/rss/search?q=crude+oil+price+iran+sanctions&hl=en&gl=US&ceid=US:en', lang: 'en', category: 'commodity' },
    { id: 'defense-us', name: 'Defense Stocks', url: 'https://news.google.com/rss/search?q=defense+stocks+lockheed+raytheon+iran&hl=en&gl=US&ceid=US:en', lang: 'en', category: 'sector' },
    { id: 'iran-us-ko', name: '미국증시 이란', url: 'https://news.google.com/rss/search?q=미국+증시+이란+유가&hl=ko&gl=KR&ceid=KR:ko', lang: 'ko', category: 'analysis' },
  ],
  youtube: {
    liveSearchQuery: 'iran US stock market live',
    vodSearchQuery: 'iran conflict market impact analysis',
  },
  aiBriefing: {
    systemPrompt: 'Analyze the impact of the Iran situation on US markets (S&P 500, NASDAQ, DJI). Focus on oil futures, defense sector, VIX volatility index, and treasury yields. Provide a concise OSINT-based market intelligence briefing.',
    focusKeywords: ['S&P 500', 'NASDAQ', 'WTI', 'Brent', 'VIX', 'defense', 'Iran', 'sanctions'],
    lang: 'en',
  },
  isBuiltIn: true,
};
