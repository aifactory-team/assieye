export interface Flight {
  icao24: string;
  callsign: string;
  country: string;
  lat: number;
  lng: number;
  altitude: number;
  onGround: boolean;
  velocity: number;
  heading: number;
  verticalRate: number;
  squawk: string;
}

export async function fetchFlights(
  center?: { lat: number; lng: number },
  radius = 5,
): Promise<Flight[]> {
  let url = '/api/flights';
  if (center) {
    const west = Math.round((center.lng - radius) * 10) / 10;
    const south = Math.round((center.lat - radius) * 10) / 10;
    const east = Math.round((center.lng + radius) * 10) / 10;
    const north = Math.round((center.lat + radius) * 10) / 10;
    url += `?bbox=${west},${south},${east},${north}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Flights API error: ${res.status}`);
  const data = await res.json() as { flights?: Flight[] };
  return data.flights ?? [];
}
