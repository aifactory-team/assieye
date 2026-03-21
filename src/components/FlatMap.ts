import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { ScatterplotLayer, PathLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { KOREA_CENTER, FLAT_MAP_ZOOM } from '@/config/constants';
import type { FireHotspot, WeatherStation, DwiCell, AgentNewsItem } from '@/types';
import type { TopicMarker } from '@/config/topics/types';
import type { Flight } from '@/services/flights';
import type { Satellite } from '@/services/satellites';
import type { CctvCamera } from '@/services/cctv';

const DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const WATER_COLOR = '#0a1a2e';
const LAND_COLOR = '#1a2a1a';
const BOUNDARY_COLOR = '#4a7a4a';
const DEG2RAD = Math.PI / 180;

/** Raster tile fallback when CARTO vector tiles are blocked */
const FALLBACK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  name: 'fallback-dark',
  sources: {
    'carto-dark': {
      type: 'raster',
      tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png', 'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'],
      tileSize: 256,
      maxzoom: 18,
    },
  },
  layers: [{ id: 'carto-dark-layer', type: 'raster', source: 'carto-dark' }],
};


export class FlatMap {
  private readonly container: HTMLElement;
  private map: maplibregl.Map | null = null;
  private overlay: MapboxOverlay | null = null;
  private fires: FireHotspot[] = [];
  private weather: WeatherStation[] = [];
  private dwi: DwiCell[] = [];
  private flights: Flight[] = [];
  private satellites: Satellite[] = [];
  private cctvs: CctvCamera[] = [];
  private activePopup: maplibregl.Popup | null = null;
  private trackingPopup: maplibregl.Popup | null = null;
  private trackedFlight: Flight | null = null;
  private trackedSatellite: Satellite | null = null;
  private lastTrackPanTime = 0;
  private animationFrame: number | null = null;
  private animationTime = 0;
  private pendingFlyTo: { center: { lat: number; lng: number }; zoom: number } | null = null;
  private pendingTopicMarkers: TopicMarker[] | null = null;
  private topicMarkers: maplibregl.Marker[] = [];
  private channelPopups: maplibregl.Popup[] = [];

  private initialCenter: { lat: number; lng: number } | null = null;
  private initialZoom: number | null = null;

  constructor(container: HTMLElement, initialCenter?: { lat: number; lng: number }, initialZoom?: number) {
    this.container = container;
    if (initialCenter) this.initialCenter = initialCenter;
    if (initialZoom != null) this.initialZoom = initialZoom;
    this.init();
  }

  private init(): void {
    // Probe vector tile availability, then create map with appropriate style
    this.probeAndCreateMap();
  }

  private probeAndCreateMap(): void {
    const testUrl = 'https://tiles.basemaps.cartocdn.com/vector/carto.streets/v1/0/0/0.pbf';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    fetch(testUrl, { method: 'HEAD', signal: controller.signal, mode: 'cors' })
      .then(r => {
        clearTimeout(timeout);
        this.createMap(r.ok ? DARK_STYLE : FALLBACK_STYLE);
      })
      .catch(() => {
        clearTimeout(timeout);
        console.warn('[FlatMap] Vector tiles unreachable, using raster fallback');
        this.createMap(FALLBACK_STYLE);
      });
  }

  private createMap(style: string | maplibregl.StyleSpecification): void {
    const startCenter = this.initialCenter || KOREA_CENTER;
    const startZoom = this.initialZoom ?? FLAT_MAP_ZOOM;
    this.map = new maplibregl.Map({
      container: this.container,
      style,
      center: [startCenter.lng, startCenter.lat],
      zoom: startZoom,
      attributionControl: false,
    });

    this.overlay = new MapboxOverlay({
      interleaved: false,
      layers: [],
    });

    this.map.addControl(this.overlay as unknown as maplibregl.IControl);
    this.map.addControl(new maplibregl.NavigationControl(), 'bottom-right');

    this.map.on('load', () => {
      this.enhanceMapVisibility();
      this.add3dBuildingsLayer();
      if (this.pendingFlyTo) {
        const { center, zoom } = this.pendingFlyTo;
        this.pendingFlyTo = null;
        this.map!.flyTo({ center: [center.lng, center.lat], zoom, duration: 2000 });
      }
      if (this.pendingTopicMarkers) {
        this.setTopicMarkers(this.pendingTopicMarkers);
        this.pendingTopicMarkers = null;
      }
      if (this.pendingTimeline) {
        this.setBriefingTimeline(this.pendingTimeline);
        this.pendingTimeline = null;
      }
      if (this.pendingChannelPopups) {
        const { items, center } = this.pendingChannelPopups;
        this.pendingChannelPopups = null;
        this.setChannelPopups(items, center);
      }
    });

    this.startAnimation();
  }

