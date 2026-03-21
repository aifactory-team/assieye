import { h } from '@/utils/dom-utils';
import { DEFAULT_MAP_LAYERS } from '@/config/map-layers';
import { getMapMode, setMapMode } from '@/services/map-state';
import type { MapMode } from '@/services/map-state';
import type { FireHotspot, WeatherStation, DwiCell, MapLayers, AgentNewsItem } from '@/types';
import type { TopicMarker } from '@/config/topics/types';
import type { Flight } from '@/services/flights';
import type { Satellite } from '@/services/satellites';
import type { CctvCamera } from '@/services/cctv';
import { GlobeMap } from './GlobeMap';
import { FlatMap } from './FlatMap';
import { MapToolbar } from './MapToolbar';
import { LayerToggle } from './LayerToggle';
import { DwiLegend } from './DwiLegend';

export class MapContainer {
  private readonly el: HTMLElement;
  private readonly mapEl: HTMLElement;
  private activeMode: MapMode;
  private globeMap: GlobeMap | null = null;
  private flatMap: FlatMap | null = null;
  private toolbar: MapToolbar;
  private layerToggle: LayerToggle;
  private dwiLegend: DwiLegend;
  private layers: MapLayers;

  // Pending flyTo for when map isn't ready yet
  private pendingFlyTo: { center: { lat: number; lng: number }; zoom: number; globeAltitude: number } | null = null;
  private pendingMarkers: TopicMarker[] | null = null;
  private pendingChannelPopups: { items: AgentNewsItem[]; center: { lat: number; lng: number } } | null = null;

  // Cached data for switching views
  private fires: FireHotspot[] = [];
  private weather: WeatherStation[] = [];
  private dwi: DwiCell[] = [];
  private flights: Flight[] = [];
  private satellites: Satellite[] = [];
  private cctvs: CctvCamera[] = [];

  constructor() {
    this.activeMode = getMapMode();
    this.layers = { ...DEFAULT_MAP_LAYERS };

    this.mapEl = h('div', { className: 'map-render-target' });
    this.mapEl.style.width = '100%';
    this.mapEl.style.height = '100%';

    this.toolbar = new MapToolbar({
      activeMode: this.activeMode,
      onToggle: (mode) => this.switchMode(mode),
    });

    this.layerToggle = new LayerToggle({
      layers: this.layers,
      onLayerChange: (layers) => {
        this.layers = layers;
        this.applyDataToActiveMap();
        if (layers.dwi) this.dwiLegend.show(); else this.dwiLegend.hide();
      },
    });

    this.dwiLegend = new DwiLegend();

    this.el = h(
      'div',
      { className: 'map-container' },
      this.mapEl,
    );

    // Defer map creation to allow DOM attachment
    requestAnimationFrame(() => this.createActiveMap());
  }

  private createActiveMap(): void {
    try {
      if (this.activeMode === 'globe') {
        this.globeMap = new GlobeMap(this.mapEl);
      } else {
        const initCenter = this.pendingFlyTo?.center;
        const initZoom = this.pendingFlyTo?.zoom;
        this.flatMap = new FlatMap(this.mapEl, initCenter, initZoom);
      }
    } catch (err) {
      console.error('[MapContainer] Failed to create map:', err);
      return;
    }
    this.applyDataToActiveMap();
    // Apply any pending flyTo that was queued before map was ready
    if (this.pendingFlyTo) {
      const { center, zoom, globeAltitude } = this.pendingFlyTo;
      this.pendingFlyTo = null;
      this.flyTo(center, zoom, globeAltitude);
    }
    if (this.pendingMarkers) {
      this.setTopicMarkers(this.pendingMarkers);
      this.pendingMarkers = null;
    }
    if (this.pendingChannelPopups) {
      const { items, center } = this.pendingChannelPopups;
      this.pendingChannelPopups = null;
      this.setChannelPopups(items, center);
    }
    if (this.pendingTimeline) {
      this.setBriefingTimeline(this.pendingTimeline);
      this.pendingTimeline = null;
    }
  }

