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
- Gemini 2.5 Flash via Cloudflare Worker proxy (`picture-hunt-api.aidevlab3.workers.dev`)
- Pre-generated ElevenLabs "Jessica" MP3s (voice id `cgSgspJ2msm6clMCkdW9`, speed 0.70)
  played via Web Audio API buffers + `speechSynthesis` fallback
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
- **Recognition prompts yes/no**, temperature 0.
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
cd worker
npx wrangler deploy        # needs `npx wrangler login` once
```

KV namespace `UNLOCK_CODES` is bound (id in `wrangler.toml`). Secrets:
`GEMINI_API_KEY` (set), `STRIPE_WEBHOOK_SECRET` + `STRIPE_API_KEY` (pending).

## Session opening rule

1. Read `docs/STRATEGY.md` — the locked strategy.
2. Read this file.
3. Read `context_handoff.md` — what was last touched. Verify against code before
   acting; it can be stale.