  /** Brighten map layers so land/water/coastlines are visible on dark theme */
  private enhanceMapVisibility(): void {
    if (!this.map) return;

    // Exact CARTO dark-matter layer IDs with safe paint properties
    const tweaks: Array<[string, string, unknown]> = [
      ['background', 'background-color', '#0d1a0d'],
      ['water', 'fill-color', WATER_COLOR],
      ['water_shadow', 'fill-color', '#081828'],
      ['landcover', 'fill-color', LAND_COLOR],
      ['landuse', 'fill-color', '#1a2a1a'],
      ['waterway', 'line-color', '#0e2040'],
      ['boundary_state', 'line-color', BOUNDARY_COLOR],
      ['boundary_country_inner', 'line-color', '#4a7a4a'],
      ['boundary_country_outline', 'line-color', '#4a7a4a'],
      ['boundary_county', 'line-color', '#2a4a2a'],
    ];

    for (const [layerId, prop, value] of tweaks) {
      try {
        if (this.map.getLayer(layerId)) {
          this.map.setPaintProperty(layerId, prop, value);
        }
      } catch {
        // Layer may not support this property
      }
    }
  }

  private startAnimation(): void {
    const animate = () => {
      this.animationTime = performance.now();
      this.updateLayers();
      this.updateTracking();
      this.animationFrame = requestAnimationFrame(animate);
    };
    this.animationFrame = requestAnimationFrame(animate);
  }

  private dismissPopup(): void {
    if (this.activePopup) {
      this.activePopup.remove();
      this.activePopup = null;
    }
  }

  private dismissTrackingPopup(): void {
    if (this.trackingPopup) {
      this.trackingPopup.remove();
      this.trackingPopup = null;
    }
  }

  private showTrackingPopup(lng: number, lat: number, name: string): void {
    if (!this.map) return;
    this.dismissTrackingPopup();
    this.trackingPopup = new maplibregl.Popup({
      closeOnClick: false,
      closeButton: false,
      maxWidth: '200px',
      anchor: 'bottom',
      offset: [0, -10],
    })
      .setLngLat([lng, lat])
      .setHTML(`<div class="map-popup" style="background:rgba(0,0,0,0.7);padding:4px 8px;font-size:12px;white-space:nowrap;">추적 중: <b>${name}</b></div>`)
      .addTo(this.map);
  }

  trackFlight(flight: Flight | null): void {
    this.trackedSatellite = null;
    this.trackedFlight = flight;
    this.dismissTrackingPopup();
    if (flight && this.map) {
      this.map.flyTo({ center: [flight.lng, flight.lat], zoom: 8, duration: 1500 });
      this.showTrackingPopup(flight.lng, flight.lat, flight.callsign || flight.icao24);
    }
  }

  trackSatellite(satellite: Satellite | null): void {
    this.trackedFlight = null;
    this.trackedSatellite = satellite;
    this.dismissTrackingPopup();
    if (satellite && this.map) {
      const pos = FlatMap.satPosition(satellite);
      this.map.flyTo({ center: [pos.lng, pos.lat], zoom: 4, duration: 1500 });
      this.showTrackingPopup(pos.lng, pos.lat, satellite.name);
    }
  }

  stopTracking(): void {
    this.trackedFlight = null;
    this.trackedSatellite = null;
    this.dismissTrackingPopup();
  }

