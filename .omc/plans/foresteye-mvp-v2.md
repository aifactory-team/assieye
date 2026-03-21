# ForestEye MVP Implementation Plan v2

## Context

### Original Request
Build the ForestEye MVP (Phase 1) -- a real-time forest science OSINT dashboard for NIFoS (National Institute of Forest Science). The system integrates wildfire hotspot data, weather overlays, forest policy RSS feeds, AI news summarization, wildfire risk heatmaps, and Telegram alerts on a dual-map engine (3D globe + flat map) centered on the Korean peninsula.

### Current State Assessment
The project has **substantial existing implementation**. TypeScript compiles with zero errors. The following is already built:

**Already Implemented (code exists, compiles):**
- Project scaffolding (US-001): `package.json`, `tsconfig.json`, `vite.config.ts`, `vercel.json`, Panel base class, `h()` DOM helper, i18n infrastructure, AppModule interface
- Dual map engine (US-002): `GlobeMap.ts`, `FlatMap.ts`, `MapContainer.ts`, `MapToolbar.ts`, `LayerToggle.ts`, `Layout.ts`, `Header.ts`
- NASA FIRMS integration (US-003): `api/firms.js`, `src/services/firms.ts`, `FireHotspotPanel.ts`, `FireHotspotLayer.ts`
- Weather API (US-004): `api/weather.js`, `src/services/weather.ts`, `WeatherPanel.ts`, `WeatherLayer.ts`, `kma-grid.ts`
- RSS feeds (US-005): `api/feeds.js`, `src/services/feeds.ts`, `FeedPanel.ts`, `feed-sources.ts`
- DWI heatmap (US-006): `api/dwi.js`, `src/services/dwi.ts`, `DwiLayer.ts`, `DwiLegend.ts`
- Telegram alerts (US-007): `api/send-alert.js`, `src/services/alerts.ts`, `AlertPanel.ts`
- AI summarization (US-008): `api/summarize.js`, `src/services/ai-summary.ts`, `AiBriefPanel.ts`
- StatusBar, DataStatusPanel, RefreshScheduler, `api/health.js`

**Bonus features (beyond original PRD scope):**
- Satellite tracking: `SatellitePanel.ts`, `api/satellites.js`, `src/services/satellites.ts`
- Flight tracking: `FlightPanel.ts`, `api/flights.js`, `src/services/flights.ts`
- YouTube integration: `YouTubePanel.ts`, `api/youtube.js`, `src/services/youtube.ts`
- CCTV cameras: `src/services/cctv.ts`, `api/cctv.js`

### What Needs Verification
Although code exists, the following acceptance criteria from `prd.json` need runtime verification and potential fixes:

---

## Requirements Summary (PRD User Stories)

### US-001: Project Scaffolding (Priority 1)
| AC | Acceptance Criteria | Status |
|----|---------------------|--------|
| 1 | `npm install` completes without errors | VERIFY |
| 2 | `npm run dev` starts Vite dev server, ForestEye header visible | VERIFY |
| 3 | `npm run typecheck` passes with 0 errors | PASS (verified) |
| 4 | Panel base class renders header + content DOM | VERIFY |
| 5 | `h('div', { className: 'test' }, 'hello')` creates valid DOM | VERIFY |
| 6 | `t()` returns Korean strings by default | VERIFY |
| 7 | `.env.example` has all environment variable placeholders | VERIFY |

### US-002: Dual Map Engine (Priority 2)
| AC | Acceptance Criteria | Status |
|----|---------------------|--------|
| 1 | 3D globe renders centered on Korea (36.5, 127.5) | VERIFY |
| 2 | Flat map renders with dark basemap centered on Korea | VERIFY |
| 3 | Toggle button switches globe/flat without WebGL errors | VERIFY |
| 4 | View transition preserves center/zoom approximately | VERIFY |
| 5 | Layer toggle panel shows on/off switches | VERIFY |
| 6 | Responsive: map fills width, min-height 300px on mobile | VERIFY |
| 7 | `destroy()` cleans up WebGL contexts | VERIFY |

