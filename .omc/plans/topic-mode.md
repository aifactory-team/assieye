# Topic Mode Implementation Plan (v2 - Critic Revision)

## Context

### Original Request
Transform AssiEye from a single-purpose forest fire dashboard into a multi-topic OSINT dashboard. Users switch between topics (forest fires, Iran war, Korea stock market, US stock market) and the entire dashboard -- theme, map, feeds, YouTube, AI briefing -- adapts automatically.

### Scope: Phase 1 + Phase 2 from PRD Section 10
- TopicConfig type + 4 built-in topic config files
- CSS hardcoded colors to CSS variables conversion
- ThemeEngine (CSS variable injection)
- TopicManager core logic (topic switching, localStorage save/restore)
- TopicSelector header dropdown UI
- Topic switch transition animation
- Feed sources split by topic
- YouTube search query per topic
- AI briefing prompt per topic (with per-topic language)
- Map center/zoom auto-switch (including globeAltitude)
- Layer toggle topic integration
- URL parameter support (?topic=xxx)
- Panel reconfiguration with placeholder for unknown panel types
- Race condition mitigation via generation counter

Phase 3 (custom topic creation UI) and Phase 4 (advanced features) are **excluded**.

### Research Findings (Codebase Analysis)

**Key architectural facts:**
1. App uses vanilla TS with a DOM utility (`h()`) -- no framework. Components are classes with `getElement()` / `destroy()` pattern.
2. Hardcoded colors: `#00cc66` (accent green) appears in `base.css`, `panels.css`, `map.css`, and inline in TS components. `rgba(26, 58, 26, ...)` / `rgba(42, 74, 42, ...)` are the panel bg/border colors. `rgba(13, 32, 13, ...)` is the header tint.
3. Feed sources are duplicated: once in `src/config/feed-sources.ts` (client) and once in `api/feeds.js` (server). The server API has its own hardcoded `FEED_SOURCES` array.
4. The feeds API (`api/feeds.js`) uses hardcoded `FEED_SOURCES`. To support topic-based feeds, the client must POST feed URLs to the server.
5. YouTube query is passed as `?q=` param to `/api/youtube` -- already dynamic, just need to change the default query per topic.
6. AI summary (`api/summarize.js`) has a hardcoded forest-focused prompt for `mode: 'brief'`. This must accept a custom system prompt. The `generateDailyBrief` function hardcodes `lang: 'ko'` -- must accept per-topic lang.
7. Map center/zoom: `KOREA_CENTER` and `FLAT_MAP_ZOOM` are used in `FlatMap.ts` and `GlobeMap.ts` at construction time. `map-state.ts` manages runtime state. `GlobeMap` uses `GLOBE_ALTITUDE` constant.
8. `MapContainer` holds `LayerToggle` which uses `MapLayers` type (fires, weather, dwi, satellites, flights, cctv). LayerToggle creates checkboxes in constructor without storing input references -- needs `Map<string, HTMLInputElement>` for programmatic reset.
9. `Layout` creates `Header` internally -- no external access to swap the header content. Need to expose header or add topic selector at Layout level.
10. `App.ts` orchestrates everything: creates panels, loads data, schedules refreshes. Topic switching must integrate here. Panels are created once and appended -- reconfiguration needs a panel registry with "Coming Soon" placeholder for unknown types.
11. CSS entry point is `src/main.ts` which imports `base.css`, `panels.css`, `map.css`. The new `themes.css` must be imported here.
12. The `:root` block needs **all** derived variables (body-bg, text colors, scrollbar colors) to change on theme switch, not just the 9 TopicTheme properties.

---

## Work Objectives

### Core Objective
Add a topic-switching system so that selecting a topic changes theme colors, map position, active layers, panel titles, feed sources, YouTube queries, and AI briefing context.

### Deliverables
1. `TopicConfig` type definition and 4 built-in topic configuration files
2. CSS variables system replacing all hardcoded theme colors
3. `ThemeEngine` service for CSS variable injection (with automatic derivation of secondary variables)
4. `TopicManager` service for topic switching orchestration (with generation counter for race conditions)
5. `TopicSelector` dropdown UI in the header
6. Server-side feeds API accepting dynamic feed sources via POST
7. Server-side summarize API accepting custom system prompt and lang
8. Map center/zoom/altitude auto-switching on topic change
9. Panel reconfiguration with "Coming Soon" placeholder for unknown panel types
10. Layer toggle reset with stored checkbox references
11. URL parameter `?topic=xxx` support
12. Transition animation on topic switch

### Definition of Done
- User can select any of 4 topics from header dropdown
- Theme colors change smoothly across all panels, header, status bar, body, scrollbars
- Map flies to the correct region with correct zoom (flat) or altitude (globe)
- Layer toggles reset to topic defaults with checkbox UI updating programmatically
- News feed shows topic-specific sources
- YouTube panel shows topic-specific search results
- AI briefing uses topic-specific prompt in the correct language
- Panel titles update per-topic; unknown panel types show "Coming Soon" placeholder
- Rapid topic switching does not cause stale data to overwrite fresh data
- Selected topic persists in localStorage across page reloads
- URL `?topic=iran-war` opens directly to that topic
- No visual regressions on the default (korea-forest) topic

---

## Must Have / Must NOT Have (Guardrails)

### Must Have
- All 4 built-in topics fully functional
- CSS variable coverage for ALL hardcoded accent/panel/header/body/text/scrollbar colors
- ThemeEngine derives ALL 16+ CSS variables from 9 TopicTheme properties
- Smooth transition animation (no flash of unstyled content)
- localStorage persistence of selected topic
- URL param override of localStorage
- Generation counter to prevent race conditions on rapid topic switching
- Panel type registry mapping known types to constructors, unknown types to placeholder
- LayerToggle stores checkbox references as `Map<string, HTMLInputElement>`
- AI briefing respects per-topic language (ko or en)
- GlobeMap uses `topic.map.globeAltitude` for POV transition
- Feeds API accepts sources via POST body (not URL-encoded query param)
- Backward compatibility: default topic = korea-forest behaves identically to current app

### Must NOT Have
- Custom topic creation UI (Phase 3)
- New panel types (stock-ticker, oil-price, conflict-timeline, stock-sectors) -- topics that reference them will show "Coming Soon" placeholder
- Topic management modal
- Keyboard shortcuts for topic switching
- Dynamic import / code splitting for panels

---

## Task Flow and Dependencies

