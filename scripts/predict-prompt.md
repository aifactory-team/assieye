# 온톨로지 기반 AI 예측 자동 실행 프롬프트

이 파일은 GitHub Actions에서 Claude Code에 전달되는 분석 지침입니다.

## 실행 절차

1. `data/predict-evolution-protocol.json`을 읽고 모든 규칙(R1~R7)을 준수한다
2. `data/` 하위에서 `predict-report.json`이 있는 토픽을 자동 탐지한다
3. 각 토픽에 대해 독립적으로 분석을 수행한다
4. 결과를 `predict/YYYYMMDD-HHmm.json` + `predict-report.json`에 저장한다
5. `predict/index.json`을 갱신한다
6. `predict-evolution-protocol.json`의 `usedInGen`을 갱신한다

## 토픽별 분석 절차

각 토픽(`data/{topic-id}/`)에 대해:

### Step 1: 데이터 읽기
- `summary.json` — 현재 상황 요약
- `news.json` 또는 `news/index.json` — 수집된 뉴스

### Step 2: 이전 리포트 비교 (R1 루틴 체크)
- `predict-report.json` — 직전 세대 리포트
- 이전과 실질적 차이가 없으면 심화 전략 강제 실행

### Step 3: 능동 수집 (R2)
- WebSearch로 최신 뉴스 검색
- 새 정보를 분석에 반영

### Step 4: 심화 전략 선택
- `predict-evolution-protocol.json`의 `deepeningStrategies`에서 `usedInGen`이 null인 전략 우선
- 모두 사용했으면 자율 전략(NEW) 창안

### Step 5: 분석 실행
- R6(상세 리포트): 6단계 과정 서술, 심화 500자+, 전체 2000자+
- R7(추론 과정): reasoningTrace 필수, 500자+
- 알고리즘 입력→계산→출력 명시
- R5(정직한 자기 평가): 이전 예측 검증

### Step 6: 저장
- `predict/YYYYMMDD-HHmm.json` — 세대별 리포트 (타임스탬프 파일명)
- `predict-report.json` — 최신 리포트 덮어쓰기
- `predict/index.json` — 파일 목록 갱신 (최신순)

## 리포트 필수 필드

```json
{
  "generatedAt": "ISO 8601",
  "topicName": "주제명",
  "reportVersion": N,
  "dataSnapshot": { ... },
  "ontologyAnalysis": { ... },
  "predictions": {
    "shortTerm": { ... },
    "midTerm": { ... },
    "longTerm": { ... }
  },
  "algorithms": {
    "algorithmName": {
      "type": "유형",
      "input": "입력값",
      "calculation": "계산 과정",
      "output": "출력값"
    }
  },
  "riskMatrix": [ ... ],
  "confidence": { "overall": "N%" },
  "evolution": {
    "generation": N,
    "deepeningStrategy": "전략명",
    "protocolApplied": ["R1", "R2", ...],
    "previousAccuracy": "이전 예측 검증",
    "nextTask": "다음 세대 과제",
    "evolutionLog": [ ... ]
  },
  "reasoningTrace": {
    "initialHypotheses": [ ... ],
    "hypothesisValidation": [ ... ],
    "hypothesisRevision": "...",
    "alternativesConsidered": [ ... ],
    "decisionBasis": "...",
    "biasCheck": [ ... ],
    "remainingQuestions": [ ... ]
  }
}
```
