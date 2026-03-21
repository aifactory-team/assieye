import { getCorsHeaders, isDisallowedOrigin } from './_cors.js';
import { checkRateLimit } from './_rate-limit.js';

export const config = { runtime: 'edge' };

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
    const { text, lang: langRaw, mode, systemPrompt } = body;
    const lang = langRaw || 'ko';

    if (!text) {
      return new Response(JSON.stringify({ error: 'Missing text field' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    let prompt;
    if (systemPrompt) {
      // Use the caller-supplied system prompt, appending the text
      prompt = `${systemPrompt}\n\n${text}`;
    } else if (mode === 'brief') {
      prompt = lang === 'ko'
        ? `다음 뉴스들을 종합하여 간결한 일일 브리핑을 작성해주세요. 주요 이슈, 동향 변화, 시사점 섹션으로 나누세요. 한국어로 작성하세요.\n\n${text}`
        : `Summarize the following news into a concise daily brief. Sections: Key Issues, Trend Changes, Implications.\n\n${text}`;
    } else {
      prompt = lang === 'ko'
        ? `다음 기사를 2-3문장으로 핵심 내용을 요약해주세요. 한국어로 작성하세요.\n\n${text}`
        : `Summarize the following article in 2-3 sentences.\n\n${text}`;
    }

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: mode === 'brief' ? 1000 : 500,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      throw new Error(`Claude API error: ${claudeRes.status} ${errText}`);
    }

    const result = await claudeRes.json();
    const summary = result.content?.[0]?.text || '';

    return new Response(JSON.stringify({ summary, mode, lang }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to generate summary', detail: err.message }), {
      status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}
