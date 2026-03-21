# ForestEye MVP Implementation Plan

## Context

### Original Request
Build the ForestEye MVP (Phase 1) -- a real-time forest science OSINT dashboard for NIFoS (국립산림과학원). The system integrates wildfire hotspot data, weather overlays, forest policy RSS feeds, AI news summarization, wildfire risk heatmaps, and Telegram alerts on a dual-map engine (3D globe + flat map) centered on the Korean peninsula.

### Architecture Reference
Based on WorldMonitor (`.ref/worldmonitor-main/`):
- **Frontend:** Vanilla TypeScript with class-based components, no JSX/TSX (WorldMonitor uses Preact only for aliasing, actual DOM is built with `h()` utility and `document.createElement`)
- **Maps:** globe.gl (3D globe) + deck.gl/MapLibre GL JS (flat map)
- **API:** Vercel Edge Runtime serverless functions in `api/` directory (`.js` files with `export const config = { runtime: 'edge' }`)
- **Patterns:**
  - `src/app/` -- Manager classes implementing `AppModule { init(), destroy() }` interface (e.g., `DataLoaderManager`, `PanelLayoutManager`, `EventHandlerManager`, `RefreshScheduler`)
  - `src/components/` -- UI components extending `Panel` base class (vanilla TS DOM, not JSX)
  - `src/services/` -- Data fetching/business logic (e.g., `src/services/wildfires/index.ts`)
  - `src/config/` -- Constants, feed sources, geo data, variant configuration
  - `src/utils/` -- DOM helpers (`dom-utils.ts`), formatters, storage
  - `src/types/` -- Shared TypeScript interfaces
  - `api/_cors.js` -- CORS helper (`getCorsHeaders`, `isDisallowedOrigin`)
  - `api/_rate-limit.js` -- Rate limiting with Upstash Redis (`checkRateLimit`)
- **i18n:** Uses `i18next` with `t()` function imported from `@/services/i18n`
- **DOM Creation:** Uses `h()` helper and `replaceChildren()` from `@/utils/dom-utils` (NOT innerHTML where possible)
- **Deployment:** Vercel with `vercel.json` for CORS headers, security headers, cache rules
- **tsconfig:** ES2020 target, strict mode, bundler moduleResolution, `@/*` path alias to `src/*`, `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`

### MVP Scope (from PRD Section 10)
- P0: Dual map engine, NASA FIRMS hotspots, KMA weather overlay, Forest policy RSS
- P1: AI news summary (Claude API), DWI heatmap, Telegram alerts

---

## Work Objectives

### Core Objective
Deliver a functional ForestEye dashboard deployed on Vercel that displays real-time wildfire hotspots on a dual-map engine with weather overlays, policy RSS feeds, AI summaries, and Telegram alert capability.

### Definition of Done
1. `npm run dev` starts local dev server rendering 3D globe and flat map centered on Korea
2. NASA FIRMS hotspots appear on both map views, auto-refreshing every 15 minutes
3. KMA weather data (wind, humidity, temp) displays as map overlay
4. Forest policy RSS feeds from 3+ sources display in a panel with AI summaries
5. DWI wildfire risk heatmap layer toggleable on flat map
6. Telegram bot sends alert when new fire hotspot detected near Korea
7. `npm run build` succeeds with zero TypeScript errors and deploys to Vercel

---

## Must Have / Must NOT Have

### Must Have
- TypeScript strict mode matching WorldMonitor tsconfig (`noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`)
- Vanilla TS class-based components extending a `Panel` base class (following WorldMonitor `Panel.ts` pattern)
- Manager pattern for app orchestration (`AppModule` interface with `init()` / `destroy()`)
- DOM construction using `h()` helper and `replaceChildren()` (NOT raw innerHTML for dynamic content)
- globe.gl for 3D, deck.gl + MapLibre for flat map
- Korean peninsula center (lat 36.5, lng 127.5)
- Vercel Edge Runtime serverless functions for API proxying (`.js` files, `export const config = { runtime: 'edge' }`)
- `_cors.js` and `_rate-limit.js` utilities matching WorldMonitor API patterns
- i18n via i18next with `t()` function for all user-facing strings (Korean as default, English as fallback)
- `@/*` path alias to `src/*` in both tsconfig and vite config
- Environment variables for all API keys
- Mobile-responsive layout

