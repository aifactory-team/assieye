import { getCorsHeaders, isDisallowedOrigin } from './_cors.js';
import { checkRateLimit } from './_rate-limit.js';

export const config = { runtime: 'edge' };

const ONTOLOGY_SYSTEM_PROMPT = `당신은 자기 진화형 상황 예측 분석 시스템입니다.

## 핵심 원칙: 매 턴 자기 진화

당신은 매번 동일한 분석을 반복하지 않습니다. 매 턴마다:
1. 이전 예측의 정확도를 자가 평가합니다
2. 부족했던 분석 차원을 식별하고 이번 턴에 새로 추가합니다
3. 예측 방법론 자체를 개선합니다
4. 다음 턴을 위한 진화 과제를 설정합니다

## 분석 관점 (기본 5가지 + 매 턴 확장)

기본 관점:
1. 사건 진행 흐름 — 현재 단계, 다음 예상
2. 공간적 영향 — 피해 범위, 확산, 주변 영향
3. 투입 자원 — 대응 적정성, 추가 필요
4. 인명 피해 — 현황, 추이, 구조 가능성
5. 추가 위험 — 2차 피해, 유해물질, 환경

매 턴마다 다음 중 하나 이상의 새 분석 차원을 추가하세요:
- 여론·미디어 동향 분석
- 경제적 파급효과 추정
- 유사 사례 비교 분석
- 의사결정 트리 (분기점별 시나리오)
- 시간-확률 곡선 (시간 경과에 따른 핵심 변수 변화)
- 이해관계자 영향 맵
- 정책적 시사점
- 심리·사회적 영향
- 국제 비교 관점
- 데이터 신뢰도 메타 분석
- 또는 상황에 맞는 독자적인 새 차원을 창안

## 출력 형식

자연스러운 한국어로 작성하세요. 뉴스 브리핑처럼 읽기 쉽게.

**[현재 상황 평가]**
핵심 사실과 근거 2~3문장

**[이전 예측 검증]** ← 2턴차부터
이전 예측 중 맞은 것, 틀린 것, 확인 불가한 것을 정직하게 평가

**[단기 전망 (30분~2시간)]**
시나리오별 전개와 확률, 핵심 변수

**[중기 전망 (2시간~12시간)]**
시간순 예상 경로, 마일스톤, 추가 위험

**[장기 전망 (12시간~72시간)]**
종료 조건, 사회적·환경적 영향, 권고

**[이번 턴 새로운 분석]** ← 매 턴 새 차원
이번 턴에 새로 추가한 분석 관점과 그 결과

**[위험 요소 정리]**
발생 가능성·영향도·추이 변화

**[예측 신뢰도]**
전반적 신뢰도, 정보 부족 영역

**[자기 진화 로그]** ← 필수
- 이번 턴 개선점: 무엇을 새로 추가/개선했는가
- 이전 대비 발전: 어떤 면에서 이전보다 나아졌는가
- 다음 턴 과제: 다음에 추가할 분석 차원이나 개선할 점
- 진화 세대: N세대 (매 턴 +1)`;


export default async function handler(req) {
  const corsHeaders = getCorsHeaders(req, 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  if (isDisallowedOrigin(req)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  const rateLimited = await checkRateLimit(req, corsHeaders);
  if (rateLimited) return rateLimited;

  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Claude API key not configured' }), {
      status: 503, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  try {
    const body = await req.json();
    const { situationData, topicName, previousReport, evolutionGen } = body;

    if (!situationData) {
      return new Response(JSON.stringify({ error: 'Missing situationData field' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const gen = (evolutionGen || 0) + 1;
    let prevContext = '';
    if (previousReport) {
      prevContext = `

## 이전 예측 리포트 (${gen - 1}세대):
${typeof previousReport === 'string' ? previousReport : JSON.stringify(previousReport).substring(0, 2000)}

위 이전 예측을 검증하고, 부족했던 점을 개선하세요. 이번은 ${gen}세대 리포트입니다.`;
    }

    const userPrompt = `## 분석 대상: ${topicName || '상황'}
## 진화 세대: ${gen}세대

## 현재 수집된 상황 데이터:
${situationData}
${prevContext}

위 데이터를 분석하고, ${gen > 1 ? '이전 예측을 검증·개선하여 ' : ''}예측 리포트를 작성하세요.
현재 시각: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`;

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: ONTOLOGY_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      throw new Error(`Claude API error: ${claudeRes.status} ${errText}`);
    }

    const result = await claudeRes.json();
    const report = result.content?.[0]?.text || '';

    return new Response(JSON.stringify({
      report,
      generatedAt: new Date().toISOString(),
      topicName,
      evolutionGen: gen,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to generate prediction', detail: err.message }), {
      status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}
