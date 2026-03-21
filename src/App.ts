import { initI18n } from '@/services/i18n';
import { DEFAULT_MAP_LAYERS } from '@/config';
import type { AppContext } from '@/app/app-context';
import type { FireHotspot } from '@/types';
import type { TopicConfig, PanelSlot } from '@/config/topics/types';
import { PanelLayoutManager } from '@/app/panel-layout';
import { DataLoaderManager } from '@/app/data-loader';
import { RefreshScheduler } from '@/app/refresh-scheduler';
import { Layout } from '@/components/Layout';
import { Panel } from '@/components/Panel';
import { FireHotspotPanel } from '@/components/FireHotspotPanel';
import { WeatherPanel } from '@/components/WeatherPanel';
import { FeedPanel } from '@/components/FeedPanel';
import { AlertPanel } from '@/components/AlertPanel';
import { DataStatusPanel } from '@/components/DataStatusPanel';
import { SatellitePanel } from '@/components/SatellitePanel';
import { FlightPanel } from '@/components/FlightPanel';
import { YouTubePanel } from '@/components/YouTubePanel';
import { AiBriefPanel } from '@/components/AiBriefPanel';
import { StockTickerPanel } from '@/components/StockTickerPanel';
import { StockSectorsPanel } from '@/components/StockSectorsPanel';
import { OilPricePanel } from '@/components/OilPricePanel';
import { ConflictTimelinePanel } from '@/components/ConflictTimelinePanel';
import { AgentNewsPanel } from '@/components/AgentNewsPanel';
import { PlatformFeedPanel } from '@/components/PlatformFeedPanel';
import { SituationSummaryPanel } from '@/components/SituationSummaryPanel';
import { FireStatsPanel } from '@/components/FireStatsPanel';
import { TimelineChartPanel } from '@/components/TimelineChartPanel';
import { MobileTabBar } from '@/components/MobileTabBar';
import { SentimentPanel } from '@/components/SentimentPanel';
import { LiveStreamPanel } from '@/components/LiveStreamPanel';
import { PredictPanel } from '@/components/PredictPanel';
import { StatusBar } from '@/components/StatusBar';
import { TopicSelector } from '@/components/TopicSelector';
import { TopicEditorModal } from '@/components/TopicEditorModal';
import { TopicManager } from '@/services/topic-manager';
import { fetchFireHotspots, computeRegionStats } from '@/services/firms';
import { fetchWeatherData } from '@/services/weather';
import { fetchDwiData } from '@/services/dwi';
import { fetchFeeds, fetchFeedsForTopic } from '@/services/feeds';
import { fetchSatellites } from '@/services/satellites';
import { fetchFlights } from '@/services/flights';
import { fetchYouTubeVideos } from '@/services/youtube';
import { fetchCctvs } from '@/services/cctv';
import { checkAndSendAlerts } from '@/services/alerts';
import { fetchMarketQuotes } from '@/services/market';
import { AgentNewsWatcher, setAgentNewsTopic } from '@/services/agent-news';
import { REFRESH_INTERVALS } from '@/config/constants';

export class App {
  private readonly container: HTMLElement;
  private readonly ctx: AppContext;
  private readonly panelLayout: PanelLayoutManager;
  private readonly dataLoader: DataLoaderManager;
  private readonly refreshScheduler: RefreshScheduler;
  private readonly topicManager: TopicManager;
  private layout: Layout | null = null;
  private topicSelector: TopicSelector | null = null;
  private statusBar: StatusBar | null = null;

  // Dynamic panel references (set during buildPanels)
  private activePanels: Panel[] = [];
  private fireHotspotPanel: FireHotspotPanel | null = null;
  private weatherPanel: WeatherPanel | null = null;
  private feedPanel: FeedPanel | null = null;
  private alertPanel: AlertPanel | null = null;
  private dataStatusPanel: DataStatusPanel | null = null;
  private satellitePanel: SatellitePanel | null = null;
  private flightPanel: FlightPanel | null = null;
  private youtubePanel: YouTubePanel | null = null;
  private aiBriefPanel: AiBriefPanel | null = null;
  private stockTickerPanel: StockTickerPanel | null = null;
  private stockSectorsPanel: StockSectorsPanel | null = null;
  private oilPricePanel: OilPricePanel | null = null;
  private conflictTimelinePanel: ConflictTimelinePanel | null = null;
  private agentNewsPanel: AgentNewsPanel | null = null;
  private agentNewsWatcher: AgentNewsWatcher | null = null;
  private liveStreamPanel: LiveStreamPanel | null = null;
  private platformPanels: PlatformFeedPanel[] = [];
  private situationSummaryPanel: SituationSummaryPanel | null = null;
  private fireStatsPanel: FireStatsPanel | null = null;
  private predictPanel: PredictPanel | null = null;