### US-003: NASA FIRMS Hotspots (Priority 3)
| AC | Acceptance Criteria | Status |
|----|---------------------|--------|
| 1 | Hotspots render as FRP/brightness-colored dots on flat map | VERIFY |
| 2 | Hotspots render as markers on 3D globe | VERIFY |
| 3 | 15-minute auto-refresh via RefreshScheduler | VERIFY |
| 4 | FireHotspotPanel shows region stats table | VERIFY |
| 5 | Region click zooms map to area | VERIFY |
| 6 | Loading/error states with showLoading/showError | VERIFY |
| 7 | API key not exposed to browser (Edge Function proxy) | VERIFY |

### US-004: Weather API (Priority 4)
| AC | Acceptance Criteria | Status |
|----|---------------------|--------|
| 1 | Weather stations shown as wind arrow icons on flat map | VERIFY |
| 2 | Arrows rotated by wind direction, color-coded by speed | VERIFY |
| 3 | WeatherPanel shows 5+ station readings | VERIFY |
| 4 | Hover tooltip with temp/humidity/wind details | VERIFY |
| 5 | Open-Meteo fallback when KMA unavailable | VERIFY |
| 6 | KMA grid conversion (nx/ny <-> lat/lng) accurate | VERIFY |

### US-005: RSS OSINT Feeds (Priority 5)
| AC | Acceptance Criteria | Status |
|----|---------------------|--------|
| 1 | 3+ RSS feed sources collected and displayed | VERIFY |
| 2 | Items sorted by publication date, newest first | VERIFY |
| 3 | Category filter tabs (all/policy/international/monitoring) | VERIFY |
| 4 | Click opens source URL in new tab | VERIFY |
| 5 | 30-minute refresh via RefreshScheduler | VERIFY |
| 6 | Korean/English feeds display correctly | VERIFY |
| 7 | HTML sanitized via DOMPurify | VERIFY |

### US-006: DWI Heatmap (Priority 6)
| AC | Acceptance Criteria | Status |
|----|---------------------|--------|
| 1 | Heatmap layer on flat map over Korean peninsula | VERIFY |
| 2 | Color mapping: green=safe to red=extreme | VERIFY |
| 3 | Legend with Korean risk labels | VERIFY |
| 4 | Layer on/off via LayerToggle | VERIFY |
| 5 | Daily refresh via RefreshScheduler | VERIFY |
| 6 | Performance OK with < 1000 data points | VERIFY |

### US-007: Telegram Alert Bot (Priority 7)
| AC | Acceptance Criteria | Status |
|----|---------------------|--------|
| 1 | New hotspot triggers Telegram message (Korean format) | VERIFY |
| 2 | Dedup prevents duplicate alerts (ID-based) | VERIFY |
| 3 | AlertPanel shows sent history | VERIFY |
| 4 | Rate limiting per grid cell per 15 minutes | VERIFY |
| 5 | Graceful failure when Telegram API unreachable | VERIFY |

### US-008: AI News Summary (Priority 8)
| AC | Acceptance Criteria | Status |
|----|---------------------|--------|
| 1 | Article summary under 10 seconds | VERIFY |
| 2 | Korean articles summarized in Korean, English in English | VERIFY |
| 3 | Daily brief aggregates multiple articles | VERIFY |
| 4 | localStorage cache for summaries | VERIFY |
| 5 | Rate limiting: max 10/minute | VERIFY |
| 6 | showLoading() during summarization | VERIFY |
| 7 | Claude API key server-side only | VERIFY |

### US-009: Vercel Deployment & Polish (Priority 9)
| AC | Acceptance Criteria | Status |
|----|---------------------|--------|
| 1 | `vercel deploy` or `vercel --prod` succeeds | VERIFY |
| 2 | All API endpoints accessible on deployed URL | VERIFY |
| 3 | API keys not exposed in client-side code | VERIFY |
| 4 | StatusBar shows data freshness timestamps | VERIFY |
| 5 | Error states show Korean user-friendly messages | VERIFY |
| 6 | Chrome/Firefox/Safari latest versions work | VERIFY |
| 7 | Mobile layout (map + stacked panels) usable | VERIFY |
| 8 | All user-facing strings use `t()` with Korean defaults | VERIFY |

---

## Work Objectives

