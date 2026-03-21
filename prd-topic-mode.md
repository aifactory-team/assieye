# AssiEye Topic Mode PRD - 주제별 감시 모드

## 1. 개요

AssiEye를 **산불 전용 대시보드**에서 **주제 기반 다목적 OSINT 대시보드**로 확장한다. 사용자가 감시 주제(Topic)를 선택하면 대시보드의 **데이터 소스, 지도 레이어, 패널 구성, 뉴스 피드, 테마 색상**이 해당 주제에 맞게 자동 전환된다.

**한 문장 정의:** 하나의 대시보드 프레임워크로 산불, 전쟁, 경제위기, 자연재해 등 어떤 주제든 실시간 OSINT 감시가 가능한 "주제 스위칭" 시스템.

---

## 2. 핵심 컨셉

```
+------------------------------------------------------------------+
|  AssiEye                                                          |
|  [주제 선택 드롭다운] ▼                                            |
|  ┌──────────────────────────────────────────────────────────────┐ |
|  │ 🔥 산불 감시 (기본)                                          │ |
|  │ ⚔️  이란 전쟁                                                 │ |
|  │ 📉 이란사태 한국증시                                          │ |
|  │ 📊 이란사태 미국증시                                          │ |
|  │ 🌊 태풍·호우 감시                                             │ |
|  │ ➕ 커스텀 주제 추가...                                        │ |
|  └──────────────────────────────────────────────────────────────┘ |
+------------------------------------------------------------------+
```

주제를 바꾸면 다음이 **동시에** 전환된다:

| 요소 | 전환 내용 |
|------|----------|
| **테마** | 주제별 고유 색상 팔레트 (accent, background tint, marker colors) |
| **지도 중심** | 해당 지역으로 자동 이동 (한반도, 중동, 글로벌 등) |
| **지도 레이어** | 주제에 맞는 레이어만 활성화 |
| **좌측 패널** | 주제별 핵심 데이터 패널 (산불→열점, 전쟁→분쟁지역 등) |
| **하단 패널** | 주제별 경보/데이터 현황 |
| **우측 패널** | 주제별 뉴스 피드 + YouTube 검색어 |
| **뉴스 피드** | 주제별 RSS/검색 키워드 |
| **YouTube** | 주제별 실시간 스트림 검색어 |
| **AI 브리핑** | 주제 맥락 반영 프롬프트 |

---

## 3. 데이터 모델

### 3.1 TopicConfig (주제 설정 인터페이스)

```typescript
interface TopicConfig {
  id: string;                    // 'korea-forest', 'iran-war', etc.
  name: string;                  // '산불 감시'
  icon: string;                  // emoji or icon key
  description: string;           // 한 줄 설명

  // 테마
  theme: TopicTheme;

  // 지도
  map: {
    center: { lat: number; lng: number };
    zoom: number;
    globeAltitude: number;
  };

  // 활성 레이어
  layers: {
    fires?: boolean;
    weather?: boolean;
    dwi?: boolean;
    satellites?: boolean;
    flights?: boolean;
    cctv?: boolean;
    // 주제별 커스텀 레이어
    conflictZones?: boolean;     // 분쟁 지역 폴리곤
    stockMarkers?: boolean;      // 증시 마커
    earthquakes?: boolean;       // 지진
    typhoonTrack?: boolean;      // 태풍 경로
  };

  // 패널 구성
  panels: {
    left: PanelSlot[];           // 좌측에 표시할 패널 목록
    right: PanelSlot[];          // 우측
    bottom: PanelSlot[];         // 하단
  };

  // 뉴스 피드
  feeds: TopicFeedSource[];

  // YouTube 검색
  youtube: {
    liveSearchQuery: string;     // '산불 실시간' | 'iran war live'
    vodSearchQuery: string;      // 'wildfire' | 'iran conflict'
  };

  // AI 브리핑
  aiBriefing: {
    systemPrompt: string;        // 주제별 AI 분석 프롬프트
    focusKeywords: string[];     // 핵심 키워드
  };

  // 데이터 갱신 주기 (주제별 커스터마이즈)
  refreshIntervals?: Partial<typeof REFRESH_INTERVALS>;
}

interface TopicTheme {
  accent: string;                // 주요 강조색 (#00cc66, #ff3333, etc.)
  accentRgb: string;             // CSS rgb용 ('0,204,102')
  headerTint: string;            // 헤더 배경 틴트
  panelBorder: string;           // 패널 테두리 색
  panelBg: string;               // 패널 배경색
  markerPrimary: string;         // 1차 마커 색
  markerSecondary: string;       // 2차 마커 색
  badgeBg: string;               // 뱃지 배경
  mapStyle?: string;             // MapLibre 스타일 URL (다크/밝은 등)
}

interface PanelSlot {
  type: string;                  // 'fire-hotspot' | 'weather' | 'satellite' | 'conflict-timeline' | 'stock-ticker' ...
  title?: string;                // 패널 제목 오버라이드
  config?: Record<string, any>; // 패널별 추가 설정
}

interface TopicFeedSource {
  id: string;
  name: string;
  url: string;
  lang: 'ko' | 'en';
  category: string;
}
```

