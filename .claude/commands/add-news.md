---
description: 대전 화재 뉴스를 data/daejeon-fire/news.json에 추가
argument-hint: <뉴스 제목 또는 JSON>
allowed-tools: [Bash(node:*), Read, Write, WebSearch, WebFetch]
---

# 대전 화재 뉴스 추가 스킬

에이전트가 수집한 뉴스를 `data/daejeon-fire/news.json`에 추가한다.

## 인자

$ARGUMENTS

## 작업 절차

### 1. 인자 해석

인자가 주어진 경우:
- 뉴스 제목이나 키워드가 주어지면 → 웹 검색 후 결과를 추가
- JSON이 주어지면 → 바로 파일에 추가
- "summary" 또는 "요약"이 포함되면 → 요약 업데이트 모드
- 인자가 없으면 → 아래 기본 검색 키워드로 검색

### 2. 뉴스 검색 (인자가 키워드이거나 없는 경우)

다음 키워드들로 웹 검색을 수행한다:
- `대전 화재 2026`
- `대전 불 오늘`
- `대전 산불`
- `대전 화재 피해`

WebSearch 도구로 검색하고, 결과에서 다음을 추출:
- title: 기사 제목
- link: 기사 URL
- source: 언론사 이름
- description: 기사 요약 (200자 이내)
- pubDate: 발행 시각 (ISO 8601)
- severity: critical(속보/긴급), high(주요 진전), medium(일반), low(배경 정보)
- tags: 관련 태그 배열
- agentNote: 에이전트의 한 줄 분석

### 3. 파일에 추가

수집한 뉴스를 스크립트를 통해 추가한다:

```bash
node scripts/add-news.mjs --json '<수집한 뉴스 JSON 배열>'
```

**단일 항목 추가** (간단한 경우):
```bash
node scripts/add-news.mjs --title "제목" --link "URL" --source "출처" --description "설명" --severity medium --tags "대전,화재" --agent-note "분석 내용"
```

**요약 업데이트**:
```bash
node scripts/add-news.mjs --update-summary --situation "현재 상황" --casualties "인명 피해" --response "대응 현황" --outlook "향후 전망"
```

### 4. 결과 보고

추가된 뉴스 수, 중복 스킵 수, 전체 아이템 수를 보고한다.

### 5. 요약 갱신

새 뉴스를 추가한 후, 전체 뉴스를 종합하여 summary를 업데이트한다:
- 현재 `data/daejeon-fire/news.json`의 items를 읽고
- situation, casualties, response, outlook을 최신 정보로 갱신

## 데이터 스키마

```json
{
  "id": "agent-1710901800000-xxx",
  "title": "기사 제목",
  "link": "https://...",
  "pubDate": "2026-03-20T13:00:00+09:00",
  "source": "연합뉴스",
  "description": "기사 요약...",
  "category": "breaking|news|analysis|international",
  "lang": "ko|en",
  "severity": "critical|high|medium|low",
  "tags": ["대전", "화재"],
  "agentNote": "에이전트 분석 한 줄"
}
```

## severity 판단 기준

| severity | 기준 |
|----------|------|
| critical | 속보, 사망/부상, 대피 명령, 폭발, 화재 급확산 |
| high     | 진화 현황 변화, 피해 규모 업데이트, 정부 대응 |
| medium   | 일반 보도, 현장 상황 전달 |
| low      | 배경 정보, 관련 기존 사건, 해설 기사 |

## 주의사항

- 중복 기사 자동 제거 (같은 title 또는 link)
- 최대 200개 아이템 유지
- JSON은 반드시 유효해야 함
- pubDate는 ISO 8601 형식 필수