### Must NOT Have
- No React or JSX -- pure TypeScript DOM manipulation following WorldMonitor
- No heavy frameworks (Next.js, Nuxt, etc.)
- No database in MVP (use in-memory + API caching via Upstash Redis)
- No user authentication in MVP
- No Sentinel-2/NDVI layers (Phase 2)
- No pest/disease layers (Phase 2)
- No Tauri desktop app (Phase 2)
- No protobuf/gRPC service generation (ForestEye MVP uses simple REST endpoints, not WorldMonitor's generated RPC pattern)

---

## Task Flow and Dependencies

```
Task 1: Project Scaffolding
    |
    v
Task 2: Dual Map Engine (globe.gl + deck.gl/MapLibre)
    |
    +---> Task 3: NASA FIRMS Integration
    |         |
    |         +---> Task 7: Telegram Alert Bot
    |
    +---> Task 4: KMA Weather API
    |
    +---> Task 6: DWI Heatmap Layer (depends on Task 4 weather data)
    |
    v
Task 5: Forest Policy RSS + Panel UI
    |
    v
Task 8: AI News Summarization (Claude API)
    |
    v
Task 9: Vercel Deployment & Polish
```

---

## Task 1: Project Scaffolding

### Description
Initialize the project with Vite, TypeScript, and the full directory structure following WorldMonitor patterns. Establish the `Panel` base class, `AppModule` interface, `App` class, DOM utility helpers, and i18n infrastructure.

### Files to Create

```
/Users/tykimos/assi/assieye/package.json
/Users/tykimos/assi/assieye/tsconfig.json
/Users/tykimos/assi/assieye/vite.config.ts
/Users/tykimos/assi/assieye/vercel.json
/Users/tykimos/assi/assieye/index.html
/Users/tykimos/assi/assieye/.env.example
/Users/tykimos/assi/assieye/.gitignore
/Users/tykimos/assi/assieye/src/main.ts
/Users/tykimos/assi/assieye/src/App.ts
/Users/tykimos/assi/assieye/src/vite-env.d.ts
/Users/tykimos/assi/assieye/src/types/index.ts
/Users/tykimos/assi/assieye/src/config/index.ts
/Users/tykimos/assi/assieye/src/config/constants.ts
/Users/tykimos/assi/assieye/src/config/map-layers.ts
/Users/tykimos/assi/assieye/src/config/feeds.ts
/Users/tykimos/assi/assieye/src/styles/base.css
/Users/tykimos/assi/assieye/src/styles/panels.css
/Users/tykimos/assi/assieye/src/styles/map.css
/Users/tykimos/assi/assieye/src/utils/index.ts
/Users/tykimos/assi/assieye/src/utils/dom-utils.ts
/Users/tykimos/assi/assieye/src/utils/format.ts
/Users/tykimos/assi/assieye/src/utils/storage.ts
/Users/tykimos/assi/assieye/src/services/index.ts
/Users/tykimos/assi/assieye/src/services/i18n.ts
/Users/tykimos/assi/assieye/src/app/app-context.ts
/Users/tykimos/assi/assieye/src/app/panel-layout.ts
/Users/tykimos/assi/assieye/src/app/data-loader.ts
/Users/tykimos/assi/assieye/src/app/refresh-scheduler.ts
/Users/tykimos/assi/assieye/src/components/index.ts
/Users/tykimos/assi/assieye/src/components/Panel.ts
/Users/tykimos/assi/assieye/src/i18n/ko.json
/Users/tykimos/assi/assieye/src/i18n/en.json
/Users/tykimos/assi/assieye/api/_cors.js
/Users/tykimos/assi/assieye/api/_rate-limit.js
/Users/tykimos/assi/assieye/public/textures/.gitkeep
```

### Dependencies to Install

```json
{
  "dependencies": {
    "globe.gl": "^2.45.0",
    "deck.gl": "^9.2.6",
    "@deck.gl/core": "^9.2.6",
    "@deck.gl/layers": "^9.2.6",
    "@deck.gl/geo-layers": "^9.2.6",
    "@deck.gl/aggregation-layers": "^9.2.6",
    "@deck.gl/mapbox": "^9.2.6",
    "maplibre-gl": "^5.16.0",
    "fast-xml-parser": "^5.3.7",
    "marked": "^17.0.3",
    "dompurify": "^3.1.7",
    "papaparse": "^5.5.3",
    "i18next": "^25.8.10",
    "i18next-browser-languagedetector": "^8.2.1",
    "@upstash/ratelimit": "^2.0.8",
    "@upstash/redis": "^1.36.1"
  },
  "devDependencies": {
    "typescript": "^5.7.2",
    "vite": "^6.0.7",
    "@types/three": "^0.183.1",
    "@types/geojson": "^7946.0.14",
    "@types/maplibre-gl": "^1.13.2",
    "@types/dompurify": "^3.0.5",
    "@types/papaparse": "^5.5.2"
  }
}
```

**Note:** Preact is NOT included. WorldMonitor uses Preact only for React-compat aliasing needed by some deps. ForestEye uses pure vanilla TS DOM (via `h()` helper). If deck.gl requires React compat, add preact + aliases in vite.config.ts.

### Key Implementation Details

**package.json** scripts:
```json
{
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview",
  "typecheck": "tsc --noEmit"
}
```

**tsconfig.json**: Match WorldMonitor exactly:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src"]
}
```

**vite.config.ts**: Path alias `@/` -> `src/`, preact aliases only if needed by deck.gl.

**index.html**: Korean-language meta tags (`<html lang="ko">`), ForestEye branding, dark forest green theme (`#0a1a0a`), `<script type="module" src="/src/main.ts">`, `<link>` for `maplibre-gl/dist/maplibre-gl.css`.

**vercel.json**: Following WorldMonitor pattern -- CORS headers on `/api/*`, security headers on `/*`, cache headers for `/assets/*`.

**src/app/app-context.ts**: Define `AppModule` interface and `AppContext` type:
```typescript
export interface AppModule {
  init(): void | Promise<void>;
  destroy(): void;
}

export interface AppContext {
  container: HTMLElement;
  isMobile: boolean;
  mapLayers: MapLayers;
  panels: Record<string, Panel>;
  // ... other shared state
}
```

