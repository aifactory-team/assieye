import { getCorsHeaders } from './_cors.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  return new Response(JSON.stringify({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}
