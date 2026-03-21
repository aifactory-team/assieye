import Globe from 'globe.gl';
import { KOREA_CENTER, GLOBE_ALTITUDE } from '@/config/constants';
import type { FireHotspot, WeatherStation, DwiCell } from '@/types';
import type { Flight } from '@/services/flights';
import type { Satellite } from '@/services/satellites';
import type { CctvCamera } from '@/services/cctv';

const AUTO_ROTATE_DELAY = 60_000;
const GLOBE_IMAGE_URL = '//unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
const GLOBE_BUMP_URL = '//unpkg.com/three-globe/example/img/earth-topology.png';
const DEG2RAD = Math.PI / 180;

interface FlightArc {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
  callsign: string;
  altitude: number;
  flight: Flight;
}

interface SatPoint {
  lat: number;
  lng: number;
  name: string;
  alt: number;
  satellite: Satellite;
}

export class GlobeMap {
  private readonly container: HTMLElement;
  private globe: ReturnType<typeof Globe> | null = null;
  private autoRotateTimer: ReturnType<typeof setTimeout> | null = null;
  private isAutoRotating = false;
  private trackedFlight: Flight | null = null;
  private trackedSatellite: Satellite | null = null;
  private trackingInterval: ReturnType<typeof setInterval> | null = null;
  private flights: Flight[] = [];
  private satellites: Satellite[] = [];
  private popupEl: HTMLElement | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.init();
  }

  private init(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    // Create popup element
    this.popupEl = document.createElement('div');
    this.popupEl.className = 'globe-popup';
    this.popupEl.style.cssText = `
      position: absolute; display: none; z-index: 20;
      background: rgba(10,26,10,0.95); border: 1px solid var(--accent, #ff6600);
      border-radius: 8px; padding: 10px; max-width: 280px;
      box-shadow: 0 0 20px rgba(255,102,0,0.3), 0 0 40px rgba(255,102,0,0.1);
      pointer-events: auto; font-size: 0.75rem; color: #e0e8e0; line-height: 1.5;
      animation: popupAppear 0.25s ease-out both;
    `;
    this.container.style.position = 'relative';
    this.container.appendChild(this.popupEl);

    // Close popup on click outside
    this.popupEl.addEventListener('click', (e) => e.stopPropagation());
    this.container.addEventListener('click', (e) => {
      // Only dismiss if clicking on the globe background (not on a marker/point)
      if (e.target === this.container || (e.target as HTMLElement).tagName === 'CANVAS') {
        this.dismissPopup();
      }
    });

    this.globe = Globe()
      .globeImageUrl(GLOBE_IMAGE_URL)
      .bumpImageUrl(GLOBE_BUMP_URL)
      .backgroundColor('rgba(0,0,0,0)')
      .showAtmosphere(true)
      .atmosphereColor('#1a5a1a')
      .atmosphereAltitude(0.15)
      .width(width)
      .height(height)
      .htmlElementsData([] as FireHotspot[])
      .htmlLat('lat')
      .htmlLng('lng')
      .htmlElement((d: unknown) => this.createFireMarker(d as FireHotspot))
      (this.container);

    // Add click handlers after globe is mounted (some methods may not exist in all versions)
    try {
      this.globe.onPointClick((point: unknown) => this.handleFlightClick(point as Flight));
    } catch { /* onPointClick not available */ }
    try {
      this.globe.onLabelClick((label: unknown) => this.handleSatelliteClick((label as SatPoint).satellite));
    } catch { /* onLabelClick not available */ }
    // Rings removed - no ring click handler needed

    // Set initial POV
    this.globe.pointOfView(
      { lat: KOREA_CENTER.lat, lng: KOREA_CENTER.lng, altitude: GLOBE_ALTITUDE },
      0,
    );

    // Track user activity to manage auto-rotate
    this.container.addEventListener('mousedown', this.resetAutoRotate);
    this.container.addEventListener('touchstart', this.resetAutoRotate);
    this.container.addEventListener('wheel', this.resetAutoRotate);

    // Start auto-rotate timer
    this.scheduleAutoRotate();

    // Handle resize
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
  }

  private createFireMarker(fire: FireHotspot): HTMLElement {
    const el = document.createElement('div');
    el.className = 'globe-fire-marker';
    const size = Math.max(8, Math.min(24, fire.brightness / 15));
    const color =
      fire.confidence === 'high' ? '#ff3300' :
      fire.confidence === 'nominal' ? '#ff8800' : '#ffcc00';

    el.style.position = 'relative';
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.borderRadius = '50%';
    el.style.background = color;
    el.style.boxShadow = `0 0 ${size * 1.5}px ${color}, 0 0 ${size * 3}px ${color}44`;
    el.style.pointerEvents = 'auto';
    el.style.cursor = 'pointer';

    // Random delay for staggered animation
    const delay = Math.random() * 2;
    el.style.animationDelay = `${delay}s`;

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleFireClick(fire, e);
    });

    return el;
  }

  private static satPosition(s: Satellite): { lat: number; lng: number } {
    const t = (Date.now() / 86400000) % s.meanMotion;
    const lng = ((t * 360) / s.meanMotion + s.epochDay * 0.98565) % 360 - 180;
    const lat = s.inclination * Math.sin(t * Math.PI * 2);
    return { lat, lng };
  }

  private showPopupAt(screenX: number, screenY: number, html: string): void {
    if (!this.popupEl) return;
    this.popupEl.innerHTML = `<div class="map-popup">${html}</div>
      <div style="position:absolute;top:4px;right:8px;cursor:pointer;color:#7a9a7a;font-size:16px;" class="globe-popup-close">&times;</div>`;
    this.popupEl.style.display = 'block';

    // Position popup near click, clamped to container bounds
    const rect = this.container.getBoundingClientRect();
    let left = screenX - rect.left + 12;
    let top = screenY - rect.top - 20;

    // Prevent overflow right/bottom
    const pw = 280;
    if (left + pw > rect.width) left = left - pw - 24;
    if (top + 150 > rect.height) top = rect.height - 160;
    if (top < 10) top = 10;

    this.popupEl.style.left = `${left}px`;
    this.popupEl.style.top = `${top}px`;

    this.popupEl.querySelector('.globe-popup-close')?.addEventListener('click', () => this.dismissPopup());
  }

  private showPopupAtCoords(lat: number, lng: number, html: string): void {
    if (!this.globe || !this.popupEl) return;
    const coords = this.globe.getScreenCoords(lat, lng);
    if (!coords) return;
    const rect = this.container.getBoundingClientRect();
    this.showPopupAt(coords.x + rect.left, coords.y + rect.top, html);
  }

  private dismissPopup(): void {
    if (this.popupEl) this.popupEl.style.display = 'none';
  }

  private handleFireClick(fire: FireHotspot, e: MouseEvent): void {
    this.showPopupAt(e.clientX, e.clientY, `
      <strong style="color:#ff6600">${fire.region}</strong><br/>
      신뢰도: <b>${fire.confidence}</b> | FRP: ${fire.frp}<br/>
      밝기: ${fire.brightness} | ${fire.dayNight === 'D' ? '주간' : '야간'}<br/>
      위성: ${fire.satellite}<br/>
      시간: ${fire.acqTime}
    `);
  }

  private handleFlightClick(flight: Flight): void {
    if (this.trackedFlight && this.trackedFlight.icao24 === flight.icao24) {
      this.stopTracking();
    } else {
      this.trackFlight(flight);
    }
    this.showPopupAtCoords(flight.lat, flight.lng, `
      <strong style="color:#64b4ff">${flight.callsign || flight.icao24}</strong><br/>
      국가: ${flight.country}<br/>
      고도: ${flight.altitude.toLocaleString()}m<br/>
      속도: ${flight.velocity.toFixed(0)} km/h<br/>
      방향: ${flight.heading.toFixed(0)}&deg;<br/>
      ${flight.onGround ? '<span style="color:#ffaa00">지상</span>' : '<span style="color:#00cc66">비행중</span>'}
    `);
  }

  private handleSatelliteClick(satellite: Satellite): void {
    if (this.trackedSatellite && this.trackedSatellite.id === satellite.id) {
      this.stopTracking();
    } else {
      this.trackSatellite(satellite);
    }
    const pos = GlobeMap.satPosition(satellite);
    const isGeo = satellite.meanMotion < 2;
    this.showPopupAtCoords(pos.lat, pos.lng, `
      <strong style="color:#c8a0ff">${satellite.name}</strong><br/>
      궤도: ${isGeo ? '정지궤도(GEO)' : '저궤도(LEO)'}<br/>
      경사각: ${satellite.inclination.toFixed(1)}&deg;<br/>
      주기: ${(1440 / satellite.meanMotion).toFixed(1)}분<br/>
      이심률: ${satellite.eccentricity.toFixed(4)}
    `);
  }

  private readonly resetAutoRotate = (): void => {
    this.stopAutoRotate();
    this.scheduleAutoRotate();
  };

  private scheduleAutoRotate(): void {
    if (this.autoRotateTimer) clearTimeout(this.autoRotateTimer);
    this.autoRotateTimer = setTimeout(() => {
      this.startAutoRotate();
    }, AUTO_ROTATE_DELAY);
  }

  private startAutoRotate(): void {
    if (!this.globe || this.isAutoRotating) return;
    this.isAutoRotating = true;
    const controls = this.globe.controls();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.5;
    }
  }

  private stopAutoRotate(): void {
    this.isAutoRotating = false;
    if (!this.globe) return;
    const controls = this.globe.controls();
    if (controls) {
      controls.autoRotate = false;
    }
  }

  private handleResize(): void {
    if (!this.globe) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.globe.width(width).height(height);
  }

  setFires(fires: FireHotspot[]): void {
    if (this.globe) {
      this.globe.htmlElementsData(fires);
    }
  }

  setWeather(_stations: WeatherStation[]): void {
    // Weather on globe - not critical
  }

  setDwi(_cells: DwiCell[]): void {
    // DWI on globe - not critical
  }

  setFlights(flights: Flight[]): void {
    this.flights = flights;
    if (!this.globe) return;
    const airborne = flights.filter(f => !f.onGround);

    // Flight trajectory arcs (from trail to projected position)
    const arcs: FlightArc[] = airborne.map(f => {
      const hdgRad = f.heading * DEG2RAD;
      const trailDist = 0.5; // degrees behind
      const projDist = 1.0; // degrees ahead
      return {
        startLat: f.lat - Math.cos(hdgRad) * trailDist,
        startLng: f.lng - Math.sin(hdgRad) * trailDist,
        endLat: f.lat + Math.cos(hdgRad) * projDist,
        endLng: f.lng + Math.sin(hdgRad) * projDist,
        color: 'rgba(100,180,255,0.6)',
        callsign: f.callsign,
        altitude: f.altitude,
        flight: f,
      };
    });

    this.globe
      .arcsData(arcs)
      .arcStartLat((d: unknown) => (d as FlightArc).startLat)
      .arcStartLng((d: unknown) => (d as FlightArc).startLng)
      .arcEndLat((d: unknown) => (d as FlightArc).endLat)
      .arcEndLng((d: unknown) => (d as FlightArc).endLng)
      .arcColor((d: unknown) => (d as FlightArc).color)
      .arcAltitudeAutoScale(0.3)
      .arcStroke(0.5)
      .arcDashLength(0.4)
      .arcDashGap(0.2)
      .arcDashAnimateTime(2000)
      .onArcClick((arc: unknown) => this.handleFlightClick((arc as FlightArc).flight));

    // Flight position dots (flat, small)
    this.globe
      .pointsData(airborne)
      .pointLat((d: unknown) => (d as Flight).lat)
      .pointLng((d: unknown) => (d as Flight).lng)
      .pointAltitude(0.001)
      .pointColor(() => '#64b4ff')
      .pointRadius(0.15)
      .pointResolution(12);
  }

  setCctvs(_cctvs: CctvCamera[]): void {
    // CCTVs better on flat map
  }

  flyTo(center: { lat: number; lng: number }, altitude: number): void {
    if (!this.globe) return;
    this.globe.pointOfView({ lat: center.lat, lng: center.lng, altitude }, 2000);
  }

  showFirePopup(fire: FireHotspot): void {
    if (!this.globe) return;
    this.globe.pointOfView({ lat: fire.lat, lng: fire.lng, altitude: 0.5 }, 1500);
    // Show popup after camera animation
    setTimeout(() => {
      this.showPopupAtCoords(fire.lat, fire.lng, `
        <strong style="color:#ff6600">${fire.region}</strong><br/>
        신뢰도: <b>${fire.confidence}</b> | FRP: ${fire.frp}<br/>
        밝기: ${fire.brightness} | ${fire.dayNight === 'D' ? '주간' : '야간'}<br/>
        위성: ${fire.satellite}<br/>
        시간: ${fire.acqTime}
      `);
    }, 1600);
  }

  dismissFirePopup(): void {
    this.dismissPopup();
  }

  setSatellites(satellites: Satellite[]): void {
    this.satellites = satellites;
    if (!this.globe) return;

    // Compute positions
    const satPoints: SatPoint[] = satellites.map(s => {
      const pos = GlobeMap.satPosition(s);
      return {
        ...pos,
        name: s.name,
        alt: s.meanMotion < 2 ? 0.08 : 0.04, // GEO higher, LEO lower
        satellite: s,
      };
    });

    // Satellite labels (simple text dots, no 3D objects)
    this.globe
      .labelsData(satPoints)
      .labelLat((d: unknown) => (d as SatPoint).lat)
      .labelLng((d: unknown) => (d as SatPoint).lng)
      .labelAltitude(0.01)
      .labelText((d: unknown) => (d as SatPoint).name)
      .labelSize(0.4)
      .labelDotRadius(0.15)
      .labelColor(() => 'rgba(200,160,255,0.8)')
      .labelResolution(6);

    // No coverage rings - keep it clean
    this.globe.ringsData([]);
  }

  trackFlight(flight: Flight | null): void {
    this.trackedSatellite = null;
    this.clearTrackingInterval();
    this.trackedFlight = flight;
    if (flight && this.globe) {
      this.stopAutoRotate();
      this.globe.pointOfView({ lat: flight.lat, lng: flight.lng, altitude: 0.5 }, 1500);
      this.startTrackingInterval();
    }
  }

  trackSatellite(satellite: Satellite | null): void {
    this.trackedFlight = null;
    this.clearTrackingInterval();
    this.trackedSatellite = satellite;
    if (satellite && this.globe) {
      this.stopAutoRotate();
      const pos = GlobeMap.satPosition(satellite);
      this.globe.pointOfView({ lat: pos.lat, lng: pos.lng, altitude: 0.5 }, 1500);
      this.startTrackingInterval();
    }
  }

  stopTracking(): void {
    this.trackedFlight = null;
    this.trackedSatellite = null;
    this.clearTrackingInterval();
  }

  private startTrackingInterval(): void {
    this.clearTrackingInterval();
    this.trackingInterval = setInterval(() => {
      if (!this.globe) return;

      if (this.trackedFlight) {
        const flight = this.flights.find(f => f.icao24 === this.trackedFlight!.icao24);
        if (flight) {
          this.trackedFlight = flight;
          this.globe.pointOfView({ lat: flight.lat, lng: flight.lng, altitude: 0.5 }, 1500);
        } else {
          this.stopTracking();
        }
      } else if (this.trackedSatellite) {
        const satellite = this.satellites.find(s => s.id === this.trackedSatellite!.id);
        if (satellite) {
          this.trackedSatellite = satellite;
          const pos = GlobeMap.satPosition(satellite);
          this.globe.pointOfView({ lat: pos.lat, lng: pos.lng, altitude: 0.5 }, 1500);
        } else {
          this.stopTracking();
        }
      }
    }, 2000);
  }

  private clearTrackingInterval(): void {
    if (this.trackingInterval !== null) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
  }

  destroy(): void {
    this.stopTracking();
    this.dismissPopup();

    if (this.autoRotateTimer) {
      clearTimeout(this.autoRotateTimer);
      this.autoRotateTimer = null;
    }

    this.container.removeEventListener('mousedown', this.resetAutoRotate);
    this.container.removeEventListener('touchstart', this.resetAutoRotate);
    this.container.removeEventListener('wheel', this.resetAutoRotate);
    window.removeEventListener('resize', this.handleResize);

    if (this.popupEl) {
      this.popupEl.remove();
      this.popupEl = null;
    }

    if (this.globe) {
      if (typeof (this.globe as any)._destructor === 'function') {
        (this.globe as any)._destructor();
      }
      this.globe = null;
    }

    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
  }
}
