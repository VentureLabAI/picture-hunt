# Active Project Context — Picture Hunt

**Last updated:** 2026-06-09 (iOS reachability/overlap sweep — game / landing / language-picker overflow traps + install-pill overlap **SHIPPED + live**, cache **v108 / ph-v108**)

## ⏩ START HERE — current state & next move (2026-06-04, cache v107/ph-v107, live)

Big polish + strategy session (cache v97→v107, all shipped to `main` + browser-verified; detailed newest-first log below). Cold-start snapshot:

**Working & live now:**
- **Freemium model:** free = 3 real-object categories (household / animals / food) + **Spanish bilingual** + Daily Challenge + 1 sample Story Quest; **$24.99 one-time** unlocks all 10 categories / all 10 languages / all Story Quests. Spanish bilingual is the FREE hook. (Full rationale + the one-time-vs-subscription decision: `docs/STRATEGY.md`.)
- **Adventure Trail** storybook UI for all 8 Story Quests (fox narrator + speech bubble + stepping-stone trail + cover page + page-turns). Design decisions: `docs/ADVENTURE-TRAIL-NOTES.md`.
- **Home greeting:** the fox welcomes the child on the first home entry each session (recorded coral voice).
- **Bilingual audio:** ALL 109 items play **recorded Spanish** (coral voice) — reliable on iOS. (Other 9 languages still browser TTS — see open questions.)
- Adventure-mode surfaces re-themed light; sticker-badge, splash-overflow-clip, victory-celebration crash, story-bridge double-read, and iOS paywall-close-button bugs all fixed.

**Open questions / owner decisions (nothing else is blocking):**
1. **Stripe is THE gate.** `STRIPE_LINK` in `play/paywall.js` is still a placeholder → paywall shows "checkout opens soon"; the **$24.99 buy button renders the moment a real one-time Payment Link is pasted** + cache-bumped. (Unlock-code path works; demo code `LAUNCH2026`.) **Most-leveraged next move.**
2. **Other 9 languages = browser TTS** (silent on iOS for premium users who pick them). Only Spanish is recorded. To record a language: `node ph-tools/build_foreign_manifest.js <code>` → `python ph-tools/gen_foreign_audio.py <LangName>` (auto-rebuilds the app manifest); all 10 ≈ ~1090 clips; spot-check zh/ja/ko/hi/ar pronunciation. Owner's call whether/when.
3. The home-greeting wording + the fox voice are easy to re-record on request.

**Test target:** the owner tests on **iPhone / iOS Safari** — verify there for anything audio / modal / viewport / safe-area (this is how the TTS-silent + paywall-X bugs were caught). See project memory `owner-tests-on-iphone`.

---

