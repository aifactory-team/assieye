# 대전 화재 실시간 뉴스 모니터링 구현 계획

**PRD:** `prd-daejeon-fire-news.md`
**생성:** 2026-03-20
**상태:** APPROVED

---

## 요구사항 요약

Claude Code 에이전트가 주기적으로 뉴스를 수집하여 `data/daejeon-fire/news.json`에 저장하면, AssiEye 대시보드가 10초 폴링으로 해당 파일을 읽어 실시간 반영하는 **에이전트-대시보드 파이프라인** 구축.

---

## 수용 기준 (Acceptance Criteria)

- [ ] AC1: `daejeon-fire` 토픽 선택 시 대전시 중심(36.35, 127.38) zoom=12로 지도 이동
- [ ] AC2: AgentNewsPanel이 `data/daejeon-fire/news.json` 데이터를 10초 간격으로 폴링하여 표시
- [ ] AC3: severity별 색상 배지 표시 (critical=빨강, high=주황, medium=노랑, low=회색)
- [ ] AC4: 상황 요약(summary) 섹션이 패널 상단에 고정 표시
- [ ] AC5: 에이전트 분석 노트(agentNote)가 각 뉴스 아이템에 표시
- [ ] AC6: 마지막 업데이트 시각 + 업데이트 횟수가 헤더에 표시
- [ ] AC7: 새 뉴스 도착 시 하이라이트 애니메이션 동작
- [ ] AC8: 뉴스 클릭 시 원문 링크가 새 탭에서 열림
- [ ] AC9: `npm run build` (tsc + vite build) 에러 없이 통과
- [ ] AC10: dev 서버에서 `/data/daejeon-fire/news.json` 정적 파일 접근 가능

---

## 구현 단계

### Step 1: 타입 정의 추가
**파일:** `src/types/index.ts` (L67 이후 추가)
**작업:**
- `AgentNewsItem` 인터페이스 추가: id, title, link, pubDate, source, description, category, lang, severity, tags, agentNote
- `AgentNewsSummary` 인터페이스 추가: situation, casualties, response, outlook, lastAnalysis
- `AgentNewsMeta` 인터페이스 추가: topic, lastUpdated, agentId, updateCount, searchQueries
- `AgentNewsData` 인터페이스 추가: meta, items, summary
- severity 타입: `'critical' | 'high' | 'medium' | 'low'`

### Step 2: 에이전트 뉴스 서비스 생성
**파일:** `src/services/agent-news.ts` (NEW)
**작업:**
- `fetchAgentNews()`: `/data/daejeon-fire/news.json?t=${Date.now()}` fetch (cache bust)
- `AgentNewsWatcher` 클래스: 폴링 기반 변경 감지
  - `start(onUpdate, intervalMs=10000)`: `meta.lastUpdated` 비교로 변경 감지
  - `stop()`: clearInterval
- 패턴 참조: `src/services/feeds.ts`의 fetch 패턴 따름

### Step 3: AgentNewsPanel 컴포넌트 생성
**파일:** `src/components/AgentNewsPanel.ts` (NEW)
**작업:**
- `Panel` 클래스 상속 (`src/components/Panel.ts:12`)
- FeedPanel (`src/components/FeedPanel.ts`) 패턴 따름
- 상단: 상황 요약 섹션 (summary.situation, casualties, response, outlook)
- 본문: 뉴스 아이템 리스트
  - severity 배지: critical(🔴 `#ff4444`), high(🟠 `#ff8800`), medium(🟡 `#ffcc00`), low(⚪ `#888888`)
  - source + pubDate 메타 라인
  - agentNote 표시 (💬 아이콘 접두)
  - 제목 클릭 → `target="_blank"` 링크
- 헤더: "에이전트 뉴스 · 업데이트 #N · M초 전" 형식
- 새 아이템 도착 시 `agent-news-new` CSS 클래스 토글 (하이라이트 애니메이션)
- DOM 유틸 사용: `h()`, `replaceChildren()`, `safeHtml()`, `escapeHtml()` (`src/utils/dom-utils.ts`, `src/utils/format.ts`)

