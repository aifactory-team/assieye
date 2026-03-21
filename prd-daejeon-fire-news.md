# AssiEye - 대전 화재 실시간 뉴스 모니터링 PRD

## 1. 개요

2026년 3월 20일 대전 지역 화재 사건을 집중 모니터링하는 **실시간 뉴스 에이전트 연동 시스템**을 구축한다.

**한 문장 정의:** Claude Code 에이전트가 주기적으로 뉴스를 수집·파일 저장하면, AssiEye가 해당 파일을 읽어 대시보드에 실시간 반영하는 **에이전트-대시보드 파이프라인**.

---

## 2. 아키텍처

```
+---------------------------+          +---------------------------+
|     Claude Code Agent     |          |        AssiEye App        |
|                           |          |                           |
|  1. 웹 검색 (뉴스, SNS)   |          |  1. 파일 폴링 (10초)      |
|  2. 결과 정제·중복제거     |  ─────>  |  2. JSON 파싱             |
|  3. JSON 파일 저장         |  파일    |  3. FeedPanel 렌더링      |
|     data/daejeon-fire/    |  시스템   |  4. 지도 마커 업데이트     |
|     news.json             |          |  5. 알림 발생             |
+---------------------------+          +---------------------------+
```

### 핵심 원칙
- **파일 기반 IPC**: 에이전트와 대시보드 간 통신은 로컬 JSON 파일을 통해 이루어진다
- **폴링 방식**: AssiEye는 주기적으로 파일을 읽어 변경사항을 감지한다
- **단방향 데이터 흐름**: Agent → File → AssiEye (에이전트가 쓰고, AssiEye가 읽기만)

---

## 3. 데이터 스키마

### 3.1 에이전트 출력 파일: `data/daejeon-fire/news.json`

```json
{
  "meta": {
    "topic": "daejeon-fire-2026-03-20",
    "lastUpdated": "2026-03-20T14:30:00+09:00",
    "agentId": "claude-code",
    "updateCount": 15,
    "searchQueries": [
      "대전 화재",
      "대전 불",
      "대전 산불",
      "대전 화재 피해",
      "Daejeon fire"
    ]
  },
  "items": [
    {
      "id": "agent-daejeon-fire-1710901800000",
      "title": "대전 유성구 대형 화재 발생… 소방 총력 대응",
      "link": "https://example.com/news/1234",
      "pubDate": "2026-03-20T13:00:00+09:00",
      "source": "연합뉴스",
      "description": "대전 유성구 일대에서 대형 화재가 발생해 소방당국이 총력 대응 중이다...",
      "category": "breaking",
      "lang": "ko",
      "severity": "critical",
      "tags": ["대전", "화재", "유성구", "소방"],
      "agentNote": "에이전트 분석: 초기 화재로 확산 중, 주민 대피 시작"
    }
  ],
  "summary": {
    "situation": "대전 유성구 일대 대형 화재, 확산 중",
    "casualties": "확인 중",
    "response": "소방차 50대 이상 투입, 3단계 대응",
    "outlook": "바람 영향으로 확산 우려",
    "lastAnalysis": "2026-03-20T14:30:00+09:00"
  }
}
```

### 3.2 severity 레벨

| 레벨 | 의미 | 대시보드 표현 |
|------|------|-------------|
| `critical` | 속보, 긴급 | 빨간 배지, 알림음 |
| `high` | 주요 진전 | 주황 배지 |
| `medium` | 일반 보도 | 노란 배지 |
| `low` | 배경 정보 | 회색 배지 |

---

## 4. AssiEye 구현 범위

### 4.1 새 토픽: `daejeon-fire`

기존 토픽 시스템(`src/config/topics/`)에 대전 화재 토픽을 추가한다.