> **v108 — iOS reachability & overlap sweep (SHIPPED, cache v108/ph-v108, verified locally @ 390×660).** Owner reported persistent iPhone bugs: "overlapping, buttons hidden, covered, can scroll to get to it." Root cause = the base `.screen` rule (`flex-direction:column; align-items:center; justify-content:center;` default `overflow:visible`): any screen whose content exceeds a short iOS viewport (Safari URL bar showing ≈ 390×660) centers the content and clips the top+bottom controls with no way to scroll. The splash (v99), story-mode `#game`, and paywall (v107) had each been patched, but the SAME trap was still live on the surfaces below. All fixes reuse the proven pattern: `overflow-y:auto; -webkit-overflow-scrolling:touch; justify-content:flex-start; justify-content:safe center;` + `env(safe-area-inset-*)`.
>  1. **`#game` (regular hunt) — BLOCKER.** Was `overflow:visible`, content 700px > 660px → **Home button clipped above (top −40px), Skip clipped below (bottom 700px)** = couldn't reliably exit or skip a hunt. Now scrolls (verified Home top=20, Skip reachable at bottom). Also added `padding-bottom: env(safe-area-inset-bottom)` to `#game` in the safe-area `@supports` block.
>  2. **Language picker — BLOCKER.** `.lang-picker-modal` was `overflow:visible` + center, 11 options spanning 761px in 660px → **Portuguese & Arabic clipped off-screen, unreachable, no scroll, no close button.** Now scrolls (verified Arabic reachable) + safe-area padding; and wired a **backdrop-tap close** in `openLangPicker` (`modal.onclick`) — the old `overlay.onclick` could never fire because `.lang-picker-modal` (the dim layer) covers the overlay.
>  3. **Install pill covered the splash bottom controls** (sticker book / settings / sound / daily card). The `ph-install-open` reservation was 96px vs a ~148px+ text-wrapped pill that also had no safe-area. Now `install-prompt.js` sets `.splash-content` `padding-bottom = pill.offsetHeight + 64` at runtime (CSS fallback bumped to 208px), and the pill's `bottom` adds `env(safe-area-inset-bottom)` so it clears the home indicator.
>  4. **`#landing` entry screen — clipped 62–84px** (`overflow:hidden` + center). Now scrolls / safe-centers; the decorative `::before`/`::after` were changed to `position:fixed` (they were inflating `scrollHeight`); added safe-area padding. Now fits 660 exactly, button reachable, no horizontal overflow.
>  5. **Splash/story heading overlapped the top-left dashboard button** — added `padding: 0 56px` to `.home-title` so the centered heading text clears the corner button (measured clear via a text Range; wraps to 2 lines, which is fine).
>  6. Added `env(safe-area-inset-top)` to `.dashboard-header` (parent dashboard back/title were under the notch).
>  Files: `play/style.css`, `play/paywall.css`, `play/parent-dashboard.css`, `play/install-prompt.js`, `play/app.js`. The **setup screen was already correct** (scrolls + sticky Done + safe-area — no change). **NOT verified (require a successful photo / win flow): the result / miss / victory screens** — they render inside the now-scrollable `#game`, but if any overflows on a short viewport apply the same pattern. Sticker book scrolls internally but its only close ("🏠 Home") sits at the bottom of the scroll (no top X) — minor follow-up. **Owner: please verify on your iPhone** — the local @390×660 repro models the short viewport but cannot fully model the real notch / Dynamic Island / home indicator; the `env(safe-area-inset-*)` additions are code-correct (mirroring the paywall pattern) but untested on a physical device.

> **v107 — full Spanish audio + paywall iOS fix.** (1) **Recorded ALL 103 Spanish words** (every category item) in the coral voice, not just the 8-word PoC. Pipeline: `node ph-tools/build_foreign_manifest.js es` vm-loads the app + writes `ph-tools/foreign-manifest.json` (full `{lang/es/<slug>: word}` from the real `phTranslationLookupName`/`getTranslationByName`/`phSlug`), then `python ph-tools/gen_foreign_audio.py Spanish` generates `play/audio/lang/es/*.mp3` (−16 LUFS) and rebuilds `foreign-audio-manifest.js`. Every item now plays a **recorded** clip (reliable on iOS) instead of browser TTS — which was **silent on the user's iPhone** (root cause of "animals Spanish didn't play"; only `dog` was in the PoC, the rest fell back to TTS). **Other 9 languages still TTS** — to record one, run the same two commands with its code (`build_foreign_manifest.js <code>` → `gen_foreign_audio.py <LangName>`); all 10 ≈ ~1090 clips. (2) **Paywall close button hidden behind the iOS Safari URL bar:** the centered modal (`max-height:90vh` + its own internal scroll) was taller than the visible viewport, so its top (the X) sat behind the URL bar and scrolling the modal bounced back. Fix (`paywall.css`): the **overlay** scrolls now (`overflow-y:auto` + `align-items: flex-start` then `safe center` + `padding: env(safe-area-inset-*)`); `.paywall-modal` dropped `max-height`/`overflow`. The X is reachable at the top even when the modal overflows (verified 390×520, modal 779px → close-btn top:91, in viewport).

> **v106 — home greeting:** replaced the old "Pick a game!" home prompt with a friendly fox **welcome** the first time the child reaches the home hub each session. `showHomeGreeting()` (app.js) pops a full-screen overlay — **fox-hero centered as the centerpoint** + a speech bubble *"Hi! I'm your adventure guide! Are you ready for an adventure? Let's pick one!"* — plays the recorded coral clip `home-greeting`, then dismisses (audio-end / tap / 8s safety) to reveal the picker + pulse the categories. `window._homeGreeted` flag → returns from a game just pulse (no repeat greeting). New clip `play/audio/home-greeting.mp3` (coral, via `ph-tools/regen_clips.py` + `ph-tools/greeting-manifest.json`); old `pick-a-game.mp3` deleted; `sw.js` PRECACHE + `gen_audio.js` SYSTEM + audio-manifest rebuilt. **To change the wording:** edit `GREETING` in `showHomeGreeting`, the `textToAudioKey` map entry, AND `gen_audio.js` SYSTEM (all three must match the spoken text), then regen the clip + cache-bump.

