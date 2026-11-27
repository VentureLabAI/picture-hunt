// Picture Hunt — Cloudflare Worker
//
// Responsibilities:
//   1. POST /recognize     → "is <item> in this photo?" The Worker owns the prompt,
//                            the model choice and the fallback. The app sends only
//                            { category, item, image, mimeType }.
//   2. POST /              → the same check for older cached app versions that still
//                            send a full Gemini request. Only our own prompts are
//                            accepted; anything else is refused.
//   3. POST /validate-code → check an unlock code against KV, return validity
//   4. POST /sync-progress → cross-device progress for premium codes
//   5. POST /stripe-webhook
//
// This is NOT a general Gemini proxy. It answers one question about one photo for
// items the game actually has (worker/prompts.js, generated from play/app.js by
// `node worker/build-prompts.mjs`).
//
// Deploy: npx wrangler deploy
// Secrets: npx wrangler secret put GEMINI_API_KEY
// Models: PRIMARY_MODEL / FALLBACK_MODEL in wrangler.toml [vars]
// KV binding: see wrangler.toml — namespace `UNLOCK_CODES`

import { TEMPLATES, OVERRIDES, ITEMS } from './prompts.js';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
const DEFAULT_PRIMARY = 'gemini-3.5-flash-lite';
const DEFAULT_FALLBACK = 'gemini-3.6-flash';
// Each model gets this long before we move on. Two attempts must fit inside the
// app's own 15-second limit.
const MODEL_TIMEOUT_MS = 7000;
// A 1024px JPEG from the app is well under 1 MB as base64. Older app versions can
// send an unshrunk photo if shrinking failed, so leave headroom.
const MAX_BODY_CHARS = 6 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

// Exact matches only. A prefix match would also accept look-alike hosts such as
// https://picturehunt.app.example.com.
const ALLOWED_ORIGINS = new Set([
  'https://picturehunt.app',
  'https://www.picturehunt.app',
  'https://venturelabai.github.io'
]);
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function originAllowed(origin) {
  return !!origin && (ALLOWED_ORIGINS.has(origin) || LOCAL_ORIGIN.test(origin));
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': originAllowed(origin) ? origin : 'https://picturehunt.app',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-PH-Token',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function jsonResponse(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' }
  });
}

export default {
  async fetch(request, env, ctx) {
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
    if (!originAllowed(origin)) {
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
      if (!(await rateLimitOk(env.RL_API, request))) return tooMany(headers);
      return validateCode(request, env, headers, ctx);
    }

    if (url.pathname === '/event') {
      if (!(await rateLimitOk(env.RL_API, request))) return tooMany(headers);
      return eventEndpoint(request, env, headers, ctx);
    }

    if (url.pathname === '/sync-progress') {
      if (!(await rateLimitOk(env.RL_API, request))) return tooMany(headers);
      return syncProgress(request, env, headers);
    }

    if (url.pathname === '/recognize' || url.pathname === '/') {
      return recognizeEndpoint(request, env, headers, url.pathname === '/', ctx);
    }

    return jsonResponse({ error: 'Not found' }, 404, headers);
  }
};

// ── Anonymous daily totals ──
//
// The only "analytics" Picture Hunt has. One D1 table of counters:
//   (day, event, channel) -> n
// No IP address, no device or user ID, no user agent, nothing about a person is
// stored, so nothing here can follow an individual or a child. It answers "how many
// people opened the landing page from the TikTok link and tapped Try Free" and "how
// many photos were checked today", which is what the launch decision gate needs.
//
// Two sources:
//   - the landing page posts 'visit' and 'try_free' to /event (landing.js),
//     optionally with the campaign label from a ?c=<label> link;
//   - the Worker counts its own work: photo checks by outcome, code redemptions.
// The game itself (/play/) sends no events.
//
// Read the totals with: node worker/stats.mjs
// Disclosed in privacy.html ("Anonymous totals").

const CLIENT_EVENTS = new Set(['visit', 'try_free']);
const CHANNEL_RE = /^[a-z0-9][a-z0-9-]{0,23}$/;
// A flood of made-up channel labels could otherwise grow the table without limit.
const MAX_ROWS_PER_DAY = 1000;