**src/components/Panel.ts**: Simplified version of WorldMonitor's Panel base class:
- Constructor takes `PanelOptions { id, title, showCount?, className?, infoTooltip? }`
- Creates DOM structure: `.panel > .panel-header + .panel-content`
- Methods: `showLoading()`, `showError()`, `setContent()`, `setCount()`, `getElement()`, `destroy()`
- Uses `h()` and `replaceChildren()` from `@/utils/dom-utils`
- Uses `t()` from `@/services/i18n` for all labels

**src/utils/dom-utils.ts**: Port WorldMonitor's `h()` helper for creating DOM elements and `replaceChildren()` for safe content replacement.

**src/services/i18n.ts**: Initialize i18next with Korean as default language, English fallback. Load translations from `src/i18n/ko.json` and `src/i18n/en.json`.

**src/App.ts**: Following WorldMonitor's App class structure:
- Constructor: create `AppContext`, instantiate manager modules
- `init()`: Phase-based initialization (layout -> data loading -> refresh scheduling)
- `destroy()`: Reverse-order module cleanup
- Manager instances: `PanelLayoutManager`, `DataLoaderManager`, `RefreshScheduler`

**api/_cors.js**: Adapted from WorldMonitor -- allow `foresteye` domain patterns + localhost.

**api/_rate-limit.js**: Identical to WorldMonitor -- Upstash Redis sliding window rate limiter.

**.env.example**:
```
NASA_FIRMS_MAP_KEY=
KMA_API_KEY=
CLAUDE_API_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
VITE_MAP_STYLE_URL=
```

**src/types/index.ts**: Define core types:
- `FireHotspot` (lat, lng, brightness, confidence, satellite, acq_time, frp, region, dayNight)
- `WeatherStation` (id, name, lat, lng, temp, humidity, windSpeed, windDirection, rainfall)
- `RssFeedItem` (title, link, pubDate, source, summary, aiSummary?)
- `MapLayers` (toggle flags for each layer: fires, weather, dwi, rss)
- `DwiCell` (lat, lng, riskIndex, level)
- `PanelConfig` (name, enabled, priority)

### Acceptance Criteria
- [ ] `npm install` completes without errors
- [ ] `npm run dev` starts Vite dev server on localhost showing a blank page with ForestEye header
- [ ] `npm run typecheck` passes with zero errors
- [ ] Directory structure matches the file list above
- [ ] `Panel` base class can be instantiated and renders a DOM element with header + content
- [ ] `t()` function returns Korean strings by default
- [ ] `h('div', { className: 'test' }, 'hello')` creates a proper DOM element
- [ ] All environment variable placeholders documented in `.env.example`

### Risks
- **globe.gl types**: globe.gl has minimal TypeScript support. Mitigation: create `src/types/globe-gl.d.ts` declaration shim.
- **deck.gl React dependency**: deck.gl may require React. Mitigation: add preact aliases in vite.config.ts if needed (`react` -> `preact/compat`).

---

## Task 2: Dual Map Engine

### Description
Implement the dual-map system: a 3D globe (globe.gl) and a flat map (deck.gl + MapLibre GL JS) with toggle between them. Initial view centered on Korean peninsula.

### Files to Create

```
/Users/tykimos/assi/assieye/src/components/MapContainer.ts
/Users/tykimos/assi/assieye/src/components/GlobeMap.ts
/Users/tykimos/assi/assieye/src/components/FlatMap.ts
/Users/tykimos/assi/assieye/src/components/MapToolbar.ts
/Users/tykimos/assi/assieye/src/components/LayerToggle.ts
/Users/tykimos/assi/assieye/src/components/Header.ts
/Users/tykimos/assi/assieye/src/components/Layout.ts
/Users/tykimos/assi/assieye/src/services/map-state.ts
```

### Key Implementation Details

**MapContainer.ts**: Orchestrator component that:
- Manages active view mode (`'globe' | 'flat'`)
- Maintains shared map state (center, zoom, active layers)
- Creates/destroys GlobeMap or FlatMap on toggle (avoid dual WebGL contexts)
- Provides toggle button in MapToolbar
- Exposes `setFires()`, `setWeather()`, `setDwi()` methods that delegate to the active map

**GlobeMap.ts**:
- `import Globe from 'globe.gl'`
- Initial POV: lat 36.5, lng 127.5, altitude 2.0 (shows Korean peninsula)
- Earth texture overlay (NASA Blue Marble public domain)
- `htmlElementsData` for fire markers
- Auto-rotate after 60s inactivity
- `destroy()` method that properly disposes Three.js resources

**FlatMap.ts**:
- MapLibre GL JS base map with `MapboxOverlay` from `@deck.gl/mapbox`
- Dark basemap style via `VITE_MAP_STYLE_URL` env var (MapTiler free tier or Stadia Maps)
- Initial center: [127.5, 36.5], zoom: 6 (Korea fills viewport)
- Layer infrastructure: accepts `ScatterplotLayer`, `HeatmapLayer`, `IconLayer` via deck.gl overlay
- `destroy()` method that removes MapLibre map and deck.gl overlay

**Layout.ts**: Main application layout:
- Header bar with ForestEye logo (산림과학 OSINT), status indicators, view toggle
- Map section (upper 50-60vh)
- Dashboard panels grid (lower section, CSS grid `repeat(auto-fill, minmax(280px, 1fr))`)
- Uses `h()` helper for all DOM creation

**map-state.ts**: Shared state service:
- Current center coordinates, zoom level
- Active layers (`MapLayers` type)
- `loadFromStorage` / `saveToStorage` persistence (matching WorldMonitor `utils/storage`)
- Sync between globe and flat map on view switch