### 3.2 주제 설정 저장

```typescript
// localStorage 키
const STORAGE_KEY_TOPIC = 'assieye-active-topic';
const STORAGE_KEY_CUSTOM_TOPICS = 'assieye-custom-topics';

// URL 파라미터 지원
// ?topic=iran-war → 해당 주제로 바로 진입
```

---

## 4. 내장 주제 (Built-in Topics)

### 4.1 산불 감시 (기본값)

```typescript
const TOPIC_KOREA_FOREST: TopicConfig = {
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
  },
};
```

### 4.2 이란 전쟁

```typescript
const TOPIC_IRAN_WAR: TopicConfig = {
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
    center: { lat: 32.4, lng: 53.7 },  // 이란 중심
    zoom: 5,
    globeAltitude: 2.0,
  },
  layers: {
    fires: true,           // 폭격 열점 감지
    satellites: true,
    flights: true,          // 군용기 추적
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
  },
};
```

### 4.3 이란사태 한국증시

```typescript
const TOPIC_IRAN_KR_STOCK: TopicConfig = {
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
    center: { lat: 36.5, lng: 90 },   // 한국~중동 중간
    zoom: 3,
    globeAltitude: 2.5,
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
  },
};
```

### 4.4 이란사태 미국증시

```typescript
const TOPIC_IRAN_US_STOCK: TopicConfig = {
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
    center: { lat: 30, lng: -30 },    // 대서양 중심 (미국~중동)
    zoom: 2,
    globeAltitude: 3.0,
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
  },
};
```

---

## 5. 테마 시스템 구현

### 5.1 CSS 변수 기반 테마 전환

주제 변경 시 `document.documentElement.style`에 CSS 변수를 주입한다. 기존 하드코딩된 색상을 CSS 변수로 교체.

```css
:root {
  /* 주제별로 동적 변경되는 변수 */
  --accent: #00cc66;
  --accent-rgb: 0, 204, 102;
  --header-tint: rgba(13, 32, 13, 0.8);
  --panel-border: rgba(42, 74, 42, 0.7);
  --panel-bg: rgba(26, 58, 26, 0.85);
  --marker-primary: #ff3300;
  --marker-secondary: #ff8800;
  --badge-bg: rgba(0, 204, 102, 0.2);
}

/* 기존 하드코딩을 변수로 교체 */
.app-title { color: var(--accent); }
.app-domain-badge { background: var(--badge-bg); color: var(--accent); }
.panel { background: var(--panel-bg); border-color: var(--panel-border); }
.panel-count { background: var(--accent); }
.app-header { background: var(--header-tint); }
/* ... */
```

### 5.2 테마 전환 트랜지션

주제 변경 시 부드러운 전환 효과:

```css
:root {
  transition: --accent 0.6s ease,
              --panel-bg 0.6s ease,
              --panel-border 0.6s ease,
              --header-tint 0.6s ease;
}

/* 주제 전환 시 전체 페이드 */
.topic-transitioning {
  animation: topicSwitch 0.5s ease;
}

@keyframes topicSwitch {
  0%   { opacity: 1; filter: brightness(1); }
  40%  { opacity: 0.3; filter: brightness(0.5); }
  100% { opacity: 1; filter: brightness(1); }
}
```

---

## 6. UI 설계

### 6.1 주제 선택 UI (헤더 내)

헤더의 `app-domain-badge` 자리를 주제 선택 드롭다운으로 교체한다.

