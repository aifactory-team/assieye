import type { DwiCell } from '@/types';

export async function fetchDwiData(): Promise<DwiCell[]> {
  const res = await fetch('/api/dwi');
  if (!res.ok) throw new Error(`DWI API error: ${res.status}`);
  const data = (await res.json()) as { cells?: DwiCell[] };
  return data.cells ?? [];
}