```typescript
// src/config/topics/daejeon-fire.ts
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
    center: { lat: 36.35, lng: 127.38 },  // 대전시
    zoom: 12,
    globeAltitude: 1.2,
  },
  layers: {
    fires: true,
    weather: true,
    cctv: true,
  },
  panels: {
    left: [
      { type: 'fire-hotspot' },
      { type: 'weather' },
      { type: 'agent-news', title: '에이전트 뉴스' },  // 새 패널
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
    { id: 'daejeon-fire-ko', name: '대전 화재 뉴스', url: 'https://news.google.com/rss/search?q=대전+화재&hl=ko&gl=KR&ceid=KR:ko', lang: 'ko', category: 'breaking' },
    { id: 'daejeon-fire-en', name: 'Daejeon Fire', url: 'https://news.google.com/rss/search?q=Daejeon+fire&hl=en&gl=US&ceid=US:en', lang: 'en', category: 'international' },
  ],
  youtube: {
    liveSearchQuery: '대전 화재 실시간',
    vodSearchQuery: '대전 불 화재',
  },
  aiBriefing: {
    systemPrompt: '대전 지역 화재 상황을 실시간 분석하는 전문가 역할로, 화재 현황, 피해 규모, 대응 상황, 주민 대피 현황을 종합 브리핑해주세요.',
    focusKeywords: ['대전', '화재', '산불', '소방', '대피'],
    lang: 'ko',
  },
  refreshIntervals: {
    agentNews: 10_000,   // 에이전트 뉴스 10초
    feeds: 60_000,       // RSS 피드 1분
    weather: 300_000,    // 기상 5분
  },
  isBuiltIn: true,
};
```

### 4.2 에이전트 뉴스 로더: `src/services/agent-news.ts`

에이전트가 저장한 JSON 파일을 **로컬 dev 서버 또는 API 엔드포인트**를 통해 폴링한다.

```typescript
// 핵심 로직
interface AgentNewsData {
  meta: { lastUpdated: string; updateCount: number; /* ... */ };
  items: AgentNewsItem[];
  summary: AgentNewsSummary;
}

// 파일 경로 기반 fetch (dev 서버 static serving)
const AGENT_NEWS_URL = '/data/daejeon-fire/news.json';

export async function fetchAgentNews(): Promise<AgentNewsData> {
  const res = await fetch(`${AGENT_NEWS_URL}?t=${Date.now()}`); // cache bust
  if (!res.ok) throw new Error(`Agent news fetch failed: ${res.status}`);
  return res.json();
}
```

### 4.3 에이전트 뉴스 패널: `src/components/AgentNewsPanel.ts`

에이전트가 수집한 뉴스를 표시하는 전용 패널.

**기능:**
- severity별 색상 배지 (critical=빨강, high=주황, medium=노랑, low=회색)
- 에이전트 분석 노트 표시 (`agentNote`)
- 마지막 업데이트 시각 + 업데이트 횟수 표시
- 상황 요약(summary) 섹션 상단 고정
- 새 뉴스 도착 시 하이라이트 애니메이션
- 뉴스 클릭 시 원문 링크 오픈

**레이아웃:**
```
┌─────────────────────────────┐
│ 🤖 에이전트 뉴스   업데이트 #15 │
│ 마지막: 14:30 (10초 전)       │
├─────────────────────────────┤
│ 📋 상황 요약                  │
│ 대전 유성구 대형 화재, 확산 중  │
│ 사상자: 확인 중               │
│ 대응: 소방차 50대+, 3단계     │
├─────────────────────────────┤
│ 🔴 [속보] 대전 유성구 대형...  │
│    연합뉴스 · 13:00           │
│    💬 초기 화재로 확산 중...    │
│ 🟠 대전 화재 주민 대피 시작... │
│    KBS · 13:15                │
│ 🟡 소방청 "대전 화재 3단계..." │
│    뉴시스 · 13:30             │
└─────────────────────────────┘
```

### 4.4 Vite 정적 파일 서빙

`data/` 디렉토리를 Vite가 정적으로 서빙하도록 설정한다.

```typescript
// vite.config.ts 수정
export default defineConfig({
  publicDir: 'public',
  server: {
    // data/ 디렉토리를 추가 서빙
  },
  plugins: [
    // 기존 플러그인...
    {
      name: 'serve-data',
      configureServer(server) {
        server.middlewares.use('/data', sirv('data', { dev: true }));
      }
    }
  ]
});
```