```
┌─────────────────────────────────────────────────────┐
│ AssiEye  [🔥 산불 감시 ▾]  실시간 OSINT 대시보드     │
└─────────────────────────────────────────────────────┘
              ↓ 클릭 시 드롭다운
        ┌─────────────────────────┐
        │ 🔥 산불 감시        ✓   │
        │ ⚔️ 이란 전쟁            │
        │ 📉 이란사태 한국증시     │
        │ 📊 이란사태 미국증시     │
        │ 🌊 태풍·호우 감시       │
        ├─────────────────────────┤
        │ ⚙️ 주제 관리...         │
        └─────────────────────────┘
```

### 6.2 주제 관리 모달 (설정)

```
┌────────────────────── 주제 관리 ──────────────────────┐
│                                                       │
│  내장 주제                                             │
│  ┌───────────────────────────────────────────────┐    │
│  │ 🔥 산불 감시       [활성] [편집]               │    │
│  │ ⚔️ 이란 전쟁       [활성] [편집]               │    │
│  │ 📉 이란사태 한국증시 [활성] [편집]              │    │
│  │ 📊 이란사태 미국증시 [활성] [편집]              │    │
│  └───────────────────────────────────────────────┘    │
│                                                       │
│  커스텀 주제                                           │
│  ┌───────────────────────────────────────────────┐    │
│  │ (아직 없음)                                    │    │
│  │ [+ 새 주제 만들기]                             │    │
│  └───────────────────────────────────────────────┘    │
│                                                       │
│  [닫기]                                               │
└───────────────────────────────────────────────────────┘
```

### 6.3 커스텀 주제 생성 폼

```
┌──────────────── 새 주제 만들기 ────────────────────────┐
│                                                        │
│  주제명:    [________________________]                  │
│  아이콘:    [🔍] (이모지 선택)                          │
│  설명:      [________________________]                  │
│                                                        │
│  ── 지도 설정 ──                                       │
│  중심 좌표:  위도 [____] 경도 [____]                    │
│  줌 레벨:   [____]                                     │
│                                                        │
│  ── 테마 색상 ──                                       │
│  주요색:    [●] #______                                │
│  프리셋:    [그린] [레드] [블루] [골드] [퍼플]           │
│                                                        │
│  ── 뉴스 키워드 ──                                     │
│  한국 뉴스:  [________________________]                 │
│  영문 뉴스:  [________________________]                 │
│  YouTube:   [________________________]                  │
│                                                        │
│  ── AI 브리핑 ──                                       │
│  분석 관점:  [________________________]                 │
│  핵심 키워드: [______] [______] [+추가]                 │
│                                                        │
│  [미리보기]                        [취소] [저장]        │
└────────────────────────────────────────────────────────┘
```

---

## 7. 아키텍처 변경

### 7.1 파일 구조 변경

```
src/
├── config/
│   ├── constants.ts          # 기존 (글로벌 상수)
│   ├── topics/
│   │   ├── index.ts          # TopicConfig 타입 + 목록 export
│   │   ├── korea-forest.ts   # 산불 감시 설정
│   │   ├── iran-war.ts       # 이란 전쟁 설정
│   │   ├── iran-kr-stock.ts  # 이란사태 한국증시
│   │   ├── iran-us-stock.ts  # 이란사태 미국증시
│   │   └── _template.ts      # 새 주제 템플릿
│   ├── feed-sources.ts       # → 주제별로 분리 (topics/ 하위)
│   └── map-layers.ts         # → 주제에서 관리
├── services/
│   ├── topic-manager.ts      # 주제 전환 로직 (NEW)
│   ├── theme-engine.ts       # CSS 변수 주입 (NEW)
│   └── ...
├── components/
│   ├── TopicSelector.ts      # 드롭다운 (NEW)
│   ├── TopicManager.ts       # 관리 모달 (NEW)
│   └── ...
└── styles/
    ├── base.css              # 하드코딩 → CSS 변수로 교체
    ├── panels.css            # 하드코딩 → CSS 변수로 교체
    └── themes.css            # 테마 변수 정의 (NEW)
```

### 7.2 주제 전환 흐름

