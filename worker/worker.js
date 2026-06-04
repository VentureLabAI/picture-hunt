// Picture Hunt — Cloudflare Worker
//
// Two responsibilities:
//   1. POST /              → proxy image-recognition requests to Gemini
//   2. POST /validate-code → check an unlock code against KV, return validity
//
// Deploy: npx wrangler deploy
// Secrets: npx wrangler secret put GEMINI_API_KEY
// KV binding: see wrangler.toml — namespace `UNLOCK_CODES`

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const ALLOWED_ORIGINS = [
  'https://venturelabai.github.io',
  'https://picturehunt.app',
  'https://www.picturehunt.app',
  'http://localhost',
  'http://127.0.0.1'
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.find(o => origin && origin.startsWith(o));
  return {
    'Access-Control-Allow-Origin': allowed || ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-PH-Token',
    'Access-Control-Max-Age': '86400'
  };
}

function jsonResponse(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' }
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const headers = corsHeaders(origin);
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    // Stripe webhook: server-to-server, authenticated by its own signature and
    // carrying no browser Origin — handle BEFORE the Origin/token gate.
    if (url.pathname === '/stripe-webhook') {
      if (request.method !== 'POST') return jsonResponse({ error: 'POST only' }, 405, headers);
      return stripeWebhook(request, env);
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'POST only' }, 405, headers);
    }

    // Browser endpoints below: require a known Origin (deny missing/unknown — a
    // no-Origin POST is curl/server-to-server, not our app) plus the shared
    // client token. This is what stops anonymous abuse of the paid AI proxy.
    if (!origin || !ALLOWED_ORIGINS.some(o => origin.startsWith(o))) {
      return jsonResponse({ error: 'Origin not allowed' }, 403, headers);
    }
    // Token is fail-open when the secret isn't configured, so deploying this
    // before `wrangler secret put PH_PROXY_TOKEN` cannot lock out the app.
    if (env.PH_PROXY_TOKEN) {
      const token = request.headers.get('X-PH-Token') || '';
      if (token !== env.PH_PROXY_TOKEN) {
        return jsonResponse({ error: 'Unauthorized' }, 401, headers);
      }
    }

    if (url.pathname === '/validate-code') {
      return validateCode(request, env, headers);
    }

    if (url.pathname === '/sync-progress') {
      return syncProgress(request, env, headers);
    }

    // Default: AI proxy (rate-limited + size-capped in proxyGemini)
    return proxyGemini(request, env, headers);
  }
};

// ── Gemini proxy ──

async function proxyGemini(request, env, headers) {
  try {
    const body = await request.text();
    // Size cap — a toddler photo as base64 JSON is a few MB; reject anything
    // clearly oversized to blunt payload-abuse of the paid endpoint.
    if (body.length > 8 * 1024 * 1024) {
      return jsonResponse({ error: 'Payload too large' }, 413, headers);
    }
    // Per-IP rate limit so a leaked URL can't drain the Gemini quota. Best-effort
    // (KV is eventually consistent); fails open on any error so real play never
    // breaks. For production-grade limits, add a Cloudflare WAF rate-limit rule.
    if (!(await rateLimitOk(request, env))) {
      return jsonResponse({ error: 'Too many requests — slow down a moment.' }, 429, headers);
    }
    const apiUrl = `${GEMINI_URL}?key=${env.GEMINI_API_KEY}`;
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    });
    const data = await resp.text();
    return new Response(data, {
      status: resp.status,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return jsonResponse({ error: 'Proxy error: ' + err.message }, 500, headers);
  }
}

// Best-effort per-IP rate limit using KV minute-buckets. Generous (60/min) so a
// real child is never throttled; fails open if KV is unbound or errors.
async function rateLimitOk(request, env) {
  try {
    if (!env.UNLOCK_CODES) return true;
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const minute = Math.floor(Date.now() / 60000);
    const key = 'rl:' + ip + ':' + minute;
    const count = parseInt((await env.UNLOCK_CODES.get(key)) || '0', 10) || 0;
    if (count >= 60) return false;
    await env.UNLOCK_CODES.put(key, String(count + 1), { expirationTtl: 120 });
    return true;
  } catch (e) {
    return true;
  }
}

// ── Code validation ──
//
// KV layout: key = uppercased unlock code, value = JSON
//   { validUntil: ISO8601, email?: string, plan?: 'monthly'|'yearly', stripeSession?: string }
//
// Codes are written to KV by the Stripe webhook handler (separate worker or
// handler endpoint — see docs/PAYWALL-DEPLOY.md).

