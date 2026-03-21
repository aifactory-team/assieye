/**
 * topics.mjs — 주제별 수집 설정
 */

export const TOPICS = {
  'daejeon-fire': {
    name: '대전 화재',
    queries: [
      '대전 화재',
      '대전 공장 화재',
      '대전 대덕구 화재',
      '대전 문평동',
      '#대전화재',
      'Daejeon fire',
    ],
    snsQueries: ['대전 화재', '대전 공장 화재', '대전 대덕구 화재'],
    googleNewsQuery: '%EB%8C%80%EC%A0%84+%ED%99%94%EC%9E%AC',
    naverNewsQuery: '%EB%8C%80%EC%A0%84+%ED%99%94%EC%9E%AC',
    youtubeQuery: '%EB%8C%80%EC%A0%84+%ED%99%94%EC%9E%AC',
    keywords: ['화재', '대전', '공장', '소방', '문평동', '대덕구', '불'],
  },
  'bts-concert': {
    name: 'BTS 광화문 콘서트',
    queries: [
      'BTS 광화문 콘서트',
      'BTS 광화문',
      'BTS Gwanghwamun concert',
      '방탄소년단 광화문',
      '#BTS광화문',
      '#BTSconcert',
      'BTS comeback concert',
    ],
    snsQueries: ['BTS 광화문 콘서트', 'BTS Gwanghwamun', '방탄소년단 광화문'],
    googleNewsQuery: 'BTS+%EA%B4%91%ED%99%94%EB%AC%B8+%EC%BD%98%EC%84%9C%ED%8A%B8',
    naverNewsQuery: 'BTS+%EA%B4%91%ED%99%94%EB%AC%B8+%EC%BD%98%EC%84%9C%ED%8A%B8',
    youtubeQuery: 'BTS+%EA%B4%91%ED%99%94%EB%AC%B8+%EC%BD%98%EC%84%9C%ED%8A%B8',
    keywords: ['BTS', '방탄소년단', '광화문', '콘서트', '공연', 'concert', 'Gwanghwamun'],
  },
};
