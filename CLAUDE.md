# Picture Hunt — Operating Instructions

**Read `docs/STRATEGY.md` first. It's the north star. This file is the how;
STRATEGY.md is the what and why.**

This repo (`VentureLabAI/picture-hunt`) is both dev and prod — GitHub Pages serves
the live site directly from `main`. There is no separate deploy repo anymore
(that was eliminated at extraction on 2026-05-18). Push to main = deploy.

## What this is

An AI camera scavenger hunt for ages 2-5 that teaches a second language. Kid
hears "Can you find a ___?" (and the foreign word), points the camera at a real
object, Gemini Vision says yes/no, kid celebrates. Audio-driven, no reading.

Positioning: **bilingual learning is the product, camera is the mechanic, story
is the retention engine.** See STRATEGY.md.

## Stack (don't change without a strong reason)

- Vanilla HTML/CSS/JS, no framework, no build step
- Photo recognition by Gemini through the Cloudflare Worker (`picture-hunt-api.aidevlab3.workers.dev`).
  Primary `gemini-3.5-flash-lite`, fallback `gemini-3.6-flash`, both set in `worker/wrangler.toml`.
  The Worker owns the prompts, the model choice and the fallback; the app sends only
  category, item and photo to `/recognize`. It is not a general Gemini proxy.
- Pre-generated MP3s in OpenAI `gpt-4o-mini-tts` voice "coral" (levelled to -16 LUFS),
  played via Web Audio API buffers + `speechSynthesis` fallback. Generation tooling
  lives outside this repo in `C:\dev\ph-tools\`.
- Art is WebP only (items, fox, category tiles). The PNG masters are outside the repo in
  `C:/assets/ventures/picture-hunt/art-masters/`; convert with `C:/dev/ph-tools/convert_art_webp.py`.
  App icons, favicons and `og-image.png` stay PNG.
- The Fredoka font is self-hosted in `play/fonts/` (no Google Fonts, no third-party requests
  from any page). Keep it that way: the privacy policy says no third parties beyond Gemini.
- localStorage for state; Cloudflare KV for cross-device sync + unlock codes
- GitHub Pages hosting, served from `main`

## Layout

- `index.html` + `landing.css` — marketing landing (root)
- `privacy.html`, `terms.html` — legal (Stripe requirement)
- `play/` — the actual game (app.js, style.css, content/, audio/, img/, sw.js, modules)
- `worker/` — Cloudflare Worker source
- `docs/` — STRATEGY.md (north star), PAYWALL-DEPLOY.md if present
- `tools/` — audio generator etc. (may live in monorepo history; regen via `generate-all-audio.js`)

## Hard rules (anti-regression — violating these has burned us before)

- **iOS audio:** Web Audio buffers only. NEVER `new Audio().play()` — fails
  outside user gesture on iOS Safari. Fall back to `speechSynthesis`.
- **AI prompts permissive:** accept toys, plushies, pictures, drawings.
- **Recognition prompts yes/no.** (`temperature 0` is retired: Gemini 3 ignores it.
  Consistency comes from the prompt plus the lowest thinking setting, in `worker.js`.)
- **Items and prompts live in two places that must match:** `play/app.js` (the
  `aiPrompt` functions and item lists, the source) and `worker/prompts.js` (generated).
  After changing either an item or a prompt: `node worker/build-prompts.mjs`, then
  redeploy the Worker. The Worker answers "Unknown item" for anything not in its table,
  which the child sees as "Camera Nap".
- **Never change the model without the comparison.** `C:\dev\ph-tools\model_compare.js`
  runs all 109 items plus 218 look-alike rejections on a candidate model (how-to is in
  that file's header). Then edit `PRIMARY_MODEL` / `FALLBACK_MODEL` and deploy. Watch
  ai.google.dev/gemini-api/docs/deprecations: Google retired 2.5 Flash with four weeks' notice.
- **Big tap targets** (100px+), photo preview before submit, parent override button.
- **Cache busting is atomic:** bump `?v=N` in `play/index.html` AND `CACHE_VERSION`
  in `play/sw.js` AND any new file into `PRECACHE_URLS`. All together or none.
- **Grammar:** items with mass/proper/plurale-tantum nouns use `speakOverride`
  (e.g. "Can you find bread?" not "a bread"). Those use TTS until their MP3 is
  regenerated with correct wording.
- **A `.js` file in `play/content/` is not a feature** until it's loaded by
  `index.html` AND called from a real code path AND its audio exists. Don't mark
  things "built" otherwise. ("Built but pending deploy" is retired phrasing.)

## Anti-feature-creep

Before building anything, answer: "does this make a parent more likely to pay or
a kid more likely to come back tomorrow?" If the answer is "more variety" or
"kids might like it" — stop. See the NOT-building list in STRATEGY.md.

## Deploy / sync protocol

```bash
git pull origin main
# do work
# bump cache version atomically if you touched play/ assets
# update context_handoff.md with what you actually did + verified state
git add -A
git commit -m "<plain-English what changed>"
git push origin main      # this deploys; Pages rebuilds in ~60s
```

After deploy, verify on a fresh Safari/Silk session (incognito) — existing PWA
installs cache aggressively; the cache bump forces re-fetch on next launch.

## Worker deploy

```bash
node worker/build-prompts.mjs --check   # fails if prompts.js is behind app.js
cd worker
npx wrangler deploy        # needs `npx wrangler login` once
```

The health probe (`.github/workflows/recognition-health.yml`) sends a real apple
photo every 6 hours and requires "yes" for apple and "no" for banana. It re-enables
itself on every run, because GitHub switches off schedules in repos that go 60 days
without activity (that silently killed monitoring from 2026-08-16 to 2026-11-26).
Rate limits are Cloudflare's built-in `[[ratelimits]]` (approximate, per visitor IP),
not KV.

KV namespace `UNLOCK_CODES` is bound (id in `wrangler.toml`). Secrets:
`GEMINI_API_KEY` (set), `STRIPE_WEBHOOK_SECRET` + `STRIPE_API_KEY` (pending).

**Gemini tier (verified 2026-06-13): PAID — Google AI Studio Tier 2, postpay/billing
enabled.** This is load-bearing for two reasons and must stay paid on any key
rotation: (1) per Google's Gemini API terms, paid-tier content is NOT used to train
Google's models or read by human reviewers — this is what makes the privacy claim
"photos are never trained on" actually true (on the free/unpaid tier it would be
false for photos of children's homes); (2) the free tier's ~250 requests/day global
cap is gone, so traffic spikes won't silently fail recognition for everyone. If the
key is ever re-created, re-enable billing and keep it on a billed project.
A $100 monthly spend cap is set in Google AI Studio (seen 2026-11-26; real use is about $1 a month).

## Session opening rule

1. Read `docs/STRATEGY.md` — the locked strategy.
2. Read this file.
3. Read `context_handoff.md` — what was last touched. Verify against code before
   acting; it can be stale.
