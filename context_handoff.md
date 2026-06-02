# Active Project Context — Picture Hunt

**Last updated:** 2026-06-01 (Phase 10 custom illustrations **COMPLETE** — all 87 item stickers + 10 tiles live, cache **v91**; earlier this session: Hunt-buddy mascot + UI elevation, Phases 0–7)

## 2026-06-01 session — Hunt-buddy mascot + UI elevation (SHIPPED, live)

Gave the app an ownable brand character — a **fox explorer "hunt buddy"** — woven through every key surface, plus polish. Full plan + rationale in `docs/UI-ELEVATION.md`. All shipped to `main` and verified live; cache is now **v84 / `ph-v84`**.

- **Mascot assets** — `play/img/mascot/`: 6 reference-locked fox poses (`fox-hero`, `fox-celebrate`, `fox-point`, `fox-search`, `fox-key`, `fox-think`), transparent PNG, web-optimized 640px. Generated via Nano Banana Pro (reference-locked off `fox-hero` for character consistency); white bg removed with a PIL border flood-fill (preserves the cream belly). All 6 precached in `sw.js`.
- **Phase 1** — fox greeter on the app entry (`play/index.html` `#landing` + `.landing-fox`); marketing landing hero (`index.html`) swapped the emoji phone-mockup for the fox + a bilingual speech bubble. Install-pill no longer covers the grid (`install-prompt.js`: `body.ph-install-open` reserves splash bottom space + ~3.2s delay).
- **Phase 2** — pointing fox is the **Story Quests guide** (`renderStorylineFeature` in `app.js`); celebrating fox on the **Victory** screen (replaced `⭐🏆⭐`).
- **Phase 3** — (a) **a/an grammar fix**: vowel-initial items now read "an" everywhere — category `speakPrompt()` fns + `dailyPromptText` (daily-challenge-streak.js). Fixes the live "Can you find a orange?" bug. (b) searching fox on the loading overlay (`.loading-fox`). (c) emoji controls (settings/sound/home/skip/repeat) → consistent inline **SVG icons** + aria-labels; `toggleSound` swaps `SVG_VOL_ON`/`SVG_VOL_OFF` (app.js). The big 📷 camera button stays emoji (intentional, kid-facing hero action).
- **Verified live** via Playwright (portrait 390, landscape 720×380, desktop 1200): entry, landing (mobile+desktop), splash storyline hero, victory, game (icons + grammar in context), loading fox. 0 console errors except a **pre-existing `favicon.ico` 404** (no favicon shipped — trivial add-on if wanted).
- **Phase 5 (app identity):** real fox **app icon** (`play/img/icon-{16,32,180,192,512}.png`; manifest now PNG `any maskable`, was a 📸-emoji SVG) + **favicon** + **apple-touch-icon** on both app and landing. Fixes the prior favicon 404.
- **Phase 6 (social):** 1200×630 fox **share card** at repo-root `og-image.png` + `og:image`/`twitter:image` (summary_large_image) on the landing — shared links now render a branded preview (supports the distribution plan; previously no image).
- **Phase 7 (paywall):** `fox-key` pose leads the paywall modal (`paywall.js` `show()`), tying the mascot to the $19.99 unlock.
- **Still unused:** `fox-think` pose (made for gentle "try again" states) — candidate for the fail/retry feedback if wanted.
- **All identity assets verified live** (curl: icons/favicon/og-card 200 image/png; manifest serves PNG icons, no emoji).
- **Decision (don't re-litigate):** fox chosen over raccoon/red panda after differentiation research (Pinkfong is a pink fox for ages 1–5; our orange explorer-fox is distinct). The patches 0001–0006 described further below were applied and have been live since 2026-05-18 (see `git log`) — that older "until pushed, nothing is live" note is resolved.

## Phase 10 — Custom illustrations (COMPLETE — every non-abstract item illustrated)

Replacing emoji with consistent flat-sticker illustrations. **DONE + live — every non-abstract item is now illustrated:** all 10 **category tiles** (`play/img/tiles/<catId>.png`, wired in `renderSplash`) plus **87 item illustrations** at `play/img/items/<slug>.png` covering household (22), animals (11), food (11), furniture (7), clothing (6), halloween (10), christmas (11), spring (9). Shared slugs (chair, lamp, hat, sock, bird) light up across categories. **Colors + Shapes items intentionally stay emoji** (clean abstract icons beat hand-drawn) — `applyItemIllustrations()` hard-skips those two categories, which also stops shared slugs from leaking (e.g. food `orange` vs the colour `orange`, christmas `star` vs the shape `star`). Cache at **v91**.

**Processor recreated** at `C:\dev\ph-tools\proc.py` (lives OUTSIDE the repo so it's never committed; the deleted in-repo `_proc.py` is not coming back). It reads a `<cat>_jobs.json` of `{slug: rawUrl}`, caches raws under `ph-tools/raw/`, flood-fills ONLY the outer white bg (connectivity stops at the model's own gray drop-shadow ring, so the white sticker-border + interior whites survive), feathers the cut edge, trims, and resizes longest-side→360px RGBA. Verified the nano output already contains the white border + soft shadow, so NO border/shadow synthesis is needed — just the outer-white flood. Build a contact sheet on a coloured bg before shipping to catch any halo.

**Locked style anchor:** the apple, generate_image job `28b15feb-be58-46de-a458-03f1f7e1194a` (Higgsfield MCP, server `83e72cad…`). Pass it as `medias:[{value:"28b15feb-...", role:"image"}]` to keep every illustration on-model. See [[reference_image_gen_mcp]].

**Prompt pattern (per item):** `Using the EXACT same flat sticker art style as the reference image: thick navy outline, white sticker border, soft cel shading, vibrant flat colors, simple iconic, centered, plain solid white background, no text, no characters, no fruit, no apple. Draw ONLY <object>.` (drop "no fruit/apple" for food items.)

**Pipeline (proven):** generate (nano_banana_pro, 1:1, anchor ref) → `show_generations` for rawUrls → download + PIL border-flood-fill bg-removal + trim → `play/img/items/<slug>.png` (slug = `name.toLowerCase().replace(/[^a-z0-9]+/g,'-')`). The processor script is easy to recreate (border flood-fill on white/low-sat pixels, see git history of `play/img/items/_proc.py`, now deleted).

**Wiring (already in place — just append slugs):** `app.js` has `phSlug()` + an `ITEM_ILLUSTRATIONS` allowlist + a post-load pass that sets `item.img='img/items/<slug>.png'` for listed slugs (emoji fallback otherwise, so no 404s). To light up a category: generate+process its items, add their slugs to `ITEM_ILLUSTRATIONS`, bump cache, push. Setup grid / game target / storyline already render `item.img`.

**Remaining to generate: NONE.** Every item slug in `CATEGORIES` (except the intentionally-emoji shapes & colors) is illustrated and wired in `ITEM_ILLUSTRATIONS`. A validation pass confirmed **87 slugs ↔ 87 PNGs**, zero missing (no 404s), zero orphans, zero duplicates. If a new item is ever added to a category, generate it with `C:\dev\ph-tools\proc.py` (anchor `28b15feb-…`) and append its slug.

Note: `black-cat`/`bunny`/`easter-egg`/`stocking`/`star` are deliberately distinct slugs from `cat`/`rabbit`/`egg`/`sock` and were generated fresh (not aliased). `star` lives only in christmas now (shapes stays emoji via the category guard).

Items are lazy-loaded (NOT precached) to protect install size; runtime-cached after first view. **Every live surface now renders `item.img` with an emoji fallback** (cache **v92**): setup grid, game target, storyline target, the **Daily Challenge card**, and the **Sticker Book** (collected-sticker grid + the "Sticker!" earn popup) — all show the illustrations. Parent dashboard intentionally keeps the small emoji glyph (compact analytics list, not a kid-facing showcase). The cut modes (memory-hunt / review-mode / sorting-safari / phonics-hunt) still reference `item.emoji` but are dead code (not loaded by `index.html`) — left untouched per the anti-pattern guard.

## Read this first

- `docs/STRATEGY.md` — north star. Product thesis, locked decisions, roadmap.
- `CLAUDE.md` — operating rules + the deploy-repo-is-this-repo fact.
- This file — current code state, what's pending, what NOT to re-litigate.

If `docs/STRATEGY.md` and `CLAUDE.md` aren't present, then patches 0001-0006 have NOT been applied yet — see "Patches in Boss Man's Downloads" below.

## TL;DR for the next agent

Strategy locked: **bilingual learning is the product, camera is the mechanic, story is the retention engine.** Pricing locked: **one-time $19.99**, not subscription. Six patches were generated this session (0001-0006) and sent to Boss Man for `git am + push`. **Until pushed, none of this session's code/copy is live.** Once applied, the live site is v78 with: grammar fixes via `speakOverride`, bilingual word spoken at prompt time, 3 drill modes cut, Storyline promoted to a hero card on the splash, landing repositioned bilingual-first with $19.99 pricing, paywall converted to a single one-time buy button.

## First verification step (do this before any other work)

```bash
git log --oneline -10
```

If you see these 6 commit subjects at the top, patches are applied:
```
docs: distribution playbook ...
paywall: convert to one-time $19.99 ...
landing: reposition bilingual-first ...
cut 3 drill modes, promote Storyline ...
strategy lock: bilingual-first ...
grammar fixes (10 items) + bilingual mode UX ...
```

If you don't see them, ask Boss Man whether he applied the patches — they live in his Downloads folder as `0001-...patch` through `0006-...patch`.

Then sanity-check live state:

- Open `https://venturelabai.github.io/picture-hunt/` in incognito → should be the bilingual landing ("Your kid learns a language by finding things.") with $19.99 one-time pricing.
- Open `/play/` → splash should show a prominent purple "Story Quests" hero card above the category grid. Memory Hunt / Review Mode / Sorting Safari should NOT be visible.
- `curl -X POST https://picture-hunt-api.aidevlab3.workers.dev/validate-code -H 'Content-Type: application/json' -d '{"code":"NOTREAL"}'` → `{"valid":false}`.

## Decisions locked this session — DO NOT re-litigate

Full rationale in `docs/STRATEGY.md`. Short form:

1. **Storyline KEPT (not cut).** Boss Man overruled an earlier draft. Toddler attention span is the core risk; story is the antidote to the "find/yay" treadmill. The deeper insight: the axis isn't "how many modes" but "depleting vs regenerating content." Phase 2 flagship = a story template engine (slot-fill connective audio × characters × items → infinite quests from finite Jessica-voiced audio). Gated behind revenue validation.
2. **Pricing → $19.99 one-time.** Kills the can-I-cancel friction, no churn, simpler to buy. Subscription LTV math doesn't apply for indie consumer with no acquisition budget.
3. **Bilingual is THE product, not a side feature.** "Lingokids meets the real world." Repositioned hero, copy, FAQ.
4. **Cut Memory Hunt, Review Mode, Sorting Safari.** Mechanical drills; low retention; ~30% of surface for ~5% of playtime. Their `content/*.js|css` and MP3s remain on disk as sunk cost — pruning later is fine. `preloadAllAudio` still mentions a few dead keys (harmless).
5. **Foreign word now spoken at PROMPT time, not just success.** Pre-prompt + reveal is how kids actually learn vocab. The old visual-only translation badge was passive; this turns it into an active recall drill.
6. **`speakOverride` items use Web Speech TTS until MP3 re-record.** 10 items (bread, milk, yogurt, juice, keys, pants, Christmas lights, Santa, rain boots, sunshine) show correct grammar visually; audio uses device TTS rather than the cached Jessica MP3 that still says "Can you find a bread?" etc. When ElevenLabs key arrives, regenerate those 10 specific files.
7. **Distribution: TikTok organic + preschool free-pass + micro-influencer DMs.** NOT r/parenting / r/toddlers — those subs downvote self-promo. Full playbook in `docs/DISTRIBUTION.md`.
8. **Do not lower the $19.99 to chase conversions.** If conversion is low, the lever is channel/message, not price. See STRATEGY decision gate.

## What's in the codebase right now (post-0006)

- **Marketing landing** (`index.html`, `landing.css`): bilingual headline, language strip (🇪🇸 🇫🇷 🇨🇳), $19.99 one-time pricing card, FAQ rewritten ("do I need to speak the language myself?" etc).
- **App at `/play/`** (`app.js`):
  - `speakOverride` on 10 items + `promptFor()` / `speakItem()` / `speakForeignWordForItem()` helpers.
  - Bilingual auto-speak at prompt time (uses existing `speakTranslation()` from `content/translations/languages-config.js` — no new audio needed).
  - `renderStorylineFeature()` draws the purple Story Quests hero above the category grid.
  - Memory/Review/Sorting Safari init removed from `onSplashEnter` and from `paywall.js refreshSplashAfterUnlock`.
  - More-games drawer removed.
- **Daily Challenge** (`content/daily-challenge-streak.js`): `dailyPromptText(item)` helper added so the card respects `speakOverride` (was bypassing the helper and showed "Can you find a pants?").
- **Paywall** (`paywall.js`, `paywall.css`): single `STRIPE_LINK` (placeholder), single `$19.99 / Unlock everything — one time` buy button, "No subscription. Yours forever." note. `'storyline'` reason routes to a tailored headline. Feature bullets lead with bilingual.
- **Worker** (`worker/worker.js`): `/validate-code`, `/sync-progress`, `/stripe-webhook` endpoints. KV `UNLOCK_CODES` bound (id `3984b5b16694406590dca6f5c6238a8b`).
- **Docs**: `docs/STRATEGY.md` (north star), `docs/DISTRIBUTION.md` (TikTok scripts + preschool email + influencer DM templates), `CLAUDE.md` (operating rules).
- **Cache:** v78 in `play/index.html` + `ph-v78` in `play/sw.js`.

## Known small fixes (bundle into next deploy)

- ~~**"Offline mode" wording when `LAUNCH2026` is redeemed.**~~ **FIXED 2026-06-02 (deployed).** Root cause was two drifting hardcoded promo-code lists. Fix: the worker now has a single `PROMO_CODES` source of truth — `validateCode` returns `{valid:true, promo:true}` for them authoritatively (independent of KV), and `syncProgress` no-ops them (`{ok:true}`) instead of 401-ing (they're shared codes → no cross-device sync). The client (`paywall.js`) no longer overrides the worker's "invalid" verdict — `FALLBACK_CODES` is now purely an offline (`.catch`) safety net. Worker **deployed via `wrangler deploy`** (version `c503f85e`, KV binding intact); client shipped at cache **v93**. Verified live: `LAUNCH2026`→`valid:true`, `NOTREAL`→`valid:false`, promo sync→`{ok:true}`. **Note: deploying the worker needs `wrangler login` first (the cached OAuth token expires); there's no `CLOUDFLARE_API_TOKEN` set.**
- **`docs/PAYWALL-DEPLOY.md` is STALE.** Still describes the old monthly + yearly two-link Stripe flow. Will be rewritten alongside the live Stripe wiring (one-time product, single Payment Link). Do not follow it as-is.

## What's blocked on Boss Man (all key/account work)

1. **Apply + push the 6 patches** → live deploy.
2. **Stripe one-time $19.99 Payment Link** → paste into `STRIPE_LINK` in `play/paywall.js`, bump cache, push.
3. **Cloudflare KV is bound, but rate limiting + tighter origin allow-list still pending** (dashboard work).
4. **ElevenLabs key** → regenerate the 10 grammar-fixed MP3s with corrected text. Once regenerated, the corresponding `speakOverride` items can drop the override (or keep it for safety; the override now matches the audio).
5. **Plausible analytics** ($9/mo) on the landing for funnel data — required before distribution drives traffic.
6. **Distribution execution** per `docs/DISTRIBUTION.md` (film TikToks, send preschool emails, seed micro-influencers).

## Patches in Boss Man's Downloads (apply in order)

```bash
cd /c/dev/picture-hunt
git pull origin main
git am ~/Downloads/0001-grammar-fixes-10-items-bilingual-mode-UX-auto-speak-.patch
git am ~/Downloads/0002-strategy-lock-bilingual-first-repositioning-19.99-on.patch
git am ~/Downloads/0003-cut-3-drill-modes-promote-Storyline-to-primary-entry.patch
git am ~/Downloads/0004-landing-reposition-bilingual-first-switch-pricing-to.patch
git am ~/Downloads/0005-paywall-convert-to-one-time-19.99-Full-Access-matche.patch
git am ~/Downloads/0006-docs-distribution-playbook-TikTok-scripts-preschool-.patch
git push origin main
```

`git am` previews each commit; if any conflict comes up, paste the output and I'll resolve.

## Anti-pattern guard (do not violate)

- No new categories. No new game modes. No achievement badges. No new animation packs.
- A `.js` file in `play/content/` is not a feature until it's loaded by `index.html`, called from a real code path, and its audio is on disk.
- "Built but pending deploy" is retired phrasing.
- Don't re-litigate: cut modes / $19.99 pricing / Storyline-as-backbone / bilingual-first positioning. All locked in `STRATEGY.md` with rationale.

## Source of truth

This repo (`VentureLabAI/picture-hunt`) is both dev AND deploy. GitHub Pages serves `main` directly, so for the **frontend** (everything under `play/` plus the marketing `index.html` / `landing.css`) **push = deploy** — `git push origin main` and it's live within ~1 min. ⚠️ **The backend worker is the ONE exception: `git push` does NOT deploy it.** Editing `worker/worker.js` and pushing changes nothing on the live API until you run `wrangler deploy` — see the next section. The monorepo (`VentureLabAI/venture-lab`) has a tombstone at `picture-hunt/` — frozen on 2026-05-18, OpenClaw cron does not touch it, you should not write to it.

## Deploying the Cloudflare worker (`worker/worker.js`) — READ THIS, it works differently from the frontend

**Plain-English version:** the app has two halves that ship in two different ways.

- The **app you see** (game UI, pages, images — everything in `play/`) goes live the moment you `git push`. Nothing else to do.
- The **worker** is a small backend program living at `https://picture-hunt-api.aidevlab3.workers.dev`. The app calls it to **(1) check the kid's photo with AI** (the core "did they find it?" magic — a Gemini proxy), **(2)** validate unlock codes, **(3)** sync progress across devices, **(4)** receive Stripe payment webhooks. It runs on **Cloudflare**, not GitHub — so `git push` does **not** update it. Changing `worker/worker.js` in the repo does nothing to the live API on its own; it has to be **deployed** separately.

**⚠️ Stakes:** because the worker proxies the AI photo-check, a broken worker = the game can't tell whether a photo is correct = core gameplay breaks. Change `worker/worker.js` deliberately, and always verify after deploying (commands at the bottom).

**How to deploy the worker (exact steps):**
```bash
cd /c/dev/picture-hunt/worker
npx wrangler deploy
```
On success it prints a new `Current Version ID` and lists the `UNLOCK_CODES` KV binding.

**The login catch (this is the "wrangler login / API token" thing Boss Man asked about):** Cloudflare requires you to be authenticated before deploying. There's a saved login on this machine, but **it expires periodically**, and there is **no `CLOUDFLARE_API_TOKEN` set** as a permanent alternative. So a deploy can fail purely because the login lapsed.

- **Symptom you're logged out:** `npx wrangler deploy` (or `npx wrangler whoami`) fails with *"Failed to automatically retrieve account IDs… your authentication may have expired."*
- **Fix — log in again (~30 seconds):**
  ```bash
  npx wrangler login
  ```
  This opens Boss Man's browser to a Cloudflare page → he clicks **"Allow"** → done. Then re-run `npx wrangler deploy`.
- **If you're a Claude Code session:** run `npx wrangler login` in the **background** (it won't return until the click happens), tell Boss Man *"your browser will open — click Allow,"* wait for it to finish, then `npx wrangler deploy`. This is exactly how the 2026-06-02 promo-code fix shipped.
- **Optional permanent fix (no browser step ever again):** Boss Man creates a Cloudflare **API token** (Cloudflare dashboard → My Profile → API Tokens → Create Token → permissions *Workers Scripts: Edit* + *Workers KV Storage: Edit*) and it gets saved as a `CLOUDFLARE_API_TOKEN` environment variable on the machine. After that `wrangler deploy` works headlessly forever. **Not set up yet** — propose this if worker deploys become frequent.

**Verify a worker deploy worked:**
```bash
# a promo code should be valid:
curl -X POST https://picture-hunt-api.aidevlab3.workers.dev/validate-code -H 'Content-Type: application/json' -d '{"code":"LAUNCH2026"}'
# → {"valid":true,"promo":true,...}
# a fake code should be rejected:
curl -X POST https://picture-hunt-api.aidevlab3.workers.dev/validate-code -H 'Content-Type: application/json' -d '{"code":"NOTREAL"}'
# → {"valid":false}
```
For an AI-photo-check change, also do one real photo run in the live app.

**Housekeeping:** `worker/.wrangler/` is local login/cache state — it's gitignored; never commit it. The KV namespace is already bound in `worker/wrangler.toml` (id `3984b5b16694406590dca6f5c6238a8b`), so a fresh deploy keeps unlock codes + synced progress intact.

## When Boss Man returns

1. "Did the patches push?" → confirm with `git log --oneline -10`.
2. If yes → verify live URL renders the new landing + $19.99 paywall + Story Quests hero.
3. Next no-keys items: there aren't any. Everything left is blocked on Boss Man.
4. Most-leveraged next move: Stripe wiring session (one-time product → one Payment Link → paste into `STRIPE_LINK` → cache bump → push). I'll also rewrite `docs/PAYWALL-DEPLOY.md` to the one-time flow in the same pass.

## Recent commits (extracted repo `main`)

```
2fc813b docs: distribution playbook ...
79379fa paywall: convert to one-time $19.99 ...
22881f7 landing: reposition bilingual-first ...
ad96ca2 cut 3 drill modes, promote Storyline ...
ba7306b strategy lock: bilingual-first ...
06e5449 grammar fixes (10 items) + bilingual mode UX ...
7947bbd voice: 16 Jessica MP3s for static prompts ... (previous session)
```