  private updateTracking(): void {
    if (!this.map) return;
    const now = performance.now();
    // Throttle panning to every 500ms to avoid jitter
    if (now - this.lastTrackPanTime < 500) return;

    if (this.trackedFlight) {
      const flight = this.flights.find(f => f.icao24 === this.trackedFlight!.icao24);
      if (flight) {
        this.trackedFlight = flight;
        this.lastTrackPanTime = now;
        this.map.panTo([flight.lng, flight.lat], { duration: 500 });
        if (this.trackingPopup) {
          this.trackingPopup.setLngLat([flight.lng, flight.lat]);
        }
      } else {
        // Flight no longer in data
        this.stopTracking();
      }
    } else if (this.trackedSatellite) {
      const satellite = this.satellites.find(s => s.id === this.trackedSatellite!.id);
      if (satellite) {
        this.trackedSatellite = satellite;
        const pos = FlatMap.satPosition(satellite);
        this.lastTrackPanTime = now;
        this.map.panTo([pos.lng, pos.lat], { duration: 500 });
        if (this.trackingPopup) {
          this.trackingPopup.setLngLat([pos.lng, pos.lat]);
        }
      } else {
        // Satellite no longer in data
        this.stopTracking();
      }
    }
  }

  private showPopup(lng: number, lat: number, html: string): void {
    if (!this.map) return;
    this.dismissPopup();
    this.activePopup = new maplibregl.Popup({ closeOnClick: true, maxWidth: '280px' })
      .setLngLat([lng, lat])
      .setHTML(`<div class="map-popup">${html}</div>`)
      .addTo(this.map);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleLayerClick(info: any): void {
    if (!info.object) return;
    const layer = info.layer?.id as string;
    const d = info.object;

    if (layer === 'fires-layer') {
      const f = d as FireHotspot;
      this.showPopup(f.lng, f.lat, `
        <strong style="color:#ff6600">${f.region}</strong><br/>
        신뢰도: <b>${f.confidence}</b> | FRP: ${f.frp}<br/>
        밝기: ${f.brightness} | ${f.dayNight === 'D' ? '주간' : '야간'}<br/>
        위성: ${f.satellite}<br/>
        시간: ${f.acqTime}
      `);
    } else if (layer === 'flights-layer') {
      const fl = d as Flight;
      // Toggle tracking: if already tracking this flight, stop; otherwise start
      if (this.trackedFlight && this.trackedFlight.icao24 === fl.icao24) {
        this.stopTracking();
      } else {
        this.trackFlight(fl);
      }
      this.showPopup(fl.lng, fl.lat, `
        <strong style="color:#64b4ff">${fl.callsign || fl.icao24}</strong><br/>
        국가: ${fl.country}<br/>
        고도: ${fl.altitude.toLocaleString()}m<br/>
        속도: ${fl.velocity.toFixed(0)} km/h<br/>
        방향: ${fl.heading.toFixed(0)}&deg;<br/>
        ${fl.onGround ? '<span style="color:#ffaa00">지상</span>' : '<span style="color:#00cc66">비행중</span>'}
      `);
    } else if (layer === 'satellites-layer' || layer === 'satellite-swath-layer') {
      const s = d as Satellite;
      // Toggle tracking: if already tracking this satellite, stop; otherwise start
      if (this.trackedSatellite && this.trackedSatellite.id === s.id) {
        this.stopTracking();
      } else {
        this.trackSatellite(s);
      }
      const pos = FlatMap.satPosition(s);
      const isGeo = s.meanMotion < 2;
      this.showPopup(pos.lng, pos.lat, `
        <strong style="color:#c8a0ff">${s.name}</strong><br/>
        궤도: ${isGeo ? '정지궤도(GEO)' : '저궤도(LEO)'}<br/>
        경사각: ${s.inclination.toFixed(1)}&deg;<br/>
        주기: ${(1440 / s.meanMotion).toFixed(1)}분<br/>
        이심률: ${s.eccentricity.toFixed(4)}
      `);
    } else if (layer === 'weather-layer') {
      const w = d as WeatherStation;
      this.showPopup(w.lng, w.lat, `
        <strong style="color:#0099ff">${w.name}</strong><br/>
        기온: ${w.temp}&deg;C | 습도: ${w.humidity}%<br/>
        풍속: ${w.windSpeed}m/s | 풍향: ${w.windDirection}&deg;<br/>
        강수: ${w.rainfall}mm
      `);
    } else if (layer === 'cctv-layer') {
      const c = d as CctvCamera;
      const typeLabel = c.type === 'forest' ? '산림' : c.type === 'park' ? '공원' : '도로';
      this.showPopup(c.lng, c.lat, `
        <strong style="color:#00ff64">${c.name}</strong><br/>
        유형: ${typeLabel} | 출처: ${c.source}<br/>
        상태: ${c.status === 'active' ? '<span style="color:#00cc66">활성</span>' : '<span style="color:#ff4444">오프라인</span>'}
      `);
    }
  }

  /** Generate a trail + projected path for a flight based on heading */
  private static flightPath(f: Flight): [number, number][] {
    const trailLen = 0.5;
    const projLen = 0.8;
    const hdgRad = f.heading * DEG2RAD;
    const dx = Math.sin(hdgRad);
    const dy = Math.cos(hdgRad);
    return [
      [f.lng - dx * trailLen, f.lat - dy * trailLen],
      [f.lng, f.lat],
      [f.lng + dx * projLen, f.lat + dy * projLen],
    ];
  }

  /** Compute approximate satellite position from orbital elements */
  private static satPosition(s: Satellite): { lat: number; lng: number } {
    const t = (Date.now() / 86400000) % s.meanMotion;
    const lng = ((t * 360) / s.meanMotion + s.epochDay * 0.98565) % 360 - 180;
    const inc = Math.min(s.inclination, 90);
    const lat = Math.max(-90, Math.min(90, inc * Math.sin(t * Math.PI * 2)));
    return { lat, lng };
  }

  private updateLayers(): void {
    if (!this.overlay) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const layers: any[] = [];

    // DWI heatmap
    if (this.dwi.length > 0) {
      layers.push(
        new HeatmapLayer({
          id: 'dwi-layer',
          data: this.dwi,
          getPosition: (d: DwiCell) => [d.lng, d.lat],
          getWeight: (d: DwiCell) => d.riskIndex,
          radiusPixels: 25,
          intensity: 1,
          threshold: 0.15,
          colorRange: [
            [0, 128, 0, 160],
            [255, 255, 0, 180],
            [255, 136, 0, 200],
            [255, 51, 0, 220],
            [180, 0, 0, 240],
          ],
        }),
      );
    }

    // Satellites - simple dot markers
    if (this.satellites.length > 0) {
      layers.push(
        new ScatterplotLayer({
          id: 'satellites-layer',
          data: this.satellites,
          getPosition: (d: Satellite) => {
            const p = FlatMap.satPosition(d);
            return [p.lng, p.lat];
          },
          getFillColor: [200, 160, 255, 220],
          getLineColor: [160, 120, 220, 255],
          lineWidthMinPixels: 1.5,
          stroked: true,
          getRadius: 600,
          radiusMinPixels: 6,
          radiusMaxPixels: 12,
          pickable: true,
          onClick: (info: unknown) => this.handleLayerClick(info),
        }),
      );
    }

    // Flights - simple dot markers with short trail
    if (this.flights.length > 0) {
      const airborne = this.flights.filter(f => !f.onGround);

      // Short heading trail
      layers.push(
        new PathLayer({
          id: 'flight-trail-layer',
          data: airborne,
          getPath: (d: Flight) => FlatMap.flightPath(d),
          getColor: [100, 180, 255, 100],
          widthMinPixels: 1,
          widthMaxPixels: 2,
          capRounded: true,
        }),
      );

      // Flight dots
      layers.push(
        new ScatterplotLayer({
          id: 'flights-layer',
          data: this.flights,
          getPosition: (d: Flight) => [d.lng, d.lat],
          getFillColor: (d: Flight) => d.onGround ? [255, 170, 0, 200] : [100, 180, 255, 240],
          getLineColor: [60, 120, 200, 255],
          lineWidthMinPixels: 1.5,
          stroked: true,
          getRadius: 600,
          radiusMinPixels: 6,
          radiusMaxPixels: 12,
          pickable: true,
          onClick: (info: unknown) => this.handleLayerClick(info),
        }),
      );
    }

    // Fire hotspots - animated pulse ring (outer glow)
    if (this.fires.length > 0) {
      const t = this.animationTime;
      const pulsePhase = (t % 2000) / 2000; // 0..1 over 2s
      const pulseScale = 1 + pulsePhase * 1.8;
      const pulseAlpha = Math.max(0, 1 - pulsePhase);

      layers.push(
        new ScatterplotLayer({
          id: 'fires-pulse-layer',
          data: this.fires,
          getPosition: (d: FireHotspot) => [d.lng, d.lat],
          getRadius: (d: FireHotspot) => Math.max(300, d.frp * 50) * pulseScale,
          getFillColor: (d: FireHotspot) => {
            const a = Math.round(pulseAlpha * 80);
            return d.confidence === 'high'
              ? [255, 51, 0, a]
              : d.confidence === 'nominal'
                ? [255, 136, 0, a]
                : [255, 204, 0, a];
          },
          radiusMinPixels: 4,
          radiusMaxPixels: 40,
          pickable: false,
          updateTriggers: {
            getRadius: [t],
            getFillColor: [t],
          },
        }),
      );

      // Second pulse ring (staggered)
      const pulsePhase2 = ((t + 1000) % 2000) / 2000;
      const pulseScale2 = 1 + pulsePhase2 * 1.8;
      const pulseAlpha2 = Math.max(0, 1 - pulsePhase2);

      layers.push(
        new ScatterplotLayer({
          id: 'fires-pulse2-layer',
          data: this.fires,
          getPosition: (d: FireHotspot) => [d.lng, d.lat],
          getRadius: (d: FireHotspot) => Math.max(300, d.frp * 50) * pulseScale2,
          getFillColor: (d: FireHotspot) => {
            const a = Math.round(pulseAlpha2 * 50);
            return d.confidence === 'high'
              ? [255, 51, 0, a]
              : d.confidence === 'nominal'
                ? [255, 136, 0, a]
                : [255, 204, 0, a];
          },
          radiusMinPixels: 4,
          radiusMaxPixels: 50,
          pickable: false,
          updateTriggers: {
            getRadius: [t],
            getFillColor: [t],
          },
        }),
      );

      // Core fire dots (solid, on top)
      layers.push(
        new ScatterplotLayer({
          id: 'fires-layer',
          data: this.fires,
          getPosition: (d: FireHotspot) => [d.lng, d.lat],
          getRadius: (d: FireHotspot) => Math.max(300, d.frp * 50),
          getFillColor: (d: FireHotspot) =>
            d.confidence === 'high'
              ? [255, 51, 0, 220]
              : d.confidence === 'nominal'
                ? [255, 136, 0, 200]
                : [255, 204, 0, 180],
          radiusMinPixels: 3,
          radiusMaxPixels: 20,
          pickable: true,
          onClick: (info: unknown) => this.handleLayerClick(info),
        }),
      );
    }

    // Weather stations
    if (this.weather.length > 0) {
      layers.push(
        new ScatterplotLayer({
          id: 'weather-layer',
          data: this.weather,
          getPosition: (d: WeatherStation) => [d.lng, d.lat],
          getRadius: 500,
          getFillColor: [0, 153, 255, 160],
          radiusMinPixels: 4,
          radiusMaxPixels: 10,
          pickable: true,
          onClick: (info: unknown) => this.handleLayerClick(info),
        }),
      );
    }

    // CCTV cameras
    if (this.cctvs.length > 0) {
      layers.push(
        new ScatterplotLayer({
          id: 'cctv-layer',
          data: this.cctvs,
          getPosition: (d: CctvCamera) => [d.lng, d.lat],
          getRadius: 500,
          getFillColor: (d: CctvCamera) =>
            d.type === 'forest' ? [0, 255, 100, 200] :
            d.type === 'park' ? [100, 200, 255, 200] :
            [255, 200, 50, 200],
          radiusMinPixels: 4,
          radiusMaxPixels: 10,
          pickable: true,
          onClick: (info: unknown) => this.handleLayerClick(info),
        }),
      );
    }

    this.overlay.setProps({ layers });
  }

  private add3dBuildingsLayer(): void {
    if (!this.map || this.map.getLayer('3d-buildings')) return;

    // Determine the vector tile source name used by the CARTO style
    const style = this.map.getStyle();
    let sourceName = '';
    if (style && style.sources) {
      for (const [name, src] of Object.entries(style.sources)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((src as any).type === 'vector') {
          sourceName = name;
          break;
        }
      }
    }
    if (!sourceName) return;

    this.map.addLayer({
      id: '3d-buildings',
      source: sourceName,
      'source-layer': 'building',
      type: 'fill-extrusion',
      minzoom: 14,
      paint: {
        'fill-extrusion-color': '#1a3a1a',
        'fill-extrusion-height': [
          'coalesce',
          ['get', 'render_height'],
          ['get', 'height'],
          10,
        ],
        'fill-extrusion-base': [
          'coalesce',
          ['get', 'render_min_height'],
          ['get', 'min_height'],
          0,
        ],
        'fill-extrusion-opacity': 0.7,
      },
    });
  }

  setBuildings(visible: boolean): void {
    if (!this.map || !this.map.getLayer('3d-buildings')) return;
    this.map.setLayoutProperty('3d-buildings', 'visibility', visible ? 'visible' : 'none');
  }

  setFires(fires: FireHotspot[]): void {
    this.fires = fires;
    this.updateLayers();
  }

  setWeather(stations: WeatherStation[]): void {
    this.weather = stations;
    this.updateLayers();
  }

  setDwi(cells: DwiCell[]): void {
    this.dwi = cells;
    this.updateLayers();
  }

  setFlights(flights: Flight[]): void {
    this.flights = flights;
    this.updateLayers();
  }

  setSatellites(satellites: Satellite[]): void {
    this.satellites = satellites;
    this.updateLayers();
  }

  setCctvs(cctvs: CctvCamera[]): void {
    this.cctvs = cctvs;
    this.updateLayers();
  }

  flyTo(center: { lat: number; lng: number }, zoom: number): void {
    if (!this.map) {
      this.pendingFlyTo = { center, zoom };
      return;
    }
    if (!this.map.loaded()) {
      this.pendingFlyTo = { center, zoom };
      return;
    }
    this.map.flyTo({ center: [center.lng, center.lat], zoom, duration: 2000 });
  }

  showFirePopup(fire: FireHotspot): void {
    if (!this.map) return;
    this.showPopup(fire.lng, fire.lat, `
      <strong style="color:#ff6600">${fire.region}</strong><br/>
      신뢰도: <b>${fire.confidence}</b> | FRP: ${fire.frp}<br/>
      밝기: ${fire.brightness} | ${fire.dayNight === 'D' ? '주간' : '야간'}<br/>
      위성: ${fire.satellite}<br/>
      시간: ${fire.acqTime}
    `);
    this.map.flyTo({ center: [fire.lng, fire.lat], zoom: 10, duration: 1500 });
  }

  dismissFirePopup(): void {
    this.dismissPopup();
  }

  setTopicMarkers(markers: TopicMarker[]): void {
    // Remove existing topic markers
    for (const m of this.topicMarkers) m.remove();
    this.topicMarkers = [];
    if (!this.map) {
      this.pendingTopicMarkers = markers;
      return;
    }

    for (const mk of markers) {
      const color = mk.color || '#ff0000';
      const el = document.createElement('div');
      el.className = 'topic-marker';
      el.innerHTML = `<div style="
        width:18px;height:18px;border-radius:50%;
        background:${color};border:3px solid #fff;
        box-shadow:0 0 12px ${color},0 0 24px ${color}88;
        animation:topicMarkerPulse 1.5s ease-in-out infinite;
      "></div>
      <div style="
        position:absolute;top:24px;left:50%;transform:translateX(-50%);
        white-space:nowrap;font-size:11px;font-weight:700;color:#fff;
        background:rgba(0,0,0,0.75);padding:2px 6px;border-radius:3px;
        border:1px solid ${color}88;
      ">${mk.label}</div>`;

      const popup = new maplibregl.Popup({ offset: 25, closeButton: false })
        .setHTML(`<strong style="color:${color}">${mk.label}</strong>${mk.detail ? '<br/>' + mk.detail : ''}`);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([mk.lng, mk.lat])
        .setPopup(popup)
        .addTo(this.map);

      this.topicMarkers.push(marker);
    }
  }

  private timelineMarkers: maplibregl.Marker[] = [];
  private pendingTimeline: Array<{ time: string; title: string; detail: string; severity: string; lat: number; lng: number }> | null = null;

  setBriefingTimeline(events: Array<{ time: string; title: string; detail: string; severity: string; lat: number; lng: number }>): void {
    for (const m of this.timelineMarkers) m.remove();
    this.timelineMarkers = [];
    if (!this.map || events.length === 0) {
      if (events.length > 0) this.pendingTimeline = events;
      return;
    }

    const severityColor: Record<string, string> = {
      critical: '#ff2222', high: '#ff8800', medium: '#ffcc00', low: '#88cc88',
    };

    events.forEach((ev, i) => {
      // Spiral offset to prevent overlapping markers at same coordinates
      const angle = (2 * Math.PI * i) / Math.max(events.length, 1);
      const offsetR = 0.0004 + 0.0002 * i; // growing spiral ~40-80m
      const lng = ev.lng + offsetR * Math.cos(angle);
      const lat = ev.lat + offsetR * Math.sin(angle);

      const color = severityColor[ev.severity] || '#ffcc00';
      const el = document.createElement('div');
      el.className = 'timeline-marker';
      el.innerHTML = `<div style="
        position:relative;width:24px;height:24px;border-radius:50%;
        background:${color};border:2px solid #fff;
        display:flex;align-items:center;justify-content:center;
        font-size:10px;font-weight:900;color:#000;
        box-shadow:0 0 8px ${color}88;cursor:pointer;
      ">${i + 1}</div>
      <div style="
        position:absolute;top:-18px;left:50%;transform:translateX(-50%);
        white-space:nowrap;font-size:10px;font-weight:700;color:${color};
        background:rgba(0,0,0,0.85);padding:1px 5px;border-radius:2px;
      ">${ev.time}</div>`;

      const popup = new maplibregl.Popup({ offset: 20, closeButton: false, maxWidth: '280px' })
        .setHTML(`<div style="font-size:12px;">
          <div style="color:${color};font-weight:700;margin-bottom:4px;">${ev.time} ${ev.title}</div>
          <div style="color:#ccc;line-height:1.4;">${ev.detail}</div>
        </div>`);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(this.map!);

      this.timelineMarkers.push(marker);
    });
  }

  private channelMarkers: maplibregl.Marker[] = [];
  private pendingChannelPopups: { items: AgentNewsItem[]; center: { lat: number; lng: number } } | null = null;

  setChannelPopups(items: AgentNewsItem[], center: { lat: number; lng: number }): void {
    for (const p of this.channelPopups) p.remove();
    this.channelPopups = [];
    for (const m of this.channelMarkers) m.remove();
    this.channelMarkers = [];
    if (items.length === 0) return;
    if (!this.map || !this.map.loaded()) {
      this.pendingChannelPopups = { items, center };
      return;
    }

    const PLATFORM_STYLE: Record<string, { icon: string; color: string }> = {
      news:      { icon: '\uD83D\uDCF0', color: '#4ade80' },
      youtube:   { icon: '\u25B6\uFE0F',  color: '#ff4444' },
      twitter:   { icon: '\uD835\uDD4F',  color: '#1da1f2' },
      instagram: { icon: '\uD83D\uDCF7', color: '#e1306c' },
      facebook:  { icon: '\uD83D\uDC4D', color: '#4267b2' },
      tiktok:    { icon: '\uD83C\uDFB5', color: '#00f2ea' },
      threads:   { icon: '\uD83E\uDDF5', color: '#ffffff' },
    };

    // Group by platform, pick hottest (first = most recent after sort)
    const byPlatform = new Map<string, AgentNewsItem>();
    for (const item of items) {
      const plat = item.platform || 'news';
      if (!byPlatform.has(plat)) byPlatform.set(plat, item);
    }

    // Position popups in a circle around the center
    const entries = Array.from(byPlatform.entries());
    const radius = 0.004; // ~400m spread, close to fire site
    const angleStep = (2 * Math.PI) / Math.max(entries.length, 1);

    entries.forEach(([platform, item], i) => {
      const angle = angleStep * i - Math.PI / 2;
      const lng = center.lng + radius * Math.cos(angle);
      const lat = center.lat + radius * Math.sin(angle);

      const ps = PLATFORM_STYLE[platform] ?? PLATFORM_STYLE['news']!;
      let mediaHtml = '';

      if (item.youtubeId) {
        mediaHtml = `<iframe src="https://www.youtube.com/embed/${item.youtubeId}?rel=0&mute=1"
          style="width:100%;aspect-ratio:16/9;border:none;border-radius:4px;margin-top:4px"
          allow="autoplay;encrypted-media" loading="lazy"></iframe>`;
      } else if (item.imageUrl) {
        mediaHtml = `<img src="${item.imageUrl}" style="width:100%;max-height:120px;object-fit:cover;border-radius:4px;margin-top:4px" loading="lazy"/>`;
      } else if (item.thumbnailUrl) {
        mediaHtml = `<img src="${item.thumbnailUrl}" style="width:100%;max-height:100px;object-fit:cover;border-radius:4px;margin-top:4px" loading="lazy"/>`;
      }

      const html = `<div style="max-width:240px;font-family:sans-serif">
        <div style="display:flex;align-items:center;gap:4px;margin-bottom:4px">
          <span style="font-size:14px">${ps.icon}</span>
          <span style="font-size:11px;font-weight:700;color:${ps.color}">${item.source}</span>
          <span style="font-size:10px;color:#888;margin-left:auto">${new Date(item.pubDate).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <a href="${item.link}" target="_blank" rel="noopener" style="font-size:12px;font-weight:600;color:#fff;text-decoration:none;line-height:1.3;display:block">${item.title}</a>
        ${mediaHtml}
        ${item.agentNote ? `<div style="font-size:10px;color:#aaa;margin-top:4px;font-style:italic">\uD83D\uDCAC ${item.agentNote}</div>` : ''}
      </div>`;

      // Create marker element with channel icon
      const markerEl = document.createElement('div');
      markerEl.className = 'channel-marker';
      markerEl.innerHTML = `<div style="
        width:28px;height:28px;border-radius:50%;
        background:rgba(0,0,0,0.8);border:2px solid ${ps.color};
        display:flex;align-items:center;justify-content:center;
        font-size:14px;cursor:pointer;
        box-shadow:0 0 8px ${ps.color}66;
      ">${ps.icon}</div>`;

      const popup = new maplibregl.Popup({
        closeOnClick: false,
        closeButton: true,
        maxWidth: '260px',
        className: `channel-popup channel-popup-${platform}`,
        offset: 20,
      }).setHTML(html);

      const marker = new maplibregl.Marker({ element: markerEl })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(this.map!);

      this.channelMarkers.push(marker);
    });
  }

  destroy(): void {
    this.stopTracking();

    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    if (this.overlay) {
      this.overlay.finalize();
      this.overlay = null;
    }

    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}