> **v105 — story bridge double-read fix:** each story step's `bridge` (the fox's setup line) used to END with "Can you find a X?", which `speakItem` then repeated → the prompt was read twice. Trimmed the trailing question from all bridges in `storyline-mode.js` (44 of 45; treasure-hunt step3 had none) so the bridge is setup-only, and **re-recorded those 44 bridge clips** in the coral voice via `ph-tools/regen_clips.py` + `ph-tools/regen-manifest.json` → `play/audio/story-*-bridge.mp3` (−16 LUFS). Flow is now: bridge (setup) → `speakItem` ("Can you find a X?") once → foreign word. ✅ `ph-tools/audio-manifest.json` was rebuilt (`node gen_audio.js dry`) so it matches the trimmed bridges (verified: 0 `*-bridge` entries contain "Can you find") — a future full coral re-voice stays correct. (Manifest lives in ph-tools, outside the repo; no repo change.)

## 2026-06-04 session (cont.) — Recorded foreign-word audio PoC (Spanish, coral voice) (SHIPPED, cache v104/ph-v104, browser-verified, 0 console errors)

Owner asked: can the foreign word use the SAME coral fox voice with correct pronunciation (instead of device TTS that's silent on iOS)? **Yes** — OpenAI `gpt-4o-mini-tts` is multilingual. Shipped a **Spanish proof-of-concept** (8 words) so the owner can hear it; scaling to full Spanish / other languages is pending their sign-off on voice + accuracy.

- **Pipeline** (`C:\dev\ph-tools\`, OUTSIDE the repo): `gen_foreign_audio.py <LangName> [manifest.json]` reads a manifest `{ "lang/<code>/<slug>": "<word>" }`, generates each word in voice **coral** (gpt-4o-mini-tts; fox instruction + "say this single <Lang> word slowly & clearly"), saves to `play/audio/lang/<code>/<slug>.mp3`, loudnorms to −16 LUFS, then **rebuilds `play/content/translations/foreign-audio-manifest.js`** from disk. PoC word list: `ph-tools/foreign-manifest.json`.
- **App wiring** (`app.js`): `speakForeignWordForItem` builds key `lang/<code>/<phSlug(lookupName)>` → `playForeignClip` plays the **recorded coral clip** via Web Audio (iOS-safe), falling back to `speakTranslation` (browser TTS) for anything not recorded. `foreignClipAvailable()` consults `FOREIGN_AUDIO` (the manifest) so unrecorded words go STRAIGHT to TTS — **no 404s**.
- **Shipped files:** 8 clips `play/audio/lang/es/` (cup=taza, banana=plátano, cereal, spoon=cuchara, cookie=galleta, dog=perro, apple=manzana, ball=pelota); `foreign-audio-manifest.js` (loaded before app.js, precached in sw.js). Clips are **lazy-loaded** (not precached) to protect install size; SW runtime-caches on first play.
- **Verified** (localhost v104, 0 errors): recorded item → plays `lang/es/cup.mp3` (1.2s buffer); unrecorded item (star) → TTS 'estrella' with NO fetch/404.
- **TO SCALE (after owner hears the PoC):** for a language, build the full manifest = `{ 'lang/<code>/<phSlug(phTranslationLookupName(name,cat))>' : getTranslationByName(...).<code> }` over every `CATEGORIES` item (compute it in-browser like the PoC did), save as a manifest JSON, run `gen_foreign_audio.py <LangName> <manifest>`. **Full Spanish ≈ 109 clips** (covers every FREE user + demo). **All 10 languages ≈ ~1,090 clips** — and **spot-check zh/ja/ko/hi/ar** (coral voice is less native there; Latin-script es/fr/de/it/pt are excellent). Then cache-bump + push.



> **v102 follow-up:** found + fixed a **pre-existing** console error while verifying the quest finale — `new-celebrations.js` `celebrateCombo` (used on BOTH regular victory `app.js:1276` AND story finale) called `ctx.arc()` with a negative radius (`p.size * p.life` when `life` dips below 0 within a frame) → `IndexSizeError` on every win. Clamped to `Math.max(0, …)`. This means earlier "0 console errors" passes were missing a victory-time error; it's gone now.

## 2026-06-04 session (cont.) — ADVENTURE TRAIL storybook UI for Story Quests (SHIPPED, cache v101/ph-v101, browser-verified all 8 quests, 0 console errors)

Redesigned Story Quests to feel like a **storybook** instead of looking like a category hunt. Owner-approved direction: **Adventure Trail** (fox narrator + a trail of stepping-stones), applied to BOTH the picker and the in-quest play. Full decisions + the translation finding in **`docs/ADVENTURE-TRAIL-NOTES.md`** (read it — it has owner-review items).

- **In-quest** (`storyline-mode.js` + `style.css`): the find-flow is wrapped in `#quest-chrome` (fox + speech-bubble narration + trail) injected into `#game` with a `story-mode` class — **reuses the camera/find/iOS-audio path** (not a rewrite). Cover page during the intro, page-turn between steps, fox-celebrate + stone-checks-off + fox-hops-forward on each find, finale reuses the Victory screen. Story-mode `#game` made overflow-safe (flex-start/safe-center + scroll) so the chrome can't push the camera off-screen.
- **Picker** (`renderStorySelector`): "Pick an Adventure!" shelf of **book** cards (colored spine + emoji cover + title + trail-dots + page edges), replacing the category-style `.story-card` grid. Old `.story-card`/`.story-grid` CSS left in place (now unused, harmless).
- No new art (reused fox-hero/point/celebrate). Removed the inline "📖 1/5" prompt badge (chrome header + trail show progress now).
- **TRANSLATIONS — nothing to create (already 100% complete):** audited all **109 items × 10 languages = 0 gaps**; all 38 quest items covered. Verified the foreign word is spoken right after English (~400ms gap; e.g. `speakTranslation('taza','es-ES')` for cup). **Caveat:** foreign pronunciation is browser `speechSynthesis` TTS, not recorded audio → can be silent on iOS / rare languages where no device voice is installed. Recorded foreign audio is the reliable upgrade (separate project, NOT done). See notes doc.
- **Verified** (Playwright, localhost v101): cover/step/found, 5- & 7-step trails, all 8 quests render clean, finale→victory, free (1 unlocked) / premium (all) locking, bilingual badge "ES taza". 0 JS errors (the one console 503 is the worker `/sync-progress` reacting to a fake test-premium code — environmental).
- **Follow-ups (owner's call, in notes doc):** recorded foreign audio for iOS-reliable pronunciation; optional dedicated "The End" finale page; optional 2-col shelf / sticky Back button.

## 2026-06-04 session (cont.) — FREEMIUM PIVOT (SHIPPED, cache v100/ph-v100, browser-verified free + premium, 0 console errors)

**Owner-directed strategy change — overrides 2 locked decisions (full rationale in `docs/STRATEGY.md`).** Pricing moved from "$19.99 one-time unlocks everything, bilingual paid-only" → **freemium funnel + $24.99 one-time**, with the bilingual hook FREE. Why: bilingual is the differentiator, so give it away to hook → charge for breadth. Stayed **one-time, NOT subscription** (retention engine unbuilt, toddler churn brutal, no ad budget, infra is one-time already). Subscription = Phase-2 lever once the story-template engine ships.

**New free/paid line:**
- **Free:** household / animals / food (swapped from household/shapes/colors → real illustrated objects), **Spanish bilingual ON**, Daily Challenge, **1 sample Story Quest** (`bear-breakfast`), 5 plays/day.
- **Paid $24.99 one-time:** all 10 categories, all 10 languages, all Story Quests, unlimited plays, cross-device sync.

**`paywall.js` is the gating source of truth:** added `FREE_LANGUAGE='es'`, `FREE_STORY='bear-breakfast'`, `FREE_CATEGORIES=['household','animals','food']` + `isFreeLanguage`/`isFreeStory` (exported). Wiring:
- `bilingualActive()` (app.js) allows the free language for non-premium → **Spanish works free**, other langs blocked.
- `openLangPicker()` (app.js): no hard paywall; Off + Spanish selectable, other 9 langs `🔒` → `Paywall.show('language')`.
- Splash lang bar (`renderSplash`): "🇪🇸 Learning Spanish · Free · tap for 9 more" (was the locked "Premium — 10 languages").
- Story Quests hero (`renderStorylineFeature`): open to everyone ("first quest free!"); gating moved into the selector + `playStory`.
- Story selector + `playStory` (storyline-mode.js): free story playable, others `🔒` → `Paywall.show('storyline')`.
- Paywall copy: 'language' reason ("All 10 Languages — Spanish is free"), 'storyline' ("More Story Quests"), default ("Unlock Everything"); price **$24.99**; feature bullet "All 10 languages". `.lang-picker-option.locked` / `.story-card.locked` dim styles added (style.css).

**Stripe still a placeholder** → paywall renders "checkout opens soon" (the $24.99 price shows once `STRIPE_LINK` is set in `paywall.js`). Unlock-code path works; demo code `LAUNCH2026`.

**Copy updated, no `$19.99` left anywhere (html/js/css):** landing `index.html` (hero meta, pricing `$24.99`, Free card now lists "Spanish bilingual — built in", FAQ), `terms.html` (price + free-tier description). `docs/PAYWALL-DEPLOY.md` is still STALE (separate cleanup, flagged below).

**Verified (Playwright, localhost, 0 console errors):** FREE user → Spanish bilingual active, French/others blocked; free cats household/animals/food unlocked + rest 🔒; lang picker Spanish·Free + 9 locked; story selector 1 free + 7 locked; tapping a locked story/language opens the right paywall. PREMIUM → 0 locked categories/languages/stories, any language's bilingual works.

---

## 2026-06-04 session — Adventure-mode color cohesion (SHIPPED, live, verified 0 console errors, cache v97/ph-v97)

Closed the deferred "two products stitched together" inconsistency. The **Daily Challenge card, Sticker Book, and Parent Dashboard** were the last surfaces still on a hardcoded **dark navy palette** (`#1a1a2e`/`#feca57`, raw px) while the rest of the app is the bright "paper" theme. Owner chose **light re-theme** (over keep-dark-but-systematize / split-by-audience). All three now use the `:root` design tokens + the paywall/storyline "toy-button" recipe, so the app reads as one product.

- **Daily Challenge card** (`content/daily-challenge-streak.css`): clean token re-map — gradient → `var(--coral/--sun/--sky)`, text → `var(--ink)`, radii/spacing → `--r-*`/`--sp-*`, added the coral toy bottom-edge. Look essentially unchanged (it was already bright).
- **Sticker Book** (`content/sticker-book.css`): dark navy modal → light `--paper-warm` paper modal w/ sun+sky radial tints, `--ink` border, `--berry-deep` count; found slots = white toy-cards, uncommon = `--sky` border, rare = `--sun-deep` glow, unfound = dashed ink; close btn = grape toy-button. `.sticker-cat-header` deliberately keeps white text (it gets `cat.gradient` inline from sticker-book.js:141).
- **Parent Dashboard** (`parent-dashboard.css`): dark gradient screen → warm paper + subtle grape/sky mesh; white toy stat card, big number → `--grape`, complete cats → mint, achievements → sun, danger (reset / confirm-yes) → coral; back/open buttons → white toy-circles. Category fill bars keep their inline `cat.gradient` (parent-dashboard.js:245).
- **Atomic cache bump:** `index.html` ×21 `?v=96→97` + `sw.js` `ph-v96→ph-v97` (all 3 CSS already in `PRECACHE_URLS`; no new files).
- **Verified live-local** (Playwright, 390px, seeded 58/109 progress): splash daily card, dashboard (58/109, 2 complete cats, 9 achievements), sticker book (found/uncommon/unfound slot variants) — all light + cohesive, **0 console errors**.
- No JS touched (the confetti `#feca57` in app.js is decorative, left as-is). Cut-mode CSS (`sorting-safari`/`review-mode`/`memory-hunt`) still carries the old dark palette — intentionally untouched (dead code, not loaded by index.html).
**Follow-up — Sticker Book splash-count FIXED (cache v98, `content/sticker-book.js` + `.css`):** the badge I'd flagged as "doesn't appear" had two real causes (my first `getCount()=0` note was WRONG — `StickerBook.getCount` is `getCategoryCount`, which needs a catId; `getTotal()` was always correct):
  1. **Logic bug:** `addButtonToSplash()` early-returned at the `#sticker-book-btn` guard BEFORE the badge code, so once the book button existed the badge + cat-badges were never (re)added — broke the common path (start at 0 stickers → earn → return to splash → badge stays missing until a hard reload). Fix: de-gated the badge + `updateCategoryCardBadges` from the button guard; both now refresh on every call and keep the count live.
  2. **Layout clip:** the title badge anchors to `.home-title`, which the splash (`.screen { justify-content:center }`, content ~1607px > 844px viewport) pushes to `top:-342` — UNREACHABLE even at min scroll (flex-center overflow trap), so even the fixed badge can't be seen there. Fix: added a live count bubble (`.sticker-btn-count`, berry pill) on the **📕 book button** in `.splash-bottom` (the reachable entry point) + kept the title badge for taller layouts. Per-category tile badges (also reachable) now update live too.
  - Verified (Playwright, seeded): 0→earn→return shows `📕3`→`📕4` live; book-button bubble shows `58` and still opens the album; 0 console errors.
- ~~Still open: `.home-title` clipped~~ — **FIXED 2026-06-04 (cache v99).** Root cause: `.screen { justify-content:center }` vertically-centered the tall splash content and pushed the TOP off-screen + unreachable (flex-center overflow trap) — it was hiding the heading + `📕` title badge AND the **Story Quests hero + the Learn-a-Language bar** (the two most strategic elements). Fix: scoped to `#splash { justify-content: flex-start; justify-content: safe center; }` (top-anchor when content overflows, re-center when it fits; browsers without the `safe` keyword keep the `flex-start` fallback). Other screens untouched. Verified (live DOM): title top −294 (unreachable) → +40 (visible), whole top band now scrollable.

## 2026-06-03/04 session — investor-demo showcase sweep (SHIPPED, live, verified 0 console errors)

Large sweep ahead of an investor demo. Shipped to `main` (commit `2ed3008`) + worker redeployed (version `efc42c7b`). Verified live on the real URL.

**New mascot voice (headline):** ALL 573 clips re-voiced in **OpenAI `gpt-4o-mini-tts` voice "coral"** (directed: young male playful cartoon fox, soft/close), then loudness-normalized to **−16 LUFS**. Replaces the old mixed Jessica/early-computer voices. Tooling lives OUTSIDE the repo in `C:\dev\ph-tools\`:
- `gen_audio.js` — builds the canonical clip manifest by vm-loading app.js/storyline-mode.js/hint-system.js headless and using the real key functions; `node gen_audio.js dry` writes `audio-manifest.json` (565 live keys, validated 1:1 vs disk).
- `gen_audio_openai.py <voice> [pitch]` — OpenAI full re-voice from the manifest (backs up to `play/audio_backup/` first).
- `loudnorm_all.py <LUFS>` — re-levels ALL clips from the clean snapshot `ph-tools/audio_coral_raw/` (so re-leveling never double-normalizes). **To make the voice louder/quieter post-launch:** `python loudnorm_all.py -14` (louder) / `-18` (quieter), then bump cache + push. **To change voice entirely:** edit voice/instructions in `gen_audio_openai.py`, re-run, delete `audio_coral_raw/`, run `loudnorm_all.py`, cache-bump, push.
- Keys: `ph-tools/.openai-key`, `ph-tools/.el-key` (NOT in repo; ElevenLabs was evaluated then dropped — OpenAI is cheaper pay-per-use + directable). `audio_backup/`, `audio_coral_raw/`, `.playwright-mcp/`, `verify-*.png` are gitignored.

**Audio reliability:** fixed the intermittent "autoplay sometimes silent" bug — prompts now await their decoded buffer (cold-start race) + await `AudioContext.resume()`; resume on `visibilitychange`; load failures log instead of swallow. Story Quests now play their recorded narration (106 clips were dead code → bare `speak()` → robot TTS; `speakStoryAudio` is now wired + cold-start-safe). Former TTS-only `speakOverride` items (keys/bread/milk/Santa/…) now use recorded clips (correctly-worded) — `speakItem` simplified to always `speak()`.

**Story Quests:** fixed 3 steps referencing nonexistent items (`key`→`keys`, `coin`→`plate`, `bottle`→`water bottle`) that showed a ❓; story-aware victory "Play Again"; bilingual badge + DailyStreak credit during stories; `console.warn` guard if a step item ever fails to resolve again.

**UI/UX:** card-overflow fixed (Daily Challenge card showed the whole sentence → now item name + `min-width:0`/wrap; story cards + hero + tablet 3-col grid). Bilingual now exposes ALL 10 languages (page had said 3) and is **gated to Premium** per STRATEGY (`bilingualActive()` chokepoint + `openLangPicker` paywall); the splash lang button refreshes on unlock.

**Security (worker `efc42c7b`):** open Gemini proxy locked down — strict Origin allow-list that **denies empty Origin** (anonymous curl → 403, verified), per-IP KV rate limit (60/min, fail-open), 8 MB payload cap, optional `PH_PROXY_TOKEN` shared header that is **fail-open and NOT set** (client sends `X-PH-Token` from app.js only; enabling enforcement requires adding the header to `paywall.js` + `progress-sync.js` too, then `wrangler secret put PH_PROXY_TOKEN`). Removed the `#key=` URL-hash credential footgun. Added CSP to landing + `play/index.html` (verified it doesn't break audio/fonts/worker). SW: tolerant precache (per-file, no all-or-nothing) + same-origin guard on the revalidate branch.

**Content/copy:** seasonal items (Halloween/Christmas/Spring, 29 items) translated in all 10 languages; landing/FAQ/meta say "10 languages"; privacy/terms reworded subscription→one-time; landing loads Fredoka so it's on-brand on Windows/Android.

**Decisions (don't re-litigate):** custom domain **deferred** — owner may go App Store (Capacitor) instead of a webapp if the demo lands; demo on the github.io URL. Stripe still a placeholder (`STRIPE_LINK` = PLACEHOLDER → paywall shows "checkout opens soon"; the unlock-code path works). Demo premium = code **`LAUNCH2026`**. See **`docs/DEMO-RUNBOOK.md`**.

**Consciously deferred / known (found in this session's audit, intentionally NOT done — don't think they were missed):**
- ~~**Adventure-mode color inconsistency**~~ — **DONE 2026-06-04 (cache v97).** The Daily Challenge card, Sticker Book, and Parent Dashboard were migrated off the hardcoded dark palette onto the `:root` design tokens via a light re-theme. See the 2026-06-04 session entry at the top.
- `og-image.png` is ~805 KB (social-scrape only; zero render/demo impact) — optional compress to <300 KB later.
- **Paywall is client-side bypassable** (localStorage `PH_PREMIUM`) — **accepted by design**: gated content is non-sensitive static data already in the public repo; the only metered cost (Gemini AI calls) is now server-gated by the worker (Origin + rate limit + size cap). Do NOT invest in client-side DRM.
- Cut-mode audio (`sort-*`, `sorting-*`, `phonics-*`, `practice-*`, `round-complete`, `memory-*` — ~8 files) was NOT re-voiced (dead code, not loaded by index.html) — stays old voice; SW still precaches them but install is now tolerant so a stray 404 can't break it.

**Voice-pipeline gotchas (save a future session hours):**
- **ElevenLabs Voice Design BLOCKS child-sounding prompts** (HTTP 403 `blocked_generation`). Frame any kid voice as "an adult voice actor performing an animated *animal* character" — never "young boy / child / toddler / little." (This is why we couldn't make ElevenLabs do a young male fox directly.)
- **OpenAI TTS needs an account with billing/credits** — the first key returned 429 ("exceeded your current quota"); a second key on a billed project worked.
- Clips are generated **soft on purpose** (the "never loud" instruction) and made loud *afterward* via `loudnorm_all.py` (−16 LUFS). Don't chase loudness through the OpenAI instruction — use loudnorm, and always re-level from `audio_coral_raw/` (never double-normalize an already-normalized clip).

**Hosting decision (don't re-open):** staying on **GitHub Pages** is deliberate — Vercel was evaluated and rejected (zero migration risk, the PWA/service-worker is verified healthy, and the backend worker is on Cloudflare regardless, so Vercel adds nothing for the demo). Custom domain deferred; **Capacitor → App Store** is the real next step if the demo lands.

---


> **v95 follow-up (`43ad272`):** the screen-transition focus management shipped in v94 made Chromium paint a `:focus-visible` grape outline around screen **headings** (a purple box around "Pick the items!" etc.) because `showScreen` focuses each screen's `h1`/container (`tabindex=-1`). Fixed with `[tabindex="-1"]:focus { outline: none }` — focus still moves for SR/keyboard, but route-change destinations no longer paint a ring (real controls keep theirs). Verified gone across splash/setup; setup's sticky "Done" button (now 100px) still clears the last card (80px grid pad). **Lesson:** programmatic route-change focus + a global `:focus-visible` ring needs the `[tabindex="-1"]` outline suppression, or non-interactive focus destinations flash a ring.

## 2026-06-02 session — UI/UX audit + fix sweep (SHIPPED, live, cache v94→v95)

Ran a full UI/UX audit (ui-ux-pro-max framework + live-browser testing across phone/tablet/landscape + code review of every loaded module) and fixed everything found. 9 surgical commits (`f367da9`..`09fee3a`), all verified in a real browser against a local server before push. Cache bumped v93 → **v94**; landing CSS `?v=4` → `v5`.

**Two flow-breakers fixed (highest impact):**
1. **Parent-override was dead code.** `forceAccept()` existed but nothing called it — a wrongly-rejected photo had no recourse (violated the project's own "don't frustrate the child" rule). Now wired to a **~650ms long-press on the green retry button** in `showMissResult()` (trailing tap swallowed). Result buttons also got aria-labels.
2. **Camera unreachable in landscape.** Fixed-position game screen pushed the camera ~73% below a non-scrolling fold on phones. **Locked to portrait**: `manifest.json` orientation `any`→`portrait` + a `#rotate-lock` overlay (fox-think) shown only on phones in landscape (`@media (orientation:landscape) and (max-height:600px)`). Tablets (height ≥744) + desktop unaffected — verified.

**Accessibility:** global `:focus-visible` rings (app + landing; were zero); camera button `aria-label` (primary action was unnamed); progressbar `role`+`aria-valuenow`; `#feedback-area` `aria-live`; focus moved into each screen on transition (`showScreen`); setup cards + daily card are now keyboard-operable buttons; hint button labeled.

**Conversion-surface contrast (was 1.6–2.8:1, now ≥4.5):** paywall redeem button (1.62→8.16), buy/upgrade/install buttons, success/error messages, the live "coming soon" email link; landing CTAs (2.78→5.08), body/footer links, FAQ glyph, dashboard low-opacity text.

**Paywall layout:** code-row overflow that clipped the "Unlock" button at ≤390px **fixed** (flex-wrap + min-width:0; overflow 43px→0). Code input got `aria-label`, status got `role=status aria-live`, buy link got a loading affordance.

**Robustness:** AI fetch now has a **15s AbortController timeout** (loading overlay could hang forever); `submitPhoto` catch shows the offline card on first-load/timeout (was the misleading "Not quite!"); `fireConfetti` early-returns under `prefers-reduced-motion`.

**Polish:** touch targets repeat/skip 48-56→72, `.big-btn` 84→100; `100vh`→`100dvh` on setup; `transition:all`→explicit; Fredoka moved from `@import` to a preconnected `<link>`; **`terms.html` rewritten subscription → one-time $19.99** (was a direct contradiction of the no-subscription pitch); privacy/terms stale `?v=2`→`v5`; removed ~45 lines of orphaned `.phone-frame` CSS; hero LCP img got width/height + fetchpriority.

**Not done (out of scope / can't auto-fix):** the 137 `AudioContext` warnings on load are benign (eager audio prime before gesture) — left as-is. Buy-button contrast/loading apply only once `STRIPE_LINK` placeholder is replaced.

---

### Earlier — 2026-06-01 (Phase 10 custom illustrations COMPLETE — all 87 item stickers + 10 tiles live, was cache v91; Hunt-buddy mascot + UI elevation, Phases 0–7)

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
