---
name: add-news
description: 대전 화재 뉴스를 data/daejeon-fire/news.json에 추가 (에이전트 간 공유용)
triggers:
  - news
  - 뉴스
  - 대전
  - 화재
  - add-news
argument-hint: "<JSON 또는 키워드> [--summary]"
allowed-tools: [Bash(node:*), Read, Write, WebSearch, WebFetch]
---

# Add News Skill

대전 화재 관련 뉴스를 `data/daejeon-fire/news.json`에 추가한다.
다른 에이전트가 이 스킬을 호출하여 수집한 뉴스를 파일에 저장하면,
AssiEye 대시보드가 주기적으로 이 파일을 읽어 화면에 표시한다.

## When to Activate

- 에이전트가 대전 화재 관련 뉴스를 수집했을 때
- `/add-news` 로 직접 호출될 때
- 뉴스 검색 결과를 저장해야 할 때

## 데이터 파일 위치

```
data/daejeon-fire/news.json
```

## Workflow

### 모드 1: 뉴스 아이템 추가

인자로 JSON 또는 키워드가 주어진 경우:

**Step 1.** 인자 파싱
- JSON 배열/객체 → 바로 추가
- 키워드 → 웹 검색 후 결과를 뉴스 아이템으로 변환

**Step 2.** 스크립트로 추가
```bash
node scripts/add-news.mjs --json '[
  {
    "title": "기사 제목",
    "link": "https://...",
    "pubDate": "2026-03-20T13:00:00+09:00",
    "source": "연합뉴스",
    "description": "기사 요약 200자 이내",
    "severity": "high",
    "tags": ["대전", "화재"],
    "agentNote": "에이전트 분석 한 줄"
  }
]'
```

**개별 항목 추가 (간단한 경우):**
```bash
node scripts/add-news.mjs \
  --title "제목" \
  --link "URL" \
  --source "출처" \
  --description "설명" \
  --severity medium \
  --tags "대전,화재" \
  --agent-note "분석 내용"
```

**Step 3.** 결과 확인 — 스크립트가 JSON으로 결과 출력:
```json
{"ok": true, "added": 3, "skipped": 1, "totalItems": 42, "updateCount": 15}
```

### 모드 2: 요약 업데이트 (`--summary` 인자)

전체 뉴스를 종합하여 상황 요약을 갱신한다:

**Step 1.** 현재 news.json의 items를 읽는다
**Step 2.** 전체 뉴스를 종합 분석하여 요약 작성
**Step 3.** 스크립트로 요약 업데이트:
```bash
node scripts/add-news.mjs \
  --update-summary \
  --situation "현재 상황 요약" \
  --casualties "인명 피해 현황" \
  --response "대응 현황" \
  --outlook "향후 전망"
```

### 모드 3: 검색 + 추가 (인자 없이 호출)

**Step 1.** 다음 키워드로 WebSearch 수행:
- `대전 화재 2026년 3월`
- `대전 불 오늘`
- `대전 산불 속보`
- `Daejeon fire March 2026`

**Step 2.** 검색 결과에서 뉴스 아이템 추출
**Step 3.** 모드 1과 동일하게 추가
**Step 4.** 모드 2와 동일하게 요약 갱신

## 뉴스 아이템 스키마

```json
{
  "id": "자동생성 (agent-timestamp-hash)",
  "title": "기사 제목 (필수)",
  "link": "기사 URL",
  "pubDate": "ISO 8601 형식 (필수)",
  "source": "언론사명",
  "description": "기사 요약 200자 이내",
  "category": "breaking | news | analysis | international",
  "lang": "ko | en",
  "severity": "critical | high | medium | low",
  "tags": ["키워드", "배열"],
  "agentNote": "에이전트의 한 줄 분석"
}
```

## severity 판단 기준

| severity | 기준 | 예시 |
|----------|------|------|
| critical | 속보, 사망/부상, 대피 명령, 폭발, 급확산 | "사망자 발생", "대피 명령 발령" |
| high | 진화 현황 변화, 피해 규모 업데이트, 정부 대응 | "소방 3단계 대응", "피해 규모 확대" |
| medium | 일반 보도, 현장 상황 전달 | "현장 취재", "주민 인터뷰" |
| low | 배경 정보, 관련 기존 사건, 해설 | "과거 화재 비교", "전문가 해설" |

## 스크립트 동작

`scripts/add-news.mjs`가 자동으로 처리하는 것:
- **중복 제거**: 같은 title 또는 link가 있으면 스킵
- **최신순 정렬**: pubDate 기준 내림차순
- **최대 200개 유지**: 오래된 것 자동 삭제
- **메타 갱신**: lastUpdated, updateCount 자동 증가

## Examples

```
# 에이전트가 수집한 뉴스 직접 추가
/add-news [{"title":"대전 유성구 화재 진화 완료","link":"https://...","source":"연합뉴스","severity":"high","tags":["대전","유성구"]}]

# 키워드로 검색 후 추가
/add-news 대전 화재 최신

# 요약만 갱신
/add-news --summary

# 인자 없이 기본 검색
/add-news
```

## Notes

- JSON 문자열에 작은따옴표가 포함된 경우 이스케이프 필요
- 대량 추가 시 JSON 배열로 한 번에 전달하는 것이 효율적
- 스크립트 실행 실패 시 Read/Write 도구로 직접 파일 편집 가능
- 다른 에이전트에서 이 스킬을 참조할 때: `node scripts/add-news.mjs --json '...'` 직접 실행