```
LAYER 0 (no dependencies - can run in parallel):
  T1: TopicConfig types (including PanelSlot.type mapping)
  T2: CSS variables conversion (base.css)
  T3: CSS variables conversion (panels.css)
  T4: CSS variables conversion (map.css)

LAYER 1 (depends on T1):
  T5: korea-forest topic config
  T6: iran-war topic config
  T7: iran-kr-stock topic config
  T8: iran-us-stock topic config
  T9: Topics index (registry of all built-in topics)

LAYER 2 (depends on T1, T2-T4):
  T10: ThemeEngine service (with automatic derivation)
  T11: themes.css (transition animation + topic-transitioning class)

LAYER 3 (depends on T1, T9):
  T12: TopicManager service (with generation counter)
  T13: Update api/feeds.js to accept dynamic feed URLs via POST
  T14: Update api/summarize.js to accept custom system prompt + lang

LAYER 4 (depends on T10, T12):
  T15: TopicSelector component (header dropdown)
  T16: Update Header.ts to include TopicSelector
  T17: Update Layout.ts to expose header for topic selector

LAYER 5 (depends on T12, T13, T14):
  T18: Integrate TopicManager into App.ts (with generation counter checks + panel reconfiguration)
  T19: Update map-state.ts for topic-driven center/zoom
  T20: Update MapContainer/FlatMap/GlobeMap for flyTo support (with globeAltitude)
  T21: Update LayerToggle for topic-driven layer reset (with stored checkbox references)
  T22: Update feeds service for topic-driven sources (POST method)
  T23: Update YouTube panel for topic-driven queries
  T24: Update AI brief for topic-driven prompts (with per-topic lang)
  T25: URL parameter support (?topic=xxx)

LAYER 6 (final integration):
  T26: Update constants.ts and config/index.ts exports
  T27: Update types/index.ts with new types
  T28: Import themes.css in main.ts
  T29: End-to-end verification
```

---

## Detailed TODOs

### T1: TopicConfig Type Definitions
**File:** `src/types/topic.ts` (NEW)
**Action:** Create new file with all topic-related type definitions
**Details:**
- Define `TopicConfig` interface:
  ```typescript
  interface TopicConfig {
    id: string;
    name: string;
    icon: string;
    description: string;
    theme: TopicTheme;
    map: {
      center: { lat: number; lng: number };
      zoom: number;
      globeAltitude: number;  // CRITICAL: used by GlobeMap POV transition
    };
    layers: Partial<MapLayers>;  // only keys relevant to this topic
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
    aiBriefing: {
      systemPrompt: string;
      focusKeywords: string[];
      lang: 'ko' | 'en';  // CRITIC FIX #3: per-topic language
    };
    refreshIntervals?: Record<string, number>;
  }
  ```
- Define `TopicTheme` interface with 9 properties:
  ```typescript
  interface TopicTheme {
    accent: string;           // e.g. '#00cc66'
    accentRgb: string;        // e.g. '0,204,102'
    headerTint: string;       // e.g. 'rgba(13, 32, 13, 0.8)'
    panelBorder: string;      // e.g. 'rgba(42, 74, 42, 0.7)'
    panelBg: string;          // e.g. 'rgba(26, 58, 26, 0.85)'
    markerPrimary: string;
    markerSecondary: string;
    badgeBg: string;
    mapStyle?: string;
  }
  ```
- Define `PanelSlot` interface:
  ```typescript
  interface PanelSlot {
    type: string;    // 'fire-hotspot' | 'weather' | 'satellite' | 'flight' | 'youtube' | 'feed' | 'alert' | 'data-status' | 'ai-brief' | 'conflict-timeline' | 'stock-ticker' | etc.
    title?: string;  // panel title override
    config?: Record<string, any>;
  }
  ```
- Define `KNOWN_PANEL_TYPES` constant -- a set of panel type strings that have real constructors:
  ```typescript
  const KNOWN_PANEL_TYPES = new Set([
    'fire-hotspot', 'weather', 'satellite', 'flight',
    'youtube', 'feed', 'alert', 'data-status', 'ai-brief',
  ]);
  ```
- Define `TopicFeedSource` interface: `{ id, name, url, lang: 'ko' | 'en', category }`
- Export `STORAGE_KEY_TOPIC = 'assieye-active-topic'`
**Acceptance:** Types compile with no errors. All 4 topic configs (T5-T8) can be typed as `TopicConfig`.

### T2: CSS Variables Conversion -- base.css
**File:** `src/styles/base.css`
**Action:** Replace hardcoded color values with CSS custom properties
**Details:**
Add `:root` block at top of file with default (korea-forest) values. This block MUST include ALL 16+ variables that ThemeEngine will control:
```css
:root {
  /* Direct theme properties (set by ThemeEngine from TopicTheme) */
  --accent: #00cc66;
  --accent-rgb: 0, 204, 102;
  --header-tint: rgba(13, 32, 13, 0.8);
  --panel-border: rgba(42, 74, 42, 0.7);
  --panel-bg: rgba(26, 58, 26, 0.85);
  --marker-primary: #ff3300;
  --marker-secondary: #ff8800;
  --badge-bg: rgba(0, 204, 102, 0.2);

  /* Derived variables (auto-computed by ThemeEngine) */
  --body-bg: #0a1a0a;
  --text-primary: #e0e8e0;
  --text-secondary: #7a9a7a;
  --text-muted: #507050;
  --border-subtle: rgba(26, 58, 26, 0.6);
  --scrollbar-thumb: #2a4a2a;
  --scrollbar-thumb-hover: #3a5a3a;
  --status-bar-bg: rgba(13, 31, 13, 0.8);
  --panel-header-bg: rgba(21, 48, 21, 0.7);
  --border-dark: #1e3e1e;
  --map-bg: #0d200d;
  --toolbar-bg: rgba(10, 26, 10, 0.85);
  --popup-bg: rgba(13, 32, 13, 0.95);
}
```
Replace these hardcoded values throughout base.css:
- `#00cc66` -> `var(--accent)`
- `rgba(0, 204, 102, ...)` -> `rgba(var(--accent-rgb), ...)`
- `rgba(13, 32, 13, 0.8)` -> `var(--header-tint)`
- `rgba(26, 58, 26, 0.6)` -> `var(--border-subtle)`
- `#0a1a0a` -> `var(--body-bg)`
- `#e0e8e0` -> `var(--text-primary)`
- `#7a9a7a` -> `var(--text-secondary)`
- `#507050` -> `var(--text-muted)`
- `rgba(13, 31, 13, 0.8)` -> `var(--status-bar-bg)`
- `#2a4a2a` -> `var(--scrollbar-thumb)`
- `#3a5a3a` -> `var(--scrollbar-thumb-hover)`
- `#1a3a1a` -> `var(--border-subtle)` or `var(--border-dark)`
- `rgba(0, 204, 102, 0.15)` in subtleGlow -> `rgba(var(--accent-rgb), 0.15)` and `rgba(var(--accent-rgb), 0.35)`
**Acceptance:** Default appearance is pixel-identical to current. All theme-sensitive colors use CSS variables.

