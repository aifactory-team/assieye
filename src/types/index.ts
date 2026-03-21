export interface FireHotspot {
  lat: number;
  lng: number;
  brightness: number;
  confidence: 'low' | 'nominal' | 'high';
  satellite: string;
  acqTime: string;
  frp: number;
  region: string;
  dayNight: 'D' | 'N';
}

export interface FireRegionStats {
  region: string;
  count: number;
  highCount: number;
  totalFrp: number;
  lat: number;
  lng: number;
}

export interface WeatherStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  temp: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  rainfall: number;
}

export interface RssFeedItem {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  source: string;
  description: string;
  category: string;
  lang: 'ko' | 'en';
  aiSummary?: string;
  thumbnailUrl?: string;
}

export interface MapLayers {
  fires: boolean;
  weather: boolean;
  dwi: boolean;
  satellites: boolean;
  flights: boolean;
  cctv: boolean;
  buildings: boolean;
}

export interface DwiCell {
  lat: number;
  lng: number;
  riskIndex: number;
  level: '안전' | '주의' | '경고' | '위험' | '매우위험';
}

export type AgentNewsSeverity = 'critical' | 'high' | 'medium' | 'low';

export type AgentNewsPlatform = 'news' | 'youtube' | 'twitter' | 'instagram' | 'facebook' | 'tiktok' | 'threads';

export interface AgentNewsItem {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  source: string;
  description: string;
  category: string;
  lang: 'ko' | 'en';
  severity: AgentNewsSeverity;
  tags: string[];
  agentNote: string;
  platform?: AgentNewsPlatform;
  imageUrl?: string;
  videoUrl?: string;
  youtubeId?: string;
  thumbnailUrl?: string;
  isLive?: boolean;
}

export interface AgentNewsSummary {
  situation: string;
  casualties: string;
  response: string;
  outlook: string;
  lastAnalysis: string;
  eventStats?: Record<string, string>;
}

export interface AgentNewsMeta {
  topic: string;
  lastUpdated: string;
  agentId: string;
  updateCount: number;
  searchQueries: string[];
}

export interface AgentNewsData {
  meta: AgentNewsMeta;
  items: AgentNewsItem[];
  summary: AgentNewsSummary;
}

export interface AppModule {
  init(): void | Promise<void>;
  destroy(): void;
}
