# ForestEye - 산림과학 OSINT 시스템 PRD

## 1. 제품 개요

**ForestEye**는 국립산림과학원(NIFoS)의 산림 연구·정책 수립을 위한 **실시간 산림 공개정보(OSINT) 통합 상황인식 대시보드**다. WorldMonitor의 글로벌 OSINT 아키텍처와 WorldView의 공간지능(Spatial Intelligence) 컨셉을 한국 산림 도메인에 특화시킨다.

**한 문장 정의:** 산림재난·생태·탄소·병해충·정책을 하나의 지도 위에서 실시간 모니터링하고, AI가 분석·요약·경보하는 산림과학 통합 플랫폼.

---

## 2. 문제 정의

| 문제 | 현재 상황 | ForestEye 해결 |
|------|----------|---------------|
| 산불 정보 분산 | 산림청, NASA FIRMS, VIIRS, 기상청 등 개별 확인 | 단일 대시보드에 실시간 열점(hotspot) + 기상 + 지형 통합 |
| 병해충 조기감지 어려움 | 현장조사 의존, 위성영상 별도 분석 | 위성(Sentinel-2, Landsat) NDVI 이상탐지 자동화 |
| 탄소흡수원 모니터링 분절 | NFI(국가산림자원조사) 주기적, 실시간 아님 | 원격탐사 + AI 기반 연속 바이오매스 추정 |
| 산림정책 OSINT 부재 | 국내외 산림 논문·뉴스·정책 수동 수집 | 170+ 피드 자동 수집, AI 요약·번역 |
| 기후변화 영향 파악 지연 | 기상·식생·생태 데이터가 각각 다른 시스템 | 통합 시계열 분석 + 이상탐지 경보 |

---

## 3. 타겟 사용자

| 페르소나 | 역할 | 핵심 니즈 |
|---------|------|----------|
| 산림재난 담당관 | 산불·산사태 대응 | 실시간 열점, 기상, 확산 예측, 대피경로 |
| 산림병해충 연구원 | 병해충 감시·방제 | NDVI 이상, 소나무재선충 발생현황, 확산 모델 |
| 탄소중립 연구원 | 탄소흡수원 평가 | 바이오매스 변화, LULUCF 모니터링 |
| 산림정책 기획관 | 정책 수립·국제협력 | 글로벌 산림정책 동향, 논문 트렌드, 법규 변화 |
| 생태계 연구원 | 생물다양성·생태 | 식생변화, 기후대 이동, 보호지역 모니터링 |

---

## 4. 시스템 아키텍처

```
+-----------------------------------------------+
|              ForestEye Frontend                |
|  (Preact + TypeScript + Vite)                  |
|                                                |
|  +----------+  +-----------+  +-------------+  |
|  | 3D Globe |  | Flat Map  |  | Dashboard   |  |
|  | globe.gl |  | deck.gl + |  | Panels      |  |
|  | Three.js |  | MapLibre  |  | (AI Brief,  |  |
|  +----------+  +-----------+  |  Feeds,     |  |
|                               |  Charts)    |  |
|                               +-------------+  |
+--------------------+---+-----------------------+
                     |   |
            Vercel Serverless API
                     |   |
    +----------------+---+------------------+
    |                |                      |
+---v----+   +------v-------+   +----------v---------+
| 산림재난 |   | 생태·식생    |   | 정책·연구 OSINT     |
| API     |   | API          |   | API                 |
+---------+   +--------------+   +---------------------+
| FIRMS   |   | Sentinel Hub |   | 산림청 RSS          |
| VIIRS   |   | GEE NDVI     |   | KFS OpenData        |
| 기상청   |   | NFI OpenData |   | arXiv forestry      |
| KWMS    |   | GBIF         |   | FAO/UNFF feeds      |
| 산림청   |   | eBird Korea  |   | Google Scholar      |
| 산사태DB |   | iNaturalist  |   | 환경부 보도자료     |
+---------+   +--------------+   +---------------------+
```

---

## 5. 핵심 기능 모듈

### 5.1 산림재난 모니터링 (Fire & Disaster)

