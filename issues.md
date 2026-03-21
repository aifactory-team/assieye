# AssEye 이슈 목록

## ISSUE-001: 산불 핫스팟이 일본 영역에 표시됨 [HIGH]
- **상태**: 수정완료
- **현상**: korea-forest 토픽에서 일본 규슈/쓰시마 지역의 산불 데이터가 지도에 표시됨
- **원인**:
  1. FIRMS API 기본 bbox가 `124,33,132,43`으로 동경 132°까지 포함 (일본 규슈 포함)
  2. `isKoreaLand()` 일본 제외 로직에 갭 존재 (위도 35-36°, 경도 129-130.5° 구간)
  3. `fetchFireHotspots()` 호출 시 radius=5 → bbox 동쪽 132.5°E까지 확장
- **수정**:
  - `api/firms.js`: 기본 bbox `124,33,130,43`으로 축소, `isKoreaLand()` 동쪽 130°E 하드 컷오프 추가
  - `src/App.ts`: korea-forest일 때 radius 5→3 축소
  - `src/config/topics/korea-forest.ts`: `dataCenter` 필드 추가

## ISSUE-002: DWI(산불위험지수) 히트맵이 바다에 표시됨 [HIGH]
- **상태**: 수정완료
- **현상**: 서해안/남해안/동해안에서 산불위험지수 색상이 바다 위에 렌더링됨
- **원인**:
  1. `api/dwi.js`의 `isKoreaLand()` 함수가 단순 사각형 영역으로 정의, 해안선 추적 불충분
  2. `FlatMap.ts` HeatmapLayer의 `radiusPixels: 40`이 해안가 포인트에서 바다 방향으로 번짐
- **수정**:
  - `api/dwi.js`: `isKoreaLand()` 전면 재작성 — 위도 0.5° 단위로 동서 경계 세분화, 동쪽 130°E 하드컷
  - `src/components/FlatMap.ts`: `radiusPixels` 40→25, `threshold` 0.1→0.15

## ISSUE-003: 3D 지구본에 거대한 육각형 객체 표시됨 [HIGH]
- **상태**: 수정완료
- **현상**: Globe 모드에서 위성/항공기가 거대한 파란색 육각형 3D 기둥으로 렌더링됨
- **원인**:
  1. `pointAltitude` 값이 커서 3D 기둥이 지구 표면에서 크게 돌출
  2. `ringsData`로 위성 커버리지 링이 큰 반경으로 표시
- **수정**:
  - `src/components/GlobeMap.ts`: 항공기 pointAltitude 0.001로 평탄화, pointRadius 0.15로 축소
  - 위성 ringsData 완전 제거, 라벨만 유지

## ISSUE-004: 2D 지도에 거대한 위성 스와스 폴리곤 표시됨 [HIGH]
- **상태**: 수정완료
- **현상**: Flat Map에서 위성 관측범위가 거대한 파란 다각형으로 한반도를 덮음
- **원인**: `PolygonLayer`로 `satSwath()` 렌더링 (halfWidth 1.5~8도)
- **수정**:
  - `src/components/FlatMap.ts`: PolygonLayer/IconLayer 제거, ScatterplotLayer 점으로 대체
  - `satSwath()`, `satOrbitTrack()`, `clampLat()`, `createIconAtlas()` 등 미사용 코드 삭제

## ISSUE-005: 지도가 완전히 안 보이는 경우 발생 [HIGH]
- **상태**: 수정완료
- **현상**: 평면 지도/3D 지구본 모두 빈 화면만 표시됨
- **원인**: GlobeMap 생성자에서 `Globe()` 체인에 `onRingClick` 등 미지원 메서드 포함 시 무음 실패
- **수정**:
  - `src/components/GlobeMap.ts`: 클릭 핸들러를 체인에서 분리, 개별 try-catch
  - `src/components/MapContainer.ts`: `createActiveMap()`에 try-catch 추가

