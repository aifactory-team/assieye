# 운영 가이드

## 새 토픽 시작 방법

### 1. 데이터 디렉토리 생성

```bash
mkdir -p data/{topic-id}/predict
```

### 2. 초기 파일 배치

**summary.json** (필수):
```json
{
  "situation": "현재 상황 요약",
  "casualties": "인명 피해 현황",
  "response": "대응 현황",
  "outlook": "향후 전망",
  "lastAnalysis": "2026-03-21T00:00:00Z"
}
```

**predict-report.json** (최소):
```json
{
  "generatedAt": "2026-03-21T00:00:00+09:00",
  "topicName": "주제명",
  "reportVersion": 0,
  "ontologyAnalysis": {},
  "evolution": { "generation": 0 }
}
```

### 3. GitHub Issue 생성

- Issues → New Issue → "New Prediction Topic" 템플릿
- Labels: `predict`, `{topic-id}`, `active`

### 4. 분석 시작

로컬 세션에서:
```
/loop 30m 주제별 독립 온톨로지 기반 AI 예측을 수행한다...
```

또는 수동 실행:
```
data/{topic-id}/의 데이터를 읽고 온톨로지 분석을 수행하라.
```

---

## 매 턴 체크리스트

1. `data/predict-evolution-protocol.json` 읽기
2. 이전 리포트와 현재 데이터 비교
3. 루틴 체크 (R1): 차이 없으면 심화 강제
4. 능동 수집 (R2): WebSearch 실행
5. 심화 전략 선택 (D1~D12 → 자율 NEW)
6. R6 상세 서술 + R7 추론 과정
7. `predict/YYYYMMDD-HHmm.json` 저장
8. `predict-report.json` 덮어쓰기
9. `predict/index.json` 갱신
10. `usedInGen` 갱신

---

## 파일 구조

```
data/
├── predict-evolution-protocol.json  ← 전역 프로토콜 (R1~R7, D1~D12)
├── ontology-domains.json            ← 전역 도메인 정의
├── {topic-id}/
│   ├── summary.json                 ← 현재 상황 요약
│   ├── news.json                    ← 수집된 뉴스
│   ├── predict-report.json          ← 최신 예측 리포트
│   └── predict/
│       ├── index.json               ← 히스토리 파일 목록
│       ├── 20260321-0800.json       ← 세대별 리포트
│       ├── 20260321-0830.json
│       └── ...
```

---

## 신뢰도 관리

| 수준 | 범위 | 의미 | 조치 |
|------|------|------|------|
| GREEN | 70%+ | 정상 분석 | 프로토콜 정상 적용 |
| AMBER | 50~69% | 정보 부족 | 능동 수집 강화 |
| RED | <50% | 정보 부족 모드 | 신규 분석 중단, 모니터링만 |

**신뢰도 회복:** 새 데이터 유입 시 즉시 전면 갱신. 소스 1건당 +10~15% 회복.

---

## 전략 선택 순서

```
1단계: D1~D12 기본 전략 (미사용 우선)
2단계: 기본 전략 소진 → 자율 전략 창안 (NEW)
       - 기존 조합 (D1+D2)
       - 기존 반전 (분석→역설계)
       - 상위 통합 (개별→종합)
       - 인접 분야 (법률·심리·경제)
       - 시스템 자체 (메타·감사)
3단계: Synthesis → Integration → Judgment → Closure
```

---

## GitHub 연동

| 이벤트 | GitHub 조치 |
|--------|-----------|
| 새 토픽 시작 | Issue 생성 + labels |
| 세대 완료 | Issue 댓글 추가 |
| 심화 전략 완료 | Issue 체크리스트 업데이트 |
| Capstone 완료 | Issue Close + `capstone` label |
| 프로토콜 변경 | commit + Release 태깅 |

---

## 향후: GitHub Actions 전환

현재 로컬 세션 → 나중에 Actions 전환 시:
1. `ANTHROPIC_API_KEY`를 Repository Secrets에 등록
2. `.github/workflows/ontology-predict.yml` 이미 준비됨
3. Claude Code CLI가 자동 실행
4. 세션 독립 24/7 운영