// Launch / comp promo codes — always valid, independent of KV binding. These are
// SHARED codes (not per-customer), so they unlock everything but do NOT take part
// in cross-device progress sync (which is keyed per code and would cross-
// contaminate). Real per-customer codes come from the Stripe webhook and live in
// KV. This is the single source of truth for promo codes on the server.
const PROMO_CODES = ['LAUNCH2026', 'FOUNDERSPECIAL'];
const PROMO_DAYS = 365;

async function validateCode(request, env, headers) {
  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return jsonResponse({ valid: false, error: 'Invalid JSON' }, 400, headers);
  }

  const code = String(payload.code || '').trim().toUpperCase();
  if (!code || code.length < 4 || code.length > 32) {
    return jsonResponse({ valid: false, error: 'Code missing or wrong length' }, 400, headers);
  }

  // Promo codes are always valid here — authoritative, regardless of KV binding.
  if (PROMO_CODES.includes(code)) {
    return jsonResponse({
      valid: true,
      validUntil: new Date(Date.now() + PROMO_DAYS * 24 * 3600 * 1000).toISOString(),
      promo: true
    }, 200, headers);
  }

  // KV not bound (pre-setup) and not a promo code → nothing else to validate.
  if (!env.UNLOCK_CODES) {
    return jsonResponse({ valid: false }, 200, headers);
  }

  const raw = await env.UNLOCK_CODES.get(code);
  if (!raw) {
    return jsonResponse({ valid: false }, 200, headers);
  }

  let entry;
  try {
    entry = JSON.parse(raw);
  } catch (e) {
    return jsonResponse({ valid: false, error: 'Corrupt entry' }, 500, headers);
  }

  if (entry.validUntil && new Date(entry.validUntil) < new Date()) {
    return jsonResponse({ valid: false, expired: true }, 200, headers);
  }

  return jsonResponse({
    valid: true,
    validUntil: entry.validUntil || null,
    email: entry.email || null,
    plan: entry.plan || null
  }, 200, headers);
}

// ── Cross-device progress sync ──
//
// KV layout: key = "progress:CODE", value = JSON blob with whatever the client
// uploads. Last-write-wins. Auth is the unlock code itself — anyone with a code
// can read/write that code's progress. Acceptable for sticker-book level data.
//
// POST { code, action: 'upload', data: {...} }     → 200 { ok: true }
// POST { code, action: 'download' }                → 200 { ok: true, data: {...} }
//
// `code` must be a currently-valid premium code.

async function syncProgress(request, env, headers) {
  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return jsonResponse({ ok: false, error: 'Invalid JSON' }, 400, headers);
  }

  const code = String(payload.code || '').trim().toUpperCase();
  const action = payload.action;
  if (!code || (action !== 'upload' && action !== 'download')) {
    return jsonResponse({ ok: false, error: 'code + action required' }, 400, headers);
  }

  // Promo codes are shared → no cross-device sync. Accept gracefully so the
  // client never sees a 401: downloads return nothing, uploads are discarded.
  if (PROMO_CODES.includes(code)) {
    return jsonResponse(action === 'download' ? { ok: true, data: null } : { ok: true }, 200, headers);
  }

  if (!env.UNLOCK_CODES) {
    return jsonResponse({ ok: false, error: 'sync unavailable (KV not bound)' }, 503, headers);
  }

  // Verify the code is currently valid before allowing sync.
  const codeRaw = await env.UNLOCK_CODES.get(code);
  if (!codeRaw) {
    return jsonResponse({ ok: false, error: 'Unknown code' }, 401, headers);
  }
  let codeEntry;
  try { codeEntry = JSON.parse(codeRaw); } catch (e) { codeEntry = null; }
  if (codeEntry && codeEntry.validUntil && new Date(codeEntry.validUntil) < new Date()) {
    return jsonResponse({ ok: false, error: 'Code expired' }, 401, headers);
  }

  const progressKey = 'progress:' + code;

  if (action === 'download') {
    const raw = await env.UNLOCK_CODES.get(progressKey);
    let data = null;
    if (raw) {
      try { data = JSON.parse(raw); } catch (e) { data = null; }
    }
    return jsonResponse({ ok: true, data }, 200, headers);
  }

  // upload
  const data = payload.data || {};
  // Cap payload size to prevent abuse — sticker book + progress should be < 50KB
  const serialized = JSON.stringify(data);
  if (serialized.length > 50000) {
    return jsonResponse({ ok: false, error: 'Payload too large' }, 413, headers);
  }
  await env.UNLOCK_CODES.put(progressKey, serialized);
  return jsonResponse({ ok: true }, 200, headers);
}