### Core Objective
Bring all 9 user stories to PASS status by verifying existing implementations against acceptance criteria, fixing any issues found, and completing any missing functionality.

### Definition of Done
1. All 9 user stories pass their acceptance criteria
2. `npm run typecheck` passes with zero errors
3. `npm run dev` starts a fully functional dashboard
4. `npm run build` succeeds
5. All 13 API endpoints respond correctly
6. Dual map (globe + flat) renders centered on Korea
7. Fire hotspots, weather, DWI heatmap, RSS feeds, AI summary, alerts all functional

---

## Must Have / Must NOT Have

### Must Have
- TypeScript strict mode (`noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`)
- Vanilla TS class-based components extending `Panel` base class
- Manager pattern: `AppModule { init(), destroy() }`
- DOM construction via `h()` helper and `replaceChildren()` (NOT raw innerHTML)
- globe.gl for 3D, deck.gl + MapLibre for flat map
- Korean peninsula center (lat 36.5, lng 127.5)
- Vercel Edge Runtime serverless functions (`export const config = { runtime: 'edge' }`)
- `_cors.js` and `_rate-limit.js` API utilities
- i18n via i18next with `t()` for all user-facing strings (Korean default)
- `@/*` path alias to `src/*`
- Environment variables for all API keys
- Mobile-responsive layout

### Must NOT Have
- No React or JSX -- pure TypeScript DOM manipulation
- No heavy frameworks (Next.js, Nuxt, etc.)
- No database in MVP (use in-memory + API caching)
- No user authentication
- No Sentinel-2/NDVI layers (Phase 2)
- No pest/disease layers (Phase 2)
- No Tauri desktop app (Phase 2)

---

## Task Flow and Dependencies

```
Task 1: Runtime Verification & Fix (US-001 to US-009)
    |
    +---> Task 2: Fix US-001 issues (scaffolding)
    |         |
    |         v
    |    Task 3: Fix US-002 issues (dual map)
    |         |
    |         +---> Task 4: Fix US-003 issues (FIRMS hotspots)
    |         |         |
    |         |         +---> Task 8: Fix US-007 issues (Telegram alerts)
    |         |
    |         +---> Task 5: Fix US-004 issues (weather)
    |         |         |
    |         |         +---> Task 7: Fix US-006 issues (DWI heatmap)
    |         |
    |         +---> Task 6: Fix US-005 issues (RSS feeds)
    |                   |
    |                   +---> Task 9: Fix US-008 issues (AI summary)
    |
    v
Task 10: Fix US-009 issues (Vercel deployment & polish)
```

**Parallelization opportunities:**
- Tasks 4, 5, 6 can run in parallel (independent data sources)
- Tasks 7, 8, 9 can run in parallel after their dependencies

---

## Task 1: Runtime Verification Sweep

### Description
Run the application locally and systematically verify every acceptance criterion from all 9 user stories. Document pass/fail status for each.

### Steps
1. Run `npm install` -- verify no errors
2. Run `npm run dev` -- verify Vite dev server starts
3. Open browser to localhost -- verify ForestEye header renders
4. Run `npm run typecheck` -- verify 0 errors
5. Check browser console -- verify no runtime errors on page load
6. Test each map mode (globe, flat) -- verify Korea-centered rendering
7. Test map toggle -- verify no WebGL errors
8. Test layer toggles -- verify each layer renders/hides
9. Test each panel -- verify data loads, loading/error states work
10. Check each API endpoint via curl -- verify responses
11. Test mobile viewport (Chrome DevTools) -- verify responsive layout
12. Verify `.env.example` has all required keys

### Acceptance Criteria
- [ ] Complete pass/fail matrix for all 63 acceptance criteria across 9 user stories
- [ ] Issue list with severity (blocking/non-blocking) for each failure
- [ ] Priority-ordered fix list

### Verification
Run the verification script against each AC and record results.

---

## Task 2: Fix US-001 Scaffolding Issues

### Description
Fix any issues found in Task 1 related to project scaffolding.