```
사용자가 주제 선택
    ↓
TopicSelector.onChange(topicId)
    ↓
TopicManager.switchTopic(topicId)
    ├── 1. ThemeEngine.apply(topic.theme)     → CSS 변수 주입
    ├── 2. Map.flyTo(topic.map.center)        → 지도 이동
    ├── 3. LayerToggle.reset(topic.layers)    → 레이어 전환
    ├── 4. PanelLayout.rebuild(topic.panels)  → 패널 재구성
    ├── 5. FeedService.setFeeds(topic.feeds)  → 피드 교체
    ├── 6. YouTubePanel.setQuery(topic.youtube) → 유튜브 갱신
    ├── 7. AiBrief.setPrompt(topic.aiBriefing)  → AI 컨텍스트
    └── 8. localStorage.set(STORAGE_KEY_TOPIC, topicId)
```

### 7.3 topic-manager.ts 핵심 로직

```typescript
class TopicManager {
  private activeTopic: TopicConfig;
  private customTopics: TopicConfig[] = [];

  constructor() {
    this.customTopics = this.loadCustomTopics();
    const savedId = localStorage.getItem(STORAGE_KEY_TOPIC) || 'korea-forest';
    this.activeTopic = this.findTopic(savedId);
  }

  getAllTopics(): TopicConfig[] {
    return [...BUILTIN_TOPICS, ...this.customTopics];
  }

  async switchTopic(topicId: string): Promise<void> {
    const topic = this.findTopic(topicId);
    if (!topic) return;

    // 트랜지션 애니메이션
    document.body.classList.add('topic-transitioning');

    // 1. 테마 전환
    ThemeEngine.apply(topic.theme);

    // 2. 헤더 업데이트
    this.updateHeader(topic);

    // 3. 지도 이동
    await this.mapTransition(topic.map);

    // 4. 레이어 전환
    this.updateLayers(topic.layers);

    // 5. 패널 재구성
    this.rebuildPanels(topic.panels);

    // 6. 피드 교체
    this.updateFeeds(topic.feeds);

    // 7. YouTube 갱신
    this.updateYouTube(topic.youtube);

    // 8. AI 컨텍스트
    this.updateAiBriefing(topic.aiBriefing);

    // 9. 저장
    this.activeTopic = topic;
    localStorage.setItem(STORAGE_KEY_TOPIC, topic.id);

    document.body.classList.remove('topic-transitioning');
  }

  saveCustomTopic(topic: TopicConfig): void { ... }
  deleteCustomTopic(topicId: string): void { ... }
}
```

### 7.4 theme-engine.ts

```typescript
class ThemeEngine {
  static apply(theme: TopicTheme): void {
    const root = document.documentElement.style;
    root.setProperty('--accent', theme.accent);
    root.setProperty('--accent-rgb', theme.accentRgb);
    root.setProperty('--header-tint', theme.headerTint);
    root.setProperty('--panel-border', theme.panelBorder);
    root.setProperty('--panel-bg', theme.panelBg);
    root.setProperty('--marker-primary', theme.markerPrimary);
    root.setProperty('--marker-secondary', theme.markerSecondary);
    root.setProperty('--badge-bg', theme.badgeBg);
  }
}
```

---

## 8. 새로운 패널 타입 (확장)

주제별로 필요한 신규 패널 컴포넌트:

| 패널 타입 | 사용 주제 | 설명 |
|----------|----------|------|
| `conflict-timeline` | 이란 전쟁 | 분쟁 이벤트 타임라인 (뉴스 기반) |
| `stock-ticker` | 증시 주제 | 실시간 주가지수 표시 |
| `stock-sectors` | 증시 주제 | 업종별 등락 히트맵 |
| `oil-price` | 증시/전쟁 | WTI/Brent 유가 차트 |
| `earthquake` | 자연재해 | 실시간 지진 목록 |
| `typhoon-track` | 태풍 | 태풍 예상 경로 |

이 패널들은 각 주제에서만 로드되므로 **동적 import**로 코드 스플리팅:

```typescript
const PANEL_REGISTRY: Record<string, () => Promise<PanelConstructor>> = {
  'fire-hotspot': () => import('./FireHotspotPanel'),
  'weather': () => import('./WeatherPanel'),
  'stock-ticker': () => import('./StockTickerPanel'),
  'conflict-timeline': () => import('./ConflictTimelinePanel'),
  'oil-price': () => import('./OilPricePanel'),
  // ...
};
```

---

## 9. URL 라우팅

```
https://assieye.vercel.app/                    → 마지막 선택 주제 (localStorage)
https://assieye.vercel.app/?topic=iran-war     → 이란 전쟁 모드로 진입
https://assieye.vercel.app/?topic=iran-kr-stock → 이란사태 한국증시
```