// ── Stripe webhook ──
//
// Stripe POSTs to /stripe-webhook on subscription events. We listen for
// checkout.session.completed, generate an unlock code, write it to KV with the
// customer's email + plan + 1-year-from-now validUntil, and email the customer
// the code via Stripe's built-in customer email (we update the session metadata
// with the code so Stripe's template can include it).
//
// Required env:
//   STRIPE_WEBHOOK_SECRET — endpoint signing secret from Stripe dashboard
//   STRIPE_API_KEY        — restricted key with Customers + Sessions write access
//
// Both set via: npx wrangler secret put STRIPE_WEBHOOK_SECRET (etc.)

async function stripeWebhook(request, env) {
  if (!env.STRIPE_WEBHOOK_SECRET || !env.STRIPE_API_KEY || !env.UNLOCK_CODES) {
    return new Response(JSON.stringify({ error: 'Webhook env not configured' }), {
      status: 503, headers: { 'Content-Type': 'application/json' }
    });
  }

  const sig = request.headers.get('stripe-signature') || '';
  const body = await request.text();

  const verified = await verifyStripeSignature(body, sig, env.STRIPE_WEBHOOK_SECRET);
  if (!verified) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  let event;
  try { event = JSON.parse(body); } catch (e) {
    return new Response(JSON.stringify({ error: 'Bad JSON' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  if (event.type !== 'checkout.session.completed') {
    // Acknowledge but ignore — Stripe retries non-2xx
    return new Response('OK', { status: 200 });
  }

  const session = event.data && event.data.object;
  if (!session) {
    return new Response(JSON.stringify({ error: 'Missing session' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  const email = session.customer_details && session.customer_details.email
    || session.customer_email
    || null;
  const sessionId = session.id;
  const plan = inferPlanFromSession(session);

  // Idempotency: if we've seen this session_id before, return the same code
  const dedupKey = 'session:' + sessionId;
  const existing = await env.UNLOCK_CODES.get(dedupKey);
  if (existing) {
    return new Response(JSON.stringify({ ok: true, code: existing, dedup: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  }

  const code = generateCode();
  const validUntil = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
  const entry = { validUntil, email, plan, stripeSession: sessionId };
  await env.UNLOCK_CODES.put(code, JSON.stringify(entry));
  await env.UNLOCK_CODES.put(dedupKey, code);

  // Update session metadata with the code so Stripe's email template can include
  // {{metadata.unlock_code}} when sending the receipt to the customer.
  try {
    await fetch('https://api.stripe.com/v1/checkout/sessions/' + sessionId, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + env.STRIPE_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'metadata[unlock_code]=' + encodeURIComponent(code)
    });
  } catch (e) {
    // Metadata update failed — code is still valid, customer can email us
    console.log('Stripe metadata update failed:', e.message);
  }

  return new Response(JSON.stringify({ ok: true, code }), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  });
}

// Stripe signature verification using the workers crypto API.
// Stripe-Signature header looks like: "t=1234567890,v1=hex,v0=hex"
async function verifyStripeSignature(payload, header, secret) {
  if (!header) return false;
  const parts = header.split(',').reduce(function(acc, part) {
    const [k, v] = part.split('=');
    acc[k] = v;
    return acc;
  }, {});
  if (!parts.t || !parts.v1) return false;

  // Reject events older than 5 minutes to prevent replay
  const tsNum = parseInt(parts.t, 10);
  if (!tsNum || (Date.now() / 1000 - tsNum) > 300) return false;

  const signedPayload = parts.t + '.' + payload;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(signedPayload));
  const expected = Array.from(new Uint8Array(sigBuf))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  // Constant-time comparison
  if (expected.length !== parts.v1.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ parts.v1.charCodeAt(i);
  }
  return mismatch === 0;
}

function inferPlanFromSession(session) {
  // Heuristic: yearly plans are >$20, monthly are <$10. Better: pass plan in
  // Payment Link metadata (set in Stripe dashboard).
  const amt = session.amount_total || 0;
  if (session.metadata && session.metadata.plan) return session.metadata.plan;
  return amt >= 2000 ? 'yearly' : 'monthly';
}

function generateCode() {
  // Avoid look-alikes (0/O, 1/I/L). 8 chars, ~32 bits of entropy.
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < 8; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}
