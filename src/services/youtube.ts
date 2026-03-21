export interface YouTubeVideo {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  published: string;
  author: string;
  views: number;
}

export interface YouTubeSearchOption {
  id: string;
  query: string;
  lang: string;
}

export async function fetchYouTubeVideos(query = 'OSINT live'): Promise<{ videos: YouTubeVideo[]; searches: YouTubeSearchOption[] }> {
  const res = await fetch(`/api/youtube?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);
  const data = await res.json() as { videos: YouTubeVideo[]; searches: YouTubeSearchOption[] };
  return { videos: data.videos ?? [], searches: data.searches ?? [] };
}
