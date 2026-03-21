import type { WeatherStation } from '@/types';

export async function fetchWeatherData(): Promise<WeatherStation[]> {
  let lastErr: Error | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 1000 * attempt));
    try {
      const res = await fetch('/api/weather');
      if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
      const data = (await res.json()) as { stations?: WeatherStation[] };
      return data.stations ?? [];
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastErr!;
}