### Files Potentially Affected
```
/Users/tykimos/assi/assieye/package.json
/Users/tykimos/assi/assieye/tsconfig.json
/Users/tykimos/assi/assieye/vite.config.ts
/Users/tykimos/assi/assieye/.env.example
/Users/tykimos/assi/assieye/src/components/Panel.ts
/Users/tykimos/assi/assieye/src/utils/dom-utils.ts
/Users/tykimos/assi/assieye/src/services/i18n.ts
/Users/tykimos/assi/assieye/src/i18n/ko.json
/Users/tykimos/assi/assieye/src/i18n/en.json
```

### Key Checks
- Panel base class must have `showLoading()`, `showError()`, `setCount()`, `setContent()`, `getElement()`, `destroy()` methods matching WorldMonitor patterns
- `h()` helper must match WorldMonitor's `dom-utils.ts` signature: `h(tag, propsOrChild?, ...children)`
- i18n must use `i18next` with `t()` function, Korean as default
- `.env.example` must contain: `NASA_FIRMS_MAP_KEY`, `KMA_API_KEY`, `CLAUDE_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `VITE_MAP_STYLE_URL`

### Acceptance Criteria
- [ ] All US-001 acceptance criteria pass
- [ ] `npm run typecheck` still passes after changes

### Verification
```bash
npm install && npm run typecheck && npm run dev
```

---

## Task 3: Fix US-002 Dual Map Engine Issues

### Description
Fix any issues with the dual map engine (globe.gl + deck.gl/MapLibre).

### Files Potentially Affected
```
/Users/tykimos/assi/assieye/src/components/MapContainer.ts
/Users/tykimos/assi/assieye/src/components/GlobeMap.ts
/Users/tykimos/assi/assieye/src/components/FlatMap.ts
/Users/tykimos/assi/assieye/src/components/MapToolbar.ts
/Users/tykimos/assi/assieye/src/components/LayerToggle.ts
/Users/tykimos/assi/assieye/src/components/Layout.ts
/Users/tykimos/assi/assieye/src/services/map-state.ts
/Users/tykimos/assi/assieye/src/styles/map.css
```

### Key Requirements
- GlobeMap: initial POV at lat 36.5, lng 127.5, altitude 2.0
- FlatMap: center [127.5, 36.5], zoom 6, dark basemap (CARTO Dark Matter)
- Toggle must destroy one WebGL context before creating the other
- View transition must approximately preserve center/zoom
- LayerToggle panel must show on/off switches for: fires, weather, dwi, satellites, flights, cctv
- Mobile: map fills available width, min-height 300px
- `destroy()` must properly clean up WebGL contexts (Three.js for globe, MapLibre for flat)

### Acceptance Criteria
- [ ] All US-002 acceptance criteria pass
- [ ] No WebGL context lost warnings in console
- [ ] Globe and flat map both render Korea-centered views

### Verification
Toggle between globe and flat map 5 times. Check console for errors. Resize to mobile viewport.

---

## Task 4: Fix US-003 FIRMS Hotspot Issues

### Description
Fix any issues with NASA FIRMS fire hotspot data integration.

### Files Potentially Affected
```
/Users/tykimos/assi/assieye/api/firms.js
/Users/tykimos/assi/assieye/src/services/firms.ts
/Users/tykimos/assi/assieye/src/components/FireHotspotPanel.ts
/Users/tykimos/assi/assieye/src/components/FireHotspotLayer.ts
```

### Key Requirements
- `api/firms.js`: proxies to `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${apiKey}/VIIRS_SNPP_NRT/${bbox}/${days}`
- Bounding box for Korea: `124,33,132,43`
- CSV parsed header-based (not position-based)
- Response format: `{ fireDetections: [...] }`
- Fire dots: color-coded by FRP/brightness (orange to red)
- FireHotspotPanel: region stats table with count, FRP, click-to-zoom
- RefreshScheduler: 15-minute interval (`REFRESH_INTERVALS.firms`)
- Loading/error states via `showLoading()`, `showError()`
- API key `NASA_FIRMS_MAP_KEY` env var, never sent to browser

### Acceptance Criteria
- [ ] All US-003 acceptance criteria pass
- [ ] `curl localhost:3000/api/firms` returns valid JSON
- [ ] Fire markers visible on map when data exists

### Verification
Call `/api/firms` with valid API key. Verify response. Check map rendering.

---

## Task 5: Fix US-004 Weather API Issues

### Description
Fix any issues with KMA weather data integration.

### Files Potentially Affected
```
/Users/tykimos/assi/assieye/api/weather.js
/Users/tykimos/assi/assieye/src/services/weather.ts
/Users/tykimos/assi/assieye/src/components/WeatherPanel.ts
/Users/tykimos/assi/assieye/src/components/WeatherLayer.ts
/Users/tykimos/assi/assieye/src/utils/kma-grid.ts
```

### Key Requirements
- Primary: KMA Open API (`apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst`)
- Fallback: Open-Meteo API (`api.open-meteo.com/v1/forecast`) -- no API key needed
- KMA grid conversion (Lambert Conformal Conic) in `kma-grid.ts`
- Wind arrows as IconLayer, rotated by direction, color-coded by speed:
  - Green: < 5 m/s
  - Yellow: 5-10 m/s
  - Orange: 10-15 m/s
  - Red: > 15 m/s
- WeatherPanel: 5+ stations with temp, humidity, wind speed/direction, rainfall
- Hover tooltip with detailed weather info
- 1-hour refresh interval

### Acceptance Criteria
- [ ] All US-004 acceptance criteria pass
- [ ] Open-Meteo fallback works when KMA key is not set
- [ ] Wind arrows correctly oriented

### Verification
Test with and without KMA_API_KEY. Verify Open-Meteo fallback.

---

## Task 6: Fix US-005 RSS Feed Issues

### Description
Fix any issues with forest policy RSS feed collection and display.

### Files Potentially Affected
```
/Users/tykimos/assi/assieye/api/feeds.js
/Users/tykimos/assi/assieye/src/services/feeds.ts
/Users/tykimos/assi/assieye/src/config/feed-sources.ts
/Users/tykimos/assi/assieye/src/components/FeedPanel.ts
```

### Key Requirements
- Minimum 3 RSS feed sources (e.g., FAO Forestry, Global Forest Watch, arXiv)
- Korean government RSS feeds may be unreliable -- need graceful degradation
- `api/feeds.js`: fetch RSS XML server-side, parse with `fast-xml-parser`
- Normalize to `RssFeedItem` schema: title, link, pubDate, source, description, category, lang
- FeedPanel: category tabs (All/Policy/International/Monitoring), sorted by pubDate descending
- Click opens source URL in new tab (`target="_blank" rel="noopener"`)
- HTML content sanitized via DOMPurify
- 30-minute refresh interval
- "AI 요약" button per item (integrates with AI summary service)

### Acceptance Criteria
- [ ] All US-005 acceptance criteria pass
- [ ] At least 3 feed sources return data
- [ ] Category tabs filter correctly

### Verification
`curl localhost:3000/api/feeds` -- verify at least 3 sources in response.

---

## Task 7: Fix US-006 DWI Heatmap Issues

### Description
Fix any issues with the wildfire risk index heatmap layer.

### Files Potentially Affected
```
/Users/tykimos/assi/assieye/api/dwi.js
/Users/tykimos/assi/assieye/src/services/dwi.ts
/Users/tykimos/assi/assieye/src/components/DwiLayer.ts
/Users/tykimos/assi/assieye/src/components/DwiLegend.ts
```

### Key Requirements
- Calculate DWI from weather data: `risk = clamp((temp * 2 + windSpeed * 3 - humidity * 0.5 - rainfall * 10), 0, 100)`
- Level mapping: 0-20 '안전', 21-50 '주의', 51-65 '경고', 66-85 '위험', 86-100 '매우위험'
- Grid resolution: 0.1-degree over Korea (~900 cells)
- HeatmapLayer from `@deck.gl/aggregation-layers`
- Color ramp: green -> yellow -> orange -> red -> dark red
- Legend with Korean labels
- Toggleable via LayerToggle
- Daily refresh
- Performance: < 1000 data points, no map degradation

### Acceptance Criteria
- [ ] All US-006 acceptance criteria pass
- [ ] Heatmap visible over Korea when layer enabled
- [ ] Legend readable with correct Korean labels

### Verification
Enable DWI layer. Verify heatmap renders. Check legend.

---

## Task 8: Fix US-007 Telegram Alert Issues

### Description
Fix any issues with Telegram bot alert notifications.

### Files Potentially Affected
```
/Users/tykimos/assi/assieye/api/send-alert.js
/Users/tykimos/assi/assieye/src/services/alerts.ts
/Users/tykimos/assi/assieye/src/components/AlertPanel.ts
```

### Key Requirements
- Alert triggered when new fire hotspot detected (not in previous fetch)
- Telegram message format (Korean): location, time, satellite, confidence, brightness, FRP
- Deduplication: track by hotspot ID (`${lat}-${lng}-${date}-${time}`)
- Rate limiting: max 1 alert per 15-minute window per 0.1-degree grid cell
- AlertPanel: shows sent alert history
- Graceful failure: log error if Telegram API unreachable, don't crash
- Env vars: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`

