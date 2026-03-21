import type { FireHotspot, FireRegionStats } from '@/types';

/**
 * Fetch fire hotspots from FIRMS API.
 * @param days - Number of days to look back
 * @param center - Optional center point to derive bbox (default: Korea)
 * @param radius - Bbox radius in degrees (default: 5)
 */
export async function fetchFireHotspots(
  days = 2,
  center?: { lat: number; lng: number },
  radius = 5,
): Promise<FireHotspot[]> {
  let url = `/api/firms?days=${days}`;
  if (center) {
    const west = Math.round((center.lng - radius) * 10) / 10;
    const south = Math.round((center.lat - radius) * 10) / 10;
    const east = Math.round((center.lng + radius) * 10) / 10;
    const north = Math.round((center.lat + radius) * 10) / 10;
    url += `&bbox=${west},${south},${east},${north}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FIRMS API error: ${res.status}`);
  const data = await res.json() as { fireDetections?: FireHotspot[] };
  return data.fireDetections ?? [];
}

export function computeRegionStats(fires: FireHotspot[]): FireRegionStats[] {
  const regionMap = new Map<string, { fires: FireHotspot[]; lat: number; lng: number }>();

  for (const fire of fires) {
    // Use the region name from API as the grouping key
    const key = fire.region || `${Math.floor(fire.lat)},${Math.floor(fire.lng)}`;
    if (!regionMap.has(key)) {
      regionMap.set(key, { fires: [], lat: fire.lat, lng: fire.lng });
    }
    regionMap.get(key)!.fires.push(fire);
  }

  return Array.from(regionMap.entries()).map(([region, data]) => {
    // Use average lat/lng for the region center
    const avgLat = data.fires.reduce((s, f) => s + f.lat, 0) / data.fires.length;
    const avgLng = data.fires.reduce((s, f) => s + f.lng, 0) / data.fires.length;
    return {
      region,
      count: data.fires.length,
      highCount: data.fires.filter((f) => f.confidence === 'high').length,
      totalFrp: data.fires.reduce((sum, f) => sum + f.frp, 0),
      lat: avgLat,
      lng: avgLng,
    };
  });
}