  private satGroup = 'weather';
  private ytQuery = '';
  private previousFires: FireHotspot[] = [];
  private firmsDays = 2;
  private firmsRefreshedAt: string | undefined;
  private weatherRefreshedAt: string | undefined;
  private feedsRefreshedAt: string | undefined;
  private fireHighlightTimer: ReturnType<typeof setInterval> | null = null;
  private fireHighlightIndex = 0;

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Container element "#${containerId}" not found`);
    this.container = el;

    this.ctx = {
      container: this.container,
      isMobile: window.innerWidth < 768,
      mapLayers: { ...DEFAULT_MAP_LAYERS },
    };

    this.panelLayout = new PanelLayoutManager(this.ctx);
    this.dataLoader = new DataLoaderManager();
    this.refreshScheduler = new RefreshScheduler();
    this.topicManager = new TopicManager();
  }

  async init(): Promise<void> {
    await initI18n();

    // Apply initial topic theme before building UI
    this.topicManager.applyInitialTopic();
    const topic = this.topicManager.getActiveTopic();
    this.ytQuery = topic.youtube.liveSearchQuery || this.ytQuery;

    this.layout = new Layout();
    this.container.appendChild(this.layout.getElement());

    this.statusBar = new StatusBar();
    this.container.appendChild(this.statusBar.getElement());

    this.liveStreamPanel = new LiveStreamPanel();
    this.container.appendChild(this.liveStreamPanel.getElement());

    // Mobile tab bar — one tab per component
    const mobileTabBar = new MobileTabBar((tabId) => {
      // Hide everything
      const allPanels = this.container.querySelectorAll('.panel');
      const map = this.container.querySelector('.map-container') as HTMLElement;
      const live = this.liveStreamPanel?.getElement();
      const left = this.layout?.panelsLeft;
      const right = this.layout?.panelsRight;
      const bottom = this.layout?.panelsBottom;

      [left, right, bottom].forEach(el => { if (el) el.style.display = 'none'; });
      if (map) map.style.display = 'none';
      if (live) live.style.display = 'none';

      if (tabId === 'map') {
        if (map) { map.style.display = ''; map.style.height = 'calc(100vh - 80px)'; }
        if (live) live.style.display = '';
      } else {
        // Show the panel container that has the matching panel
        allPanels.forEach(p => {
          const panel = p as HTMLElement;
          panel.style.display = panel.dataset.panelId === tabId ? '' : 'none';
        });
        // Show all containers so the matching panel is visible
        [left, right, bottom].forEach(el => { if (el) el.style.display = 'flex'; });
      }
    });
    mobileTabBar.setTabs([
      { id: 'map', icon: '', label: '\uC9C0\uB3C4' },
      { id: 'platform-news', icon: '', label: '\uB274\uC2A4' },
      { id: 'platform-youtube', icon: '', label: 'YouTube' },
      { id: 'platform-twitter', icon: '', label: 'X' },
      { id: 'platform-instagram', icon: '', label: 'IG' },
      { id: 'platform-facebook', icon: '', label: 'FB' },
      { id: 'fire-stats', icon: '', label: '\uD1B5\uACC4' },
      { id: 'predict', icon: '', label: 'AI' },
    ], 'map');
    this.container.insertBefore(mobileTabBar.getElement(), this.layout.getElement());

    this.panelLayout.init();
    this.dataLoader.init();
    this.refreshScheduler.init();

    // Create and mount TopicSelector
    this.topicSelector = new TopicSelector({
      topics: this.topicManager.getAllTopics(),
      activeTopic: topic,
      onSelect: (topicId) => void this.topicManager.switchTopic(topicId),
      onAddNew: () => this.showTopicEditorModal(null),
      onManage: () => this.showTopicEditorModal(null),
    });
    this.layout.header.setTopicSelector(this.topicSelector);

    // Build panels from topic config
    this.buildPanels(topic);

    // Apply topic-specific layer settings
    this.layout.mapContainer.getLayerToggle().resetLayers(topic.layers);

    // Fly map to topic center
    this.layout.mapContainer.flyTo(topic.map.center, topic.map.zoom, topic.map.globeAltitude);

    // Set topic markers (e.g. fire location pins)
    if (topic.map.markers?.length) {
      this.layout.mapContainer.setTopicMarkers(topic.map.markers);
    }

    // Load briefing timeline for the topic
    this.loadBriefingTimeline(topic);

    // Register topic change listener
    this.topicManager.onTopicChange((newTopic: TopicConfig) => {
      void this.applyTopicChange(newTopic);
    });

    // Load data for initial panels
    await this.loadDataForCurrentPanels();

    // Schedule periodic refreshes
    this.scheduleRefreshes();
  }

  // ── Panel creation from topic config ──────────────────────────────

  private createPanel(slot: PanelSlot): Panel {
    const title = slot.title;
    switch (slot.type) {
      case 'fire-hotspot': {
        const p = new FireHotspotPanel();
        p.setOnDaysChange((days) => { this.firmsDays = days; void this.loadFireData(); });
        this.fireHotspotPanel = p;
        return p;
      }
      case 'weather': {
        const p = new WeatherPanel();
        this.weatherPanel = p;
        return p;
      }
      case 'feed': {
        const p = new FeedPanel();
        this.feedPanel = p;
        return p;
      }
      case 'alert': {
        const p = new AlertPanel();
        this.alertPanel = p;
        return p;
      }
      case 'data-status': {
        const p = new DataStatusPanel();
        this.dataStatusPanel = p;
        return p;
      }
      case 'satellite': {
        const p = new SatellitePanel();
        p.onGroupChange = (group: string) => { this.satGroup = group; void this.loadSatelliteData(); };
        p.onItemClick = (satellite) => {
          this.layout?.mapContainer.trackSatellite(satellite);
        };
        this.satellitePanel = p;
        return p;
      }
      case 'flight': {
        const p = new FlightPanel();
        p.onItemClick = (flight) => {
          this.layout?.mapContainer.trackFlight(flight);
        };
        this.flightPanel = p;
        return p;
      }
      case 'youtube': {
        const p = new YouTubePanel();
        p.onQueryChange = (query: string) => { this.ytQuery = query; void this.loadYouTubeData(); };
        this.youtubePanel = p;
        return p;
      }
      case 'ai-brief': {
        const p = new AiBriefPanel();
        this.aiBriefPanel = p;
        return p;
      }
      case 'stock-ticker': {
        const config = slot.config as { market?: string; indices?: string[] } | undefined;
        const p = new StockTickerPanel(title, config);
        this.stockTickerPanel = p;
        return p;
      }
      case 'stock-sectors': {
        const config = slot.config as { market?: string } | undefined;
        const p = new StockSectorsPanel(title, config);
        this.stockSectorsPanel = p;
        return p;
      }
      case 'oil-price': {
        const p = new OilPricePanel(title);
        this.oilPricePanel = p;
        return p;
      }
      case 'conflict-timeline': {
        const p = new ConflictTimelinePanel(title);
        this.conflictTimelinePanel = p;
        return p;
      }
      case 'agent-news': {
        const p = new AgentNewsPanel(title);
        this.agentNewsPanel = p;
        return p;
      }
      case 'situation-summary': {
        const p = new SituationSummaryPanel();
        p.setTopicId(this.topicManager.getActiveTopic().id);
        this.situationSummaryPanel = p;
        return p;
      }
      case 'timeline-chart': {
        const p = new TimelineChartPanel();
        p.setTopicId(this.topicManager.getActiveTopic().id);
        return p;
      }
      case 'fire-stats': {
        const p = new FireStatsPanel();
        this.fireStatsPanel = p;
        return p;
      }
      case 'predict': {
        const p = new PredictPanel();
        this.predictPanel = p;
        return p;
      }
      case 'sentiment-positive': {
        return new SentimentPanel('positive');
      }
      case 'sentiment-negative': {
        return new SentimentPanel('negative');
      }
      case 'platform-news':
      case 'platform-youtube':
      case 'platform-twitter':
      case 'platform-instagram':
      case 'platform-facebook':
      case 'platform-threads':
      case 'platform-tiktok': {
        const platform = slot.type.replace('platform-', '') as import('@/types').AgentNewsPlatform;
        const p = new PlatformFeedPanel(platform, title);
        const t = this.topicManager.getActiveTopic();
        p.setTopicKeywords(t.aiBriefing.focusKeywords || []);
        this.platformPanels.push(p);
        return p;
      }
      default: {
        // Generic panel with title for unknown types
        const p = new Panel({ id: `generic-${slot.type}`, title: title || slot.type });
        p.setContent(slot.type);
        return p;
      }
    }
  }

  private clearPanelRefs(): void {
    this.fireHotspotPanel = null;
    this.weatherPanel = null;
    this.feedPanel = null;
    this.alertPanel = null;
    this.dataStatusPanel = null;
    this.satellitePanel = null;
    this.flightPanel = null;
    this.youtubePanel = null;
    this.aiBriefPanel = null;
    this.stockTickerPanel = null;
    this.stockSectorsPanel = null;
    this.oilPricePanel = null;
    this.conflictTimelinePanel = null;
    this.agentNewsPanel = null;
    this.platformPanels = [];
    this.situationSummaryPanel = null;
    this.fireStatsPanel = null;
    if (this.predictPanel) {
      this.predictPanel.stopAutoGenerate();
      this.predictPanel = null;
    }
    if (this.agentNewsWatcher) {
      this.agentNewsWatcher.stop();
      this.agentNewsWatcher = null;
    }
  }

  private destroyActivePanels(): void {
    for (const p of this.activePanels) {
      p.destroy();
    }
    this.activePanels = [];
    this.clearPanelRefs();
  }

  private buildPanels(topic: TopicConfig): void {
    if (!this.layout) return;

    // Destroy existing panels
    this.destroyActivePanels();

    // Clear panel containers
    this.layout.panelsLeft.replaceChildren();
    this.layout.panelsRight.replaceChildren();
    this.layout.panelsBottom.replaceChildren();

    const mount = (container: HTMLElement, slots: PanelSlot[]) => {
      for (const slot of slots) {
        const panel = this.createPanel(slot);
        this.activePanels.push(panel);
        container.appendChild(panel.getElement());
      }
    };

    mount(this.layout.panelsLeft, topic.panels.left);
    mount(this.layout.panelsRight, topic.panels.right);
    mount(this.layout.panelsBottom, topic.panels.bottom);

  }

  // ── Topic change ──────────────────────────────────────────────────

  private async applyTopicChange(topic: TopicConfig): Promise<void> {
    // Update TopicSelector UI
    this.topicSelector?.update(this.topicManager.getAllTopics(), topic);

    // Update YouTube query
    this.ytQuery = topic.youtube.liveSearchQuery || this.ytQuery;

    // Fly map to new topic center
    if (this.layout) {
      this.layout.mapContainer.flyTo(topic.map.center, topic.map.zoom, topic.map.globeAltitude);
      if (Object.keys(topic.layers).length > 0) {
        this.layout.mapContainer.getLayerToggle().resetLayers(topic.layers);
      }
      this.layout.mapContainer.setTopicMarkers(topic.map.markers ?? []);
    }

    // Reset state
    this.previousFires = [];
    if (this.fireHighlightTimer) {
      clearInterval(this.fireHighlightTimer);
      this.fireHighlightTimer = null;
    }

    // Reload briefing timeline for new topic
    this.loadBriefingTimeline(topic);

    // Clear channel popups from previous topic
    this.layout?.mapContainer.setChannelPopups([], topic.map.center);

    // Rebuild panels for new topic
    this.buildPanels(topic);

    // Clear Korea-only data when switching to non-Korea topic
    if (!this.isKoreaTopic()) {
      this.layout?.mapContainer.setWeather([]);
      this.layout?.mapContainer.setDwi([]);
      this.layout?.mapContainer.setCctvs([]);
    }

    // Clear & reschedule refreshes
    this.refreshScheduler.destroy();
    this.refreshScheduler.init();

    // Load data for new panels
    await this.loadDataForCurrentPanels();
    this.scheduleRefreshes();
  }

  // ── Topic geography helper ────────────────────────────────────────

  /** Check if the current topic is centered on the Korean peninsula */
  private isKoreaTopic(): boolean {
    const topic = this.topicManager.getActiveTopic();
    const { lat, lng } = topic.map.center;
    // Korea is roughly lat 33-43, lng 124-132
    return lat >= 30 && lat <= 45 && lng >= 120 && lng <= 135;
  }

  // ── Data loading (conditional on active panels) ───────────────────

  private async loadDataForCurrentPanels(): Promise<void> {
    const loads: Promise<void>[] = [];

    if (this.fireHotspotPanel) loads.push(this.loadFireData());
    if (this.weatherPanel && this.isKoreaTopic()) loads.push(this.loadWeatherData().then(() => this.loadDwiData()));
    if (this.feedPanel) loads.push(this.loadFeedData());
    if (this.satellitePanel) loads.push(this.loadSatelliteData());
    if (this.flightPanel) loads.push(this.loadFlightData());
    if (this.youtubePanel) loads.push(this.loadYouTubeData());
    if (this.stockTickerPanel || this.stockSectorsPanel || this.oilPricePanel) {
      loads.push(this.loadMarketData());
    }
    if (this.conflictTimelinePanel) loads.push(this.loadConflictTimeline());
    if (this.agentNewsPanel || this.platformPanels.length > 0 || this.situationSummaryPanel || this.predictPanel) this.startAgentNewsWatcher();
    if (this.predictPanel) {
      const topic = this.topicManager.getActiveTopic();
      this.predictPanel.setTopicName(topic.name);
      this.predictPanel.setTopicId(topic.id);
      this.predictPanel.startAutoGenerate();
    }

    // Only load Korea-specific data sources when topic is centered on Korea
    if (this.isKoreaTopic()) {
      loads.push(this.loadCctvData());
    }

    await Promise.allSettled(loads);
  }

  private scheduleRefreshes(): void {
    if (this.fireHotspotPanel) {
      this.refreshScheduler.schedule('firms', () => this.loadFireData(), REFRESH_INTERVALS.firms);
    }
    if (this.weatherPanel && this.isKoreaTopic()) {
      this.refreshScheduler.schedule('weather', () => this.loadWeatherData(), REFRESH_INTERVALS.weather);
    }
    if (this.feedPanel) {
      this.refreshScheduler.schedule('feeds', () => this.loadFeedData(), REFRESH_INTERVALS.feeds);
    }
    // DWI is a map overlay - schedule if weather panel exists and topic is Korea
    if (this.weatherPanel && this.isKoreaTopic()) {
      this.refreshScheduler.schedule('dwi', () => this.loadDwiData(), REFRESH_INTERVALS.dwi);
    }
    if (this.satellitePanel) {
      this.refreshScheduler.schedule('satellites', () => this.loadSatelliteData(), REFRESH_INTERVALS.satellites);
    }
    if (this.flightPanel) {
      this.refreshScheduler.schedule('flights', () => this.loadFlightData(), REFRESH_INTERVALS.flights);
    }
    if (this.youtubePanel) {
      this.refreshScheduler.schedule('youtube', () => this.loadYouTubeData(), REFRESH_INTERVALS.youtube);
    }
    if (this.stockTickerPanel || this.stockSectorsPanel || this.oilPricePanel) {
      this.refreshScheduler.schedule('market', () => this.loadMarketData(), 60_000);
    }
    if (this.conflictTimelinePanel) {
      this.refreshScheduler.schedule('conflict', () => this.loadConflictTimeline(), REFRESH_INTERVALS.feeds);
    }
    // CCTV is a Korea-only map overlay
    if (this.isKoreaTopic()) {
      this.refreshScheduler.schedule('cctv', () => this.loadCctvData(), REFRESH_INTERVALS.weather);
    }
  }

  private showTopicEditorModal(existingTopic: TopicConfig | null): void {
    const modal = new TopicEditorModal({
      existingTopic: existingTopic ?? undefined,
      onSave: (topic) => {
        this.topicManager.saveCustomTopic(topic);
        this.topicSelector?.update(this.topicManager.getAllTopics(), this.topicManager.getActiveTopic());
        modal.destroy();
        void this.topicManager.switchTopic(topic.id);
      },
      onCancel: () => modal.destroy(),
    });
    document.body.appendChild(modal.getElement());
  }

  // ── Status bar ────────────────────────────────────────────────────

  private updateStatusBar(): void {
    if (!this.statusBar) return;
    this.statusBar.update({
      fireCount: this.previousFires.length,
      firmsRefreshedAt: this.firmsRefreshedAt,
      weatherRefreshedAt: this.weatherRefreshedAt,
      feedsRefreshedAt: this.feedsRefreshedAt,
    });
  }

  // ── Data loaders ──────────────────────────────────────────────────

  private async loadFireData(): Promise<void> {
    if (!this.layout || !this.fireHotspotPanel) return;
    this.fireHotspotPanel.showLoading();
    try {
      const topic = this.topicManager.getActiveTopic();
      const isLocalTopic = topic.id === 'korea-forest' || topic.id === 'daejeon-fire';
      const fires = await fetchFireHotspots(this.firmsDays, topic.map.dataCenter || topic.map.center, isLocalTopic ? 2 : 5);
      const stats = computeRegionStats(fires);
      this.layout.mapContainer.setFires(fires);
      this.fireHotspotPanel.update(stats, fires.length);
      // Filter alerts to topic-relevant regions
      const alertFires = topic.id === 'daejeon-fire'
        ? fires.filter(f => f.region && /대전|충남|충북|세종|충청/.test(f.region))
        : fires;
      this.alertPanel?.updateFromFires(alertFires);
      if (this.previousFires.length > 0) {
        await checkAndSendAlerts(fires, this.previousFires);
      }
      this.previousFires = fires;
      this.firmsRefreshedAt = new Date().toISOString();
      this.updateStatusBar();
      this.dataStatusPanel?.updateStatus({ fires: fires.length });
      this.startFireHighlightCycle();
    } catch (err) {
      console.error('[App] Failed to load fire data:', err);
      this.fireHotspotPanel.showError();
    }
  }

  private async loadWeatherData(): Promise<void> {
    if (!this.layout || !this.weatherPanel) return;
    if (!this.isKoreaTopic()) {
      this.weatherPanel.setContent('현재 주제 지역에는 기상 데이터가 없습니다.');
      return;
    }
    this.weatherPanel.showLoading();
    try {
      const stations = await fetchWeatherData();
      // Sort weather stations by proximity to topic center
      const tc = this.topicManager.getActiveTopic().map.center;
      stations.sort((a, b) => {
        const da = (a.lat - tc.lat) ** 2 + (a.lng - tc.lng) ** 2;
        const db = (b.lat - tc.lat) ** 2 + (b.lng - tc.lng) ** 2;
        return da - db;
      });
      this.layout.mapContainer.setWeather(stations);
      this.weatherPanel.update(stations);
      this.weatherRefreshedAt = new Date().toISOString();
      this.updateStatusBar();
      this.dataStatusPanel?.updateStatus({ weather: stations.length });
    } catch (err) {
      console.error('[App] Failed to load weather data:', err);
      this.weatherPanel.showError();
    }
  }

  private async loadDwiData(): Promise<void> {
    if (!this.layout) return;
    try {
      const cells = await fetchDwiData();
      this.layout.mapContainer.setDwi(cells);
    } catch (err) {
      console.error('[App] Failed to load DWI data:', err);
    }
  }

  private async loadFeedData(): Promise<void> {
    if (!this.feedPanel) return;
    const gen = this.topicManager.getGeneration();
    this.feedPanel.showLoading();
    try {
      const topic = this.topicManager.getActiveTopic();
      const items = topic.feeds.length > 0
        ? await fetchFeedsForTopic(topic.feeds)
        : await fetchFeeds();
      if (!this.topicManager.isCurrentGeneration(gen)) return;
      this.feedPanel.update(items);
      const isFirstLoad = !this.feedsRefreshedAt;
      this.aiBriefPanel?.setItems(items, isFirstLoad);
      this.feedsRefreshedAt = new Date().toISOString();
      this.updateStatusBar();
      this.dataStatusPanel?.updateStatus({ feeds: items.length });
    } catch (err) {
      if (!this.topicManager.isCurrentGeneration(gen)) return;
      console.error('[App] Failed to load feed data:', err);
      this.feedPanel.showError();
    }
  }

  private async loadSatelliteData(): Promise<void> {
    if (!this.satellitePanel) return;
    this.satellitePanel.showLoading();
    try {
      const sats = await fetchSatellites(this.satGroup);
      this.satellitePanel.update(sats);
      this.layout?.mapContainer.setSatellites(sats);
      this.dataStatusPanel?.updateStatus({ satellites: sats.length });
    } catch (err) {
      console.error('[App] Failed to load satellite data:', err);
      this.satellitePanel.showError();
    }
  }

  private async loadFlightData(): Promise<void> {
    if (!this.flightPanel) return;
    this.flightPanel.showLoading();
    try {
      const topic = this.topicManager.getActiveTopic();
      const isLocalFlight = topic.id === 'korea-forest' || topic.id === 'daejeon-fire';
      const flights = await fetchFlights(topic.map.dataCenter || topic.map.center, isLocalFlight ? 2 : 5);
      this.flightPanel.update(flights);
      this.layout?.mapContainer.setFlights(flights);
      this.dataStatusPanel?.updateStatus({ flights: flights.length });
    } catch (err) {
      console.error('[App] Failed to load flight data:', err);
      this.flightPanel.showError();
    }
  }

  private async loadYouTubeData(): Promise<void> {
    if (!this.youtubePanel) return;
    const gen = this.topicManager.getGeneration();
    this.youtubePanel.showLoading();
    try {
      const { videos, searches } = await fetchYouTubeVideos(this.ytQuery);
      if (!this.topicManager.isCurrentGeneration(gen)) return;
      this.youtubePanel.update(videos, searches);
      this.dataStatusPanel?.updateStatus({ youtube: videos.length });
    } catch (err) {
      if (!this.topicManager.isCurrentGeneration(gen)) return;
      console.error('[App] Failed to load YouTube data:', err);
      this.youtubePanel.showError();
    }
  }

  private async loadCctvData(): Promise<void> {
    if (!this.isKoreaTopic()) return;
    try {
      const cctvs = await fetchCctvs();
      this.layout?.mapContainer.setCctvs(cctvs);
      this.dataStatusPanel?.updateStatus({ cctvs: cctvs.length });
    } catch (err) {
      console.error('[App] Failed to load CCTV data:', err);
    }
  }

  private async loadMarketData(): Promise<void> {
    const allSymbols: string[] = [];
    if (this.stockTickerPanel) allSymbols.push(...this.stockTickerPanel.getSymbols());
    if (this.stockSectorsPanel) allSymbols.push(...this.stockSectorsPanel.getSectorSymbols());
    if (this.oilPricePanel) allSymbols.push(...OilPricePanel.getSymbols());
    if (allSymbols.length === 0) return;

    this.stockTickerPanel?.showLoading();
    this.stockSectorsPanel?.showLoading();
    this.oilPricePanel?.showLoading();

    try {
      const unique = [...new Set(allSymbols)];
      const quotes = await fetchMarketQuotes(unique);

      if (this.stockTickerPanel) {
        const tickerSymbols = this.stockTickerPanel.getSymbols();
        this.stockTickerPanel.update(quotes.filter(q => tickerSymbols.includes(q.symbol)));
      }
      if (this.stockSectorsPanel) {
        const sectorSymbols = this.stockSectorsPanel.getSectorSymbols();
        this.stockSectorsPanel.update(quotes.filter(q => sectorSymbols.includes(q.symbol)));
      }
      if (this.oilPricePanel) {
        const oilSymbols = OilPricePanel.getSymbols();
        this.oilPricePanel.update(quotes.filter(q => oilSymbols.includes(q.symbol)));
      }
    } catch (err) {
      console.error('[App] Failed to load market data:', err);
      this.stockTickerPanel?.showError();
      this.stockSectorsPanel?.showError();
      this.oilPricePanel?.showError();
    }
  }

  private async loadConflictTimeline(): Promise<void> {
    if (!this.conflictTimelinePanel) return;
    this.conflictTimelinePanel.showLoading();
    try {
      const topic = this.topicManager.getActiveTopic();
      const items = topic.feeds.length > 0
        ? await fetchFeedsForTopic(topic.feeds)
        : await fetchFeeds();
      this.conflictTimelinePanel.update(items);
    } catch (err) {
      console.error('[App] Failed to load conflict timeline:', err);
      this.conflictTimelinePanel.showError();
    }
  }

  private startAgentNewsWatcher(): void {
    if (this.agentNewsWatcher) {
      this.agentNewsWatcher.stop();
    }
    const topic = this.topicManager.getActiveTopic();
    setAgentNewsTopic(topic.id);
    const interval = topic.refreshIntervals?.agentNews ?? 10_000;
    this.agentNewsWatcher = new AgentNewsWatcher();
    this.agentNewsWatcher.start((data) => {
      this.agentNewsPanel?.update(data);
      // Distribute to platform-specific panels
      for (const pp of this.platformPanels) {
        pp.update(data.items);
      }
      this.situationSummaryPanel?.update(data.summary);
      this.fireStatsPanel?.update(data.summary);
      this.predictPanel?.update(data.summary, data.items);
      // Update sentiment panels
      for (const p of this.activePanels) {
        if (p instanceof SentimentPanel) (p as SentimentPanel).update(data.items);
      }
      // Update live stream panel
      this.liveStreamPanel?.update(data.items);
      // Update status bar + header stats
      this.feedsRefreshedAt = new Date().toISOString();
      this.updateStatusBar();
      if (this.layout) {
        const videoCount = data.items.filter(i => i.platform === 'youtube').length;
        // Extract stats dynamically from summary (works for any topic)
        const cas = data.summary.casualties;
        const sit = data.summary.situation;
        const es = data.summary.eventStats;
        this.layout.header.updateStats({
          casualties: es?.currentAttendees ? `\uCC38\uAC00 ${es.currentAttendees}` : (cas && cas !== '\uD655\uC778 \uC911' && cas.match(/\d+/) ? cas.split(',')[0]! : undefined),
          missing: es?.trending ? es.trending : (cas?.match(/\uC2E4\uC885\s*(\d+)/)?.[1] ? `\uC2E4\uC885 ${cas.match(/\uC2E4\uC885\s*(\d+)/)?.[1]}\uBA85` : undefined),
          progress: sit?.includes('\uC644\uC804 \uC9C4\uC555') || sit?.includes('\uC9C4\uD654 \uC644\uB8CC') ? '100%' : sit?.match(/(\d+)%/) ? `${sit.match(/(\d+)%/)?.[1]}%` : undefined,
          newsCount: data.items.filter(i => i.platform === 'news').length,
          videoCount: videoCount > 0 ? videoCount : undefined,
        });
      }
      // Show channel popups on the map
      if (this.layout && data.items.length > 0) {
        const center = topic.map.center;
        this.layout.mapContainer.setChannelPopups(data.items, center);
      }
    }, interval);
  }

  private loadBriefingTimeline(topic: TopicConfig): void {
    fetch(`/data/${topic.id}/briefing-timeline.json?t=${Date.now()}`)
      .then(r => r.ok ? r.json() : [])
      .then((events: Array<{ time: string; title: string; detail: string; severity: string; lat: number; lng: number }>) => {
        this.layout?.mapContainer.setBriefingTimeline(events);
      })
      .catch(() => { /* no timeline data */ });
  }

  private startFireHighlightCycle(): void {
    if (this.fireHighlightTimer) clearInterval(this.fireHighlightTimer);
    if (this.previousFires.length === 0) return;
    const highFires = this.previousFires.filter(f => f.confidence === 'high');
    const targets = highFires.length > 0 ? highFires : this.previousFires;
    this.fireHighlightIndex = 0;
    this.fireHighlightTimer = setInterval(() => {
      if (targets.length === 0) return;
      const fire = targets[this.fireHighlightIndex % targets.length]!;
      this.layout?.mapContainer.highlightFire(fire);
      this.fireHighlightIndex++;
    }, 15_000);
    if (targets.length > 0) {
      this.layout?.mapContainer.highlightFire(targets[0]!);
    }
  }

  destroy(): void {
    if (this.fireHighlightTimer) clearInterval(this.fireHighlightTimer);
    if (this.agentNewsWatcher) {
      this.agentNewsWatcher.stop();
      this.agentNewsWatcher = null;
    }
    this.refreshScheduler.destroy();
    this.dataLoader.destroy();
    this.panelLayout.destroy();
    this.destroyActivePanels();
    if (this.topicSelector) {
      this.topicSelector.destroy();
      this.topicSelector = null;
    }
    if (this.layout) {
      this.layout.destroy();
      this.layout = null;
    }
    if (this.statusBar) {
      this.statusBar.destroy();
      this.statusBar = null;
    }
  }
}