**데이터 소스:**
- NASA FIRMS (Fire Information for Resource Management System) - 실시간 열점
- VIIRS/MODIS 활성 화재 데이터
- 기상청 AWS (자동기상관측소) - 풍속, 습도, 강수
- 산림청 산불위험예보 API
- 산사태 위험지역 DB
- KWMS (Korea Weather Monitoring System) 실황

**기능:**
- 실시간 열점 지도 오버레이 (15분 간격 업데이트)
- 산불 확산 시뮬레이션 (풍향·풍속·지형·연료량 기반)
- 산불위험지수(DWI) 히트맵
- 산사태 위험등급 지도
- AI 위험도 판단 + 자동 알림 (텔레그램/슬랙)
- 과거 산불 이력 타임라인 오버레이

### 5.2 산림생태·식생 모니터링 (Ecology & Vegetation)

**데이터 소스:**
- Copernicus Sentinel-2 (10m 해상도, NDVI/EVI)
- Landsat 8/9 (30m, 열적외선 포함)
- Google Earth Engine (GEE) 처리된 식생지수
- 국가산림자원조사(NFI) 공개 데이터
- GBIF (Global Biodiversity Information Facility) 한반도 데이터
- eBird Korea / iNaturalist 관측 데이터
- 산림유전자원부 생명정보

**기능:**
- NDVI/EVI 시계열 분석 (월별·계절별 식생 활력도 변화)
- 이상탐지: 정상 범위 벗어난 식생 변화 자동 감지
- 수종 분포 지도 + 기후대 이동 시뮬레이션
- 보호지역(국립공원, 산림유전자원보호구역) 식생 변화 추적
- 난대·아열대 북상 경계선 모니터링
- 생물다양성 핫스팟 시각화

### 5.3 병해충 감시 (Pest & Disease)

**데이터 소스:**
- 산림청 소나무재선충병 발생현황 API
- 산림병해충 예찰 데이터
- Sentinel-2 적색 변색 감지 (Red-edge 밴드)
- 드론 영상 연계 (향후)

**기능:**
- 소나무재선충병 발생지 클러스터 맵 + 확산 벡터
- 위성 Red-edge 밴드 기반 고사목 조기 탐지
- 병해충 확산 예측 모델 시각화
- 방제 현황 오버레이
- 계절별 병해충 발생 트렌드 차트

### 5.4 탄소·기후 모니터링 (Carbon & Climate)

**데이터 소스:**
- Global Forest Watch (GFW) 산림면적 변화
- 산림청 탄소흡수량 통계
- OCO-2/OCO-3 CO2 농도 위성
- 기상청 기후변화 시나리오 (SSP)
- LULUCF (토지이용 변화) 데이터

**기능:**
- 산림 탄소 흡수량 대시보드 (국가 NDC 목표 대비 진척도)
- 산림면적 변화 시계열 (벌채, 재해, 조림)
- 바이오매스 추정 지도 (AI + 원격탐사)
- 기후 시나리오별 산림 영향 시뮬레이션
- 탄소 크레딧 프로젝트 모니터링

### 5.5 산림정책·연구 OSINT (Policy & Research Intelligence)

**데이터 소스:**
- 산림청 보도자료 RSS
- 환경부, 기상청 보도자료
- FAO Forestry RSS
- UNFF (UN Forum on Forests) 문서
- arXiv (q-bio, environmental science)
- Google Scholar alerts (forestry, wildfire, carbon sink)
- IUFRO (국제산림연구기관연합) 뉴스
- 국회 산림 관련 법안·의안

**기능:**
- AI 뉴스 요약 (한/영 자동 번역 + 핵심 요약)
- 정책 트렌드 분석 (키워드 빈도, 토픽 모델링)
- 논문 트렌드 대시보드 (산림 분야 최신 연구 동향)
- 국제 산림협약·협정 타임라인
- 주간 산림과학 AI 브리핑 자동 생성

### 5.6 국유림·현장 관리 (National Forest Management)

**데이터 소스:**
- 국유림관리소 현황 데이터
- 임도 네트워크 GIS
- 등산로 데이터
- 산림치유원·자연휴양림 현황

**기능:**
- 국유림 구역별 현황 대시보드
- 임도 접근성 분석 (재난 시 진입로)
- 방문객 데이터 히트맵 (자연휴양림, 치유의숲)

