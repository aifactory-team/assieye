export interface FeedSource {
  id: string;
  name: string;
  url: string;
  lang: 'ko' | 'en';
  category: 'policy' | 'international' | 'research' | 'monitoring';
}

export const FEED_SOURCES: FeedSource[] = [
  {
    id: 'forest-news',
    name: '뉴스',
    url: 'https://news.google.com/rss/search?q=%EB%89%B4%EC%8A%A4&hl=ko&gl=KR&ceid=KR:ko',
    lang: 'ko',
    category: 'policy',
  },
  {
    id: 'policy',
    name: '정부 정책',
    url: 'https://www.korea.kr/rss/policy.xml',
    lang: 'ko',
    category: 'policy',
  },
  {
    id: 'climate-news',
    name: '기후·환경 뉴스',
    url: 'https://news.google.com/rss/search?q=%EA%B8%B0%ED%9B%84+%ED%99%98%EA%B2%BD+%EC%82%B0%EB%A6%BC&hl=ko&gl=KR&ceid=KR:ko',
    lang: 'ko',
    category: 'monitoring',
  },
  {
    id: 'wildfire-intl',
    name: 'Wildfire News',
    url: 'https://news.google.com/rss/search?q=wildfire+forest+fire&hl=en&gl=US&ceid=US:en',
    lang: 'en',
    category: 'international',
  },
];