### Acceptance Criteria
- [ ] All US-007 acceptance criteria pass
- [ ] Alert panel shows test alert history
- [ ] No crash when Telegram creds not configured

### Verification
Test with and without Telegram credentials. Verify no errors when unconfigured.

---

## Task 9: Fix US-008 AI Summary Issues

### Description
Fix any issues with Claude API news summarization.

### Files Potentially Affected
```
/Users/tykimos/assi/assieye/api/summarize.js
/Users/tykimos/assi/assieye/src/services/ai-summary.ts
/Users/tykimos/assi/assieye/src/components/AiBriefPanel.ts
/Users/tykimos/assi/assieye/src/components/FeedPanel.ts
```

### Key Requirements
- `api/summarize.js`: POST endpoint calling Claude API (Anthropic Messages API)
- Model: `claude-sonnet-4-20250514` (or latest available)
- Modes: `summary` (single article, 2-3 sentences) and `brief` (daily aggregate)
- Language preservation: Korean -> Korean summary, English -> English summary
- Rate limiting: max 10 requests/minute
- Client-side caching: localStorage by content hash
- AiBriefPanel: "브리핑 생성" button, loading state, formatted output
- FeedPanel: "AI 요약" button per item, inline summary display
- Claude API key server-side only (`CLAUDE_API_KEY` env var)