---

## 6. 지도 엔진 (Dual Map Engine)

WorldMonitor/WorldView 패턴을 따른다.

### 6.1 3D Globe (globe.gl + Three.js)
- 한반도 중심 초기 뷰 (위도 36.5, 경도 127.5)
- 지형 고도 데이터(DEM) 기반 3D 산악 지형 렌더링
- 위성 영상 타일 오버레이 (Sentinel-2 True Color)
- 실시간 열점, 병해충, 기상 데이터 마커
- 계절별 식생 변화 애니메이션

### 6.2 Flat Map (deck.gl + MapLibre GL JS)
- **레이어 토글 (30+ 레이어):**
  - 산불 열점 (ScatterplotLayer)
  - 산불위험지수 히트맵 (HeatmapLayer)
  - 병해충 발생지 클러스터 (IconLayer + Supercluster)
  - NDVI 이상 지역 (GeoJsonLayer)
  - 탄소흡수량 격자 (GridLayer)
  - 보호지역 경계 (PolygonLayer)
  - 산사태 위험지역 (GeoJsonLayer)
  - 기상관측소 (ScatterplotLayer)
  - 국유림 경계 (PolygonLayer)
  - 임도 네트워크 (PathLayer)
- 줌 레벨 적응형 마커 표시
- 주야간 모드 + 적외선(NDVI) 시각화 모드

---

## 7. AI 에이전트 시스템

### 7.1 ForestBrief Agent
- 매일 수집된 산림 뉴스·논문·정책을 AI가 요약
- 산림과학원 연구 분야별 맞춤 브리핑 생성
- 로컬 LLM 지원 (Ollama) + 클라우드 LLM 옵션 (Claude API)

### 7.2 Anomaly Detection Agent
- NDVI 시계열 이상탐지 (Z-score + Isolation Forest)
- 열점 클러스터링 + 비정상 패턴 감지
- 병해충 확산 속도 이상 감지
- 탐지 시 자동 알림 + 상황 요약

### 7.3 Prediction Agent
- 산불 확산 예측 (풍향·지형·연료량 모델)
- 병해충 확산 시뮬레이션
- 계절별 산림 건강도 예측
- 기후 시나리오 기반 장기 예측

### 7.4 Query Agent
- 자연어 질의: "올해 경북 지역 소나무재선충 발생 추이는?"
- RAG 기반 산림과학원 연구보고서 검색
- 시공간 쿼리: "최근 7일간 NDVI가 20% 이상 하락한 지역은?"

---

## 8. 기술 스택

| 계층 | 기술 | 근거 |
|------|------|------|
| Frontend | Preact + TypeScript + Vite | WorldMonitor 동일, 경량·빠른 빌드 |
| 3D Globe | globe.gl + Three.js | 산악 지형 3D 렌더링 |
| Flat Map | deck.gl + MapLibre GL JS | 30+ 레이어 고성능 렌더링 |
| API | Vercel Serverless Functions | WorldMonitor 동일, 무료 호스팅 |
| 원격탐사 | Google Earth Engine API | 위성 데이터 처리·분석 |
| AI/ML | Claude API + Ollama (로컬) | 요약·번역·이상탐지 |
| 실시간 | WebSocket + SSE | 산불 경보, 기상 업데이트 |
| 데이터 캐시 | Upstash Redis | API 레이트리밋 + 캐싱 |
| DB | Convex (실시간 sync) | 사용자 설정, 관심지역 |
| 데스크톱 | Tauri | 오프라인 지원 네이티브 앱 |
| 알림 | Telegram Bot + Slack Webhook | 재난 경보 즉시 전달 |

---

## 9. 데이터 소스 총괄

### 산림재난
| 소스 | 데이터 | 주기 | 형식 |
|------|--------|------|------|
| NASA FIRMS | 활성 화재 열점 | 15분 | GeoJSON/CSV |
| VIIRS I-Band 375m | 열적외 화재탐지 | NRT | CSV |
| 기상청 API Hub | 기온, 풍속, 습도, 강수 | 1시간 | JSON |
| 산림청 산불위험예보 | 산불위험지수 | 1일 | API |
| 산사태정보시스템 | 위험등급 | 실시간 | API |

