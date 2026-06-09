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