### Acceptance Criteria
- [ ] All US-008 acceptance criteria pass
- [ ] Summary appears within 10 seconds
- [ ] No crash when Claude API key not configured

### Verification
Test summarize endpoint with and without Claude API key. Verify graceful degradation.

---

## Task 10: Fix US-009 Deployment & Polish Issues

### Description
Final polish, deployment verification, and cross-browser testing.

### Files Potentially Affected
```
/Users/tykimos/assi/assieye/vercel.json
/Users/tykimos/assi/assieye/src/components/StatusBar.ts
/Users/tykimos/assi/assieye/src/styles/base.css
/Users/tykimos/assi/assieye/src/styles/panels.css
/Users/tykimos/assi/assieye/src/styles/map.css
/Users/tykimos/assi/assieye/src/i18n/ko.json
/Users/tykimos/assi/assieye/src/i18n/en.json
/Users/tykimos/assi/assieye/api/health.js
```

### Key Requirements
- `vercel.json`: CORS headers on `/api/*`, security headers on `/*`, cache headers on `/assets/*`
- StatusBar: data freshness timestamps (FIRMS: N분 전, Weather: N시간 전, RSS: N분 전)
- Dark theme: forest green tones (`#0a1a0a` background, `#1a3a1a` panels, `#00cc66` accents)
- Responsive layout: map fills screen, panels stack on mobile
- Error messages: user-friendly Korean via `t()`
- Complete i18n: all user-facing strings in `ko.json` and `en.json`
- Cross-browser: Chrome, Firefox, Safari latest
- API keys never in client-side code
- Health endpoint: `/api/health` returns upstream API status

### Acceptance Criteria
- [ ] All US-009 acceptance criteria pass
- [ ] `npm run build` succeeds
- [ ] No API keys in built output
- [ ] All panels render with Korean text

### Verification
```bash
npm run build
grep -r "FIRMS_MAP_KEY\|CLAUDE_API_KEY\|TELEGRAM_BOT_TOKEN\|KMA_API_KEY" dist/ # should find nothing
```

---

## Commit Strategy