## ISSUE-006: FIRMS 지역명이 좌표값으로 표시됨 [MEDIUM]
- **상태**: 수정완료
- **현상**: 경보 이력에서 "34.8,127.9" 같은 좌표 형식이 지역명 대신 표시됨
- **원인**: bbox 파라미터 사용 시 `getKoreaRegion()` 미적용, `parseFirmsCsv()`에서 좌표 형식 region 설정
- **수정**: `api/firms.js`에서 bbox 여부와 무관하게 한국 좌표는 `getKoreaRegion()` 적용

## ISSUE-007: DWI API 502 에러 (Open-Meteo 타임아웃) [MEDIUM]
- **상태**: 수정완료
- **현상**: DWI 데이터 로딩 실패, 502 응답
- **원인**: `buildGrid()`가 수백 개 좌표를 한 URL로 Open-Meteo API에 전송 → URL 길이 초과
- **수정**: `api/dwi.js`에서 50개 단위 배치 처리, 배치별 에러 핸들링

## ISSUE-008: 지도 베이스맵이 너무 어두움 [LOW]
- **상태**: 수정완료
- **현상**: 평면 지도의 배경이 거의 검정색으로 지형/해안선 구분이 어려움
- **원인**: CARTO dark-matter 스타일이 물/육지 모두 거의 검정색
- **수정**:
  - `src/components/FlatMap.ts`: `enhanceMapVisibility()` 메서드 추가
  - CARTO 레이어 ID 기반으로 물(#0a1a2e), 육지(#1a2a1a), 경계선(#4a7a4a) 색상 조정
  - 네트워크 차단 시에는 타일 자체가 안 보여 효과 미확인 (ISSUE-011 참조)

## ISSUE-009: 위성/항공기 레이어가 활성화되어도 지도에 안 보임 [LOW]
- **상태**: 수정완료
- **현상**: 레이어 토글에서 위성/항공기 체크했으나 지도에서 점이 잘 안 보임
- **원인**: ScatterplotLayer의 `radiusMinPixels: 4`가 줌아웃 시 너무 작음
- **수정**:
  - `src/components/FlatMap.ts`: 위성/항공기 radiusMinPixels 4→6, radiusMaxPixels 8→12
  - 불투명도 증가, 외곽선 두께 1→1.5px

## ISSUE-010: 항공기 데이터에 일본/중국 항공편 포함 [LOW]
- **상태**: 수정완료
- **현상**: korea-forest 토픽에서 일본/중국 발착 항공편이 목록에 표시됨
- **원인**: OpenSky API bbox가 FIRMS와 동일하게 넓게 설정, 국적 필터링 없음
- **수정**:
  - `src/App.ts`: korea-forest일 때 flights bbox radius 5→3 축소
  - `api/flights.js`: 기본 KOREA_BBOX 동경 132→130 축소
  - `api/flights.js`: 데모 데이터 국적 비율 조정 (한국 비중 증가)

## ISSUE-011: CARTO 벡터 타일(.pbf) 로딩 실패 [HIGH]
- **상태**: 수정완료
- **현상**: 지도 영역이 완전히 검은색, 지명/도로/해안선 등 아무것도 안 보임
- **원인**: `tiles.basemaps.cartocdn.com`의 .pbf 벡터 타일만 네트워크 차단 (래스터는 정상)
- **수정**:
  - `src/components/FlatMap.ts`: 맵 생성 전 벡터 타일 접근 가능 여부 probe (3초 타임아웃)
  - 실패 시 CARTO 래스터 타일(`dark_all/{z}/{x}/{y}@2x.png`) 폴백 스타일 자동 적용
  - `probeAndCreateMap()`, `createMap()` 메서드 분리
- **검증**: 브라우저에서 래스터 폴백으로 지도 정상 표시 확인

## ISSUE-012: 기상 관측소가 1개만 표시됨 [MEDIUM]
- **상태**: 미수정
- **현상**: 기상 현황 패널에 서울 1개 관측소만 표시 (20개 중)
- **브라우저 확인**: 패널에 서울만 보이고 춘천/대구 등 누락
- **가능 원인**: 기상 API 응답에서 일부 관측소 데이터 누락 또는 패널 렌더링 제한
- **파일**: `api/weather.js`, `src/components/panels/WeatherPanel.ts`
