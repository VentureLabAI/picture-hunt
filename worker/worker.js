// Picture Hunt — Cloudflare Worker Proxy
// Forwards image recognition requests to Gemini API with the key stored server-side
// Deploy: npx wrangler deploy
// Set secret: npx wrangler secret put GEMINI_API_KEY

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// Allowed origins (update with your GitHub Pages URL)
const ALLOWED_ORIGINS = [
  'https://venturelabai.github.io',
  'http://localhost',
  'http://127.0.0.1'
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.find(o => origin && origin.startsWith(o));
  return {
    'Access-Control-Allow-Origin': allowed || ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const headers = corsHeaders(origin);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    // Only POST allowed
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'POST only' }), {
        status: 405, headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // Check origin
    const allowed = ALLOWED_ORIGINS.some(o => origin.startsWith(o));
    if (origin && !allowed) {
      return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
        status: 403, headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // Rate limit: basic per-IP (optional, Cloudflare has built-in too)
    try {
      const body = await request.text();
      const url = `${GEMINI_URL}?key=${env.GEMINI_API_KEY}`;

      const geminiResp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body
      });

      const data = await geminiResp.text();
      return new Response(data, {
        status: geminiResp.status,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Proxy error: ' + err.message }), {
        status: 500, headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }
  }
};