function statDay() {
  // The owner's day (US Central), so "today" in a report matches his calendar.
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
}

async function bump(env, event, channel) {
  if (!env.STATS) return;
  try {
    const day = statDay();
    const ch = channel && CHANNEL_RE.test(channel) ? channel : '';
    const upd = await env.STATS
      .prepare('UPDATE counts SET n = n + 1 WHERE day = ?1 AND event = ?2 AND channel = ?3')
      .bind(day, event, ch).run();
    if (upd.meta && upd.meta.changes > 0) return;
    const size = await env.STATS.prepare('SELECT COUNT(*) AS c FROM counts WHERE day = ?1').bind(day).first();
    if (size && size.c >= MAX_ROWS_PER_DAY) return;
    await env.STATS
      .prepare('INSERT INTO counts (day, event, channel, n) VALUES (?1, ?2, ?3, 1) '
        + 'ON CONFLICT(day, event, channel) DO UPDATE SET n = n + 1')
      .bind(day, event, ch).run();
  } catch (e) {
    console.error('[stats] ' + (e && e.message));
  }
}

// Count without making the caller wait for the database.
function count(ctx, env, event, channel) {
  const p = bump(env, event, channel);
  if (ctx && ctx.waitUntil) ctx.waitUntil(p);
}

async function eventEndpoint(request, env, headers, ctx) {
  let payload;
  try {
    // Sent as text/plain so the browser needs no CORS preflight.
    payload = JSON.parse(await request.text());
  } catch (e) {
    return jsonResponse({ ok: false }, 400, headers);
  }
  const event = payload && payload.e;
  if (typeof event !== 'string' || !CLIENT_EVENTS.has(event)) {
    return jsonResponse({ ok: false }, 400, headers);
  }
  const channel = payload && typeof payload.c === 'string' ? payload.c.toLowerCase() : '';
  count(ctx, env, event, channel);
  return new Response(null, { status: 204, headers });
}

// ── Rate limiting ──
//
// Cloudflare's built-in per-location counters (wrangler.toml [[ratelimits]]). No KV
// reads or writes, so a busy day can't use up the KV quota that unlock codes and
// progress sync depend on. Fails open if the binding is missing or errors, so real
// play never breaks. Limits are generous: a child can't take 60 photos a minute.
// The count is approximate by design (Cloudflare syncs it in the background): in a
// live test on 2026-11-26 a 60/minute limit started refusing at request 114. That
// is fine for a cost guard; do not rely on it for exact quotas.

async function rateLimitOk(limiter, request) {
  try {
    if (!limiter) return true;
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const { success } = await limiter.limit({ key: ip });
    return success;
  } catch (e) {
    return true;
  }
}

function tooMany(headers) {
  return jsonResponse({ error: 'Too many requests. Slow down a moment.' }, 429, headers);
}

// ── Photo recognition ──

const DESCRIBE_TAIL = / On the second line, describe what you see[^.]*\.$/;
const ITEM_SET = new Set(ITEMS);

// The question exactly as the game was tuned and evaluated with it.
function fullPrompt(category, item) {
  const override = OVERRIDES[category] && OVERRIDES[category][item];
  return override || TEMPLATES[category].split('{n}').join(item);
}

// Same question without "describe what you see". The app only ever reads the
// Yes/No, so the description was paid for and thrown away.
function leanPrompt(category, item) {
  return fullPrompt(category, item).replace(DESCRIBE_TAIL, '');
}

// Older cached app versions send the whole prompt as text. Map each known prompt
// back to its (category, item) so they keep working without being able to ask
// anything else. Built once per Worker instance.
let legacyIndex = null;
function lookupLegacyPrompt(text) {
  if (!legacyIndex) {
    legacyIndex = new Map();
    for (const category of Object.keys(TEMPLATES)) {
      for (const item of ITEMS) legacyIndex.set(fullPrompt(category, item), [category, item]);
    }
  }
  return legacyIndex.get(text) || null;
}

