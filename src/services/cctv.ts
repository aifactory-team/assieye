export interface CctvCamera {
  id: string;
  name: string;
  lat: number;
  lng: number;
  streamUrl: string;
  source: string;
  type: 'forest' | 'road' | 'park';
  status: 'active' | 'offline';
}

export async function fetchCctvs(): Promise<CctvCamera[]> {
  const res = await fetch('/api/cctv');
  if (!res.ok) throw new Error(`CCTV API error: ${res.status}`);
  const data = await res.json() as { cctvs?: CctvCamera[] };
  return data.cctvs ?? [];
}
