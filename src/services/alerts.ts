import type { FireHotspot } from '@/types';

export interface AlertRecord {
  id: string;
  lat: number;
  lng: number;
  brightness: number;
  frp: number;
  confidence: string;
  satellite: string;
  acqTime: string;
  sentAt: string;
  success: boolean;
}

const MAX_HISTORY = 100;
const DEDUP_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const GRID_SIZE = 0.1; // degree

function gridKey(lat: number, lng: number): string {
  const gLat = Math.floor(lat / GRID_SIZE) * GRID_SIZE;
  const gLng = Math.floor(lng / GRID_SIZE) * GRID_SIZE;
  return `${gLat.toFixed(1)},${gLng.toFixed(1)}`;
}

let alertHistory: AlertRecord[] = [];
const sentGridCells = new Map<string, number>(); // gridKey -> timestamp

export function getAlertHistory(): AlertRecord[] {
  return alertHistory;
}

export function clearAlertHistory(): void {
  alertHistory = [];
  sentGridCells.clear();
}

function isDuplicate(fire: FireHotspot): boolean {
  const key = gridKey(fire.lat, fire.lng);
  const lastSent = sentGridCells.get(key);
  if (lastSent && Date.now() - lastSent < DEDUP_WINDOW_MS) {
    return true;
  }
  return false;
}

export async function checkAndSendAlerts(
  newFires: FireHotspot[],
  previousFires: FireHotspot[]
): Promise<AlertRecord[]> {
  const previousIds = new Set(previousFires.map(f => `${f.lat}-${f.lng}-${f.acqTime}`));
  const newDetections = newFires.filter(f => {
    const id = `${f.lat}-${f.lng}-${f.acqTime}`;
    return !previousIds.has(id);
  });

  const alertable = newDetections.filter(f => {
    if (f.confidence === 'low') return false;
    return !isDuplicate(f);
  });

  const sent: AlertRecord[] = [];

  for (const fire of alertable) {
    const record: AlertRecord = {
      id: `alert-${Date.now()}-${fire.lat}-${fire.lng}`,
      lat: fire.lat,
      lng: fire.lng,
      brightness: fire.brightness,
      frp: fire.frp,
      confidence: fire.confidence,
      satellite: fire.satellite,
      acqTime: fire.acqTime,
      sentAt: new Date().toISOString(),
      success: false,
    };

    try {
      const res = await fetch('/api/send-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: fire.lat,
          lng: fire.lng,
          brightness: fire.brightness,
          frp: fire.frp,
          confidence: fire.confidence,
          satellite: fire.satellite,
          acqTime: fire.acqTime,
        }),
      });
      record.success = res.ok;
    } catch {
      record.success = false;
    }

    const key = gridKey(fire.lat, fire.lng);
    sentGridCells.set(key, Date.now());
    sent.push(record);
    alertHistory.unshift(record);
  }

  // Trim history
  if (alertHistory.length > MAX_HISTORY) {
    alertHistory = alertHistory.slice(0, MAX_HISTORY);
  }

  // Clean old grid entries
  const now = Date.now();
  for (const [key, ts] of sentGridCells) {
    if (now - ts > DEDUP_WINDOW_MS) {
      sentGridCells.delete(key);
    }
  }

  return sent;
}