### Acceptance Criteria
- [ ] 3D globe renders centered on Korea with earth texture
- [ ] Flat map renders centered on Korea with dark basemap
- [ ] Toggle button switches between globe and flat map views without WebGL errors
- [ ] Map center/zoom approximately preserved when switching views
- [ ] Layer toggle panel shows available layers with on/off switches
- [ ] Responsive: map fills available width, min-height 300px on mobile
- [ ] `destroy()` on each map properly cleans up WebGL contexts

### Risks
- **MapLibre style URL**: Need a free tile source. Mitigation: Use MapTiler free tier or Stadia Maps free tier. Document the tile URL in `.env.example` as `VITE_MAP_STYLE_URL`.
- **Earth textures for globe**: Need royalty-free earth texture. Mitigation: Use NASA Blue Marble public domain imagery; provide a download script or include a small compressed version.
- **WebGL context conflicts**: Two WebGL renderers cannot share a canvas. Mitigation: Destroy one before creating the other on toggle. Never keep both instantiated simultaneously.

---

## Task 3: NASA FIRMS Integration

### Description
Fetch real-time fire hotspot data from NASA FIRMS API, display as markers on both map views, and auto-refresh every 15 minutes. Follow WorldMonitor's FIRMS pattern from `server/worldmonitor/wildfire/v1/list-fire-detections.ts` and `src/services/wildfires/index.ts`.

### Files to Create

```
/Users/tykimos/assi/assieye/api/firms.js
/Users/tykimos/assi/assieye/src/services/firms.ts
/Users/tykimos/assi/assieye/src/components/FireHotspotLayer.ts
/Users/tykimos/assi/assieye/src/components/FireHotspotPanel.ts
```

### Key Implementation Details

