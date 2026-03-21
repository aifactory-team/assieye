export interface MarketQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  currency: string;
  marketState?: string;
  dayHigh?: number;
  dayLow?: number;
  volume?: number;
}

export async function fetchMarketQuotes(symbols: string[]): Promise<MarketQuote[]> {
  const res = await fetch(`/api/market?symbols=${symbols.map(s => encodeURIComponent(s)).join(',')}`);
  if (!res.ok) throw new Error(`Market API error: ${res.status}`);
  const data = await res.json() as { quotes: MarketQuote[] };
  return data.quotes;
}
