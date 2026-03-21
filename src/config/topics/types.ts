export interface TopicTheme {
  accent: string;
  accentRgb: string;
  headerTint: string;
  panelBorder: string;
  panelBg: string;
  markerPrimary: string;
  markerSecondary: string;
  badgeBg: string;
  mapStyle?: string;
}

export interface TopicMarker {
  lat: number;
  lng: number;
  label: string;
  detail?: string;
  color?: string;
}

export interface TopicMapConfig {
  center: { lat: number; lng: number };
  zoom: number;
  globeAltitude: number;
  /** Override center point for FIRMS/flights bbox (defaults to map center) */
  dataCenter?: { lat: number; lng: number };
  /** Fixed markers on the map */
  markers?: TopicMarker[];
}

export interface PanelSlot {
  type: string;
  title?: string;
  config?: Record<string, unknown>;
}

export interface TopicFeedSource {
  id: string;
  name: string;
  url: string;
  lang: 'ko' | 'en';
  category: string;
}

export interface TopicAiBriefing {
  systemPrompt: string;
  focusKeywords: string[];
  lang: 'ko' | 'en';
}

export interface TopicConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
  theme: TopicTheme;
  map: TopicMapConfig;
  layers: Record<string, boolean>;
  panels: {
    left: PanelSlot[];
    right: PanelSlot[];
    bottom: PanelSlot[];
  };
  feeds: TopicFeedSource[];
  youtube: {
    liveSearchQuery: string;
    vodSearchQuery: string;
  };
  aiBriefing: TopicAiBriefing;
  refreshIntervals?: Record<string, number>;
  isBuiltIn?: boolean;
}