### T3: CSS Variables Conversion -- panels.css
**File:** `src/styles/panels.css`
**Action:** Replace hardcoded color values with CSS custom properties
**Details:**
Replace throughout panels.css:
- `rgba(26, 58, 26, 0.85)` -> `var(--panel-bg)`
- `rgba(42, 74, 42, 0.7)` -> `var(--panel-border)`
- `rgba(0, 204, 102, ...)` -> `rgba(var(--accent-rgb), ...)`
- `#00cc66` -> `var(--accent)`
- `rgba(21, 48, 21, 0.7)` -> `var(--panel-header-bg)`
- `#0a1a0a` -> `var(--body-bg)`
- `#c0d8c0` -> `var(--text-primary)` (close enough to #e0e8e0, or add `--text-panel`)
- `#7a9a7a` -> `var(--text-secondary)`
- `#507050` -> `var(--text-muted)`
- `#2a4a2a` -> `var(--scrollbar-thumb)`
- `#1e3e1e` -> `var(--border-dark)`
- `rgba(42, 74, 42, 0.5)` -> derive from `var(--panel-border)` or use `var(--panel-header-bg)`
- `rgba(0, 204, 102, 0.2)` in livePulse -> `rgba(var(--accent-rgb), 0.2)` / `rgba(var(--accent-rgb), 0.4)`
**Note:** Keep non-theme colors as-is (e.g., `#ff0000` for YouTube active tab, temperature colors, flight callsign blue `#80b0ff`).
Also add a `.coming-soon-panel` style for the placeholder panel:
```css
.coming-soon-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 0.9rem;
  min-height: 80px;
  border: 1px dashed var(--panel-border);
  border-radius: 8px;
  background: var(--panel-bg);
  opacity: 0.6;
}
```
**Acceptance:** Default appearance is pixel-identical. Theme-sensitive colors all use CSS variables. Coming-soon placeholder styled.

### T4: CSS Variables Conversion -- map.css
**File:** `src/styles/map.css`
**Action:** Replace hardcoded color values with CSS custom properties
**Details:**
- `#0d200d` -> `var(--map-bg)`
- `#2a4a2a` -> `var(--scrollbar-thumb)` / `var(--border-dark)`
- `rgba(10, 26, 10, 0.85)` -> `var(--toolbar-bg)`
- `#c0d8c0` -> `var(--text-primary)`
- `rgba(26, 58, 26, 0.9)` -> button hover bg (derive from panel-bg)
- `rgba(0, 204, 102, 0.15)` -> `rgba(var(--accent-rgb), 0.15)`
- `#00cc66` -> `var(--accent)`
- `#7a9a7a` -> `var(--text-secondary)`
- `rgba(13, 32, 13, 0.95)` in popup -> `var(--popup-bg)`
**Acceptance:** Default appearance is pixel-identical. Map UI elements respond to theme changes.

### T5: Korea Forest Topic Config
**File:** `src/config/topics/korea-forest.ts` (NEW)
**Action:** Create the default forest fire monitoring topic config
**Details:** Transcribe the `TOPIC_KOREA_FOREST` config from the PRD (Section 4.1) as a typed `TopicConfig` export. Include:
- `map.globeAltitude: 1.5` (from PRD)
- `aiBriefing.lang: 'ko'` (CRITIC FIX #3: Korean language for AI briefing)
- All theme, layers, panels, feeds, youtube fields per PRD
**Acceptance:** Exports a valid `TopicConfig` object. Values match current hardcoded defaults exactly.

### T6: Iran War Topic Config
**File:** `src/config/topics/iran-war.ts` (NEW)
**Action:** Create the Iran war monitoring topic config
**Details:** Transcribe `TOPIC_IRAN_WAR` from PRD Section 4.2. Include:
- `map.globeAltitude: 2.0`
- `aiBriefing.lang: 'ko'` (Korean prompt text in PRD)
- Panel types `conflict-timeline` will be handled as unknown -> "Coming Soon" placeholder
**Acceptance:** Exports a valid `TopicConfig` object.

### T7: Iran KR Stock Topic Config
**File:** `src/config/topics/iran-kr-stock.ts` (NEW)
**Action:** Create the Iran-Korea stock market topic config
**Details:** Transcribe `TOPIC_IRAN_KR_STOCK` from PRD Section 4.3. Include:
- `map.globeAltitude: 2.5`
- `aiBriefing.lang: 'ko'` (Korean prompt)
- Panel types `stock-ticker`, `stock-sectors`, `oil-price` -> "Coming Soon" placeholders
**Acceptance:** Exports a valid `TopicConfig` object.

### T8: Iran US Stock Topic Config
**File:** `src/config/topics/iran-us-stock.ts` (NEW)
**Action:** Create the Iran-US stock market topic config
**Details:** Transcribe `TOPIC_IRAN_US_STOCK` from PRD Section 4.4. Include:
- `map.globeAltitude: 3.0`
- `aiBriefing.lang: 'en'` (CRITIC FIX #3: English prompt text, English system prompt)
- Panel types `stock-ticker`, `stock-sectors`, `oil-price` -> "Coming Soon" placeholders
**Acceptance:** Exports a valid `TopicConfig` object.

### T9: Topics Index
**File:** `src/config/topics/index.ts` (NEW)
**Action:** Create the topic registry that exports all built-in topics
**Details:**
- Import all 4 topic configs
- Export `BUILTIN_TOPICS: TopicConfig[]` array
- Export `DEFAULT_TOPIC_ID = 'korea-forest'`
- Export `getTopicById(id: string): TopicConfig | undefined`
- Re-export all individual topic configs
**Acceptance:** `BUILTIN_TOPICS` contains exactly 4 topics. `getTopicById('iran-war')` returns the correct config.

### T10: ThemeEngine Service (CRITIC FIX #2: Complete Variable Coverage)
**File:** `src/services/theme-engine.ts` (NEW)
**Action:** Create a service that injects ALL CSS variables from a `TopicTheme` object, including automatically derived variables
**Details:**
```typescript
export class ThemeEngine {
  /**
   * Apply a topic theme by setting all CSS custom properties on :root.
   * The 9 TopicTheme properties are set directly.
   * The remaining 7+ derived variables are computed automatically.
   */
  static apply(theme: TopicTheme): void {
    const root = document.documentElement.style;

    // Direct properties from TopicTheme (9 vars)
    root.setProperty('--accent', theme.accent);
    root.setProperty('--accent-rgb', theme.accentRgb);
    root.setProperty('--header-tint', theme.headerTint);
    root.setProperty('--panel-border', theme.panelBorder);
    root.setProperty('--panel-bg', theme.panelBg);
    root.setProperty('--marker-primary', theme.markerPrimary);
    root.setProperty('--marker-secondary', theme.markerSecondary);
    root.setProperty('--badge-bg', theme.badgeBg);

    // Derived variables (CRITIC FIX #2)
    // Parse panelBg to derive body-bg, text colors, scrollbar, etc.
    const derived = ThemeEngine.deriveVariables(theme);
    root.setProperty('--body-bg', derived.bodyBg);
    root.setProperty('--text-primary', derived.textPrimary);
    root.setProperty('--text-secondary', derived.textSecondary);
    root.setProperty('--text-muted', derived.textMuted);
    root.setProperty('--border-subtle', derived.borderSubtle);
    root.setProperty('--scrollbar-thumb', derived.scrollbarThumb);
    root.setProperty('--scrollbar-thumb-hover', derived.scrollbarThumbHover);
    root.setProperty('--status-bar-bg', derived.statusBarBg);
    root.setProperty('--panel-header-bg', derived.panelHeaderBg);
    root.setProperty('--border-dark', derived.borderDark);
    root.setProperty('--map-bg', derived.mapBg);
    root.setProperty('--toolbar-bg', derived.toolbarBg);
    root.setProperty('--popup-bg', derived.popupBg);
  }

  /**
   * Derive secondary CSS variables from the TopicTheme.
   * Strategy: parse the accentRgb and panelBg to compute
   * darkened/lightened variants for body, text, scrollbar, etc.
   *
   * Each topic's panelBg has an rgba pattern like 'rgba(R, G, B, A)'.
   * Extract R,G,B to derive other colors by adjusting brightness.
   */
  private static deriveVariables(theme: TopicTheme): DerivedThemeVars {
    // Parse the panel bg color to get the base hue channel values
    const panelRgb = ThemeEngine.parseRgba(theme.panelBg);
    // panelRgb = { r, g, b, a } e.g. { r:26, g:58, b:26, a:0.85 }

    // Body bg: darken panelBg significantly (~40% of panel RGB)
    const bodyR = Math.round(panelRgb.r * 0.4);
    const bodyG = Math.round(panelRgb.g * 0.55);
    const bodyB = Math.round(panelRgb.b * 0.4);

    // Text primary: high brightness, slightly tinted
    const textPrimaryR = Math.min(255, panelRgb.r * 3 + 150);
    const textPrimaryG = Math.min(255, panelRgb.g * 2.5 + 130);
    const textPrimaryB = Math.min(255, panelRgb.b * 3 + 150);

    // Text secondary: mid brightness, tinted
    const textSecR = Math.min(255, panelRgb.r * 1.5 + 80);
    const textSecG = Math.min(255, panelRgb.g * 1.3 + 70);
    const textSecB = Math.min(255, panelRgb.b * 1.5 + 80);

    // Text muted: low brightness, tinted
    const textMutedR = Math.min(255, panelRgb.r * 1.2 + 50);
    const textMutedG = Math.min(255, panelRgb.g * 1.0 + 45);
    const textMutedB = Math.min(255, panelRgb.b * 1.2 + 50);

    // Scrollbar thumb: slightly brighter than panel
    const scrollR = Math.round(panelRgb.r * 1.6);
    const scrollG = Math.round(panelRgb.g * 1.3);
    const scrollB = Math.round(panelRgb.b * 1.6);

    // Scrollbar hover: brighter still
    const scrollHR = Math.round(panelRgb.r * 2.2);
    const scrollHG = Math.round(panelRgb.g * 1.6);
    const scrollHB = Math.round(panelRgb.b * 2.2);

    return {
      bodyBg: `rgb(${bodyR}, ${bodyG}, ${bodyB})`,
      textPrimary: `rgb(${Math.round(textPrimaryR)}, ${Math.round(textPrimaryG)}, ${Math.round(textPrimaryB)})`,
      textSecondary: `rgb(${Math.round(textSecR)}, ${Math.round(textSecG)}, ${Math.round(textSecB)})`,
      textMuted: `rgb(${Math.round(textMutedR)}, ${Math.round(textMutedG)}, ${Math.round(textMutedB)})`,
      borderSubtle: `rgba(${panelRgb.r}, ${panelRgb.g}, ${panelRgb.b}, 0.6)`,
      scrollbarThumb: `rgb(${scrollR}, ${scrollG}, ${scrollB})`,
      scrollbarThumbHover: `rgb(${scrollHR}, ${scrollHG}, ${scrollHB})`,
      statusBarBg: theme.headerTint,  // reuse header tint
      panelHeaderBg: `rgba(${Math.round(panelRgb.r * 0.8)}, ${Math.round(panelRgb.g * 0.83)}, ${Math.round(panelRgb.b * 0.8)}, 0.7)`,
      borderDark: `rgb(${Math.round(panelRgb.r * 0.75)}, ${Math.round(panelRgb.g * 0.68)}, ${Math.round(panelRgb.b * 0.75)})`,
      mapBg: `rgb(${bodyR}, ${Math.round(bodyG * 1.1)}, ${bodyB})`,
      toolbarBg: `rgba(${bodyR}, ${bodyG}, ${bodyB}, 0.85)`,
      popupBg: `rgba(${bodyR}, ${Math.round(bodyG * 1.1)}, ${bodyB}, 0.95)`,
    };
  }

  /**
   * Parse an rgba(...) or rgb(...) string into components.
   */
  private static parseRgba(color: string): { r: number; g: number; b: number; a: number } {
    const match = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
    if (match) {
      return { r: +match[1], g: +match[2], b: +match[3], a: match[4] ? +match[4] : 1 };
    }
    // Fallback for hex (shouldn't happen for panelBg, but safety)
    return { r: 26, g: 58, b: 26, a: 0.85 };
  }
}

interface DerivedThemeVars {
  bodyBg: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  borderSubtle: string;
  scrollbarThumb: string;
  scrollbarThumbHover: string;
  statusBarBg: string;
  panelHeaderBg: string;
  borderDark: string;
  mapBg: string;
  toolbarBg: string;
  popupBg: string;
}
```
**IMPORTANT:** The derivation formulas above are approximate. The implementer MUST verify the korea-forest derived values match the current hardcoded defaults. If they do not match closely enough, add explicit override values for korea-forest theme and only use derivation for other themes. Alternatively, store pre-computed derived vars in a lookup table keyed by topic ID.
**Acceptance:** Calling `ThemeEngine.apply(iranWarTheme)` changes ALL CSS variables -- accent, body bg, text colors, scrollbar colors. `ThemeEngine.apply(koreaForestTheme)` produces pixel-identical defaults.

### T11: Theme Transition CSS
**File:** `src/styles/themes.css` (NEW)
**Action:** Create CSS file with topic transition animation
**Details:**
```css
/* Smooth color transitions on all elements using CSS variables */
.panel,
.app-header,
.status-bar,
.layer-toggle,
.map-toolbar button,
.feed-tab,
.panel-count,
.panel-badge--live,
.app-title,
.app-domain-badge,
body,
::-webkit-scrollbar-thumb {
  transition: background 0.5s ease, border-color 0.5s ease, color 0.5s ease, box-shadow 0.5s ease;
}

/* Topic switch overlay animation */
.topic-transitioning {
  animation: topicSwitch 0.5s ease;
}

@keyframes topicSwitch {
  0%   { opacity: 1; filter: brightness(1); }
  40%  { opacity: 0.3; filter: brightness(0.5); }
  100% { opacity: 1; filter: brightness(1); }
}
```
**Acceptance:** Topic switch has a smooth fade effect. CSS color transitions are smooth. Body background transitions too.

### T12: TopicManager Service (CRITIC FIX #5: Generation Counter)
**File:** `src/services/topic-manager.ts` (NEW)
**Action:** Create the central topic switching orchestrator with race condition mitigation
**Details:**
```typescript
export class TopicManager {
  private activeTopic: TopicConfig;
  private generation: number = 0;  // CRITIC FIX #5: generation counter

  /**
   * Get the current generation number. Callers should capture this
   * before starting async work, then check isCurrentGeneration()
   * before applying results.
   */
  getGeneration(): number {
    return this.generation;
  }

  /**
   * Check if the given generation is still current.
   * Returns false if a topic switch happened since this generation was captured.
   */
  isCurrentGeneration(gen: number): boolean {
    return gen === this.generation;
  }

  getActiveTopic(): TopicConfig { return this.activeTopic; }
  getAllTopics(): TopicConfig[] { return BUILTIN_TOPICS; }

  /**
   * Initialize from URL parameter or localStorage.
   * Priority: URL param > localStorage > default
   */
  initFromUrlOrStorage(): TopicConfig {
    const urlParams = new URLSearchParams(window.location.search);
    const urlTopic = urlParams.get('topic');
    const storedTopic = localStorage.getItem(STORAGE_KEY_TOPIC);
    const topicId = urlTopic || storedTopic || DEFAULT_TOPIC_ID;

    this.activeTopic = getTopicById(topicId) || getTopicById(DEFAULT_TOPIC_ID)!;

    // Update URL without reload
    if (urlTopic && urlTopic !== this.activeTopic.id) {
      history.replaceState(null, '', window.location.pathname);
    }

    localStorage.setItem(STORAGE_KEY_TOPIC, this.activeTopic.id);
    return this.activeTopic;
  }

  /**
   * Switch to a new topic. Increments generation counter.
   * Returns the new generation number for callers to use.
   */
  switchTopic(topicId: string): number {
    const topic = getTopicById(topicId);
    if (!topic || topic.id === this.activeTopic.id) return this.generation;

    // CRITIC FIX #5: Increment generation to invalidate in-flight async ops
    this.generation++;
    const currentGen = this.generation;

    this.activeTopic = topic;

    // Apply transition animation
    document.body.classList.add('topic-transitioning');

    // Apply theme (synchronous)
    ThemeEngine.apply(topic.theme);

    // Emit event for decoupled listeners
    window.dispatchEvent(new CustomEvent('topic-changed', {
      detail: { topic, generation: currentGen }
    }));

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY_TOPIC, topicId);

    // Remove transition class after animation completes
    setTimeout(() => {
      document.body.classList.remove('topic-transitioning');
    }, 500);

    return currentGen;
  }
}
```
**Acceptance:** `switchTopic('iran-war')` fires event, saves to storage, applies theme, increments generation. Rapid `switchTopic('a'); switchTopic('b')` increments generation twice; callbacks from 'a' see stale generation.

### T13: Update Feeds API for Dynamic Sources (CRITIC MINOR FIX: POST instead of GET)
**File:** `api/feeds.js`
**Action:** Accept dynamic feed source URLs via POST body instead of URL-encoded query parameter
**Details:**
- Support both GET (existing behavior, hardcoded sources) and POST (dynamic sources)
- POST body format: `{ sources: [{ id, name, url, lang, category }] }`
- If POST with `sources` array is provided, use those instead of hardcoded `FEED_SOURCES`
- Keep GET behavior unchanged as fallback
- URL validation: only allow `https://` URLs, reject anything else
- Cap at max 10 sources to prevent abuse
- Why POST instead of GET: URL length limit (2048 chars) would be exceeded with 4+ feed source objects encoded as query params
**Acceptance:** POST with `{ sources: [{...}] }` returns items from those feeds. GET returns items from hardcoded sources.

### T14: Update Summarize API for Custom Prompts + Language (CRITIC FIX #3)
**File:** `api/summarize.js`
**Action:** Accept a custom `systemPrompt` field and per-request `lang` in the POST body
**Details:**
- Add optional `systemPrompt` field to the request body
- When `mode === 'brief'` and `systemPrompt` is provided, use it instead of the hardcoded forest-focused prompt
- The existing `lang` field already exists in the API but `generateDailyBrief` hardcodes `'ko'`. The API should simply use whatever `lang` is passed.
- Prepend the user's `systemPrompt` as the system message, then append the news text
- Keep existing behavior as fallback when no `systemPrompt`
- Sanitize: cap `systemPrompt` at 500 characters
**Acceptance:** POST with `{ text, lang: 'en', mode: 'brief', systemPrompt: 'Analyze Iran conflict...' }` uses the custom prompt and English language.

### T15: TopicSelector Component
**File:** `src/components/TopicSelector.ts` (NEW)
**Action:** Create a dropdown component for topic selection
**Details:**
- Renders a button showing current topic icon + name + dropdown arrow
- On click, toggles a dropdown list of all topics
- Each topic item shows icon + name, with a checkmark on the active one
- Clicking a topic calls `TopicManager.switchTopic(topicId)`
- Dropdown closes on outside click or Escape key
- Style: matches existing `app-domain-badge` aesthetic, positioned inline in header
- Listens for `topic-changed` event to update displayed topic name/icon
- Add CSS for the dropdown in a `<style>` block or in themes.css:
  - `.topic-selector` -- the button
  - `.topic-dropdown` -- the dropdown list
  - `.topic-dropdown-item` -- each item
  - `.topic-dropdown-item.active` -- checkmark indicator
**Acceptance:** Dropdown opens/closes. Selecting a topic triggers a full topic switch. Active topic is visually indicated.

### T16: Update Header.ts
**File:** `src/components/Header.ts`
**Action:** Replace static domain badge with TopicSelector
**Details:**
- Import `TopicSelector`
- Replace `domainBadge` span with `new TopicSelector().getElement()`
- Accept an `onTopicChange` callback or rely on the global `topic-changed` event
- Update subtitle to show the topic description instead of static text
- Listen for `topic-changed` event to update subtitle dynamically
**Acceptance:** Header shows topic dropdown instead of static badge. Subtitle updates on topic change.

### T17: Update Layout.ts
**File:** `src/components/Layout.ts`
**Action:** Expose header reference for potential external updates
**Details:**
- Make `header` property `readonly` instead of `private readonly` (or add getter)
- This allows App.ts to pass topic change info if needed
- Minor change, mostly for future flexibility
**Acceptance:** `layout.header` is accessible from App.ts.

### T18: Integrate TopicManager into App.ts (CRITIC FIX #1 + #5)
**File:** `src/App.ts`
**Action:** Wire up topic switching to all data loading and panel management, with panel reconfiguration and race condition protection
**Details:**
- Import `TopicManager`, `ThemeEngine`
- Add a `topicManager: TopicManager` instance field
- Add a `panelRegistry: Map<string, { create: () => PanelBase, instance: PanelBase | null }>` for panel type mapping
- In `init()`:
  - Create `TopicManager` instance
  - Call `topicManager.initFromUrlOrStorage()` to get initial topic
  - Apply initial theme via `ThemeEngine.apply(topic.theme)`
  - Set initial `ytQuery` from `topic.youtube.liveSearchQuery`
  - Use topic feeds when loading feed data
  - Build panel layout from topic config using `rebuildPanels(topic.panels)`

- **CRITIC FIX #1 -- Panel Reconfiguration:**
  Define a panel registry mapping `PanelSlot.type` to existing panel constructors:
  ```typescript
  private readonly PANEL_CONSTRUCTORS: Record<string, () => PanelBase> = {
    'fire-hotspot': () => new FireHotspotPanel(),
    'weather': () => new WeatherPanel(),
    'satellite': () => new SatellitePanel(),
    'flight': () => new FlightPanel(),
    'youtube': () => new YouTubePanel(),
    'feed': () => new FeedPanel(),
    'alert': () => new AlertPanel(),
    'data-status': () => new DataStatusPanel(),
    'ai-brief': () => new AiBriefPanel(),
  };
  ```
  On topic switch, call `rebuildPanels(topic.panels)`:
  ```typescript
  private rebuildPanels(panels: TopicConfig['panels']): void {
    // Clear existing panel DOM
    this.layout.panelsLeft.innerHTML = '';
    this.layout.panelsRight.innerHTML = '';
    this.layout.panelsBottom.innerHTML = '';

    // Destroy old panel instances
    this.destroyPanels();

    // Build new panels
    for (const slot of panels.left) {
      const panel = this.createPanelForSlot(slot);
      this.layout.panelsLeft.appendChild(panel.getElement());
    }
    // ... repeat for right, bottom
  }

  private createPanelForSlot(slot: PanelSlot): PanelBase {
    const constructor = this.PANEL_CONSTRUCTORS[slot.type];
    if (!constructor) {
      // CRITIC FIX #1: Unknown panel type -> "Coming Soon" placeholder
      return new ComingSoonPanel(slot.title || slot.type);
    }
    const panel = constructor();
    if (slot.title) panel.setTitle(slot.title);  // Title override
    // Store reference for data loading (e.g., this.fireHotspotPanel = panel)
    this.storePanelRef(slot.type, panel);
    return panel;
  }
  ```
  Create a simple `ComingSoonPanel` class:
  ```typescript
  class ComingSoonPanel {
    private el: HTMLElement;
    constructor(title: string) {
      this.el = h('div', { className: 'panel coming-soon-panel' },
        h('div', { className: 'panel-header' }, h('span', {}, title)),
        h('div', { className: 'coming-soon-content' }, `${title} - Coming Soon`)
      );
    }
    getElement() { return this.el; }
    destroy() { this.el.remove(); }
  }
  ```

- **CRITIC FIX #5 -- Race Condition Protection:**
  Listen for `topic-changed` event on `window`:
  ```typescript
  window.addEventListener('topic-changed', (e: CustomEvent) => {
    const { topic, generation } = e.detail;

    // Rebuild panels for new topic
    this.rebuildPanels(topic.panels);

    // Update ytQuery
    this.ytQuery = topic.youtube.liveSearchQuery;

    // Trigger async reloads -- each checks generation before applying
    void this.loadFeedDataForTopic(topic, generation);
    void this.loadYouTubeDataForTopic(generation);
    void this.loadAiBriefForTopic(topic, generation);

    // Synchronous updates
    this.layout.mapContainer.flyTo(topic.map.center, topic.map.zoom, topic.map.globeAltitude);
    this.layout.mapContainer.resetLayers(topic.layers);
  });
  ```
  Each async loader checks generation:
  ```typescript
  private async loadFeedDataForTopic(topic: TopicConfig, generation: number): Promise<void> {
    this.feedPanel?.showLoading();
    try {
      const items = await fetchFeeds(topic.feeds);
      // CRITIC FIX #5: Check generation before applying
      if (!this.topicManager.isCurrentGeneration(generation)) return;
      this.feedPanel?.update(items);
      this.aiBriefPanel?.setItems(items);
      // ...
    } catch (err) {
      if (!this.topicManager.isCurrentGeneration(generation)) return;
      this.feedPanel?.showError();
    }
  }
  ```

- Update all `loadXxxData()` methods to optionally accept topic config and check generation
**Acceptance:** Switching topic reloads feeds, YouTube, repositions map, resets layers, rebuilds panels. Unknown panel types show placeholder. Rapid switching discards stale results.

### T19: Update map-state.ts
**File:** `src/services/map-state.ts`
**Action:** Support topic-driven center/zoom changes
**Details:**
- Add `setTopicDefaults(center, zoom)` function that updates both center and zoom
- Update `DEFAULT_STATE` to be mutable (set from topic config on init)
- `resetMapState()` should reset to the current topic's defaults, not hardcoded KOREA_CENTER
**Acceptance:** After switching to iran-war topic, `getCenter()` returns Iran coordinates.

### T20: Update MapContainer for flyTo (CRITIC MINOR FIX: globeAltitude)
**File:** `src/components/MapContainer.ts`
**Action:** Add a `flyTo(center, zoom, globeAltitude)` method
**Details:**
- Add `flyTo(center: { lat: number; lng: number }, zoom: number, globeAltitude: number): void`
- For FlatMap: call `map.flyTo({ center: [lng, lat], zoom, duration: 2000 })`
- For GlobeMap: call `globe.pointOfView({ lat, lng, altitude: globeAltitude }, 2000)` -- uses the topic's `globeAltitude` not zoom
- Also add `resetLayers(layers: Partial<MapLayers>): void` that calls `this.layerToggle.resetLayers(layers)`
**Acceptance:** Calling `flyTo({ lat: 32.4, lng: 53.7 }, 5, 2.0)` smoothly animates the map. Globe uses altitude=2.0.

### T21: Update LayerToggle for Topic Reset (CRITIC FIX #4: Stored Checkbox References)
**File:** `src/components/LayerToggle.ts`
**Action:** Store checkbox references and add programmatic reset method
**Details:**
- Add instance property: `private checkboxRefs: Map<string, HTMLInputElement> = new Map()`
- In `createCheckbox()`, store the input reference:
  ```typescript
  private createCheckbox(key: keyof MapLayers, label: string, checked: boolean): HTMLElement {
    const input = h('input', {
      type: 'checkbox',
      checked: checked || undefined,
      onChange: (e: Event) => {
        const target = e.target as HTMLInputElement;
        this.layers = { ...this.layers, [key]: target.checked };
        this.onLayerChange({ ...this.layers });
      },
    }) as HTMLInputElement;

    if (checked) input.checked = true;

    // CRITIC FIX #4: Store reference for programmatic updates
    this.checkboxRefs.set(key, input);

    return h('label', { className: 'layer-toggle-item' }, input, label);
  }
  ```
- Add `resetLayers(layers: Partial<MapLayers>): void` method:
  ```typescript
  resetLayers(layers: Partial<MapLayers>): void {
    // Build complete MapLayers with defaults of false for unspecified keys
    const fullLayers: MapLayers = {
      fires: false, weather: false, dwi: false,
      satellites: false, flights: false, cctv: false,
      ...layers,
    };

    this.layers = fullLayers;

    // CRITIC FIX #4: Update checkboxes programmatically via stored refs
    for (const [key, input] of this.checkboxRefs) {
      input.checked = !!fullLayers[key as keyof MapLayers];
    }

    this.onLayerChange({ ...this.layers });
  }
  ```
**Acceptance:** Calling `resetLayers({ fires: true, flights: true })` unchecks weather/dwi/satellites/cctv and checks fires/flights. Checkbox UI matches state.

### T22: Update Feeds Service (CRITIC MINOR FIX: POST method)
**File:** `src/services/feeds.ts`
**Action:** Accept dynamic feed sources and POST them to the API
**Details:**
- Change `fetchFeeds` signature to `fetchFeeds(sources?: TopicFeedSource[]): Promise<RssFeedItem[]>`
- When `sources` is provided, use POST method with JSON body:
  ```typescript
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sources }),
  });
  ```
- When no sources, use existing GET behavior (server default sources)
**Acceptance:** `fetchFeeds(iranWarTopic.feeds)` returns Iran-related news items via POST.

### T23: Update YouTube Panel for Topic Queries
**File:** `src/components/YouTubePanel.ts`
**Action:** Accept topic-specific search queries
**Details:**
- Add `setTopicQueries(youtube: { liveSearchQuery: string; vodSearchQuery: string }): void`
- Updates `DEFAULT_SEARCHES` equivalent to use topic-specific queries
- Resets `activeQuery` to the new live search query
- Triggers `onQueryChange` callback
**Acceptance:** After topic switch to iran-war, YouTube tabs show "iran war live" and "iran conflict analysis".

### T24: Update AI Brief for Topic Prompts + Language (CRITIC FIX #3)
**File:** `src/components/AiBriefPanel.ts` and `src/services/ai-summary.ts`
**Action:** Pass topic-specific system prompt AND language to the AI briefing
**Details:**
- `AiBriefPanel`: Add `setTopicBriefing(briefing: { systemPrompt: string; focusKeywords: string[]; lang: 'ko' | 'en' }): void`
  - Store the system prompt, keywords, AND language
  - Pass them when calling `generateDailyBrief`
- `ai-summary.ts`: Update `generateDailyBrief` to accept optional `systemPrompt` AND `lang` parameters:
  ```typescript
  export async function generateDailyBrief(
    items: RssFeedItem[],
    options?: { systemPrompt?: string; lang?: 'ko' | 'en' }
  ): Promise<string> {
    // ...
    const res = await fetch('/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        lang: options?.lang || 'ko',  // CRITIC FIX #3: per-topic lang
        mode: 'brief',
        systemPrompt: options?.systemPrompt,  // CRITIC FIX #3: custom prompt
      }),
    });
    // ...
  }
  ```
**Acceptance:** AI briefing for iran-us-stock topic generates English analysis using the English system prompt. AI briefing for korea-forest uses Korean.

### T25: URL Parameter Support
**File:** `src/services/topic-manager.ts` (part of T12, but verified separately)
**Action:** Support `?topic=xxx` URL parameter
**Details:**
- In `initFromUrlOrStorage()`, parse `window.location.search` for `topic` param
- URL param takes priority over localStorage
- After applying, update the URL without page reload using `history.replaceState`
- Handle invalid topic IDs gracefully (fall back to default)
**Acceptance:** Opening `?topic=iran-war` loads the Iran war topic. Opening `?topic=nonexistent` loads default topic.

### T26: Update Config Exports
**File:** `src/config/constants.ts` and `src/config/index.ts`
**Action:** Add topic-related storage key and exports
**Details:**
- `constants.ts`: Add `STORAGE_KEYS.activeTopic = 'assieye-active-topic'`
- `index.ts`: Add exports for topics: `export { BUILTIN_TOPICS, DEFAULT_TOPIC_ID, getTopicById } from './topics'`
**Acceptance:** All topic-related config is accessible from `@/config`.

### T27: Update types/index.ts
**File:** `src/types/index.ts`
**Action:** Re-export topic types for convenience
**Details:**
- Add `export type { TopicConfig, TopicTheme, PanelSlot, TopicFeedSource } from './topic'`
- The existing `MapLayers` type remains unchanged (6 boolean keys). Topic configs use `Partial<MapLayers>` for their layers.
**Acceptance:** Topic types importable from `@/types`.

### T28: Import themes.css in main.ts (CRITIC MINOR FIX)
**File:** `src/main.ts`
**Action:** Add the themes.css import
**Details:**
- Add `import '@/styles/themes.css';` after the existing CSS imports
- The entry point is `src/main.ts` which already imports `base.css`, `panels.css`, `map.css`
```typescript
import '@/styles/base.css';
import '@/styles/panels.css';
import '@/styles/map.css';
import '@/styles/themes.css';  // NEW: topic transition animations
```
**Acceptance:** Theme transition CSS is loaded. Topic switch animation plays.

### T29: End-to-End Verification
**Action:** Manual verification checklist
**Details:**
1. Build succeeds with no TypeScript errors
2. Default load shows korea-forest topic (identical to current)
3. Click dropdown -> select iran-war -> theme turns red (body bg, text, scrollbars all change), map flies to Iran
4. Verify iran-war panels: "Coming Soon" placeholder for conflict-timeline, fire-hotspot retitled "열점/폭격 감지"
5. Click dropdown -> select iran-kr-stock -> theme turns blue, map zooms out, "Coming Soon" for stock-ticker/sectors/oil-price
6. Click dropdown -> select iran-us-stock -> theme turns teal, map shows Atlantic, globe altitude=3.0
7. AI briefing for iran-us-stock generates in ENGLISH
8. Refresh page -> same topic persists
9. Open `?topic=iran-war` in new tab -> loads iran-war directly
10. Open `?topic=invalid` -> loads korea-forest default
11. Rapidly switch topics 5 times -> no stale data appears (generation counter works)
12. YouTube shows topic-appropriate search tabs
13. All body/text/scrollbar colors change per topic (not just accent/panel colors)
**Acceptance:** All 13 checks pass.

---

## Commit Strategy

### Commit 1: "Add TopicConfig types and 4 built-in topic configs"
- T1, T5, T6, T7, T8, T9, T26, T27

### Commit 2: "Convert hardcoded CSS colors to CSS custom properties"
- T2, T3, T4, T11, T28

### Commit 3: "Add ThemeEngine with full variable derivation and TopicManager with generation counter"
- T10, T12, T25

### Commit 4: "Update server APIs to support dynamic feeds (POST) and custom prompts with lang"
- T13, T14

### Commit 5: "Add TopicSelector UI and integrate into Header/Layout"
- T15, T16, T17

### Commit 6: "Wire topic switching into App.ts with panel reconfiguration and race protection"
- T18, T19, T20, T21, T22, T23, T24

### Commit 7: "Verify and fix topic mode integration"
- T29, any bug fixes

---

## Risk Identification and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| CSS variable conversion breaks existing appearance | HIGH | MEDIUM | Compare screenshots before/after. Use exact same default values as current hardcoded ones. |
| ThemeEngine derivation produces wrong colors for korea-forest | HIGH | MEDIUM | Implementer MUST verify derived values match hardcoded defaults. If not, use a lookup table with pre-computed values per topic as fallback. |
| Server-side feeds API POST could be abused | MEDIUM | LOW | Cap sources at 10, validate HTTPS-only URLs, keep rate limiting. |
| FlatMap/GlobeMap `flyTo` method may not exist or behave differently | MEDIUM | LOW | FlatMap uses MapLibre GL which has `flyTo`. GlobeMap uses globe.gl which has `pointOfView` with transition. Both are well-documented. |
| Topic switch during data loading causes stale results | HIGH | HIGH | **MITIGATED:** Generation counter in TopicManager. Every async callback checks `isCurrentGeneration()` before applying results. |
| AI summarize prompt injection via systemPrompt | LOW | LOW | Cap systemPrompt at 500 chars. Only used for context, not for tool/function calls. |
| Panel reconfiguration leaves dangling event listeners | MEDIUM | MEDIUM | `destroyPanels()` must call `.destroy()` on all existing panel instances before rebuilding. |
| MapLayers type mismatch between topic config and existing code | MEDIUM | LOW | Topic config uses `Partial<MapLayers>` with only existing keys. Extra keys (conflictZones, stockMarkers) in PRD topic configs are silently ignored by LayerToggle. |
| YouTube panel hardcoded DEFAULT_SEARCHES conflicts with topic queries | LOW | HIGH | Override DEFAULT_SEARCHES when `setTopicQueries` is called. Ensure initial load uses topic queries. |
| URL-encoded feed sources exceed URL length limit | MEDIUM | HIGH | **MITIGATED:** Using POST body instead of GET query parameter. |

---

## Critic Issues Resolution Summary

| Issue | Root Cause | Fix | Tasks Affected |
|-------|-----------|-----|----------------|
| **#1 Panel reconfiguration** | Plan had no strategy for unknown panel types | Added `PANEL_CONSTRUCTORS` registry + `ComingSoonPanel` placeholder. Unknown types silently show "Coming Soon". Panel rebuild on topic switch. | T1, T3, T18 |
| **#2 ThemeEngine incomplete** | Only 9 CSS vars set, 7+ left unchanged | ThemeEngine now derives ALL variables (body-bg, text-primary/secondary/muted, scrollbar-thumb/hover, border-subtle, border-dark, status-bar-bg, panel-header-bg, map-bg, toolbar-bg, popup-bg) from TopicTheme's panelBg RGB values. | T2, T10 |
| **#3 AI briefing language** | `generateDailyBrief` hardcoded `lang: 'ko'` | Added `lang: 'ko' \| 'en'` field to `TopicConfig.aiBriefing`. Passed through to `generateDailyBrief()` and the API. iran-us-stock uses `'en'`. | T1, T5, T6, T7, T8, T14, T24 |
| **#4 LayerToggle.resetLayers()** | Checkbox inputs not stored, can't update programmatically | Added `Map<string, HTMLInputElement>` to store refs in `createCheckbox()`. `resetLayers()` iterates the map to set `.checked`. | T21 |
| **#5 Race condition** | No mechanism to discard stale async results | Added generation counter to TopicManager. `switchTopic()` increments counter. All async callbacks check `isCurrentGeneration()` before applying. | T12, T18 |
| **Minor: themes.css import** | Not specified where to import | Explicit T28: import in `src/main.ts` | T28 |
| **Minor: globeAltitude** | Plan used zoom for globe, not altitude | `flyTo()` now takes 3rd param `globeAltitude`. GlobeMap uses `pointOfView({ altitude })`. | T20 |
| **Minor: POST for feeds** | GET with URL-encoded JSON hits URL length limit | Changed feeds API to accept POST with JSON body. | T13, T22 |

---

## Success Criteria

| Criteria | Measurement |
|----------|-------------|
| Topic switch < 1 second | Theme + map animation completes within 1s |
| 4 built-in topics functional | All 4 topics load with correct theme, map, feeds |
| CSS variable coverage > 95% | Manual audit: < 3 hardcoded theme-sensitive colors remain |
| ALL CSS variables change on theme switch | Body bg, text colors, scrollbar colors all update (not just accent/panel) |
| Unknown panel types handled gracefully | "Coming Soon" placeholder shown, no console errors |
| Race conditions prevented | Rapid 5x topic switch results in correct final state |
| AI briefing language correct | korea-forest/iran-war/iran-kr-stock use Korean; iran-us-stock uses English |
| localStorage persistence works | Refresh page -> same topic |
| URL param works | `?topic=iran-war` -> correct topic on load |
| No regression on default topic | korea-forest appearance identical to pre-change |
| Bundle size increase < 15KB | Measure before/after build |