URL 파라미터는 localStorage보다 우선한다. 공유 링크로 특정 주제 대시보드를 바로 열 수 있다.

---

## 10. 구현 로드맵

### Phase 1: 테마 + 주제 전환 프레임워크 (1주)

- [ ] `TopicConfig` 타입 정의 + 내장 주제 4개 설정 파일 작성
- [ ] CSS 하드코딩 → CSS 변수 전환 (`base.css`, `panels.css`, `map.css`)
- [ ] `ThemeEngine` 구현 (CSS 변수 주입)
- [ ] `TopicManager` 코어 로직 (주제 전환, localStorage 저장/복원)
- [ ] `TopicSelector` 헤더 드롭다운 UI
- [ ] 주제 전환 트랜지션 애니메이션

### Phase 2: 주제별 데이터 분리 (1주)

- [ ] 피드 소스를 주제별로 분리
- [ ] YouTube 검색어 주제별 전환
- [ ] AI 브리핑 프롬프트 주제별 전환
- [ ] 지도 중심/줌 자동 전환
- [ ] 레이어 토글 주제 연동

### Phase 3: 커스텀 주제 + 신규 패널 (2주)

- [ ] 커스텀 주제 생성/편집/삭제 UI (모달)
- [ ] 패널 레지스트리 + 동적 import
- [ ] `stock-ticker` 패널 (간단한 주가지수 표시)
- [ ] `oil-price` 패널 (유가 위젯)
- [ ] `conflict-timeline` 패널 (뉴스 기반 타임라인)
- [ ] URL 파라미터 지원 (`?topic=xxx`)

### Phase 4: 고도화 (지속)

- [ ] 주제별 지도 스타일 분리 (다크/밝은/위성)
- [ ] 주제 공유 기능 (JSON export/import)
- [ ] 주제 프리셋 마켓플레이스 (커뮤니티 공유)
- [ ] 키보드 단축키 (1~9 번호로 주제 전환)
- [ ] 다중 모니터 지원 (한 모니터 = 한 주제)

---

## 11. 기존 코드 영향 분석

### 최소 변경으로 전환하기

현재 구조에서 **주제 설정을 config 레벨에서 주입**하면 대부분의 컴포넌트는 수정 없이 동작한다:

| 현재 파일 | 변경 수준 | 내용 |
|----------|----------|------|
| `config/constants.ts` | 중 | `KOREA_CENTER` 등을 주제에서 읽도록 |
| `config/feed-sources.ts` | 중 | 주제별 피드로 교체 |
| `config/map-layers.ts` | 소 | 주제별 기본 레이어로 교체 |
| `styles/base.css` | 대 | 하드코딩 색상 → CSS 변수 |
| `styles/panels.css` | 대 | 하드코딩 색상 → CSS 변수 |
| `styles/map.css` | 소 | 일부 색상 변수화 |
| `components/Header.ts` | 중 | 드롭다운 추가 |
| `components/FlatMap.ts` | 소 | center/zoom을 외부에서 받도록 |
| `components/GlobeMap.ts` | 소 | POV를 외부에서 받도록 |
| `app/data-loader.ts` | 중 | 주제별 피드 URL 동적 교체 |
| `app/app-context.ts` | 중 | activeTopic 상태 추가 |
| `services/feeds.ts` | 소 | 피드 URL 리스트를 동적으로 |
| `services/youtube.ts` | 소 | 검색어 동적 교체 |

**핵심 원칙:** 기존 패널 컴포넌트(FireHotspotPanel, WeatherPanel 등)는 데이터만 받아서 렌더링하므로, 데이터 소스만 바꿔주면 그대로 동작한다. 테마는 CSS 변수만 바꾸면 전체가 전환된다.

---

## 12. 성공 지표

| 지표 | 목표 |
|------|------|
| 주제 전환 소요 시간 | < 1초 (테마 + 패널 + 지도 전환) |
| 내장 주제 수 | 4개 (산불, 이란전쟁, 한국증시, 미국증시) |
| 커스텀 주제 생성 난이도 | 5분 내 비개발자도 생성 가능 |
| CSS 변수 커버리지 | 모든 색상의 95%+ 변수화 |
| 번들 사이즈 증가 | < 15KB (주제 설정 + 매니저) |