function generationConfig(model) {
  // The Yes/No needs one token. The cap leaves room for the little "thinking" a
  // model does even at its lowest setting, which counts against the same limit.
  if (model.startsWith('gemini-2.5')) {
    return { temperature: 0, maxOutputTokens: 256, thinkingConfig: { thinkingBudget: 0 } };
  }
  // Gemini 3 ignores temperature and sets thinking by level, not by budget.
  // 3.5 Flash-Lite and 3.6 Flash accept "minimal". 3.8 Flash and newer reject it
  // (HTTP 400, checked 2026-11-26), so they get "low", their lowest setting.
  const minimalOk = /^gemini-3\.[0-7]\b/.test(model);
  return { maxOutputTokens: 256, thinkingConfig: { thinkingLevel: minimalOk ? 'minimal' : 'low' } };
}

async function askModel(env, model, prompt, image, mimeType) {
  const started = Date.now();
  let resp;
  try {
    resp = await fetch(GEMINI_BASE + model + ':generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType, data: image } }] }],
        generationConfig: generationConfig(model)
      }),
      signal: AbortSignal.timeout(MODEL_TIMEOUT_MS)
    });
  } catch (err) {
    return { ok: false, status: 504, detail: String(err && err.name || err), ms: Date.now() - started };
  }
  if (!resp.ok) {
    let detail = '';
    try { detail = (await resp.text()).slice(0, 300); } catch (e) {}
    return { ok: false, status: resp.status, detail, ms: Date.now() - started };
  }
  let data;
  try { data = await resp.json(); } catch (e) {
    return { ok: false, status: 502, detail: 'non-JSON reply', ms: Date.now() - started };
  }
  const parts = data.candidates && data.candidates[0] && data.candidates[0].content
    && data.candidates[0].content.parts || [];
  const text = parts.map(p => (p && !p.thought && p.text) || '').join('').trim();
  if (!text) {
    // Safety-blocked or cut off: not a "no". Let the caller try the other model.
    const why = (data.candidates && data.candidates[0] && data.candidates[0].finishReason)
      || (data.promptFeedback && data.promptFeedback.blockReason) || 'empty';
    return { ok: false, status: 502, detail: 'no answer (' + why + ')', ms: Date.now() - started };
  }
  return { ok: true, text, usage: data.usageMetadata || null, ms: Date.now() - started };
}

// Ask the primary model; if it fails for any reason (retired, overloaded, slow,
// blocked), ask the fallback once. A child should only ever see "Camera Nap" when
// both are down.
async function recognize(env, category, item, image, mimeType, opts) {
  const models = opts && opts.model
    ? [opts.model]
    : [env.PRIMARY_MODEL || DEFAULT_PRIMARY, env.FALLBACK_MODEL || DEFAULT_FALLBACK];
  const prompt = opts && opts.fullPrompt ? fullPrompt(category, item) : leanPrompt(category, item);
  let last = null;
  for (const model of models) {
    const r = await askModel(env, model, prompt, image, mimeType);
    if (r.ok) {
      const firstLine = r.text.split('\n')[0].trim().toLowerCase();
      const answer = /^yes\b/.test(firstLine) ? 'yes' : /^no\b/.test(firstLine) ? 'no' : 'unclear';
      if (last) console.log('[recognize] fallback answered', JSON.stringify({ model, failed: last.model, status: last.status }));
      return { ok: true, answer, model, text: r.text, usage: r.usage, ms: r.ms };
    }
    console.error('[recognize] model failed', JSON.stringify({ model, status: r.status, detail: r.detail, ms: r.ms }));
    last = { model, status: r.status, detail: r.detail };
  }
  return { ok: false, status: last && last.status === 429 ? 429 : 502 };
}

