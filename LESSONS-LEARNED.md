# Picture Hunt — UI/UX audit checklist (self-sharpening)

The `ui-audit` skill loads this file before every audit and turns each past bug
into a checklist item. Add a new entry whenever an audit surfaces a new *class*
of defect (not just one instance).

---

## 1. iOS short-viewport reachability trap (the recurring one — check FIRST)

**Class:** The base `.screen` rule is `position:fixed; display:flex;
flex-direction:column; align-items:center; justify-content:center;` with default
`overflow:visible`. On a short iOS viewport (Safari with the URL bar showing ≈
**390×660** on a 6.1" iPhone), any screen/modal whose content is taller than that
band gets **centered and clips its top + bottom controls off-screen with no way
to scroll to them**. Has shipped broken repeatedly: splash (v98/v99), paywall
(v107), and again on `#game`, `#landing`, and the language picker (v108).

**The fix pattern (copy from the paywall / `#splash` / story-mode):**
```css
overflow-y: auto;
-webkit-overflow-scrolling: touch;
justify-content: flex-start;     /* fallback: top-anchor so nothing clips */
justify-content: safe center;    /* re-center only when content actually fits */
padding: max(<base>, env(safe-area-inset-top)) <x> max(<base>, env(safe-area-inset-bottom));
```

**How to audit (measure, don't eyeball):** resize the browser to **390×660**,
walk EVERY screen and modal, and for each interactive element read
`getBoundingClientRect()`. A control with `top < 0` or `bottom > innerHeight`
while its container is **not** scrollable (`overflow-y` not auto/scroll, or
`justify-content` is plain `center` without `safe`) = an unreachable button.
Surfaces to cover: `#landing`, `#splash`, `#setup`, `#game` (regular **and**
`.story-mode`), paywall, **language picker**, sticker book, parent dashboard,
story selector, home-greeting overlay, and the **result / miss / victory**
screens (these need a successful photo to trigger — easy to skip, don't).

**Sub-traps learned in v108:**
- `position:absolute` decorative pseudo-elements (`#landing::before/::after` with
  negative `inset`/`top`) **inflate the scroll container's `scrollHeight`**,
  creating phantom overflow. Make them `position:fixed` so they don't count.
- A `position:fixed` bottom element (the install pill) **covers in-flow content**
  unless the scroll container reserves space equal to the element's *real*
  (text-wrapped) height **plus `env(safe-area-inset-bottom)`**. A static px
  reservation is fragile — measure `offsetHeight` at runtime.
- A modal that is itself the full-screen dim layer (`inset:0`) can't be closed by
  a parent `overlay.onclick` (the modal covers the overlay) — wire
  `modal.onclick` with an `e.target === modal` guard, or it's only closable by
  selecting an option.
- `env(safe-area-inset-*)` can't be reproduced in desktop Chromium (insets = 0).
  Verify those additions on a real notched iPhone; in the browser, only confirm
  the rule is present and the non-notch geometry is correct.
- **Never add `env(safe-area-inset-bottom)` to a NON-bottom element.** v108 added it
  to `.camera-area`'s `margin-bottom`, but the camera area isn't the bottom of `#game`
  — the Skip button is below it, and `#game`'s `padding-bottom` already reserves the
  home-indicator inset. So the inset was double-counted (~34px of dead space between
  camera and Skip), clipping the bottom half of the Skip button on notched iPhones
  while desktop Chromium (insets = 0) looked fine. Only the truly bottom-most element
  (or the scroll container's own padding) should carry `inset-bottom`. And measure
  before blaming the inset: the base `#game` layout was independently too tall (756px
  content at 390×660, overflowing 96px with ZERO insets) — read `scrollHeight` vs the
  viewport and trim oversized blocks (the camera button was a 130px min-height PLUS a
  redundant 32px padding = 149px) and whitespace, not only the inset. (Both fixed
  v150 → 667px content, Skip fully visible at 390×660.)

## 2. Service-worker cache lag during live verification

After deploying, a long-lived browser session is still controlled by the OLD
service worker and serves the OLD cached CSS/JS — so a live re-test shows the
*pre-fix* behavior even though the deployed files are correct. Don't trust an
in-session reload. To verify the deployed artifact:
1. `curl` the live file directly (no SW) and grep for a unique marker from the
   change — this is authoritative for "did it deploy."
2. For a functional check, `navigator.serviceWorker.getRegistrations()` →
   `unregister`, `caches.keys()` → `delete`, `localStorage.clear()`, then reload.
That mirrors what a real device gets on its next launch. (Existing home-screen
PWA installs pick up the new version on next app relaunch via the cache bump.)

## 3. Cache bump is atomic (project hard rule)

Any change under `play/` requires bumping `?v=N` in `play/index.html` **and**
`CACHE_VERSION` in `play/sw.js` together, and adding any new file to
`PRECACHE_URLS`. Verify post-bump: no stale `?v=<old>` remain and every edited
file is referenced at the new version.

## 4. Audio: every spoken line needs a recorded clip (dynamic strings → robot voice)

**Class:** `speak(text)` routes text → `textToAudioKey(text)` → a recorded coral
clip via `playBuffer`. If the text doesn't map to a key, it falls back to the
device's speech-synthesis **robot voice** (jarring next to the fox voice, and
silent/broken on iOS for some phrases). Any spoken string built with a
**variable / count / number** can't match a fixed key, so it ALWAYS blurts the
robot voice — and usually carries a count-grammar bug too ("You have 1 stickers").
Shipped broken on the sticker book and the streak milestone (v129); the bilingual
**Victory Echo** was a sibling failure — an unrecorded TTS line that also *overlapped*
and cut off the preceding clip (v128). One report ("stickers said it in the robot
voice") = sweep the whole class, not just that line.

**The rule for any NEW spoken line:**
1. Use a **fixed phrase** — never interpolate a number/name into spoken text
   (say "Here are your stickers!" not "You have N stickers").
2. Add the phrase → key mapping in `textToAudioKey` (`play/app.js`).
3. Generate the recorded clip via `ph-tools/regen_clips.py` (voice "coral",
   -16 LUFS loudnorm); drop the mp3 in `play/audio/`.
4. Add the key to `preloadAllAudio` (so it's warm) **and** the file to
   `sw.js` `PRECACHE_URLS` — then do the atomic cache bump (#3).

**How to audit (run it, don't eyeball):** in the browser, run `textToAudioKey()`
on every static `speak('…')` literal **plus** every `CATEGORIES[c].speakPrompt(item)`
and `CATEGORIES[c].speakName`. Any that return null/empty = a robot-voice line.
(As of v129: zero fall through; TTS now only fires as the genuine
clip-load-FAILURE fallback for hints/prompts, which is the intended safety net.)
When grepping `speak\(`, ignore `memory-hunt` / `review-mode` / `sorting-safari` /
`phonics-hunt` — those modules are dead code, not loaded by `index.html`.

**Debugging an audio cutoff:** there is ONE playback channel (`currentAudioSource`),
stopped before each new clip. A clip cutting off mid-word = something started a
second sound on top of it (an echo, a translation, an overlapping `speak`).
Instrument `playBuffer` / `speak` / `speakFallback` with timestamped logs and look
for the second start that lands inside the first clip's duration.

## 5. Offline / service-worker caching — do NOT "fix" it with `ignoreSearch`

The backlog has several findings like "X audio not precached → robot voice
offline," and you'll notice `PRECACHE_URLS` lists JS/CSS at bare paths (`./app.js`)
while `index.html` requests them versioned (`./app.js?v=N`). The tempting one-line
fix is `caches.match(req, {ignoreSearch:true})`. **Never do this.** `ignoreSearch`
makes a request for `app.js?v=138` match a cached `app.js?v=137` — serving STALE
code after every deploy and defeating the entire `?v=` cache-busting model (#3).
A user would be stuck on old code until caches were manually cleared.

**Why offline mostly works anyway** (so the bare-precache mismatch isn't urgent):
the runtime fetch handler caches the *versioned* URL on the first online load —
which always happens, since you can't install the PWA without loading it once — so
relaunches and offline work after that first view. The bare precache entries for
versioned assets are effectively dead (never matched); images/audio are requested
at bare paths, so those DO match the precache and are available offline.

**If real offline-first is ever needed**, the correct fixes are: precache the
*versioned* URLs (template `CACHE_VERSION`'s number into `PRECACHE_URLS`), or rely
on runtime caching. Not `ignoreSearch` on versioned assets.

## 6. Single audio channel: `onEnd` must fire only on NATURAL completion

There is ONE playback channel (`currentAudioSource`); `playBuffer`/`speak` stop it
before starting the next clip. The trap (W10): a `source.onended` handler that runs
`onEnd()` **unconditionally**. When a clip is `.stop()`'d to make way for a new one,
the stopped source's `onended` STILL fires async — by then `currentAudioSource` is the
NEW source, so the interrupted clip's `onEnd` runs its follow-on (foreign echo, camera
pulse, inactivity timer) **on top of** the current clip. Fix pattern:
`source.onended = function(){ if (currentAudioSource === source) { currentAudioSource = null; if (onEnd) onEnd(); } };`
Corollary for cold-start (`playKeyWhenReady`): a superseded `speak()` whose buffer
decodes late (or whose 1200ms TTS-fallback timer fires) will speak the OLD prompt over
the current one — guard with a monotonic `_speakGen` token bumped in `speak()` and
checked before the late fallback/playBuffer. And: a milestone/secondary spoken line
triggered DURING a find (`streak-milestone`) must **wait for the channel to be free**
(poll `currentAudioSource` until null, capped) rather than speak immediately — it'll be
cut off by "You found it!" otherwise. When auditing any new `speak()`/`playBuffer`, ask
"what else could be on the channel right now?"

## 7. A fix that eagerly persists shared state defeats a later "did it change?" check

Regression class (W13→W19): `switchSetupTab` eagerly wrote the edited selection to
`PH_SELECTED`; later `setupDone` decided whether to invalidate the saved hunt by
comparing the new selection to `getSelectedNames()` — which now already equalled the
edit, so it saw "no change" and left a stale resume. **Rule:** when a later step gates
on "did X change since the user opened this screen?", compare against a **pre-edit
baseline captured at open time**, never against live storage that an intermediate step
may have already overwritten. Capture baselines per-entity on first entry; compare the
*affected* entity (here: the resumed game's category) against its baseline.

## 8. Defer an overlay on a completion FLAG, not element-presence

The install pill deferred while `#first-run-setup` existed — but `onSplashEnter` appends
that card ~400ms AFTER splash becomes active, leaving a race where the pill slips in
first (W15→W20). **Rule:** to defer "until a one-time gate is done," check the *durable
completion flag* (`PH_FIRST_RUN_DONE`), not whether its DOM element happens to be mounted
at the instant you poll. Element-presence checks miss the build-up/tear-down windows.

## 9. Re-audit your own fixes before declaring done (and a visual pass on top)

A multi-wave sweep WILL introduce regressions — budget for it. This session's adversarial
re-audit of only the changed code found 3 self-inflicted regressions (all in the
gating/branching changes — exactly where to look), and a live visual pass found a 4th
(the pill/first-run race) that no code read surfaced. Never report "converged" off a wave
you didn't re-audit, and always finish with eyes on the real running app.

**Bigger picture — the app is online by design.** The core feature (AI photo
matching) needs the Gemini API, so the hunt **cannot be played offline** regardless
of caching. Offline support only buys a fast cached shell + a graceful "No Internet!"
card (`sw-register.js showOfflineMessage` — reviewed, reads well). Weigh any offline
investment against that ceiling before building. (Decision 2026-06-14: keep offline
shallow; we only fixed the `img/items/` precache path so the cached shell isn't
visually broken.)
