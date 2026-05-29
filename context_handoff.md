# Active Project Context — PICTURE HUNT

**Last updated:** 2026-05-18 (strategy lock + bilingual session)

## Read this first
`docs/STRATEGY.md` is the north star — product thesis, mode decisions, pricing,
roadmap, and the decision log. This file is just "what's the current state."

## One-line state
Live at https://venturelabai.github.io/picture-hunt/ (v76 in code). Strategy is
now locked: **bilingual-first repositioning, one-time $19.99 pricing, Storyline
kept as the retention backbone, three mechanical drill modes to be cut.** Revenue
is still blocked on wiring Stripe + KV (infra exists, config pending).

## Strategy decisions locked this session (see STRATEGY.md for full reasoning)
1. **Reposition** around bilingual learning, not camera-hunt. Camera = mechanic,
   language = product, story = retention.
2. **Pricing → one-time $19.99 lifetime**, not subscription. Paywall infra is
   reusable; only the price/product config changes.
3. **Keep + promote + invest in Storyline.** It's the retention backbone, not a
   side mode. Boss Man's correction to an earlier draft that wrongly cut it.
4. **Cut three mechanical drill modes:** Memory Hunt, Review Mode, Sorting Safari.
   (Not yet executed in code — see TODOs.)
5. **Phase 2 flagship = story template engine** (regenerating quests from finite
   audio), gated behind revenue validation.

## Shipped recently
- **v76 (2026-05-18, patch pending Boss Man apply):** grammar fixes via
  `speakOverride` on 10 items (bread, milk, yogurt, juice, keys, pants, Christmas
  lights, Santa, rain boots, sunshine); bilingual word now spoken at PROMPT time
  not just success; language picker recopy ("Learn a Language" / "Bilingual
  Mode" modal with description). Delivered as a git-am patch.
- **v71:** voice swap to ElevenLabs Jessica across all 556 MP3s + missing audio
  backfill + orphan cleanup.
- **v67-v69:** V2 warm-cream UI, marketability foundation (landing, paywall,
  free-tier gating), privacy/terms, cross-device sync, Stripe webhook handler,
  PWA install prompt.

## Immediate TODOs (priority order)
1. **Apply the v76 grammar/bilingual patch** if not already pushed (git am).
2. **Deploy the paywall** — Stripe Payment Link/Checkout + KV + webhook secret.
   THE blocker. Switch config to one-time $19.99 (overrides old $4.99/mo copy).
3. **Cut Memory Hunt / Review Mode / Sorting Safari** from the splash + app.js.
   Leave their MP3s (sunk cost; prune later). Bump cache atomically.
4. **Promote Storyline** from buried button to a primary splash entry point.
5. **Reposition landing + store copy** to bilingual-first.
6. **Worker v2 deploy** — fixes the open DoS/rate-limit surface.
7. After revenue validates → **Phase 2 story template engine.**

## Known small fixes (bundle into next worker/app deploy)
- Test codes (`LAUNCH2026`, `FOUNDERSPECIAL`) show "offline mode" wording because
  KV is now bound and the worker returns valid:false for them; client falls back.
  Move the fallback-code check above the `if (!env.UNLOCK_CODES)` block in the
  worker so test codes validate cleanly.

## Current product facts
- **Categories live (10):** Things(22), Animals(11), Food(11), Shapes(7),
  Colors(10), Furniture(9), Clothing(8), Halloween(10), Christmas(11), Spring(10)
- **Modes live (6, cutting to 3):** Regular Hunt✓, Daily Challenge✓, Storyline✓,
  Memory Hunt✗, Review Mode✗, Sorting Safari✗
- **Voice:** ElevenLabs Jessica (`cgSgspJ2msm6clMCkdW9`) @ speed 0.70
- **Languages:** Spanish/French/Mandarin are the keep-live three; 7 others are
  TTS-only until demanded
- **Worker:** `picture-hunt-api.aidevlab3.workers.dev`, KV `UNLOCK_CODES` bound
- **Cache version:** v76 in code

## Verify-state checklist for next session
1. `git log --oneline -5` — confirm latest commits match this doc
2. Open the live URL in incognito — confirm landing + Jessica voice + bilingual
3. `curl -X POST https://picture-hunt-api.aidevlab3.workers.dev/validate-code -H 'Content-Type: application/json' -d '{"code":"NOTREAL"}'` → `{"valid":false}`