async function recognizeEndpoint(request, env, headers, legacy, ctx) {
  // Local model testing only: `wrangler dev --remote --var EVAL_MODE:1`. Never set
  // in wrangler.toml, so production ignores these headers.
  const evalMode = env.EVAL_MODE === '1';
  if (!evalMode && !(await rateLimitOk(env.RL_AI, request))) return tooMany(headers);

  let raw, payload;
  try {
    raw = await request.text();
    if (raw.length > MAX_BODY_CHARS) return jsonResponse({ error: 'Payload too large' }, 413, headers);
    payload = JSON.parse(raw);
  } catch (e) {
    return jsonResponse({ error: 'Invalid JSON' }, 400, headers);
  }

  let category, item, image, mimeType;
  if (legacy) {
    const parts = payload && payload.contents && payload.contents[0] && payload.contents[0].parts || [];
    const textPart = parts.find(p => p && typeof p.text === 'string');
    const imagePart = parts.find(p => p && p.inlineData);
    const known = textPart && lookupLegacyPrompt(textPart.text);
    if (!known || !imagePart) return jsonResponse({ error: 'Unsupported request' }, 400, headers);
    [category, item] = known;
    image = imagePart.inlineData.data;
    mimeType = imagePart.inlineData.mimeType;
  } else {
    ({ category, item, image, mimeType } = payload || {});
  }

  if (typeof category !== 'string' || !Object.prototype.hasOwnProperty.call(TEMPLATES, category)
      || typeof item !== 'string' || !ITEM_SET.has(item)) {
    return jsonResponse({ error: 'Unknown item' }, 400, headers);
  }
  if (typeof image !== 'string' || image.length < 100) {
    return jsonResponse({ error: 'Photo missing' }, 400, headers);
  }
  if (!IMAGE_TYPES.includes(mimeType)) mimeType = 'image/jpeg';

  const opts = {};
  if (evalMode) {
    const m = request.headers.get('X-PH-Eval-Model');
    if (m && /^gemini-[a-z0-9.\-]+$/.test(m)) opts.model = m;
    if (request.headers.get('X-PH-Eval-Prompt') === 'full') opts.fullPrompt = true;
  }

  const result = await recognize(env, category, item, image, mimeType, opts);
  const isProbe = (request.headers.get('User-Agent') || '').includes('PictureHunt-HealthProbe');
  if (isProbe) {
    // The 6-hourly health check is not a child playing; keep it out of the totals.
    count(ctx, env, result.ok ? 'probe_ok' : 'probe_fail');
  } else if (!evalMode) {
    // Totals only: how many photos were checked and how they came out.
    count(ctx, env, result.ok ? 'check_' + result.answer : 'check_fail');
    if (result.ok && result.model !== (env.PRIMARY_MODEL || DEFAULT_PRIMARY)) count(ctx, env, 'check_fallback');
    // Still seeing old-format requests means older app versions are in use and the
    // legacy path at "/" must stay.
    if (legacy) count(ctx, env, 'check_old_app');
  }
  if (!result.ok) {
    return jsonResponse({ error: 'Recognition unavailable' }, result.status, headers);
  }

  if (legacy) {
    // Older app versions read a Gemini-shaped reply and look at the first line.
    return jsonResponse({
      candidates: [{ content: { parts: [{ text: result.answer === 'yes' ? 'Yes' : 'No' }], role: 'model' }, finishReason: 'STOP', index: 0 }],
      modelVersion: result.model
    }, 200, headers);
  }
  const body = { answer: result.answer, model: result.model };
  if (evalMode) { body.text = result.text; body.usage = result.usage; body.ms = result.ms; }
  return jsonResponse(body, 200, headers);
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

async function validateCode(request, env, headers, ctx) {
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
    count(ctx, env, 'code_ok', code.toLowerCase());
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
    count(ctx, env, 'code_bad');
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

  // Which free pass or channel a redemption came from: the label given when the
  // code was minted (worker/mint-code.mjs), e.g. "sunny-days-preschool". Purchased
  // codes have no label and count as "paid".
  count(ctx, env, 'code_ok', entry.label || 'paid');

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
  // A free-pass code handed to a whole classroom is used by many families. Sync is
  // keyed by code, so syncing would mix their children's progress together. Treat
  // it like a promo code: valid, but no cross-device sync.
  if (codeEntry && codeEntry.shared) {
    return jsonResponse(action === 'download' ? { ok: true, data: null } : { ok: true }, 200, headers);
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
