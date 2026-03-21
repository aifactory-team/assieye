export interface Satellite {
  id: string;
  name: string;
  tle1: string;
  tle2: string;
  inclination: number;
  eccentricity: number;
  meanMotion: number;
  epochYear: number;
  epochDay: number;
}

export async function fetchSatellites(group = 'weather'): Promise<Satellite[]> {
  const res = await fetch(`/api/satellites?group=${group}`);
  if (!res.ok) throw new Error(`Satellites API error: ${res.status}`);
  const data = await res.json() as { satellites?: Satellite[] };
  return data.satellites ?? [];
}