**api/firms.js** (Vercel Edge Runtime serverless function):
```javascript
export const config = { runtime: 'edge' };
```
- Proxies requests to NASA FIRMS API to avoid CORS and protect API key
- URL pattern (from WorldMonitor): `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${apiKey}/VIIRS_SNPP_NRT/${bbox}/1`
- Bounding box for Korean peninsula: `124,33,132,43` (matching WorldMonitor's North Korea region expanded to all Korea)
- Parse CSV in-server using simple line-by-line parser (matching WorldMonitor's `parseCSV` function -- NOT papaparse on server, keep edge bundle small)
- Transform to JSON: `{ fireDetections: [{ id, lat, lng, brightness, frp, confidence, satellite, detectedAt, region, dayNight }] }`
- Uses `getCorsHeaders()` from `_cors.js` and `checkRateLimit()` from `_rate-limit.js`
- Cache response: `Cache-Control: public, s-maxage=900` (15 minutes)
- Env var: `NASA_FIRMS_MAP_KEY` or `NASA_FIRMS_API_KEY`

**src/services/firms.ts** (following WorldMonitor's `src/services/wildfires/index.ts` pattern):
- `fetchFireHotspots()`: calls `/api/firms`, parses response to `FireHotspot[]`
- `computeRegionStats()`: aggregate by region (matching WorldMonitor's `computeRegionStats`)
- `flattenFires()`: flatten region map to array
- No auto-refresh here -- handled by `RefreshScheduler` in `src/app/refresh-scheduler.ts` (WorldMonitor pattern)

**FireHotspotLayer.ts**:
- For FlatMap: `ScatterplotLayer` with fire-colored dots (orange-to-red based on FRP/brightness)
- Tooltip on hover: satellite, acquisition time, brightness, FRP, confidence
- For GlobeMap: `htmlElementsData` markers with fire icon
- Method signature: `createFireLayer(fires: FireHotspot[]): ScatterplotLayer`

**FireHotspotPanel.ts** (extending `Panel` base class, following `SatelliteFiresPanel.ts`):
```typescript
export class FireHotspotPanel extends Panel {
  constructor() {
    super({
      id: 'fire-hotspots',
      title: t('panels.fireHotspots'),
      showCount: true,
      infoTooltip: t('panels.fireHotspots.tooltip'),
    });
  }
  public update(stats: FireRegionStats[], totalCount: number): void { ... }
  private render(): void { ... }
}
```
- Scrollable table: region, fire count, high-intensity count, total FRP
- Click-to-zoom: clicking a row pans the map to that region
- Live count badge in header
- Uses `escapeHtml()` for table content, `t()` for all labels

### Acceptance Criteria
- [ ] Hotspots from FIRMS API render as colored dots on flat map
- [ ] Hotspots render as markers on 3D globe
- [ ] Data auto-refreshes every 15 minutes via `RefreshScheduler`
- [ ] Hotspot panel lists region-aggregated fire stats with count, FRP
- [ ] Clicking a region in the panel zooms the map to that area
- [ ] Loading and error states handled gracefully (panel shows `showLoading()` / `showError()`)
- [ ] API key is not exposed to the browser (proxied through Edge function)
- [ ] `showConfigError()` displayed when API key is missing

### Risks
- **NASA FIRMS API key**: Requires free registration at https://firms.modaps.eosdis.nasa.gov/api/area/. Mitigation: Document registration steps, gracefully degrade to empty state with `showConfigError()`.
- **No fires in Korea at test time**: Mitigation: Expand bbox temporarily or provide mock data file for development.
- **CSV parsing edge cases**: FIRMS CSV can have varying columns. Mitigation: Use header-based parsing (not position-based), matching WorldMonitor's `parseCSV` function.

---

## Task 4: KMA Weather API Integration

### Description
Integrate Korea Meteorological Administration (기상청) weather data to display wind speed/direction, humidity, and temperature as map overlays.

### Files to Create

```
/Users/tykimos/assi/assieye/api/weather.js
/Users/tykimos/assi/assieye/src/services/weather.ts
/Users/tykimos/assi/assieye/src/components/WeatherLayer.ts
/Users/tykimos/assi/assieye/src/components/WeatherPanel.ts
/Users/tykimos/assi/assieye/src/utils/kma-grid.ts
```

### Key Implementation Details

**api/weather.js** (Vercel Edge Runtime):
```javascript
export const config = { runtime: 'edge' };
```
- Proxy to KMA Open API (`apis.data.go.kr`)
- Primary endpoint: `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst` (초단기실황)
- Parameters: serviceKey, numOfRows=1000, pageNo=1, dataType=JSON, base_date, base_time, nx, ny
- Query multiple grid points covering Korea (pre-defined list of ~20 representative nx/ny pairs for major forest areas)
- Fallback: Open-Meteo API (`https://api.open-meteo.com/v1/forecast`) -- no API key needed, global coverage
- Cache: `Cache-Control: public, s-maxage=3600` (1 hour)
- Uses `getCorsHeaders()`, `checkRateLimit()`

**src/utils/kma-grid.ts**: Grid conversion utility:
- Lambert Conformal Conic projection conversion (KMA nx/ny <-> lat/lng)
- Pre-computed station list: array of `{ nx, ny, name, lat, lng }` for ~20 key forest monitoring locations
- Based on official KMA conversion formula

**src/services/weather.ts**:
- `fetchWeatherData()`: calls `/api/weather`, parses to `WeatherStation[]`
- Parse KMA response categories: T1H (temp), RN1 (rainfall), UUU/VVV (wind components), REH (humidity), WSD (wind speed), VEC (wind direction)
- Refresh via `RefreshScheduler` at 1-hour intervals

**WeatherLayer.ts**:
- Wind arrows as `IconLayer` on flat map (arrow icons rotated by wind direction angle)
- Color-coded by wind speed: green < 5m/s, yellow 5-10, orange 10-15, red > 15
- Method: `createWeatherLayer(stations: WeatherStation[]): IconLayer`

**WeatherPanel.ts** (extending `Panel`):
- Summary panel showing current conditions for key forest areas
- Wind speed/direction, humidity, temperature, rainfall
- Fire weather risk indicator: simple calculation from temp + humidity + wind
- Uses `t()` for all Korean labels

### Acceptance Criteria
- [ ] Weather stations appear on the flat map as wind arrow icons
- [ ] Arrows point in the correct wind direction and are color-coded by speed
- [ ] Weather panel shows current readings for at least 5 stations
- [ ] Tooltip on weather markers shows temp, humidity, wind details
- [ ] Graceful fallback to Open-Meteo if KMA API is unavailable
- [ ] Grid conversion (nx/ny <-> lat/lng) produces accurate coordinates

### Risks
- **KMA API complexity**: KMA uses Lambert Conformal Conic grid (nx/ny) instead of lat/lng. Mitigation: Implement the official grid conversion formula in `kma-grid.ts`. Pre-compute station coordinates.
- **KMA API key registration**: Requires registration at data.go.kr (Korean government portal). Mitigation: Use Open-Meteo as zero-config fallback.
- **Rate limits**: KMA API has daily call limits. Mitigation: Cache aggressively (1-hour intervals), use Upstash Redis.

---

## Task 5: Forest Policy RSS OSINT

### Description
Collect and display RSS/Atom feeds from Korean forestry agencies, FAO, and environmental ministry. Display in a scrollable news panel following WorldMonitor's panel pattern.

### Files to Create

```
/Users/tykimos/assi/assieye/api/feeds.js
/Users/tykimos/assi/assieye/src/services/feeds.ts
/Users/tykimos/assi/assieye/src/config/feed-sources.ts
/Users/tykimos/assi/assieye/src/components/FeedPanel.ts
```

### Key Implementation Details

**src/config/feed-sources.ts**: Define RSS/Atom feed URLs:
```typescript
export const FEED_SOURCES = [
  { id: 'kfs', name: '산림청', url: 'https://www.forest.go.kr/...', lang: 'ko', category: 'policy' },
  { id: 'me', name: '환경부', url: 'https://www.me.go.kr/...', lang: 'ko', category: 'policy' },
  { id: 'fao', name: 'FAO Forestry', url: 'https://www.fao.org/forestry/rss.xml', lang: 'en', category: 'international' },
  { id: 'gfw', name: 'Global Forest Watch', url: 'https://www.globalforestwatch.org/blog/rss', lang: 'en', category: 'monitoring' },
] as const;
```

**api/feeds.js** (Vercel Edge Runtime):
```javascript
export const config = { runtime: 'edge' };
```
- Accept `source` query param or fetch all sources
- Fetch RSS/Atom XML server-side (avoiding CORS)
- Use `fast-xml-parser` to parse XML (imported at edge -- verify compatibility)
- Normalize to common schema: `{ title, link, pubDate, source, description, category, lang }`
- Cache each feed: `Cache-Control: public, s-maxage=1800` (30 minutes)
- Uses `getCorsHeaders()`, `checkRateLimit()`

**src/services/feeds.ts**:
- `fetchFeeds(sources?)`: calls `/api/feeds`, returns `RssFeedItem[]`
- Sort by pubDate descending
- Deduplicate by URL
- Refresh via `RefreshScheduler` at 30-minute intervals

**FeedPanel.ts** (extending `Panel`):
- Category tabs: All / Policy / International / Monitoring (using `h()` for DOM)
- Each feed item: source badge, title, date, brief description
- Click opens original URL in new tab (`target="_blank" rel="noopener"`)
- "AI 요약" button per item (integrates with Task 8 -- initially disabled/hidden)
- Source language indicator (KO/EN badge)
- Uses `dompurify` for HTML sanitization, `marked` for markdown rendering
- All labels via `t()`

### Acceptance Criteria
- [ ] At least 3 RSS feed sources successfully fetched and displayed
- [ ] Feed items sorted by publication date, newest first
- [ ] Category filter tabs work correctly
- [ ] Clicking a feed item opens the source URL in a new tab
- [ ] Feed data refreshes every 30 minutes via RefreshScheduler
- [ ] Korean and English feeds both display correctly
- [ ] HTML content properly sanitized via DOMPurify

### Risks
- **RSS feed availability**: Korean government RSS feeds may be unreliable. Mitigation: Implement per-source error handling; show stale data with a "cached" badge (using `setDataBadge('cached')` from Panel base class).
- **CORS on RSS feeds**: All fetching happens server-side in Edge function, avoiding CORS entirely.
- **fast-xml-parser at Edge Runtime**: Verify `fast-xml-parser` works in Vercel Edge Runtime (it's pure JS, should be fine).

---

## Task 6: DWI Wildfire Risk Index Heatmap

### Description
Display a wildfire risk heatmap (산불위험지수, DWI - Daily Weather Index) as a toggleable layer on the flat map.

### Files to Create

```
/Users/tykimos/assi/assieye/api/dwi.js
/Users/tykimos/assi/assieye/src/services/dwi.ts
/Users/tykimos/assi/assieye/src/components/DwiLayer.ts
/Users/tykimos/assi/assieye/src/components/DwiLegend.ts
```

### Dependencies
Depends on Task 4 (KMA Weather) for the weather data and grid conversion utility.

### Key Implementation Details

**api/dwi.js** (Vercel Edge Runtime):
```javascript
export const config = { runtime: 'edge' };
```
- Primary: Proxy to 산림청 산불위험예보 API (if available via data.go.kr)
- Fallback: Calculate DWI from KMA weather data using simplified formula:
  - `risk = clamp((temp * 2 + windSpeed * 3 - humidity * 0.5 - rainfall * 10), 0, 100)`
  - Level mapping: 0-20 '안전', 21-50 '주의', 51-65 '경고', 66-85 '위험', 86-100 '매우위험'
- Generate grid data: 0.1-degree resolution over Korea (~900 cells)
- Return: `{ cells: [{ lat, lng, riskIndex, level }], date: string }`
- Cache: `Cache-Control: public, s-maxage=86400` (24 hours -- daily index)

**src/services/dwi.ts**:
- `fetchDwiData()`: calls `/api/dwi`, returns `DwiCell[]`
- Refresh via `RefreshScheduler` daily

**DwiLayer.ts**:
- `HeatmapLayer` from `@deck.gl/aggregation-layers`
- Color ramp: green -> yellow -> orange -> red -> dark red
- Opacity: 0.4-0.6 (semi-transparent)
- Weight property: `riskIndex`
- Method: `createDwiLayer(cells: DwiCell[]): HeatmapLayer`

**DwiLegend.ts**:
- Fixed-position legend overlay on map corner
- Color bar with Korean labels: 안전, 주의, 경고, 위험, 매우위험
- Current date of DWI data
- Created with `h()` helper, positioned absolutely within map container

### Acceptance Criteria
- [ ] Heatmap layer renders over Korean peninsula on flat map
- [ ] Colors correctly map to risk levels (green=safe to red=extreme)
- [ ] Legend displays with Korean risk level labels
- [ ] Layer can be toggled on/off via LayerToggle
- [ ] Data refreshes daily via RefreshScheduler
- [ ] Heatmap does not significantly degrade map performance (< 1000 data points)

### Risks
- **산림청 DWI API availability**: May not be publicly accessible. Mitigation: Calculate from KMA weather data as primary approach.
- **Grid data volume**: ~900 cells at 0.1 degree -- well within HeatmapLayer performance limits.

---

## Task 7: Telegram Alert Bot

### Description
Implement a Telegram bot that sends automated notifications when new fire hotspots are detected near Korea.

### Files to Create

```
/Users/tykimos/assi/assieye/api/send-alert.js
/Users/tykimos/assi/assieye/src/services/alerts.ts
/Users/tykimos/assi/assieye/src/components/AlertPanel.ts
```

### Key Implementation Details

**api/send-alert.js** (Vercel Edge Runtime):
```javascript
export const config = { runtime: 'edge' };
```
- POST endpoint that sends a message to a Telegram chat
- Uses Telegram Bot API: `https://api.telegram.org/bot${TOKEN}/sendMessage`
- Message format (Korean):
  ```
  ForestEye 산불 경보

  위치: {lat}, {lng}
  시간: {acquisition_time}
  위성: {satellite}
  신뢰도: {confidence}
  밝기: {brightness}K
  FRP: {frp} MW

  지도 보기: {dashboard_url}?focus={lat},{lng}
  ```
- Only accepts requests with valid internal auth (check Upstash Redis nonce or simple shared secret)
- Uses `getCorsHeaders()`, `checkRateLimit()`

**src/services/alerts.ts**:
- Client-side alert tracking
- Compare new FIRMS data with previous fetch to detect new hotspots
- Call `/api/send-alert` for each new hotspot with confidence >= "nominal" within Korea bbox
- Deduplication: track sent alerts by hotspot ID (`${lat}-${lng}-${date}-${time}`)
- Rate limiting: max 1 alert per 15-minute window per 0.1-degree grid cell
- Alert history stored in-memory (array, max 100 entries)

**AlertPanel.ts** (extending `Panel`):
- Dashboard panel showing recent alerts
- Alert list: timestamp, location, severity
- Manual "테스트 알림" button for development
- Alert count badge via `setCount()`

### Acceptance Criteria
- [ ] New fire hotspot detection triggers Telegram message to configured chat
- [ ] Alert message contains location, time, satellite, confidence info in Korean
- [ ] Duplicate alerts not sent for the same hotspot (dedup by ID)
- [ ] Alert panel shows history of sent alerts
- [ ] Rate limiting prevents alert flooding (max 1 per 15 min per grid cell)
- [ ] Graceful failure if Telegram API unreachable (log error, don't crash)

### Risks
- **Telegram Bot setup**: Requires @BotFather bot creation. Mitigation: Document step-by-step setup.
- **Alert flooding**: During active fire season, many hotspots. Mitigation: Rate-limit by grid cell + 15-minute window.

---

## Task 8: AI News Summarization (Claude API)

### Description
Integrate Claude API to generate Korean/English summaries of RSS feed items and daily forest science briefs.

### Files to Create

```
/Users/tykimos/assi/assieye/api/summarize.js
/Users/tykimos/assi/assieye/src/services/ai-summary.ts
/Users/tykimos/assi/assieye/src/components/AiBriefPanel.ts
```

### Key Implementation Details

**api/summarize.js** (Vercel Edge Runtime):
```javascript
export const config = { runtime: 'edge' };
```
- POST endpoint: `{ text: string, lang: 'ko' | 'en', mode: 'summary' | 'brief' }`
- Call Claude API (Anthropic Messages API):
  ```javascript
  await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  ```
- Summary mode: 2-3 sentence summary, matching input language
- Brief mode: Aggregate multiple items into a daily forest science brief
- Rate limiting: max 10 requests/minute via `checkRateLimit()`
- Cache summaries by content hash in response headers

**src/services/ai-summary.ts**:
- `summarizeArticle(item: RssFeedItem)`: calls `/api/summarize`
- `generateDailyBrief(items: RssFeedItem[])`: calls `/api/summarize` with aggregated text
- Cache summaries in `localStorage` by content hash (SHA-256 of input text)
- Request queue: max 1 concurrent request, 2-second delay between requests

**AiBriefPanel.ts** (extending `Panel`):
- "AI 브리핑" panel
- "브리핑 생성" button to trigger daily brief
- Formatted sections: 산불 동향, 정책 변화, 연구 트렌드
- Loading spinner via `showLoading()` during summarization
- All labels via `t()`

**Integration with FeedPanel**: Add "AI 요약" button to each feed item in FeedPanel. When clicked, calls `summarizeArticle()` and displays result inline below the item.

### Acceptance Criteria
- [ ] Individual article summary generates in < 10 seconds
- [ ] Korean articles summarized in Korean, English in English
- [ ] Daily brief aggregates multiple articles into coherent summary
- [ ] Summaries cached in localStorage to avoid redundant API calls
- [ ] Rate limiting prevents API overuse (max 10/min)
- [ ] Loading state shown via `showLoading()` during summarization
- [ ] Claude API key protected server-side, not exposed in browser

### Risks
- **Claude API cost**: Mitigation: Cache aggressively, on-demand only (no auto-summarize), use claude-sonnet (not opus).
- **API latency**: 3-8 seconds typical. Mitigation: Show loading spinner, non-blocking UI.

---

## Task 9: Vercel Deployment and Polish

### Description
Configure for Vercel deployment, add final UI polish, error handling, i18n completion, and documentation.

### Files to Create/Modify

```
/Users/tykimos/assi/assieye/vercel.json (update from Task 1)
/Users/tykimos/assi/assieye/src/components/StatusBar.ts
/Users/tykimos/assi/assieye/src/components/ErrorBoundary.ts
/Users/tykimos/assi/assieye/src/services/health.ts
/Users/tykimos/assi/assieye/api/health.js
```

### Key Implementation Details

**vercel.json** updates: Finalize all routes. Follows WorldMonitor pattern:
- `/api/*` CORS headers
- `/*` security headers (X-Content-Type-Options, X-Frame-Options, HSTS, Referrer-Policy, CSP)
- `/` and `/index.html`: `no-cache, no-store, must-revalidate`
- `/assets/*`: `public, max-age=31536000, immutable`

**StatusBar.ts** (extending `Panel` or standalone component):
- Bottom status bar showing data freshness: FIRMS (5분 전), Weather (1시간 전), RSS (30분 전)
- Active fire count
- Connection status (online/offline via `navigator.onLine`)
- Created with `h()` helper

**ErrorBoundary.ts**:
- Global error handler for async operations
- Retry mechanism: 3 retries with exponential backoff
- User-friendly Korean error messages via `t()`

**api/health.js** (Vercel Edge Runtime):
```javascript
export const config = { runtime: 'edge' };
```
- Health check endpoint: returns status of each data source
- Simple ping to each upstream API
- Used by StatusBar

**Final Polish**:
- Dark theme: forest green tones (#0a1a0a background, #1a3a1a panels, #00cc66 accents)
- Responsive layout: map fills screen on mobile, panels stack vertically
- Keyboard shortcuts: `g` toggle globe, `f` toggle flat, `l` toggle layers
- Korean language throughout UI (complete i18n `ko.json`)
- Complete `en.json` fallback translations

### Acceptance Criteria
- [ ] `vercel deploy` or `vercel --prod` succeeds
- [ ] All API endpoints accessible on deployed URL
- [ ] Environment variables properly configured on Vercel
- [ ] No API keys exposed in client-side code
- [ ] Status bar shows correct data freshness timestamps
- [ ] Error states display user-friendly Korean messages
- [ ] Works on Chrome, Firefox, Safari (latest versions)
- [ ] Mobile layout is usable (map + stacked panels)
- [ ] All user-facing strings use `t()` with Korean defaults

### Risks
- **Vercel cold start**: Edge Runtime has no cold start (unlike Node.js runtime). Using `export const config = { runtime: 'edge' }` on all API routes mitigates this.
- **Environment variable management**: Many API keys needed. Mitigation: Clear `.env.example`, Vercel dashboard configuration.

---

## Commit Strategy

| Commit | Tasks | Description |
|--------|-------|-------------|
| 1 | Task 1 | `feat: scaffold ForestEye project with Vite + TypeScript + Panel base class` |
| 2 | Task 2 | `feat: implement dual map engine (globe.gl + deck.gl/MapLibre)` |
| 3 | Task 3 | `feat: integrate NASA FIRMS real-time wildfire hotspot data` |
| 4 | Task 4 | `feat: add KMA weather API with wind/temp/humidity overlays` |
| 5 | Task 5 | `feat: implement forest policy RSS feed collection and display` |
| 6 | Task 6 | `feat: add DWI wildfire risk index heatmap layer` |
| 7 | Task 7 | `feat: implement Telegram alert bot for fire detection` |
| 8 | Task 8 | `feat: add AI news summarization via Claude API` |
| 9 | Task 9 | `feat: configure Vercel deployment with polish and error handling` |

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Fire hotspot display latency (from FIRMS update to dashboard) | < 30 minutes |
| Map rendering performance (all layers active) | 30fps+ |
| RSS feed coverage | 3+ Korean + 1+ international sources |
| AI summary generation time | < 10 seconds per article |
| Telegram alert delivery | < 5 minutes from detection |
| Build time | < 60 seconds |
| TypeScript strict compliance | Zero errors (strict + noUnusedLocals + noUncheckedIndexedAccess) |

---

## Key Patterns Reference (WorldMonitor -> ForestEye)

| WorldMonitor Pattern | ForestEye Equivalent | Notes |
|---------------------|---------------------|-------|
| `src/app/app-context.ts` (AppModule interface) | Same -- `{ init(), destroy() }` | Core module lifecycle |
| `src/components/Panel.ts` (base class) | Simplified version, same API | `showLoading()`, `showError()`, `setCount()`, `setContent()` |
| `src/components/SatelliteFiresPanel.ts` | `FireHotspotPanel.ts` | Same pattern: extend Panel, `update()` + `render()` |
| `src/App.ts` (manager modules) | Simplified -- 3 managers vs 7 | `PanelLayoutManager`, `DataLoaderManager`, `RefreshScheduler` |
| `api/_cors.js` + `api/_rate-limit.js` | Identical pattern | Copy and adapt domain patterns |
| `server/worldmonitor/wildfire/v1/list-fire-detections.ts` | `api/firms.js` | Simplified: no protobuf, direct JSON response, same FIRMS URL pattern |
| i18next `t()` function | Same | Import from `@/services/i18n` |
| `h()` / `replaceChildren()` DOM helpers | Same | Port from WorldMonitor `utils/dom-utils` |
| `loadFromStorage()` / `saveToStorage()` | Same | Port from WorldMonitor utils |
| `RefreshScheduler` with condition callbacks | Simplified version | `scheduleRefresh(name, fn, intervalMs, condition?)` |
| Edge Runtime `export const config = { runtime: 'edge' }` | Same | All API routes use Edge Runtime |
| `vercel.json` security headers | Same pattern | Adapted domain names |

---

## Environment Setup Notes

### Required API Registrations
1. **NASA FIRMS**: https://firms.modaps.eosdis.nasa.gov/api/area/ (free, instant)
2. **KMA (기상청)**: https://data.go.kr/ (free, requires Korean registration) -- or skip and use Open-Meteo fallback
3. **Claude API**: https://console.anthropic.com/ (paid, API key needed)
4. **Telegram Bot**: Message @BotFather on Telegram, `/newbot` command (free, instant)
5. **Upstash Redis** (optional): https://upstash.com/ (free tier available)
6. **Map tiles**: MapTiler (https://www.maptiler.com/) free tier or Stadia Maps

### Development Quick Start
```bash
cd /Users/tykimos/assi/assieye
cp .env.example .env.local
# Fill in API keys in .env.local
npm install
npm run dev
```
