// Picture Hunt — Cloudflare Worker Proxy
// Forwards image recognition requests to Gemini API with the key stored server-side
// Deploy: npx wrangler deploy
// Set secret: npx wrangler secret put GEMINI_API_KEY

const MODELS = [
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent',
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
];

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
      let lastError = null;

      for (const modelUrl of MODELS) {
        try {
          const url = `${modelUrl}?key=${env.GEMINI_API_KEY}`;
          const geminiResp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: body
          });

          // If OK or client error (4xx), return immediately — only retry on 5xx
          if (geminiResp.status < 500) {
            const data = await geminiResp.text();
            return new Response(data, {
              status: geminiResp.status,
              headers: { ...headers, 'Content-Type': 'application/json' }
            });
          }

          // 5xx — try next model
          const errText = await geminiResp.text();
          lastError = new Error(`Model ${modelUrl.split('models/')[1].split(':')[0]} returned ${geminiResp.status}: ${errText}`);
          console.error(lastError.message);
        } catch (fetchErr) {
          lastError = fetchErr;
          console.error('Fetch error for', modelUrl, fetchErr.message);
        }
      }

      // All models failed
      return new Response(JSON.stringify({ error: lastError ? lastError.message : 'All models failed' }), {
        status: 502, headers: { ...headers, 'Content-Type': 'application/json' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Proxy error: ' + err.message }), {
        status: 500, headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }
  }
};