### Step 4: 대전 화재 토픽 설정 생성
**파일:** `src/config/topics/daejeon-fire.ts` (NEW)
**작업:**
- PRD 섹션 4.1의 `TOPIC_DAEJEON_FIRE` 설정 그대로 구현
- 기존 `korea-forest.ts` 패턴 따름
- theme: 빨간 계열 accent (#ff4444)
- map center: 대전시 (36.35, 127.38), zoom: 12
- panels.left에 `{ type: 'agent-news', title: '에이전트 뉴스' }` 포함
- feeds: 대전 화재 한/영 Google News RSS
- youtube: `대전 화재 실시간`

### Step 5: 토픽 인덱스 등록
**파일:** `src/config/topics/index.ts` (MOD)
**작업:**
- `TOPIC_DAEJEON_FIRE` import 추가 (L5)
- `BUILTIN_TOPICS` 배열에 추가 (L9-14)
- export 목록에 추가 (L18)

### Step 6: App.ts에 AgentNewsPanel 통합
**파일:** `src/App.ts` (MOD)
**작업:**
- import 추가: `AgentNewsPanel` (L13 부근), `fetchAgentNews` + `AgentNewsWatcher` (L31 부근)
- 프로퍼티 추가: `agentNewsPanel: AgentNewsPanel | null = null`, `agentNewsWatcher: AgentNewsWatcher | null = null`
- `createPanel()` switch문에 `case 'agent-news'` 추가 (L146-230)
- `clearPanelRefs()`에 `this.agentNewsPanel = null` 추가 (L233-247)
- `loadDataForCurrentPanels()`에 agentNews 로딩 추가 (L346-366)
- `loadAgentNews()` 메서드 추가: fetchAgentNews → panel.update
- `scheduleRefreshes()`에 agentNews 10초 폴링 스케줄 추가 (L368-401)
- `destroy()`에 watcher.stop() 추가 (L632-651)

### Step 7: Vite data 디렉토리 서빙
**파일:** `vite.config.ts` (MOD)
**작업:**
- `server.fs.allow` 또는 커스텀 미들웨어로 `data/` 디렉토리 정적 서빙
- 가장 간단한 방법: `public/` 대신 `server` 옵션에 미들웨어 추가
- 또는 `vite-api-plugin.js` 기존 패턴 활용하여 `/data` 경로 serve
- 프로덕션(Vercel)에서는 `vercel.json`에 `/data` rewrite 불필요 (에이전트 뉴스는 dev 전용, 프로덕션은 API 엔드포인트로 대체 가능)

### Step 8: CSS 스타일 추가
**파일:** `src/styles/` 내 기존 CSS 파일 (MOD)
**작업:**
- `.agent-news-summary` 섹션 스타일 (상단 고정, 배경색 구분)
- `.agent-news-item` 아이템 스타일
- `.severity-badge` 4단계 색상 (critical/high/medium/low)
- `.agent-note` 스타일 (💬 아이콘, 이탤릭, 약간 연한 색)
- `.agent-news-new` 하이라이트 애니메이션 (@keyframes flash)
- `.agent-news-meta` 헤더 메타 정보 스타일
- 기존 `.feed-item` 스타일 패턴 따름

### Step 9: 통합 검증
**작업:**
- `npm run typecheck` 통과 확인
- `npm run build` 통과 확인
- `npm run dev` → 브라우저에서 daejeon-fire 토픽 선택 → AgentNewsPanel 표시 확인
- `data/daejeon-fire/news.json`에 더미 아이템 추가 후 10초 내 패널 반영 확인

---

## 리스크 및 완화

| 리스크 | 영향 | 완화 |
|--------|------|------|
| news.json이 비어있거나 파싱 실패 | 패널 에러 표시 | fetchAgentNews에 try-catch + 빈 상태 UI 표시 |
| 10초 폴링이 dev 서버에 부하 | 브라우저 성능 저하 | cache-bust 파라미터 + 304 Not Modified 활용 |
| Vercel 프로덕션에서 /data 접근 불가 | 프로덕션 미동작 | 현재는 dev 전용으로 제한, 향후 API 엔드포인트 추가 |
| news.json 동시 읽기/쓰기 충돌 | JSON 파싱 에러 | 에이전트 atomic write (tmp → rename), 클라이언트 파싱 에러 시 이전 데이터 유지 |

---

## 검증 단계 (Verification)

1. `npm run typecheck` — 타입 에러 0건
2. `npm run build` — 빌드 성공
3. dev 서버 기동 → `http://localhost:5173/data/daejeon-fire/news.json` 접근 가능
4. 토픽 선택 UI에서 "대전 화재" 토픽 표시 확인
5. 토픽 전환 시 지도가 대전시 중심으로 이동
6. AgentNewsPanel에 빈 상태 메시지 표시 (items 비어있으므로)
7. news.json에 더미 아이템 수동 추가 → 10초 후 패널 갱신
8. severity 배지 4색 모두 정상 렌더링

---

## 의존성 그래프

```
Step 1 (타입) ─────┬──> Step 2 (서비스) ──┬──> Step 6 (App.ts 통합)
                   ├──> Step 3 (패널)   ──┘
                   └──> Step 4 (토픽) ──> Step 5 (인덱스) ──> Step 6
Step 7 (Vite) ─────────────────────────────────────────────> Step 9
Step 8 (CSS) ──────────────────────────────────────────────> Step 9
```

**병렬 가능:** Step 1 완료 후 → Step 2, 3, 4 병렬 진행 / Step 7, 8은 독립적으로 병렬 진행
