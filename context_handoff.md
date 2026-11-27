# Active Project Context: Picture Hunt

**Last updated:** 2026-11-26 (cache v156)

The full session-by-session log up to this date is preserved verbatim in
`docs/archive/context-handoff-archive-2026-11-26.md` (100 KB). Nothing was deleted.
Read it only when you need the detail behind a line below. Today's audit and what it
fixed: `docs/AUDIT-2026-11-26.md`.

## START HERE

### Next steps, in order

1. **Owner plays one round on his iPhone on v156.** Check: pictures show, the font looks the same, the fox speaks, a right photo celebrates, a wrong photo says "Not quite". Everything on 2026-11-26 was verified at phone size in a desktop browser only. If anything is off, that is the first fix.
2. **Late January 2027: open the GitHub Actions tab and confirm "Recognition health probe" is still running every 6 hours.** It now re-enables itself on each run to beat GitHub's 60-day inactivity shut-off. That is the standard technique but it could not be proven in one day.
3. **Distribution, owner's part** (`docs/DISTRIBUTION.md`): film and post the first videos with the labelled links, send the preschool emails with a free pass each (`node worker/mint-code.mjs <preschool-name>`), seed creators. The tooling for it was built 2026-11-26: anonymous totals (`node worker/stats.mjs`), `?c=<label>` links, free-pass codes with QR images, real game screens in the landing hero. Run the stats weekly and report the funnel in plain words.
   - **Still missing from the launch layer:** a genuine parent quote on the landing page (must be real, never invented).
4. **Payments phase, only after retention is proven** (hybrid path, below): checkout, fix the 365-day code expiry against the "yours forever" promise (`worker.js` webhook), deliver the code to the buyer (a `/claim?session_id=` redirect into the existing `?code=` auto-redeem), remove the public promo codes `LAUNCH2026` / `FOUNDERSPECIAL`, reinstate a finite free daily cap, Capacitor wrap + TestFlight. `docs/PAYWALL-DEPLOY.md` is referenced in places but does not exist; write it then.

### Constraints that bite