### 생태·식생
| 소스 | 데이터 | 주기 | 형식 |
|------|--------|------|------|
| Copernicus Open Access Hub | Sentinel-2 L2A | 5일 | SAFE/COG |
| USGS EarthExplorer | Landsat 8/9 | 16일 | GeoTIFF |
| Google Earth Engine | 처리된 NDVI/EVI | on-demand | TileLayer |
| GBIF | 종 관측 기록 | daily | JSON |
| 국가산림자원조사 | 임상도, 영급, 축적 | 5년 주기 | SHP/GeoJSON |

### 정책·연구
| 소스 | 데이터 | 주기 | 형식 |
|------|--------|------|------|
| 산림청 보도자료 | 정책 뉴스 | daily | RSS |
| FAO Forestry | 글로벌 산림 뉴스 | daily | RSS |
| arXiv | 산림 관련 논문 | daily | Atom |
| Global Forest Watch | 산림 손실/이득 | weekly | API |
| 국회 의안정보 | 산림 법안 | event-driven | API |

---

## 10. MVP 범위 (Phase 1)

**목표:** 3개월 내 산불 모니터링 + 정책 OSINT 데모 배포

| 우선순위 | 기능 | 완료 기준 |
|---------|------|----------|
| P0 | 듀얼 맵 엔진 (한반도 중심) | 3D globe + flat map 전환 동작 |
| P0 | NASA FIRMS 실시간 열점 | 15분 간격 자동 갱신, 지도 오버레이 |
| P0 | 기상 데이터 통합 | 기상청 API 연동, 풍향·풍속 오버레이 |
| P0 | 산림정책 RSS 수집 | 산림청 + FAO + 환경부 피드 통합 |
| P1 | AI 뉴스 요약 | Claude API 기반 한/영 요약 |
| P1 | 산불위험지수 히트맵 | DWI 데이터 시각화 |
| P1 | 산사태 위험 레이어 | 위험등급 지도 오버레이 |
| P1 | 텔레그램 경보 | 열점 감지 시 자동 알림 |
| P2 | Sentinel-2 NDVI 레이어 | GEE 연동, 식생 변화 시각화 |
| P2 | 병해충 현황 레이어 | 산림청 데이터 연동 |
| P2 | AI 브리핑 생성 | 주간 산림과학 리포트 자동화 |

---

## 11. Phase 2 확장

- 소나무재선충 AI 조기탐지 (Sentinel-2 Red-edge)
- 탄소흡수량 대시보드 (NDC 진척도)
- 드론 영상 실시간 연계
- 산불 확산 시뮬레이션 (FARSITE 알고리즘)
- 기후 시나리오 산림 영향 시각화
- 다국어 지원 (영/중/일 - 국제협력용)
- Tauri 데스크톱 앱 배포
- RAG 기반 산림과학원 보고서 검색

---

## 12. 성공 지표

| 지표 | 목표 |
|------|------|
| 산불 탐지 → 대시보드 표시 지연 | < 30분 (NASA FIRMS NRT 기준) |
| NDVI 이상탐지 정확도 | F1 > 0.8 |
| AI 뉴스 요약 커버리지 | 산림 관련 국내외 뉴스 90%+ |
| 동시 레이어 렌더링 성능 | 10+ 레이어 활성 시 30fps+ |
| 정책 OSINT 피드 수 | 100+ 소스 |
| 경보 → 담당자 전달 시간 | < 5분 |

---

## 13. 프로젝트 네이밍

- **시스템명:** ForestEye (산림의 눈)
- **코드명:** assieye (현재 리포 이름 유지)
- **태그라인:** "산림을 보는 지능, 산림을 지키는 과학"

---

## 14. 참조 프로젝트

| 프로젝트 | 참조 포인트 |
|---------|------------|
| WorldMonitor | OSINT 대시보드 아키텍처, RSS 수집, 듀얼 맵, AI 요약, Vercel 배포 |
| WorldView | 공간지능 컨셉, 위성 데이터 시각화, 3D 지구본 UX, 센서 퓨전 |
| Global Forest Watch | 산림 손실/이득 데이터, 산불 경보 기능 벤치마크 |
| NASA FIRMS | 실시간 열점 데이터 수집 패턴 |