| Commit | Tasks | Message |
|--------|-------|---------|
| 1 | Task 1 | `chore: document verification results for all user story acceptance criteria` |
| 2 | Task 2 | `fix: resolve scaffolding issues (US-001 acceptance criteria)` |
| 3 | Task 3 | `fix: resolve dual map engine issues (US-002 acceptance criteria)` |
| 4 | Tasks 4-6 | `fix: resolve data source integration issues (US-003, US-004, US-005)` |
| 5 | Tasks 7-9 | `fix: resolve alert, AI summary, and heatmap issues (US-006, US-007, US-008)` |
| 6 | Task 10 | `feat: finalize deployment configuration and UI polish (US-009)` |

---

## Success Criteria

| Metric | Target |
|--------|--------|
| User stories passing | 9/9 (US-001 through US-009) |
| TypeScript errors | 0 |
| Build success | `npm run build` exits 0 |
| API endpoints responding | 13/13 (firms, weather, dwi, feeds, summarize, send-alert, health, satellites, flights, youtube, cctv + _cors + _rate-limit) |
| Map rendering | Both globe and flat map render Korea-centered |
| Mobile responsive | Usable at 375px viewport width |
| i18n coverage | All user-facing strings via `t()` |
| API key security | Zero keys in client bundle |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| NASA FIRMS API key not registered | Medium | High | Document registration steps; show `showConfigError()` gracefully |
| KMA API unavailable (Korean govt API) | Medium | Medium | Open-Meteo fallback already implemented |
| Korean govt RSS feeds unreliable | High | Medium | Per-source error handling; show stale data with "cached" badge |
| Claude API key not configured | Medium | Low | Graceful degradation; hide AI features when key missing |
| Telegram bot not configured | Low | Low | Graceful failure; alert panel still shows history |
| globe.gl typing issues | Low | Low | Type shims already in place |
| deck.gl React dependency | Low | Medium | Preact aliases in vite.config.ts if needed |
| WebGL context conflicts | Medium | High | Destroy one context before creating another on toggle |
| Vercel Edge Runtime compatibility | Low | Medium | All API files use pure JS; `fast-xml-parser` is pure JS |

---

## Key Patterns Reference (WorldMonitor -> ForestEye)

| WorldMonitor Pattern | ForestEye Equivalent | File |
|---------------------|---------------------|------|
| `src/app/app-context.ts` (AppModule) | `src/types/index.ts` (AppModule) | Already ported |
| `src/components/Panel.ts` | `src/components/Panel.ts` | Already ported (simplified) |
| `src/utils/dom-utils.ts` (h, replaceChildren) | `src/utils/dom-utils.ts` | Already ported |
| `api/_cors.js` | `api/_cors.js` | Already ported (adapted for foresteye) |
| `api/_rate-limit.js` | `api/_rate-limit.js` | Already ported (identical) |
| `src/app/refresh-scheduler.ts` | `src/app/refresh-scheduler.ts` | Already ported (simplified) |
| FIRMS CSV parsing | `api/firms.js` `parseFirmsCsv()` | Already ported |
| i18next `t()` | `src/services/i18n.ts` | Already ported |

---

## Environment Setup

### Required API Keys (documented in `.env.example`)
```
NASA_FIRMS_MAP_KEY=         # https://firms.modaps.eosdis.nasa.gov/api/area/ (free)
KMA_API_KEY=                # https://data.go.kr/ (free, Korean registration)
CLAUDE_API_KEY=             # https://console.anthropic.com/ (paid)
TELEGRAM_BOT_TOKEN=         # @BotFather on Telegram (free)
TELEGRAM_CHAT_ID=           # Telegram group/channel ID
UPSTASH_REDIS_REST_URL=     # https://upstash.com/ (free tier)
UPSTASH_REDIS_REST_TOKEN=   # Upstash Redis token
VITE_MAP_STYLE_URL=         # MapTiler or CARTO dark basemap URL
```

### Development Quick Start
```bash
cd /Users/tykimos/assi/assieye
cp .env.example .env.local   # Fill in API keys
npm install
npm run dev                  # http://localhost:5173
```

### Production Deploy
```bash
npm run build                # Verify build succeeds
vercel --prod                # Deploy to Vercel
# Configure env vars in Vercel dashboard
```