또는 더 간단하게 `public/data/` 심볼릭 링크 또는 Vite `server.fs.allow`를 사용한다.

### 4.5 변경 감지 및 알림

```typescript
// src/services/agent-news.ts 의 폴링 로직
class AgentNewsWatcher {
  private lastUpdateTime: string = '';
  private intervalId: number | null = null;

  start(onUpdate: (data: AgentNewsData) => void, intervalMs = 10_000) {
    this.intervalId = window.setInterval(async () => {
      const data = await fetchAgentNews();
      if (data.meta.lastUpdated !== this.lastUpdateTime) {
        this.lastUpdateTime = data.meta.lastUpdated;
        onUpdate(data);  // 새 데이터 콜백
      }
    }, intervalMs);
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
  }
}
```

---

## 5. 파일 구조 (변경/추가)

```
assieye/
├── data/                              # [NEW] 에이전트 데이터 디렉토리
│   └── daejeon-fire/
│       └── news.json                  # 에이전트가 쓰는 뉴스 파일
│
├── src/
│   ├── config/topics/
│   │   ├── daejeon-fire.ts            # [NEW] 대전 화재 토픽 설정
│   │   └── index.ts                   # [MOD] daejeon-fire 토픽 등록
│   │
│   ├── services/
│   │   └── agent-news.ts              # [NEW] 에이전트 뉴스 로더 + 워쳐
│   │
│   ├── components/
│   │   └── AgentNewsPanel.ts          # [NEW] 에이전트 뉴스 패널 컴포넌트
│   │
│   ├── types/
│   │   └── index.ts                   # [MOD] AgentNewsItem, AgentNewsData 타입 추가
│   │
│   └── App.ts                         # [MOD] agent-news 패널 타입 등록 + 데이터 로딩
│
├── vite.config.ts                     # [MOD] data/ 디렉토리 서빙 설정
└── prd-daejeon-fire-news.md           # [NEW] 이 문서
```

---

## 6. 에이전트 측 인터페이스 (참고)

> 이 섹션은 AssiEye 구현 범위 밖이며, Claude Code 에이전트 구현 시 참고용이다.

### 6.1 에이전트가 해야 할 일

1. **검색 키워드**: `대전 화재`, `대전 불`, `대전 산불`, `대전 화재 피해`, `대전 소방`, `Daejeon fire`
2. **검색 소스**: 네이버 뉴스, 구글 뉴스, 트위터/X, 유튜브 실시간
3. **주기**: 2~5분마다 검색 반복
4. **출력**: `data/daejeon-fire/news.json`에 위 스키마대로 저장
5. **중복 제거**: 같은 기사 URL은 한 번만 포함
6. **요약 갱신**: 매 업데이트마다 `summary` 섹션을 AI가 재작성

### 6.2 에이전트 파일 쓰기 규칙

- JSON은 항상 유효해야 한다 (파싱 실패 방지)
- `meta.lastUpdated`는 반드시 ISO 8601 형식
- `items`는 최신순 정렬 (pubDate 내림차순)
- 최대 100개 아이템 유지 (오래된 것 자동 삭제)
- 임시 파일 쓰기 후 rename (atomic write) 권장

---

## 7. 구현 순서

| 단계 | 작업 | 의존성 |
|------|------|--------|
| **1** | `data/daejeon-fire/news.json` 초기 파일 생성 (빈 스키마) | 없음 |
| **2** | `src/types/` 에 AgentNews 타입 정의 | 없음 |
| **3** | `src/services/agent-news.ts` 로더+워쳐 구현 | 2 |
| **4** | `src/components/AgentNewsPanel.ts` 구현 | 2, 3 |
| **5** | `src/config/topics/daejeon-fire.ts` 토픽 설정 | 없음 |
| **6** | `src/config/topics/index.ts` 에 등록 | 5 |
| **7** | `src/App.ts` 에 AgentNewsPanel 등록 + 데이터 로딩 | 3, 4, 6 |
| **8** | `vite.config.ts` data 디렉토리 서빙 | 없음 |
| **9** | 통합 테스트 (더미 데이터로 패널 확인) | 전체 |