- **Push to `main` deploys the site** (GitHub Pages, about 60 s). **It does NOT deploy the Worker.** Worker: `node worker/build-prompts.mjs --check`, then `cd worker && npx wrangler deploy`. The saved Cloudflare login expires; if deploy fails with an auth error, run `npx wrangler login` in the background and ask the owner to click Allow.
- **Cache bump is atomic:** `?v=N` in `play/index.html` (22 places) + `CACHE_VERSION` in `play/sw.js` + any new file in `PRECACHE_URLS`.
- **Items and prompts exist in two places.** `play/app.js` is the source; `worker/prompts.js` is generated. After changing either: regenerate, redeploy the Worker. An item the Worker does not know shows the child "Camera Nap".
- **Never change the vision model without `C:\dev\ph-tools\model_compare.js`** (how-to in its header). Models are two lines in `worker/wrangler.toml`.
- **Service worker:** never rename or delete a file an open older page may still request without an alias in `play/sw.js` (see the PNG alias there). Do NOT use `ignoreSearch` (LESSONS-LEARNED #5). The precached `index.html` can lag one version for a session because GitHub's CDN caches HTML for 10 minutes; harmless.
- **Audio (iOS):** Web Audio buffers only, never `new Audio().play()`. Every spoken line must be a static string that is mapped in `textToAudioKey`, has a recorded clip, and is in `preloadAllAudio`. A dynamic string (a count, a number) falls to the robot browser voice.
- **The owner tests on iPhone / iOS Safari.** Desktop Chromium cannot reproduce safe-area insets. The real visible area on a phone is about 390 x 560 to 660, not 390 x 844. Read LESSONS-LEARNED #1 before touching any screen layout.
- **Copy claims:** never "learns" or "teaches" a language. Use "introduces", "first foreign words", "a head start". Lead with "10 languages", not Spanish. Age is "as young as 2", no upper limit. No em dashes anywhere.
- **No third-party requests from any page.** The privacy policy says none beyond Gemini. Font is self-hosted in `play/fonts/`.
- **Gemini key must stay on the paid tier** (Tier 2, $100 monthly cap seen 2026-11-26). Paid tier is what makes "never trained on" true. To replace a dead key: `printf '%s' "<KEY>" | npx wrangler secret put GEMINI_API_KEY` from `worker/`.
- **Calling the Worker from a script** needs `Origin: http://localhost` and a browser-style `User-Agent`, or Cloudflare answers "error code: 1010". True even through `wrangler dev --remote`.
- **Art:** WebP only in the repo. PNG masters are in `C:/assets/ventures/picture-hunt/art-masters/`; convert with `C:/dev/ph-tools/convert_art_webp.py`. Style anchor and prompt pattern for new illustrations are in the archive (section "Phase 10").
- **Voice:** OpenAI `gpt-4o-mini-tts`, voice "coral", levelled to -16 LUFS from `ph-tools/audio_coral_raw/` (never re-level an already levelled clip). ElevenLabs blocks child-sounding voice prompts.
- **ph-tools gotchas:** `eval_generated.js`, `eval_recognition.js` and `false_positive_eval.js` still point at the old path `C:/dev/picture-hunt-deploy`; fix that line before re-running them. `model_compare.js` and `convert_art_webp.py` use the right path. Printing non-Latin words on the Windows console needs `sys.stdout.reconfigure(encoding='utf-8')`.
- **Testing the counters:** `landing.js` and `play/counts.js` only send on the real hostname, so a local preview counts nothing. Test logic with `C:/dev/ph-tools/test_play_counts.py` (real hostname, local files, fake Worker: nothing reaches production). For a live check, preset `PH_CH` to `selftest`, then delete those rows: `DELETE FROM counts WHERE channel = 'selftest'`. The counters started from zero on 2026-11-26; there is no earlier data.
- **Landing page checks:** `C:/dev/ph-tools/view_landing.py` (four screen sizes, overflow and console errors) and `capture_hero_shots.py --install` (re-captures the two hero screens from the live game).
- **On this Windows machine, write scripts to a file and run them.** A SQL string containing `>=` passed through a shell also created a junk file named after the text following the `>` (it was committed to this public repo for a minute; it held only tool help text). Shell heredocs with quotes failed twice on 2026-11-26, and a backslash path inside one turned into control characters. Use forward slashes in paths.

### Open decisions (default applies unless the owner says otherwise)

| Decision | Default |
|---|---|
| Shrink the voice clips (10 MB of the 13.4 MB offline cache; about 4 MB to save) | Leave. Needs the owner's ear |
| Lower the Gemini spend cap from $100 to $25 | Owner's call. Real use is about $1 a month |
| An unexplained Gemini charge of about $0.57 on one day around 2026-11-22 or 23, seen in the owner's billing screenshot. Nothing in this project ran then (the health probe was off). | Owner checks the "All API Keys" dropdown in Google AI Studio. If another project shares the key, it is explained. If not, rotate the key |
| Paywall bullet "Unlimited finds" while the free daily cap is off | Leave until payments |
| Hardware Back button closing dialogs instead of leaving the app | Leave. Standard PWA behaviour |
| Native-speaker check of the short Mandarin, Japanese, Korean, Hindi and Arabic words | Ship as is. Automated check found no systematic problem |
| Stricter Colors prompt ("the main object is X" instead of "X anywhere") | Leave lenient |
| A one-template "Fox's Mystery Hunt" regenerating quest (about 2 days) | Not before the validation launch |

## Current state

**Live on https://picturehunt.app (HTTPS enforced), cache v156.** Nothing is in flight.

- **Free:** Things, Animals, Food; Spanish; Daily Challenge; one Story Quest (Bear's Breakfast). No daily cap.
- **Premium (code only, no checkout yet):** all 10 categories, all 10 languages (all recorded in the fox voice), all 8 Story Quests, cross-device sync. Paywall shows "checkout opens soon" because `STRIPE_LINK` in `play/paywall.js` is a placeholder.
- **Recognition:** app posts `{category, item, image, mimeType}` to the Worker's `/recognize`. Worker asks `gemini-3.5-flash-lite`, then `gemini-3.6-flash` once if that fails. About 0.8 s. Older cached app versions post the full prompt to `/`; the Worker accepts only our exact prompts.
- **Monitoring:** `.github/workflows/recognition-health.yml` every 6 hours; needs "yes" for apple and "no" for banana on a real photo; GitHub emails the owner on failure.
- **Privacy:** photos are shrunk to 1024 px and re-encoded on the device, which strips location data. A photo that cannot be re-encoded is not sent (v155). No cookies, no third-party requests, no identifiers.
- **Anonymous totals (2026-11-26):** one Cloudflare D1 table, `counts(day, event, channel, n)`. The landing page (`landing.js`, real site only) sends `visit` (once per browser per day) and `try_free`, with the `?c=` label if any. The Worker counts its own photo checks (`check_yes/no/unclear/fail/fallback/old_app`), health checks separately (`probe_ok/fail`), and code use (`code_ok` by code label, `code_bad`). The game sends single-word counts from `play/counts.js` (v156, owner approved 2026-11-26): `play_open`, `play_new`, `first_find`, `find_day`, `back_d1`, `back_week`, `back_later`, `paywall_view`. "Came back" is worked out on the device from a first-play date in its own storage; the server gets no ID and nothing linking two visits. Browsers with Picture Hunt data from before v156 are marked `before` and left out of the new and came-back counts. Disclosed in `privacy.html` under "Anonymous totals". Reading the rates: came-back counts divided by `play_new` over the same period is an approximation, good enough at this scale.
- **Landing hero:** two real game screens (`img/hero-prompt.webp`, `img/hero-found.webp`, captured from the live game at 390 x 760) with the fox in front. To refresh them after a UI change, re-capture with Playwright against the live site (set `bypass_csp=True`; the page's security policy blocks Playwright's wait helpers otherwise).
- **Free passes:** `node worker/mint-code.mjs <label>` writes a code to KV with `label` and `shared: true`. Shared codes validate but never sync progress (sync is keyed by code and would mix families).
- **Removed in v155:** the four cut game modes (Memory Hunt, Review Mode, Sorting Safari, Phonics Hunt) with their audio, and the old "paste your own Gemini key" screen. All in git history.
- **Contact:** hello@picturehunt.app (routes to the owner's Gmail).

## Decisions (why, and when to reopen)

| Decision | Why | Reopen when |
|---|---|---|
| Bilingual vocabulary is the product, the camera is the mechanic, story is the retention engine | A camera hunt alone is a novelty; under-5 language is the highest willingness-to-pay corner | Never without new market evidence. `docs/STRATEGY.md` |
| Freemium, then $24.99 one time. Not a subscription | The retention engine is not built; toddlers age out; no ad budget; the code path is one-time | The story-template engine ships AND a channel brings steady users |
| Spanish and three real-object categories are free | Parents will not pay for a differentiator they have not felt | Conversion data says otherwise |
| No free daily cap for now | Maximise play to prove retention before charging | Payments go live |
| Hybrid launch: fix product and legal, skip web checkout, validate free as a PWA, then App Store with in-app purchase | Only checkout work is throwaway; the App Store is a trust layer, not an acquisition channel; Kids-category review is 3 to 6 weeks | Demand is proven, or new information |
| Stay on GitHub Pages; Vercel rejected | Zero migration risk, PWA healthy, backend is on Cloudflare anyway | We need real response headers or a same-origin API |
| Counting runs on our own Worker, not Cloudflare Web Analytics or Plausible | Their script is a third party on a kids' brand, cannot count button taps, and cannot see play at all. Ours sends single words with no ID | Never add a third-party tracker. Extend `play/counts.js` instead |
| Counts are stored in D1, not KV or Analytics Engine | D1 increments atomically and is readable with the saved `wrangler` login, so no read endpoint and no new secret exist. KV has a small daily write quota; Analytics Engine needs an API token to query | Volume passes D1's free tier (100k writes a day) |
| "Came back" is computed on the device, never on the server | A server-side return rate needs an ID that follows a child across days. A date in the browser's own storage gives the same number with nothing to link visits | Never. Do not add an ID to make cohorts "more exact" |
| Worker owns prompts, model and fallback | Closed an open proxy to the paid key; model changes need no app update | Not expected |
| Health probe stays on GitHub, re-enabling itself | GitHub already emails on failure; a Cloudflare job needs a new alert channel | It gets disabled again |
| Client-side premium flag is bypassable, accepted | Gated content is static and public; the only metered cost is server-gated | Payments go live. Do not build DRM |
| Offline support is shallow on purpose | The core photo check needs the network | Never |
| Parent dashboard is free; the "/109" total stays aspirational; four badges stay locked for free users | Owner decisions: reaching 100% causes churn; locked badges are an upgrade nudge | Owner says so |
| Colors and Shapes stay on emoji | Clean abstract icons beat hand-drawn; avoids shared-name leaks (orange, star) | Never |
| Fox mascot | Distinct from other preschool characters | Never |
| picturehunt.app is the permanent address | Saved progress is tied to the site address; moving again would orphan it | Never |
| Distribution: TikTok organic, preschool free passes, small parent creators. Not parenting subreddits | Those communities downvote "I built an app" | Results say otherwise |
| Do not discount the price to chase conversion | The lever is channel and message | Decision gate outcome |
| LESSONS-LEARNED.md stays a working checklist, not one-liners | The `ui-audit` skill loads it and uses the fix patterns in it. The 2026-09-01 process note asked for one line per lesson; that would strip what makes it useful | It grows past about 20 KB |

## Negatives worth keeping (things that failed, so nobody repeats them)

- **A dead Gemini key failed every photo for days** and children saw "Not quite!" each time (2026-06-09). Service errors now show "Camera Nap" and never reset a streak.
- **GitHub silently disabled the health probe** after 60 days without commits (2026-08-16 to 2026-11-26).
- **Google retired the vision model with four weeks' notice** (2.5 Flash, 2026-12-01). Watch ai.google.dev/gemini-api/docs/deprecations.
- **Deleting the PNG art broke pictures for pages already open** on the previous version (v153, fixed in v154 with a service-worker alias).
- **A `.js` file in `play/content/` is not a feature** until `index.html` loads it, a real code path calls it, and its audio exists.
- **Audit findings kept only in a temporary transcript were lost** and had to be re-derived (`docs/FUNCTIONAL-SWEEP-BACKLOG.md`). Write findings to a tracked file immediately.
- **One audio channel:** a "cut off" clip means something else started playing. Gate `onEnd` on the current source.
- **The service worker's offline reply is a resolved 503, not a rejected fetch.** `.catch` never fires for it.
- **The daily item must be forced into the hunt** regardless of difficulty or item selection, or the Daily Challenge cannot be completed.
- **`env(safe-area-inset-bottom)` applied on two nested elements** pushed Skip off screen.
- **Rate limiting through KV** cost one write per photo against a small daily quota shared with unlock codes. Replaced by Cloudflare's built-in limiter, which is approximate (a 60 per minute limit began refusing at request 114).
- **`gemini-3.8-flash` rejects the lowest thinking setting** (HTTP 400). The Worker sends "low" for it.
- **Gemini 3 ignores `temperature`.** The old "temperature 0" rule does nothing.
- **Fredoka's `@font-face` weight range is 500 to 700 on purpose.** Declaring the file's full 300 to 700 made body text render lighter than before.
- **The shared `X-PH-Token` is not enforced** (Worker secret never set). Only `app.js` sends it; `paywall.js` and `progress-sync.js` do not, so turning enforcement on would break code entry and sync unless they are updated in the same change.
- **A generated "square" test image was a rectangle,** and ImageMagick on the GitHub runner produced an image Gemini rejected. Test images must be checked, and the probe photo is a committed file.
- **`venturelab.ai` email was dead and the domain was for sale.** All contact is hello@picturehunt.app.