  private destroyActiveMap(): void {
    if (this.globeMap) {
      this.globeMap.destroy();
      this.globeMap = null;
    }
    if (this.flatMap) {
      this.flatMap.destroy();
      this.flatMap = null;
    }
  }

  private switchMode(mode: MapMode): void {
    if (mode === this.activeMode) return;
    this.destroyActiveMap();
    this.activeMode = mode;
    setMapMode(mode);
    this.createActiveMap();
  }

  private applyDataToActiveMap(): void {
    const map = this.globeMap ?? this.flatMap;
    if (!map) return;

    if (this.layers.fires) {
      map.setFires(this.fires);
    } else {
      map.setFires([]);
    }

    map.setWeather(this.layers.weather ? this.weather : []);
    map.setDwi(this.layers.dwi ? this.dwi : []);
    map.setFlights(this.layers.flights ? this.flights : []);
    map.setSatellites(this.layers.satellites ? this.satellites : []);
    map.setCctvs(this.layers.cctv ? this.cctvs : []);

    if (this.flatMap) {
      this.flatMap.setBuildings(this.layers.buildings);
    }
  }

  setFires(fires: FireHotspot[]): void {
    this.fires = fires;
    this.applyDataToActiveMap();
  }

  setWeather(stations: WeatherStation[]): void {
    this.weather = stations;
    this.applyDataToActiveMap();
  }

  setDwi(cells: DwiCell[]): void {
    this.dwi = cells;
    this.applyDataToActiveMap();
  }

  setFlights(flights: Flight[]): void {
    this.flights = flights;
    this.applyDataToActiveMap();
  }

  setSatellites(satellites: Satellite[]): void {
    this.satellites = satellites;
    this.applyDataToActiveMap();
  }

  setCctvs(cctvs: CctvCamera[]): void {
    this.cctvs = cctvs;
    this.applyDataToActiveMap();
  }

  highlightFire(fire: FireHotspot): void {
    const map = this.globeMap ?? this.flatMap;
    if (map) map.showFirePopup(fire);
  }

  flyTo(center: { lat: number; lng: number }, zoom: number, globeAltitude: number): void {
    if (!this.flatMap && !this.globeMap) {
      // Map not created yet - queue for after creation
      this.pendingFlyTo = { center, zoom, globeAltitude };
      return;
    }
    if (this.flatMap) {
      this.flatMap.flyTo(center, zoom);
    }
    if (this.globeMap) {
      this.globeMap.flyTo(center, globeAltitude);
    }
  }

  trackFlight(flight: Flight | null): void {
    if (this.flatMap) this.flatMap.trackFlight(flight);
    if (this.globeMap) this.globeMap.trackFlight(flight);
  }

  trackSatellite(satellite: Satellite | null): void {
    if (this.flatMap) this.flatMap.trackSatellite(satellite);
    if (this.globeMap) this.globeMap.trackSatellite(satellite);
  }

  stopTracking(): void {
    if (this.flatMap) this.flatMap.stopTracking();
    if (this.globeMap) this.globeMap.stopTracking();
  }

  setTopicMarkers(markers: TopicMarker[]): void {
    if (this.flatMap) {
      this.flatMap.setTopicMarkers(markers);
    } else {
      this.pendingMarkers = markers;
    }
  }

  private pendingTimeline: Array<{ time: string; title: string; detail: string; severity: string; lat: number; lng: number }> | null = null;

  setBriefingTimeline(events: Array<{ time: string; title: string; detail: string; severity: string; lat: number; lng: number }>): void {
    if (this.flatMap) {
      this.flatMap.setBriefingTimeline(events);
    } else {
      this.pendingTimeline = events;
    }
  }

  setChannelPopups(items: AgentNewsItem[], center: { lat: number; lng: number }): void {
    if (this.flatMap) {
      this.flatMap.setChannelPopups(items, center);
    } else {
      this.pendingChannelPopups = { items, center };
    }
  }

  getLayerToggle(): LayerToggle {
    return this.layerToggle;
  }

  getElement(): HTMLElement {
    return this.el;
  }

  destroy(): void {
    this.destroyActiveMap();
    this.toolbar.destroy();
    this.layerToggle.destroy();
    this.el.remove();
  }
}
